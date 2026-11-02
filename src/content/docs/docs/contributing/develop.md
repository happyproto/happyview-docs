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

- [rustup](https://rustup.rs). `rust-toolchain.toml` pins Rust 1.97.1 with `clippy` and `rustfmt`, and rustup uses that version inside the checkout; see rustup's [toolchain file](https://rust-lang.github.io/rustup/overrides.html#the-toolchain-file) documentation.
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

   The commands on this page use `alpha`. For a v2 change, use `beta` in its place.

3. Point git at the repository's `.githooks/` directory, once per clone:

   ```sh
   git config core.hooksPath .githooks
   ```

Git then runs a subset of CI's checks before each commit and push:

| Git event | Runs |
| --- | --- |
| `pre-commit` | `cargo fmt -- --check` and `cargo clippy -- -D warnings` over the library and binaries, then Prettier on the staged files under `web/` |
| `pre-push` | `cargo clippy --all-targets -- -D warnings`, which also lints the test code |

The Prettier step restages the files it formats. It leaves alone any file that is staged and also modified in the working tree, and it is skipped while `web/node_modules/.bin/prettier` is missing, so run `npm ci` in `web/` on the host. The development stack installs the dashboard's dependencies inside its container, which doesn't count. The two clippy runs build into `target/clippy`, so clippy and `cargo test` don't invalidate each other's build cache.

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

Use port 3080. Opening 3000 or 3001 directly splits the session cookie across two origins and bypasses Caddy's routing. Port 3000 does serve a dashboard, but not this stack's: the `happyview` service sets no `STATIC_DIR`, so it serves `web/out`, which holds whatever your last local `npm run build` left there, or nothing.

[Configuration](/docs/reference/configuration) lists every variable `.env` can set.

The stack uses SQLite. To use Postgres, uncomment three blocks in `docker-compose.yml`: the `postgres` service, its `pgdata` volume, and the `depends_on` block on the `happyview` service. Then set these in `.env`:

```sh
DATABASE_URL=postgres://happyview:happyview@postgres/happyview
POSTGRES_USER=happyview
POSTGRES_PASSWORD=happyview
POSTGRES_DB=happyview
```

[Database setup](/docs/guides/database/database-setup) covers the differences between the two backends.

To run the server with `cargo run` and no containers, see [From source](/docs/guides/self-hosting/from-source).

### Expose the stack through a Cloudflare Tunnel

The `tunnel` service gives the stack a public HTTPS URL, which atproto OAuth needs to sign in with a real account. It runs `cloudflared` against Caddy and writes the URL to a shared volume. The `happyview` service waits up to 30 seconds for that file and exports the URL as `PUBLIC_URL`.

:::caution[The tunnel replaces PUBLIC_URL]
The `PUBLIC_URL` in `.env` applies only when no tunnel URL arrives within the 30 seconds. That is why a fresh stack reports a `trycloudflare.com` address.
:::

The tunnel service picks its mode in this order:

| Your setup | Mode | Hostname |
| --- | --- | --- |
| `CLOUDFLARE_TUNNEL_TOKEN` is set | Named tunnel, routed from the Cloudflare dashboard | Stable |
| `.cloudflared/` holds a tunnel credentials file | Locally managed tunnel, routed from `.env` | Stable |
| Neither | Quick tunnel; no Cloudflare account needed | Random, and changes on every restart |

#### Quick tunnel

Leave `CLOUDFLARE_TUNNEL_TOKEN` blank and `.cloudflared/` empty. Find the URL in the logs:

```sh
docker compose logs tunnel | grep trycloudflare
```

Anything that pins the instance's URL, such as an OAuth client registration or a lexicon's service entry, has to be updated after each restart.

#### Named tunnel

Create a tunnel in the Cloudflare dashboard and set both variables in `.env`:

```sh
CLOUDFLARE_TUNNEL_TOKEN=<token from the Cloudflare dashboard>
TUNNEL_HOSTNAME=happyview-dev.example.com
```

The token starts the tunnel, and `TUNNEL_HOSTNAME` is the value written to the shared URL file. With the token alone, nothing is written, so the instance waits the full 30 seconds and falls back to `PUBLIC_URL` in `.env`.

#### Locally managed tunnel

The tunnel service generates the `cloudflared` configuration from `TUNNEL_HOSTNAME` and points it at Caddy, so the routing stays out of the Cloudflare dashboard. The one-time setup needs a Cloudflare account with a domain and [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/) installed on your machine.

```sh
# Authorize cloudflared for your domain (opens a browser).
cloudflared tunnel login

# Create the tunnel. This writes ~/.cloudflared/<tunnel-id>.json.
cloudflared tunnel create happyview-dev

# Point a hostname at the tunnel.
cloudflared tunnel route dns happyview-dev happyview-dev.example.com

# Hand the credentials to the stack.
cp ~/.cloudflared/<tunnel-id>.json .cloudflared/
```

Then set `TUNNEL_HOSTNAME=happyview-dev.example.com` in `.env` and leave `CLOUDFLARE_TUNNEL_TOKEN` blank, since a token takes precedence.

Git ignores everything in `.cloudflared/` except its `.gitignore`. The credentials file can run only that one tunnel, but treat it as a secret.

:::caution[One tunnel per person]
Two machines running the same tunnel both become its connectors, and Cloudflare splits requests between them. Everyone who works on HappyView needs their own tunnel and hostname, so don't share credentials files or tokens. On a shared domain, use a single-level subdomain such as `happyview-alice.example.com`: Cloudflare's free certificate covers `*.example.com` but not `alice.dev.example.com`.
:::

#### Without a tunnel

Start only the three local services:

```sh
docker compose up happyview web caddy
```

The instance still waits 30 seconds for a tunnel URL, then uses `PUBLIC_URL` from `.env`. To skip the wait, comment out the `TUNNEL_URL_FILE` line on the `happyview` service in `docker-compose.yml`.

:::caution[Use 127.0.0.1, not localhost]
Without a tunnel, the instance is an atproto OAuth loopback client, which is registered with `127.0.0.1`. With `PUBLIC_URL=http://localhost:3000`, OAuth sign-in fails because the redirect URI doesn't match the loopback client ID.
:::

### The other Compose files

Each of these Compose files declares its own project name, so the stacks can run at the same time without sharing containers, networks or volumes.

| File | Project name | What it runs |
| --- | --- | --- |
| `docker-compose.yml` | `happyview` | The development stack |
| `docker-compose.test.yml` | `happyview-test` | Postgres for the Rust integration tests; see [Test](/docs/contributing/test) |
| `docker-compose.e2e.yml` | `happyview-e2e` | The full stack with a local PLC directory and PDS, for the browser tests |
| `docker-compose.prod.sqlite.yml` | `happyview-prod-sqlite` | Production on SQLite; see [Docker](/docs/guides/self-hosting/docker) |
| `docker-compose.prod.postgres.yml` | `happyview-prod-postgres` | Production on Postgres; see [Docker](/docs/guides/self-hosting/docker) |

A container named `happyview-postgres-1`, with no project prefix, comes from a stack started before the files had their own names, and can be removed.

The other Compose files are `docker-compose.e2e.ci.yml`, which CI layers over the end-to-end stack, and the four interop stacks listed in [Interop tests](/docs/contributing/test#interop-tests).

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

The pull request template asks what the change does, why, and how to test it. Its checklist covers the base branch, sign-off, `cargo fmt` and `cargo clippy`, tests and docs. The template names `beta` as the base; for a v3 change, the right base is `alpha`.

Into `alpha`, open the pull request as a draft while you iterate. CI skips its costly jobs on a draft, and the `e2e-tests` check fails on purpose with "This pull request is a draft". When the work is done and passes locally, mark the pull request ready for review, which runs the full suite on the same commit. A pull request into `beta` runs the full suite on every push.

```sh
gh pr create --draft --base alpha
gh pr ready
```

A pull request into `alpha` or `beta` can merge once its required checks pass and it has one approving review. The approval must come from someone other than whoever pushed last. [Test](/docs/contributing/test#checks-and-their-local-commands) lists which checks are required. Both branches accept merge commits only.

Other things that can appear on a pull request:

- **Checks waiting to start.** A first-time contributor's CI run waits until a maintainer approves it.
- **`audit` failing.** It fails when a new RustSec advisory affects a dependency, which usually comes from the base branch rather than your change. A maintainer handles it, and it isn't a required check.
- **A `### PR Build` comment.** When the change touches the server, CI builds container images and Linux binaries, and a bot comments with `docker pull ghcr.io/gamesgamesgamesgamesgames/happyview:pr-<number>` and the commands that download the binaries.
- **`Vercel` failing on a fork.** It builds a docs preview and fails with "Authorization required to deploy" until a maintainer authorizes it. It isn't a required check.
