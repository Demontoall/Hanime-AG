# Hanime-AG Premium

# API Specification

Version: 1.0

This document defines the communication between the frontend, backend, and database.

---

## Authentication

POST /api/auth/register

POST /api/auth/login

POST /api/auth/logout

GET /api/auth/me

PUT /api/auth/profile

---

## Users

GET /api/users

GET /api/users/:id

PUT /api/users/:id

DELETE /api/users/:id

---

## Content

GET /api/content

GET /api/content/:id

GET /api/content/trending

GET /api/content/latest

GET /api/content/featured

GET /api/content/category/:category

GET /api/content/genre/:genre

---

## Episodes

GET /api/episodes/:contentId

GET /api/episode/:episodeId

---

## Search

GET /api/search

GET /api/search/suggestions

---

## Favorites

GET /api/favorites

POST /api/favorites

DELETE /api/favorites/:id

---

## Watch History

GET /api/history

POST /api/history

DELETE /api/history

---

## Continue Watching

GET /api/continue

POST /api/continue

---

## Playlists

GET /api/playlists

POST /api/playlists

PUT /api/playlists/:id

DELETE /api/playlists/:id

---

## Comments

GET /api/comments/:contentId

POST /api/comments

DELETE /api/comments/:id

---

## Ratings

GET /api/ratings/:contentId

POST /api/ratings

---

## Notifications

GET /api/notifications

PUT /api/notifications/read

---

## Admin

GET /api/admin/dashboard

POST /api/admin/content

PUT /api/admin/content/:id

DELETE /api/admin/content/:id

GET /api/admin/users

GET /api/admin/analytics

---

## Future APIs

AI Recommendations

Subscriptions

Payments

Advertisements

Watch Party

Offline Downloads

Push Notifications

Smart TV Sync
