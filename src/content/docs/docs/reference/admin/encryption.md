---
title: "Encryption"
description: "Admin API endpoints for following a TOKEN_ENCRYPTION_KEY rotation and starting the job that re-seals stored values."
---

Endpoints for a `TOKEN_ENCRYPTION_KEY` rotation. [Rotating the encryption key](/docs/guides/rotating-the-encryption-key) describes the whole procedure.

## Rotation status

```
GET /admin/encryption/rotation
```

Requires `settings:manage`, or the [platform principal](/docs/reference/admin/platform). Counts how many stored values each store holds that only `TOKEN_ENCRYPTION_KEY_PREVIOUS` opens, that are still plaintext, or that neither key opens. Every call reads the stored values again, so `previous_key_can_go` is never `true` while a value still needs the previous key.

```sh
curl -s http://127.0.0.1:3000/admin/encryption/rotation \
  -H "Authorization: Bearer $TOKEN"
```

**Response**: `200 OK`. This one is from part way through a re-seal, with `stores` cut to three of its fourteen entries:

```json
{
  "key_configured": true,
  "previous_key_configured": true,
  "previous_key_can_go": false,
  "remaining": 3,
  "unsealed": 0,
  "unreadable": 0,
  "stores": [
    { "store": "oauth_client_keys", "previous": 1, "unsealed": 0, "unreadable": 0 },
    { "store": "attestation_key", "previous": 1, "unsealed": 0, "unreadable": 0 },
    { "store": "delegation_key", "previous": 1, "unsealed": 0, "unreadable": 0 }
  ],
  "job": { "id": "ffd3922d-db8d-4fd9-a287-be128500c3be", "status": "running", "progress": null }
}
```

| Field | Type | Description |
| --- | --- | --- |
| `key_configured` | boolean | Whether `TOKEN_ENCRYPTION_KEY` is set |
| `previous_key_configured` | boolean | Whether `TOKEN_ENCRYPTION_KEY_PREVIOUS` is set to a key other than `TOKEN_ENCRYPTION_KEY` |
| `previous_key_can_go` | boolean | `true` when the previous key is set and no stored value needs it |
| `remaining` | integer | Values only the previous key opens |
| `unsealed` | integer | Values stored in plaintext from before the instance had a key. HappyView seals them at the next start |
| `unreadable` | integer | Values neither key opens. They can't be re-sealed |
| `stores` | array | `previous`, `unsealed` and `unreadable` for each store. See below |
| `job` | object or `null` | The `happyview.reseal` [job](/docs/reference/admin/jobs) that is `pending`, `running`, `pausing` or `paused`, as `id`, `status` and `progress`. `progress` is `null` until the job has finished its pass. `null` when there's no such job |

The stores are `dpop_keys`, `dpop_sessions`, `oauth_client_keys`, `external_account_tokens`, `service_identity`, `verification_methods`, `space_dids`, `attestation_key`, `delegation_key`, `script_variables`, `oauth_sessions`, `linked_repo_sessions`, `oauth_state` and `plugin_secrets`.

When `TOKEN_ENCRYPTION_KEY` isn't set, the response has no `unsealed` or `unreadable`:

```json
{
  "key_configured": false,
  "previous_key_configured": false,
  "previous_key_can_go": false,
  "remaining": 0,
  "stores": [],
  "job": null
}
```

## Start a re-seal

```
POST /admin/encryption/rotation
```

Requires `settings:manage`. Starts a `happyview.reseal` job, or returns the one that is already pending, running, pausing or paused. HappyView starts this job by itself at startup whenever a value needs re-sealing, so you need this endpoint only to start one again after it stopped.

```sh
curl -s -X POST http://127.0.0.1:3000/admin/encryption/rotation \
  -H "Authorization: Bearer $TOKEN"
```

**Response**: `202 Accepted`

```json
{ "job_id": "ffd3922d-db8d-4fd9-a287-be128500c3be" }
```

Returns `400` when `TOKEN_ENCRYPTION_KEY` isn't set, and `403` for the platform principal.
