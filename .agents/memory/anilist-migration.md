---
name: AniList migration
description: anime-images.js moved from Jikan REST to AniList GraphQL; ID map, cache prefix, metadata store, and fetch strategy all changed.
---

## Rule
The image/metadata loader (`anime-images.js` v5) uses **AniList GraphQL** (`https://graphql.anilist.co`), not Jikan. All slug→ID lookups reference AniList IDs, not MAL IDs.

**Why:** Jikan had persistent 504 gateway errors and several MAL IDs in the old map were silently wrong (solo-leveling, a-silent-voice, suzume, your-name). AniList is more stable, returns richer metadata in one call, and is rate-limited at 90 req/min.

## Batch strategy (critical)
All 25 known AniList IDs are fetched in **ONE** `Page(id_in:[...])` query. This loads all covers in ~0.2s instead of 9+ seconds with sequential 700ms-gated calls. Do NOT revert to sequential per-slug fetches — this was the root cause of covers not displaying.

**Why individual sequential calls failed:** 13 slugs × 700ms gate = 9+ second minimum. The screenshot/preview tool captures the page in ~1-2s, before any covers loaded. Users waiting on slow connections also experienced the same delay.

## Direct src assignment
`applyMeta()` sets `img.src = meta.cover` directly — no `new Image()` preload wrapper. The preload pattern risks the temp Image object being GC'd before `onload` fires. Direct src is simpler and equally effective since the AniList CDN is fast.

## How to apply
- The session-storage cache prefix is `hag2_` (was `hag_`). Do not revert to `hag_`.
- The ID constant is `AL` (was `MAL`). Keys are AniList IDs.
- `window._anilistData[slug]` holds full metadata after load.
- `[data-anime-banner="slug"]` elements receive the banner image (or cover as fallback).
- `battle-through-heavens` and `perfect-world` are NOT on AniList — dynamic search also returns nothing; they show picsum seed fallbacks. Do not add fake IDs for them.

## Confirmed correct AniList IDs (previously wrong in Jikan map)
- solo-leveling: 151807
- a-silent-voice: 20954
- suzume: 142770
- your-name: 21519 (AniList search returns a Suntory water ad with same JP title — must use ID directly)
