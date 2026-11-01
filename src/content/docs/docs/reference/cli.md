---
title: "CLI"
description: "Every command, flag, environment variable and exit code of hpy and of the happyview binary."
---

Two command-line tools work with HappyView:

- **`hpy`**, HappyProto's CLI, is what you use day to day: it creates projects, runs them locally, tests them and deploys them. Its `happyview` commands download and run the right `happyview` binary for you.
- **`happyview`** is the HappyView server itself. You run it directly when you self-host an instance.

## hpy

```text
hpy [--json] [--no-input] [-C <dir>] <command>
```

| Global flag | What it does |
| --- | --- |
| `--json` | Print the result as JSON on stdout. |
| `--no-input` | Never prompt; fail when a value is missing. Irreversible actions still need `--yes`. Implied when there's no terminal. |
| `-C <dir>` | Run as if started in `<dir>`. |

| Command | What it does |
| --- | --- |
| `hpy happyview <command>` (also `hpy hv`) | Build HappyView apps: create, run, test and deploy a project. |
| `hpy registry <command>` | Sign in to and publish to the HappyProto plugin registry. See [Developing plugins](/docs/guides/developing-plugins). |
| `hpy update` | Update `hpy` to the newest release on its channel. |
| `hpy channel [stable\|beta\|alpha] [--yes]` | Show or change the release channel `hpy` updates from. `main` means `stable`. |

### hpy happyview create

```text
hpy happyview create --name <dir> [options]
```

Scaffold a new project in a new directory. Prompts for what the flags don't give.

| Flag | Default | What it does |
| --- | --- | --- |
| `--name <dir>` | required | Directory to create, relative to the current one. |
| `--superadmin <did>` | the account `hpy registry login` holds | The DID given the superadmin privilege on the local instance. |
| `--interpreter <language>` | `lua` | An interpreter to add: `lua`, `javascript` or `typescript`. Repeatable. |
| `--library <library>` | none | A library to add, by namespace or project name. Repeatable. |
| `--project <at-uri>` | — | The registry project to take a plugin from, when more than one answers to the same name. Repeatable. |
| `--app-name <name>` | the directory's name | `[instance] app_name`. |
| `--happyview-version <version>` | the newest with a binary for this machine | `[happyview] version`. |

### hpy happyview dev

```text
hpy happyview dev [--locked] [--network real|local] [--reset] [--subnet <cidr>] [--yes]
```

Run the project with its pinned HappyView at `http://127.0.0.1:3000`; a saved file is live on the next request. See [Running locally](/docs/getting-started/running-locally).

| Flag | Default | What it does |
| --- | --- | --- |
| `--locked` | off | Fail rather than update `happyview.lock` when it no longer matches `happyview.toml`. |
| `--network <real\|local>` | `real` | `real`: the real atproto network, where writes reach your real PDS. `local`: a private network on this computer (Atmosphere in a Box), which needs Docker and Deno 2.8 on macOS or Linux. |
| `--reset` | off | With `--network local`: discard the local network's accounts, records and database, and start fresh. |
| `--subnet <cidr>` | derived from the project's path | With `--network local`: the private IPv4 network to create it on, a /16 to /28. Kept until another is given. |
| `-y`, `--yes` | off | Don't ask before starting the local network. |

A compiled module is rebuilt when a file in its own directory changes. A path dependency outside that directory isn't watched: save a file in the module to rebuild it.

### hpy happyview add

```text
hpy happyview add [plugin]... [--interpreter | --library] [--channel <channel> | --version <version>] [--project <at-uri>]
```

Add plugins to `happyview.toml` and `happyview.lock` and download them. With no plugin, bring the lock up to date and download it. Also `hpy happyview install`. Restart `dev` to load a newly added plugin.

| Argument or flag | What it does |
| --- | --- |
| `[plugin]` | A language id (an interpreter) or a namespace or project name (a library). |
| `--interpreter`, `--library` | Say which kind `[plugin]` is, when it's ambiguous. |
| `--channel <latest\|beta\|alpha>` | Follow this channel. |
| `--version <version>` | Pin this exact version instead of following a channel. |
| `--project <at-uri>` | The registry project to take it from. |

### hpy happyview check, test, types and build

| Command | What it does |
| --- | --- |
| `hpy happyview check [--locked]` | Build the project the way an instance would, without serving it. Exits non-zero on any error. |
| `hpy happyview test [--locked] [--watch] [filter]` | Run the project's tests. `--watch` reruns the affected tests on every change; `[filter]` runs only test files whose path contains it. See [Testing](/docs/getting-started/testing). |
| `hpy happyview types [--locked]` | Write editor types into `.happyview/types/`, and the `tsconfig.json` or `.luarc.json` that points editors at them. |
| `hpy happyview build` | Build every compiled script module in `happyview.toml` into `.happyview/build/`. |

`check`, `test` and `types` exit with the `happyview` binary's own code; see [happyview check](#happyview-check) and the commands after it.

### hpy happyview login, logout, whoami and deploy

| Command | What it does |
| --- | --- |
| `hpy happyview login [identifier] [--url <url>] [--no-browser]` | Sign in to an instance through your browser, to deploy to it. `[identifier]` is your handle or DID, by default the account `hpy registry login` holds. `--no-browser` prints the URL instead of opening it. |
| `hpy happyview login --key-stdin [--url <url>]` | Sign in with an API key from the instance's dashboard, read from standard input. |
| `hpy happyview logout [--url <url>]` | Sign out of an instance. |
| `hpy happyview whoami` | Show the instances you're signed in to. |
| `hpy happyview deploy [--url <url>] [--dry-run] [--prune-plugins] [--yes]` | Make an instance match the project: its plugins from `happyview.lock`, then its lexicons, scripts and modules. See [Deploying](/docs/getting-started/deploying). |

| Flag | What it does |
| --- | --- |
| `--url <url>` | The instance, such as `https://happyview.example.com`. By default `HPY_HV_URL`, else the only instance you're signed in to. |
| `--dry-run` | Show what would change on the instance without changing it. |
| `--prune-plugins` | Also uninstall interpreters and libraries `happyview.lock` doesn't list. |
| `-y`, `--yes` | Don't ask for confirmation. |

### hpy environment variables

| Variable | What it does |
| --- | --- |
| `HPY_HV_URL` | The instance to sign in to or deploy to. Wins over stored sign-ins. |
| `HPY_HV_API_KEY` | An `hv_` API key for that instance, for CI. Needs `HPY_HV_URL`. |
| `HPY_CREDENTIAL` | A registry credential from `hpy registry login --export`, for CI. |
| `HPY_CREDENTIAL_STORE` | `file` stores credentials in a file only you can read, instead of the system keychain. |
| `HPY_CACHE_DIR` | Where downloaded HappyView binaries and plugins are cached. Default: your platform's cache directory plus `hpy`, such as `~/.cache/hpy`. |
| `HPY_DATA_DIR` | Where local networks keep their data. |
| `HPY_NO_UPDATE_CHECK`, `CI` | Either one turns off the check for a newer `hpy`. |

`hpy` ignores `PLUGIN_DIR`, with a warning: it always runs the plugins `happyview.lock` names.

### hpy exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success. |
| `1` | A runtime or remote failure. |
| `2` | A usage or validation error. |
| `3` | Not signed in. |

`check`, `test`, `types` and `dev` exit with the code of the `happyview` they run; a run stopped by a signal exits `128` plus the signal's number.

## happyview

```text
happyview                                   serve; HAPPYVIEW_PROJECT names a project to serve
happyview check <root> [--plugin <dir>]... [--json]
happyview dev <root>
happyview test <root> [--watch] [--plugin <dir>]... [filter]
happyview types <root> [--plugin <dir>]... [--out <dir>]
happyview help
```

A usage error prints the message and the usage above, and exits `2`. There's no per-command help.

### Serving

Run `happyview` with no arguments to serve an instance. It reads its configuration from the environment and, on this command only, a `.env` file; see [Configuration](/docs/reference/configuration). There's no `serve` subcommand: `happyview serve` is refused as an unknown command.

| Variable | What it does |
| --- | --- |
| `HAPPYVIEW_PROJECT` | A project directory to build and serve at boot. If it doesn't build, the server prints every problem and exits `1`. |
| `RUST_LOG` | The log filter. Default: `happyview=debug,tower_http=debug,sqlx=warn`. |

It exits `1` if its configuration doesn't load.

### happyview check

```text
happyview check <root> [--plugin <dir>]... [--json]
```

Build the project at `<root>` without a database and without serving it.

| Flag | What it does |
| --- | --- |
| `--plugin <dir>` | A directory holding an interpreter's `manifest.json`. Repeatable. Without it: `$PLUGIN_DIR`, then `<root>/.happyview/plugins`. |
| `--json` | Print one JSON object, for an editor, instead of lines. |

Exits `0` when the project builds, `1` when it doesn't, and `2` when the check can't run, such as a plugin that won't load. Logs go to stderr.

### happyview dev

```text
happyview dev <root>
```

Serve the project at `<root>` locally, rebuilding on save. `hpy happyview dev` runs this for you. It fills in what neither the environment nor `happyview.toml` sets:

| Variable | Default under `dev` |
| --- | --- |
| `DATABASE_URL` | `sqlite://<root>/.happyview/happyview.db?mode=rwc` |
| `HOST` | `127.0.0.1` |
| `PORT` | `3000` |
| `PUBLIC_URL` | `http://127.0.0.1:<port>` |
| `SESSION_SECRET`, `TOKEN_ENCRYPTION_KEY` | Generated once into `.happyview/` |
| `PLUGIN_DIR` | `<root>/.happyview/plugins` |
| `HAPPYVIEW_SCRIPT_ENV_FILE` | `<root>/.env` |

`HAPPYVIEW_WATCH_POLL_MS`, a whole number of milliseconds from `50` to `60000`, makes it poll for changes instead of using file events. It exits `1` if it can't start.

### happyview test

```text
happyview test <root> [--watch] [--plugin <dir>]... [filter]
```

Run every `*.test.<ext>` file in the project. `--watch` reruns the affected files on every change; `[filter]` runs only test files whose path contains it; `--plugin` is as for `check`. It never reads `.env`: scripts get `ctx.env` from `<root>/.env.test`.

Exits `0` when every test passed; `1` when any failed or no test file ran; `2` when it can't run, such as a failed build, a plugin that won't load or a bad `HAPPYVIEW_WATCH_POLL_MS`.

### happyview types

```text
happyview types <root> [--plugin <dir>]... [--out <dir>]
```

Write editor types for each language the project's interpreters offer, into `--out` (default `<root>/.happyview/types`). Exits `0` when every interpreter wrote, was up to date or had none to offer; `1` when the build or an interpreter failed; `2` when it can't run.

## Other binaries

Releases also ship these maintenance tools:

| Binary | What it does |
| --- | --- |
| `happyview-codemod` | Rewrites v2 Lua scripts for v3. `--file <path> --kind <kind>`, `--stdin --kind <kind>`, or `--database-url <url> [--script <id>] [--apply] [--allow-markers]`, where `<kind>` is `procedure`, `query`, `record`, `label` or `job`. Exits `0` when clean, `1` on an error, `2` when a script has notes to finish by hand. See [Migrating scripts](/docs/guides/migrating-scripts). |
| `migrate-space-cids [--dry-run]` | Repairs space record CIDs written by older releases. It runs automatically at startup; run it by hand only to inspect. Needs `DATABASE_URL` and `TOKEN_ENCRYPTION_KEY`. |
| `migrate-lua-sql [--dry-run] [--report] [directory]` | Converts Postgres SQL in Lua `db.raw()` calls to SQLite syntax, for moving a v2 instance between databases. |
