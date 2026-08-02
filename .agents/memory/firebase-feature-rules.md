---
name: Firebase feature rules
description: New user-scoped Firestore collections and avatar Storage uploads need matching Firebase console security rules.
---

User-scoped playlists and notifications follow the existing `users/{uid}` ownership model, while profile avatar edits use Firebase Storage under `users/{uid}/avatar`.

**Why:** The static site has no local backend or deployment migration step, so client-side feature code alone does not grant authenticated users access in production.

**How to apply:** Whenever a new Firebase-backed user feature is added, update Firestore rules for its subcollections and Storage rules for its upload path before treating the feature as production-ready.