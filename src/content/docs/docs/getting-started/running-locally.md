---
title: "Running locally"
description: "Run your project on your own machine with hpy happyview dev, call its endpoint, and see each change without a restart."
type: how-to
prerequisites:
  - /docs/getting-started/installation
---

This page runs the project you created as a local instance, calls its endpoint, and changes it while it runs.

## Start it

From inside the project:

```sh
cd my-app
hpy happyview dev
```

The first run takes longer. `hpy` downloads the HappyView version your project names into `~/.cache/hpy/`, checks it against its published checksum, and fetches the interpreters and libraries `happyview.lock` lists. Later runs reuse them.

When it's ready, it prints where it's serving:

```text
happyview dev: serving /home/you/my-app at http://127.0.0.1:3000
dashboard: http://127.0.0.1:3000/dashboard/
```

The local instance keeps its data in `.happyview/`: a SQLite database, the plugins it loaded, and secrets it generated on the first run. Nothing else is needed: no Docker, no database server.

:::caution[Writes go to the real network]
By default a local instance is part of the real atproto network. It reads records from Jetstream, and when your app writes a record through it, the record goes to that user's real PDS. Develop with a test account, not the one you use day to day. `dev` prints the same warning when it starts.
:::

## Call your endpoint

The project's `src/lexicons/com/example/hello.json` is a query lexicon, so it answers at `/xrpc/com.example.hello`:

```sh
curl 'http://127.0.0.1:3000/xrpc/com.example.hello?name=Ada'
```

```json
{"message":"Hello, Ada!"}
```

## Change it while it runs

Open `src/lexicons/com/example/hello.lua`, change the greeting, and save. `dev` rebuilds the project and prints what changed:

```text
built in 12 ms: …
```

Call the endpoint again and the new version answers. You don't restart anything.

If a change breaks the build, `dev` prints the problem with its file and line, and says `build failed; still serving the previous build`. Fix the file and save again.

What reloads on its own, and what needs a restart:

| You change | What happens |
| --- | --- |
| Anything under `src/` | Rebuilt on save |
| `happyview.toml` | Reloaded on save. A few settings, such as the port, print `restart required to apply` instead |
| `.env` | Read again on every script run, so the next request sees it |
| Plugins, after `hpy happyview add` | Not noticed until you restart `dev` |

## Open the dashboard

Open the `dashboard:` link `dev` printed and sign in with the account whose DID you gave `create` as the superadmin. That account is an operator with the superadmin privilege on your local instance.

While you develop, the dashboard is where you watch what your project does: **Data > Records** for indexed records, **System > Event Logs** for your scripts' log lines, **Data > Jobs** and **Data > Dead Letters** for background work and failed runs.

## Backfill is off locally

A local instance doesn't backfill: it indexes records as they arrive and doesn't fetch the ones written before it started. `create` writes this into `happyview.toml`:

```toml
[dev]
backfill = false
```

Set it to `true` and restart `dev` to backfill while you develop. A deployed instance backfills whatever its lexicons ask for, whatever this says.

## Without the real network

`hpy happyview dev --network local` runs your project against a whole atproto network on your machine instead, so nothing you do reaches real accounts. It needs Docker (with Compose v2) and Deno 2.8 or later, on macOS or Linux. Your instance is then at `https://happyview.atmosbox.internal`. `--reset` starts that network over with no data.

## Other flags

- `--locked` fails instead of updating `happyview.lock` when it doesn't match `happyview.toml`. CI uses it.
- `PORT=4000 hpy happyview dev`, or `port = 4000` under `[dev]` in `happyview.toml`, serves on another port. The environment variable wins.

## Next steps

- [Project structure](/docs/getting-started/project-structure): what every file in the project does.
