---
title: "Release"
description: "How CI turns a merge into a HappyView release: version numbers, binaries, container images and the SDK packages."
---

HappyView releases are cut by CI. CI releases a push to `main`, `beta` or `alpha` that changes the server or its build files, and a manual CI run with `server` selected. Either must pass the checks listed in [How a version is chosen](#how-a-version-is-chosen). The release gets a version computed from its commit messages, a GitHub release, container images and, except for some alpha versions, native binaries. The release notes are on the [changelog](/docs/changelog), which is generated from the GitHub releases.

Each branch runs the workflow files it carries. Everything after this section describes the pipeline on `alpha`, the v3 line. [On beta and main](#on-beta-and-main) lists how the v2 branches differ.

## Release lines

Each release branch is a release line.

| Branch | Line | Tag form | Container tags it moves |
| --- | --- | --- | --- |
| `main` | Stable | `vX.Y.Z` | The version, `<major>.<minor>`, `<major>` and `latest` |
| `beta` | Prerelease | `vX.Y.Z-beta.N` | The version |
| `alpha` | Prerelease | `vX.Y.Z-alpha.N` | The version |

Every build is also tagged with its commit's short SHA. A prerelease never moves `<major>.<minor>`, `<major>` or `latest`.

`main` is updated from `beta` (see [Choose the base branch](/docs/contributing/develop#choose-the-base-branch)). After CI succeeds on `main`, the `Merge main to beta` workflow merges `main` back into `beta`.

## How a version is chosen

[semantic-release](https://semantic-release.gitbook.io/) reads the commit messages since the branch's last release and picks the next version: `fix:` gives a patch, `feat:` a minor version, and a breaking change a major one. A push whose commits warrant no release cuts nothing. This is why commits follow [Conventional Commits](/docs/contributing/develop#use-conventional-commits).

The `release` job in `.github/workflows/ci.yml` runs semantic-release once these jobs have passed: `unit-tests`, `e2e-tests`, `e2e-tests-sqlite`, `lua-differential`, `frontend`, `playwright`, `lint` and `portability`. It also waits on the rest of the CI jobs, such as `coverage`, `audit` and the SDK tests, whose failures don't stop it. If any job it waits on was cancelled, it doesn't run, so a run whose tests a newer push cancelled can't cut a version. Once started, a release job is never cancelled.

semantic-release creates the tag (`v<version>`) and the GitHub release, and stores each tag's prerelease name (`beta` or `alpha`, and none for `main`) in a git note, and the job fetches the notes before it runs.

`Cargo.toml` keeps version `0.1.0` in the repository. Each release build writes the tag's version into `Cargo.toml` and `Cargo.lock` first, with `scripts/stamp-version.sh`, so the binary reports the released version.

## What a release publishes

After `release` cuts a version, three things run from it.

| Job | Publishes |
| --- | --- |
| `build` | A container image for `linux/amd64` and `linux/arm64`, pushed to `ghcr.io/gamesgamesgamesgamesgames/happyview` with the version, `<major>.<minor>`, `<major>` and short-SHA tags, the middle two for stable versions only |
| `tag-latest` | Stable versions only: points `latest` at the finished multi-architecture image |
| `dispatch-native-release` | Starts the `Release` workflow, `.github/workflows/release.yml`, for the new tag |

The `Release` workflow builds the native binaries with [cargo-dist](https://axodotdev.github.io/cargo-dist/), with the dashboard compiled in, and uploads them to the tag's GitHub release with a shell installer. The targets are macOS (`aarch64` and `x86_64`), Linux with glibc (`x86_64` and `aarch64`) and Linux with musl (`x86_64` and `aarch64`).

### Native binaries for alpha

An alpha version gets native binaries at most once every 20 hours. When another alpha native build succeeded or is still running within that window, `dispatch-native-release` skips the build and writes the command that would run it to the job summary. The tag and the container images are published for every alpha version regardless. Beta and stable versions always get native binaries.

### Build native binaries by hand

To build the binaries for a version whose build was skipped, or to rerun one:

```sh
gh workflow run release.yml --ref vX.Y.Z-alpha.N -f tag=vX.Y.Z-alpha.N
```

Dispatched with its default tag, `dry-run`, the workflow builds without publishing.

If `dispatch-native-release` itself failed after the tag was created, rerun that job from the CI run.

## The SDK packages

The five JavaScript SDK packages release from the same three branches, with versions of their own: `@happyview/oauth-client`, `@happyview/oauth-client-browser`, `@happyview/oauth-client-node`, `@happyview/lex-agent` and `@happyview/nsid`.

A package releases when its `test-<package>` job passes on a push that changes its files. `@happyview/oauth-client-browser`, `@happyview/oauth-client-node` and `@happyview/lex-agent` also release on changes to `packages/oauth-client/`, and `@happyview/nsid` on changes to the `happyview-nsid` crate. Each package runs semantic-release from its own directory and publishes to npm under the dist-tag `latest` from `main`, or the branch name from `beta` and `alpha`.

The three packages that depend on `@happyview/oauth-client` wait for its release when it changed. Before they publish, `scripts/resolve-workspace-deps.sh` replaces their `workspace:` ranges with the newest version of each dependency published under the branch's dist-tag. When that dist-tag has no version, it tries each earlier branch's dist-tag in turn: from `alpha`, that is `beta` and then `latest`.

## Pull request builds

Pull request builds aren't releases, and they publish nothing on a release line. When a pull request changes the server, CI's `pr-build` job builds the Linux binaries and a container image for each architecture. It skips a pull request whose head branch is `beta` or `alpha`, and it also skips a draft pull request. The `PR images` workflow then pushes the image to `ghcr.io/gamesgamesgamesgamesgames/happyview:pr-<number>` and comments on the pull request with how to pull it. That workflow runs from the default branch and never runs the pull request's code, so it works for a pull request from a fork.

## On beta and main

`beta` and `main` carry the v2 workflow. Its differences from the pipeline above:

- `release` waits on `unit-tests`, `e2e-tests`, `frontend`, `playwright` and `lint`. It has no guard against cancelled jobs, doesn't fetch the git notes first, and runs whichever semantic-release version `npx` resolves.
- The `build` job attaches two native binaries to the GitHub release, `happyview-linux-amd64` and `happyview-linux-arm64`. There is no `Release` workflow, no cargo-dist build and no `scripts/stamp-version.sh`.
- CI runs in full on draft pull requests, and `pr-build` builds their images too.
