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

Security fixes are released on the stable line, `main`, and on `beta`. See [Release lines](/docs/contributing/release#release-lines).

## Dependency advisories

On `alpha`, CI runs `cargo audit` on every change to the server. It fails on any RustSec vulnerability advisory that affects a Rust dependency and isn't listed in `.cargo/audit.toml`, where each accepted advisory is recorded with its reason. A failing audit doesn't stop a release, because the `release` job doesn't require it.
