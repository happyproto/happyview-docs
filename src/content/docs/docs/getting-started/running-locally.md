---
title: "Running locally"
description: "hpy happyview dev: running a project as a local HappyView instance, what it reloads, where it keeps data, and its options."
prerequisites:
  - /docs/getting-started/installation
---

`hpy happyview dev [options]` runs a project as a local HappyView instance. It runs from the project's root directory, the one that holds `happyview.toml`.

## Example

```sh
cd my-app
hpy happyview dev
```

When the instance is ready, `dev` prints its address and the dashboard's:

```text
happyview dev: serving /home/you/my-app at http://127.0.0.1:3000
dashboard: http://127.0.0.1:3000/dashboard/
```

The starter project's query lexicon, `src/lexicons/com/example/hello.json`, answers at `/xrpc/com.example.hello`:

```sh
curl 'http://127.0.0.1:3000/xrpc/com.example.hello?name=Ada'
```

```text
{"message":"Hello, Ada!"}
```

## Downloads

On the first run, `hpy` downloads the HappyView version the project names into `~/.cache/hpy/` and verifies it against its published checksum. It also fetches the interpreters and libraries listed in `happyview.lock`. Later runs reuse the downloads.

## Data directory

The local instance stores its state in `.happyview/` in the project: a SQLite database, the plugins it loaded, and the secrets it generated on its first run. The project's `.gitignore` excludes it.

## Network

By default the local instance is on the real atproto network. It reads records from Jetstream, and a record written through it goes to the user's real PDS.

:::caution[Writes reach real accounts]
Develop with a test account, not a personal one. [pds.rip](https://pds.rip) issues sandbox accounts on the real network and deletes them after 7 days. `dev` prints the same warning when it starts.
:::

`hpy happyview dev --network local` runs the project against an atproto network on the local machine instead. Writes stay on that network. It requires Docker with Compose v2 and Deno 2.8 or later, on macOS or Linux. The instance is then at `https://happyview.atmosbox.internal`. `--reset` discards that network's accounts, records and database, and starts it again.

## Reloading

`dev` watches the project and applies changes as follows:

| Changed | Effect |
| --- | --- |
| A file under `src/` | The project is rebuilt on save. |
| `happyview.toml` | Reloaded on save. A setting read only at startup, such as the port, the database URL or `PUBLIC_URL`, prints `restart required to apply` instead. |
| `.env` | Read on every script run. |
| Plugins added with `hpy happyview add` | Take effect when `dev` is restarted. |

A successful rebuild prints `built in <n> ms:` and what changed. A failed one prints each error with its file and line, then `build failed; still serving the previous build`, and the previous build keeps answering until the next successful one.

## Dashboard

The dashboard is at the `dashboard:` address `dev` prints. Sign in with the project's superadmin account, the DID given at [`create`](/docs/getting-started/installation#create-a-project). Sign-in goes through that account's PDS.

A person who signs in to an instance's dashboard to manage it is an **operator**. **Permissions** set what each operator may do. The superadmin holds every permission.

These dashboard pages show a running project's activity:

- **Data > Records**: indexed records.
- **System > Event Logs**: scripts' log lines.
- **Data > Jobs**: background jobs.
- **Data > Dead Letters**: failed script runs.

## Backfill

A local instance does not backfill by default: it indexes records as they arrive, and does not fetch records written before it started. `create` writes this setting into `happyview.toml`:

```toml
[dev]
backfill = false
```

Set it to `true` and restart `dev` to backfill locally. The setting applies only to `dev`; a deployed instance backfills the collections its lexicons ask for. [Lexicons](/docs/getting-started/lexicons) shows how a lexicon asks for a backfill.

## Options

| Option | Effect |
| --- | --- |
| `--network local` | Runs against a local atproto network. See [Network](#network). |
| `--reset` | With `--network local`, discards the local network's accounts, records and database first. |
| `--subnet <CIDR>` | With `--network local`, the private IPv4 network to create it on, when the one derived from the project's path is taken. Kept until another is given. |
| `--yes`, `-y` | Skips the confirmation `--network local` asks for. |
| `--locked` | Fails instead of updating `happyview.lock` when it does not match `happyview.toml`. Intended for CI. |

The instance serves on port 3000. To use another port, set the `PORT` environment variable or `port` under `[dev]` in `happyview.toml`. The environment variable takes precedence.

## Next steps

- [Project structure](/docs/getting-started/project-structure): every file in a project.
