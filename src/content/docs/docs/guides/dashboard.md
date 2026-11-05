---
title: "Dashboard"
description: A tour of the dashboard's pages and what each one manages on an instance.
---

The dashboard is a web interface to most of the [admin API](/docs/reference/admin/admin-api). The instance serves it itself, and you sign in with atproto OAuth. The sidebar shows only the pages your [permissions](/docs/guides/permissions) allow.

On a fresh instance the dashboard opens a setup wizard, which covers the [service identity](/docs/guides/service-identity) and ends with the [telemetry](/docs/guides/telemetry) question. With no operators in the database and no `SUPERADMIN_DID` set, the first person to sign in is made an operator with the superadmin privilege and every permission. Sign in first with the handle you want to run the instance.

## Data

### Lexicons

Navigate to **Lexicons** to see every lexicon the instance holds. Each entry shows the NSID, type (record, query, procedure), source, and more. Once the instance has somewhere to [publish lexicons](/docs/guides/publishing-lexicons), the table adds its publishing columns.

#### Adding a lexicon

Click **Add Lexicon** and choose **Local** or **Network**.

**Local** lexicons are defined by you, in the **Lexicon JSON** editor. A query or procedure lexicon's script is written separately, on the [Scripts](#scripts) page or as a file in a [project](/docs/getting-started/project-structure).

For a record lexicon, **Index records from the network** decides whether the instance ingests its collection, and **Enable backfill for lexicon** indexes its existing records as well.

**Network** lexicons are fetched from the atproto network. Enter an NSID (e.g. `xyz.statusphere.status`) and HappyView resolves it automatically. If found, the lexicon JSON is displayed in a read-only editor. Click **Add** to track it. See [Lexicons: Network lexicons](/docs/reference/lexicons#network-lexicons) for how resolution works.

#### JSON editor

The JSON editor validates against the atproto Lexicon v1 schema as you type, and requires the top-level `lexicon`, `id` and `defs.main`. It completes definition types (`record`, `query`, `procedure`, `subscription`), property types (`string`, `integer`, `boolean`, `ref`, `union`, `blob`, `cid-link`, etc.) and schema structure (`defs`, `main`, `properties`, `required`).

### Records

Navigate to **Records** to browse all indexed atproto records. Pick a collection to list its records. Each record shows its AT URI, author DID, and the raw record JSON.

### Spaces

Navigate to **Spaces** to view the instance's [atproto spaces](/docs/guides/spaces). The page needs `spaces:read`, and appears only while the [space inspector](/docs/guides/spaces#moderating-spaces) is on. It lists each space's **Name**, **Type**, **Creator** and **Created** date. To open one account, enter its DID and click **Open account**.

A space's page shows its details, **Members** and **Collections**. With `spaces:inspect`, its **Records** card offers **Request access**. The **Request access** dialog asks for **Access to**, a **Reason** and a **Duration**, and **Grant access** opens the records. A banner then shows the reason and the time left, with **End access** to end it early.

An account's page lists the spaces it is a member of or writes to. Its **Records** card works the same way, for that account's records in every space. Every grant and every read under it is written to the [event log](/docs/guides/event-logs#space-events).

:::note[Pending on alpha]
The space inspector pages come from pull requests [#350](https://github.com/gamesgamesgamesgamesgames/happyview/pull/350) and [#371](https://github.com/gamesgamesgamesgamesgames/happyview/pull/371), which haven't merged into `alpha` yet.
:::

### Backfills

Navigate to **Backfills** to view and manage backfills. Click **New backfill** to start one for any record lexicon's collection. The table shows each backfill's collection, accounts, status and start time. Click a row to open **Backfill details**, with its **Source** (such as **Crawl**, **Replay** or **Network store**), its progress, and how its **Record scripts** ran. Progress updates in real time. A running backfill can be cancelled or paused from there: it shows "cancelling" while the worker finishes its current batch, then "cancelled". See [Backfill](/docs/guides/backfill) for how the process works.

### Jobs

Navigate to **Jobs** to view [background jobs](/docs/getting-started/background-jobs), with their status, input, progress and result. The page needs `jobs:read`.

### Dead Letters

Navigate to **Dead Letters** to view record and label events whose script failed every attempt. Each entry shows the URI, the action, the error, the number of attempts and the record. You can **Retry**, **Re-index** or **Dismiss** selected entries or everything matching the filter. The sidebar badge shows the count of unresolved dead letters. See [Dead letters](/docs/guides/event-logs#dead-letters).

## Access

### Users

Navigate to **Users** to manage who can access the admin API and dashboard. You can add operators by DID, assign permissions individually or via a template (**Viewer**, **Maintainer**, **Manager** or **Full Access**), and remove them. The operator with superadmin is marked **Owner** and has every permission; **Transfer Ownership** moves it to another operator. See [Permissions](/docs/guides/permissions) for what each permission grants.

### Linked Repos

Grant the instance OAuth access to a repo, and mint the invite that lets its account holder approve it. See [Linked repos](/docs/guides/linked-repos).

### API Keys

Create and revoke admin API keys for automation. Each key is scoped to specific permissions and tied to the operator who created it. See [API Keys](/docs/guides/api-keys) for details.

### API Clients

Register and manage API clients. Each client gets an `hvc_…` client key and `hvs_…` client secret. You can configure the client type (confidential or public), allowed origins, scopes, and per-client rate limits. See [Authentication: API client identification](/docs/reference/authentication#xrpc-api-client-identification) for how clients are used.

## Integrations

### Scripts

Navigate to **Scripts** to list, create and edit the instance's scripts. A row is marked when no installed interpreter can run it. A script that still reads v2 globals offers **Migrate**; see [Migrating scripts to v3](/docs/guides/migrating-scripts). A script's own page shows a summary of its [performance](#script-performance).

The Lua editor offers completion, hover and signature help from the declarations the interpreter provides, so it covers the libraries installed on the instance. See [Scripts](/docs/getting-started/scripts) for how a script is written.

### Script performance

Navigate to **Script performance** to see how often each script runs, how long it takes, and how much of that time is the script's own. The page needs `metrics:read`, which every template holds.

The **1h**, **24h**, **7d** and **30d** buttons pick the window. The first two are held in memory and cover this instance's runs alone. They're saved once a minute, so a restart reloads the last day. The other two are read from the database and summed over every instance sharing it. Stored metrics are kept for as long as event logs (`event_log_retention_days`, 30 days by default), and the page says so when that is shorter than the window.

- **Scripts** lists each script with its **Kind** and **Source** (**Project file** or **Dashboard**), **Runs**, **p50**, **p95**, **Max**, **Errors**, **Timeouts**, **Memory peak**, and **Code · host**. **Code · host** is the mean time in the script's own code, then waiting on the host calls it made. It holds up to 1,024 scripts, and the page counts any more that weren't recorded.
- Clicking a script opens its detail: the same figures, **Instructions per run**, graphs over the window, and **Where a run’s time goes**.
- **Record pipeline** lists what each record costs on its way in, by collection: **Records**, **Rate**, **p50**, **p95**, **Script vs platform**, **Stage means**, **Failed**, **Timeouts** and **Dead-lettered**.

Setting `script_metrics_enabled` to `false` stops recording new runs, and the page shows a warning. What was recorded stays until it leaves its window.

### Plugins

Manage installed plugins and configure plugin secrets. Plugin secrets are encrypted at rest and need `TOKEN_ENCRYPTION_KEY`. See [Plugins](/docs/guides/plugins) for details.

### Labelers

Configure labeler subscriptions for content labeling. See [Labelers](/docs/guides/labelers) for details.

## System

### General

Configure instance-level settings:

- **Instance Identity**: the instance's name, URI, logo, terms of service and privacy policy, shown on OAuth authorization screens.
- **Data Retention**: how long a finished backfill's details are kept.
- **Backfill Performance**: the concurrency of a backfill.
- **Scripts**: **Instruction limit** and **Request wall clock (seconds)**.
- **Space Inspector**: **Enable Space Inspector**, and **Maximum Access Length (minutes)**, the longest access an operator can request. See [Moderating spaces](/docs/guides/spaces#moderating-spaces).
- **Event Logs**: **Event Log Retention (days)**, **Space Access Log Retention (days)** for [protected events](/docs/guides/event-logs#protected-events), verbose logging and, with `events:purge`, **Purge Event Logs**.

Most can also be set through the environment, and a dashboard value takes precedence. Each field shows where its value came from. A field a [hosting platform fixes](/docs/reference/configuration#settings-a-hosting-platform-fixes) is marked "set by your hosting provider", and a save never sends it. **Maximum Access Length (minutes)** and **Space Access Log Retention (days)** are then read-only. The [Configuration reference](/docs/reference/configuration#instance-settings) lists the keys.

:::note[Pending on alpha]
The **Space Inspector** card, **Space Access Log Retention (days)** and the "set by your hosting provider" mark come from pull request [#371](https://github.com/gamesgamesgamesgamesgames/happyview/pull/371), which hasn't merged into `alpha` yet.
:::

### Database

Shows storage use and the instance's write-ahead log checkpoints. On SQLite, **Reclaim disk space** schedules a one-time `VACUUM`; see [Database setup](/docs/guides/database/database-setup#after-the-upgrade) for when you need one.

### Telemetry

Choose whether the instance sends reports and what they contain, and read the exact report first. See [Telemetry](/docs/guides/telemetry).

### Service Identity

Configure the atproto service identity for your HappyView instance: a `did:web` derived from your public URL, a `did:plc` you control, or an attached atproto account. The service identity determines the DID that signs service-level interactions on the network. See [Service identity](/docs/guides/service-identity).

### Lexicon Publishing

Set the rules that publish your lexicons to the network. See [Publishing lexicons](/docs/guides/publishing-lexicons).

### OAuth Keys

List, rotate and revoke the keys the instance signs OAuth requests with. See [OAuth keys](/docs/reference/admin/oauth-keys).

### XRPC Proxy

Control which unrecognized XRPC methods are forwarded, and where. Choose from four modes: **Disabled** (block all proxy requests), **Open** (proxy everything, the default), **Allowlist** (only proxy NSIDs matching your patterns), or **Blocklist** (proxy everything except matching patterns). Allowlist and blocklist modes accept NSID patterns with trailing wildcards (e.g. `com.example.*`). Locally registered lexicons are always served regardless of this setting. See [Hardening](/docs/guides/hardening#lock-down-the-xrpc-proxy) for how to choose, and [XRPC Proxy](/docs/reference/admin/xrpc-proxy) for the API.

### ENV Variables

Manage script variables, which every script receives as `ctx.env` at run time. They hold shared configuration and secrets, such as API tokens, without hardcoding them in a script; values are encrypted at rest and shown masked. Despite the page's name, these aren't the instance's environment variables. See [Script variables](/docs/reference/admin/script-variables).

### Event Logs

View the [event log](/docs/guides/event-logs). Events include operator changes, lexicon uploads, permission changes, backfill starts, and more. Each entry shows the event type, severity, actor, subject, and timestamp.

A `space.access_granted` event lists the **Reads under this grant**, with **Load more** for a long list.

### Experiments

Toggle experimental feature flags for your instance, such as `feature.spaces_enabled`, which turns on atproto spaces and is off by default. See [Feature flags](/docs/reference/admin/feature-flags).

## About

The **About** page shows the current HappyView version and instance configuration: public URL, database backend, Jetstream URL, relay URL, and PLC directory URL. It also shows the Jetstream connection's protocol, host, compression and lag.

## Next steps

- [Lexicons](/docs/getting-started/lexicons): how lexicons drive HappyView's indexing and routing
- [Scripts](/docs/getting-started/scripts): write custom query and procedure logic
- [Permissions](/docs/guides/permissions): manage operator access to admin features
- [Configuration reference](/docs/reference/configuration): every environment variable
