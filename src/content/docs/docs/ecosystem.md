---
title: "Ecosystem"
description: "Plugins, SDKs and tools that work with HappyView."
---

This page lists the official plugins, packages and tools built for HappyView, with the page or repository that documents each one.

## Plugins

The official plugins are built in the [plugins repository](https://github.com/happyproto/plugins) and published to the HappyProto plugin registry. [Plugins](/docs/guides/plugins) covers installing them.

### Interpreters

An interpreter plugin runs scripts in one language. [Languages](/docs/reference/scripts/languages) covers choosing and installing them.

| Plugin | What it is |
| --- | --- |
| `happyview-lua` | Runs scripts in Lua 5.4. |
| `happyview-javascript` | Runs scripts in JavaScript on the QuickJS-ng engine. |
| `happyview-typescript` | Runs scripts in TypeScript, compiled with SWC and run on QuickJS-ng. |

### Libraries

A library plugin gives scripts a set of functions under a `happyview.*` namespace. [Libraries](/docs/reference/scripts/libraries) lists the capabilities each one needs and links to its README.

| Plugin | Namespace | What it is |
| --- | --- | --- |
| `happyview-db` | `happyview.db` | Queries indexed records. |
| `happyview-sql` | `happyview.sql` | Runs SQL against the operator's own tables. |
| `happyview-backlinks` | `happyview.backlinks` | Finds records that reference a given AT URI. |
| `happyview-record` | `happyview.record` | Writes records as the calling user, writes to the local index, and validates records against lexicons. |
| `happyview-xrpc` | `happyview.xrpc` | Makes XRPC queries and procedure calls as the calling user. |
| `happyview-atproto` | `happyview.atproto` | Resolves services, downloads blobs, looks up labels, and signs attestations. |
| `happyview-spaces` | `happyview.spaces` | Reads and writes records, membership and invites in atproto spaces. |
| `happyview-linked-repos` | `happyview.linked_repos` | Writes records, uploads blobs and makes XRPC calls through repos an operator has linked. |
| `happyview-jobs` | `happyview.jobs` | Enqueues and reads background jobs. |
| `happyview-http` | `happyview.http` | Sends outbound HTTP requests. |
| `happyview-blobs` | `happyview.blobs` | Stores and reads byte content, addressed by the CID of its contents. |
| `happyview-account` | `happyview.account` | Reads the calling user's email address, as their PDS reports it. |

Atproto spaces are off by default; [Spaces](/docs/guides/spaces) covers turning them on.

## JavaScript packages

These packages are in the `packages/` directory of the [HappyView repository](https://github.com/gamesgamesgamesgamesgames/happyview). [SDK overview](/docs/reference/sdk) explains which one to use.

| Package | What it is | Docs |
| --- | --- | --- |
| `@happyview/lex-agent` | Connects the `@atproto/lex` client to a HappyView instance with DPoP authentication. | [Lex agent](/docs/reference/sdk/lex-agent) |
| `@happyview/oauth-client` | The platform-agnostic OAuth client that the browser and Node.js clients build on. | [OAuth client](/docs/reference/sdk/oauth-client) |
| `@happyview/oauth-client-browser` | OAuth client for browser apps. | [Browser client](/docs/reference/sdk/oauth-client-browser) |
| `@happyview/oauth-client-node` | OAuth client for server-side Node.js apps. | [Node client](/docs/reference/sdk/oauth-client-node) |
| `@happyview/nsid` | Validates AT Protocol NSIDs. | [Repository](https://github.com/gamesgamesgamesgamesgames/happyview) |

## Rust crates

These crates are in the `crates/` directory of the [HappyView repository](https://github.com/gamesgamesgamesgamesgames/happyview).

| Crate | What it is | Docs |
| --- | --- | --- |
| `happyview-plugin-sdk` | The Rust SDK for writing HappyView plugins. | [Plugin SDK](/docs/reference/plugin-sdk) |
| `happyview-provider` | The traits a record source or record storage implements. | [Record providers](/docs/guides/record-providers) |

## Tools

| Tool | What it is | Docs |
| --- | --- | --- |
| `hpy` | HappyProto's CLI. It creates, runs, tests and deploys HappyView projects, and publishes plugins to the registry. | [CLI](/docs/reference/cli), [repository](https://github.com/happyproto/cli) |
