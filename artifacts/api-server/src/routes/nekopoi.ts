import { Router, type Request, type Response } from "express";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { logger } from "../lib/logger.js";

const router: Router = Router();

const HMAPI = "https://hmnekopoi.vercel.app";
const NEKO_ORIGIN = "https://nekopoi.care";

// ─── ID helpers ───────────────────────────────────────────────────────────────

function encodeId(url: string): string {
  return Buffer.from(url).toString("base64url");
}

function decodeId(id: string): string {
  try {
    return Buffer.from(id, "base64url").toString("utf-8");
  } catch {
    return id;
  }
}

// ─── Build proxy image URL ────────────────────────────────────────────────────

// EXPO_PUBLIC_NEKO_BASE = "https://<replit-dev-domain>/api/nekopoi"
// NOTE: this env var is only injected into the *kuro* (Expo) workflow, not
// the api-server process, so on the server it will normally be empty — we
// always fall back to deriving an https URL from the incoming request.
const NEKO_BASE_PUBLIC = (process.env.EXPO_PUBLIC_NEKO_BASE ?? "").replace(/\/$/, "");

function proxyImg(req: Request, imageUrl: string): string {
  if (!imageUrl) return "";
  // Prefer the env var (reliable public URL); otherwise derive from the request.
  // Always force https — Replit's public domains are only ever served over
  // https, but the app process behind the shared proxy sees plain http, which
  // would otherwise leak into the generated URL and trigger mixed-content
  // blocking / broken images in the client.
  const host = req.get("x-forwarded-host") || req.get("host");
  const base = NEKO_BASE_PUBLIC || `https://${host}/api/nekopoi`;
  return `${base}/proxy-image?url=${encodeURIComponent(imageUrl)}`;
}

// ─── Upstream fetch ───────────────────────────────────────────────────────────

async function hmFetch(path: string): Promise<unknown> {
  const res = await fetch(`${HMAPI}${path}`, {
    headers: {
      "User-Agent": "KuroApp/1.0",
      Accept: "application/json",
      Referer: NEKO_ORIGIN,
    },
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`Upstream ${res.status} on ${path}`);
  const json = (await res.json()) as Record<string, unknown>;
  if (!json.success) throw new Error(`Upstream failure on ${path}`);
  return json.data;
}

/**
 * Some upstream endpoints (notably /api/stream) return fields flat at the
 * top level instead of nested under "data" — use this for those.
 */
async function hmFetchRaw(path: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${HMAPI}${path}`, {
    headers: {
      "User-Agent": "KuroApp/1.0",
      Accept: "application/json",
      Referer: NEKO_ORIGIN,
    },
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`Upstream ${res.status} on ${path}`);
  const json = (await res.json()) as Record<string, unknown>;
  if (!json.success) throw new Error(`Upstream failure on ${path}`);
  return json;
}

// ─── Response helpers ─────────────────────────────────────────────────────────

function ok(res: Response, data: unknown): void {
  res.json({ ok: true, data });
}

function fail(res: Response, status: number, message: string): void {
  res.status(status).json({ ok: false, message });
}

// ─── List item transform ──────────────────────────────────────────────────────

interface RawItem {
  title?: string;
  url?: string;
  poster?: string;
}

function transformList(req: Request, items: unknown): object[] {
  const arr = Array.isArray(items) ? (items as RawItem[]) : [];
  return arr
    .filter((item) => item.url && item.title)
    .map((item) => ({
      title: item.title ?? "",
      poster: proxyImg(req, item.poster ?? ""),
      animeId: encodeId(item.url ?? ""),
      href: item.url ?? "",
    }));
}

// ─── Server label helper ──────────────────────────────────────────────────────

function serverLabel(src: string, index: number): string {
  if (src.includes("streampoi")) return "StreamPoi";
  if (src.includes("playmogo")) return "PlayMogo";
  if (src.includes("desustream")) return "DesuStream";
  if (src.includes("streamtape")) return "Streamtape";
  if (src.includes("ok.ru")) return "OK.RU";
  if (src.includes("doodstream")) return "DoodStream";
  if (src.includes("vidmoly")) return "VidMoly";
  if (src.includes("filemoon")) return "FileMoon";
  return `Server ${index + 1}`;
}

// ─── Image proxy allowlist ────────────────────────────────────────────────────

/**
 * Only these hostnames (and their subdomains) are permitted as upstream image
 * sources. This prevents SSRF — an attacker cannot force the server to fetch
 * arbitrary internal or external URLs.
 */
const ALLOWED_IMAGE_HOSTS = new Set([
  "nekopoi.care",
  "www.nekopoi.care",
  "i0.wp.com",
  "i1.wp.com",
  "i2.wp.com",
  "i3.wp.com",
  "hmnekopoi.vercel.app",
  "cdn.nekopoi.care",
  // Common image CDNs used by the upstream scraper
  "i.ibb.co",
  "imgbb.com",
  "s0.wp.com",
  "wp.com",
]);

/** Return true if the hostname is on the allowlist (exact or subdomain match). */
function isAllowedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (ALLOWED_IMAGE_HOSTS.has(h)) return true;
  // Subdomain match: e.g. "cdn.nekopoi.care" for "nekopoi.care"
  for (const allowed of ALLOWED_IMAGE_HOSTS) {
    if (h.endsWith(`.${allowed}`)) return true;
  }
  return false;
}

/** Return true if the URL is safe to fetch (https + allowlisted host). */
function isSafeImageUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    if (!isAllowedHost(u.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

/** Max bytes we will pipe from an upstream image (5 MB). */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// ═══════════════════════════════════════════════════════════════════════════════
// Routes
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /nekopoi/proxy-image?url=<encoded>
 * Proxy nekopoi.care images so they load with proper Referer header.
 * Only allowlisted HTTPS hosts are permitted — no SSRF.
 */
router.get("/proxy-image", async (req: Request, res: Response) => {
  const raw = req.query.url;
  const imageUrl = typeof raw === "string" ? raw : "";
  if (!imageUrl) {
    fail(res, 400, "Missing url param");
    return;
  }
  if (!isSafeImageUrl(imageUrl)) {
    fail(res, 403, "Image URL not permitted");
    return;
  }
  try {
    const upstream = await fetch(imageUrl, {
      headers: {
        Referer: NEKO_ORIGIN + "/",
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        Accept: "image/webp,image/avif,image/*,*/*",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!upstream.ok) {
      fail(res, 502, `Image fetch failed (${upstream.status})`);
      return;
    }
    const ct = upstream.headers.get("content-type") ?? "image/jpeg";
    if (!ct.startsWith("image/")) {
      fail(res, 502, "Upstream did not return an image");
      return;
    }
    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (upstream.body) {
      let bytesRead = 0;
      const limited = new TransformStream({
        transform(chunk, controller) {
          bytesRead += (chunk as Uint8Array).length;
          if (bytesRead > MAX_IMAGE_BYTES) {
            controller.error(new Error("Image too large"));
          } else {
            controller.enqueue(chunk);
          }
        },
      });
      await pipeline(
        Readable.fromWeb(upstream.body.pipeThrough(limited) as never),
        res
      );
    } else {
      const buf = Buffer.from(await upstream.arrayBuffer());
      if (buf.length > MAX_IMAGE_BYTES) {
        fail(res, 502, "Image too large");
        return;
      }
      res.end(buf);
    }
  } catch (e: unknown) {
    logger.error(e, "neko /proxy-image");
    if (!res.headersSent) fail(res, 502, "Gagal memuat gambar");
  }
});

/**
 * GET /nekopoi/home
 */
router.get("/home", async (req: Request, res: Response) => {
  try {
    const data = await hmFetch("/api/list");
    ok(res, { animeList: transformList(req, data) });
  } catch (e: unknown) {
    logger.error(e, "neko /home");
    fail(res, 502, "Gagal memuat konten");
  }
});

/**
 * GET /nekopoi/ongoing-anime?category=<slug>&page=<n>
 * Returns the latest list, optionally filtered by category slug.
 * Valid slugs: hentai | 3d-hentai | jav | jav-cosplay   (empty = all)
 */
router.get("/ongoing-anime", async (req: Request, res: Response) => {
  try {
    const page     = String(req.query.page ?? "1");
    const category = String(req.query.category ?? "").trim();

    let qs = `page=${page}`;
    if (category) qs += `&category=${encodeURIComponent(category)}`;

    const data = await hmFetch(`/api/list?${qs}`);
    ok(res, { animeList: transformList(req, data) });
  } catch (e: unknown) {
    logger.error(e, "neko /ongoing-anime");
    fail(res, 502, "Gagal memuat konten terbaru");
  }
});

/**
 * GET /nekopoi/complete-anime  — "Jadwal" / schedule list
 */
router.get("/complete-anime", async (req: Request, res: Response) => {
  try {
    // Schedule returns a nested object keyed by day; flatten all entries
    const raw = (await hmFetch("/api/schedule")) as Record<string, unknown> | unknown[];
    let items: unknown[] = [];
    if (Array.isArray(raw)) {
      items = raw;
    } else if (raw && typeof raw === "object") {
      for (const v of Object.values(raw)) {
        if (Array.isArray(v)) items.push(...v);
      }
    }
    ok(res, { animeList: transformList(req, items) });
  } catch (e: unknown) {
    logger.error(e, "neko /complete-anime");
    // Fallback: just return latest list
    try {
      const data = await hmFetch("/api/list?category=hentai");
      ok(res, { animeList: transformList(req, data) });
    } catch {
      fail(res, 502, "Gagal memuat jadwal");
    }
  }
});

/**
 * GET /nekopoi/anime/:animeId  — detail + episode list
 */
router.get("/anime/:animeId", async (req: Request, res: Response) => {
  try {
    const url = decodeId(String(req.params.animeId));

    const [detailResult, episodesResult] = await Promise.allSettled([
      hmFetch(`/api/detail?url=${encodeURIComponent(url)}`),
      hmFetch(`/api/episodes?url=${encodeURIComponent(url)}`),
    ]);

    if (
      detailResult.status === "rejected" &&
      episodesResult.status === "rejected"
    ) {
      logger.error(
        { detail: String(detailResult.reason), episodes: String(episodesResult.reason) },
        "neko /anime both calls failed"
      );
      fail(res, 502, "Gagal memuat detail anime");
      return;
    }

    const detail =
      detailResult.status === "fulfilled"
        ? (detailResult.value as Record<string, unknown>)
        : {};

    const episodesRaw =
      episodesResult.status === "fulfilled" && Array.isArray(episodesResult.value)
        ? (episodesResult.value as { title?: string; url?: string }[])
        : [];

    const title =
      (detail.title as string) ||
      url.split("/").filter(Boolean).pop() ||
      "";
    const rawPoster = (detail.poster as string) || "";
    const poster = proxyImg(req, rawPoster);
    const description = (detail.description as string) || "";
    const iframes: string[] = Array.isArray(detail.iframes)
      ? (detail.iframes as string[])
      : [];

    // Genre list from detail if available
    const genreList = Array.isArray(detail.genres)
      ? (detail.genres as { name?: string; url?: string }[]).map((g) => ({
          title: g.name ?? "",
          genreId: encodeId(g.url ?? g.name ?? ""),
          href: g.url ?? "",
        }))
      : [];

    let episodeList = episodesRaw
      .filter((ep) => ep.url)
      .map((ep, i) => ({
        title: ep.title || `Episode ${i + 1}`,
        eps: i + 1,
        date: "",
        episodeId: encodeId(ep.url ?? ""),
        href: ep.url ?? "",
      }));

    // Single-video page: page itself is the only "episode"
    if (episodeList.length === 0) {
      episodeList = [
        {
          title: iframes.length > 0 ? `${title} (Full)` : title,
          eps: 1,
          date: "",
          episodeId: encodeId(url),
          href: url,
        },
      ];
    }

    if (!title && episodeList.length === 0) {
      fail(res, 502, "Gagal memuat detail anime");
      return;
    }

    ok(res, {
      title,
      poster,
      synopsis: description ? { paragraphs: [description] } : undefined,
      genreList,
      episodeList,
      recommendedAnimeList: [],
    });
  } catch (e: unknown) {
    logger.error(e, "neko /anime/:animeId");
    fail(res, 502, "Gagal memuat detail anime");
  }
});

/**
 * GET /nekopoi/episode/:episodeId  — streaming servers for one episode
 */
router.get("/episode/:episodeId", async (req: Request, res: Response) => {
  try {
    const url = decodeId(String(req.params.episodeId));

    const detail = (await hmFetch(
      `/api/detail?url=${encodeURIComponent(url)}`
    )) as Record<string, unknown>;

    const title = (detail.title as string) || "";
    const iframes: string[] = Array.isArray(detail.iframes)
      ? (detail.iframes as string[])
      : [];

    if (iframes.length === 0) {
      fail(res, 502, "Tidak ada server streaming tersedia");
      return;
    }

    const serverList = iframes.map((src, i) => ({
      title: serverLabel(src, i),
      serverId: encodeId(src),
      href: src,
    }));

    // Try to get a direct HLS stream (best quality) with a bounded timeout
    let hlsUrl = "";
    try {
      const streamRes = await Promise.race([
        hmFetchRaw(`/api/stream?url=${encodeURIComponent(url)}`),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 30_000)
        ),
      ]);
      hlsUrl =
        (streamRes?.stream_url as string) ||
        (streamRes?.m3u8 as string) ||
        (streamRes?.url as string) ||
        "";
    } catch {
      // HLS extraction timed out or failed — use iframes only
    }

    const qualities: { title: string; serverList: typeof serverList }[] = [];

    // HLS quality (if available) goes first — best for native playback
    if (hlsUrl) {
      qualities.push({
        title: "HLS Stream",
        serverList: [
          { title: "HLS (Direct)", serverId: encodeId(hlsUrl), href: hlsUrl },
        ],
      });
    }

    qualities.push({ title: "Sub Indo", serverList });

    ok(res, {
      title,
      animeId: encodeId(url),
      // Prefer direct HLS stream (better quality, no embed player blocking)
      // Fall back to first iframe embed if HLS is unavailable
      defaultStreamingUrl: hlsUrl || iframes[0] ?? "",
      hasPrevEpisode: false,
      prevEpisode: null,
      hasNextEpisode: false,
      nextEpisode: null,
      server: { qualities },
      downloadUrl: { qualities: [] },
    });
  } catch (e: unknown) {
    logger.error(e, "neko /episode/:episodeId");
    fail(res, 502, "Gagal memuat episode");
  }
});

/**
 * GET /nekopoi/server/:serverId  — resolve a serverId to its playback URL
 */
router.get("/server/:serverId", async (req: Request, res: Response) => {
  try {
    const url = decodeId(String(req.params.serverId));
    ok(res, { url });
  } catch (e: unknown) {
    logger.error(e, "neko /server/:serverId");
    fail(res, 502, "Gagal memuat server");
  }
});

/**
 * GET /nekopoi/search/:query
 */
router.get("/search/:query", async (req: Request, res: Response) => {
  try {
    const q = decodeURIComponent(String(req.params.query));
    const data = await hmFetch(`/api/search?q=${encodeURIComponent(q)}`);
    ok(res, { animeList: transformList(req, data) });
  } catch (e: unknown) {
    logger.error(e, "neko /search/:query");
    fail(res, 502, "Gagal mencari konten");
  }
});

/**
 * GET /nekopoi/genre/:genreId
 * genreId is base64url-encoded genre URL, OR a raw slug like "hentai"
 */
router.get("/genre/:genreId", async (req: Request, res: Response) => {
  try {
    const raw = String(req.params.genreId);

    // Try to decode as base64url first; fall back to treating as slug
    const decoded = decodeId(raw);
    const genreUrl = decoded.startsWith("http")
      ? decoded
      : `${NEKO_ORIGIN}/genres/${raw}/`;

    const data = await hmFetch(
      `/api/genre?url=${encodeURIComponent(genreUrl)}`
    );
    ok(res, { animeList: transformList(req, data) });
  } catch (e: unknown) {
    logger.error(e, "neko /genre/:genreId");
    fail(res, 502, "Gagal memuat genre");
  }
});

/**
 * GET /nekopoi/genres  — full genre list from the scraper
 */
router.get("/genres", async (_req: Request, res: Response) => {
  try {
    const data = await hmFetch("/api/genres");
    const genres = Array.isArray(data)
      ? (data as { name?: string; url?: string }[]).map((g) => ({
          title: g.name ?? "",
          genreId: encodeId(g.url ?? g.name ?? ""),
          href: g.url ?? "",
        }))
      : [];
    ok(res, { genres });
  } catch (e: unknown) {
    logger.error(e, "neko /genres");
    fail(res, 502, "Gagal memuat daftar genre");
  }
});

/**
 * GET /nekopoi/categories  — category list (3D Hentai, JAV, etc.)
 */
router.get("/categories", async (req: Request, res: Response) => {
  try {
    const data = await hmFetch("/api/category");
    const categories = Array.isArray(data)
      ? (data as { name?: string; slug?: string; endpoint?: string }[]).map(
          (c) => ({
            name: c.name ?? "",
            slug: c.slug ?? "",
            // Map category slug → our /ongoing-anime?category=slug endpoint
            animeId: encodeId(`${NEKO_ORIGIN}/category/${c.slug}/`),
          })
        )
      : [];
    ok(res, { categories });
  } catch (e: unknown) {
    logger.error(e, "neko /categories");
    fail(res, 502, "Gagal memuat kategori");
  }
});

export default router;
