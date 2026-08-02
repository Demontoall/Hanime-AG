---
name: Firebase feature rules
description: New user-scoped Firestore collections need matching Firebase console security rules.
---

User-scoped profile data, playlists, and notifications follow the existing `users/{uid}` ownership model. The app currently uses Firestore only; profile images are limited to existing authentication-provider photo URLs.

**Why:** The static site has no local backend or deployment migration step, so client-side feature code alone does not grant authenticated users access in production.

**How to apply:** Whenever a new Firebase-backed user feature is added, update Firestore rules for its user-scoped collections before treating the feature as production-ready. Do not add Firebase Storage dependencies unless explicitly required later.