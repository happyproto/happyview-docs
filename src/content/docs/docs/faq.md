---
title: "FAQ"
description: "Answers to common questions about HappyView."
---

## What is HappyView?

HappyView is an open-source AppView for atproto. See the [Introduction](/docs).

## Can I host HappyView myself?

Yes. [Self-hosting](/docs/guides/self-hosting/docker) covers running an instance, and [Deploying](/docs/getting-started/deploying) covers sending a project to it.

## Does adding a record lexicon index that collection across the network?

Yes, by default. A record lexicon is indexed unless you set `indexed = false` for it in `happyview.toml`; an unindexed collection is left out of the Jetstream subscription and of backfill. See [Lexicons](/docs/getting-started/lexicons) and the [configuration reference](/docs/reference/configuration).

## Which languages can I write scripts in?

Lua, JavaScript and TypeScript. Each runs in an interpreter plugin that you add to your project or instance; see [Languages](/docs/reference/scripts/languages).

## Can I write scripts in Rust?

Not yet. Rust, Go and Zig are planned; see the [Roadmap](/docs/roadmap).

## What can a script do?

See [Scripts](/docs/getting-started/scripts).

## Which database does HappyView use?

SQLite or PostgreSQL. HappyView picks the backend from the scheme of `DATABASE_URL`; see [Database setup](/docs/guides/database/database-setup).

## Does HappyView send data about my instance anywhere?

Only if you turn telemetry on; it is off by default. [Telemetry](/docs/guides/telemetry) describes what a report contains and how to turn it on or off.

## Are atproto spaces on by default?

No. atproto spaces are off by default. Turn them on with the `feature.spaces_enabled` instance setting, from the dashboard's **Experiments** page, the admin API, or the `FEATURE_SPACES_ENABLED` environment variable; see [Spaces](/docs/guides/spaces#feature-flag).

## How does my app sign users in to my instance?

Create an API client for the app and authenticate users through it; see [API clients](/docs/guides/api-clients). For automation against the admin API, use an [API key](/docs/guides/api-keys) instead.

## My v2 scripts are refused after upgrading. What do I do?

v3 removed some Lua globals, and a script that still uses one is refused with `script references removed globals: ... -- run the codemod first`. [Migrating from v2](/docs/guides/migrating-scripts) lists the replacements and how to run the codemod.

## Can I write my own plugin?

Yes. A plugin is a WebAssembly module with a manifest, and a Rust SDK handles the calling convention and host imports. See [Developing plugins](/docs/guides/developing-plugins) and the [Plugin SDK reference](/docs/reference/plugin-sdk).

## What can a plugin do on my instance?

Only what its declared capabilities cover, and you accept those when you install it. See [Plugins](/docs/guides/plugins) and [Capabilities](/docs/reference/plugin-sdk#capabilities).

## Where do I report a problem?

Open an issue in the [HappyView repository](https://github.com/gamesgamesgamesgamesgames/happyview/issues). To look up an error message first, see [Troubleshooting](/docs/guides/troubleshooting).
