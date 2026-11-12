---
title: "Upgrading HappyView"
description: "Move a self-hosted instance to a newer HappyView release: how to learn one is out, back up, swap the image or binary, and check it came up."
---

This guide moves a self-hosted instance from one HappyView release to a newer one on the same line. It covers learning that a release is out, the backup, the swap and the check afterwards.

It doesn't cover moving from v2 to v3, which changes how scripts run and needs its own steps: see [Upgrading to v3](/docs/guides/upgrading-to-v3). An instance run by a hosting provider is upgraded by that provider; its dashboard says so.

## Learn that a release is out

The dashboard checks for a newer HappyView on the instance's own line and says so at the top of every page, with links to the release notes and here. The About page shows what the last check found, when it ran and, if it failed, why.

| Running | Follows | Never offered |
| --- | --- | --- |
| A stable 2.x release | the `v2` channel | 3.x, or any prerelease |
| A stable release of the newest major | the `latest` channel | any prerelease |
| `-beta.N` | the `beta` channel | alpha |
| `-alpha.N` | the `alpha` channel | nothing: it is the newest line |

A prerelease is also told when its version has been released as stable, and a stable instance when a newer major is out. Neither is offered as an update: moving between lines is a choice, not a patch.

[Version that ships the check: fill in when it is released.] Earlier releases don't check; watch the [releases page](https://github.com/gamesgamesgamesgamesgames/happyview/releases) instead.

### What the check sends

The instance asks the registry in `PLUGIN_REGISTRY_URL` where its channel points. The request names HappyView's publisher, the `happyview` project and the channel, which are the same for every instance on that line. It carries no instance ID, URL or usage, and its `User-Agent` is `HappyView` without the version. It runs a few minutes after startup and then every six hours. Nothing is sent when the check is off.

### Turn the check off

Set `UPDATE_CHECK=off`. `PLUGIN_REGISTRY_URL=off` turns it off too, so an instance with no outbound network makes no update request either. See [Configuration](/docs/reference/configuration#plugins).

## Upgrade

Legend: **safe** reads only; **writes** changes the instance.

### TL;DR (Docker, SQLite stack)

```sh
# writes: stop HappyView and copy its data volume aside
docker compose stop happyview
docker run --rm -v happyview-prod-sqlite_happyview-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/happyview-before-upgrade.tgz -C /data .

# writes: set HAPPYVIEW_VERSION in .env to the new version, then
docker compose pull
docker compose up -d

# safe: check it came up on the new version
curl -s http://127.0.0.1:3000/config | grep '"version"'
```

### 1. Read the release notes

Open the notes the dashboard linked, or the release on the [releases page](https://github.com/gamesgamesgamesgamesgames/happyview/releases). A release that needs more than a swap says so there and links its own steps. Do those instead of this guide's.

### 2. Back up the database

Migrations run on the new version's first start, and the way back from a migration is a backup taken before it. What a backup has to cover is in [Backups](/docs/guides/self-hosting/production#backups).

**writes** (it stops HappyView): the Docker SQLite stack keeps its database in the `happyview-data` volume. Stop HappyView so the copy is consistent, then copy the volume. The volume name carries the stack's project name, `happyview-prod-sqlite`; `docker volume ls` shows yours.

```sh
docker compose stop happyview
docker run --rm -v happyview-prod-sqlite_happyview-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/happyview-before-upgrade.tgz -C /data .
```

**safe**: the Docker Postgres stack, while HappyView runs.

```sh
docker compose exec -T postgres pg_dump -U happyview happyview > happyview-before-upgrade.sql
```

**safe**: a native binary, while HappyView runs. Use the path in your `DATABASE_URL`.

```sh
# SQLite
sqlite3 data/happyview.db ".backup 'happyview-before-upgrade.db'"

# Postgres
pg_dump "$DATABASE_URL" > happyview-before-upgrade.sql
```

### 3. Swap in the new release

**writes.** Pick the path you installed with.

**Docker (recommended).** Set `HAPPYVIEW_VERSION` in `.env` to the exact new version, such as `2.17.5`, then:

```sh
docker compose pull
docker compose up -d
```

**Native binary.** Download the new release's archive and its `.sha256`, check and extract it as in [Native binary](/docs/guides/self-hosting/binary), stop the running `happyview`, and start the new one with the same environment.

With several replicas on one Postgres database, upgrade one first and let its migrations finish before the rest start. See [migrations at startup](/docs/guides/database/database-setup#migrations-at-startup).

### 4. Check it worked

**safe.**

```sh
curl -s http://127.0.0.1:3000/health
# ok

curl -s http://127.0.0.1:3000/config | grep '"version"'
# "version": "2.17.5"
```

The dashboard's notice is gone once the next check runs, and the About page shows the new version. The logs show the migrations that ran:

```sh
docker compose logs --since 10m happyview
```

## Roll back

Going back means the previous image or binary *and* the backup from step 2: a migration that ran on the new version may have changed tables the old one can't read.

1. Stop HappyView: `docker compose stop happyview`, or stop the binary.
2. Restore the backup.

   ```sh
   # Docker, SQLite stack: empty the volume and unpack the copy into it
   docker run --rm -v happyview-prod-sqlite_happyview-data:/data -v "$PWD":/backup alpine \
     sh -c 'rm -rf /data/* && tar xzf /backup/happyview-before-upgrade.tgz -C /data'

   # Native binary, SQLite: copy the backup over the database and drop its sidecars
   cp happyview-before-upgrade.db data/happyview.db && rm -f data/happyview.db-wal data/happyview.db-shm
   ```

   On Postgres, restore the dump into an empty database.
3. Set `HAPPYVIEW_VERSION` back and run `docker compose up -d`, or start the previous binary.

Anything indexed or written between the upgrade and the rollback is in neither the backup nor the old version. Records come back from the network with a [backfill](/docs/guides/backfill); changes made in the dashboard meanwhile have to be made again.
