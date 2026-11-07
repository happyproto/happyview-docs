---
title: "Security policy"
description: "How to report a security vulnerability in HappyView, which release lines receive fixes, and how CI checks dependencies."
---

Report a suspected vulnerability privately, through GitHub. Don't describe it in a public issue, pull request or discussion.

## Report a vulnerability

Open a private report on the repository's [Security tab](https://github.com/gamesgamesgamesgamesgames/happyview/security/advisories/new). Only you and the maintainers can see it.

A report is most useful when it includes:

- the HappyView version and how it is deployed: the binary, the container image, or a build from source;
- the steps that reproduce the problem;
- what an attacker could do with it.

## Release lines that receive fixes

A security fix lands on `beta` first and ships in the next `3.0.0-beta.N` prerelease. If v2 needs it too, it's then cherry-picked onto a `<topic>-v2` branch and merged into `release/v2`, which cuts 2.17.x releases; see [Fix v2 too](/docs/contributing/develop#fix-v2-too). `main` stays at v2.17.0 until v3 ships stable. See [Release lines](/docs/contributing/release#release-lines).

## Dependency advisories

On `beta` and `release/v2`, CI runs `cargo audit` on every change to the server. It fails on any RustSec vulnerability advisory that affects a Rust dependency and isn't listed in `.cargo/audit.toml`, where each accepted advisory is recorded with its reason. A failing audit doesn't stop a release, because the `release` job doesn't require it.
