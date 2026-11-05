---
title: "Plugin SDK"
description: "The plugin manifest, every capability and the host functions it unlocks, the Rust SDK's macros, the limits a plugin runs under, and publishing to the registry."
---

A plugin is a WebAssembly module plus a `manifest.json` that says what it is and what it may do. [Developing plugins](/docs/guides/developing-plugins) walks through building one.

## The SDK crate

`happyview-plugin-sdk` (version 0.5.0) is the Rust side of the plugin interface. It holds the allocator and calling convention, the JSON types that cross the boundary, a typed wrapper for every host function, and macros that generate a plugin's exports. It isn't on crates.io; depend on it from HappyView's repository:

```toml
[dependencies]
happyview-plugin-sdk = { git = "https://github.com/gamesgamesgamesgamesgames/happyview", branch = "alpha" }
```

| Target | For |
| --- | --- |
| `wasm32-unknown-unknown` | Library and auth plugins written `no_std`. The SDK supplies the allocator and panic handler. |
| `wasm32-wasip1` | Plugins that use `std`, such as interpreters. The standard library supplies the panic handler. |

On rustc 1.96 and later, an `extern` block of host imports you write yourself needs `#[link(wasm_import_module = "env")]`, or the build fails at link time. The SDK's own imports carry it, and a wrapper you don't call adds no import.

### Macros

| Macro | Plugin type | Generates |
| --- | --- | --- |
| `export_abi!()` | any | `alloc` and `dealloc`, using the SDK's allocator (dlmalloc), plus a panic handler on targets without WASI. |
| `export_abi!(alloc = system)` | any | `alloc` and `dealloc` using the crate's own global allocator, for plugins that link `std`, plus the same panic handler on targets without WASI. |
| `library_plugin! { info, surface, call }` | library | The ABI, `plugin_info`, `get_api_surface` and `call`. `call` gets the function name, its arguments and a `CallContext`. |
| `auth_plugin! { info, authorize_url, callback, refresh, profile }` | auth | The ABI, `plugin_info`, `get_authorize_url`, `handle_callback`, `refresh_tokens` and `get_profile`. |
| `interpreter_plugin! { info, execute, validate[, declarations] }` | interpreter | The ABI with `alloc = system`, `plugin_info`, `execute`, `validate`, and `get_declarations` when `declarations` is given. |

Input a macro can't parse is answered with a `BAD_INPUT` error; a plugin never panics on it.

### The calling convention

Each export takes its input as a pointer and length the host wrote with the plugin's `alloc`, and returns a packed `i64`, `(ptr << 32) | len`, pointing at a JSON envelope: `{"ok": …}` on success, or `{"error": {"code", "message", "retryable"}}`. The SDK's `wire` module defines every type that crosses the boundary; `PluginInfo::new` fills in `api_version` `"2"`.

## The manifest

| Field | Type | Plugin types | Rules |
| --- | --- | --- | --- |
| `id` | string | all | Required. |
| `name` | string | all | Required. |
| `version` | string | all | Required. |
| `api_version` | string | all | Required, and must be `"2"`. Lower is refused as too old, higher as unsupported. |
| `plugin_type` | `auth`, `library` or `interpreter` | all | Default `auth`. |
| `description`, `icon_url`, `banner_url`, `publisher` | strings | all | Optional. `publisher` is a DID. |
| `wasm_file` | string | all | Default `plugin.wasm`, relative to the manifest (its URL, or its directory on disk). |
| `capabilities` | list | all | Must cover every import the module makes; see [Capabilities](#capabilities). The plugin gets exactly these. |
| `allowed_hosts` | list of hostnames | all | The hosts `network:request` may reach. A bare hostname or `*.`-prefixed. |
| `required_secrets` | `[{ key, name, description? }]` | all | Each `key` must start with `PLUGIN_<ID>_`, the id upper-cased with other characters as `_`. |
| `namespace` | string | library | What scripts `require`, such as `happyview.db`. Default: the `id`. `internal.` is reserved, and two libraries can't share one. |
| `dependencies` | `[{ id, version }]` | library | Other libraries this one calls, with a semver range (default `*`). Auth and interpreter plugins can't declare any. |
| `language_id` | string | interpreter | Required. Lowercase letters, digits, `-` and `_`, starting with a letter. Unique among installed interpreters. |
| `extensions` | list | interpreter | The file extensions it runs, 1 to 16 lowercase letters or digits, not `json`, none listed twice. Unique among installed interpreters. |
| `file_extension` | string | interpreter | One extension, the older form of `extensions`. Read only when `extensions` is empty. |
| `monaco_language` | string | interpreter | Accepted and kept with the manifest; HappyView doesn't read it. |
| `supports_libraries` | list | interpreter | Default `["*"]`, every library. Can't mix `*` with ids. |
| `auth_type` | `oauth2`, `openid` or `api_key` | auth | Default `oauth2`. |
| `config_schema` | JSON Schema | auth | Optional. |

A manifest fetched from a URL or the registry may be at most 1 MiB, and a module fetched that way at most 16 MiB. A module that uses the component model, GC or typed function references is refused. A plugin installed from the registry is refused if its manifest or module doesn't match the content hash its release recorded.

## Capabilities

At install, HappyView reads the module's imports and refuses it unless `capabilities` covers every one. The operator sees each capability with its risk and description before installing. At run time, a call to a host function the plugin lacks the capability for answers `FORBIDDEN` (the key-value imports, which return a bare status, answer `-1`).

| Capability | Risk | What the operator is told | Host functions |
| --- | --- | --- | --- |
| `secrets:read` | Low | Read the secrets you configure for this plugin. | `host_get_secret` |
| `kv:read` | Low | Read its own key-value storage. | `host_kv_get` |
| `kv:write` | Low | Write to its own key-value storage (1 MB per scope). | `host_kv_set`, `host_kv_delete` |
| `records:read` | Medium | Look up indexed AT Protocol records. | `host_lookup_record`, `host_records_query`, `host_records_count`, `host_records_get`, `host_records_search`, `host_backlinks_query` |
| `records:write` | High | Write to this instance's record index directly, bypassing the network. This can replace the body of a record that arrived from the network while its CID and indexed time stay as the network set them. | `host_records_index_put`, `host_records_index_delete` |
| `network:request` | Medium | Make HTTP requests, only to the hosts it lists. Redirects are not followed. | `host_http_request` |
| `network:request:defined` | Medium | Make HTTP requests only to the hosts you list for this plugin in its settings. Redirects are not followed. | `host_http_request` |
| `network:request:unrestricted` | High | Make HTTP requests to any host on the internet, including internal services this server can reach. | `host_http_request` |
| `library:call` | Medium | Call other installed library plugins, which run with their own permissions (not this plugin's). | `host_call_library`, `host_call_library_start`, `host_call_library_wait_any`, `host_get_api_surface` |
| `database:read` | High | Run arbitrary read-only SQL against indexed records, labels, lexicons, jobs and space data. Internal auth, secret and key tables are blocked. | `host_db_query`, `host_table_query` |
| `database:write` | Critical | Run arbitrary SQL, including INSERT, UPDATE, DELETE and DROP, against indexed records, labels, lexicons, jobs and space data. This can destroy your index. | `host_db_query`, `host_table_query`, `host_db_execute` |
| `caller:read` | Medium | Read from the AT Protocol network as the user who ran the script. | `host_caller_xrpc_query`, `host_caller_get_session` |
| `caller:email` | High | Read the email address of the user who ran the script, and whether it is confirmed, from their PDS, whenever their sign-in granted this instance access to it. | `host_caller_get_email` |
| `caller:write` | High | Create, update and delete records in the user's own repository and upload blobs to it. | `host_caller_create_record`, `host_caller_put_record`, `host_caller_delete_record`, `host_caller_upload_blob` |
| `caller:call` | Critical | Call any XRPC procedure as the user, including ones that change their account. A procedure this instance does not serve is forwarded to the NSID's authority without the user's credentials. | `host_caller_xrpc_procedure` |
| `blobs:read` | Medium | Read any byte content this instance stores, and its media type and size, given its content address. | `host_blob_get`, `host_blob_stat` |
| `blobs:write` | Medium | Store byte content in this instance's database, consuming disk without limit other than the instance's own. Content is addressed by its hash, so a write cannot replace or alter content already stored. | `host_blob_put` |
| `atproto:read` | Medium | Resolve any DID's service endpoints, download blobs from any repo on the network, look up labels applied to any URI, and verify this instance's attestation signatures. | `host_atproto_resolve_service`, `host_atproto_resolve_identity`, `host_atproto_blob_download`, `host_labels_get`, `host_attest_verify` |
| `attest:sign` | High | Sign records with this instance's attestation key, producing a signature that asserts this instance vouches for the content. | `host_attest_sign` |
| `linked_repos:use` | High | Write records and upload blobs through any repo an admin has linked to this instance, within the scopes that admin granted, and call any XRPC method through it, which only that repo's PDS constrains. | `host_linked_repos_list`, `host_linked_repo_create_record`, `host_linked_repo_put_record`, `host_linked_repo_delete_record`, `host_linked_repo_upload_blob`, `host_linked_repo_call` |
| `jobs:create` | Medium | Enqueue background jobs as the user who ran the script, optionally carrying that user's PDS session into the job. | `host_jobs_create` |
| `jobs:read` | Low | Read background jobs the user who ran the script created. | `host_jobs_get` |
| `jobs:read_any` | High | Read every background job on this instance, including other users' job input and results. | `host_jobs_get_any`, `host_jobs_list_any` |
| `spaces:read` | High | Read the members and records of every space this instance holds, regardless of each space's read policy. | `host_spaces_info`, `host_spaces_query`, `host_spaces_members`, `host_spaces_access` |
| `spaces:write` | High | Create spaces, write records into them, and manage their members and invites, as the user who ran the script and with that user's access. | `host_spaces_create`, `host_spaces_accept_invite`, `host_spaces_write_record`, `host_spaces_put_record`, `host_spaces_delete_record`, `host_spaces_add_member`, `host_spaces_set_member`, `host_spaces_remove_member`, `host_spaces_update`, `host_spaces_delete`, `host_spaces_create_invite` |
| `script:host` | Low | Log, report progress, check for a stop request, wait, and load the project's own modules on behalf of the script run it is inside; the host supplies the run's identity, job and files. | `host_script_log`, `host_job_progress`, `host_job_should_stop`, `host_job_wait`, `host_module_resolve` |
| `script:test` | Low | Fire this project's triggers, mock its libraries and record results, only while the test command runs one of its test files. | `host_test_trigger`, `host_test_mock`, `host_test_calls`, `host_test_pds_writes`, `host_test_report` |
| `wasi:clock` | Low | Read the wall clock. | WASI `clock_time_get`, `clock_res_get` |
| `wasi:random` | Low | Read secure random numbers. | WASI `random_get` |
| `wasi:stdio` | Medium | Write to this instance's plugin log. | WASI `fd_write` |

Rules that go with them:

- `host_log`, `host_lexicon_get`, `host_allowed_hosts` and `host_script_panic` need no capability.
- `network:request`, `network:request:defined` and `network:request:unrestricted` can't be combined. `network:request` needs `allowed_hosts`; the other two need it empty. With `network:request:defined`, the operator sets the hosts under the plugin's settings (`GET`/`PUT /admin/plugins/{id}/allowed-hosts`).
- Only the WASI imports above are allowed, plus the ones a WASI build links without using them (`proc_exit`, `sched_yield`, `fd_fdstat_get`, `fd_prestat_get`, `fd_prestat_dir_name`, `args_*`, `environ_*`). Any other WASI import, such as a file or socket, is refused at install whatever the manifest says. Standard output reaches the plugin log at `info`, standard error at `warn`.

## Host function wrappers

The SDK's `host` module has a typed wrapper for each host function, grouped here by the capability it needs. Each returns a `Result` whose error carries the host's code and message: a `PluginError` for most, and a `HostError` (its `Plugin` variant) for `get_secret`, `http_request`, `allowed_hosts`, `kv_get`, `kv_set`, `kv_delete` and `lookup_record`. The logging wrappers and `script_panic` return nothing.

| Capability | Wrappers |
| --- | --- |
| none | `log`, `debug`, `info`, `warn`, `error`, `allowed_hosts`, `lexicon_get`, `script_panic` |
| `secrets:read` | `get_secret` |
| `kv:read`, `kv:write` | `kv_get`, `kv_set(key, value, ttl_secs)`, `kv_delete` |
| `network:*` | `http_request` |
| `records:read` | `lookup_record`, `records_query`, `records_count`, `records_get`, `records_search`, `backlinks_query` |
| `records:write` | `records_index_put`, `records_index_delete` |
| `database:*` | `db_query`, `table_query`, `db_execute` |
| `caller:*` | `caller_xrpc_query`, `caller_get_session`, `caller_get_email`, `caller_create_record`, `caller_put_record`, `caller_delete_record`, `caller_upload_blob`, `caller_xrpc_procedure` |
| `blobs:*` | `blob_put`, `blob_get`, `blob_stat`, `blob_exists` |
| `atproto:read`, `attest:sign` | `atproto_resolve_service`, `atproto_resolve_identity`, `atproto_blob_download`, `labels_get`, `attest_verify`, `attest_sign` |
| `linked_repos:use` | `linked_repos_list`, `linked_repo_create_record`, `linked_repo_put_record`, `linked_repo_delete_record`, `linked_repo_upload_blob`, `linked_repo_call` |
| `jobs:*` | `jobs_create`, `jobs_get`, `jobs_get_any`, `jobs_list_any` |
| `spaces:*` | `spaces_info`, `spaces_query`, `spaces_members`, `spaces_access`, `spaces_create`, `spaces_accept_invite`, `spaces_write_record`, `spaces_put_record`, `spaces_delete_record`, `spaces_add_member`, `spaces_set_member`, `spaces_remove_member`, `spaces_update`, `spaces_delete`, `spaces_create_invite` |
| `library:call` | `call_library`, `call_library_start`, `call_library_wait_any`, `library_surface` |
| `script:host` | `script_log`, `job_progress`, `job_should_stop`, `job_wait`, `module_resolve` |
| `script:test` | `test_trigger`, `test_mock`, `test_calls`, `test_pds_writes`, `test_report` |

Record reads return envelopes, `{ uri, did, collection, rkey, cid, indexed_at, record }`, with the record's own body under `record`.

## A library's API surface

`get_api_surface` describes what a library exports, and editors' types are generated from it. Each `type` is a string in this grammar:

```text
type     := union
union    := postfix ('|' postfix)*
postfix  := primary ('[]' | '?')*
primary  := builtin | 'literal' | name | '(' type ')'
builtin  := string integer number boolean bytes null unknown any blob cid-link object array true false
```

Any other word is a reference to a named type in the surface's `types`. HappyView refuses to install a library whose surface doesn't parse.

## Limits

| Limit | Value |
| --- | --- |
| Memory, library and auth plugins | 512 MiB |
| Memory, interpreters | twice the script memory limit |
| CPU, library and auth plugins | about 100 ms of work per call, plus a little per byte of input |
| CPU, interpreters | the script's own wall-clock limit; jobs are exempt |
| Nested library calls | 8 deep; the ninth is refused |
| Library calls in flight at once | 8 per plugin instance; more wait their turn |
| HTTP | 100 requests per call, 5 at once, 120 s each, 100 MB per response and 500 MB in all |
| Key-value storage | 1 MB per scope |
| Record queries | 20 rows by default, at most 100 |
| `job_wait` | at most 3600 s per call |

HappyView caches compiled modules in memory, and on disk in `PLUGIN_CACHE_DIR` when one is configured; see [Configuration](/docs/reference/configuration#plugins).

## Publishing to the registry

Plugins are published with `hpy` to your own atproto repository, as `software.release` records the registry indexes. Beside `manifest.json`, an `hpy.toml` describes the project and release:

```toml
[project]
name = "my-plugin"              # default: the manifest's id
display_name = "My plugin"
description = "What it does."
keywords = ["search"]

[release]
license = "MIT"
changelog = "CHANGELOG.md"      # this version's entry is published with it

[build]
command = "cargo build --target wasm32-unknown-unknown --release"
```

| Command | What it does |
| --- | --- |
| `hpy registry login` | Sign in to the registry. `--export` prints a credential for CI, used as `HPY_CREDENTIAL`. |
| `hpy registry plugin init` | Write `hpy.toml`'s `[project]` and create the project in the registry. |
| `hpy registry plugin publish` | Build and publish a new version. `--track latest\|beta\|alpha` picks the channel (default: `latest` for a stable version, else the prerelease's name); `--dry-run` shows what would be published. |
| `hpy registry plugin status [version]` | Show what the registry knows about your versions. |
| `hpy registry plugin lifecycle <version> <event>` | Record `endOfDevelopment`, `endOfSupport`, `supersededBy`, `endOfDistribution` or `endOfLife`, for a version or (with `--project`) the whole project. |

A published version can't change: publishing the same version with a different module is refused. [CLI](/docs/reference/cli#hpy) lists the other `hpy registry` commands.
