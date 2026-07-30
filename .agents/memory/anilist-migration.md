---
name: AniList migration
description: anime-images.js moved from Jikan REST to AniList GraphQL; ID map, cache prefix, and metadata store all changed.
---

## Rule
The image/metadata loader (`anime-images.js`) uses **AniList GraphQL** (`https://graphql.anilist.co`), not Jikan. All slug→ID lookups reference AniList IDs, not MAL IDs.

**Why:** Jikan was producing persistent 504 gateway errors and several MAL IDs in the old map were silently wrong (solo-leveling 58426→wrong anime, a-silent-voice 35247→wrong anime, suzume 50265→wrong anime). AniList is more stable, returns richer metadata in a single call, and is rate-limited at 90 req/min vs Jikan's lower threshold.

## How to apply
- The session-storage cache prefix is `hag2_` (was `hag_`). Do not revert to `hag_`.
- The ID constant is `AL` (was `MAL`). Keys are AniList IDs.
- `window._anilistData[slug]` holds the full metadata object per slug after load.
- `[data-anime-banner="slug"]` elements receive the banner image (or cover as fallback).
- `battle-through-heavens` and `perfect-world` are NOT on AniList — dynamic search also returns nothing; they show picsum seed fallbacks. Do not add fake AniList IDs for them.
- Three previously wrong Jikan IDs → confirmed correct AniList IDs:
  - solo-leveling: 151807 (Ore dake Level Up na Ken / Solo Leveling 2024)
  - a-silent-voice: 20954 (Koe no Katachi)
  - suzume: 142770 (Suzume no Tojimari 2022)
  - your-name: 21519 (Kimi no Na wa. — AniList search for this title returns a Suntory ad, must use ID directly)
