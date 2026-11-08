# happyview.dev

The website and documentation for [HappyView](https://github.com/gamesgamesgamesgamesgames/happyview): the landing page, the docs and the blog. It is an [Astro](https://astro.build) site, with the docs on [Starlight](https://starlight.astro.build), styled with the HappyProto design system (`@happyview/design-system`), and deployed to [wisp.place](https://wisp.place).

## Working on it

```sh
bun install
bun run dev        # http://localhost:4321
bun run build      # builds dist/, and fails on a broken internal link or anchor
bun test           # the frozen-URL and link-style tests; run after a build
bun run test:browser  # types in search on the built site; run after a build
```

## Where things are

- `src/content/docs/docs/` holds the docs, served under `/docs/`. `v2/` is the v2 documentation, frozen: it is kept for people still on v2 and is not edited.
- `src/sidebar.ts` is the v3 sidebar. A page not listed there builds but is reachable only by link.
- `src/content/blog/` holds the blog posts. A post's file name is its URL.
- `src/content/landing/` holds the landing page's copy and the sample project it shows.
- `src/redirects.json` maps every URL the old site served to its new home. The build writes it to `dist/_redirects` for wisp.place, and `test/legacy-urls.test.ts` checks that every URL in `test/legacy-urls.txt` still answers.
- `src/styles/marketing.css` holds the rules this site uses from happyproto.at's stylesheet. `src/styles/docs.css` points Starlight's colours and type at the design system's tokens.

## Writing a page

Every page has a `title` in sentence case and a one-sentence `description`. A how-to page may list `prerequisites`, as paths. Use Starlight's asides (`:::note`, `:::tip`, `:::caution`, `:::danger`) for callouts, and `<Tabs syncKey="lang">` from `@astrojs/starlight/components` for code in several languages, in the order Lua, JavaScript, TypeScript.

Reference pages own every key, flag and field. A guide explains the few a reader needs first and links to the reference for the rest. Give every v3 diagram an `accTitle`; a test checks it.

Links are root-absolute (`/docs/guides/backfill`), with no `.md`. Relative links resolve differently with and without a trailing slash, which is how the old site collected its broken links.

Every claim about HappyView should be checkable against its code on `beta`, the v3 branch. Mark behaviour that is only in an open pull request as pending, naming the pull request. A dashboard label an open pull request is changing may be quoted in its new wording, with one note on the page saying so.

## Generated content

- `bun run generate-changelogs` writes the changelogs from HappyView's GitHub releases. The build runs it.
- `node scripts/generate-permissions.mjs <happyview>/src/admin/permissions.rs` rewrites the permissions table in the glossary. CI checks it against HappyView's `beta`, the branch the repository variable `HAPPYVIEW_V3_REF` names.
