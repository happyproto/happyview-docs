---
title: "Develop"
description: "Set up a HappyView checkout, run the development stack, and open a pull request that can merge."
---

This page covers work on HappyView itself: choosing a base branch, setting up a checkout, running the development stack, and what a pull request needs before it can merge. To run the checks CI runs, see [Test](/docs/contributing/test). To build an app on HappyView instead, see [Installation](/docs/getting-started/installation).

## Choose the base branch

| Branch | What it carries | Target it when |
| --- | --- | --- |
| `beta` | The current release line, v2 | The change belongs to v2 |
| `alpha` | The next major line, v3, which this documentation describes | The change belongs to v3 |
| `main` | The stable v2 release | Never directly: `main` is updated from `beta` when a release is cut |

GitHub opens a new pull request against `main` by default, so set the **base** to `beta` or `alpha`.

## Set up a checkout

You need:

- [rustup](https://rustup.rs). `rust-toolchain.toml` pins Rust 1.97.1 with `clippy` and `rustfmt`, and rustup installs that version on the first build.
- Node.js 24 and npm, for the dashboard in `web/`.
- [Bun](https://bun.sh), for the JavaScript SDK packages in `packages/`.
- Docker with Compose, for the development stack and the test databases.

1. Fork the repository on GitHub and clone your fork. Then add the main repository as `upstream`:

   ```sh
   git remote add upstream https://github.com/gamesgamesgamesgamesgames/happyview.git
   git fetch upstream
   ```

2. Start a branch from the base you chose:

   ```sh
   git switch -c fix/my-change upstream/alpha
   ```

3. Point git at the repository's `.githooks/` directory, once per clone:

   ```sh
   git config core.hooksPath .githooks
   ```

Git then runs a subset of CI's `lint` checks before each commit and push:

| Git event | Runs |
| --- | --- |
| `pre-commit` | `cargo fmt -- --check` and `cargo clippy -- -D warnings` over the library and binaries, then Prettier on the staged files under `web/` |
| `pre-push` | `cargo clippy --all-targets -- -D warnings`, which also lints the test code |

The Prettier step restages the files it formats. It leaves alone any file that is staged and also modified in the working tree, and it is skipped while `web/node_modules/.bin/prettier` is missing, so run `npm ci` in `web/` on the host. The development stack installs the dashboard's dependencies inside its container, which doesn't count. Both build into `target/clippy`, so clippy and `cargo test` don't invalidate each other's build cache.

## Run the development stack

`docker-compose.yml` runs the server and the dashboard, and rebuilds each when its source changes.

1. Copy the example environment file:

   ```sh
   cp .env.example .env
   ```

2. Set `SESSION_SECRET` in `.env` to a random value of at least 32 bytes. This command prints one:

   ```sh
   openssl rand -base64 48
   ```

   Without a secure value the server starts, but cookie-based sign-in to the dashboard is disabled.

3. Start the stack:

   ```sh
   docker compose up
   ```

   The first run compiles the Rust workspace inside the container, which takes several minutes. Later runs reuse the cached build volume.

4. Open `http://127.0.0.1:3080`.

| Service | Port | What it runs |
| --- | --- | --- |
| `caddy` | 3080 | The single origin. It sends the server's paths, such as `/api`, `/admin`, `/xrpc` and `/oauth`, to `happyview`, and everything else to `web` |
| `happyview` | 3000 | The Rust server under `cargo watch` |
| `web` | 3001 | The Next.js dashboard dev server |
| `tunnel` | none | `cloudflared`, which gives the stack a public HTTPS URL |

Use port 3080. Opening 3000 or 3001 directly splits the session cookie across two origins and bypasses Caddy's routing.

The stack uses SQLite. To use Postgres, uncomment three blocks in `docker-compose.yml`: the `postgres` service, its `pgdata` volume, and the `depends_on` block on the `happyview` service. Then set these in `.env`:

```sh
DATABASE_URL=postgres://happyview:happyview@postgres/happyview
POSTGRES_USER=happyview
POSTGRES_PASSWORD=happyview
POSTGRES_DB=happyview
```

:::caution[The tunnel replaces PUBLIC_URL]
The `happyview` service waits up to 30 seconds for the tunnel's URL and uses it as `PUBLIC_URL`. The `PUBLIC_URL` in `.env` applies only when no tunnel URL arrives in that time. A quick tunnel's hostname changes on every restart, and `docker compose logs tunnel | grep trycloudflare` shows the current one.
:::

[Running the development stack](https://github.com/gamesgamesgamesgamesgames/happyview/blob/alpha/CONTRIBUTING.md#running-the-development-stack) in `CONTRIBUTING.md` covers the three tunnel modes, running without a tunnel, and the other Compose files. To run the server with `cargo run` and no containers, see [From source](/docs/guides/self-hosting/from-source).

## Commit

### Sign off every commit

Every commit needs a `Signed-off-by` line, which certifies the [Developer Certificate of Origin](https://developercertificate.org/). The `DCO` check is required, so a pull request can't merge without it.

```sh
git commit -s -m "fix: handle empty lexicon lists"
```

If the check fails, sign off the existing commits and force-push:

```sh
git rebase --signoff upstream/alpha
git push --force-with-lease
```

To avoid rewriting history, push one more signed-off commit instead. Its sign-off covers the earlier commits in the pull request:

```sh
git commit --allow-empty -s -m "chore: sign off previous commits"
git push
```

### Use Conventional Commits

Release versions are computed from commit messages (see [Release](/docs/contributing/release)), so messages follow [Conventional Commits](https://www.conventionalcommits.org/): `fix:`, `feat:`, `docs:`, `test:`, `ci:`, `chore:` and so on. Mark a breaking change with `feat!:` or a `BREAKING CHANGE:` footer.

## Open a pull request

The pull request template asks what the change does, why, and how to test it. Its checklist covers the base branch, sign-off, `cargo fmt` and `cargo clippy`, tests and docs.

Into `alpha`, open the pull request as a draft while you iterate. CI skips its costly jobs on a draft, and the `e2e-tests` check fails on purpose with "This pull request is a draft". When the work is done and passes locally, mark the pull request ready for review, which runs the full suite on the same commit. A pull request into `beta` runs the full suite on every push.

```sh
gh pr create --draft --base alpha
gh pr ready
```

A pull request into `alpha` or `beta` can merge once its required checks pass and one maintainer has approved it. [Test](/docs/contributing/test#checks-and-their-local-commands) lists which checks are required. Both branches accept merge commits only.

Other things that can appear on a pull request:

- **Checks waiting to start.** A first-time contributor's CI run waits until a maintainer approves it.
- **`audit` failing.** It fails when a new RustSec advisory affects a dependency, which usually comes from the base branch rather than your change. A maintainer handles it, and it isn't a required check.
- **A `### PR Build` comment.** When the change touches the server, CI builds container images and Linux binaries, and a bot comments with `docker pull ghcr.io/gamesgamesgamesgamesgames/happyview:pr-<number>` and the commands that download the binaries.
- **`Vercel` failing on a fork.** It builds a docs preview and fails with "Authorization required to deploy" until a maintainer authorizes it. It isn't a required check.
