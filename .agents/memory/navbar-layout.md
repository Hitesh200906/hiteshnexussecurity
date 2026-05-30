---
name: Floating navbar layout constraint
description: Nexus Security navbar is fixed/floating, so page content must add top padding to clear it.
---

The Nexus Security `Navbar` is a fixed floating glassmorphism pill (not sticky/in-flow). It overlays page content.

**Why:** Matches the reference site (secure-domain-scan.lovable.app) where the nav floats over the hero.

**How to apply:** Any new page or top section must reserve space so its first content clears the nav:
- Sub-pages use `PageHeader` which includes `pt-36`.
- The home `Hero` uses `min-h-[92vh]` centered + `pt-24` so its top badge isn't hidden behind the nav.
- The `Login` and `Profile` pages add `pt-28`/`pt-32`.
Forgetting this hides the top of the page (e.g. a section badge) behind the floating nav.
