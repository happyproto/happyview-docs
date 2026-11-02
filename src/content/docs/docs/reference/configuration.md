---
title: Configuration reference
description: "Every environment variable, instance setting and happyview.toml key HappyView reads, with defaults and accepted values."
---

HappyView takes its configuration from three places. When one value is set in more than one, the first in this list wins:

1. **Instance settings**, saved in the dashboard (mostly under **System > General**) or through `PUT /admin/settings/{key}`. Only the [keys listed below](#instance-settings) work this way.
2. **The process environment.** A variable set to an empty value still counts as set.
3. **`happyview.toml`**, for the few variables a project file can supply, marked in the tables.

Anything none of them sets takes its default. Running `happyview` with no arguments (serving) also loads a `.env` file into the environment; `happyview dev`, `test`, `check` and `types` don't.

## Server

| Variable | Default | What it does |
| --- | --- | --- |
| `PUBLIC_URL` | required | The URL the instance is reached at. Boot fails without it. |
| `HOST` | `0.0.0.0` | Address to listen on. |
| `PORT` | `3000` | Port to listen on. An unreadable value means `3000`. `happyview.toml`: `[dev] port`, under `dev` only. |
| `BASE_PATH` | none | Serve under a path prefix, such as `/happyview`. A trailing `/` is trimmed; `/` alone means none. A value that doesn't start with `/` stops boot. |
| `STATIC_DIR` | the dashboard compiled into a release binary (the `embedded-dashboard` feature); `./web/out` otherwise | Serve the dashboard from this directory instead. |
| `HAPPYVIEW_PROJECT` | none | A project directory to build and serve at boot. A directory that doesn't exist stops boot. |
| `HAPPYVIEW_USER_AGENT` | `HappyView/<version> (+<PUBLIC_URL>)` | The `User-Agent` on outbound requests. |
| `APP_NAME` | none | Your app's name, shown on OAuth consent screens and linked-repo pages. `happyview.toml`: `[instance] app_name`. Instance setting `app_name`. |
| `LOGO_URI`, `TOS_URI`, `POLICY_URI` | none | Links published in OAuth client metadata. Instance settings `logo_uri`, `tos_uri`, `policy_uri`; an uploaded logo wins over `logo_uri`. |
| `CLIENT_URI` | none | `client_uri` in OAuth client metadata. Instance setting `client_uri`. |
| `RUST_LOG` | see below | The log filter. |

`RUST_LOG`'s default depends on the command: `happyview=debug,tower_http=debug,sqlx=warn` when serving, `happyview=info,tower_http=warn,sqlx=warn` under `dev`, `warn` for `check` and `types`, `error` for `test`.

## Database

| Variable | Default | What it does |
| --- | --- | --- |
| `DATABASE_URL` | required | `sqlite://…` or `postgres://…`. Boot fails without it. |
| `DATABASE_BACKEND` | from the URL | `sqlite` or `postgres`. |
| `DATABASE_MAX_CONNECTIONS` | `16` (SQLite), `32` (Postgres) | The main connection pool's size. |
| `BACKFILL_DATABASE_MAX_CONNECTIONS` | sized from the backfill concurrency, at most `16` (SQLite) or `256` (Postgres) | The backfill pool's size. At least `1`. |
| `SQLITE_JOURNAL_SIZE_LIMIT` | `67108864` (64 MiB) | Largest size the WAL is trimmed to after a checkpoint. `-1` means no limit. |
| `SQLITE_SYNCHRONOUS` | `NORMAL` | `NORMAL` or `FULL`. |
| `SQLITE_CHECKPOINT_INTERVAL_SECS` | `60` | Seconds between WAL checkpoints. `0` turns them off. |
| `SQLITE_WAL_CHECKPOINT_BYTES` | 64 MiB | WAL size that triggers a checkpoint early. `0` turns it off. |
| `SQLITE_TMPDIR`, then `TMPDIR` | the system's | Where a scheduled `VACUUM`'s free-space check looks, as SQLite does. |
| `RECORD_COMPRESSION` | `zstd` | `zstd` or `none`. Compresses record bodies on SQLite. |
| `ZSTD_DICT_TRAIN_AT` | `5000` | Records a collection needs before a compression dictionary is trained for it. |
| `RECORD_COMPRESSION_INTERVAL_SECS` | `600` | Seconds between compression passes. |

## Secrets and sign-in

| Variable | Default | What it does |
| --- | --- | --- |
| `SESSION_SECRET` | none | Signs the dashboard's session cookie. Must be at least 32 bytes; generate one with `openssl rand -base64 48`. When it's unset, too short, or the placeholder `change-me-in-production`, the instance still starts, but nobody can sign in to the dashboard, and the dashboard shows why. |
| `TOKEN_ENCRYPTION_KEY` | none | Base64 of exactly 32 bytes (`openssl rand -base64 32`). Encrypts stored OAuth sessions and tokens, keys, plugin secrets, script variables and the attestation key. Without a valid one, app sign-in, spaces and service identity don't work; an invalid value is logged and ignored. |
| `SUPERADMIN_DID` | none | A DID given the superadmin privilege at every boot. A value that isn't a DID stops boot; empty means unset. Once set, the first person to sign in is no longer given superadmin. `happyview.toml`: `[instance] superadmin`. |
| `PLATFORM_API_KEY_HASH` | none | The SHA-256, as 64 hex characters, of the key a hosting platform uses for `/admin/platform`. See [Platform](/docs/reference/admin/platform). |
| `DEFAULT_RATE_LIMIT_CAPACITY` | `100` | Request budget for a new API client. |
| `DEFAULT_RATE_LIMIT_REFILL_RATE` | `2.0` | Requests per second a new API client's budget refills by. |
| `ATTESTATION_PRIVATE_KEY` | stored, else generated | A hex secp256k1 key for [attestation signing](/docs/guides/attestation-signing). |
| `ATTESTATION_KEY_ID` | `did:web:localhost#attestation` | The key's id in signatures. Read only when `ATTESTATION_PRIVATE_KEY` is set; otherwise the stored key's id is used, else `did:web:<PUBLIC_URL host>#attestation`. |
| `ATTESTATION_SIG_TYPE` | `games.gamesgamesgamesgames.attestation` | The signature's `$type`. Read only when `ATTESTATION_PRIVATE_KEY` is set. |

## Network

| Variable | Default | What it does |
| --- | --- | --- |
| `JETSTREAM_URL` | `wss://jetstream1.us-east.bsky.network` | The Jetstream to follow. |
| `JETSTREAM_PROTOCOL` | `auto` | `auto`, `v2` or `v1`. `happyview.toml`: `[jetstream] protocol`. |
| `JETSTREAM_COMPRESSION` | `true` | `true` or `false` (also `1`/`0`, `yes`/`no`, `on`/`off`). `happyview.toml`: `[jetstream] compression`. |
| `JETSTREAM_WORKERS` | `8` | Records processed in parallel, `1` to `64`. |
| `RELAY_URL` | `https://bsky.network` | The relay backfill asks which accounts hold a collection. |
| `PLC_URL` | `https://plc.directory` | The PLC directory DIDs are resolved through. |

## Backfill

| Variable | Default | What it does |
| --- | --- | --- |
| `BACKFILL_CONCURRENT_PDS` | `10` | PDSes fetched from at once. Instance setting `backfill_concurrent_pds`. |
| `BACKFILL_CONCURRENT_DIDS_PER_PDS` | `3` | Accounts fetched at once from one PDS. Instance setting `backfill_concurrent_dids_per_pds`. |
| `BACKFILL_CONCURRENT_RESOLUTION` | `100` | DIDs resolved at once. Instance setting `backfill_concurrent_resolution`. |
| `BACKFILL_RETENTION_DAYS` | `28` | Days a finished backfill's per-account detail is kept. `0` keeps it. Instance setting `backfill_retention_days`. |
| `BACKFILL_DISCOVERY_WINDOW` | `50000` | Units of work discovered ahead of fetching. A unit is one account under one collection. |
| `BACKFILL_HOOK_CONCURRENCY` | `4` | Record scripts run at once for one batch of a backfill, `1` to `32`. A value outside the range is moved inside it. |
| `BACKFILL_SOURCE` | `crawl` | `crawl` fetches from each PDS, `replay` reads a Jetstream archive, and `auto` replays when the Jetstream has an archive and otherwise crawls. |
| `BACKFILL_REPLAY_CONCURRENCY` | `8` | Archive segments read at once, `1` to `64`. |
| `BACKFILL_REPLAY_DIR` | `<temp>/happyview-replay` | Where archive segments are kept while replaying. |
| `BACKFILL_REPLAY_MARKER_TAIL_HOURS` | `12` | How far back from the archive's newest data a network replay reads account and sync markers. `0` reads the job's whole range. |
| `JETSTREAM_API_KEY` | none | Key for the Jetstream archive replay reads. |

The three concurrency settings take effect on the next backfill. The backfill connection pool is sized from them once, at boot, so a raised value reaches the pool only after a restart.

## Plugins

| Variable | Default | What it does |
| --- | --- | --- |
| `PLUGIN_DIR` | `./plugins` | Where installed plugins are kept. Under `dev`, `<project>/.happyview/plugins`. |
| `PLUGIN_CACHE_DIR` | `plugin-cache` beside a SQLite database; none on Postgres | Where compiled plugins are cached on disk, so a restart doesn't recompile them. It must belong to the user HappyView runs as and be private to it, or the cache stays in memory. |
| `PLUGIN_REGISTRY_URL` | `https://api.happyproto.at` | The plugin registry. Empty or `off` stops HappyView reading a registry. |
| `HAPPYVIEW_DEFAULT_PLUGINS` | none | Plugins to install on the first boot whose value lists them, separated by commas. Each source is installed once, ever: one an operator later removes stays removed. |
| `PLUGIN_URLS` | none | Plugins to load from manifest URLs at every boot, as `id\|url`, optionally followed by `\|sha256:<hash>`, separated by commas. Unlike `HAPPYVIEW_DEFAULT_PLUGINS`, each is loaded again from its URL at every start. |
| `PLUGIN_<ID>_<NAME>` | none | A plugin's secret, used when the instance holds none for that plugin. `<ID>` is the plugin's id upper-cased, with every other character as `_`. |

## Scripts and jobs

| Variable | Default | What it does |
| --- | --- | --- |
| `SCRIPT_INSTRUCTION_LIMIT` | `1000000` | Instructions a query, procedure, record or label script may run, from `1000` to `1000000000`. Instance setting `script_instruction_limit`. |
| `SCRIPT_WALL_CLOCK_SECONDS` | `10` | Seconds a query, procedure, record or label script may run, from `1` to `300`. Instance setting `script_wall_clock_seconds`. |
| `HAPPYVIEW_SCRIPT_ENV_FILE` | none | A `.env`-style file whose values are added to scripts' `ctx.env`, re-read on every run. `dev` sets it to `<project>/.env`, `test` to `<project>/.env.test`. |
| `JOB_WORKER_CONCURRENCY` | `1` | Background jobs run at once, up to `32`. |
| `HOSTNAME` | `happyview` | Names this instance's job worker in each job's `claimed_by`. |
| `HAPPYVIEW_INSTANCE_ID` | `HOSTNAME`, then the system's hostname, then a random id | Names this process in stored script metrics, trimmed and cut to 128 characters. Give each instance sharing a database its own. |
| `SCRIPT_METRICS_ENABLED` | `true` | `true` or `false`. Whether scripts' timings are recorded for the [**Script Performance**](/docs/reference/admin/metrics) page. Instance setting `script_metrics_enabled`. |
| `FEATURE_SPACES_ENABLED` | `false` | `true` turns on [atproto spaces](/docs/guides/spaces), which are off by default. Instance setting `feature.spaces_enabled`. |

An out-of-range script limit in the environment is logged and the default is used; one saved as an instance setting is refused when saved. See [Limits](/docs/reference/scripts/limits).

## Space inspector

The [space inspector](/docs/guides/spaces#moderating-spaces) lets operators with `spaces:inspect` read private space contents under a time-limited access grant. These variables come from pull requests [#350](https://github.com/gamesgamesgamesgamesgames/happyview/pull/350) and [#371](https://github.com/gamesgamesgamesgamesgames/happyview/pull/371), pending on `alpha`.

| Variable | Default | What it does |
| --- | --- | --- |
| `SPACE_INSPECTOR_ENABLED` | `false` | `true`, in any case, turns the space inspector on. Instance setting `feature.space_inspector_enabled`, the **Enable Space Inspector** switch. |
| `SPACE_INSPECTOR_MAX_GRANT_MINUTES` | `60` | The longest an access grant can last, in minutes. A value that isn't a whole number means `60`. Below `5` is raised to `5`, and above `525600` (one year) is lowered to it. Instance setting `space_inspector_max_grant_minutes`. |

A grant asks for 60 minutes by default, or the maximum if that's shorter.

## Logging, retention and telemetry

| Variable | Default | What it does |
| --- | --- | --- |
| `EVENT_LOG_RETENTION_DAYS` | `30` | Days event log entries, job logs and stored script metrics are kept. `0` keeps them. [Protected events](/docs/guides/event-logs#protected-events) follow `SPACE_ACCESS_LOG_RETENTION_DAYS` instead. Instance setting `event_log_retention_days`. |
| `SPACE_ACCESS_LOG_RETENTION_DAYS` | `365`, or `0` while `EVENT_LOG_RETENTION_DAYS` is `0` | Days [protected events](/docs/guides/event-logs#protected-events) are kept, and ended access grants with them. `0` keeps them. Events tied to a grant that still exists are kept whatever their age. Instance setting `space_access_log_retention_days`. |
| `DEAD_LETTER_RETENTION_DAYS` | `30` | Days a resolved dead letter is kept. `0` keeps them. An unresolved one is never removed. |
| `RECORD_TOMBSTONE_RETENTION_HOURS` | `72` | Hours a deleted record's tombstone is kept. `0` keeps them. |
| `VERBOSE_EVENT_LOGGING` | `false` | `true` logs every record script run and skip. It writes a lot. Instance setting `verbose_event_logging`. |
| `TELEMETRY_COLLECTOR_URL` | `https://telemetry.happyview.dev/v1/snapshot` | Where [telemetry](/docs/guides/telemetry) reports go, when it's turned on. |
| `TELEMETRY_MANAGED_BY` | none | Set only by a hosting platform: it turns telemetry on and locks its settings. Lowercase letters, digits and `-`, at most 64 characters; anything else stops boot. |

## Development only

| Variable | Default | What it does |
| --- | --- | --- |
| `HAPPYVIEW_DEV_BACKFILL` | `false` | Whether `dev` backfills. Exactly `true` or `false`. `happyview.toml`: `[dev] backfill`. |
| `HAPPYVIEW_WATCH_POLL_MS` | file events | Poll for changes every this many milliseconds, `50` to `60000`, instead of using file events. For `dev` and `test --watch`. |
| `HAPPYVIEW_NETWORK` | none | Which network `dev` is on. `hpy happyview dev --network local` sets it to `local`. With any other value, or none, `dev` prints a warning that writes reach your real PDS. |

[happyview dev](/docs/reference/cli#happyview-dev) lists the defaults `dev` fills in.

## Instance settings

These keys can be saved as instance settings, and then win over the environment. **System > General** in the dashboard edits most of them; `PUT /admin/settings/{key}` sets any of them, and `DELETE` returns a key to its environment value. Both need `settings:manage`.

| Setting | Environment variable |
| --- | --- |
| `app_name` | `APP_NAME` |
| `logo_uri`, `tos_uri`, `policy_uri`, `client_uri` | `LOGO_URI`, `TOS_URI`, `POLICY_URI`, `CLIENT_URI` |
| `backfill_concurrent_pds`, `backfill_concurrent_dids_per_pds`, `backfill_concurrent_resolution` | `BACKFILL_CONCURRENT_*` |
| `backfill_retention_days` | `BACKFILL_RETENTION_DAYS` |
| `event_log_retention_days` | `EVENT_LOG_RETENTION_DAYS` |
| `space_access_log_retention_days` | `SPACE_ACCESS_LOG_RETENTION_DAYS` |
| `feature.space_inspector_enabled`, `space_inspector_max_grant_minutes` | `SPACE_INSPECTOR_ENABLED`, `SPACE_INSPECTOR_MAX_GRANT_MINUTES` |
| `script_instruction_limit`, `script_wall_clock_seconds` | `SCRIPT_INSTRUCTION_LIMIT`, `SCRIPT_WALL_CLOCK_SECONDS` |
| `script_metrics_enabled` | `SCRIPT_METRICS_ENABLED` |
| `verbose_event_logging` | `VERBOSE_EVENT_LOGGING` |
| `feature.spaces_enabled` | `FEATURE_SPACES_ENABLED` |

`GET /admin/settings` lists every setting with where its value came from: `database`, `env`, `project`, or `platform` for a [fixed setting](#settings-a-hosting-platform-fixes). The logo, the XRPC proxy, rate-limit costs and telemetry are also stored as settings, through their own endpoints and dashboard pages.

### Settings a hosting platform fixes

A hosting platform can fix instance settings so the operator can't change them. It sets `PLATFORM_LOCKED_SETTINGS` to a comma-separated list of setting keys, such as `space_access_log_retention_days,space_inspector_max_grant_minutes`.

| Variable | Default | What it does |
| --- | --- | --- |
| `PLATFORM_LOCKED_SETTINGS` | none | Setting keys from the table above that the hosting platform fixes. |

A fixed setting:

- reads its environment variable, whatever is stored in the database;
- answers `PUT` and `DELETE /admin/settings/{key}` with `409 Conflict`;
- lists in `GET /admin/settings` with source `platform`, and any stored value for it is left out.

Boot fails when a fixed setting's variable is unset. It also fails when a fixed `space_access_log_retention_days` or `space_inspector_max_grant_minutes` isn't a whole number above `0`. A key the running version doesn't have is logged as a warning and ignored.

## happyview.toml

A project's `happyview.toml`. Every table is optional, and an unknown key anywhere is an error reported with its line. [Project structure](/docs/getting-started/project-structure) explains how they're used.

| Key | Type | Default | What it does |
| --- | --- | --- | --- |
| `[happyview] version` | string | none | The HappyView version `hpy` runs. A different running version only warns. |
| `[instance] app_name` | string | none | Supplies `APP_NAME`. |
| `[instance] superadmin` | DID | none | Supplies `SUPERADMIN_DID`. |
| `[interpreters]."<language>"` | `{ did, name, channel \| version }` | none | An interpreter, by language id. `channel` is `latest`, `beta` or `alpha`; `version` pins an exact one. Exactly one of them. |
| `[libraries]."<namespace>"` | `{ did, name, channel \| version }` | none | A library, by namespace, as for interpreters. |
| `[dev] port` | integer, 1 to 65535 | none | Supplies `PORT` under `dev`. |
| `[dev] backfill` | boolean | `false` | Supplies `HAPPYVIEW_DEV_BACKFILL` under `dev`. |
| `[network_lexicons] include` | list of NSIDs | empty | Network lexicons to track. |
| `[labels] subscribe` | list of DIDs | empty | Labelers to subscribe to. |
| `[jetstream] protocol` | `auto`, `v2` or `v1` | none | Supplies `JETSTREAM_PROTOCOL`. |
| `[jetstream] compression` | boolean | none | Supplies `JETSTREAM_COMPRESSION`. |
| `[lexicons."<NSID>"] backfill` | boolean | `false` | Backfill this record lexicon's collection once. |
| `[lexicons."<NSID>"] indexed` | boolean | `true` | `false` stops indexing the collection, keeping what's indexed. |
| `[lexicons."<NSID>"] token_cost` | integer | the cost set for the lexicon's type | How much of an API client's rate-limit budget one call to this endpoint uses. |
| `[scripts."<trigger>"] description` | string | none | Shown with the script in the dashboard. |
| `[scripts."<trigger>"] outbound_xrpcs` | list of strings | the methods found in the script's source | The XRPC methods the script calls, recorded with it and listed by the admin API. A service auth call to a procedure script is refused when the list names any method other than the one called. |

Since the release that removes them, `[lexicons."<NSID>"]` takes no `target_collection` or `action`. A file that still sets either fails to load with ``happyview.toml:2: unknown field `target_collection` ``. A query or procedure names its collection in its script; see [Upgrading to v3](/docs/guides/upgrading-to-v3#9-queries-and-procedures-need-a-script).

A deploy ignores `[happyview]`, `[instance]`, `[interpreters]`, `[libraries]`, `[dev]` and `[jetstream]`; see [Deploying](/docs/getting-started/deploying).
