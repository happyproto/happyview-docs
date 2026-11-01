---
title: "Telemetry"
description: "Admin API endpoints for an instance's telemetry consent: read and change it, preview a report, and send one."
---

Endpoints behind the dashboard's **System > Telemetry** page. Telemetry is off unless an operator turns it on; [Telemetry](/docs/guides/telemetry) explains what a report contains. All need `settings:manage`.

On an instance a hosting platform manages, telemetry is set by the platform: `PUT` answers `409`, as does writing or deleting a `telemetry.*` key through the [settings](/docs/reference/admin/settings) endpoints.

## Get telemetry settings

```
GET /admin/settings/telemetry
```

**Response**: `200 OK`

```json
{
  "mode": "off",
  "contact": null,
  "lexicon_names": false,
  "lexicon_structure": false,
  "lexicon_documents": false,
  "instance_id": null,
  "collector_url": "https://telemetry.happyview.dev/v1/snapshot",
  "prompted": true,
  "managed": false
}
```

| Field | Description |
| --- | --- |
| `mode` | `off` sends nothing; `manual` sends a report only when an operator asks; `auto` sends one a day |
| `contact` | An optional way to reach the operator, sent with each report |
| `lexicon_names` | Whether reports include the NSIDs of the instance's collections |
| `lexicon_structure` | Whether reports include the structure of the instance's lexicons |
| `lexicon_documents` | Whether reports include the lexicon documents themselves, up to a size budget |
| `instance_id` | A random id, created the first time reporting is turned on |
| `collector_url` | Where reports go; `TELEMETRY_COLLECTOR_URL` |
| `prompted` | Whether an operator has answered the dashboard's telemetry question |
| `managed` | Whether a hosting platform manages telemetry |

## Change telemetry settings

```
PUT /admin/settings/telemetry
```

Every field is optional; one you leave out is unchanged. Saving also counts as answering the dashboard's question.

```json
{ "mode": "manual", "contact": "ops@example.com", "lexicon_names": true }
```

**Response**: `200 OK`, the same shape as [Get telemetry settings](#get-telemetry-settings).

**Errors:** `400` for an unknown `mode` or a `contact` longer than 512 characters; `409` when a platform manages telemetry.

## Dismiss the telemetry question

```
POST /admin/settings/telemetry/dismiss
```

Marks the dashboard's question as answered without changing anything.

**Response**: `200 OK`, the same shape as [Get telemetry settings](#get-telemetry-settings).

## Preview a report

```
GET /admin/settings/telemetry/preview
```

Returns the report the instance would send now, without sending it.

## Send a report

```
POST /admin/settings/telemetry/send
```

Sends a report now.

**Response**: `200 OK` `{ "sent": true, "benchmarks": … }`, where `benchmarks` is what the collector answered, or `null`.

**Errors:** `400` when `mode` is `off`; `500` when the report couldn't be sent.
