---
name: Firebase auth integration
description: Firebase v10 ES-module auth + Firestore for Hanime AG; covers file architecture, known CSS gotcha, Firestore structure, and required console settings.
---

## Rule
All Firebase code uses **ES modules loaded from CDN** (`https://www.gstatic.com/firebasejs/10.12.2/…`). The site has no bundler — every Firebase import uses the full CDN URL. Do NOT switch to npm imports without adding a build step.

**Why:** Pure static site served by `npx serve .`. No Node/bundler available.

## File architecture
- `firebase-config.js` — initialises app, exports `auth`, `db`, `googleProvider`
- `auth.js` — exports `registerWithEmail`, `loginWithEmail`, `loginWithGoogle`, `logOut`, `resetPassword`, `friendlyError`, re-exports `auth` + `onAuthStateChanged`
- `favorites-client.js` — exports CRUD for `users/{uid}/favourites/{slug}` and `users/{uid}/history/{slug}`
- `auth-ui.js` — loads on every page via `<script type="module" src="auth-ui.js">`. Updates `.profile-icon-btn` and `.profile-btn` header elements; injects `.card-heart` buttons into `.card-thumb[img[data-anime]]`; exposes `window._hagToast(msg)`

## Pages
- `login.html` — email+password + Google, returnTo param, friendly error messages
- `signup.html` — display name + email + password + confirm, Google
- `forgot-password.html` — sends Firebase password reset email
- `account.html` — conditional guest/signed-in view (NO redirect); signed-in view shows avatar, name, email, badge, sign-out
- `favorite.html` — auth-gated (shows CTA, not redirect); reads/writes `users/{uid}/favourites`
- `history.html` — auth-gated; reads `users/{uid}/history`, shows timeAgo badges
- `watch.html` — reads `?slug=` param, favourite button, auto-saves to history on play

## CSS gotcha — `[hidden]` attribute + `display: flex`
`.auth-spinner { display: flex }` in the author stylesheet overrides the browser's `[hidden] { display: none }` (user-agent stylesheet). Fix already applied: added `.auth-spinner[hidden], .auth-btn-label[hidden] { display: none !important }` at end of style.css. Do NOT remove this rule if refactoring the auth CSS.

## Firestore data structure
```
users/{uid}                     displayName, email, photoURL, createdAt
users/{uid}/favourites/{slug}   slug, title, img, url, addedAt
users/{uid}/history/{slug}      slug, title, img, url, lastWatched
```

## How to apply
- Heart buttons are injected by `auth-ui.js` automatically on all `.card-thumb` with `img[data-anime]`.
- Watch history writes when user clicks play on `watch.html`. Reads `?slug=` URL param; falls back to `solo-leveling`.
- Card links in `index.html` get slug param auto-upgraded via an inline script at bottom of body.
- `window._hagToast(msg)` shows the bottom toast from any script on the page.
- `auth-ui.js` must be added to every page that has a `.profile-icon-btn` or `.profile-btn` element.

## Required Firebase console settings (must be done by user)
1. **Authentication → Sign-in method**: Enable "Email/Password" and "Google"
2. **Authentication → Authorized domains**: Add the Replit dev domain (e.g. `abc123.replit.dev`) and any custom/production domain
3. **Firestore Database**: Create in production or test mode (start with test mode, then apply rules below)
4. **Firestore Security Rules**:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /favourites/{favId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /history/{histId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```
