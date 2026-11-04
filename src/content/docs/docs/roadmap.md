---
title: "Roadmap"
description: "What is planned for HappyView."
---

These items are planned but not yet available. None has a release date.

## Planned

- Interpreters for Rust, Go and Zig, so scripts can be written in those languages. Scripts are written in Lua, JavaScript or TypeScript today; see [Languages](/docs/reference/scripts/languages).
- Rust modules: handlers written in Rust and compiled to WebAssembly, which run in place of a script.
- Scheduled jobs: a job that runs at a later time, a failed job that is retried with backoff, and a job type that runs on a recurring schedule. Today a job runs as soon as a worker claims it; see [Background jobs](/docs/getting-started/background-jobs).
- Subscription lexicons. Today HappyView accepts a `subscription` lexicon but serves no endpoint for it.
- The admin API as XRPC methods under `dev.happyview.admin.*`, in place of the REST routes under `/admin`. See the [Admin API](/docs/reference/admin/admin-api).
- Editor extensions for each script language, including one for VS Code. Today `happyview types` writes declaration files that an editor's language server reads; see [Editor types](/docs/guides/type-generation).
- A refresh of the dashboard's layout.

## Release status

HappyView v3 is in prerelease. Its versions are cut from the `alpha` branch and carry an `-alpha.N` suffix.

Releases come from three branches:

| Branch | Releases |
|---|---|
| `main` | Stable versions |
| `beta` | Prereleases with a `-beta.N` suffix |
| `alpha` | Prereleases with an `-alpha.N` suffix |

When changes to the server land on one of these branches and its tests pass, CI runs semantic-release. It cuts a new version when the commits since the last release call for one, tags it with a `v` prefix, and publishes a GitHub release with generated notes.

## Where releases are announced

Releases are published as [GitHub releases](https://github.com/gamesgamesgamesgamesgames/happyview/releases) of the HappyView repository. The [Changelog](/docs/changelog) collects their notes.
