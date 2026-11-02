---
title: "CLI"
description: "Every command, flag, environment variable and exit code of hpy and of the happyview binary."
---

Two command-line tools work with HappyView:

- **`hpy`**, HappyProto's CLI, creates projects, runs them locally, tests them and deploys them. Its `happyview` commands download and run the `happyview` binary a project names.
- **`happyview`** is HappyView itself, the program that serves an instance. A self-hosted instance runs it directly.

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
| `hpy registry <command>` | Sign in to and publish to the HappyProto plugin registry. See [hpy registry](#hpy-registry). |
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
| `--project <at-uri>` | none | The registry project to take a plugin from, when more than one answers to the same name. Repeatable. |
| `--app-name <name>` | the directory's name | `[instance] app_name`. |
| `--happyview-version <version>` | the newest with a binary for this machine | `[happyview] version`. |

### hpy happyview dev

```text
hpy happyview dev [--locked] [--network real|local] [--reset] [--subnet <cidr>] [--yes]
```

Run the project with its pinned HappyView at `http://127.0.0.1:3000`, rebuilding when a project file changes. See [Running locally](/docs/getting-started/running-locally).

| Flag | Default | What it does |
| --- | --- | --- |
| `--locked` | off | Fail rather than update `happyview.lock` when it no longer matches `happyview.toml`. |
| `--network <real\|local>` | `real` | `real`: the real atproto network, where writes reach your real PDS. `local`: a private network on this computer (Atmosphere in a Box), which needs Docker and Deno 2.8 on macOS or Linux. |
| `--reset` | off | With `--network local`: discard the local network's accounts, records and database, and start fresh. |
| `--subnet <cidr>` | derived from the project's path | With `--network local`: the private IPv4 network to create it on, a /16 to /28. Kept until another is given. |
| `-y`, `--yes` | off | Don't ask before starting the local network. |

A compiled module is rebuilt when a file in its own directory changes. A path dependency outside that directory is not watched; saving a file inside the module rebuilds it.

### hpy happyview add

```text
hpy happyview add [plugin]... [--interpreter | --library] [--channel <channel> | --version <version>] [--project <at-uri>]
```

Add plugins to `happyview.toml` and `happyview.lock` and download them. With no plugin, bring the lock up to date and download it. Also `hpy happyview install`. Restart `dev` to load a newly added plugin.

| Argument or flag | Default | What it does |
| --- | --- | --- |
| `[plugin]` | none | A language id (an interpreter) or a namespace or project name (a library). |
| `--interpreter`, `--library` | off | Treat every `[plugin]` as this kind. You can't pass both. |
| `--channel <latest\|beta\|alpha>` | `latest`, else the only channel there is | Follow this channel. Needs a `[plugin]`, and can't go with `--version`. |
| `--version <version>` | none | Pin this exact version instead of following a channel. Needs a `[plugin]`. |
| `--project <at-uri>` | none | The registry project to take it from, when more than one answers to the name. Needs a `[plugin]`. |

### hpy happyview check, test, types and build

| Command | What it does |
| --- | --- |
| `hpy happyview check [--locked]` | Build the project the way an instance would, without serving it. Exits non-zero on any error. |
| `hpy happyview test [--locked] [--watch] [filter]` | Run the project's tests. `--watch` reruns the affected tests on every change; `[filter]` runs only test files whose path contains it. See [Testing](/docs/getting-started/testing). |
| `hpy happyview types [--locked]` | Write editor types into `.happyview/types/`, and the `tsconfig.json` or `.luarc.json` that points editors at them. |
| `hpy happyview build` | Build every compiled script module in `happyview.toml` into `.happyview/build/`. |

Their exit codes are under [hpy exit codes](#hpy-exit-codes).

### hpy happyview login, logout, whoami and deploy

| Command | What it does |
| --- | --- |
| `hpy happyview login [identifier] [--url <url>] [--no-browser]` | Sign in to an instance through your browser, to deploy to it. `[identifier]` is your handle or DID, by default the account `hpy registry login` holds. `--no-browser` prints the URL instead of opening it. |
| `hpy happyview login --key-stdin [--url <url>]` | Sign in with an API key from the instance's dashboard, read from standard input. |
| `hpy happyview logout [--url <url>]` | Sign out of an instance. |
| `hpy happyview whoami` | Show the instances you're signed in to. |
| `hpy happyview deploy [--url <url>] [--dry-run] [--prune-plugins] [--yes]` | Make an instance match the project: its plugins from `happyview.lock`, then its lexicons, scripts and modules. See [Deploying](/docs/getting-started/deploying). |

| Flag | Default | What it does |
| --- | --- | --- |
| `--url <url>` | `HPY_HV_URL`, else the only instance you're signed in to | The instance, such as `https://happyview.example.com`. `login` asks for it when it's missing, and `logout` falls back only to the one instance you're signed in to. |
| `--no-browser` | off | Print the sign-in URL instead of opening it. |
| `--key-stdin` | off | Read an API key from standard input instead of using a browser. Can't go with `[identifier]` or `--no-browser`. |
| `--dry-run` | off | Show what would change on the instance without changing it. |
| `--prune-plugins` | off | Also uninstall interpreters and libraries `happyview.lock` doesn't list. |
| `-y`, `--yes` | off | Don't ask for confirmation. |

### hpy registry

| Command | What it does |
| --- | --- |
| `hpy registry login [identifier] [--export] [--no-browser]` | Sign in to the registry with your atproto account. `[identifier]` is your handle or DID. `--export` prints a credential to store as the `HPY_CREDENTIAL` secret instead of saving it, as a session of its own. `--no-browser` prints the authorization URL. |
| `hpy registry logout` | Sign out and forget stored credentials. |
| `hpy registry whoami` | Show who you're signed in as. |
| `hpy registry plugin init` | Write `hpy.toml`'s `[project]` and create the plugin's project in the registry. |
| `hpy registry plugin show [--name <name>]` | Show the project as the registry has it. |
| `hpy registry plugin edit` | Change the project in the registry. Fields you give replace the stored ones, and authors, security contacts and keywords you give are added. |
| `hpy registry plugin pull [--name <name>]` | Copy the project from the registry into `hpy.toml`'s `[project]`. |
| `hpy registry plugin publish` | Publish the plugin in the current directory as a new version. |
| `hpy registry plugin status [version] [--name <name>]` | Show what the registry knows about this plugin's versions. |
| `hpy registry plugin lifecycle [version] [event]` | Record a lifecycle event for a version or, with `--project`, the whole project. |

`--name <name>` is the project name. Its default is `hpy.toml`'s `[project] name`, then the id in `manifest.json`.

`init` and `edit` take these fields:

| Flag | What it does |
| --- | --- |
| `--name <name>` | The project name. |
| `--display-name <name>` | The name people see. |
| `--description <text>` | A one-line description. |
| `--author <author>` | `Name <email> (url)`. Repeatable. |
| `--security <contact>` | A security contact, an email address or URL. Repeatable. |
| `--keyword <keyword>` | A keyword. Repeatable. |
| `--local-only` | `init` only: write `hpy.toml` without creating the project. |
| `-y`, `--yes` | `init` only: don't ask for confirmation. |
| `--remove-keyword <keyword>` | `edit` only: remove a keyword. Repeatable. |

`publish` takes these flags:

| Flag | Default | What it does |
| --- | --- | --- |
| `--wasm <path>` | found from `hpy.toml` and the manifest | The built `.wasm` module, relative to the plugin's directory (`-C`). |
| `--version <version>` | `manifest.json`'s version | The version to publish. |
| `--track <latest\|beta\|alpha>` | `latest` for a stable version, else the prerelease's name | The channel to move to this version. |
| `--promote <from-version>` | none | Publish an already published version's artifact as `--version` instead of building one. |
| `--dry-run` | off | Validate and print what would be published, without publishing. |
| `--no-build` | off | Skip `hpy.toml`'s `[build] command`. |
| `--wait` | off | Wait until the registry has copied the version's blobs. |
| `-y`, `--yes` | off | Don't ask for confirmation. |

`lifecycle` takes `[version] [event]`, or only `[event]` with `--project`. `event` is `endOfDevelopment`, `endOfSupport`, `supersededBy`, `endOfDistribution` or `endOfLife`.

| Flag | What it does |
| --- | --- |
| `--name <name>` | The project name. |
| `--project` | The event is about the whole project rather than one version. |
| `--kind <kind>` | What kind of event it is, in your own words, such as `security`. |
| `--reason <text>` | Why, for the people running it. |
| `--superseded-by <version>` | The version to move to, with `supersededBy`. |
| `--withdraw <status-uri>` | Withdraw a status recorded in error, by its `at://` URI. Can't go with `--project`, `--superseded-by` or `--kind`. |
| `-y`, `--yes` | Don't ask for confirmation. |

### hpy configuration

`hpy` reads `config.toml` from `~/.config/hpy` (`$XDG_CONFIG_HOME/hpy` when that's set, `%APPDATA%\hpy` on Windows). A flag beats the environment, the environment beats the file, and the file beats the default. An empty environment variable counts as unset.

| Key | Variable | Default | What it does |
| --- | --- | --- | --- |
| `registry.url` | `HPY_REGISTRY_URL` | `https://api.happyproto.at` | The registry. |
| `registry.client_key` | `HPY_CLIENT_KEY` | `hpy`'s API client on the registry | The API client key sent to the registry. |
| `oauth.client_id` | `HPY_OAUTH_CLIENT_ID` | `https://happyproto.at/oauth/hpy/client-metadata.json` | The OAuth client for registry sign-in. |
| `oauth.scope` | `HPY_OAUTH_SCOPE` | the scopes `hpy` needs to publish | The scopes registry sign-in asks for. |
| `oauth.redirect` | `HPY_OAUTH_REDIRECT` | `https://happyproto.at/oauth/hpy/callback` | Where the browser returns after sign-in, or `loopback`. |
| `oauth.client_auth` | `HPY_OAUTH_CLIENT_AUTH` | `assertion` | `assertion` (a confidential client) or `none` (a public one). |
| `credentials.store` | `HPY_CREDENTIAL_STORE` | `auto` | `auto` uses the system keychain and falls back to `credentials.json`, a file only you can read. `keychain` makes a missing keychain an error. `file` skips it. |

### hpy environment variables

These are read from the environment only.

| Variable | Default | What it does |
| --- | --- | --- |
| `HPY_HV_URL` | none | The instance to deploy to when `--url` isn't given. Wins over stored sign-ins. `login` and `logout` don't read it. |
| `HPY_HV_API_KEY` | none | An `hv_` API key for that instance, for CI. Needs `HPY_HV_URL` or `--url`. Wins over a stored sign-in. |
| `HPY_CREDENTIAL` | none | A registry credential from `hpy registry login --export`, for CI. |
| `HPY_CACHE_DIR` | your platform's cache directory plus `hpy`, such as `~/.cache/hpy` | Where downloaded HappyView binaries and plugins are cached. |
| `HPY_DATA_DIR` | your platform's data directory plus `hpy` | Where local networks keep their data. |
| `HPY_HAPPYVIEW_REPO` | `gamesgamesgamesgamesgames/happyview` | The GitHub repository HappyView releases come from. |
| `HPY_GITHUB_API` | `https://api.github.com` | Where `create` looks for the newest HappyView release. |
| `HPY_HAPPYVIEW_DOWNLOAD` | `https://github.com/<repository>/releases/download` | Where binaries and their `.sha256` files are downloaded from. |
| `HPY_CARGO`, `HPY_RUSTUP` | `cargo`, `rustup` | The programs `build` runs. |
| `HPY_NO_UPDATE_CHECK`, `CI` | unset | Either one turns off the check for a newer `hpy`. |
| `HPY_HV_CLIENT_KEY`, `HPY_HV_OAUTH_CLIENT_ID`, `HPY_NETWORK_ACCESS_ADDR` | none | Overrides for testing `hpy` itself. |

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
happyview help                              also -h and --help
```

A usage error prints the message and the usage above, and exits `2`. There's no per-command help.

### Serving

Run `happyview` with no arguments to serve an instance. It reads its configuration from the environment and, on this command only, a `.env` file; see [Configuration](/docs/reference/configuration). There's no `serve` subcommand: `happyview serve` is refused as an unknown command.

| Variable | What it does |
| --- | --- |
| `HAPPYVIEW_PROJECT` | A project directory to build and serve at boot. If it doesn't build, `happyview` prints every problem and exits `1`. |
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

Serve the project at `<root>` locally, rebuilding on save. `hpy happyview dev` runs this command. It fills in what neither the environment nor `happyview.toml` sets:

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
| `migrate-lua-sql [--dry-run] [--report] [directory]` | Converts Postgres SQL strings in `.lua` files to SQLite syntax, for moving a v2 instance between databases. |
