---
title: "Overview"
description: "How the admin API authenticates callers, the errors it returns, and the permission each endpoint requires."
---

The admin API lets you manage lexicons, monitor records, run backfill jobs, and control operator access. All endpoints live under `/admin` and require authentication from a DID that exists in the `happyview_users` table, with the appropriate [permissions](/docs/guides/permissions) for the endpoint being called. You can also manage all of this through the [web dashboard](/docs/guides/dashboard).

## Auth

The admin API supports three authentication methods:

1. **API keys**: read/write tokens starting with `hv_`, passed as `Authorization: Bearer hv_...`. See the [API keys guide](/docs/guides/api-keys) for details.
2. **Cookie-based session auth**: signed session cookies set during the dashboard OAuth login flow. The [web dashboard](/docs/guides/dashboard) uses this method.
3. **App sessions granted `dev.happyview.adminFull`**: an API client's [DPoP session](/docs/reference/oauth), when the user approved the permission set `dev.happyview.adminFull` at sign-in. The app asks for it with the scope `include:dev.happyview.adminFull`. The session then acts with the user's own permissions.

HappyView decides whether a session was granted the set by what the user's authorization server says, never by the scope the app registered. On the session's first admin request it refreshes the session itself, after checking that the user's PDS names the session's authorization server, and reads the granted scope from the token response. It reads it again once that access token expires, so revoking the grant at the PDS ends admin access within one token lifetime. Any other API client session is refused with `403 Forbidden`, because those sessions belong to apps built on the instance, and an operator signing in to one must not hand it the instance.

hpy, the HappyView CLI, signs in this way through a client every instance has built in: `hvc_hpy`, which `GET /config` publishes as `cli_client_key`. An operator who wants another app to manage the instance registers it with `include:dev.happyview.adminFull` among its scopes.

In all cases the resolved DID is checked against the `happyview_users` table, and the operator's permissions are loaded to authorize the request.

An atproto service-auth token is refused with `403 Forbidden`, whatever method it names: sign in with an app granted `dev.happyview.adminFull`, or use an API key.

A hosting platform's key (`PLATFORM_API_KEY_HASH`) reaches only [Platform](/docs/reference/admin/platform), [Domains](/docs/reference/admin/domains), [Stats](/docs/reference/admin/stats) and Jetstream status.

**Auto-bootstrap**: If the `happyview_users` table is empty and `SUPERADMIN_DID` isn't set, the first authenticated request makes the caller an operator with the superadmin privilege and every permission.

A DID that isn't an operator receives `403 Forbidden`, and so does an operator without the permission an endpoint requires.

## Errors

Error responses are JSON with an `error` field:

```json
{
  "error": "description of what went wrong"
}
```

A missing permission names it, and a server error carries an id to find in the instance's log:

```json
{ "error": "InsufficientPermissions", "message": "Missing permission: lexicons:create" }
{ "error": "Internal server error", "correlationId": "…" }
```

| Status | Meaning |
| --- | --- |
| `400 Bad Request` | Invalid input (missing required fields, malformed lexicon JSON) |
| `401 Unauthorized` | Missing or invalid credentials |
| `403 Forbidden` | The caller isn't an operator, lacks the permission, or used a credential the route doesn't accept |
| `404 Not Found` | The lexicon, user, job or other resource doesn't exist |
| `409 Conflict` | The change conflicts with the current state, such as a lexicon a project file defines |
| `412 Precondition Failed` | An `If-Match` didn't match, as on [Project](/docs/reference/admin/project) |
| `413 Payload Too Large` | A body over its limit, such as a project bundle |
| `422 Unprocessable Entity` | Well-formed input that can't be applied, such as a project that doesn't build |
| `503 Service Unavailable` | Something the request needs isn't available, such as record storage |

```sh
# All examples assume $TOKEN is an API key (hv_...)
AUTH="Authorization: Bearer $TOKEN"
```

## Endpoint groups

| Group | Description |
| ----- | ----------- |
| [Lexicons](/docs/reference/admin/lexicons) | Upload, list, get, and delete lexicons and network lexicons |
| [Lexicon publishing](/docs/reference/admin/lexicon-publishing) | Publish lexicons to the network and manage publishing rules |
| [Stats](/docs/reference/admin/stats) | Record counts by collection, operator and client counts, Jetstream status |
| [Backfill](/docs/reference/admin/backfill) | Create and monitor historical backfill jobs |
| [Jobs](/docs/reference/admin/jobs) | List, inspect, cancel, pause and resume background jobs, and read their logs |
| [Event logs](/docs/reference/admin/events) | Query, count and purge the audit trail of system events |
| [Metrics](/docs/reference/admin/metrics) | Script run metrics and the record ingest pipeline |
| [API keys](/docs/reference/admin/api-keys) | Create, list, and revoke API keys |
| [Users](/docs/reference/admin/users) | Create, list, update, and delete operators |
| [Labelers](/docs/reference/admin/labelers) | Manage external labeler subscriptions |
| [Records](/docs/reference/admin/records) | List, delete and reconcile indexed records |
| [Project](/docs/reference/admin/project) | Deploy a project and read what's deployed |
| [Linked repos](/docs/reference/admin/linked-repos) | Grant, invite and revoke access to repositories an instance can write to |
| [Spaces](/docs/reference/admin/spaces) | Browse spaces and their records for moderation |
| [Instance settings](/docs/reference/admin/settings) | Configure app name, logo, policy URLs, and concurrency settings |
| [XRPC proxy](/docs/reference/admin/xrpc-proxy) | Decide whether and where unknown XRPC methods are proxied |
| [Telemetry](/docs/reference/admin/telemetry) | Telemetry consent, previews and sending |
| [Database](/docs/reference/admin/database) | Database status, SQLite vacuum and record compression |
| [Domains](/docs/reference/admin/domains) | Manage domains and their OAuth client identities |
| [OAuth keys](/docs/reference/admin/oauth-keys) | Rotate and revoke the instance's OAuth client-assertion signing key |
| [Scripts](/docs/reference/admin/scripts) | Create, list, update, delete and migrate scripts |
| [Script variables](/docs/reference/admin/script-variables) | Key/value pairs for scripts' `ctx.env` |
| [API clients](/docs/reference/admin/api-clients) | Register and manage third-party XRPC clients, their secrets and their keys |
| [Plugins](/docs/reference/admin/plugins) | Install, configure, and manage plugins |
| [Dead letters](/docs/reference/admin/dead-letters) | List, inspect, dismiss, retry, and reindex dead-lettered events |
| [Service identity](/docs/reference/admin/service-identity) | Get and update service identity configuration |
| [Service entries](/docs/reference/admin/service-entries) | Manage service entries and their XRPC bindings |
| [Verification methods](/docs/reference/admin/verification-methods) | Create, list, and delete DID verification methods |
| [Feature flags](/docs/reference/admin/feature-flags) | List feature flag status |
| [Permissions](/docs/reference/admin/permissions) | List available permission definitions |
| [Identity](/docs/reference/admin/identity) | Resolve a handle or DID |
| [Platform](/docs/reference/admin/platform) | For a hosting platform: set the operator with superadmin |

## Permissions

Each admin API endpoint requires a specific permission. See the [Permissions guide](/docs/guides/permissions) for the full list of permissions and templates.

| Endpoint                                 | Required permission        |
| ---------------------------------------- | -------------------------- |
| `POST /admin/lexicons`                   | `lexicons:create` (plus `backfill:create` to start a backfill) |
| `GET /admin/lexicons`                    | `lexicons:read`            |
| `GET /admin/lexicons/{id}`               | `lexicons:read`            |
| `DELETE /admin/lexicons/{id}`            | `lexicons:delete` (plus `records:delete-collection` and `records:delete` with `delete_records=true`) |
| `GET /admin/lexicons/{id}/record-count`  | `lexicons:read` and `records:read` |
| `POST /admin/network-lexicons`           | `lexicons:create` (plus `backfill:create` to start a backfill) |
| `GET /admin/network-lexicons`            | `lexicons:read`            |
| `DELETE /admin/network-lexicons/{nsid}`  | `lexicons:delete` (plus `records:delete-collection` and `records:delete` with `delete_records=true`) |
| `GET /admin/lexicon-publishing`          | `lexicons:read`            |
| `GET /admin/lexicon-publishing/dns`      | `lexicons:read`            |
| `GET /admin/lexicon-publishing/dns/{nsid}` | `lexicons:read`          |
| `POST /admin/lexicon-publishing/rules`   | `lexicons:publish`         |
| `PATCH /admin/lexicon-publishing/rules/{id}` | `lexicons:publish`     |
| `DELETE /admin/lexicon-publishing/rules/{id}` | `lexicons:publish`    |
| `POST /admin/lexicon-publishing/publish` | `lexicons:publish`         |
| `POST /admin/lexicon-publishing/unpublish` | `lexicons:publish`       |
| `GET /admin/stats`                       | `stats:read`, or the platform key |
| `GET /admin/stats/counts`                | `stats:read`, or the platform key |
| `GET /admin/jetstream/status`            | `stats:read`, or the platform key |
| `POST /admin/backfill`                   | `backfill:create`          |
| `GET /admin/backfill/status`             | `backfill:read`            |
| `POST /admin/backfill/{id}/cancel`       | `backfill:create`          |
| `POST /admin/backfill/{id}/pause`        | `backfill:create`          |
| `POST /admin/backfill/{id}/resume`       | `backfill:create`          |
| `GET /admin/backfill/{id}/events`        | `backfill:read`            |
| `GET /admin/backfill/{id}/repos`         | `backfill:read`            |
| `GET /admin/backfill/{id}/pds-summary`   | `backfill:read`            |
| `GET /admin/backfill/{id}/errors`        | `backfill:read`            |
| `POST /admin/backfill/{id}/retry-failed` | `backfill:create`          |
| `GET /admin/backfill/collections/{nsid}` | `backfill:read`            |
| `DELETE /admin/backfill/{id}/details`    | `backfill:create`          |
| `DELETE /admin/backfill/details`         | `backfill:create`          |
| `GET /admin/events`                      | `events:read`              |
| `GET /admin/events/count`                | `events:read`              |
| `POST /admin/events/purge`               | `events:purge`             |
| `GET /admin/metrics/scripts`             | `metrics:read`             |
| `GET /admin/metrics/scripts/{trigger}`   | `metrics:read`             |
| `GET /admin/metrics/ingest`              | `metrics:read`             |
| `GET /admin/metrics/live`                | `metrics:read`             |
| `GET /admin/jobs`                        | `jobs:read`                |
| `GET /admin/jobs/{id}`                   | `jobs:read`                |
| `GET /admin/jobs/{id}/logs`              | `jobs:read`                |
| `POST /admin/jobs/{id}/cancel`           | `jobs:manage`              |
| `POST /admin/jobs/{id}/pause`            | `jobs:manage`              |
| `POST /admin/jobs/{id}/resume`           | `jobs:manage`              |
| `POST /admin/api-keys`                   | `api-keys:create`          |
| `GET /admin/api-keys`                    | `api-keys:read`            |
| `DELETE /admin/api-keys/{id}`            | `api-keys:delete`          |
| `POST /admin/users`                      | `users:create`             |
| `GET /admin/users`                       | `users:read`               |
| `GET /admin/users/{id}`                  | `users:read`               |
| `PATCH /admin/users/{id}/permissions`    | `users:update`             |
| `DELETE /admin/users/{id}`               | `users:delete`             |
| `POST /admin/users/transfer-super`       | Superadmin only            |
| `PUT /admin/platform/super-user`         | The platform key only      |
| `GET /admin/identity/resolve`            | Any operator               |
| `PUT /admin/project`                     | `project:deploy`           |
| `GET /admin/project`                     | `project:deploy`           |
| `GET /admin/linked-repos`                | `linked-repos:read`        |
| `POST /admin/linked-repos`               | `linked-repos:create`      |
| `POST /admin/linked-repos/{id}/authorize` | `linked-repos:create`     |
| `POST /admin/linked-repos/{id}/invite`   | `linked-repos:create`      |
| `GET /admin/linked-repos/{id}/invites`   | `linked-repos:read`        |
| `DELETE /admin/linked-repos/{id}/invites/{invite_id}` | `linked-repos:create` |
| `DELETE /admin/linked-repos/{id}`        | `linked-repos:delete`      |
| `GET /admin/script-variables`            | `script-variables:read`    |
| `POST /admin/script-variables`           | `script-variables:create`  |
| `DELETE /admin/script-variables/{key}`   | `script-variables:delete`  |
| `GET /admin/scripts`                     | `scripts:read`             |
| `POST /admin/scripts`                    | `scripts:manage`           |
| `GET /admin/scripts/languages`           | `scripts:read`             |
| `GET /admin/scripts/{id}`                | `scripts:read`             |
| `PATCH /admin/scripts/{id}`              | `scripts:manage`           |
| `DELETE /admin/scripts/{id}`             | `scripts:manage`           |
| `POST /admin/scripts/{id}/codemod`       | `scripts:read` to preview, `scripts:manage` to apply |
| `GET /admin/editor/declarations`         | `scripts:read`             |
| `POST /admin/labelers`                   | `labelers:create`          |
| `GET /admin/labelers`                    | `labelers:read`            |
| `PATCH /admin/labelers/{did}`            | `labelers:create`          |
| `DELETE /admin/labelers/{did}`           | `labelers:delete`          |
| `GET /admin/records`                     | `records:read`             |
| `GET /admin/records/collections`         | `records:read`             |
| `DELETE /admin/records`                  | `records:delete`           |
| `DELETE /admin/records/collection`       | `records:delete-collection` and `records:delete` |
| `POST /admin/records/collection/reconcile` | `records:read` for a dry run, `records:delete` to apply |
| `GET /admin/spaces`                      | `spaces:read`              |
| `GET /admin/spaces/{id}`                 | `spaces:read`              |
| `GET /admin/spaces/{id}/records`         | `spaces:manage-records`    |
| `GET /admin/spaces/{id}/blob`            | `spaces:manage-records`    |
| `GET /admin/spaces/migration-status`     | `spaces:read`              |
| `GET /admin/database/status`             | `settings:manage`          |
| `POST /admin/database/vacuum/schedule`   | `settings:manage`          |
| `DELETE /admin/database/vacuum/schedule` | `settings:manage`          |
| `POST /admin/storage/retrain`           | `settings:manage`          |
| `GET /admin/settings`                    | `settings:manage`          |
| `GET /admin/settings/db-info`            | `settings:manage`          |
| `PUT /admin/settings/{key}`              | `settings:manage`          |
| `DELETE /admin/settings/{key}`           | `settings:manage`          |
| `PUT /admin/settings/logo`              | `settings:manage`          |
| `DELETE /admin/settings/logo`           | `settings:manage`          |
| `GET /admin/settings/telemetry`          | `settings:manage`          |
| `PUT /admin/settings/telemetry`          | `settings:manage`          |
| `POST /admin/settings/telemetry/dismiss` | `settings:manage`          |
| `GET /admin/settings/telemetry/preview`  | `settings:manage`          |
| `POST /admin/settings/telemetry/send`    | `settings:manage`          |
| `GET /admin/plugins`                     | `plugins:read`             |
| `POST /admin/plugins`                    | `plugins:create`           |
| `POST /admin/plugins/preview`            | `plugins:create`           |
| `GET /admin/plugins/official`            | `plugins:read`             |
| `DELETE /admin/plugins/{id}`             | `plugins:delete`           |
| `POST /admin/plugins/{id}/reload`        | `plugins:create`           |
| `POST /admin/plugins/{id}/check-update`  | `plugins:create`           |
| `GET /admin/plugins/{id}/secrets`        | `plugins:read`             |
| `PUT /admin/plugins/{id}/secrets`        | `plugins:create`           |
| `GET /admin/plugins/{id}/allowed-hosts`  | `plugins:read`             |
| `PUT /admin/plugins/{id}/allowed-hosts`  | `plugins:create`           |
| `GET /admin/domains`                     | `settings:manage`, or the platform key |
| `POST /admin/domains`                    | `settings:manage`, or the platform key; only the platform key on an instance it manages |
| `DELETE /admin/domains/{id}`             | `settings:manage`, or the platform key; only the platform key on an instance it manages |
| `POST /admin/domains/{id}/primary`       | `settings:manage`, or the platform key; only the platform key on an instance it manages |
| `GET /admin/oauth/instance-key`          | `settings:manage`          |
| `POST /admin/oauth/instance-key/rotate`  | `settings:manage`          |
| `DELETE /admin/oauth/instance-key/{kid}` | `settings:manage`          |
| `GET /admin/api-clients`                 | `api-clients:view`         |
| `POST /admin/api-clients`                | `api-clients:create`       |
| `GET /admin/api-clients/{id}`            | `api-clients:view`         |
| `PUT /admin/api-clients/{id}`            | `api-clients:edit`         |
| `DELETE /admin/api-clients/{id}`         | `api-clients:delete`       |
| `GET /admin/api-clients/{id}/secrets`    | `api-clients:view`         |
| `POST /admin/api-clients/{id}/secrets`   | `api-clients:edit`         |
| `DELETE /admin/api-clients/{id}/secrets/{secret_id}` | `api-clients:edit` |
| `POST /admin/api-clients/{id}/auth-key`  | `api-clients:edit`         |
| `GET /admin/api-clients/{id}/auth-key`   | `api-clients:view`         |
| `GET /admin/api-clients/{id}/auth-keys`  | `api-clients:view`         |
| `POST /admin/api-clients/{id}/auth-key/recheck` | `api-clients:edit`  |
| `POST /admin/api-clients/{id}/auth-key/rotate`  | `api-clients:edit`  |
| `DELETE /admin/api-clients/{id}/auth-key/{kid}` | `api-clients:edit`  |
| `DELETE /admin/api-clients/{id}/auth-keys` | `api-clients:edit`       |
| `GET /admin/dead-letters`                | `dead-letters:read`        |
| `GET /admin/dead-letters/count`          | `dead-letters:read`        |
| `GET /admin/dead-letters/{id}`           | `dead-letters:read`        |
| `POST /admin/dead-letters/{id}/dismiss`  | `dead-letters:manage`      |
| `POST /admin/dead-letters/{id}/retry`    | `dead-letters:manage`      |
| `POST /admin/dead-letters/{id}/reindex`  | `dead-letters:manage`      |
| `POST /admin/dead-letters/bulk/dismiss`  | `dead-letters:manage`      |
| `POST /admin/dead-letters/bulk/retry`    | `dead-letters:manage`      |
| `POST /admin/dead-letters/bulk/reindex`  | `dead-letters:manage`      |
| `GET /admin/service-identity`            | `settings:manage`          |
| `PUT /admin/service-identity`            | `settings:manage`          |
| `GET /admin/service-entries`             | `settings:manage`          |
| `POST /admin/service-entries`            | `settings:manage`          |
| `PUT /admin/service-entries/{id}`        | `settings:manage`          |
| `DELETE /admin/service-entries/{id}`     | `settings:manage`          |
| `GET /admin/service-entries/{id}/xrpcs`  | `settings:manage`          |
| `POST /admin/service-entries/{id}/xrpcs` | `settings:manage`          |
| `DELETE /admin/service-entries/{id}/xrpcs`| `settings:manage`         |
| `POST /admin/service-entries/sync-plc`   | `settings:manage`          |
| `POST /admin/service-entries/sync-plc/request` | `settings:manage`    |
| `POST /admin/service-entries/sync-plc/submit`  | `settings:manage`    |
| `GET /admin/lexicons/{id}/services`      | `settings:manage`          |
| `GET /admin/verification-methods`        | `settings:manage`          |
| `POST /admin/verification-methods`       | `settings:manage`          |
| `DELETE /admin/verification-methods/{fragment_id}` | `settings:manage` |
| `GET /admin/feature-flags`               | `settings:manage`          |
| `GET /admin/network-lexicons/resolve/{nsid}` | `lexicons:read`        |
| `GET /admin/permissions`                 | `users:read`               |
| `GET /admin/settings/xrpc-proxy`         | `settings:manage`          |
| `PUT /admin/settings/xrpc-proxy`         | `settings:manage`          |
