# Site search covers the v3 guides and reference, and the v2 archive stays open to search engines

The v2 archive part is superseded by [ADR 12](0012-v2-docs-live-at-v2-happyview-dev.md): the v2 docs moved to v2.happyview.dev, which has its own search. Keeping changelogs out of search still holds.

The site's search indexes v3 docs pages only. The v2 archive stays out, as [ADR 3](0003-v2-archive-lifetime.md) decided, and a v2 page says so in the search dialog. Changelogs are also out, because their long lists of feature names outranked the guide for almost every term a reader searched for.

"Kept out of search" in ADR 3 means this site's search. The v2 pages stay in the sitemap and open to search engines, since v2 is the stable release while v3 is in alpha, and hiding it would leave someone running v2 with only pages for a version they aren't on.

Indexing v2 behind a version filter was the alternative. It would help someone reading the archive, at the cost of editing a frozen tree and of a filter every v3 reader has to get past.
