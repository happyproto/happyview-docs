---
title: "Telemetry"
description: "What a self-hosted HappyView sends when you turn telemetry on, where it goes, and how to turn it off."
---

Telemetry is off unless you turn it on. When it's on, an instance sends a JSON report about itself to `https://telemetry.happyview.dev/v1/snapshot`, either when you press a button or once a day. **System > Telemetry** shows the exact report before anything leaves the instance. Reports never carry records, scripts, secrets or setting values.

## Turn telemetry on or off

The page and its settings need the `settings:manage` permission. The admin API has the same controls under [Telemetry](/docs/reference/admin/telemetry).

1. Open **System > Telemetry**.
2. Read **Exactly what would be sent**. It's assembled from the instance as it stands, under the current settings.
3. Under **What this instance shares**, pick one option. It saves at once.

| Option | API `mode` | What happens |
| --- | --- | --- |
| **Don't send anything** | `off` | Nothing is sent. This is the default. |
| **Review each report before sending** | `manual` | Nothing is sent until you press **Send and compare**. |
| **Send automatically, once a day** | `auto` | The instance sends one report a day. The first goes at its next daily slot, up to 24 hours away. |

4. Optionally, fill in **Contact** and turn on the switches under **Lexicon detail**. Both are disabled while the option is **Don't send anything**.

To turn telemetry off, pick **Don't send anything**. The instance id, contact and lexicon switches stay stored but aren't sent, and apply again if you turn reporting back on.

The setup wizard asks the same question, and the dashboard prompts an operator on an instance where nobody has answered it. Declining counts as an answer, so you're not asked again.

## Report contents

Every report carries these fields:

| Field | Contents |
| --- | --- |
| `schema_version`, `reported_at`, `report_mode`, `happyview_version`, `process_started_at` | The report's format, its time, the mode, the running version and when the process started |
| `instance_id` | A random UUID created the first time reporting is turned on |
| `totals` | Lifetime counts: records, rows in tables such as `jobs`, `lexicons`, `spaces` and `users`, the event log's counts for some event types, restarts and job runtime |
| `since_start` | Counts since the process started: Jetstream events received, matched and skipped, HTTP bytes in and out, XRPC requests, script runs and runtime, job wait time |
| `features` | For lexicons, scripts, jobs, plugins, labelers, spaces, linked repos, API clients and API keys: whether each has ever been used, and whether it's in use now |
| `host` | CPU cores, memory use and limit, whether the instance runs in a container, network bytes, database and write-ahead log size, free disk, the last vacuum's status, when this version first booted, the names of the setting keys HappyView defines that are set, and a count of any other keys |
| `lexicons` | The number of lexicons, and the share of records in the largest collections, as numbers with no names |

A measurement HappyView can't read, or that takes over 10 seconds, is left out of that report.

Four more are opt-in, and each is separate. Sharing structure doesn't share names.

| Setting | Field | Contents |
| --- | --- | --- |
| **Contact** | `contact` | The text you enter, up to 512 characters |
| **Lexicon names** | `lexicons.names` | The NSIDs of the instance's collections |
| **Lexicon structure** | `lexicons.structures` | Counts for each lexicon: definitions by type, how often each schema type occurs, fields, nesting depth. No names, descriptions or `ref` targets |
| **Full lexicon documents** | `lexicons.documents` | The complete lexicon JSON, up to 512 KiB between them. `lexicons.documents_omitted` counts any left out |

## When a report fails

A manual send that doesn't reach the collector shows `Couldn't reach the telemetry collector. Nothing was sent.` An automatic one logs `telemetry snapshot failed` at warn level and waits for the next day. The instance gives the collector 15 seconds and doesn't follow redirects.

`TELEMETRY_COLLECTOR_URL` points reports at another collector; see the [Configuration reference](/docs/reference/configuration#logging-retention-and-telemetry).

A collector can answer with a comparison. After **Send and compare**, the page says how many instances of a similar size you're compared against, or that there aren't enough yet.

## Instances run by a hosting platform

A hosting platform can require reporting by setting `TELEMETRY_MANAGED_BY`. The instance then sends a report every day whatever **System > Telemetry** says, and the report's `managed` field names the platform. The report covers the instance only: the contact and all three lexicon details are left out. The page says so, disables the mode choice and hides the contact and lexicon settings, and the admin API answers `409` to any change. Self-hosted instances leave this variable unset. If the platform removes it, the stored settings apply again.
