# Hanime-AG Premium

# Database Schema

Version: 1.0

This document defines the core database structure for Hanime-AG Premium.

---

# Users

- User ID
- Username
- Email
- Password (encrypted)
- Avatar
- Role (User/Admin)
- Subscription Plan
- Created At
- Last Login

---

# Profiles

- Profile ID
- User ID
- Display Name
- Bio
- Language
- Preferred Genres
- Theme

---

# Content

- Content ID
- Title
- Original Title
- Description
- Category
- Genre
- Release Year
- Studio
- Country
- Language
- Rating
- Duration
- Poster
- Banner
- Trailer
- Status
- Featured
- Trending

---

# Episodes

- Episode ID
- Content ID
- Episode Number
- Season
- Title
- Description
- Video URL
- Subtitle URL
- Thumbnail
- Duration

---

# Watch History

- History ID
- User ID
- Episode ID
- Progress
- Last Watched
- Completed

---

# Continue Watching

- User ID
- Episode ID
- Current Time
- Updated At

---

# Favorites

- Favorite ID
- User ID
- Content ID
- Added At

---

# Playlists

- Playlist ID
- User ID
- Name
- Description

---

# Playlist Items

- Playlist ID
- Content ID

---

# Comments

- Comment ID
- User ID
- Content ID
- Message
- Created At

---

# Ratings

- Rating ID
- User ID
- Content ID
- Score

---

# Notifications

- Notification ID
- User ID
- Title
- Message
- Read Status
- Created At

---

# Subscription

- Subscription ID
- User ID
- Plan
- Status
- Start Date
- End Date

---

# Admin

- Manage Users
- Manage Content
- Manage Categories
- Upload Videos
- Analytics
- Reports

---

# Future Expansion

The schema should remain modular and scalable to support mobile apps, smart TV apps, AI recommendations, and future premium services without major redesign.
