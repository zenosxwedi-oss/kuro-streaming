// ─────────────────────────────────────────────────────────────────────────────
// Sankavollerei API  —  https://www.sankavollerei.web.id
//
// Anime  (sub indo)  → BASE /anime
// Nekopoi (hentai)   → BASE /nekopoi   (same shape, different prefix)
// ─────────────────────────────────────────────────────────────────────────────

const ANIME_BASE = 'https://www.sankavollerei.web.id/anime';
// Use local API server for nekopoi if available, fallback to external API
const NEKO_BASE  = process.env.EXPO_PUBLIC_NEKO_BASE ?? 'https://www.sankavollerei.web.id/nekopoi';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AnimeItem {
  title: string;
  poster: string;
  animeId: string;
  href: string;
  episodes?: number | null;
  score?: string;
  status?: string;
  releaseDay?: string;
  latestReleaseDate?: string;
  lastReleaseDate?: string;
  season?: string;
  studios?: string;
  genreList?: GenreItem[];
}

export interface GenreItem {
  title: string;
  genreId: string;
  href: string;
}

export interface AnimeDetail {
  title: string;
  poster: string;
  japanese?: string;
  score?: string;
  type?: string;
  status?: string;
  episodes?: number | null;
  duration?: string;
  aired?: string;
  producers?: string;
  studios?: string;
  batch?: string | null;
  synopsis?: { paragraphs: string[]; connections?: string[] };
  genreList: GenreItem[];
  episodeList: EpisodeListItem[];
  recommendedAnimeList: AnimeItem[];
}

export interface EpisodeListItem {
  title: string;
  eps: number;
  date: string;
  episodeId: string;
  href: string;
}

export interface Server {
  title: string;
  serverId: string;
  href: string;
}

export interface Quality {
  title: string;
  serverList: Server[];
}

export interface DownloadUrl {
  title: string;
  size: string;
  urls: { title: string; url: string }[];
}

export interface EpisodeDetail {
  title: string;
  animeId: string;
  releaseTime?: string;
  defaultStreamingUrl?: string;
  hasPrevEpisode: boolean;
  prevEpisode?: string | null;
  hasNextEpisode: boolean;
  nextEpisode?: string | null;
  server: { qualities: Quality[] };
  downloadUrl?: { qualities: DownloadUrl[] };
}

export interface AnimeListGroup {
  startWith: string;
  animeList: { title: string; animeId: string; href: string }[];
}

// ── Fetch helper ─────────────────────────────────────────────────────────────

async function apiFetch<T>(base: string, path: string): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.message || 'API error');
  return json.data as T;
}

const a = <T>(path: string) => apiFetch<T>(ANIME_BASE, path);
const n = <T>(path: string) => apiFetch<T>(NEKO_BASE, path);

// ── Anime API ────────────────────────────────────────────────────────────────
//  GET /home               → { ongoing: { animeList } }
//  GET /ongoing-anime      → { animeList }
//  GET /complete-anime     → { animeList }
//  GET /anime              → { list: AnimeListGroup[] }   (A-Z all anime)
//  GET /anime/:animeId     → AnimeDetail
//  GET /episode/:episodeId → EpisodeDetail  (includes downloadUrl)
//  GET /server/:serverId   → { url: string }
//  GET /search/:query      → { animeList }
//  GET /genre/:genreId     → { animeList }

export const api = {
  getHome:        () => a<{ ongoing: { animeList: AnimeItem[] } }>('/home'),
  getOngoing:     () => a<{ animeList: AnimeItem[] }>('/ongoing-anime'),
  getComplete:    () => a<{ animeList: AnimeItem[] }>('/complete-anime'),
  getAnimeList:   () => a<{ list: AnimeListGroup[] }>('/anime'),
  getAnimeDetail: (id: string) => a<AnimeDetail>(`/anime/${id}`),
  getEpisode:     (id: string) => a<EpisodeDetail>(`/episode/${id}`),
  getServer:      (id: string) => a<{ url: string }>(`/server/${id}`),
  search:         (q: string)  => a<{ animeList: AnimeItem[] }>(`/search/${encodeURIComponent(q)}`),
  getGenre:       (id: string) => a<{ animeList: AnimeItem[] }>(`/genre/${id}`),

  // ── Nekopoi API ────────────────────────────────────────────────────────────
  neko: {
    getHome:     () => n<{ animeList: AnimeItem[] }>('/home'),
    getLatest:   () => n<{ animeList: AnimeItem[] }>('/ongoing-anime'),
    getPopular:  () => n<{ animeList: AnimeItem[] }>('/complete-anime'),
    /** Paginated list for a category slug (empty = all). page starts at 1. */
    getPage: (slug: string, page: number) => {
      const qs = slug
        ? `category=${encodeURIComponent(slug)}&page=${page}`
        : `page=${page}`;
      return n<{ animeList: AnimeItem[] }>(`/ongoing-anime?${qs}`);
    },
    getDetail:   (id: string) => n<AnimeDetail>(`/anime/${id}`),
    getEpisode:  (id: string) => n<EpisodeDetail>(`/episode/${id}`),
    getServer:   (id: string) => n<{ url: string }>(`/server/${id}`),
    search:      (q: string)  => n<{ animeList: AnimeItem[] }>(`/search/${encodeURIComponent(q)}`),
    getGenre:    (id: string) => n<{ animeList: AnimeItem[] }>(`/genre/${id}`),
  },
};
