---
title: "Introduction"
---

HappyView is the best way to build an [AppView](https://atproto.com/guides/glossary#app-view) for the [atproto](https://atproto.com). Upload your [lexicon](/docs/architecture/glossary) schemas and get a fully functional AppView, complete with [XRPC](/docs/architecture/glossary) endpoints, OAuth, real-time network sync, and historical [backfill](/docs/guides/backfill), without writing a single line of server code.

Building an AppView from scratch means wiring up real-time event streams, record storage, XRPC routing, OAuth flows, and PDS write proxying before you can even think about your application. HappyView handles all of that. Define your data model with lexicons, add custom logic with Lua scripts when you need it, and ship your app.

## Features

- **Schema-driven endpoints:** Upload a [lexicon](/docs/getting-started/lexicons) and HappyView generates XRPC query and procedure routes, storage, and indexing from it — updatable at runtime with no restart.

- **Network sync built in:** Real-time record streaming via [Jetstream](https://github.com/bluesky-social/jetstream), historical [backfill](/docs/guides/backfill) from each user's PDS, and atproto OAuth with DPoP-bound proxy writes back to the PDS.

- **Customize with Lua scripts and plugins:** Trigger-keyed [Lua scripts](/docs/guides/lua-scripting) for XRPC query/procedure logic and [record/label event handling](/docs/getting-started/reacting-to-records), WASM [plugins](/docs/guides/plugins) for external platform integration, and [labeler](/docs/guides/labelers) subscriptions for content moderation.

- **Protocol-native:** Works with any PDS, resolves DIDs through the directory, and fetches [network lexicons](/docs/getting-started/lexicons#network-lexicons) via DNS authority resolution.

- **Permissioned Spaces:** Experimental support for [atproto Proposal 0016](/docs/guides/spaces) — membership-gated data containers with per-user repo state, cross-service credentials, and write notifications.

- **Full admin surface:** Built-in [dashboard](/docs/guides/dashboard) and [admin API](/docs/reference/admin/admin-api) for managing lexicons, users, API keys, API clients, backfill jobs, and plugins.

## Design Principles

- **Schema-first**: Your Lexicons are the source of truth. Upload a schema and HappyView derives endpoints, indexing rules, and network sync from it. You describe _what_ your data looks like; HappyView figures out the rest.

- **Zero boilerplate**: HappyView handles AppView infrastructure (Jetstream, backfill, OAuth, PDS proxying) for you. You should be writing application logic from minute one, not plumbing.

- **Runtime-configurable**: Lexicons can be added, updated, and removed without restarting the server. New endpoints and sync rules take effect immediately, so you can iterate on your data model in real time.

- **Protocol-native**: HappyView works with _any_ PDS, resolves DIDs through the directory, and follows atproto conventions. It's a first-class citizen of the network, not a wrapper around it.

## Next Steps

- [Quickstart](/docs/guides/self-hosting/railway): Deploy HappyView on Railway or run it locally
- [Lexicons](/docs/getting-started/lexicons): Upload lexicon schemas and start indexing records
- [Lua Scripting](/docs/guides/lua-scripting): Write custom query and procedure logic
- [Record & Label Scripts](/docs/getting-started/reacting-to-records): React to record changes and label events in real time
- [Labelers](/docs/guides/labelers): Subscribe to external labelers and manage content labels
- [Plugins](/docs/guides/plugins): Integrate with external platforms using WASM plugins
- [Permissioned Spaces](/docs/guides/spaces): Create membership-gated data containers with the atproto spaces API
- [Event Logs](/docs/guides/event-logs): Monitor system activity, debug script errors, and audit admin actions
