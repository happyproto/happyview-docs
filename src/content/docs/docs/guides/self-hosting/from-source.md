---
title: From source
description: Build and run HappyView from a clone of its beta branch with cargo.
---

Run HappyView directly with `cargo run` from a clone of its `beta` branch. If you'd rather run the whole stack in containers, see [Run the development stack](/docs/contributing/develop#run-the-development-stack). To deploy from prebuilt images, see [Docker](/docs/guides/self-hosting/docker).

## Prerequisites

- [rustup](https://rustup.rs). The repository's `rust-toolchain.toml` pins the Rust version, and rustup installs it on the first build.
- Node.js and npm, to build the dashboard.
- (Optional) PostgreSQL if you prefer Postgres over the default SQLite. The repository's Compose files and tests use version 17.

## 1. Clone and configure

```sh
git clone --branch beta https://github.com/gamesgamesgamesgamesgames/happyview
cd happyview
cp .env.example .env
```

`beta` is the default branch and holds v3, so `--branch beta` only makes that explicit. Edit `.env` to point at your running services:

```sh
# SQLite (the default): no setup needed, the file is created automatically
DATABASE_URL=sqlite://data/happyview.db?mode=rwc
PUBLIC_URL=http://127.0.0.1:3000
# Generate with: openssl rand -base64 48
SESSION_SECRET=
```

:::caution[Use 127.0.0.1, not localhost]
atproto OAuth loopback clients are registered with `127.0.0.1`. If you set `PUBLIC_URL` to `http://localhost:3000`, OAuth sign-in will fail because the redirect URI won't match the loopback client ID. Always use `http://127.0.0.1:3000` for local development.
:::

Or if you prefer Postgres:

```sh
DATABASE_URL=postgres://happyview:happyview@localhost/happyview
```

See [Configuring an instance](/docs/guides/configuration) for what to set first, the [Configuration reference](/docs/reference/configuration) for every variable, and the [database setup guide](/docs/guides/database/database-setup) for details on both backends.

## 2. Create the database (Postgres only)

If you're using SQLite, skip this step: HappyView creates the database file automatically.

If you're using Postgres, create the database:

```sh
createdb happyview
```

Or, if you connect as a Postgres user with a password:

```sh
psql -c "CREATE DATABASE happyview;" -U postgres
```

HappyView runs migrations automatically on startup, so no manual migration step is needed.

## 3. Build the dashboard

A plain `cargo run` carries no dashboard of its own and serves `./web/out`, so export it once:

```sh
cd web
npm ci
npm run build
cd ..
```

Skip this if you need only the API. Run it again after pulling changes to `web/`.

## 4. Start HappyView

```sh
cargo run
```

HappyView starts on port 3000 (configurable via the `PORT` environment variable). `curl http://127.0.0.1:3000/health` answers `ok` once it's listening.

## Next steps

Install an interpreter before saving any script: a self-hosted instance ships with none ([Languages](/docs/reference/scripts/languages#install-an-interpreter)). Then [deploy a project](/docs/getting-started/deploying) to it.
