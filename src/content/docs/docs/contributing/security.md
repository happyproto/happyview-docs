---
title: "Security policy"
description: "Where HappyView stands on vulnerability reports, and how CI checks its dependencies for advisories."
---

Don't describe a suspected vulnerability in a public issue, pull request or discussion.

## Report a vulnerability

HappyView has not published a private reporting channel or a security contact yet. GitHub's private vulnerability reporting is not enabled on the repository.

A report is most useful when it includes:

- the HappyView version and how it is deployed (the binary, the container image, or a build from source);
- the steps that reproduce the problem;
- what an attacker could do with it.

## Releases

Releases are cut by CI from the `main`, `beta` and `alpha` branches, as described in [Release](/docs/contributing/release). The [changelog](/docs/changelog) lists what each release changed.

## Dependency advisories

CI runs `cargo audit` on every change to the server. It fails on any RustSec vulnerability advisory that affects a Rust dependency and isn't listed in `.cargo/audit.toml`, where each accepted advisory is recorded with its reason. The check doesn't block a merge or a release.
