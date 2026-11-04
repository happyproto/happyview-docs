---
title: "Jobs"
description: "Admin API endpoints for listing, cancelling, pausing and resuming background jobs, and reading their logs."
---

Admin API endpoints for managing background jobs. For a conceptual overview, see [Background jobs](/docs/getting-started/background-jobs).

## List jobs

```http
GET /admin/jobs
```

Returns a paginated list of jobs, newest first.

**Query parameters:**

| Parameter | Type   | Description                                                                           |
| --------- | ------ | ------------------------------------------------------------------------------------- |
| `status`  | string | Filter by status: `pending`, `running`, `pausing`, `paused`, `cancelling`, `cancelled`, `completed` or `failed` |
| `limit`   | number | Maximum number of results, 1 to 100 (default: 50)                                     |
| `cursor`  | string | Pagination cursor from a previous response                                            |

**Permission:** `jobs:read`

**Response:**

```json
{
  "jobs": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "job_type": "export",
      "status": "completed",
      "input": { "collection": "xyz.statusphere.status" },
      "progress": { "processed": 1500 },
      "result": { "processed": 1500 },
      "error": null,
      "created_by": "did:plc:abc123",
      "inherit_auth": false,
      "api_client_id": null,
      "dpop_key_id": null,
      "attempt": 1,
      "started_at": "2026-07-01T12:00:05+00:00",
      "completed_at": "2026-07-01T12:02:30+00:00",
      "created_at": "2026-07-01T12:00:00+00:00"
    }
  ],
  "cursor": "2026-07-01T12:00:00+00:00"
}
```

`cursor` is the last job's `created_at` when there are more jobs, and `null` otherwise. A `status` that names no status returns an empty list.

## Get job

```http
GET /admin/jobs/{id}
```

Returns a single job by ID.

**Permission:** `jobs:read`

**Response:** Same shape as a single item in the list response.

## Cancel job

```http
POST /admin/jobs/{id}/cancel
```

Request cancellation of a job. If the job is `pending` or `paused`, it's immediately set to `cancelled`. If the job is `running`, it's set to `cancelling`, and the worker stops the job when the script next calls `ctx.job.should_stop()`.

**Permission:** `jobs:manage`

**Response:**

```json
{
  "status": "cancelling"
}
```

**Errors:**

| Status | Condition                                      |
| ------ | ---------------------------------------------- |
| 404    | Job not found                                  |
| 409    | Job is not `pending`, `running` or `paused` (it is `completed`, `failed`, `cancelled`, `cancelling` or `pausing`) |
| 409    | The job's status changed while the request ran; reload and try again |

## Pause job

```http
POST /admin/jobs/{id}/pause
```

Request pause of a running job. Sets the status to `pausing`, and the worker pauses the job when the script next calls `ctx.job.should_stop()`.

**Permission:** `jobs:manage`

**Response:**

```json
{
  "status": "pausing"
}
```

**Errors:**

| Status | Condition          |
| ------ | ------------------ |
| 404    | Job not found      |
| 409    | Job is not running |
| 409    | The job's status changed while the request ran; reload and try again |

## Resume job

```http
POST /admin/jobs/{id}/resume
```

Resume a paused job. Sets the status back to `pending` so the worker picks it up again.

**Permission:** `jobs:manage`

**Response:**

```json
{
  "status": "pending"
}
```

**Errors:**

| Status | Condition         |
| ------ | ----------------- |
| 404    | Job not found     |
| 409    | Job is not paused |
| 409    | The job's status changed while the request ran; reload and try again |

## Get a job's log

```http
GET /admin/jobs/{id}/logs
```

Returns the lines a job's script logged with `internal.logging`, oldest first. Lines are deleted on the event log's retention (`event_log_retention_days`).

**Query parameters:**

| Parameter | Type   | Description                                       |
| --------- | ------ | ------------------------------------------------- |
| `limit`   | number | Maximum number of lines, 1 to 500 (default: 100)  |
| `cursor`  | string | The `cursor` from a previous response             |

**Permission:** `jobs:read`

**Response:**

```json
{
  "logs": [
    {
      "id": "…",
      "jobId": "550e8400-e29b-41d4-a716-446655440000",
      "level": "info",
      "message": "processing item",
      "createdAt": "2026-07-01T12:00:06+00:00"
    }
  ],
  "cursor": null
}
```

`cursor` is set when there are more lines. A job with no lines, or an id that names no job, returns an empty list.

## Job object

| Field          | Type         | Description                                                                     |
| -------------- | ------------ | ------------------------------------------------------------------------------- |
| `id`           | string       | UUID                                                                            |
| `job_type`     | string       | The type name passed to `jobs.create`                                           |
| `status`       | string       | Current status (see [lifecycle](/docs/getting-started/background-jobs#statuses)) |
| `input`        | object       | Input data passed to `jobs.create`                                              |
| `progress`     | object       | Last progress update from `ctx.job.progress()`                                  |
| `result`       | object\|null | Return value of the script on completion                                        |
| `error`        | string\|null | Error message on failure                                                        |
| `created_by`   | string       | DID of the user or operator who enqueued the job                                |
| `inherit_auth` | boolean      | Whether the job inherits the creator's PDS auth                                 |
| `api_client_id` | string\|null | The API client whose session the job inherited, when it did                    |
| `dpop_key_id`  | string\|null | The DPoP key of the session the job inherited, when it did                     |
| `attempt`      | number       | How many runs of the job have started, including one that lost its worker        |
| `started_at`   | string\|null | ISO 8601 timestamp when the worker started executing                            |
| `completed_at` | string\|null | ISO 8601 timestamp when the job finished                                        |
| `created_at`   | string       | ISO 8601 timestamp when the job was enqueued                                    |
