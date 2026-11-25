# The v2 docs live at v2.happyview.dev, not in this site

The v2 docs are their own site at `https://v2.happyview.dev`, built from `happyproto/happyview-docs-legacy` and kept at the URLs the old Next.js site served, with no `/docs` prefix. This site carries only the v3 docs. Every `/docs/v2/` URL answers with a 301 to the same page on the v2 site, and so does every root URL the old site served, such as `/guides/backfill`, because those were v2's pages. A root URL that only ever held a v3 page goes to the closest v2 page.

v2 is the stable line and still gets docs changes, so it isn't a frozen archive. A frozen copy here had already fallen behind the docs the HappyView repo kept editing, and keeping two copies in step would mean every v2 change landing twice. This supersedes [ADR 3](0003-v2-archive-lifetime.md), and the parts of [ADR 7](0007-astro-starlight-static-on-wisp.md) and [ADR 9](0009-site-search-covers-the-v3-docs.md) about the v2 archive.
