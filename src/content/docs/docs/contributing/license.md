---
title: "License"
description: "The license HappyView is published under, and the components that declare their own."
---

HappyView is published under the [MIT License](https://github.com/gamesgamesgamesgamesgames/happyview/blob/alpha/LICENSE.md), in `LICENSE.md` at the root of the repository, copyright 2024 Trezy Studios, LLC.

The details below come from the repository's files and manifests, and are not legal advice.

:::note[Pending]
[happyview#401](https://github.com/gamesgamesgamesgamesgames/happyview/pull/401) changes the copyright holder in every license file to HappyProto, LLC, adds the missing `LICENSE.md` to `@happyview/oauth-client-node`, and states that contributions are licensed under the terms of the file or package they change. This page describes the files as they are on `alpha` until it merges.
:::

## Components that declare a license

The Rust crates under `crates/` and the published SDK packages under `packages/` each declare a license in their manifest.

| Component | Kind | Declared license |
| --- | --- | --- |
| `happyview-provider` | Rust crate | MIT OR Apache-2.0 |
| `happyview-nsid` | Rust crate | MIT |
| `happyview-plc` | Rust crate | MIT |
| `happyview-plugin-sdk` | Rust crate | MIT |
| `happyview-scopes` | Rust crate | MIT |
| `happyview-script` | Rust crate | MIT |
| `happyview-script-macros` | Rust crate | MIT |
| `happyview-source-jetstream` | Rust crate | MIT |
| `@happyview/oauth-client` | npm package | MIT |
| `@happyview/oauth-client-browser` | npm package | MIT |
| `@happyview/oauth-client-node` | npm package | MIT |
| `@happyview/lex-agent` | npm package | MIT |
| `@happyview/nsid` | npm package | MIT |

`happyview-provider` is the contract that record sources and stores implement. It is dual-licensed so that a provider can be built under either license, and the crate carries both texts, `LICENSE-MIT` and `LICENSE-APACHE`.

The SDK packages that carry their own `LICENSE.md` name Lexicon Community as the copyright holder.

## Plugins

The interpreter plugins that run Lua, JavaScript and TypeScript scripts are released from a separate repository, [happyproto/plugins](https://github.com/happyproto/plugins). The `[workspace.package]` table in its `Cargo.toml` declares the MIT license, and the Lua, JavaScript and TypeScript plugin crates inherit it.

## Contributions

Every commit is signed off under the [Developer Certificate of Origin](https://developercertificate.org/). See [Sign off every commit](/docs/contributing/develop#sign-off-every-commit).
