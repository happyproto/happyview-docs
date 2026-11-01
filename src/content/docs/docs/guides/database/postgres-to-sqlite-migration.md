---
title: Postgres to SQLite migration
description: Move an existing instance from Postgres to SQLite, including the raw SQL its scripts send.
---

## Overview

The new database starts empty: records come back through backfill, and everything else is re-created by hand (step 6). HappyView's own SQL needs no changes, and neither do `happyview.db` chains. A script that passes raw Postgres SQL to `happyview.sql`'s `raw` does need changing, because raw SQL reaches the backend untranslated.

## Step 1: Export your data

Back up your Postgres database before making any changes:

```sh
pg_dump -U happyview happyview > happyview_backup.sql
```

## Step 2: Update environment variables

Change your `.env` to use SQLite:

```sh
# Before
DATABASE_URL=postgres://happyview:happyview@localhost/happyview

# After
DATABASE_URL=sqlite://data/happyview.db?mode=rwc
```

If you had `DATABASE_BACKEND` set, update it as well:

```sh
DATABASE_BACKEND=sqlite
```

## Step 3: Migrate raw SQL in scripts

Convert raw SQL in Lua scripts from Postgres syntax to SQLite syntax. `migrate-lua-sql` automates this. It reads `.lua` files on disk, so copy any script you keep in the dashboard into a file first, and paste the result back afterwards. Convert raw SQL in JavaScript or TypeScript scripts by hand, using the list below.

### Run the codemod tool

```sh
# Preview the changes first
migrate-lua-sql --dry-run /path/to/lua/scripts

migrate-lua-sql /path/to/lua/scripts
```

The tool ships in the [release archive](/docs/guides/self-hosting/binary), not the Docker image; from a clone, run `cargo run --bin migrate-lua-sql -- /path/to/lua/scripts`. It scans every `.lua` file in the given directory and its subdirectories, or in the current directory when none is given, and rewrites Postgres SQL patterns to SQLite equivalents. It rewrites any string literal that looks like SQL and fits on one line, whether or not it reaches `raw`, so review the `--dry-run` output first.

### What the codemod converts automatically

- `$1`, `$2`, etc. parameter placeholders to `?`
- JSON operators (`->`, `->>`) and `::jsonb` casts to `json_extract()` calls
- `ILIKE` to `LIKE` (SQLite `LIKE` is case-insensitive for ASCII by default)
- `NOW()` to `datetime('now')`
- `NOW() + INTERVAL '...'` / `NOW() - INTERVAL '...'` to `datetime('now', '...')`
- Lowercase `true`/`false` literals to `1`/`0`; uppercase `TRUE` and `FALSE` are left as they are

### What it flags for manual review

The tool prints warnings for patterns it cannot convert automatically:

- JSONB `?` (contains-key) operator: consider using `json_each()` with an `EXISTS` subquery
- `make_interval()`: Postgres-specific, needs manual conversion
- `SIMILAR TO`: use `LIKE` or `GLOB` instead
- `ANY()` / `ALL()` array operators: no direct SQLite equivalent
- Type casts other than `::jsonb` (e.g., `::text`, `::integer`): may need manual conversion to `CAST(... AS ...)`

Review the flagged lines and update them manually.

## Step 4: Import data into SQLite

There is no direct import. HappyView creates the SQLite database and runs its migrations when it starts. Re-index your records from the network:

1. Start HappyView with the new SQLite `DATABASE_URL`
2. Install your interpreters and libraries
3. Redeploy your project, or upload your lexicons via the dashboard or admin API
4. Run a backfill for each collection (dashboard or `POST /admin/backfill`)

Backfill fetches records fresh from the network, so records that exist only on this instance don't come back.

## Step 5: Update Docker Compose (if applicable)

If you were running Postgres via Docker Compose, switch to `docker-compose.prod.sqlite.yml`. See [Docker](/docs/guides/self-hosting/docker#1-choose-a-database).

## Step 6: Re-create admin settings

Instance settings (app name, logo, terms and privacy URIs), API keys, API clients, operators, plugins, scripts saved in the dashboard, script variables and labeler subscriptions are stored in the database and are not carried over. Re-create these via the dashboard or admin API after switching. OAuth sessions don't carry over either, so everyone signs in again.

## Rollback

To switch back to Postgres, revert your `DATABASE_URL` to the Postgres connection string, and revert any script you converted. HappyView does not modify your Postgres database during the migration to SQLite, so it stays as it was when you switched.

## Next steps

- [SQLite to Postgres migration](/docs/guides/database/sqlite-to-postgres-migration): migrate in the opposite direction
- [Database setup](/docs/guides/database/database-setup): choose between SQLite and Postgres for new instances
- [Backfill](/docs/guides/backfill): re-index records from the network after switching backends
- [Scripts](/docs/getting-started/scripts): write SQL that works against either backend
