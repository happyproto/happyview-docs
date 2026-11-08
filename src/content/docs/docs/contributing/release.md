---
title: "Release"
description: "How CI turns a merge into a HappyView release: version numbers, binaries, container images and the SDK packages."
---

HappyView releases are cut by CI. CI releases a push to `beta` or `release/v2` that changes the server or its build files, and a manual CI run with `server` selected. Both must pass the [release gate](#the-release-gate). The release gets a version computed from its commit messages, a GitHub release, container images and, except for some beta versions, native binaries. The release notes are on the [changelog](/docs/changelog), which is generated from the GitHub releases.

Each branch runs the workflow files it carries. The sections from [How a version is chosen](#how-a-version-is-chosen) to [Pull request builds](#pull-request-builds) describe the pipeline on `beta`, the v3 line. [On release/v2](#on-releasev2) lists how the v2 fix line differs.

## Release lines

| Branch | Kind | Tag form | Container tags it moves |
| --- | --- | --- | --- |
| `beta` | Prerelease, v3 | `vX.Y.Z-beta.N` | The version |
| `release/v2` | Stable, 2.17.x only | `v2.17.Z` | The version, `2.17`, `2` and `latest` |
| `main` | Stable | `vX.Y.Z` | None until v3 ships stable. It stays at v2.17.0 |
| `alpha` | Parked and read-only | `vX.Y.Z-alpha.N`, up to `v3.0.0-alpha.67` | None |

Every build is also tagged with its commit's short SHA. A prerelease never moves `<major>.<minor>`, `<major>` or `latest`.

`latest` follows the newest 2.17.x release until v3 ships stable, because `beta` cuts only prereleases. A fix for v2 lands on `beta` first and is cherry-picked into `release/v2`; see [Fix v2 too](/docs/contributing/develop#fix-v2-too). Nothing merges `main` into `beta`.

## The release gate

The `release` job in `.github/workflows/ci.yml` cuts a version only when these jobs have passed:

| Branch | Jobs that must pass |
| --- | --- |
| `beta` | `unit-tests`, `e2e-tests`, `e2e-tests-sqlite`, `lua-differential`, `frontend`, `playwright`, `lint` and `portability` |
| `release/v2` | `unit-tests`, `e2e-tests`, `frontend`, `playwright` and `lint` |

On `beta`, the job also waits on the rest of the CI jobs, such as `coverage`, `audit` and the SDK tests, whose failures don't stop it. If any job it waits on was cancelled, it doesn't run, so a run whose tests a newer push cancelled can't cut a version. Once started, a release job is never cancelled.

## How a version is chosen

[semantic-release](https://semantic-release.gitbook.io/) reads the commit messages since the branch's last release and picks the next version: `fix:` gives a patch, `feat:` a minor version, and a breaking change a major one. A push whose commits warrant no release cuts nothing. This is why commits follow [Conventional Commits](/docs/contributing/develop#use-conventional-commits).

The `release` job runs a semantic-release version pinned in `ci.yml`. semantic-release creates the tag (`v<version>`) and the GitHub release. It records each tag's prerelease name (`beta`, `alpha` for the earlier v3 tags, and none for a stable version) in a git note. The job fetches the notes before it runs, because without them the version counter would restart from the newest tag on `main`.

`Cargo.toml` keeps version `0.1.0` in the repository. Each release build writes the tag's version into `Cargo.toml` and `Cargo.lock` first, with `scripts/stamp-version.sh`, so the binary reports the released version.

## What a release publishes

After `release` cuts a version, three things run from it.

| Job | Publishes |
| --- | --- |
| `build` | A container image for `linux/amd64` and `linux/arm64`, pushed to `ghcr.io/gamesgamesgamesgamesgames/happyview` with the version, `<major>.<minor>`, `<major>` and short-SHA tags, the middle two for stable versions only |
| `tag-latest` | Stable versions only: points `latest` at the finished multi-architecture image |
| `dispatch-native-release` | Starts the `Release` workflow, `.github/workflows/release.yml`, for the new tag |

The `Release` workflow builds the native binaries with [cargo-dist](https://axodotdev.github.io/cargo-dist/), with the dashboard compiled in, and uploads them to the tag's GitHub release with a shell installer. The targets are macOS (`aarch64` and `x86_64`), Linux with glibc (`x86_64` and `aarch64`) and Linux with musl (`x86_64` and `aarch64`).

### Native binaries for beta

A beta version gets native binaries at most once every 20 hours. When another prerelease native build, including one started by hand, succeeded or is still running within that window, `dispatch-native-release` skips the build and writes the command that would run it to the job summary. The tag and the container images are published for every beta version regardless.

Once a day, the `Native catch-up` workflow, `.github/workflows/native-catch-up.yml`, builds the newest v3 release's binaries if it has none, so the last cut of a busy day gets them at the next daily run, at 06:17 UTC. A stable v3 version always gets native binaries.

### Build native binaries by hand

To build the binaries for a version whose build was skipped, or to rerun one:

```sh
gh workflow run release.yml --ref vX.Y.Z-beta.N -f tag=vX.Y.Z-beta.N
```

Dispatched with its default tag, `dry-run`, the workflow builds without publishing.

If `dispatch-native-release` itself failed after the tag was created, rerun that job from the CI run.

## The SDK packages

The five JavaScript SDK packages release from `beta`, with versions of their own, and none of them releases from `release/v2`: `@happyview/oauth-client`, `@happyview/oauth-client-browser`, `@happyview/oauth-client-node`, `@happyview/lex-agent` and `@happyview/nsid`.

A package releases when its `test-<package>` job passes on a push that changes its files, or on a manual CI run with that package selected. The release gate's guard against cancelled jobs applies to it too. `@happyview/oauth-client-browser`, `@happyview/oauth-client-node` and `@happyview/lex-agent` also release on changes to `packages/oauth-client/`, and `@happyview/nsid` on changes to the `happyview-nsid` crate. Each package runs semantic-release from its own directory and publishes to npm under the dist-tag `beta` from `beta`, or `latest` from `main`.

The three packages that depend on `@happyview/oauth-client` wait for its release when it changed. Before they publish, `scripts/resolve-workspace-deps.sh` replaces their `workspace:` ranges with the newest version of each dependency published under the branch's dist-tag. When that dist-tag has no version, it tries each earlier branch's dist-tag in turn: from `beta`, that is `latest`.

## Pull request builds

Pull request builds aren't releases, and they publish nothing on a release line. When a pull request changes the server, CI's `pr-build` job builds the Linux binaries and a container image for each architecture. It skips a pull request whose head branch is `beta` or `alpha`, and it also skips a draft pull request. The `PR images` workflow then pushes the image to `ghcr.io/gamesgamesgamesgamesgames/happyview:pr-<number>` and comments on the pull request with how to pull it. That workflow runs from the default branch and never runs the pull request's code, so it works for a pull request from a fork.

## On release/v2

`release/v2` cuts 2.17.x releases only, and carries the v2 line's workflow. Its differences from the pipeline above:

- `.releaserc.json` lists `release/v2` as its only branch, and refuses any version outside 2.17.x.
- A pull request into it must pass `v2-guard`, which refuses `feat` and breaking changes and v3 history. See [Fix v2 too](/docs/contributing/develop#fix-v2-too).
- The server's release runs on changes to fewer paths: changes under `scripts/` and `.github/workflows/` don't trigger it.
- `release` waits only on the five jobs in [The release gate](#the-release-gate), and has no guard against cancelled jobs. It fetches the git notes and pins its semantic-release version, as `beta` does.
- The Dockerfile writes the version into `Cargo.toml` itself; there is no `scripts/stamp-version.sh`.
- The `build` job attaches two native binaries to the GitHub release, `happyview-linux-amd64` and `happyview-linux-arm64`. There is no `Release` workflow and no cargo-dist build.
- No SDK package releases from it.
- CI runs in full on draft pull requests, and `pr-build` builds their images too.

`main` carries the v2 workflow from before `release/v2` existed. It has cut nothing since v2.17.0, and no change merges into it until v3 ships stable.
