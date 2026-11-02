---
title: "Lexicons"
description: "How HappyView treats each kind of lexicon, where lexicons come from, and how it resolves and routes the ones it doesn't have."
---

## Supported lexicon types

| Type          | Effect                                                                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `record`      | Adds the collection to the Jetstream subscription filter and indexes records into the database. Supports [record scripts](/docs/getting-started/reacting-to-records) |
| `query`       | Registers a `GET /xrpc/{nsid}` endpoint, served by its script                                                                            |
| `procedure`   | Registers a `POST /xrpc/{nsid}` endpoint, served by its script                                                                           |
| `definitions` | Stored but does not generate routes or subscriptions                                                                                     |
| `space`       | Defines a permissioned space type. Generates no routes                                                                                   |
| `permission-set` | Generates no routes. HappyView reads it to expand `include:` OAuth scopes                                                             |
| `subscription` | Accepted and stored, with a warning. HappyView doesn't serve it                                                                         |

A typical setup has three lexicons working together: a **record** lexicon that defines the data and triggers indexing, a **query** lexicon that exposes a read endpoint, and a **procedure** lexicon that exposes a write endpoint.

## Queries and procedures need a script

Query and procedure lexicons don't store data themselves, and they don't name a collection. The script attached to the method does the work, and it names the collection it reads or writes as a literal NSID:

```lua
local db = require("happyview.db")

function handle(input, ctx)
  return db.records("xyz.statusphere.status"):limit(20):run()
end
```

`ctx.collection` is set only for record events, so a query or procedure script can't read its collection from `ctx`.

A query with no script answers only `?uri=<at-uri>`, with that one indexed record as `{"record": {...}}`. Any other call to it, and every call to a procedure with no script, answers `501` with a `MethodNotImplemented` body naming the trigger to add a script for, such as `xrpc.query:xyz.statusphere.listStatuses`. See [Method has no script](/docs/reference/xrpc#method-has-no-script).

## Backfill flag

A project lexicon backfills only when `backfill = true` is set under its `[lexicons."<NSID>"]` table, and then only once per collection: at boot, after a deploy, or after a rebuild under `hpy happyview dev` when `[dev] backfill` is on. A network lexicon declared in `happyview.toml` never backfills on its own.

When an uploaded record lexicon is added for the first time with `backfill` on (the default), HappyView automatically creates a [backfill job](/docs/guides/backfill) to discover existing records. It does so only for an operator holding `backfill:create`, and not for a lexicon uploaded with `indexed` set to `false`. The job appears on the Backfill page like any other, with the same progress, pause, cancel, and retry controls, and the upload response returns its id as `backfill_job_id`.

Only the *first* upload starts one. Editing a lexicon afterwards re-saves it without re-crawling the network. To backfill again, start one from the Backfill page. If you only want to index new records going forward, set `backfill` to `false`.

## Jetstream collection filters

When record lexicons change (uploaded or deleted), HappyView reconnects to Jetstream with an updated collection filter. HappyView always includes `com.atproto.lexicon.schema` in the filter to track network lexicon updates.

Deleting a lexicon stops live indexing for that collection but does **not** remove previously indexed records from the database. To start fresh, delete the records separately (e.g. via the admin API or directly in the database) before re-adding the lexicon and running a [backfill](/docs/guides/backfill).

## Network lexicons

If a lexicon has already been published, you don't need to upload the JSON manually. Point HappyView at the NSID and it fetches the lexicon directly from the network. HappyView keeps network lexicons up to date through its Jetstream subscription, as [Live updates via Jetstream](#live-updates-via-jetstream) describes.

### NSID authority resolution

Lexicons are stored as records themselves with the `com.atproto.lexicon.schema` NSID and the rkey set to the lexicon's NSID. To find which repo holds a lexicon, HappyView resolves the NSID's authority:

1. Extract the authority from the NSID (all segments except the last). For example, `xyz.statusphere.status` has authority `xyz.statusphere`.
2. Reverse the authority segments to form a domain: `statusphere.xyz`.
3. Look up the DNS TXT record at `_lexicon.{domain}` (e.g. `_lexicon.statusphere.xyz`).
4. Parse the TXT record for a `did=<DID>` value.
5. Resolve the DID to a PDS endpoint through the PLC directory, or for a `did:web`, through its domain.

:::note
The spec states that resolution must be **non-hierarchical**. If you have multiple levels of authority (e.g. `xyz.statusphere.status` and `xyz.statusphere.actor.profile`), each level must have an explicit TXT record.
:::

### Fetching

Once the authority DID and PDS endpoint are known, HappyView calls `com.atproto.repo.getRecord` with:

- `repo` = the authority DID
- `collection` = `com.atproto.lexicon.schema`
- `rkey` = the NSID

The `value` field of the response is the raw lexicon JSON.

### Live updates via Jetstream

HappyView's Jetstream subscription always includes the `com.atproto.lexicon.schema` collection, so it receives real-time events whenever a lexicon schema record is created, updated, or deleted on the network. When an event arrives, HappyView checks whether the record's DID and rkey (the NSID) match any tracked network lexicon:

- **create/update**: HappyView parses and stores the new lexicon. If it's a record lexicon, Jetstream collection filters are updated to include the new collection.
- **delete**: The lexicon is removed, and collection filters are updated accordingly.

### Startup re-fetch

On every startup, HappyView re-fetches all network lexicons from their respective PDSes. The re-fetch picks up any change made while the instance was offline. Failures are logged as warnings but don't block startup.

## XRPC routing for unknown methods

When a caller requests `/xrpc/{method}` and the instance has a lexicon for that NSID, the request is handled by the lexicon's script (or answers `501` if no script is attached; see [Queries and procedures need a script](#queries-and-procedures-need-a-script)). Otherwise the request falls to the XRPC proxy, which **System > XRPC Proxy** in the dashboard configures with two settings ([XRPC proxy](/docs/reference/admin/xrpc-proxy)):

- **Mode** decides whether a method may be proxied at all: `open` (the default), `allowlist`, `blocklist` or `disabled`. A method the mode refuses gets `403` with `NSID not allowed by proxy policy`.
- **Routing** decides where it goes: `authority` (the default) or `serviceproxy`, which forwards to the caller's own PDS as the caller.

With `authority` routing, HappyView resolves the method's **home authority** to a PDS endpoint through [NSID authority resolution](#nsid-authority-resolution), then proxies the request to `{pds_endpoint}/xrpc/{method}`. For `com.example.foo.getBar`, the authority is `com.example.foo` and the TXT record is at `_lexicon.foo.example.com`.

- HappyView does **not** proxy to the reversed hostname directly. `foo.example.com` is only the DNS host for the TXT record. The XRPC request goes to whatever PDS endpoint the authority DID resolves to.
- `authority` routing forwards the request anonymously, with no credentials of the caller's, for queries and procedures alike. To act as the caller, for example to call `com.atproto.repo.createRecord` on their PDS, switch routing to `serviceproxy`.
- If authority resolution fails because there is no TXT record, the DID doesn't resolve or the target PDS doesn't support the method, the caller gets an error back. HappyView does not fall back to the other routing.
- A query or procedure lexicon you track as a network lexicon is served locally, like one you uploaded.
