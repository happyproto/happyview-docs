# happyview.dev is a static Astro site, with the docs on Starlight under /docs

The v2 sidebar at `/docs/v2/` is superseded by [ADR 12](0012-v2-docs-live-at-v2-happyview-dev.md): the v2 docs moved to v2.happyview.dev. The rest still holds.

The site is Astro, with the docs on Starlight and the landing page and blog as plain Astro pages, styled with the HappyProto design system and happyproto.at's own stylesheet. It is fully static and deploys to wisp.place, like happyproto.at; redirects are a `_redirects` file wisp.place serves as 301s, and the comments' OAuth client metadata is a static file for `https://happyview.dev`, so sign-in works there and on a loopback dev server but not on previews. The landing page is at `/` and the docs at `/docs/`; v2 is frozen at `/docs/v2/` as a second sidebar.

Next.js with Fumadocs (the old site) and Vercel were the alternatives. Matching happyproto.at's stack lets the two sites share components and styles directly, and a static site on wisp.place needs no server. wisp.place caps a site at 1000 files, which CI checks.
