---
name: Streaming episode manifest
description: Episode playback is driven by a checked-in JSON manifest rather than placeholder or inferred video URLs.
---

Each playable episode must be represented in `episodes.json` under its anime slug. The watch page reads the selected anime and episode from the URL, loads the matching manifest record, and shows “Video unavailable” when `videoUrl` is absent.

**Why:** The project has no backend episode API or initialized video storage, and AniList provides metadata but not streaming sources. Falling back to a demo video would play the wrong content.

**How to apply:** Add only authorized MP4/HLS sources to the matching episode record. Keep episode numbers, titles, and source URLs together in the manifest so Previous, Next, direct selection, and canonical watch URLs remain synchronized.