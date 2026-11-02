---
title: "Upgrading to v3"
description: "What changes when an instance moves from v2 to v3, and the steps to upgrade one: the record format, interpreters, the codemod, libraries and plugins."
---

v3 takes script execution out of HappyView. In v2 a Lua interpreter was compiled into the binary; in v3 a script runs inside an **interpreter plugin**, and HappyView ships none. An instance with no interpreter installed can neither save nor run a script.

The libraries went the same way. `db`, `http`, `Record` and the rest were the host in v2; in v3 they are library plugins a script reaches through `require("happyview.*")`, and HappyView ships none of those either.

The database upgrades in place, but one way only: the first start moves every record into a compact format, and the way back is the backup you take first. Every environment variable you set for v2 still means the same thing, and the admin API keeps its routes. The other breaking changes are concentrated in scripts and plugins.

This guide covers the operator-facing changes. The script contract itself (the removed globals, `handle(input, ctx)`, the codemod's rewrites and markers) is in [Migrating from v2](/docs/guides/migrating-scripts).

**v3 is in alpha.** The interpreters and the official libraries are published to the plugin registry, on the `alpha` channel only, and neither `latest` nor `beta` resolves to anything yet. There is also no guided upgrade flow that detects a v2 database and walks you through the codemod; every step below is manual.

## Architecture changes

| v2 | v3 |
|----|-----|
| Lua compiled into the HappyView binary | Scripts run in an interpreter plugin; none ships with HappyView |
| One script language, `lua` | `script_type` names whichever language an installed interpreter claims |
| Script bodies checked by the built-in Lua parser | Checked by the interpreter's own `validate` export |
| Script globals (`db`, `params`, `Record`, `now()`, …) | `handle(input, ctx)` plus `require("internal.*")` / `require("happyview.*")` |
| `db`, `http`, `Record` and the rest built into the host | Library plugins, installed like any other |
| Plugin manifests at `api_version` `"1"` | `api_version` `"2"`, declaring capabilities |
| Plugins installed from a URL and checked against a `sha256` you supply | Installed from a registry of `software.release` records and verified by CID |
| Script limits | An instruction limit, a wall clock and a per-run memory ceiling |
| `happyview_records` and `happyview_record_refs` are tables | Views over a compact format, compressed on SQLite |

## Before you start

1. Take a database backup. See [Backups](/docs/guides/self-hosting/production#backups). The only way back to v2 is to restore it.
2. Check you have the free disk [the compact record format](/docs/guides/database/database-setup#before-you-upgrade) needs.
3. On Postgres, stop every HappyView instance before starting v3.
4. On either backend, if you built indexes, triggers or views on the record tables, read [the same section](/docs/guides/database/database-setup#before-you-upgrade): some of them have to go first.

Then start v3. The upgrade runs once, before the instance accepts requests, and its log ends with `record store upgrade complete`. A pagination cursor issued before it is refused once, so callers start again from the first page.

## 1. Install an interpreter plugin

Nothing runs a script until one is installed. Boot says so once:

```
no interpreter plugin is installed, so no script can be saved or run;
install one from the plugins page in the dashboard
```

Until then, every script surface refuses in its own way:

| Surface | Behaviour with no interpreter |
|---------|-------------------------------|
| `POST` / `PATCH /admin/scripts` | 400, naming the language |
| XRPC query or procedure backed by a script | 503 `ServerMisconfigured`, naming the language |
| Record event | Dead-lettered on the first attempt, and the record is still indexed |
| Label event | Dead-lettered on the first attempt, and the label still persists unmodified |
| Job | Fails, with the same message in its `error` column |

Record and label events are let through rather than held, so indexing doesn't stop. The dead-letter rows are the record of what went unprocessed, at **Dead Letters** in the dashboard.

To see what is installed:

```sh
curl "http://127.0.0.1:3000/admin/plugins?type=interpreter" -H "$AUTH"
```

The scripts list also flags each row: `runnable` is `false` when no installed interpreter claims its `script_type`, and the dashboard marks those rows at **Integrations > Scripts**.

### Which interpreter

Three are published, each its own project in the registry:

| Language | `script_type` | Registry project | Script files |
|----------|---------------|------------------|--------------|
| Lua | `lua` | `happyview-lua` | `.lua` |
| JavaScript | `javascript` | `happyview-javascript` | `.js`, `.mjs` |
| TypeScript | `typescript` | `happyview-typescript` | `.ts`, `.mts` |

An upgrade needs `happyview-lua`: every script a v2 instance stored is Lua. The other two are for scripts you write from here on, and all three can be installed at once. An interpreter claims a language id and a set of file extensions, and a second one claiming either is refused at install.

### Installing it

1. Go to **Integrations > Plugins**.
2. Click **Add plugin**.
3. Pick the project from the registry.
4. Choose a channel.
5. Review the capabilities it asks for.
6. Install it.

[Installing plugins](/docs/guides/plugins#from-the-registry) is the reference, and three of its details apply to an upgrade.

**It is the `alpha` channel.** A project publishes up to three (`latest`, `beta` and `alpha`), and these have published only `alpha` so far. The dashboard picks it for you, because it is the only one the project has. `POST /admin/plugins` does not, and a `registry` install naming no channel asks for `latest` and resolves to nothing. **Switch channel** moves an install later; see [Channels](/docs/guides/plugins#channels).

**There is nothing to checksum.** A registry version names its manifest and its module by CID. HappyView fetches both from the registry, refuses either whose bytes don't match, and stores the CIDs with the install so it checks them again at every boot and reload. A registry install takes no `sha256`. [Verified by CID](/docs/guides/plugins#verified-by-cid) has the details.

**The registry it came from is a boot dependency.** While the registry can't be reached, a plugin installed from it isn't loaded, which for an interpreter means no script runs. Setting `PLUGIN_REGISTRY_URL` to `off` doesn't change that; it stops HappyView reading the registry, not the stored install's own fetch. Install from a URL or the file system instead if you need an instance that depends on nothing.

To install without the dashboard, see [`POST /admin/plugins`](/docs/reference/admin/plugins#install-a-plugin) with `registry`. To give a fleet its interpreter without anyone clicking, `HAPPYVIEW_DEFAULT_PLUGINS` installs a list of sources on the first boot that names them; see [Default plugins](/docs/guides/plugins#default-plugins).

An interpreter installed from a release URL needn't be reinstalled. The next registry refresh matches a URL install to the official publisher's project with the same plugin id, and its updates come from the registry from then on. One that matches nothing is marked **Unresolved** and keeps working. [From a URL](/docs/guides/plugins#from-a-url) covers both.

## 2. Migrate your stored scripts

A script stored before the upgrade stays in the table untouched and fails the first time it reads a removed global. The scripts list reports what each one still references in `needs_migration`, and the codemod rewrites it: from the editor's **Migrate** button, from `POST /admin/scripts/{id}/codemod`, or from the `happyview-codemod` CLI.

[Migrating from v2](/docs/guides/migrating-scripts) is the reference for what the rewrite does and what it leaves behind as a `-- codemod:` marker for you to finish by hand.

Two things affect the order you do this in:

- **The codemod does not need an interpreter.** It is a source rewrite, so you can migrate every stored script before installing one. Editing a script by hand afterwards does need an interpreter, because the save is validated through it.
- **`happyview-codemod` is in the published Docker image**, at `/usr/local/bin/happyview-codemod`. Run `docker run <image> happyview-codemod --database-url <url>` against the same database for a dry run, then again with `--apply` to write the rewrites. Or use `POST /admin/scripts/{id}/codemod` with `{"apply": true}`.

Saving is stricter than running: `POST` / `PATCH /admin/scripts` refuse a Lua body that still references a removed global, with the names in `removed_globals`. The codemod's own apply is the one exception: a rewrite that still has markers is stored once you confirm it, with `"allow_markers": true` in the API or `--allow-markers` on the CLI.

## 3. Install the libraries your scripts require

The codemod rewrites a v2 global into a `require`, and each `happyview.*` name it requires is a library plugin. A migrated script therefore saves fine and then fails at run time on the first library it names that isn't installed. Do this before you let traffic reach a migrated script.

The `require` block the codemod writes at the top of each script is the list of what that script needs. The `internal.*` modules in it come from the interpreter itself and need nothing installed; each `happyview.*` library is a project in the registry:

| `require` | Registry project |
|-----------|------------------|
| `happyview.db` | `happyview-db` |
| `happyview.sql` | `happyview-sql` |
| `happyview.backlinks` | `happyview-backlinks` |
| `happyview.record` | `happyview-record` |
| `happyview.xrpc` | `happyview-xrpc` |
| `happyview.atproto` | `happyview-atproto` |
| `happyview.spaces` | `happyview-spaces` |
| `happyview.linked_repos` | `happyview-linked-repos` |
| `happyview.jobs` | `happyview-jobs` |
| `happyview.http` | `happyview-http` |

They install exactly as an interpreter does, from the same registry and the same `alpha` channel. The registry carries libraries the codemod never writes a `require` for, `happyview-blobs` among them; install those if you reach for them in a script you write yourself.

The codemod's polyfills are libraries too. The `Record` shim needs `happyview-record` at the version shipped with v3, the one exporting `lexicon`, and says so by name if it meets an older one. The row-shape shim reads through `happyview-db`, `happyview-backlinks` or both. [Polyfills](/docs/guides/migrating-scripts#libraries) says which shim a script got and why.

## 4. Rebuild or replace your plugins

v2 loaded plugins whose manifest declared `api_version` `"1"`. v3 requires `"2"`, and a manifest below it is refused at load with a message naming the plugin type:

```
auth plugins need an api_version: "2" manifest declaring capabilities
(got api_version "1"); republish the plugin with a capabilities-declaring manifest
```

There is no fallback for any plugin type, auth included. A v2-era manifest also has to declare its `capabilities`, and the loader cross-checks that declaration against the compiled module's import section. A plugin that imports something its manifest does not cover is refused before it runs.

The instance still boots. A refused plugin logs an error starting `Failed to load plugin` and is absent, so anything that depended on it, such as a script that loads a library, stops working until you replace it. Check your boot log after the upgrade.

The official plugins are published in the registry on the `alpha` channel. Replace a v2-era install by removing it and adding it from the registry. For a plugin of your own, republish it against the v3 SDK with a capabilities-declaring manifest; [Developing plugins](/docs/guides/developing-plugins) covers what it now has to declare.

## 5. Script limits now apply

v3 runs every script under an instruction limit, a wall clock and a memory ceiling. A script that ran long in v2 can fail in v3. [Limits](/docs/reference/scripts/limits) has the defaults and the settings, and `ctx.job.should_stop()` is how a job stops.

A run that spends either budget fails with `timeout`; one that exhausts its memory fails with `memory`. An XRPC caller sees `{"error": "script_error", "errorType": "timeout"}` at 408, or `"memory"` at 500.

## 6. Error text where you grep it

If you have alerting or log queries over script failures, two columns changed shape.

**Dead-letter and job `error` columns.** v2 wrote a stage prefix naming where in the host the failure happened: `db api:`, `xrpc api:`, `script load failed:`, `missing handle():`, `create sandbox:`. v3 writes the failure's category instead: `syntax:`, `runtime:`, `timeout:`, `memory:` or `missing_handle:`, followed by the interpreter's own text, or `<category> in <file>: …` when the run has a file. The old prefixes match nothing.

**An unrecognised `script_type`.** v2 refused an unknown language with a 422 from the request body. v3 accepts any string in the body and then refuses it with a 400 naming the language, because what is valid now depends on which interpreters are installed.

## 7. `spaceType` on the plugin and script surfaces

A space's type NSID is named `spaceType` everywhere the protocol names it: the plugin SDK's `SpaceInfo` and `SpacesCreate`, and `ctx.space.spaceType` in a script. It was `type` on the SDK and `type_nsid` on `ctx.space`.

The HTTP surface is unaffected. `createSpace` and `listSpaces` accept `spaceType` and still accept `type`, and a space in a response still carries `type`.

## 8. Library record reads return an envelope

A record read through a library answers `{uri, did, collection, rkey, cid, indexed_at, record}`, with the stored body verbatim under `record`. That covers `require("happyview.db")`'s `get`, `search` and `records(…)` chains, and `require("happyview.backlinks")`. v2 answered the body with `uri` written onto it. `cid` is null while the row holds a local write's placeholder, and `indexed_at` is null until Jetstream has echoed the record.

The public XRPC query routes keep their flat body-plus-`uri` shape. A query with no script still answers a `uri` lookup as it did in v2, but nothing else; see [Queries and procedures need a script](#9-queries-and-procedures-need-a-script).

A script the codemod migrated keeps v2's flat rows, through a shim the codemod inlines; [Migrating from v2](/docs/guides/migrating-scripts#libraries) describes it and how to retire it.

## 9. Queries and procedures need a script

Since the release that removes them, a query or procedure lexicon names no collection. `target_collection` and the procedure `action` setting (`create`, `update`, `delete`, `upsert`) are gone from the lexicon, the admin API, `happyview.toml` and the dashboard. A script names the collection it reads or writes as a literal NSID, such as `db.records("xyz.statusphere.status")`, and `ctx.collection` is set only for record events.

HappyView no longer answers a query or procedure on its own:

| Call | v2 with no script | v3 with no script |
|------|-------------------|-------------------|
| Query with `?uri=<at-uri>` | That record, as `{"record": {...}}` | Unchanged |
| Any other query | A page of the target collection | `501 MethodNotImplemented` |
| Procedure | A create, put or delete on the caller's PDS | `501 MethodNotImplemented` |

The `501` body names the trigger to add a script for:

```json
{ "error": "MethodNotImplemented", "message": "xyz.statusphere.setStatus has no script. Add one for the trigger xrpc.procedure:xyz.statusphere.setStatus" }
```

Before you upgrade, list the query and procedure lexicons your clients call that have no script, and write one for each. A v2 default list query becomes a `db.records(...)` chain, as in [Paginated list](/docs/guides/recipes/paginated-list). A v2 default procedure becomes a `record.create` or `record.put` from `happyview.record`, as in [Create a record](/docs/guides/recipes/create-record).

**The codemod writes the collection in.** A v2 query or procedure that read its `collection` global, or `ctx.collection`, gets the NSID its lexicon's `target_collection` named, as a string literal. The migration that drops the column first copies each lexicon's value into a table the codemod reads, so this works on an upgraded instance. In `--file` or `--stdin` mode, pass the NSID with `--collection`. Where the codemod doesn't know it, it leaves a `-- codemod:` marker; see [The collection a query or procedure names](/docs/guides/migrating-scripts#the-collection-a-query-or-procedure-names).

**Remove `target_collection` and `action` from `happyview.toml`.** A `[lexicons."<NSID>"]` table that still sets either fails to load, with an error naming the line:

```text
happyview.toml:2: unknown field `target_collection`
```

`happyview check`, boot and a project deploy all fail on it.

## 10. Building from source

A default build compiles no Lua interpreter at all: `mlua` sits behind a non-default `lua-reference` feature. The resulting binary cannot run a script without an interpreter plugin.

`lua-reference` is **not** a fallback interpreter. It exists so the test suite can compare the interpreter plugin against the implementation it replaced; a build with it enabled still routes every script run through the plugin.

v3 adds environment variables of its own, all optional. Two are about plugins: `PLUGIN_CACHE_DIR` and `HAPPYVIEW_DEFAULT_PLUGINS`. A Postgres instance keeps compiled plugins in memory unless you set the first. `HAPPYVIEW_DEFAULT_PLUGINS` installs each source once; `PLUGIN_URLS`, which v2 also read, loads its plugins again at every boot. See the [Configuration reference](/docs/reference/configuration#plugins).

## 11. Rolling back

There is no in-place way back. Restore the backup you took before the upgrade, and run v2 against it:

- The compact record format replaces the record tables with views, and an older release can't read them.
- v2 refuses to start on a database carrying migrations it doesn't know.
- A script the codemod rewrote won't run on v2, since the globals it now reaches through `require` were never there.
- The migration that removes `target_collection` and `action` drops both columns. It keeps a copy of each `target_collection` for the codemod, and no copy of `action`.

Anything written after the upgrade, including operators, scripts and settings, is lost by restoring. Records come back through [backfill](/docs/guides/backfill) or the network.

## Checklist

- [ ] Take a database backup, and confirm `record store upgrade complete` in the first boot's log
- [ ] Install an interpreter plugin from the registry on the `alpha` channel, and confirm boot no longer warns
- [ ] Run the codemod over every stored script, and finish any `-- codemod:` markers by hand
- [ ] Add a script to every query or procedure that has none, and remove `target_collection` and `action` from `happyview.toml`
- [ ] Install a library plugin for every `happyview.*` name the rewritten scripts require
- [ ] Confirm `needs_migration` is empty and `runnable` is true for every script
- [ ] Replace any plugin whose manifest is `api_version` `"1"`, and check the boot log for refusals
- [ ] Review long-running scripts against the instruction limit and the 10-second wall clock
- [ ] Update any alerting that matches the old stage prefixes in dead-letter or job `error` text
- [ ] Rebuild any in-house library plugin against the v3 SDK if it reads records or spaces

## Next steps

- [Migrating from v2](/docs/guides/migrating-scripts): the script contract, the codemod, and every marker it emits
- [Plugins](/docs/guides/plugins): installing and configuring plugins
- [Developing plugins](/docs/guides/developing-plugins): the SDK, capabilities, and the library surface
- [Configuration reference](/docs/reference/configuration): every environment variable
