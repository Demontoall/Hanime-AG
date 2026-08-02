---
name: Clean URL query parameters
description: The static serve workflow redirects .html routes to extensionless paths and drops query strings.
---

Use extensionless canonical routes whenever a page needs query parameters, such as `/watch?slug=...`.

**Why:** The configured static server redirects `/watch.html?slug=...` to `/watch` without forwarding the query string, causing the destination page to use its default item.

**How to apply:** For generated links and redirects with query parameters, target the extensionless route directly. Keep `.html` links only for routes without query parameters or when the server behavior has been verified.