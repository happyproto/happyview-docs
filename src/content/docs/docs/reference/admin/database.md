---
title: "Database"
description: "Admin API endpoints for the database's status, scheduling a SQLite VACUUM, and retraining record compression."
---

Endpoints for looking after the instance's database. The dashboard's **System > Database** page uses them. All need `settings:manage`.

## Database status

```
GET /admin/database/status
```

**Response**: `200 OK`

```json
{
  "backend": "sqlite",
  "disk": { "…": "…" },
  "feasibility": "ok",
  "vacuum": { "…": "…" },
  "journal_size_limit": 67108864,
  "checkpoint": { "at": "2026-10-30T12:00:00Z", "busy": false, "wal_frames": 1204, "checkpointed_frames": 1204 },
  "checkpoint_interval_secs": 60,
  "wal_checkpoint_bytes": 67108864
}
```

| Field | Description |
| --- | --- |
| `backend` | `sqlite` or `postgres` |
| `disk` | The database's size, its write-ahead log's size, and the free space where the database and the temporary directory live. `null` when it couldn't be measured |
| `feasibility` | Whether there's room to run a `VACUUM`, which needs space for a full copy of the database. `null` when `disk` is |
| `vacuum` | When a vacuum was requested, when the last one started and finished, and how it ended |
| `journal_size_limit`, `checkpoint_interval_secs`, `wal_checkpoint_bytes` | The write-ahead log settings in effect; see [Configuration](/docs/reference/configuration#database) |
| `checkpoint` | The last write-ahead log checkpoint since the process started, or `null` before the first and always on Postgres |

The status also reports the periodic SQLite WAL checkpoint: `checkpoint_interval_secs` is the `SQLITE_CHECKPOINT_INTERVAL_SECS` in effect (`0` when disabled), `wal_checkpoint_bytes` is the `SQLITE_WAL_CHECKPOINT_BYTES` in effect (`0` when disabled, and always on Postgres), and `checkpoint` is the latest run since the process started, or `null` before the first one and always on Postgres. A run has `at` (RFC 3339), `busy` (`true` when a reader or writer kept it from finishing), `wal_frames` (frames in the WAL when it ran) and `checkpointed_frames` (frames copied back into the database file).

## Schedule a vacuum

```
POST /admin/database/vacuum/schedule
```

Asks for a SQLite `VACUUM` at the next start, which returns the space deleted records left behind to the filesystem. It runs before the server starts listening, so the instance is offline for as long as it takes: minutes to hours on a large database. Raise or turn off a container healthcheck for that restart, or it may kill the instance part way.

**Response**: `200 OK` `{ "scheduled": true }`. On Postgres, `400`: a vacuum applies to SQLite only.

## Cancel a scheduled vacuum

```
DELETE /admin/database/vacuum/schedule
```

**Response**: `200 OK` `{ "scheduled": false }`

## Retrain a collection's compression dictionary

```
POST /admin/storage/retrain
```

Trains a new zstd dictionary for one collection from up to 20,000 of its most recently stored records, as the background task does when a collection first reaches `ZSTD_DICT_TRAIN_AT` records (see [the compact record format](/docs/guides/database/database-setup#after-the-upgrade)). Records written from then on are compressed with it. Records already compressed keep the dictionary they were compressed with, and records the background task has not reached yet get the new one. One retrain runs at a time. SQLite only.

```json
{ "collection": "xyz.statusphere.status" }
```

**Response**: `200 OK`

```json
{ "collection": "xyz.statusphere.status", "dict_id": 7 }
```

**Errors:**

| Status | Condition |
| --- | --- |
| 400 | The instance is on Postgres, or `RECORD_COMPRESSION` is `none` |
| 404 | The collection has no records |
| 409 | Another retrain is running; try again when it finishes |
| 422 | `TrainingFailed`: a dictionary couldn't be trained from these records |
