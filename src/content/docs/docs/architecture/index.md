---
title: "Architecture"
description: "How HappyView handles requests, ingest and backfill, and what its database holds, for contributors."
---

This page is for contributors working on HappyView itself. For an overview of the product, see the [Introduction](/docs).

## System overview

```mermaid
graph LR
  accTitle: System overview
  App

  App -->|"GET /xrpc/{method}"| Query
  App -->|"POST /xrpc/{method}"| Procedure

  subgraph HappyView
    Query["Query handler<br/><small>Script (optional)</small>"]
    Procedure["Procedure handler<br/><small>Script (optional)</small>"]
    Ingest["Ingest pipeline<br/><small>Record scripts</small>"]
    Backfill["Backfill worker"]
    Spaces["Spaces<br/><small>Permissioned data</small>"]
  end

  Procedure --> DB
  Query --> DB
  Spaces --> DB
  Ingest --> DB

  Procedure -->|proxy write| PDS["User PDS"]

  DB[("SQLite / PostgreSQL<br/><small>records · lexicons · spaces</small>")]

  Jetstream["Jetstream<br/><small>WebSocket</small>"] -->|record events| Ingest
  Jetstream -->|archive replay| Backfill
  Relay["Relay<br/><small>listReposByCollection</small>"] -->|account discovery| Backfill
  Backfill -->|listRecords| PDS
  Backfill --> Ingest

  Labeler["Labeler<br/><small>WebSocket (out-of-band)</small>"] -->|label events| DB
```

Queries go through the query handler to the database (SQLite by default, or Postgres). Writes go through the procedure handler to the user's PDS, then HappyView indexes the record locally. Real-time record events stream in via [Jetstream](https://github.com/bluesky-social/jetstream), on its v2 `subscribeEvents` stream when the host offers it and v1 otherwise. They are applied in order for each repo, and the stream position is saved only once every earlier event has been applied. Historical records are backfilled in-process, either by replaying the Jetstream archive or by listing accounts through the relay's `listReposByCollection` and fetching records directly from each PDS. Every source hands its events to one ingest pipeline (`src/ingest.rs`), which runs the record script and writes the record. [Labelers](/docs/guides/labelers) are external services that emit content labels over a direct WebSocket connection, outside the relay and repository system. [Spaces](/docs/guides/spaces) are permissioned data containers: membership gates access, each user's repo state is tracked with an LtHash and signed commits, and credentials authenticate callers across services.

## Request flow

### Reads (queries)

```mermaid
sequenceDiagram
    accTitle: Reads (queries)
    participant C as App
    participant X as xrpc_get()
    participant R as LexiconCatalog
    participant L as Script
    participant D as Database

    C->>X: GET /xrpc/{method}?params
    X->>R: Look up<br/>(must be a query)
    R-->>X: Lexicon
    X->>X: Rate limit, validate parameters
    alt Script bound to the query
        X->>L: Run in its interpreter
        L->>D: happyview.db / happyview.sql
        D-->>L: Results
        L-->>X: Response
    else No script, uri param
        X->>D: Get the one record
        D-->>X: Record
    else No script
        X-->>C: 501 MethodNotImplemented
    end
    X-->>C: JSON response
```

### Writes (procedures)

A procedure is authenticated, routed and validated first, and only then reaches the code that writes.

```mermaid
sequenceDiagram
    accTitle: Writes, from the request to the procedure handler
    participant C as App
    participant A as XrpcClaims
    participant X as xrpc_post()
    participant R as LexiconCatalog
    participant H as handle_procedure()

    C->>A: POST /xrpc/{method}<br/>DPoP auth, X-Client-Key
    A->>X: Validated claims
    X->>X: 401 if there are none
    X->>R: Look up<br/>(must be a procedure)
    R-->>X: Lexicon
    X->>X: Rate limit, validate<br/>parameters and input
    X->>H: Claims, input, lexicon
    H->>H: Resolve the<br/>script, if any
```

With a script, a write goes through `happyview.record` to the caller's PDS, and `handle_procedure()` answers the app with the script's return value. Without one, it answers `501` and writes nothing.

```mermaid
sequenceDiagram
    accTitle: Writes, from the procedure handler to the PDS
    participant H as handle_procedure()
    participant L as Script
    participant S as PDS session
    participant P as User PDS
    participant D as Record store

    H->>L: Run in its interpreter
    L->>S: happyview.record<br/>create, put or delete
    S->>P: createRecord, putRecord<br/>or deleteRecord
    P-->>S: PDS response
    S->>D: Write or delete<br/>the local copy
```

The PDS session is DPoP for an app's user and OAuth for the dashboard.

### Admin endpoints

```mermaid
sequenceDiagram
    accTitle: Admin endpoints
    participant C as Caller
    participant A as UserAuth
    participant U as Users table
    participant H as Admin handler
    participant D as Database

    C->>A: Request with a cookie,<br/>API key or DPoP session
    A->>A: Validate the credential
    A->>U: DID lookup
    alt Users table empty, no SUPERADMIN_DID
        U-->>A: Auto-bootstrap with superadmin
    else User found
        U-->>A: Load permissions
    end
    A->>A: Permission check (403 if missing)
    A->>H: Authorized request
    H->>D: Database operation
    D-->>H: Result
    H-->>C: JSON response
```

A DPoP session also needs the [`dev.happyview.adminFull` grant](/docs/getting-started/authentication#let-an-app-manage-your-instance), and an API key skips the bootstrap. A service-auth JWT is refused with `403`.

## Data flow

### Real-time indexing

```mermaid
sequenceDiagram
    accTitle: Real-time indexing
    participant J as Jetstream WebSocket
    participant H as HappyView
    participant D as Database
    participant R as LexiconCatalog

    H->>J: Connect (collection filters from indexed lexicons)
    loop Stream events
        J->>H: Record commit event
        H->>H: Run the record script, if any
        alt create / update
            H->>D: UPSERT into records table
        else delete
            H->>D: DELETE from records table
        end
    end
    J->>H: Lexicon schema event (com.atproto.lexicon.schema)
    H->>D: Update tracked network lexicons
    H->>R: Update the in-memory catalog
    Note over H,D: Applied watermark persisted to instance_settings for resume on reconnect
    Note over H,J: Reconnects on collection filter changes (lexicon add/remove)
```

**Ordering.** Events are split across `JETSTREAM_WORKERS` workers by account DID, so each repo's events apply in the order they arrived while different repos apply in parallel. Each worker runs one event at a time, record script included, so script latency bounds throughput: with slow scripts on Postgres, raise `JETSTREAM_WORKERS`. The saved cursor is the applied watermark: the position below which every event has been applied. After a restart or reconnect HappyView resumes from it, so delivery is at-least-once, and writes are idempotent (a replayed record carries the same `rev` and is ignored).

**Accounts.** An account event with `active=false` is handled by its status:

- `deleted`, `takendown` and `suspended` purge the account's records and leave an account tombstone (`jetstream.account_deleted`, `jetstream.account_takendown`). A relay can still be relaying a PDS that a deleted account has left. So before purging a `deleted` account it holds records for, HappyView asks the account's current PDS (`com.atproto.sync.getRepoStatus`, 5 second timeout). If that PDS says the account is active, nothing is purged or tombstoned and `jetstream.account_status_mismatch` is logged. If the PDS cannot be asked, the purge goes ahead. `takendown` and `suspended` are purged without asking, because a relay may impose them and the account's PDS cannot see that.
- `deactivated`, `desynchronized` and `throttled` keep the records (`jetstream.account_inactive`).
- `active=true` lifts the account's tombstone. Records that were purged come back only through a new [backfill](/docs/guides/backfill).
- A `#sync` removes the repo's records in registered collections, and the current ones that follow replace them. `identity` events change nothing, because HappyView caches no identities.

**Failures.**

- A database outage is retried indefinitely with growing delays, at most every 16 seconds by default, so ingest pauses rather than skipping events. While paused, the consumer cannot notice a collection change or a shutdown until the queue drains.
- Any other failure is retried for about 31 seconds, then logged as `jetstream.apply_failed` and skipped.
- Invalid input (no record body, an unknown operation, data the database rejects) is skipped at once with one `jetstream.record_invalid` warning.

**Recovering a cursor.**

- A cursor older than Jetstream keeps (`CursorTooOld`) is replayed from the Jetstream archive when it has one and `BACKFILL_SOURCE` is `auto` or `replay`: see Gap replay under [Backfill](#backfill). Otherwise it resumes from the stored witnessed time. Jetstream clamps that to its oldest event and announces the gap with `#info OutdatedCursor`, which is logged as `jetstream.gap` with reason `outdated_cursor`. Only when there is no stored time does HappyView resume from the live tip, logged as `cursor_too_old`. A [backfill](/docs/guides/backfill) recovers what was missed.
- If Jetstream renumbers its seqs (`FutureCursor`), HappyView resumes by witnessed time too.
- An unexplained 400 first drops compression, then the seq cursor, then retries hourly and logs `jetstream.invalid_request`. The seq cursor is dropped only when a seq was sent and a witnessed time is saved; otherwise the consumer goes straight to the hourly retry and keeps the cursor.
- Under `auto`, a 404 falls back to v1 until the process restarts.

**Edge cases of revs and tombstones.**

- A [record script](/docs/getting-started/reacting-to-records) can run for a write that a tombstone then refuses.
- An account tombstone's `rev` is a TID of the time Jetstream witnessed the event. A PDS whose clock differs from Jetstream's can therefore let an older replay through, or block a newer write until the tombstone is swept (`RECORD_TOMBSTONE_RETENTION_HOURS`, 72 by default).
- A stale record tombstone left after a newer recreate blocks writes without a rev (crawl writes) to that record until the sweep.
- A crawl row fetched before a live update but written after it can overwrite the newer body while keeping the stored `rev`. A later replay at that `rev` heals it.
- A delete with a `rev` removes a crawled row that has none.
- A delete for a record HappyView does not hold leaves a tombstone only when the account holds records in that collection, or a running or pausing backfill covers it. Those are the cases where a create could still arrive. The network sends many deletes for records an instance never held, and tombstoning each would fill the table.

Operators can watch the consumer with `GET /admin/jetstream/status` and the About page's Jetstream card. See [Jetstream status](/docs/reference/admin/stats#jetstream-status).

### Backfill

```mermaid
sequenceDiagram
    accTitle: Backfill
    participant A as Operator
    participant H as HappyView
    participant D as Database
    participant Relay as Relay
    participant PLC as PLC Directory
    participant PDS as User PDS

    A->>H: POST /admin/backfill
    H->>D: Create backfill_jobs record (status = running)

    rect rgb(240, 255, 240)
    note over H,PDS: Discovery, resolution and fetching run concurrently
    par Discovery (network backfills)
        loop Each collection, while the queue has room
            H->>Relay: listReposByCollection (one page)
            Relay-->>H: DIDs
            H->>D: Queue (did, collection) units, save the relay cursor
        end
    and Resolver task
        loop Unresolved units
            H->>PLC: Resolve DID document
            PLC-->>H: PDS endpoint
            H->>D: Record the unit's PDS
        end
    and Fetcher task
        loop Resolved units (as they arrive)
            H->>PDS: listRecords for the unit's collection (paginated)
            PDS-->>H: Records
            H->>D: UPSERT each page
            H->>D: Delete the completed unit, bump counters
        end
    end
    end
    Note over H,D: At most BACKFILL_DISCOVERY_WINDOW units are queued per job

    H->>D: Mark job completed (or failed)
```

**Two sources.** A backfill job reads its records from one of two places, chosen by `BACKFILL_SOURCE` (default `crawl`) or the job's `source`. A crawl runs the pipeline above, and every account backfill crawls. A replay asks the Jetstream archive for a plan (`planSnapshot`), downloads the segments and blocks that hold the job's collections, and writes the records through the same path as live events. A second sweep then applies the account and sync events for the accounts that hold records. Markers are applied as of their own time, so the two sweeps give the same result in either order and never remove records written after them. `auto` replays when the Jetstream has an archive and crawls when it doesn't. A replay returns only what the archive holds; some accounts' history in Bluesky's archive starts after their first record, which a crawl would find.

**Gap replay.** When the live consumer's cursor is older than Jetstream keeps, HappyView creates a replay job for the gap between its last applied seq and the archive's sealed tip. It resumes the live stream at that tip. The consumer waits at most 30 seconds for the archive's plan; past that it resumes without a replay. Live events and the replay overlap safely, because the rev guard and tombstones make every write idempotent. Instances on `BACKFILL_SOURCE=crawl` (the default), or on a Jetstream without an archive, skip the gap.

## Database schema

Tables are named `happyview_<name>`, and the headings below drop the prefix. These are the tables a contributor meets first, not all of them. The Type column says what a value holds, not its SQL type. Both backends store ids, timestamps and JSON as TEXT, because sqlx's `Any` driver has no native timestamp or JSON type, and most flags as INTEGER 0 or 1. `migrations/` holds each backend's definitions.

### `records`

`happyview_records` is a view, and it is what reads and raw SQL see. The rows live in `happyview_records_v2`, with DIDs and collection NSIDs interned in `happyview_dids` and `happyview_collections`. A record's body is its JSON text exactly as received: `record` on Postgres, and `body` on SQLite, which a background task compresses with a per-collection zstd dictionary.

| Column       | Type        | Description                         |
| ------------ | ----------- | ----------------------------------- |
| `uri`        | text        | AT URI (`at://did/collection/rkey`), derived |
| `did`        | text        | Author DID                          |
| `collection` | text        | Lexicon NSID                        |
| `rkey`       | text        | Record key                          |
| `record`     | text (JSON) | Record value                        |
| `cid`        | text        | Content identifier                  |
| `indexed_at` | timestamp   | When HappyView indexed this version of the record. Redelivering an identical record (same CID and body) keeps the original value. A local write that Jetstream will echo back (an XRPC procedure, a `happyview.record` mirror, a linked-repo write) stores `NULL`, on insert and on update, until the echo stamps it. A plugin's direct local-index write gets no echo, so an update through it keeps the existing value |
| `created_at` | timestamp   | When the row was first written      |
| `rev`        | text        | TID of the repo commit that wrote this version, from Jetstream. `NULL` for local writes, `listRecords` backfill rows and rows written before revs were stored. A delivery with an older rev than the stored one is ignored |

### `record_tombstones` and `did_tombstones`

Recently deleted records (`uri`, `rev`, `deleted_at`) and deleted accounts (`did`, `rev`, `seq`, `deleted_at`). A create or update at or before a tombstone's rev, or one without a rev, is not written, so a late or replayed copy cannot bring a deleted record back. Tombstones are kept for `RECORD_TOMBSTONE_RETENTION_HOURS` (72 by default).

### `lexicons`

| Column              | Type        | Description                                     |
| ------------------- | ----------- | ----------------------------------------------- |
| `id`                | text (PK)   | Lexicon NSID                                    |
| `revision`          | integer     | Incremented on upsert                           |
| `lexicon_json`      | text (JSON) | Raw lexicon definition                          |
| `backfill`          | boolean     | Whether to backfill on upload                   |
| `source`            | text        | `manual` or `network`                           |
| `authority_did`     | text        | For a network lexicon: its authority's DID      |
| `last_fetched_at`   | timestamp | For a network lexicon: when it was last fetched |
| `token_cost`        | integer     | Rate-limit cost, overriding the type's default  |
| `indexed`           | boolean     | Whether HappyView ingests this collection       |
| `created_at`        | timestamp |                                                 |
| `updated_at`        | timestamp |                                                 |

### `users`

| Column         | Type          | Description                                      |
| -------------- | ------------- | ------------------------------------------------ |
| `id`           | uuid (PK)     |                                                  |
| `did`          | text (unique) | User's atproto DID                           |
| `is_super`     | boolean       | Whether this operator holds superadmin|
| `created_at`   | timestamp   |                                                  |
| `last_used_at` | timestamp   | Updated on each authenticated request            |

### `user_permissions`

| Column       | Type        | Description                                  |
| ------------ | ----------- | -------------------------------------------- |
| `user_id`    | uuid (FK)   | References `users.id`                        |
| `permission` | text        | Permission string (e.g. `lexicons:create`)   |
| `granted_at` | timestamp |                                              |
| `granted_by` | uuid (FK)   | References `users.id`                        |
| (PK)         |             | Composite primary key: (`user_id`, `permission`) |

### `api_keys`

| Column       | Type        | Description                                  |
| ------------ | ----------- | -------------------------------------------- |
| `id`         | uuid (PK)   |                                              |
| `user_id`    | uuid (FK)   | References `users.id`                        |
| `name`       | text        | Descriptive label                            |
| `key_hash`   | text        | SHA-256 hash of the full key                 |
| `key_prefix` | text        | First 11 characters for display              |
| `permissions`| text (JSON) | Permissions granted to this key              |
| `created_at` | timestamp |                                              |
| `last_used_at`| timestamp|                                              |
| `revoked_at` | timestamp | Set when revoked (soft delete)               |

### `oauth_sessions`

| Column         | Type        | Description                                  |
| -------------- | ----------- | -------------------------------------------- |
| `did`          | text (PK)   | User's atproto DID                       |
| `session_data` | text        | Serialized OAuth session (managed by atrium), encrypted when `encrypted` is 1 |
| `encrypted`    | integer     | 1 when `session_data` is encrypted with `TOKEN_ENCRYPTION_KEY` |
| `signing_kid`  | text        | The client key that established the session  |
| `created_at`   | timestamp |                                              |
| `updated_at`   | timestamp |                                              |

### `oauth_state`

| Column       | Type        | Description                                  |
| ------------ | ----------- | -------------------------------------------- |
| `state_key`  | text (PK)   | OAuth state parameter                        |
| `state_data` | text        | Serialized state (managed by atrium), encrypted when `encrypted` is 1 |
| `encrypted`  | integer     | 1 when `state_data` is encrypted with `TOKEN_ENCRYPTION_KEY` |
| `created_at` | timestamp |                                              |

### `instance_settings`

| Column       | Type        | Description                                  |
| ------------ | ----------- | -------------------------------------------- |
| `key`        | text (PK)   | Setting name (e.g. `app_name`)               |
| `value`      | text        | Setting value                                |
| `updated_at` | timestamp | Last modified                                |

### `event_logs`

| Column       | Type        | Description                                  |
| ------------ | ----------- | -------------------------------------------- |
| `id`         | uuid (PK)   |                                              |
| `event_type` | text        | Category.action format (e.g. `user.created`) |
| `severity`   | text        | `info`, `warn`, or `error`                   |
| `actor_did`  | text        | DID of the user who triggered the event      |
| `subject`    | text        | What was affected (DID, NSID, URI, etc.)     |
| `detail`     | text (JSON)       | Event-specific data                          |
| `created_at` | timestamp |                                              |

### `script_variables`

| Column       | Type        | Description                                  |
| ------------ | ----------- | -------------------------------------------- |
| `key`        | text (PK)   | Variable name                                |
| `value`      | text        | Variable value, encrypted when `encrypted` is 1 |
| `encrypted`  | integer     | 1 when `value` is encrypted with `TOKEN_ENCRYPTION_KEY` |
| `created_at` | timestamp |                                              |
| `updated_at` | timestamp |                                              |

### `attestation_key`

| Column        | Type      | Description                                            |
| ------------- | --------- | ------------------------------------------------------ |
| `id`          | integer (PK) | Always 1: one key per instance                      |
| `private_key` | text      | The attestation signing key, encrypted when `encrypted` is 1 |
| `encrypted`   | integer   | 1 when `private_key` is encrypted with `TOKEN_ENCRYPTION_KEY` |
| `created_at`  | timestamp |                                                        |

### `spaces`

| Column            | Type        | Description                                      |
| ----------------- | ----------- | ------------------------------------------------ |
| `id`              | text (PK)   | Internal space identifier                        |
| `did`             | text        | DID in the space URI; the authority's DID        |
| `authority_did`   | text        | The space authority: the instance DID, or the creator's DID when the instance has no service identity |
| `creator_did`     | text        | DID of the user who created and administers the space |
| `type_nsid`       | text        | Space type as an NSID                            |
| `skey`            | text        | Space key (differentiates spaces of the same type) |
| `display_name`    | text        | Human-readable name (optional)                   |
| `description`     | text        | Description (optional)                           |
| `read_policy`     | text (JSON) | Policy gating credential issuance (`$type`-tagged) |
| `write_policy`    | text (JSON) | Policy gating which writers the space tracks (`$type`-tagged) |
| `app_access`      | text (JSON) | `{"$type":"com.atproto.simplespace.defs#open"}` or `{"$type":"com.atproto.simplespace.defs#allowList","allowed":[...]}` |
| `config`          | text (JSON) | Space config (`membership_public`, `records_public`, extras) |
| `revision`        | text        | Current revision TID                             |
| `created_at`      | text        |                                                  |
| `updated_at`      | text        |                                                  |

### `space_members`

| Column         | Type        | Description                                      |
| -------------- | ----------- | ------------------------------------------------ |
| `id`           | text (PK)   |                                                  |
| `space_id`     | text (FK)   | References `spaces.id`                           |
| `member_did`   | text        | Member's DID (or space URI for delegation)       |
| `can_read`     | boolean     | Whether the member can read the space            |
| `can_write`    | boolean     | Whether the member can write to the space        |
| `read_self`    | boolean     | Whether reads are limited to the member's own records |
| `is_delegation`| boolean     | Whether this member is a delegated space         |
| `granted_by`   | text        | DID of who granted membership                    |
| `created_at`   | text        |                                                  |

### `space_records`

| Column         | Type        | Description                                      |
| -------------- | ----------- | ------------------------------------------------ |
| `uri`          | text (PK)   | `at://` URI of the record                        |
| `space_id`     | text (FK)   | References `spaces.id`                           |
| `author_did`   | text        | DID of the record author                         |
| `collection`   | text        | Lexicon NSID                                     |
| `rkey`         | text        | Record key                                       |
| `record`       | text (JSON)       | Record value                                     |
| `cid`          | text        | Content identifier                               |
| `indexed_at`   | text        |                                                  |

### `space_repo_state`

| Column         | Type        | Description                                      |
| -------------- | ----------- | ------------------------------------------------ |
| `id`           | text (PK)   |                                                  |
| `space_id`     | text (FK)   | References `spaces.id`                           |
| `author_did`   | text        | DID of the repo author                           |
| `lthash_state` | bytes       | 2048-byte LtHash state                           |
| `rev`          | text        | Current revision                                 |
| `hash`         | bytes       | Content hash                                     |
| `ikm`          | bytes       | Input keying material for deniable signatures    |
| `sig`          | bytes       | Signature                                        |
| `mac`          | bytes       | Message authentication code                      |
| `host_mode`    | text        | Where the repo lives: `polyfill`, `migrating` or `native` |
| `sync_cursor`  | text        | Last rev consumed from the PDS in `native` mode  |
| `updated_at`   | text        |                                                  |

### `space_record_oplog`

| Column         | Type        | Description                                      |
| -------------- | ----------- | ------------------------------------------------ |
| `id`           | text (PK)   |                                                  |
| `space_id`     | text (FK)   | References `spaces.id`                           |
| `author_did`   | text        | DID of the operation author                      |
| `rev`          | text        | Revision this operation belongs to               |
| `idx`          | integer     | Index within the revision                        |
| `action`       | text        | `create`, `update`, or `delete`                  |
| `collection`   | text        | Lexicon NSID                                     |
| `rkey`         | text        | Record key                                       |
| `cid`          | text        | Content identifier (for create/update)           |
| `prev`         | text        | Previous CID (for update/delete)                 |
| `created_at`   | text        |                                                  |

### `space_notify_registrations`

| Column         | Type        | Description                                      |
| -------------- | ----------- | ------------------------------------------------ |
| `id`           | text (PK)   |                                                  |
| `space_id`     | text (FK)   | References `spaces.id`                           |
| `service`      | text        | Subscribing service; one registration per space  |
| `endpoint`     | text        | Resolved service endpoint, or webhook URL        |
| `delivery`     | text        | `xrpc` (`notifyWrite` calls) or `webhook` (legacy payload) |
| `registered_by`| text        | DID of who registered                            |
| `expires_at`   | text        | When the registration expires                    |
| `created_at`   | text        |                                                  |

### `space_writers`

| Column       | Type      | Description                                      |
| ------------ | --------- | ------------------------------------------------ |
| `space_id`   | text (FK) | References `spaces.id`                           |
| `repo_did`   | text      | DID of a repo the space tracks                   |
| `rev`        | text      | The repo's latest revision                       |
| `hash`       | bytes      | The repo's latest LtHash digest                  |
| `space_rev`  | text      | Space revision assigned to this update           |
| `updated_at` | text      |                                                  |

### `space_delegation_uses`

| Column       | Type      | Description                                      |
| ------------ | --------- | ------------------------------------------------ |
| `issuer`     | text      | Issuer of an exchanged delegation token          |
| `jti`        | text      | The token's `jti`; a token is exchanged once     |
| `expires_at` | text      | When the token expires                           |

### `space_invites`

| Column       | Type      | Description                                      |
| ------------ | --------- | ------------------------------------------------ |
| `id`         | text (PK) |                                                  |
| `space_id`   | text (FK) | References `spaces.id`                           |
| `token_hash` | text      | SHA-256 hash of the invite token                 |
| `created_by` | text      | DID of the user who created the invite           |
| `can_read`   | boolean   | Whether the invite grants read access            |
| `can_write`  | boolean   | Whether the invite grants write access           |
| `read_self`  | boolean   | Whether reads are limited to the member's own records |
| `max_uses`   | integer?  | Maximum number of uses (null = unlimited)        |
| `uses`       | integer   | Current use count                                |
| `expires_at` | text?     | Expiry timestamp (null = never)                  |
| `revoked`    | boolean   | Whether the invite has been revoked              |
| `created_at` | text      |                                                  |

### `space_credentials`

| Column       | Type      | Description                                      |
| ------------ | --------- | ------------------------------------------------ |
| `id`         | text (PK) |                                                  |
| `space_id`   | text (FK) | References `spaces.id`                           |
| `issued_to`  | text      | DID the credential was issued to                 |
| `token_hash` | text      | Hash of the credential token                     |
| `jti`        | text      | The credential's `jti` claim                     |
| `expires_at` | text      | When the credential expires                      |
| `revoked_at` | text?     | When the credential was revoked                  |
| `created_at` | text      |                                                  |

### `space_dids`

| Column             | Type      | Description                                      |
| ------------------ | --------- | ------------------------------------------------ |
| `id`               | text (PK) |                                                  |
| `did`              | text      | The space's DID                                  |
| `space_id`         | text (FK) | References `spaces.id`                           |
| `signing_key_enc`  | text      | Encrypted signing key (AES-256-GCM)              |
| `rotation_key_enc` | text      | Encrypted rotation key (AES-256-GCM)             |
| `created_by`       | text      | DID of who provisioned the key                   |
| `created_at`       | text      |                                                  |

### `service_identity`

| Column                | Type        | Description                                      |
| --------------------- | ----------- | ------------------------------------------------ |
| `id`                  | integer (PK)| Always 1 (singleton)                             |
| `mode`                | text        | `did_web`, `did_plc`, `attach_account` or `not_exposed` |
| `did`                 | text        | The service's DID                                |
| `signing_key_enc`     | text        | Encrypted signing key                            |
| `rotation_key_enc`    | text?       | Encrypted rotation key (did:plc only)            |
| `attached_account_did`| text?       | The attached account's DID (`attach_account` mode) |
| `setup_complete`      | boolean     | Whether setup has been finalized                 |
| `created_at`          | text        |                                                  |
| `updated_at`          | text        |                                                  |

### `service_entries`

| Column        | Type        | Description                                      |
| ------------- | ----------- | ------------------------------------------------ |
| `id`          | integer (PK)|                                                  |
| `fragment_id` | text        | DID document fragment identifier                 |
| `service_type`| text        | Service type (e.g. `AtprotoAppView`)             |
| `access_mode` | text        | `all`, or `specific` for the XRPCs in `service_entry_xrpcs` |
| `created_at`  | text        |                                                  |
| `updated_at`  | text        |                                                  |

### `service_entry_xrpcs`

| Column             | Type        | Description                                      |
| ------------------ | ----------- | ------------------------------------------------ |
| `service_entry_id` | integer (FK)| References `service_entries.id`                  |
| `lexicon_id`       | text        | Lexicon NSID this entry handles                  |

### `verification_methods`

| Column                  | Type      | Description                                      |
| ----------------------- | --------- | ------------------------------------------------ |
| `id`                    | text (PK) |                                                  |
| `fragment_id`           | text      | DID document fragment (e.g. `#atproto_space`)    |
| `key_type`              | text      | Always `Multikey`                                |
| `public_key_multibase`  | text      | Public key in multibase encoding                 |
| `private_key_enc`       | text      | Encrypted private key (AES-256-GCM)              |
| `created_at`            | text      |                                                  |

### `backfill_jobs`

| Column            | Type        | Description                                              |
| ----------------- | ----------- | -------------------------------------------------------- |
| `id`              | uuid (PK)   |                                                          |
| `collection`      | text        | Target collection (null = all)                           |
| `did`             | text        | The account, when the job targets exactly one; null otherwise |
| `status`          | text        | pending, running, pausing, paused, cancelling, cancelled, completed, failed |
| `stage`           | text        | `pending`; `resolving_pds` (an account backfill that has not started); `resolving_and_fetching` (a crawl at work); `replaying`, `replaying_accounts` and `retrying_blocks` (a replay); `completed`. A failed or cancelled job keeps the stage it reached. Jobs from older versions can also show `discovering_repos` or `fetching_records` |
| `total_repos`     | integer     | Work units discovered (a unit is one account under one collection; one per account for account-targeted jobs) |
| `resolved_repos`  | integer     | Units with PDS endpoint resolved                         |
| `processed_repos` | integer     | Units with records fetched                               |
| `total_records`   | integer     | Total records indexed                                    |
| `error`           | text        | Error message if failed                                  |
| `scope`           | text        | `network` (accounts from the relay) or `dids` (accounts given at creation) |
| `source`          | text        | `crawl` or `replay`                                      |
| `note`            | text        | What the backfill executor said about the job            |
| `hook_stats`      | text (JSON) | What the job's records cost in record scripts            |
| `started_at`      | timestamp |                                                          |
| `completed_at`    | timestamp |                                                          |
| `created_at`      | timestamp |                                                          |

## Testing

```sh
# Unit tests, with no database or fixtures (the tests that need them skip)
HAPPYVIEW_ALLOW_SKIPS=1 cargo test --lib

# Unit tests that run a script natively
cargo test --features lua-reference --lib

# All tests: build the fixtures and fetch the Lua interpreter first
bash scripts/build-plugin-fixtures.sh
bash scripts/fetch-lua-plugin.sh && export HAPPYVIEW_LUA_PLUGIN=tests/fixtures/lua-plugin

# Then run them against Postgres
docker compose -f docker-compose.test.yml up -d
TEST_DATABASE_URL=postgres://happyview:happyview@localhost:5433/happyview_test cargo test --tests
docker compose -f docker-compose.test.yml down

# Or against SQLite, one test at a time
dir=$(mktemp -d)
TEST_DATABASE_URL="sqlite://$dir/e2e.db?mode=rwc" cargo test --tests -- --test-threads=1
```

End-to-end tests use `wiremock` to mock external services (PLC directory, PDSes) and a real database for full integration coverage. A test that needs `TEST_DATABASE_URL` or a built plugin fixture fails without it, so a green run means it ran. Set `HAPPYVIEW_ALLOW_SKIPS=1` to skip those tests instead.
