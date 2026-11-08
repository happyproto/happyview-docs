---
status: superseded
---

# v3 pages that install or clone HappyView name the alpha line

Superseded by [ADR 13](0013-v3-pages-pin-beta.md): v3 moved to `beta` at v3.0.0-beta.1, and `alpha` is parked.

A v3 page that pulls an image, clones the source or links a file on GitHub names a v3 tag or the `alpha` branch. While v3 is in alpha, `latest` and the default branch are v2, so a page following the usual convention would install v2 and then fail on the next step of a v3 guide. That's the failure [ADR 5](0005-v3-docs-ship-only-what-works-on-v3.md) exists to stop.

Using `latest` and adding a warning was the alternative. It reads better now and needs no change at release, but a reader who misses the warning gets the wrong major version with no error until a script fails. The cost of pinning is a sweep of these pages when v3 becomes the default.
