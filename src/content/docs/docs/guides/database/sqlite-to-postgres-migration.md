---
title: SQLite to Postgres migration
description: Move an existing instance from SQLite to Postgres, including the raw SQL its scripts send.
---

Moving to Postgres starts you on an empty database: records come back through backfill, and everything else is re-created by hand. HappyView's own SQL needs no changes, and neither do `happyview.db` chains. A script that passes raw SQLite SQL to `happyview.sql`'s `raw` does; see [Scripts](#scripts).

## Step 1: Set up Postgres

Create a Postgres database for HappyView:

```sh
createdb happyview
```

If you are using Docker Compose, switch to `docker-compose.prod.postgres.yml`. See [Docker](/docs/guides/self-hosting/docker#1-choose-a-database).

## Step 2: Back up your SQLite database

Take a consistent copy of your SQLite database before making any changes. The `.backup` command works while HappyView is running:

```sh
sqlite3 data/happyview.db ".backup 'data/happyview.db.backup'"
```

## Step 3: Update environment variables

Change your `.env` to use Postgres:

```sh
# Before
DATABASE_URL=sqlite://data/happyview.db?mode=rwc

# After
DATABASE_URL=postgres://happyview:happyview@localhost/happyview
```

If you had `DATABASE_BACKEND` set, update it as well:

```sh
DATABASE_BACKEND=postgres
```

## Step 4: Start HappyView

Start HappyView with the new `DATABASE_URL`. It connects to Postgres and runs its migrations, which create all necessary tables.

## Step 5: Re-index your data

HappyView indexes records from the atproto network, so re-run the backfill to populate the new database:

1. Install your interpreters and libraries
2. Redeploy your project, or upload your lexicons via the dashboard or admin API
3. Run a backfill for each collection (dashboard or `POST /admin/backfill`)

Backfill fetches records fresh from the network, so records that exist only on this instance don't come back.

:::tip
If you have many lexicons, you can export them from the old instance before switching. Use `GET /admin/lexicons` to list them and `POST /admin/lexicons` to re-upload after switching to Postgres.
:::

## Step 6: Re-create admin settings

Instance settings (app name, logo, terms and privacy URIs), API keys, API clients, operators, plugins, scripts saved in the dashboard, script variables and labeler subscriptions are stored in the database and are not carried over. Re-create these via the dashboard or admin API after switching. OAuth sessions don't carry over either, so everyone signs in again.

## Scripts

`happyview.db` chains need no changes; the host generates Postgres SQL for them. Statements passed to `happyview.sql`'s `raw` do, because raw SQL reaches the backend untranslated:

- `?` placeholders become `$1`, `$2`, etc.
- `json_extract()` becomes Postgres JSON operators (`->`, `->>`)
- `datetime('now')` becomes `NOW()`
- Boolean literals `1`/`0` work in both backends

Rewrite them before switching, or branch on `db.backend()` in a script that has to run on both.

## Rollback

To switch back to SQLite, revert your `DATABASE_URL` to the SQLite connection string, and revert any script you converted. HappyView does not modify your SQLite file during the migration to Postgres, so it stays as it was when you switched.

## Next steps

- [Postgres to SQLite migration](/docs/guides/database/postgres-to-sqlite-migration): migrate in the opposite direction
- [Database setup](/docs/guides/database/database-setup): choose between SQLite and Postgres for new instances
- [Backfill](/docs/guides/backfill): re-index records from the network after switching backends
- [Scripts](/docs/getting-started/scripts): write SQL that works against either backend
