---
title: Configuring an instance
---

:::tip[Every variable in one place]
[Configuration](/docs/reference/configuration) in the reference lists every environment variable, instance setting and `happyview.toml` key, with defaults and accepted values. This guide explains the ones you'll set first.
:::

HappyView is configured via environment variables. Serving with a plain `happyview` loads a `.env` file on startup, from the working directory or the nearest parent that has one. `happyview check`, `happyview dev`, `happyview test` and `happyview types` do not: under `happyview dev` the project's `.env` supplies script variables (`ctx.env`) only, as [Running locally](#running-locally-happyview-dev) explains, and under `happyview test` they come from `.env.test` instead, as [Testing](/docs/getting-started/testing) explains. See [Running locally](/docs/getting-started/running-locally) for running a project on your machine, [Docker](/docs/guides/self-hosting/docker) for deploying from published images, [Native binary](/docs/guides/self-hosting/binary) for a released binary, or [Production](/docs/guides/self-hosting/production) for the hardening checklist.

## Environment variables

Most instances need only these. The [Configuration reference](/docs/reference/configuration) has every other variable, including the database, Jetstream, backfill and retention settings, with defaults and accepted values.

| Variable | Required | What it does |
| --- | --- | --- |
| `DATABASE_URL` | yes | Database connection string: SQLite (`sqlite://path/to/db?mode=rwc`) or Postgres (`postgres://user:pass@host/db`). See [Database setup](/docs/guides/database/database-setup) |
| `PUBLIC_URL` | yes | The URL the instance is reached at, used for OAuth callbacks, such as `https://happyview.example.com`. For local development, use `http://127.0.0.1:3000`, not `localhost` (see below). If you use `BASE_PATH`, leave it out of this value |
| `SESSION_SECRET` | yes, to sign in | Signs the dashboard's session cookies. At least 32 bytes; generate one with `openssl rand -base64 48`. Unset, too short or a placeholder such as `change-me-in-production`, the instance starts but nobody can sign in to the dashboard |
| `TOKEN_ENCRYPTION_KEY` | in production | Base64-encoded 32-byte key for encrypting stored OAuth tokens (`openssl rand -base64 32`). Without a valid one, app sign-in, spaces and service identity don't work; an invalid value is logged and ignored |
| `SUPERADMIN_DID` | no | The DID given superadmin at every boot. Without it, the first person to sign in gets superadmin. A value that isn't a DID stops boot |
| `HAPPYVIEW_PROJECT` | no | Path to a project directory to serve; see [Project file](#project-file-happyviewtoml) |
| `HAPPYVIEW_DEFAULT_PLUGINS` | no | Plugin sources to install on the first boot that lists them, such as your interpreter. Listing a source consents to every capability its manifest declares. See [Plugins](/docs/guides/plugins#default-plugins) |
| `BASE_PATH` | no | Subpath prefix for mounting HappyView behind a reverse proxy, such as `/hv`. See [Reverse proxy subpath](/docs/guides/self-hosting/production#reverse-proxy-subpath) |

:::caution[Use 127.0.0.1, not localhost]
atproto OAuth loopback clients are registered with `127.0.0.1`. If you set `PUBLIC_URL` to `http://localhost:3000`, OAuth sign-in will fail because the redirect URI won't match the loopback client ID. Always use `http://127.0.0.1:3000` for local development.
:::

## Example `.env`

```sh
# SQLite (the default): no setup required
DATABASE_URL=sqlite://data/happyview.db?mode=rwc
PUBLIC_URL=http://127.0.0.1:3000
# Generate with: openssl rand -base64 48
SESSION_SECRET=

# Or use Postgres instead:
# DATABASE_URL=postgres://happyview:happyview@localhost/happyview

# Set in production: openssl rand -base64 32
# TOKEN_ENCRYPTION_KEY=

# Optional
# SUPERADMIN_DID=did:plc:...
# HAPPYVIEW_DEFAULT_PLUGINS=https://example.com/plugins/lua/manifest.json
# BASE_PATH=/hv
```

## Project file (`happyview.toml`)

When `HAPPYVIEW_PROJECT` names a directory, HappyView reads `happyview.toml` from it at boot. The file is optional, and **every environment variable wins over it**, including one set to an empty string. Instance settings saved in the dashboard win over both, for the [keys that have one](/docs/reference/configuration#instance-settings).

```toml
[happyview]
version = "3.0.0"            # warns at boot when the running binary differs

[instance]
app_name = "HappyProto Registry"           # stands in for APP_NAME
superadmin = "did:plc:..."                 # stands in for SUPERADMIN_DID

[interpreters]
lua = { did = "did:plc:mo7vq4jbioxwafy5zkcc3eux", name = "happyview-lua", channel = "latest" }

[libraries]
"happyview.http" = { did = "did:plc:mo7vq4jbioxwafy5zkcc3eux", name = "happyview-http", version = "1.0.3" }

[dev]
port = 3000                  # stands in for PORT, under `happyview dev` only
backfill = false             # stands in for HAPPYVIEW_DEV_BACKFILL, under `happyview dev` only

[network_lexicons]
include = ["app.bsky.actor.profile"]

[labels]
subscribe = ["did:plc:ar7c4by46qjdydhdevvrndac"]

[jetstream]
protocol = "auto"            # stands in for JETSTREAM_PROTOCOL: auto, v2 or v1
compression = true           # stands in for JETSTREAM_COMPRESSION

[lexicons."com.example.thing"]
backfill = true              # backfill this record collection once
indexed = false              # keep the lexicon for validation and refs, without ingesting its collection
```

- `[network_lexicons] include` lexicons are tracked at boot, with no target collection and no backfill. One whose id a dashboard lexicon already uses is skipped with a warning; the dashboard lexicon is kept.
- `[labels] subscribe` labelers are subscribed at boot. Pausing one from the dashboard sticks across restarts.
- Neither can be removed from the dashboard or the admin API (`409`); remove the line from the file. A line removed from the file leaves its subscription or lexicon in place, now removable from the dashboard.
- `backfill = true` on a record lexicon in the project's `src/lexicons/` starts a backfill only the first time. Under `happyview dev`, only when `[dev] backfill = true`; dev also checks after every rebuild, so a lexicon added while dev runs gets its backfill then. At boot, HappyView starts one for the collection unless a network backfill of that collection already exists, whatever its outcome: completed, failed, cancelled or still running. A backfill of named accounts does not count, and neither does a backfill of all collections, so either of those leaves the declared one to start. Restarting does not crawl the network again, even if the first backfill failed or was cancelled. To run it again, open **Backfills** in the dashboard, choose **New backfill** and select the collection, or call [`POST /admin/backfill`](/docs/reference/admin/backfill) with `{"collection": "..."}`.
:::note[Pending happyview#319]
**Backfills** and **New backfill** match [happyview#319](https://github.com/gamesgamesgamesgamesgames/happyview/pull/319), which is open. Until it merges, the page reads **Backfill** and its button **Create Backfill Job**.
:::

- `indexed` (default `true`): set `false` to keep a record lexicon for validation and refs without ingesting its collection from the network. An unindexed lexicon starts no backfill, even with `backfill = true`. Toggling it takes effect on the next build. The admin API's `indexed` field on [`POST /admin/lexicons`](/docs/reference/admin/lexicons) does the same for a dashboard lexicon.
- `[interpreters]` and `[libraries]` name the plugins a project uses, keyed by language id or library namespace. Each value is a table naming a registry project: `did` is the publisher's DID and `name` the project name, followed by exactly one of `channel` (`latest`, `beta` or `alpha`) or `version` (a pinned release, such as `1.2.0` or `1.2.0-rc.1`). `hpy happyview add` writes these entries. The older `lua = "1.4.0"` form is refused with a message showing the table form.
- Unknown sections and keys are refused, and every error names the file, line and column: `happyview.toml:3:1: unknown field ...`.

## Checking a project

`happyview check <root>` builds the project at `<root>` the way boot does, without serving it, and prints what it found. It needs no database and no `DATABASE_URL`, so it can run in CI on every pull request.

```sh
happyview check ./my-project
happyview check ./my-project --plugin ./plugins/lua
```

Each problem is printed on its own line, with paths relative to the project root. An error reads `path:line: message`, or `path: message` when there is no line; a warning reads the same with `warning: ` before the message:

```text
src/lexicons/com/example/getThing.json: the lexicon's id is 'com.example.getOther', ...
src/lexicons/com/example/thing.index.lua: warning: overrides the dashboard script ...
```

A project that fails prints its problems followed by a count of errors. A project that builds prints its warnings and a summary such as `ok: 4 lexicons, 6 scripts, 1 module`.

| Exit code | Meaning |
| --- | --- |
| `0` | The project builds |
| `1` | The project does not build; the reasons are printed |
| `2` | The check could not run, for example because an interpreter plugin failed to load |

Scripts are checked by the interpreter that claims their file extension, so `check` needs the interpreter plugins. It loads them from, in order:

1. each `--plugin <dir>`, where the directory holds one plugin's `manifest.json`, when any are given;
2. otherwise every plugin directory inside `$PLUGIN_DIR`;
3. otherwise every plugin directory inside `<root>/.happyview/plugins`.

### For editors (`--json`)

`happyview check <root> --json` runs the same check and prints one JSON object instead of lines, for an editor to read. The exit codes are the same.

```json
{
  "ok": false,
  "diagnostics": [
    { "path": "src/lexicons/com/example/getThing.lua", "line": 3,
      "severity": "error", "message": "..." }
  ],
  "files": [
    { "path": "src/lexicons/com/example/getThing.lua", "role": "handler",
      "trigger": "xrpc.query:com.example.getThing",
      "lexicon": "com.example.getThing", "language": "lua" }
  ],
  "lexicons": [
    { "nsid": "com.example.getThing",
      "path": "src/lexicons/com/example/getThing.json", "kind": "query" }
  ],
  "languages": [ { "language_id": "lua", "extensions": ["lua"] } ]
}
```

- **`diagnostics`** holds a successful build's warnings, or a failed build's errors and warnings. `line` is `null` for a problem with the whole file.
- **`files`** gives every file under `src/` a role: `lexicon`, `handler`, `module` or `test`.
  - Files HappyView ignores, and files it refuses, are left out. A refused file's reason is in `diagnostics`.
  - A handler carries its `trigger`, plus `lexicon` when the trigger names one of the project's lexicons.
  - `language` is the interpreter that runs the file.
- **`lexicons`** lists the lexicon files that load, with their `kind`: `record`, `query`, `procedure`, `space` or `definitions`.
- **`files` and `lexicons` are filled in even when the project does not build.**
- **A check that cannot start** prints `{"ok": false, "error": "..."}` and exits `2`.

## Running locally (`happyview dev`)

`happyview dev` serves a project from its own directory with nothing to configure. It listens on `127.0.0.1` at `[dev] port` (default `3000`) and skips the setup wizard, so the dashboard is usable on first start. An unfinished wizard is left alone, not overwritten.

State lives in `<project>/.happyview/`:

- `.happyview/` itself is kept at `0700`; one that is looser is tightened.
- `happyview.db` is the SQLite database.
- `plugins/` holds the plugins, and the compiled-module cache sits beside the database.
- `secrets` holds the generated session secret and token encryption key. It is created once with mode `0600`, and a file that grants any permission to group or other, or that another user owns, is refused. A damaged file is never regenerated over. Deleting it generates new keys, and sessions and tokens stored under the old ones stop working.

Precedence is the same as everywhere: environment variables, then `happyview.toml`, then these defaults.

**`.env` is for scripts, not the server.** The project's `.env` supplies `ctx.env` only, and is re-read on every script run. It never sets server configuration, so a `DATABASE_URL` or `PORT` in it is just a script variable. `$VAR` references in it are expanded from the process environment first, then from lines above it in the same file. The process environment holds only what was exported in the shell that started HappyView, not the defaults dev supplies. So `X=$DATABASE_URL` gives `ctx.env` the `DATABASE_URL` you exported, else the value of a `DATABASE_URL=` line earlier in `.env`, else an empty value.

**Saving rebuilds.** The watcher covers `src/`, `happyview.toml` and the modules in `.happyview/build/`. Each build prints one line listing what changed, followed by a line for each warning. A build that fails prints every error, then `build failed; still serving the previous build`, and the last good build keeps serving until you fix it. Dev also starts when the project's `src/` is already broken, and waits for the fix. A `happyview.toml` that does not parse at startup stops it; the same breakage while dev runs is reported and survived. If file events don't arrive (a Docker Desktop bind mount, say), set `HAPPYVIEW_WATCH_POLL_MS`.

**Editing `happyview.toml` while dev runs:**

- Added declarations apply at once.
- Removed declarations are reported, not applied. They stay until you delete them from the dashboard after a restart.
- A setting that is read only at startup prints `restart required to apply: <names>`, naming the variables, such as `PORT` or `PUBLIC_URL`.
- An edit that is rejected leaves the running configuration untouched.

**Writes reach the real network.** Dev prints a warning once at startup: writes from the instance go to your real PDS and the live network, where any instance indexing the same collections, including your production one, will index them. Set `HAPPYVIEW_NETWORK=local`, or run `hpy happyview dev --network local`, to silence it.

## Next steps

- [Configuration reference](/docs/reference/configuration): every variable, instance setting and `happyview.toml` key
- [Authentication](/docs/getting-started/authentication): set up OAuth and operators
- [Dashboard](/docs/guides/dashboard): explore the admin dashboard
- [Production](/docs/guides/self-hosting/production): what to change for production
