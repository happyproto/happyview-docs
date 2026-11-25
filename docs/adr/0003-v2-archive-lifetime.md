---
status: superseded
---

# The v2 docs stay at /docs/v2 while v2 gets security releases

Superseded by [ADR 12](0012-v2-docs-live-at-v2-happyview-dev.md): the v2 docs moved to v2.happyview.dev, and `/docs/v2/` redirects there.

The v2 documentation is frozen at `/docs/v2/`, kept out of search and marked with a banner. It stays as long as v2 receives security releases; after that it is replaced by one page pointing to the last v2 release's docs in git. Removing it when v3 ships would strand operators still on v2, and keeping it forever would leave an unmaintained second set of docs for search engines and readers to find.
