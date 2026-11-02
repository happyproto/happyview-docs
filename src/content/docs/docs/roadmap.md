---
title: "Roadmap"
description: "What is planned for HappyView."
---

This page lists work that is planned for HappyView but not yet available. The roadmap changes as work ships or plans move, and no item here has a release date.

## Planned

- Interpreters for Rust, Go and Zig, so scripts can be written in those languages. Scripts are written in Lua, JavaScript or TypeScript today; see [Languages](/docs/reference/scripts/languages).
- Rust modules. They are not available yet.

## Release status

HappyView v3 is in prerelease. Its versions are cut from the `alpha` branch and carry an `-alpha.N` suffix, for example `v3.0.0-alpha.45`.

Releases come from three branches:

| Branch | Releases |
|---|---|
| `main` | Stable versions |
| `beta` | Prereleases with a `-beta.N` suffix |
| `alpha` | Prereleases with an `-alpha.N` suffix |

When changes to the server land on one of these branches and its tests pass, CI runs semantic-release. It cuts a new version when the commits since the last release call for one, tags it with a `v` prefix, and publishes a GitHub release with generated notes.

## Where releases are announced

Releases are published as [GitHub releases](https://github.com/gamesgamesgamesgamesgames/happyview/releases) of the HappyView repository. The [Changelog](/docs/changelog) collects their notes.
