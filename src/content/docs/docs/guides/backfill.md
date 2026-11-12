---
title: "Backfill"
description: Index the records a collection already has on the network, by crawling PDSes or replaying the Jetstream archive.
---

A backfill indexes the records a collection already has on the network. When you add a record lexicon, HappyView indexes new records from that moment via [Jetstream](https://github.com/bluesky-social/jetstream). A backfill fetches the older ones, by listing accounts from the relay and reading each account's PDS, or by reading the Jetstream archive when you opt in to that.

## When backfill runs

- **Automatically** when a record lexicon is first uploaded with `backfill: true` (the default), if the operator uploading it holds `backfill:create`. A project record lexicon with `backfill = true` gets one backfill, at boot or on deploy, if its collection has never had one. See [Lexicons - Backfill flag](/docs/reference/lexicons#backfill-flag).
- **Manually** via `POST /admin/backfill`, or **New backfill** on the [dashboard](/docs/guides/dashboard)'s **Backfills** page. You can scope a manual backfill to a collection, specific accounts, or both.

See the [admin API](/docs/reference/admin/backfill) for endpoint details.

## Crawl phases

A backfill job starts with a discovery phase and then pipelines resolution and fetching concurrently:

1. **Discovering accounts:** HappyView calls the relay's `com.atproto.sync.listReposByCollection` to find accounts that hold records in each target collection. Each discovered account becomes a work unit for the collection it was listed under, so it is fetched only for that collection. At most `BACKFILL_DISCOVERY_WINDOW` units (50,000 by default) are queued at once: discovery pauses while the queue is full and resumes as units finish, and finished units are deleted. The relay cursor for each collection is saved after every page, so a paused or restarted job carries on where it stopped. A relay page that fails with a connection error, a 5xx response or a body HappyView can't read is tried up to 8 times in all, so retried up to 7 times. Another 4xx response isn't retried, and a 429 is waited out without counting as an attempt (see [Rate limiting](#rate-limiting)). HappyView waits about 1 second, then twice as long each time, up to 60 seconds, with each wait shortened at random to between half and all of that. HappyView honours the relay's `Retry-After`. If the page still fails, that collection's discovery stops at its saved cursor and the job doesn't complete; see [Job lifecycle](#job-lifecycle).
2. **Resolving PDS and fetching records** (pipelined, alongside discovery): As each DID is resolved (via PLC directory or `did:web`), it's immediately handed off for record fetching, so fetching starts before every DID has resolved. HappyView calls `com.atproto.repo.listRecords` on each PDS for the target collection(s), upserting each record into the local database. By default HappyView processes up to 10 PDS hosts at once and 3 accounts per host ([`BACKFILL_CONCURRENT_PDS` and `BACKFILL_CONCURRENT_DIDS_PER_PDS`](/docs/reference/configuration)).

Progress counters (`total_repos`, `resolved_repos`, `processed_repos`, `total_records`) and the current `stage` are updated in real time. The `_repos` counters count work units, so an account discovered under two collections counts twice. The **Backfills** page shows live progress, and clicking a job opens **Backfill details** with a stage-by-stage progress log.

## Record scripts run concurrently

A backfill runs record scripts on several records at once. Within each batch of records it ingests, up to `BACKFILL_HOOK_CONCURRENCY` scripts run together (4 by default, 1 to 32), and a crawl fetches from several accounts at once as well. Records from the live stream still run their scripts one at a time, in the order they arrive.

A record script that runs during a backfill can't assume it's the only script running, or that other records' scripts ran before it. A batch that holds the same record twice runs its scripts one at a time. Records are written in the batch's order, whichever script finishes first.

A record storage can set a limit on how many records it can update at once. If that limit is lower than `BACKFILL_HOOK_CONCURRENCY`, HappyView uses the storage's limit and logs a warning. To run a backfill's record scripts one at a time, set `BACKFILL_HOOK_CONCURRENCY=1`.

## Replay and crawl

A backfill job reads records from one of two sources:

- **Crawl** is the process described above: list accounts from the relay, then fetch each one from its PDS. It is the default.
- **Replay** reads the Jetstream archive. It is an opt-in for collection backfills: one read of the archive replaces a crawl of every PDS.

Replay can only return what the archive holds. In Bluesky's archive, some accounts' history starts later than their first record, so a replay can miss older records that a crawl finds. Use crawl when a backfill must be complete.

Account backfills (a job with `dids`) always crawl. Planning works in whole archive blocks, so replaying a few accounts downloads far more than crawling their PDSes. A job with accounts and `source: "auto"`, or with no `source` while the default is `replay`, runs as a crawl. One with `source: "replay"` is refused with `400`.

`BACKFILL_SOURCE` sets the default, and `POST /admin/backfill` takes a `source` that overrides it for one job. The values are `crawl` (the default), `auto` and `replay`. Unset or unrecognised, it means `crawl`. With `auto`, a collection backfill replays when `JETSTREAM_URL` points at a Jetstream with an archive, and crawls when the archive answers 404 or 501 or can't be reached. It also crawls when the archive asks for a key (401 or 403) and `JETSTREAM_API_KEY` isn't set, and logs once that a key would let it replay. When a key is set and the archive refuses it, the job fails instead. A job created as `replay` fails instead of falling back to a crawl.

A replay job downloads in two sweeps:

1. **Records.** The archive's commits for the job's collections, from the start of the archive to its newest sealed segment.
2. **Accounts.** The account and sync events for the accounts that hold records in those collections, from the last 12 hours of the archive.

Account takedowns, deletions and account resyncs are applied as of when they happened. A takedown from three days ago removes only what the account had at that time, so records it wrote since stay.

The account sweep covers only the archive's newest hours because Jetstream compacts the rest. Compaction (every 4 hours by default) removes the creates and updates that a deleted account or an account resync supersedes, so the records sweep already skips them. Sweeping account events over the whole archive would download many gigabytes for little gain. HappyView asks the archive for its segment list (`listSegments`), finds the first segment that ends within `BACKFILL_REPLAY_MARKER_TAIL_HOURS` (12 by default, three compaction intervals) of the newest one, and starts the account sweep just before it. The job logs where it starts. If the archive doesn't list its segments, or the request fails, the job sweeps the whole archive instead. A resumed job keeps the start it chose.

The 12-hour account sweep has a known cost. Compaction keeps the records of taken-down and suspended accounts. If an account was taken down or suspended before those 12 hours, its records are replayed and stay indexed. A reactivation from before then doesn't lift a takedown HappyView recorded earlier. Records HappyView held before the job, from an earlier crawl or from before a gap in the live stream, aren't removed by an account deletion or account resync from before then either. If you run a self-hosted Jetstream with compaction turned off, set `BACKFILL_REPLAY_MARKER_TAIL_HOURS=0` to sweep account events over the whole archive, since nothing there is compacted away.

Each record goes through the same checks as a crawled one: the record script runs, and the record's CID is checked against its body. A record that fails the check is skipped and logged.

**Backfill details** shows `seq {n} of {tip}` while it runs, along with the bytes downloaded and any failed blocks. A block that can't be downloaded or decoded after retries is recorded as a `replay_block` error. `POST /admin/backfill/{id}/retry-failed` starts a new job that fetches only those blocks, then applies the account events of every account those blocks wrote records for, so a later takedown still removes them. See [Retry failed](/docs/reference/admin/backfill#retry-failed).

A replay job stops and fails rather than run on through an archive outage. Each request is retried first. A 502, 504 or other server error, or no answer at all, is retried 6 times over about 30 seconds, and a 503 is retried 5 times, waiting out its `Retry-After`. The job stops after 16 blocks in a row that the archive didn't answer, or answered with an HTTP error after those retries. Its error reads `the archive failed 16 blocks in a row; stopping (resume to continue)`. A block that arrives but doesn't decode, or is over a size cap, is recorded and skipped instead, and doesn't count towards the 16. A job also stops when a failed block can't be recorded, since a block that isn't recorded could never be retried. Either way it stops before it moves past the blocks in question.

A failed replay job can be resumed like a paused one: it carries on from where it stopped, without downloading again what it had finished. Two exceptions need a new backfill instead. A job that stopped because its error log is full (10,000 failures) stops again on every resume. An account replay job from an older version can't be resumed once its account list is gone, which happens when its details are cleared.

Replay needs a Jetstream that serves the v2 archive. Bluesky's hosted archive, which the default `JETSTREAM_URL` points at, requires a key: without `JETSTREAM_API_KEY`, `auto` jobs crawl and `replay` jobs fail. If `JETSTREAM_API_KEY` is set, it is sent to the archive and nowhere else. Replay jobs spool each segment to `BACKFILL_REPLAY_DIR` while they decode it, up to 1 GiB per segment.

Bluesky's hosted archive meters each key by the bytes it serves: about 1 GB at once, then about 2 MB per second. It advertises that quota on its responses, and HappyView paces every replay request to it, shared across every job using the key. Past the first gigabyte a replay downloads at about 2 MB/s however high `BACKFILL_REPLAY_CONCURRENCY` is set, so raising it doesn't speed replay up there. When the archive answers 429 anyway, every replay request waits out its `Retry-After` and tries again, for as long as it takes. Only a request that stays throttled for 15 minutes fails, and counts towards the 16 failed blocks above. A Jetstream that advertises no quota, such as a self-hosted one, isn't paced.

### Gaps in the live stream

When the live stream falls further behind than Jetstream keeps, Jetstream refuses the saved cursor (`CursorTooOld`). With `BACKFILL_SOURCE` set to `auto` or `replay`, HappyView replays the gap from the archive instead of skipping it. It resumes the live stream at the archive's newest sealed segment right away, and a replay job fills in the records between. The `jetstream.gap` event names that job in `replay_job_id`. If the archive can't be reached, or doesn't plan the gap within 30 seconds, HappyView resumes the live stream without filling the gap, and a [backfill](#when-backfill-runs) is the way to recover what was missed. With `BACKFILL_SOURCE=crawl`, the default, gaps are never replayed.

### Rate limiting

Crawl discovery, resolution and fetching all handle HTTP 429 responses. HappyView reads the `RateLimit-Reset` header (a Unix timestamp, the atproto convention) to determine how long to wait, falling back to the `retry-after` header, then to 5 seconds. It waits at most 2 minutes at a time. Replay paces itself to the archive's quota instead; see [Replay and crawl](#replay-and-crawl).

## Job lifecycle

A backfill job has both a `status` (overall state) and a `stage` (current phase):

| Status       | Description                                          |
| ------------ | ---------------------------------------------------- |
| `running`    | Job is actively processing                           |
| `pausing`    | Pause requested, waiting for the worker to stop      |
| `paused`     | Worker has stopped; resume to carry on               |
| `cancelling` | Cancel requested, waiting for the worker to stop     |
| `cancelled`  | Worker has stopped and cleaned up                    |
| `completed`  | Worker finished processing all resolvable accounts   |
| `failed`     | An error occurred                                    |

The `stage` field tracks which phase the job is in: `pending`, `discovering_repos`, `resolving_and_fetching`, `discovery_incomplete`, `completed`, `failed`, or `cancelled`. A replay job moves through `replaying` (records), `replaying_accounts` (account events) and, in a retry job, `retrying_blocks`.

If a job runs out of work while accounts it could not complete are still queued, HappyView pauses it rather than marking it completed. It records why in the job's `error`, for example "paused: 3 units could not be completed; resume to retry". The dashboard shows such a job as **paused automatically** with that reason. Resuming it retries the queued accounts.

A crawl whose discovery stopped short is paused the same way, once it has fetched every account it found. That happens when the relay kept failing for a collection's next page. The job's `stage` is `discovery_incomplete`, and its `error` names the collections, for example "paused: discovery did not finish for app.bsky.graph.follow; resume to continue from the saved cursor (see the backfill.discovery_failed events)". Resuming it continues discovery from each collection's saved relay cursor. Each failed page is logged as `backfill.discovery_failed`, and the pause as `backfill.discovery_incomplete`.

In HappyView 3.0.0-beta.10 and earlier, a failed relay page ended that collection's discovery, and the job still completed. Such a job reports the collections it didn't finish, with their relay cursors, in `discovery_unfinished`. **Backfill details** shows **Discovery stopped early** with a **Continue discovery** action, which starts a new crawl of each collection from its saved cursor. The completed job stays as it is. The same is available as [`POST /admin/backfill`](/docs/reference/admin/backfill#create-a-backfill-job) with `collection` and `relay_cursor`.

## Cancelling a job

Running and paused jobs can be cancelled via `POST /admin/backfill/{id}/cancel` or **Cancel** in **Backfill details**. Cancellation is two-phase:

1. The endpoint sets the job status to `cancelling`.
2. The worker checks for cancellation between relay pages, about every 10 DIDs during resolution, and after each account during fetching. When it detects the `cancelling` status, it stops work and sets the final status to `cancelled`.

The job stops at the worker's next check, so it keeps running briefly after you click **Cancel**.

## Resuming after restart

Backfill jobs survive restarts. On startup, HappyView checks for jobs that were running when the instance last stopped:

- **Running** jobs are re-spawned and resume from where they left off. Discovery continues from each collection's saved relay cursor, queued accounts keep their resolved PDS, and finished accounts have already left the queue. An account cut short by the restart is fetched again; re-fetching an unchanged record does not rewrite it. So is an account whose fetch was waiting to be retried, for example after a rate limit or a PDS error: retries are saved, and a resumed or restarted job queues them again. Each one queued again counts towards `total_repos` once more, as its fetch counts towards `processed_repos`.
- **Cancelling** jobs (where the cancel was requested but the worker hadn't stopped yet) are immediately finalised as `cancelled`.
- **Pausing** jobs are immediately finalised as `paused`.

The queue is kept in the database, so a job that was halfway through fetching records picks up from the next queued account rather than starting over.

## Re-running backfills

Re-running a backfill for a collection that's already been backfilled is safe, whichever source it uses. Each record is upserted by its AT URI, so existing records are refreshed in place and any new records discovered since the last run are added. This also picks up accounts that have started writing to the collection since the previous backfill.

## Restoring deleted records

Deleting records from HappyView (via the dashboard or API) only removes them from the local database, and the records still exist on the atproto network. To restore deleted records, create a backfill for the affected collection. A crawl discovers the accounts again and fetches every record from each PDS, restoring any that were deleted.

## Removing records deleted on the network

If a record is deleted while HappyView isn't tracking its collection, the delete never reaches HappyView, and HappyView keeps serving the record. A backfill doesn't fix this, because a backfill only adds and updates records.

To find these records, open the collection on the dashboard's **Records** page and choose **Check against PDSes**. HappyView compares each account's stored records with what its PDS lists, and counts a record as missing only after the PDS confirms it's gone. **Report only** is ticked by default, so the first run lists the missing records and changes nothing. Untick it to delete them as well, which needs `records:delete`. The same check is available as [`POST /admin/records/collection/reconcile`](/docs/reference/admin/records#reconcile-a-collection).

Accounts whose PDS can't be read, or whose PDS lists far fewer records than HappyView stores, are skipped. The collection must be indexed, because indexing is what applies the deletes.

Each delete runs the collection's `record.delete` script, which can keep the record. If the script fails, the record is kept too. The record's own delete can arrive from the live stream while the check runs, so a `record.delete` script can run twice for one record. Write delete scripts to be safe to run more than once.

## Diagnostics

**Backfill details** has an expandable section for each processing phase. Clicking a phase row reveals per-account and per-PDS detail data in real time.

### Per-account tracking

A backfill keeps a bounded queue of the accounts it is working on, counters for its progress, a per-PDS summary and its 1,000 most recently fetched accounts. A crawl shows these in three expandable sections:

- **Discovering accounts:** the accounts queued right now, with profile avatars and handles resolved from the Bluesky API. The count beside it is everything discovered so far, labelled "accounts found so far" until discovery finishes.
- **Resolving PDS:** the PDS endpoints involved in the job, with how many accounts each PDS holds and how many have been processed.
- **Fetching records:** the most recently fetched accounts with their record counts.

A replay job has no accounts to list, so it shows its seq progress instead of these sections. Jobs created by an older version keep their row-per-account detail until it is cleared.

All three sections update in real time via SSE (Server-Sent Events) while the job is running.

### Record scripts

When a collection has a record script, the **Record scripts** row counts the records it has run on. Its detail reads, for example, "120 failed (4 timed out) · 15 in Dead Letters", and "2% of time in scripts" says how much of each record's time went on the script. Timeouts are among the failures, and the Dead Letters count links to the [Dead Letters](/docs/guides/event-logs#dead-letters) page.

### Network store backfills

On an instance reading the network store, a backfill of a collection the store holds shows **Network store** as its source. It has no crawl phases, and **In the network store** shows how many records the store holds for the collection. **Backfill details** offers **Pause** and **Resume** but no **Cancel** on these backfills, because the store restarts a cancelled or failed one, within about a minute unless it failed because the database keeps refusing its records (below).

If the instance's database can't store some of a network store backfill's records, for example because its connection pool is full, the backfill keeps running. It asks the database again after 1 second, then twice as long each time up to 30 seconds. Once the database answers, the backfill sends again only the records it couldn't store. A database that doesn't answer is waited for as long as it takes.

Record scripts run before a record is stored, so a record that couldn't be stored has already run its script. It runs its script once more each time it is sent again, usually once. Every record that was stored the first time runs its script once. Pausing a backfill while it waits makes it read that page again when you resume it, so that page's stored records run their scripts again too.

If the database answers but refuses the same records 5 times in a row, as a read-only or full database would, the backfill fails with "The Network store answers but keeps refusing this collection's records, so the backfill stopped." It starts again by itself 10 minutes later, and after twice as long for each such failure in a row, up to 6 hours. If it keeps failing, contact HappyProto.

Write record scripts to be safe to run twice. See [Create scripts may run more than once](/docs/reference/scripts/idempotency).

### Data retention

Per-account detail data is retained after job completion for later diagnosis. A background task runs daily and deletes the detail rows of jobs that finished more than 28 days ago, along with any accounts a cancelled or failed job left queued. The 28 days are configurable via **System > General**, or the `BACKFILL_RETENTION_DAYS` environment variable. Set to `0` to keep data indefinitely.

You can also manually clear detail data:

- **Per-job**: **Clear details** in the footer of **Backfill details**. A job created by an older version can be cleared whenever it isn't running; any other job only once it is completed, cancelled or failed, since its queue is work it still has to do.
- **All finished jobs**: **Clear all details** in the **Backfills** page header clears every completed, cancelled and failed job.

Both actions require the `backfill:create` permission.

## Next steps

- [Lexicons](/docs/reference/lexicons#backfill-flag): Control whether lexicons trigger backfill on upload
- [Admin API: Backfill](/docs/reference/admin/backfill): Full reference for backfill endpoints
