---
title: "Project structure"
description: "How a HappyView project is laid out: happyview.toml, happyview.lock, src/ and .happyview/, and how a file's path decides what it is."
prerequisites:
  - /docs/getting-started/running-locally
---

A project is a directory with a `happyview.toml` at its root and your code under `src/`. HappyView decides what each file is from its path alone, so there's nothing to register: put a file in the right place and it's part of your app.

A project as it grows, after `create` and the next few pages:

```text
my-app/
├── happyview.toml         settings, interpreters and libraries
├── happyview.lock         exact plugin versions (written by hpy)
├── .env                   values for ctx.env while you develop
├── .luarc.json            editor types for Lua (tsconfig.json for JS/TS)
├── src/
│   ├── lexicons/          lexicons, and the scripts beside them
│   ├── jobs/              job scripts
│   ├── labels/            label scripts
│   └── lib/               modules your scripts import (any name works)
└── .happyview/            local data and downloads (not committed)
```

## `src/`: what a path means

| Path | What it is | Trigger |
| --- | --- | --- |
| `src/lexicons/com/example/hello.json` | A lexicon. Its `id` must equal its path: `com.example.hello` | — |
| `src/lexicons/com/example/hello.lua` | The script for a query or procedure lexicon beside it | `xrpc.query:com.example.hello` |
| `src/lexicons/xyz/statusphere/status.create.lua` | A record script for a record lexicon beside it. `create`, `update`, `delete`, or `index` for all three | `record.create:xyz.statusphere.status` |
| `src/jobs/export.lua` | A job script | `job.run:export` |
| `src/labels/<NSID>.lua`, `src/labels/_actor.lua` | A label script, for labels on records of that collection or on accounts | `labeler.apply:<NSID>` |
| `src/lib/format.lua`, or any other path | A module, which scripts import | — |
| `anything.test.lua` | A test, wherever it is | — |

The extension picks the language: `.lua`, `.js` or `.ts`, as long as an interpreter for it is installed. The following pages write each kind of script; [Script types and triggers](/docs/reference/scripts/types-and-triggers#name-a-script-file) has every rule.

The build refuses a project it can't make sense of, and says which file and why. The usual causes:

- a lexicon whose `id` doesn't match its path, or two lexicons whose ids differ only in case;
- a record script with no record lexicon beside it, or a bare `status.lua` beside a record lexicon (it has to say `create`, `update`, `delete` or `index`);
- a subdirectory under `src/jobs/` or `src/labels/`, which are flat;
- a script in a language no installed interpreter runs.

## `happyview.toml`

```toml
[happyview]
version = "3.0.0-alpha.42"      # the HappyView version hpy runs

[instance]
app_name = "statusboard"
superadmin = "did:plc:…"        # given the superadmin privilege at boot

[interpreters]
lua = { did = "did:plc:mo7vq4jbioxwafy5zkcc3eux", name = "happyview-lua", channel = "alpha" }

[libraries]

[dev]
backfill = false                # only for hpy happyview dev
```

| Table | What it holds | On a deploy |
| --- | --- | --- |
| `[happyview]` | The HappyView version | Ignored: an instance keeps its own version |
| `[instance]` | `app_name`, and `superadmin` (a DID) | Ignored, with a warning for each key that differs from the instance's |
| `[interpreters]`, `[libraries]` | Each plugin's publisher `did`, `name`, and a `channel` or exact `version` | Installed from `happyview.lock` |
| `[lexicons."<NSID>"]` | Per-lexicon settings: `backfill`, `target_collection`, `action`, `indexed`, `token_cost` | Applied |
| `[scripts."<trigger>"]` | Per-script settings: `description`, `outbound_xrpcs` | Applied |
| `[network_lexicons]` | `include`: NSIDs to track from the network | Applied |
| `[labels]` | `subscribe`: labeler DIDs to subscribe to | Applied |
| `[dev]` | `port`, `backfill` | Ignored, with a warning when set |
| `[jetstream]` | `protocol`, `compression` | Ignored, with a warning when set |
| `[modules."<name>"]` | A compiled Rust script module | Applied |

An unknown key anywhere is an error, as is a `[lexicons."<NSID>"]` that names no lexicon in `src/lexicons/`.

Don't edit `[interpreters]` and `[libraries]` by hand: `hpy happyview add` changes them and `happyview.lock` together. See [Plugins and libraries](/docs/getting-started/plugins-and-libraries).

## `happyview.lock`

`hpy` writes it, and you commit it. It pins the exact version and content hash of every plugin, so your machine, CI and your instance all run the same ones. `dev`, `check` and `test` update it when it no longer matches `happyview.toml`. With `--locked` they fail instead, which is what CI wants. A deploy refuses a lock that doesn't match.

## `.env`

While you develop, scripts read `.env` as `ctx.env`, so keep API keys and other secrets there, not in your scripts. `create` writes a `.env.example` to copy from, and `.gitignore` keeps `.env` out of git.

`.env` isn't deployed. On an instance, `ctx.env` comes from the dashboard's **System > ENV Variables** page. Test runs read `.env.test` instead.

## `.happyview/`

Local state `hpy` and the local instance keep: the SQLite database, the plugins it loaded, generated secrets, built modules and editor types. It's in `.gitignore`. Delete it to start your local instance over.

## Next steps

- [Lexicons](/docs/getting-started/lexicons): add a record lexicon and start indexing.
