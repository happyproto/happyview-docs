---
title: "Libraries"
description: "The happyview.* library plugins a script loads with require, the capabilities each needs, and the conventions they share."
---

A library is a plugin a script loads with `require`. Each has a namespace under `happyview.`, declares the [capabilities](/docs/guides/developing-plugins#capabilities) it needs, and documents its own surface in its README. HappyView ships none of them: every library is installed from the [plugins repository](https://github.com/happyproto/plugins) through **Integrations > Plugins** or the [admin API](/docs/reference/admin/plugins), and a script that requires one that is not installed fails to load.

| `require` | Capabilities | Purpose | Surface |
| --- | --- | --- | --- |
| `happyview.db` | `records:read` | Read indexed records: a chainable query per collection, one record by URI, substring search, and the backend name | [README](https://github.com/happyproto/plugins/tree/alpha/plugins/happyview/db) |
| `happyview.sql` | `database:read`, `database:write` | Raw SQL, and a chainable builder over the operator's own tables | [README](https://github.com/happyproto/plugins/tree/alpha/plugins/happyview/sql) |
| `happyview.backlinks` | `records:read` | Records whose strong refs point at a given AT URI | [README](https://github.com/happyproto/plugins/tree/alpha/plugins/happyview/backlinks) |
| `happyview.record` | `caller:write`, `records:read`, `records:write` | Record writes as the calling user, blob uploads, direct local-index writes, and lexicon validation | [README](https://github.com/happyproto/plugins/tree/alpha/plugins/happyview/record) |
| `happyview.xrpc` | `caller:read`, `caller:call` | XRPC queries and procedures as the calling user | [README](https://github.com/happyproto/plugins/tree/alpha/plugins/happyview/xrpc) |
| `happyview.atproto` | `atproto:read`, `attest:sign` | Service resolution, blob download, label lookup, and attestation signing and verification | [README](https://github.com/happyproto/plugins/tree/alpha/plugins/happyview/atproto) |
| `happyview.spaces` | `spaces:read`, `spaces:write` | atproto spaces: records, membership and invites | [README](https://github.com/happyproto/plugins/tree/alpha/plugins/happyview/spaces) |
| `happyview.linked_repos` | `linked_repos:use` | Record writes, blob uploads and XRPC calls through repos an operator has linked | [README](https://github.com/happyproto/plugins/tree/alpha/plugins/happyview/linked-repos) |
| `happyview.jobs` | `jobs:create`, `jobs:read`, `jobs:read_any` | Enqueue background jobs, and read them back (reading needs `happyview-jobs` 1.1.0 or later) | [README](https://github.com/happyproto/plugins/tree/alpha/plugins/happyview/jobs) |
| `happyview.http` | `network:request:unrestricted` | Outbound HTTP: `get`, `post`, `put`, `patch`, `delete`, `head` | [README](https://github.com/happyproto/plugins/tree/alpha/plugins/happyview/http) |
| `happyview.blobs` | `blobs:read`, `blobs:write` | Store and read byte content, addressed by the CID of its contents | [README](https://github.com/happyproto/plugins/tree/alpha/plugins/happyview/blobs) |
| `happyview.account` | `caller:email` | The calling user's email address, as their PDS reports it | [README](https://github.com/happyproto/plugins/tree/alpha/plugins/happyview/account) |

The capability column is what an operator grants when installing the library, and it bounds what any script can do through it. `happyview.sql` with `database:write` can run any statement, and `happyview.xrpc` with `caller:call` can invoke any procedure as the user. Install only what your scripts use.

## Conventions every library follows

**Envelopes.** Every read of an indexed record answers an envelope rather than the bare body:

```lua
{ uri, did, collection, rkey, cid, indexed_at, record }
```

`record` is the stored body verbatim. `cid` is `nil` for a row written only with `save_local`, and `indexed_at` is `nil` until the network has echoed the record; a write through `happyview.record` is in the index at once, with the PDS's `cid`. A page is `{ records, cursor }`, where `cursor` is an opaque string present only when more records exist.

**Chains.** A constructor such as `db.records(collection)` or `backlinks.to(uri)` returns an object. Its lazy steps (`where`, `sort`, `limit`, `cursor`, `did`, `collection`) each return the same object, so they chain, and its immediate calls (`run`, `count`, `first`) make the library call. A lazy step given `nil` is skipped, so `:limit(input.limit)` reads as no limit when the input has none. An object holds nothing between calls, so a library cannot keep a transaction open, and a script cannot hand a library a function.

**Acting as the caller.** A library acts as `ctx.caller_did`, and a call that needs the caller's PDS session succeeds only when [`ctx.has_pds_auth`](/docs/reference/scripts/contract#ctx) is `true`. `happyview.linked_repos` is the exception: it acts as the linked repo, from any script type, and the [grant's scopes](/docs/guides/linked-repos) bound it instead.

**Errors.** In Lua, a library failure raises an error prefixed with the library and function, `happyview-db.get: …`, carrying the error code the README lists (`BAD_INPUT`, `NO_SESSION`, `PDS_ERROR`, …). Catch one with `pcall` when the failure is expected. JavaScript and TypeScript [reject instead](/docs/reference/scripts/contract#errors).

**Protected tables.** `happyview.sql` runs against the same database as the index, so `raw` and `from` are refused on HappyView's internal `happyview_*` tables other than the public AppView data. The allowlist is in [Developing plugins](/docs/guides/developing-plugins#database-access). To read one collection quickly, use the view described in [Reading one collection](/docs/guides/database/database-setup#reading-one-collection).

**Record views on a raw read route.** An instance's [record storage](/docs/guides/record-providers) may offer a raw read route. Then `raw` reads of `happyview_records` and `happyview_record_refs`, and `from` on either view, run on that route in its own SQL dialect, which `db.backend()` doesn't report. A query that reads those views together with other tables is refused, and a routed read fails with `STORAGE_UNAVAILABLE` while the storage is down. [Raw SQL on the record views](/docs/guides/database/database-setup#when-record-storage-offers-a-raw-read-route) has the details.

## Next steps

- [The script contract](/docs/reference/scripts/contract): `handle(input, ctx)` and what it receives
- [Built-in modules](/docs/reference/scripts/built-in-modules): the `internal.*` modules every interpreter provides itself
- [Developing plugins](/docs/guides/developing-plugins#library-plugins): how a library is built and how `require` renders its surface
