---
title: "Upgrading to v3"
description: "Upgrade a v2 instance to v3 with hpy hv pull, deploy and env push, and what changes: the record format, interpreters, the codemod, libraries and plugins."
---

v3 takes script execution out of HappyView. In v2 a Lua interpreter was compiled into the binary; in v3 a script runs inside an **interpreter plugin**, and HappyView ships none. An instance with no interpreter installed can neither save nor run a script.

The libraries went the same way. `db`, `http`, `Record` and the rest were the host in v2; in v3 they are library plugins a script reaches through `require("happyview.*")`, and HappyView ships none of those either.

The database upgrades in place, but one way only: the first start moves every record into a compact format, and the way back is the backup you take first. Every environment variable you set for v2 still means the same thing, and the admin API keeps its routes. The other breaking changes are concentrated in scripts and plugins.

This guide covers the operator-facing changes. The script contract itself (the removed globals, `handle(input, ctx)`, the codemod's rewrites and markers) is in [Migrating from v2](/docs/guides/migrating-scripts).

v3 is in beta. The interpreters and the official libraries are still published to the plugin registry on the `alpha` channel only (as of 2026-11-07). The `hpy` commands this guide uses, `hpy hv pull` and `hpy hv env push`, are in `hpy` from `1.0.0-beta.5`.

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

The v3 instance you deploy to can be a new one, or this one upgraded in place. To upgrade in place, get the database ready first:

1. Take a database backup. See [Backups](/docs/guides/self-hosting/production#backups). The only way back to v2 is to restore it.
2. Check you have the free disk [the compact record format](/docs/guides/database/database-setup#before-you-upgrade) needs.
3. On Postgres, plan to stop every HappyView instance before starting v3.
4. On either backend, if you built indexes, triggers or views on the record tables, read [the same section](/docs/guides/database/database-setup#before-you-upgrade): some of them have to go first.

## 1. Get `hpy` 1.0.0-beta.5 or later

`pull --legacy` arrived in `1.0.0-beta.5`, so let's bring `hpy` up to date:

```sh
hpy update
hpy --version   # 1.0.0-beta.5 or later, or 1.0.0-alpha.30 or later on the alpha channel
```

On `1.0.0-beta.4`, `hpy update` can't replace a copy in `/usr/local/bin`, so it prints the install command to run instead. If you don't have `hpy` yet, `curl -fsSL https://happyproto.github.io/cli/install-beta.sh | sh` installs it. [Installation](/docs/getting-started/installation) has the other ways.

## 2. Create an API key on the v2 instance

v2 has no `hpy` sign-in, so we use an API key. Create one at **API Keys** in the v2 dashboard's settings, with these permissions:

- `lexicons:read`
- `scripts:read`
- `script-variables:read`
- `plugins:read`
- `labelers:read`
- `users:read`
- `settings:manage`

A key without `settings:manage` still pulls everything except your app's name, with a warning.

## 3. Pull the v2 instance into a project

Let's pull the instance into a new directory, with the key in `HAPPYVIEW_API_KEY`:

```sh
HAPPYVIEW_API_KEY=hv_... hpy hv pull --legacy --url https://old.example.com my-app
```

Without the variable, `hpy` asks for the key and doesn't echo it. `--api-key-env NAME` reads it from another variable. The key is **never** written into the project.

This writes your lexicons, scripts, plugins, app name, superadmin and labelers into `my-app/`:

- It runs each script through HappyView's v3 codemod, so it uses `handle(input, ctx)` and `require`. A query or procedure gets the collection its lexicon's `target_collection` named, written in as a literal NSID.
- It sets Lua as the project's interpreter, and adds and locks each `happyview.*` library the rewritten scripts `require`, from the registry's `alpha` channel.
- It maps official plugins to their registry projects. A plugin with no official project is left out, with a warning naming it.
- It lists any script that still needs a hand edit, under "To finish by hand".

It finishes by running `hpy hv check` to verify the results will work on a v3 instance. You can use `--dry-run` to test: it prints what the pull would write and writes nothing. `--legacy` runs the codemod from HappyView's release archive, which has no Windows build, so pull from macOS or Linux.

## 4. Finish the conversion

- **Fix any flagged scripts.** Each `-- codemod:` marker says what it needs; [Migrating from v2](/docs/guides/migrating-scripts) covers every one. `hpy hv check` also warns about a query or procedure with no script, since v3 no longer answers one on its own (see [Queries and procedures need a script](#queries-and-procedures-need-a-script)), and `hpy hv scaffold` writes a starter for each.
- **Fill in your script variables.** Their names are pulled into `.env.example`, but their values are not. `hpy` respects `.env`, so copy `.env.example` to `.env` and fill in the values.
- **Set any required plugin secrets.** The pull lists the secrets each plugin needs, and pulls none of their values. On a self-hosted v3 instance, set them as `PLUGIN_<ID>_` environment variables before you deploy. The dashboard's fields for them appear once the deploy in step 9 has installed the plugin. See [Plugin configuration](/docs/guides/plugins#plugin-configuration).

Run `hpy hv check` until it's clean.

## 5. Test it locally

Run the project with `hpy hv dev` and try it out. Better a broken script on your laptop than in front of your users. `hpy hv dev` isn't available on Windows; use WSL there. If all is working, it's safe to revoke the v2 API key.

## 6. Get the v3 instance ready

If you're deploying to a new v3 instance, there's nothing to do here.

To upgrade the v2 instance in place, upgrade the server the way it was installed (a new binary, or a new image tag) and start it. The record store upgrade runs once, before the instance accepts requests, and its log ends with `record store upgrade complete`. A pagination cursor issued before it is refused once, so callers start again from the first page. The instance has no interpreter until the deploy, and its boot log says so.

## 7. Sign in to the v3 instance

Now we sign in with an Atmosphere account that has admin privileges on the target instance:

```sh
hpy hv login --url https://new.example.com
```

[Deploying](/docs/getting-started/deploying) covers signing in from CI.

## 8. Send your script variables

Push the values from `.env`:

```sh
hpy hv env push --dry-run   # lists whether each key is new or updated
hpy hv env push             # asks before each key
```

`hpy` never prints a value. On an instance upgraded in place the values are already there, so the dry run shows each key as replacing an existing one; answer no to any you haven't changed.

## 9. Deploy

Let's preview the deploy, then run it:

```sh
hpy hv deploy --dry-run
hpy hv deploy
```

Plugins install first. Then the project switches everything else over. If the instance refuses something, any existing version is left alone. This does not prune anything from the instance. To also uninstall interpreters and libraries `happyview.lock` doesn't list, add `--prune-plugins`.

On an instance upgraded in place, your v2 scripts are still in the database, untouched. A script the project deploys answers in place of the stored one with the same trigger, and the script's page in the dashboard says "A dashboard version of this script is kept and runs again if the file is removed."

Looking good! The rest of this page is what to know after the move, and what changes between v2 and v3.

## Things to know

- **Backfill:** a record lexicon only backfills from the network if `happyview.toml` sets `backfill = true` under `[lexicons."<nsid>"]`, and only on its first deploy. The deploy preview lists the backfills it will start.
- **HappyProto hosted instances:** the deploy applies lexicons, scripts, modules, network lexicons and labelers. Instance settings and the HappyView version are unchanged.
- **To compare:** run `hpy hv pull --diff .` inside the project to see what's changed on the instance. Without the `.`, `hpy` looks for the project in a directory named after the instance's host.

## Doing it by hand

If you'd rather not use a project, every step `hpy` takes has a dashboard and API equivalent:

- **Interpreter and libraries:** install them at **Integrations > Plugins**, from the registry, on the `alpha` channel. [Installing plugins](/docs/guides/plugins#from-the-registry) is the reference. A `registry` install through `POST /admin/plugins` that names no channel asks for `latest` and resolves to nothing.
- **Scripts:** the editor's **Migrate** button, `POST /admin/scripts/{id}/codemod`, or `happyview-codemod --database-url <url>` (in the Docker image at `/usr/local/bin/happyview-codemod`) for a dry run, then again with `--apply`. Saving refuses a Lua body that still references a removed global, with the names in `removed_globals`, unless you confirm markers with `"allow_markers": true` or `--allow-markers`.
- **A fleet:** `HAPPYVIEW_DEFAULT_PLUGINS` installs a list of plugin sources on the first boot that names them; see [Default plugins](/docs/guides/plugins#default-plugins).

## What changes

### With no interpreter installed

An instance with no interpreter boots, and says so once in its log:

```
no interpreter plugin is installed, so no script can be saved or run;
install one from the plugins page in the dashboard
```

Every script surface then refuses in its own way:

| Surface | Behaviour with no interpreter |
|---------|-------------------------------|
| `POST` / `PATCH /admin/scripts` | 400, naming the language |
| XRPC query or procedure backed by a script | 503 `ServerMisconfigured`, naming the language |
| Record event | Dead-lettered on the first attempt, and the record is still indexed |
| Label event | Dead-lettered on the first attempt, and the label still persists unmodified |
| Job | Fails, with the same message in its `error` column |

Record and label events are let through rather than held, so indexing doesn't stop. The dead-letter rows are the record of what went unprocessed, at **Dead Letters** in the dashboard. The scripts list marks a row `runnable: false` when no installed interpreter claims its `script_type`.

### Interpreters

Three are published, each its own project in the registry:

| Language | `script_type` | Registry project | Script files |
|----------|---------------|------------------|--------------|
| Lua | `lua` | `happyview-lua` | `.lua` |
| JavaScript | `javascript` | `happyview-javascript` | `.js`, `.mjs` |
| TypeScript | `typescript` | `happyview-typescript` | `.ts`, `.mts` |

An upgrade needs `happyview-lua`: every script a v2 instance stored is Lua. The other two are for scripts you write from here on, and all three can be installed at once. An interpreter claims a language id and a set of file extensions, and a second one claiming either is refused at install.

### Plugins need a v3 manifest

v2 loaded plugins whose manifest declared `api_version` `"1"`. v3 requires `"2"`, and a manifest below it is refused at load with a message naming the plugin type:

```
auth plugins need an api_version: "2" manifest declaring capabilities
(got api_version "1"); republish the plugin with a capabilities-declaring manifest
```

There is no fallback for any plugin type. A v2-era manifest also has to declare its `capabilities`, and the loader cross-checks that declaration against the compiled module's import section. A plugin that imports something its manifest does not cover is refused before it runs.

The instance still boots. A refused plugin logs an error starting `Failed to load plugin` and is absent, so anything that depended on it, such as a script that loads a library, stops working until you replace it. Check your boot log after the upgrade.

The official plugins are published in the registry on the `alpha` channel. Replace a v2-era install by removing it and adding it from the registry. For a plugin of your own, republish it against the v3 SDK with a capabilities-declaring manifest; [Developing plugins](/docs/guides/developing-plugins) covers what it now has to declare.

### Script limits now apply

v3 runs every script under an instruction limit, a wall clock and a memory ceiling. A script that ran long in v2 can fail in v3. [Limits](/docs/reference/scripts/limits) has the defaults and the settings, and `ctx.job.should_stop()` is how a job stops.

A run that spends either budget fails with `timeout`; one that exhausts its memory fails with `memory`. An XRPC caller sees `{"error": "script_error", "errorType": "timeout"}` at 408, or `"memory"` at 500.

### Error text where you grep it

If you have alerting or log queries over script failures, two things changed.

**Dead-letter and job `error` columns.** v2 wrote a stage prefix naming where in the host the failure happened: `db api:`, `xrpc api:`, `script load failed:`, `missing handle():`, `create sandbox:`. v3 writes the failure's category instead: `syntax:`, `runtime:`, `timeout:`, `memory:` or `missing_handle:`, followed by the interpreter's own text, or `<category> in <file>: …` when the run has a file. The old prefixes match nothing.

**An unrecognised `script_type`.** v2 refused an unknown language with a 422 from the request body. v3 accepts any string in the body and then refuses it with a 400 naming the language, because what is valid now depends on which interpreters are installed.

### `spaceType` on the plugin and script surfaces

atproto spaces are off by default; see [Spaces](/docs/guides/spaces). An atproto space's type NSID is named `spaceType` everywhere the protocol names it: the plugin SDK's `SpaceInfo` and `SpacesCreate`, and `ctx.space.spaceType` in a script. It was `type` on the SDK and `type_nsid` on `ctx.space`.

The HTTP surface is unaffected. `createSpace` and `listSpaces` accept `spaceType` and still accept `type`, and a space in a response still carries `type`.

### Library record reads return an envelope

A record read through a library answers `{uri, did, collection, rkey, cid, indexed_at, record}`, with the stored body verbatim under `record`. That covers `require("happyview.db")`'s `get`, `search` and `records(…)` chains, and `require("happyview.backlinks")`. v2 answered the body with `uri` written onto it. `cid` is null while the row holds a local write's placeholder, and `indexed_at` is null until Jetstream has echoed the record.

The public XRPC query routes keep their flat body-plus-`uri` shape. A query with no script still answers a `uri` lookup as it did in v2, but nothing else; see [Queries and procedures need a script](#queries-and-procedures-need-a-script).

A script the codemod migrated keeps v2's flat rows, through a polyfill the codemod inlines; [Migrating from v2](/docs/guides/migrating-scripts#libraries) describes it and how to retire it.

### Queries and procedures need a script

In v3, a query or procedure lexicon names no collection. `target_collection` and the procedure `action` setting (`create`, `update`, `delete`, `upsert`) are gone from the lexicon, the admin API, `happyview.toml` and the dashboard. A script names the collection it reads or writes as a literal NSID, such as `db.records("xyz.statusphere.status")`, and `ctx.collection` is set only for record events.

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

### Building from source

A default build compiles no Lua interpreter at all: `mlua` sits behind a non-default `lua-reference` feature. The resulting binary cannot run a script without an interpreter plugin.

`lua-reference` is not a fallback interpreter. It exists so the test suite can compare the interpreter plugin against the implementation it replaced; a build with it enabled still routes every script run through the plugin.

v3 adds environment variables of its own, all optional. Two are about plugins: `PLUGIN_CACHE_DIR` and `HAPPYVIEW_DEFAULT_PLUGINS`. A Postgres instance keeps compiled plugins in memory unless you set the first. `HAPPYVIEW_DEFAULT_PLUGINS` installs each source once; `PLUGIN_URLS`, which v2 also read, loads its plugins again at every boot. See the [Configuration reference](/docs/reference/configuration#plugins).

### Rolling back

There is no in-place way back. Restore the backup you took before the upgrade, and run v2 against it:

- The compact record format replaces the record tables with views, and an older release can't read them.
- v2 refuses to start on a database carrying migrations it doesn't know.
- A script the codemod rewrote won't run on v2, since the globals it now reaches through `require` were never there.
- The migration that removes `target_collection` and `action` drops both columns. It keeps a copy of each `target_collection` for the codemod, and no copy of `action`.

Anything written after the upgrade, including operators, scripts and settings, is lost by restoring. Records come back through [backfill](/docs/guides/backfill) or the network.

## Checklist

- [ ] To upgrade in place, take a database backup
- [ ] Update `hpy` to `1.0.0-beta.5` or later
- [ ] Create a v2 API key with the seven permissions
- [ ] Pull the v2 instance with `hpy hv pull --legacy`
- [ ] Fix flagged scripts, fill in `.env` and set plugin secrets, until `hpy hv check` is clean
- [ ] Test with `hpy hv dev`, then revoke the v2 API key
- [ ] To upgrade in place, start v3 and confirm `record store upgrade complete` in the first boot's log
- [ ] Sign in with `hpy hv login`, push script variables with `hpy hv env push`, and deploy with `hpy hv deploy`
- [ ] Replace any plugin whose manifest is `api_version` `"1"`, and check the boot log for refusals
- [ ] Review long-running scripts against the instruction limit and the wall clock
- [ ] Update any alerting that matches the old stage prefixes in dead-letter or job `error` text
- [ ] Rebuild any in-house library plugin against the v3 SDK if it reads records or atproto spaces

## Next steps

- [Migrating from v2](/docs/guides/migrating-scripts): the script contract, the codemod, and every marker it emits
- [Plugins](/docs/guides/plugins): installing and configuring plugins
- [Developing plugins](/docs/guides/developing-plugins): the SDK, capabilities, and the library surface
- [Configuration reference](/docs/reference/configuration): every environment variable
