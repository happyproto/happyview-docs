---
title: "Docker"
description: Run HappyView from its published container image with one of the production Compose files.
---

This guide deploys HappyView from the prebuilt images published to GitHub Container Registry, using one of the two production Compose files in the repository. Nothing is compiled locally: the image already contains HappyView and its dashboard.

If you want to run the repository's development stack with hot reloading, see [Running the development stack](https://github.com/gamesgamesgamesgamesgames/happyview/blob/alpha/CONTRIBUTING.md#running-the-development-stack) in HappyView's CONTRIBUTING.md instead. To run HappyView directly with `cargo run`, see [From source](/docs/guides/self-hosting/from-source).

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- A domain and a reverse proxy that terminates TLS, which HappyView doesn't do itself. See [step 4](#4-put-a-reverse-proxy-in-front)

## The image

```
ghcr.io/gamesgamesgamesgamesgames/happyview
```

Multi-arch manifests are published for `linux/amd64` and `linux/arm64` on every release.

| Tag               | Moves                            | Use for                                |
| ----------------- | -------------------------------- | -------------------------------------- |
| `3.0.0-alpha.<n>` | Never                            | v3, which is what these docs describe  |
| `sha-abc1234`     | Never                            | Pinning to an exact commit             |
| `latest`          | Every stable release             | v2, [documented separately](/docs/v2)  |
| `2.13.0`          | Never                            | Pinning a v2 release                   |
| `2.13`            | Every stable patch in that minor | Automatic v2 patch updates             |
| `2`               | Every stable minor in that major | Automatic v2 minor updates             |

v3 is in alpha, so every v3 image is a prerelease, published under its full version and its commit SHA only. A prerelease moves none of `latest`, `2.13` or `2`. Find the newest `3.0.0-alpha.<n>` on the [releases page](https://github.com/gamesgamesgamesgamesgames/happyview/releases). The `beta` line (such as `2.17.0-beta.1`) is v2.

:::caution[Set HAPPYVIEW_VERSION]
Every Compose file below reads `HAPPYVIEW_VERSION` and defaults to `latest`, which is v2. Set it to an exact v3 version, as step 2 does, so you get the version these docs describe and a redeploy can't pull a different build than the one you tested.
:::

## 1. Choose a database

Pick one Compose file. Both live at the repository root:

| File                               | Database | Best for                                                                                                                              |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `docker-compose.prod.sqlite.yml`   | SQLite   | Small to medium instances. One container, one volume, no database to operate                                                          |
| `docker-compose.prod.postgres.yml` | Postgres | Multiple HappyView replicas sharing a database, larger-than-memory working sets, or external tools reading the records table directly |

See the [database setup guide](/docs/guides/database/database-setup) for the full comparison. Migrations run automatically on startup on either backend, and both directions are [migratable](/docs/guides/database/sqlite-to-postgres-migration) later.

Make a directory for the instance and download the one you picked as `docker-compose.yml`, so `docker compose` finds it without a `-f` flag:

```sh
mkdir -p happyview && cd happyview
```

```sh
# SQLite
curl -o docker-compose.yml https://raw.githubusercontent.com/gamesgamesgamesgamesgames/happyview/alpha/docker-compose.prod.sqlite.yml
```

```sh
# Postgres
curl -o docker-compose.yml https://raw.githubusercontent.com/gamesgamesgamesgamesgames/happyview/alpha/docker-compose.prod.postgres.yml
```

## 2. Generate secrets

Create a `.env` next to it, with `<n>` replaced by the newest alpha. Compose auto-loads that filename, so these need no flag either:

```sh
cat > .env <<EOF
PUBLIC_URL=https://happyview.example.com
SESSION_SECRET=$(openssl rand -base64 48)
TOKEN_ENCRYPTION_KEY=$(openssl rand -base64 32)
HAPPYVIEW_VERSION=3.0.0-alpha.<n>
EOF
```

For the Postgres stack, add a database password as well:

```sh
echo "POSTGRES_PASSWORD=$(openssl rand -hex 32)" >> .env
```

Compose refuses to start without these:

- **`PUBLIC_URL`**: the public HTTPS URL people actually reach, scheme included. It's used to build OAuth redirect URIs, so a mismatch breaks login. Do **not** include `BASE_PATH` here.
- **`SESSION_SECRET`**: signs the dashboard session cookie. An unset or too-short value doesn't stop HappyView booting. It disables cookie login, which is why the Compose files require it explicitly.
- **`TOKEN_ENCRYPTION_KEY`**: the AES-256-GCM key protecting OAuth tokens, DPoP private keys, and plugin secrets at rest. Without it, app sign-in, [spaces](/docs/guides/spaces), and service identity don't work. Rotating it makes everything already encrypted unreadable.

:::caution[Deploying from a clone of the repository instead]
The steps above assume a directory containing nothing but the Compose file and your `.env`, which is why the plain filenames are safe. In a clone of the repository they are not. A development `.env` left beside the Compose files is auto-loaded just the same, and quietly supplies these values, including the `POSTGRES_USER`, `POSTGRES_PASSWORD` and `POSTGRES_DB` that `.env.example` ships. If you deploy from a clone, keep production values in their own file and name both explicitly on every command:

```sh
docker compose --env-file .env.prod -f docker-compose.prod.sqlite.yml up -d
```

:::

:::caution[Percent-encode Postgres passwords]
`POSTGRES_PASSWORD` is interpolated into a connection URL. A password containing `@`, `/`, `:`, or `#` truncates it, because those are URL delimiters. `openssl rand -hex 32` avoids the problem entirely.
:::

## 3. Start the stack

```sh
docker compose up -d
```

HappyView runs its migrations on first boot, then starts serving on port 3000 inside the container.

Watch it come up:

```sh
docker compose logs -f
```

## 4. Put a reverse proxy in front

HappyView does not terminate TLS, and both Compose files publish to **loopback only** by default (`127.0.0.1:3000`). The proxy in front is what should be exposed.

### Using the bundled Caddy service

Each Compose file ends with a commented-out `caddy` service that handles TLS with certificates obtained and renewed automatically. Uncomment it, along with the `caddy-data` and `caddy-config` entries in the `volumes` block at the bottom, then create a `Caddyfile` beside the Compose file:

```
{$CADDY_DOMAIN} {
    reverse_proxy happyview:3000
}
```

Then, in `.env` and the Compose file:

- Add `CADDY_DOMAIN` to `.env`: the hostname from `PUBLIC_URL` with the scheme stripped, so `happyview.example.com` for `https://happyview.example.com`. `PUBLIC_URL` itself stays the full URL.
- Delete the `ports` block from the `happyview` service. Caddy reaches it over the Compose network, so publishing it to the host as well only widens the exposure. Leave `HTTP_BIND` unset.

Point DNS at the host _before_ the first `up`. Caddy requests a certificate on startup, and a challenge for a hostname that doesn't resolve to this host fails and retries with backoff.

:::caution[Port 80 has to stay open]
It serves the redirect from HTTP to HTTPS *and* the ACME HTTP-01 challenge, which is also how renewal works. Closing it once the first certificate has issued makes renewal fail silently about 60 days later. DNS-01, the usual alternative, isn't available here: the stock `caddy` image ships no DNS provider modules, and adding one means building a custom image with xcaddy.
:::

:::danger[The certificate volume must persist]
`caddy-data` holds the issued certificates and the ACME account key. Without it, every recreate re-issues from scratch. Let's Encrypt allows only 5 duplicate certificates per week before it starts refusing, which locks the site out of HTTPS for days.
:::

### Other options

- **A proxy on the host**: leave the default `ports` block and point nginx, Caddy, or Traefik at `127.0.0.1:3000`
- **Cloudflare Tunnel**: no inbound port needs opening at all. See [Running the development stack](https://github.com/gamesgamesgamesgamesgames/happyview/blob/alpha/CONTRIBUTING.md#running-the-development-stack) in HappyView's CONTRIBUTING.md for how the tunnel is wired up, then set `PUBLIC_URL` to the tunnel's hostname
- **`HTTP_BIND=0.0.0.0:3000`**: publishes on all interfaces. Only do this if something else is firewalling the port, since `ports` bypasses the host firewall on most Docker installs

Whatever you use, `PUBLIC_URL` must match the resulting public URL exactly. To serve HappyView at a subpath alongside other services, see [Reverse proxy subpath](/docs/guides/self-hosting/production#reverse-proxy-subpath). `BASE_PATH` is applied at container start, so prebuilt images work at any subpath without a rebuild.

## 5. Log in

Open `PUBLIC_URL` in a browser. The image serves the dashboard at the root, and a fresh instance opens its setup wizard. Unless `SUPERADMIN_DID` is set, the first handle to authenticate becomes an operator with the [superadmin](/docs/guides/permissions#superadmin) privilege and every permission, so use the handle you want to run the instance. When it is set, only that DID gets the privilege.

An instance ships with no interpreter, so [install one](/docs/reference/scripts/languages#install-an-interpreter) before saving a script. Then [deploy a project](/docs/getting-started/deploying) to it.

## Configuration

Compose hands the container only the variables named in its `environment` block, so a line in `.env` that the file doesn't name has no effect. For the ones it names, override them in `.env`. The [Configuration reference](/docs/reference/configuration) lists every variable with its default. These are the ones the Compose files add or default differently:

| Variable                   | Stack    | Default                                    | Notes                                         |
| -------------------------- | -------- | ------------------------------------------ | --------------------------------------------- |
| `HAPPYVIEW_VERSION`        | Both     | `latest`                                   | Image tag to deploy                           |
| `HTTP_BIND`                | Both     | `127.0.0.1:3000`                           | Host address the container publishes on       |
| `RUST_LOG`                 | Both     | `happyview=info,tower_http=info,sqlx=warn` | Quieter than the server's own default         |
| `POSTGRES_VERSION`         | Postgres | `17`                                       | Image tag for the `postgres` service          |
| `POSTGRES_USER`            | Postgres | `happyview`                                |                                               |
| `POSTGRES_DB`              | Postgres | `happyview`                                |                                               |
| `POSTGRES_MAX_CONNECTIONS` | Postgres | `200`                                      | Raised from the stock 100; see the note below |

To pass another variable, add it to the `environment` block. The SQLite file has a commented-out line for `ATTESTATION_PRIVATE_KEY`. The Postgres file has them for that, `APP_NAME`, `LOGO_URI`, `TOS_URI`, `POLICY_URI`, `PLUGIN_URLS` and the `BACKFILL_CONCURRENT_*` settings.

:::caution[Postgres connection limits]
HappyView opens two pools: the main one (`DATABASE_MAX_CONNECTIONS`) and a separate backfill pool sized `(BACKFILL_CONCURRENT_PDS × BACKFILL_CONCURRENT_DIDS_PER_PDS) + BACKFILL_CONCURRENT_RESOLUTION + 4`, which is 134 on the defaults. Both are lazy, so an idle instance holds almost nothing, but a running backfill peaks near 166, and Postgres's stock limit of 100 would fail it with `sorry, too many clients already`. Raise `POSTGRES_MAX_CONNECTIONS` further if you raise the backfill concurrency or add replicas.
:::

:::danger[Don't override the SQLite DATABASE_URL through the environment]
The SQLite stack sets `DATABASE_URL` to the literal absolute path `sqlite:///data/happyview.db?mode=rwc`, deliberately not interpolated. A relative path (as in `.env.example`) resolves against the image's `/app` working directory, which is the container's writable layer. The database would live outside the volume and vanish on the next `up`. Change the path in the Compose file, not through the environment.
:::

## Operations

### Upgrading

Bump `HAPPYVIEW_VERSION` in `.env`, then:

```sh
docker compose pull
docker compose up -d
```

Migrations run automatically on the new container's first boot. Back up the volume first; see [Backups](/docs/guides/self-hosting/production#backups). If you're coming from v2, read [Upgrading to v3](/docs/guides/upgrading-to-v3) first.

### Health checks

Both stacks ship a container healthcheck. The runtime image carries no `curl` or `wget`, so it probes `/health` over bash's `/dev/tcp`. The SQLite stack allows a 120-second start period, because a `VACUUM` scheduled from the dashboard runs at boot before HappyView binds its listener. The Postgres stack uses 60 seconds, which covers migrations on a first boot. Scheduling a vacuum is rejected there, so there's nothing longer to wait out.

:::caution[A scheduled SQLite VACUUM takes the instance offline]
Reclaiming SQLite disk space is scheduled from **System > Database** in the dashboard and runs on the next boot. `VACUUM` rebuilds the database into a new file, and it runs before HappyView starts listening, so on a large database that's minutes to hours during which nothing is serving. Behind a container healthcheck this can get the process killed mid-rebuild, which the next boot then reports as a crashed attempt. Raise or disable the healthcheck for that one restart.
:::

For an external probe, `GET /health` returns `200 ok` once HappyView can bind its listener, and stays at the domain root even when `BASE_PATH` is set. It doesn't touch the database.

### Stopping and restarting

Both stacks set `init: true`. The entrypoint `exec`s HappyView, making it PID 1, where the kernel drops signals that have only their default disposition, and HappyView installs no `SIGTERM` handler. Without an init, every `stop`, `restart`, and `down` would hang for the full grace period and end in `SIGKILL` (exit 137). `init: true` puts tini at PID 1 to forward the signal so HappyView exits promptly.

This is a _prompt_ exit, not a _graceful_ one: there is no graceful-shutdown handler, so in-flight requests are dropped either way, and an interrupted [job](/docs/getting-started/background-jobs) is re-queued on the next boot.

The Postgres service additionally uses `stop_signal: SIGINT`. Docker's default `SIGTERM` is a Postgres _smart_ shutdown, which waits for every client to disconnect. It would hang for the full grace period and take a `SIGKILL`, leaving the next boot to run crash recovery. `SIGINT` is the fast shutdown: roll back open transactions, checkpoint, exit.

### Logs

Container stdout is the only log sink, capped at 5 × 10 MB per service so `json-file` logs can't grow unbounded. Ship stdout to your usual aggregator if you need retention.

### Backups

The SQLite stack keeps everything in the `happyview-data` volume; the Postgres stack in `pgdata`. Those are the only stateful paths. See [Backups](/docs/guides/self-hosting/production#backups) for what is and isn't recoverable from the network: most records can be re-indexed via [backfill](/docs/guides/backfill), but operators, permissions, API keys, scripts and plugin secrets cannot.

## Next steps

- [Production](/docs/guides/self-hosting/production): what to change for production
- [Hardening](/docs/guides/hardening): locking down a public instance
- [Configuring an instance](/docs/guides/configuration): what to set first
- [Configuration reference](/docs/reference/configuration): every environment variable
- [Deploying](/docs/getting-started/deploying): deploy a project to your instance
