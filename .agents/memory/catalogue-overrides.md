---
name: Catalogue overrides
description: Managed Firestore catalogue and episode records extend the checked-in static catalogue without replacing its fallback.
---

The checked-in catalogue and episode manifest are the reliable public fallback; authenticated Firestore records can override metadata and episodes for administrators.

**Why:** Static hosting must remain functional when Firebase is unavailable or has not been populated, while production operators need editable content and licensed source fields.

**How to apply:** Keep stable content IDs and slugs aligned across JSON, Firestore, favourites, history, and watch routes. Wait for Firebase Auth to resolve before attempting managed reads, and keep nullable video URLs.