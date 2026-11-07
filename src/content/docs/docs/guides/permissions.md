---
title: "Permissions"
description: How operator permissions, templates, superadmin and API key permissions control access to the admin API.
---

Each operator's permissions decide which admin API endpoints they can call. You can assign permissions one by one, through a template, or both.

## Permission list

HappyView defines 54 permissions. The [permissions table](/docs/architecture/glossary#permissions) in the glossary lists each one, what it allows and the lowest template that grants it. It is generated from HappyView's own list, so it stays current.

## Permission templates

Templates are predefined sets of permissions that simplify adding an operator. Pass a `template` value when creating one via `POST /admin/users`.

### Viewer template

Read-only access. Can browse lexicons, records, scripts, stats, events, dead letters, and the operator list but cannot modify anything.

Includes: `lexicons:read`, `records:read`, `scripts:read`, `script-variables:read`, `users:read`, `api-keys:read`, `backfill:read`, `stats:read`, `events:read`, `metrics:read`, `dead-letters:read`

### Maintainer template

Everything in the **Viewer** template, plus the ability to run backfill jobs, manage API keys, and manage dead letters.

`POST /admin/users` accepts `"template": "operator"` as another name for this template.

Adds: `backfill:create`, `api-keys:create`, `api-keys:delete`, `dead-letters:manage`

### Manager template

Everything in the **Maintainer** template, plus the ability to manage and publish lexicons, records, scripts, labelers, settings, plugins, API clients, and atproto spaces, and to deploy the project.

Adds: `lexicons:create`, `lexicons:delete`, `lexicons:publish`, `scripts:manage`, `project:deploy`, `script-variables:create`, `script-variables:delete`, `records:delete`, `labelers:create`, `labelers:read`, `labelers:delete`, `settings:manage`, `plugins:read`, `plugins:create`, `plugins:delete`, `api-clients:view`, `api-clients:create`, `api-clients:edit`, `api-clients:delete`, `spaces:create`, `spaces:read`, `spaces:update`, `spaces:delete`, `spaces:manage-members`, `spaces:manage-invites`, `spaces:manage-records`, `spaces:manage-credentials`

### Full Access template

All 54 permissions. Equivalent to granting every permission individually (but still not superadmin).

## Reading space contents

`spaces:inspect` lets an operator request time-limited access to read the records and blobs in private atproto spaces, through the [space inspector](/docs/guides/spaces#moderating-spaces). Only **Full Access** includes it. Give it to the operators who handle reports, one by one.

`spaces:manage-records` is still in the **Manager** template, but it grants no access. Reading a space's contents needs `spaces:inspect` instead.

## Superadmin

Superadmin is a privilege one operator holds. On a fresh instance, the first person to sign in becomes an operator with it, unless `SUPERADMIN_DID` names someone else. The dashboard marks that operator **Owner**. The operator with superadmin:

- Has unrestricted access to all endpoints, regardless of which permissions are assigned
- Is the only operator who can call `POST /admin/users/transfer-super`
- Cannot be deleted
- Cannot have their permissions modified by other operators

Usually one operator holds superadmin. A transfer, from the dashboard or the transfer endpoint in the admin API, moves it to another operator and takes it from the previous holder. `SUPERADMIN_DID` only adds: the configured account gets superadmin at every boot, and anyone else who holds it keeps it.

## Escalation guards

HappyView prevents privilege escalation:

- When creating an operator or API key, you can only grant permissions that you yourself have. Attempting to grant a permission you lack returns `403 Forbidden`.
- When updating an operator's permissions, the same rule applies: you cannot grant permissions beyond your own.

## Self-modification guards

Operators cannot modify their own account in destructive ways:

- You cannot delete yourself
- You cannot change your own permissions

These guards prevent accidental lockout.

## API key permissions

API keys have their own set of permissions, specified at creation time. The effective permissions of an API key are the **intersection** of:

1. The permissions assigned to the key
2. The permissions of the operator who owns the key

If an operator's permissions are later reduced, any API keys they created are reduced with them, even though the key's own permission list doesn't change.

For example, if an operator with `lexicons:create` and `lexicons:read` creates a key with both permissions and later loses `lexicons:create`, the key can only use `lexicons:read`.

## Managing permissions

### Via the dashboard

Go to **Access > Users** to view and manage operators' permissions. Click on an operator to see their current permissions and modify them. You can also assign templates when adding an operator.

### Via the API

- `POST /admin/users`: create an operator with a template or explicit permissions
- `PATCH /admin/users/{id}/permissions`: grant or revoke individual permissions
- `POST /admin/users/transfer-super`: pass superadmin to another operator (superadmin only)

See [Admin API: Users](/docs/reference/admin/users) for full details.

## Next steps

- [Admin API reference](/docs/reference/admin/admin-api): endpoint documentation with required permissions
- [API Keys](/docs/guides/api-keys): creating scoped API keys
- [Event Logs](/docs/guides/event-logs): permission-denied events are logged for auditing
