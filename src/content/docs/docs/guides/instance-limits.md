---
title: "Instance limits"
description: "Cap an instance's operators and API clients, refuse anonymous XRPC calls and hold log retention to a ceiling, from a limits file or environment variables."
---

Instance limits cap what an instance can hold: how many operators, how many API clients, whether XRPC answers callers with no API client, and how long logs are kept. They're meant for a hosting platform that sells instances on plans, but any operator can set them. An instance with no limits set has none, so a self-hosted instance behaves as the rest of these docs describe until you set one.

HappyView keeps its limits in memory and checks against that copy. A check never calls out to whatever set the limits, so an instance keeps serving while that is down.

## The limits

| Limit | Value | What it refuses |
| --- | --- | --- |
| `seats` | `max`, a whole number | Adding an operator once the instance has `max`, the superadmin included |
| `api_clients` | `max`, a whole number | Creating or turning on an API client once the instance has `max` active ones |
| `anonymous_xrpc` | `allowed`, `true` or `false` | With `false`, XRPC calls from a caller who isn't identified |
| `log_retention_days` | `max`, a whole number from `1` | Keeping logs for more than `max` days |

A limit you leave out is unlimited, or for `anonymous_xrpc`, allowed. Lowering a limit below what the instance already has removes nothing: the instance keeps what it has and refuses to add more.

### `seats`

`POST /admin/users` is refused while the number of operators is at or above `max`. Every operator counts, the superadmin included. The ways an instance gets its superadmin are never refused: the first sign-in, `SUPERADMIN_DID`, and a hosting platform [setting the superadmin](/docs/reference/admin/platform#set-the-superadmin).

### `api_clients`

`POST /admin/api-clients` is refused while the number of active API clients is at or above `max`, and so is a `PUT /admin/api-clients/{id}` that turns an inactive client back on. Only the clients your operators register count. Child clients (those with a `parent_client_id`) don't count, and neither does the client built in for `hpy`.

### `anonymous_xrpc`

With `allowed: false`, HappyView refuses a call to a lexicon's query or procedure, or a call it would [proxy](/docs/guides/hardening#lock-down-the-xrpc-proxy), when the caller is neither signed in nor another service using service auth, and has no API client that checks out. A client key that is unknown, or sent with the wrong `Origin` or secret, doesn't check out.

A signed-in caller is never refused, whatever client key they send. A [space credential](/docs/guides/spaces/credentials) identifies its caller only on the space routes, which check it themselves; on any other method, a call carrying only a space credential counts as anonymous.

HappyView's built-in XRPC methods, such as `app.bsky.actor.getProfile`, `com.atproto.repo.uploadBlob` and `dev.happyview.*`, aren't affected. Neither are the admin API, OAuth and `/health`.

### `log_retention_days`

The ceiling applies to two [instance settings](/docs/reference/configuration#instance-settings), `event_log_retention_days` and `backfill_retention_days`. Saving either above `max`, or as `0`, which keeps logs forever, is refused. Whatever the settings hold, the retention sweeps delete event logs, job logs, stored script metrics and backfill history older than `max` days.

[Protected events](/docs/guides/event-logs#protected-events) aren't capped. They follow `space_access_log_retention_days` as before.

`max` must be at least `1`. A limits file or variable that sets `0` is refused: at boot, boot stops, and on a changed file, the instance keeps its last limits.

## Set the limits

Use either a limits file or the environment variables. Boot stops if both are set.

### With a limits file

Set `HAPPYVIEW_LIMITS_FILE` to the path of a JSON file. Each key is a limit from the table above:

```json
{
  "seats": {
    "max": 5,
    "message": "Your plan includes 5 seats.",
    "actionUrl": "https://host.example/billing",
    "actionLabel": "Add a seat"
  },
  "api_clients": { "max": 3 },
  "anonymous_xrpc": { "allowed": false },
  "log_retention_days": { "max": 30 }
}
```

Each limit can also carry the wording shown when it's reached:

- `message` replaces HappyView's own sentence, such as "This instance allows 5 admins."
- `actionUrl` and `actionLabel` add a button. Both are needed, or neither is used.

An unknown key anywhere in the file is an error, so a misspelt limit can't be read as unlimited.

HappyView reads the file at boot, and boot stops if it's missing or invalid. After that it checks the file every 2 seconds and applies any change, so you can raise or lower a limit without a restart. When a changed file is invalid, or the file can't be read, the instance keeps the limits it last read and logs a warning.

### With environment variables

Without a limits file, these variables set the limits:

| Variable | Value |
| --- | --- |
| `HAPPYVIEW_LIMIT_SEATS` | A whole number |
| `HAPPYVIEW_LIMIT_API_CLIENTS` | A whole number |
| `HAPPYVIEW_LIMIT_ANONYMOUS_XRPC` | `true` or `false` |
| `HAPPYVIEW_LIMIT_LOG_RETENTION_DAYS` | A whole number, at least `1` |

They're read once, at boot, and a value that can't be read stops boot. They carry no wording, so a refusal uses HappyView's sentence.

## When a limit is reached

The admin API and XRPC answer `403 Forbidden` with this body:

```json
{
  "error": "LimitReached",
  "limit": "seats",
  "max": 5,
  "current": 5,
  "message": "Your plan includes 5 seats.",
  "actionUrl": "https://host.example/billing",
  "actionLabel": "Add a seat"
}
```

| Field | When it's present |
| --- | --- |
| `limit` | Always. One of the four limit names |
| `max` | `seats`, `api_clients` and `log_retention_days` |
| `current` | `seats` and `api_clients` |
| `message` | Always. The limit's `message`, or HappyView's sentence |
| `actionUrl`, `actionLabel` | Both, when the limit has both; otherwise neither |

The dashboard shows the message in a notification, with the action as a button when its URL is `http` or `https`.

## Supply limits from your own code

HappyView gets its limits from a `LimitsProvider`, a trait in the `happyview-provider` crate, the crate the [record provider](/docs/guides/record-providers) traits are in. HappyView asks the provider for a snapshot on every check, including every XRPC request, so the provider must answer from what it already holds. The limits file and the environment variables are the provider HappyView ships with.

A provider must validate every snapshot it takes in with `Limits::validate`. It refuses an invalid snapshot at boot by stopping, and on a later change by keeping its last valid snapshot.
