---
name: Kuro Streaming App
description: Expo anime/hentai streaming app sourced from zenosxwedi-oss/kuro-streaming GitHub repo
---

## What it is
Anime & hentai streaming mobile app built with Expo + React Native. Fetched from https://github.com/zenosxwedi-oss/kuro-streaming.

## Key architecture
- `artifacts/kuro` — Expo app (React Native)
- `artifacts/api-server/src/routes/nekopoi.ts` — proxy route for nekopoi/hentai API
- API base: `EXPO_PUBLIC_NEKO_BASE=https://$REPLIT_DEV_DOMAIN/api/nekopoi` (set in dev script)
- Anime API: `https://www.sankavollerei.web.id/anime` (direct from client)
- Nekopoi/hentai API: proxied through `/api/nekopoi` on API server

## Tab structure
- Home (index) — ongoing/completed anime
- Nekopoi (hentai) — hentai streaming with category/genre filters
- Search — search anime or nekopoi
- Library — bookmarks (AsyncStorage)

## Theme
- Dark: background #0d0d16, primary #e63946 (red)
- colors.ts has both `light` and `dark` keys

## APK situation
- NOT a native APK builder. The repo's build.js creates static JS bundles for Expo OTA updates.
- For a real APK: user must use EAS Build (requires Expo account).
- Expo Go (QR code scan) is the dev/preview method.
- `scripts/build.js` + `server/serve.js` serve static bundles for production deployment.

## Packages added beyond scaffold
- `react-native-webview@13.15.0` — VideoPlayer uses WebView for streaming
- `expo-updates@~29.0.18` — OTA update support for production builds

## Fixes applied
- `useColors.ts` rewritten to avoid TS cast error on `colors.radius` field
- `KeyboardProvider` works in Expo Go (react-native-keyboard-controller is compatible)

**Why:** The repo uses a custom build mechanism instead of EAS, and uses WebView for video playback to avoid needing custom native video modules.
