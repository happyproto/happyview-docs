---
title: "Production"
description: What to set and back up before an instance serves real users.
---

Set these before an instance serves real users. To install HappyView first, see [Docker](/docs/guides/self-hosting/docker) or [the release binaries](/docs/guides/self-hosting/binary).

## Session secret

Set `SESSION_SECRET` to a random value of at least 32 bytes, such as the output of `openssl rand -base64 48`; a placeholder like `change-me-in-production` is refused and leaves nobody able to sign in. The secret signs the session cookies issued during OAuth login; rotating it invalidates every existing session.

```sh
openssl rand -base64 48
```

Never commit the secret to source control. Store it in your platform's secret manager (Docker secrets, Kubernetes secrets, etc.).

## Token encryption key

Set `TOKEN_ENCRYPTION_KEY` to a base64-encoded 32-byte key. It encrypts at rest, using AES-256-GCM, the OAuth sessions and tokens HappyView stores, DPoP keys, [plugin](/docs/guides/plugins) secrets, [script variables](/docs/reference/admin/script-variables) and the [attestation](/docs/guides/attestation-signing) signing key:

```sh
openssl rand -base64 32
```

Without a valid key, app sign-in, atproto spaces (off by default) and service identity don't work, the dashboard's plugin secret fields are disabled, and plugins can only read secrets from environment variables. Sessions, script variables and the attestation key are stored unencrypted until a key is set; the first boot with one encrypts them. Changing the key on its own makes everything already encrypted unreadable, so replace it as in [Rotating the encryption key](/docs/guides/rotating-the-encryption-key).

## TLS and `PUBLIC_URL`

HappyView does not terminate TLS. Put it behind a reverse proxy (nginx, Caddy, Cloudflare Tunnel, a platform-managed load balancer) and set `PUBLIC_URL` to the public HTTPS URL:

```sh
PUBLIC_URL=https://happyview.example.com
```

`PUBLIC_URL` is used to construct OAuth redirect URIs, so it must exactly match the URL people reach, including the scheme. A mismatch breaks OAuth login.

## Reverse proxy subpath

If you need HappyView to share a domain with other services, set `BASE_PATH` to mount it at a subpath. For example, to serve the dashboard at `https://example.com/hv/`:

```sh
PUBLIC_URL=https://example.com
BASE_PATH=/hv
```

`PUBLIC_URL` should **not** include the base path. HappyView appends it automatically when constructing OAuth callbacks and other external URLs.

Neither the Docker image nor the release binary needs a rebuild for a subpath. The image applies the base path to its dashboard at container startup, and the binary applies it to its built-in dashboard as it serves it.

### XRPC endpoints

atproto clients expect XRPC endpoints at `/xrpc/*` on the domain root. When using a base path, configure your reverse proxy to rewrite `/xrpc/*` requests so they reach HappyView under its base path. Here's an example using Caddy:

```
example.com {
    # Dashboard and API under the base path
    handle /hv/* {
        reverse_proxy happyview:3000
    }

    # Redirect bare /hv to /hv/ for cleaner URLs
    handle /hv {
        redir /hv/ permanent
    }

    # atproto XRPC: rewrite to base path before proxying
    handle /xrpc/* {
        rewrite * /hv{uri}
        reverse_proxy happyview:3000
    }

    # Everything else goes to another service
    handle {
        reverse_proxy other-app:3001
    }
}
```

The `rewrite * /hv{uri}` directive prepends `/hv` to the request path before proxying, so `/xrpc/com.atproto.sync.getRecord` becomes `/hv/xrpc/com.atproto.sync.getRecord`, which matches HappyView's nested routes.

### Health checks with a base path

`GET /health` is always served at the domain root, even when `BASE_PATH` is set. This keeps load balancer probes working without routing changes.

## Database

SQLite is fine for small to medium instances and is the default. Switch to Postgres if you need:

- Multiple HappyView replicas sharing one database
- Larger-than-memory working sets
- External tools that need direct read access to the records table

See the [database setup guide](/docs/guides/database/database-setup) for configuration details, [SQLite to Postgres migration](/docs/guides/database/sqlite-to-postgres-migration) to switch, and [Postgres to SQLite migration](/docs/guides/database/postgres-to-sqlite-migration) to go back. Migrations run automatically on startup regardless of backend. Upgrades that build an index over a large records table make that boot slow on either backend. With several replicas, upgrade one first. See [migrations at startup](/docs/guides/database/database-setup#migrations-at-startup). The upgrade from v2 to the [compact record format](/docs/guides/database/database-setup#the-compact-record-format) copies every record once and can't be rolled back without a backup; read its notes first.

## Rate limits

HappyView has a per-client token-bucket rate limiter for XRPC endpoints. The defaults (set via `DEFAULT_RATE_LIMIT_CAPACITY` and `DEFAULT_RATE_LIMIT_REFILL_RATE`) apply to any [API client](/docs/guides/api-clients) that doesn't have per-client overrides. Raise the defaults cautiously: they exist so one misbehaving integrator can't saturate the instance.

Per-client overrides are set at client creation or via `PUT /admin/api-clients/{id}` (see [API clients](/docs/reference/admin/api-clients)).

## Logging

HappyView's default `RUST_LOG` setting (`happyview=debug,tower_http=debug,sqlx=warn`) is noisy, though the Docker Compose files set a quieter one. For production, drop the verbosity:

```sh
RUST_LOG=happyview=info,tower_http=info,sqlx=warn
```

Structured logs go to stdout, so any platform that captures container stdout (Fly, ECS, Kubernetes) will ingest them without further configuration. For retention and querying, ship stdout to your usual log aggregator.

## Event log retention

The admin [event log](/docs/guides/event-logs) is stored in the same database as records. `EVENT_LOG_RETENTION_DAYS` (default `30`) controls automatic cleanup. Set it to `0` to keep events indefinitely, and plan for database growth. [Script performance](/docs/guides/dashboard#script-performance) metrics and job logs follow the same setting.

[Protected events](/docs/guides/event-logs#protected-events), the space access audit records, follow `SPACE_ACCESS_LOG_RETENTION_DAYS` instead, 365 days by default. A purge never deletes them.

## Health checks

`GET /health` returns `200 ok` when HappyView can bind its HTTP listener. Use it as the readiness/liveness probe for your platform. It doesn't touch the database.

## Backups

- **SQLite**: back up the database file (e.g. `data/happyview.db`) plus its `-wal` and `-shm` sidecar files. Use `sqlite3 happyview.db ".backup '/path/backup.db'"` for a consistent snapshot while HappyView is running.
- **Postgres**: standard `pg_dump` / managed-Postgres snapshots.

Most of what HappyView stores comes from the network: lost records can be re-indexed via [backfill](/docs/guides/backfill). You can't recover these from the network: operators and permissions, API keys, API clients, scripts, deployed projects, plugin secrets, the Jetstream cursor, and the [OAuth client keys](/docs/guides/hardening#back-up-the-oauth-client-authentication-key). Prioritize those in your backup plan.

## Next steps

- [Configuration reference](/docs/reference/configuration): every environment variable
- [Hardening](/docs/guides/hardening): narrow what the instance can do with its users' credentials
- [Permissions](/docs/guides/permissions): lock down admin access before exposing the dashboard publicly
- [Troubleshooting](/docs/guides/troubleshooting): diagnose issues with a running instance
