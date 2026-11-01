---
title: "Backfill"
---

A backfill indexes the records a collection already has on the network. When you add a record lexicon, HappyView indexes new records from that moment via [Jetstream](https://github.com/bluesky-social/jetstream). A backfill fetches the older ones, by listing accounts from the relay and reading each account's PDS, or by reading the Jetstream archive when you opt in to that.

## When backfill runs

- **Automatically** when a record lexicon is first uploaded with `backfill: true` (the default), if the operator uploading it holds `backfill:create`. A project record lexicon with `backfill = true` gets one backfill, at boot or on deploy, if its collection has never had one. See [Lexicons - Backfill flag](/docs/reference/lexicons#backfill-flag).
- **Manually** via `POST /admin/backfill`, or **New backfill** on the [dashboard](/docs/guides/dashboard)'s **Backfills** page. You can scope a manual backfill to a collection, specific accounts, or both.

:::note[Pending happyview#319]
The dashboard labels on this page match [happyview#319](https://github.com/gamesgamesgamesgamesgames/happyview/pull/319), which is pending.
:::

See the [admin API](/docs/reference/admin/backfill) for endpoint details.

## How it works

A backfill job starts with a discovery phase and then pipelines resolution and fetching concurrently:

1. **Discovering accounts:** HappyView calls the relay's `com.atproto.sync.listReposByCollection` to find accounts that hold records in each target collection. Each discovered account becomes a work unit for the collection it was listed under, so it is fetched only for that collection. At most `BACKFILL_DISCOVERY_WINDOW` units (50,000 by default) are queued at once: discovery pauses while the queue is full and resumes as units finish, and finished units are deleted. The relay cursor for each collection is saved after every page, so a paused or restarted job carries on where it stopped.
2. **Resolving PDS and fetching records** (pipelined, alongside discovery): Resolution and fetching run concurrently. As each DID is resolved (via PLC directory or `did:web`), it's immediately handed off for record fetching, so fetching starts before every DID has resolved. HappyView calls `com.atproto.repo.listRecords` on each PDS for the target collection(s), upserting each record into the local database. By default HappyView processes up to 10 PDS hosts at once and 3 accounts per host ([`BACKFILL_CONCURRENT_PDS` and `BACKFILL_CONCURRENT_DIDS_PER_PDS`](/docs/reference/configuration)).

Progress counters (`total_repos`, `resolved_repos`, `processed_repos`, `total_records`) and the current `stage` are updated in real time. The `_repos` counters count work units, so an account discovered under two collections counts twice. The **Backfills** page shows live progress, and clicking a job opens **Backfill details** with a stage-by-stage progress log.

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

This has a known cost. Compaction keeps the records of taken-down and suspended accounts. If an account was taken down or suspended before those 12 hours, its records are replayed and stay indexed. A reactivation from before then doesn't lift a takedown HappyView recorded earlier. Records HappyView held before the job, from an earlier crawl or from before a gap in the live stream, aren't removed by an account deletion or account resync from before then either. Set `BACKFILL_REPLAY_MARKER_TAIL_HOURS=0` to sweep account events over the whole archive. Do that for a self-hosted Jetstream with compaction turned off, where nothing is compacted away.

Each record goes through the same checks as a crawled one: the record script runs, and the record's CID is checked against its body. A record that fails the check is skipped and logged.

**Backfill details** shows `seq {n} of {tip}` while it runs, along with the bytes downloaded and any failed blocks. A block that can't be downloaded or decoded after retries is recorded as a `replay_block` error. `POST /admin/backfill/{id}/retry-failed` starts a new job that fetches only those blocks, then applies the account events of every account those blocks wrote records for, so a later takedown still removes them. See [Retry failed](/docs/reference/admin/backfill#retry-failed).

A replay job stops and fails rather than run on through an archive outage. Each request is retried first: a 502, 504 or other server error, or no answer at all, is retried 6 times over about 30 seconds, and a 503 is retried 5 times, waiting out its `Retry-After`. It stops after 16 blocks in a row that the archive didn't answer or answered with an HTTP error after those retries, with the error `the archive failed 16 blocks in a row; stopping (resume to continue)`. A block that arrives but doesn't decode, or is over a size cap, is recorded and skipped instead, and doesn't count towards the 16. A job also stops when a failed block can't be recorded, since a block that isn't recorded could never be retried. Either way it stops before it moves past the blocks in question.

A failed replay job can be resumed like a paused one: it carries on from where it stopped, without downloading again what it had finished. Two exceptions need a new backfill instead. A job that stopped because its error log is full (10,000 failures) stops again on every resume. An account replay job from an older version can't be resumed once its account list is gone, which happens when its details are cleared.

Replay needs a Jetstream that serves the v2 archive. Bluesky's hosted archive, which the default `JETSTREAM_URL` points at, requires a key: without `JETSTREAM_API_KEY`, `auto` jobs crawl and `replay` jobs fail. If `JETSTREAM_API_KEY` is set, it is sent to the archive and nowhere else. Replay jobs spool each segment to `BACKFILL_REPLAY_DIR` while they decode it, up to 1 GiB per segment.

Bluesky's hosted archive meters each key by the bytes it serves: about 1 GB at once, then about 2 MB per second. It advertises that quota on its responses, and HappyView paces every replay request to it, shared across every job using the key. Past the first gigabyte a replay downloads at about 2 MB/s however high `BACKFILL_REPLAY_CONCURRENCY` is set, so raising it doesn't speed replay up there. When the archive answers 429 anyway, every replay request waits out its `Retry-After` and tries again, for as long as it takes. Only a request that stays throttled for 15 minutes fails, and counts towards the 16 failed blocks above. A Jetstream that advertises no quota, such as a self-hosted one, isn't paced.

Crawl is what runs by default, for every account backfill, and for `auto` jobs when the Jetstream has no archive HappyView may use.

### Gaps in the live stream

When the live stream falls further behind than Jetstream keeps, Jetstream refuses the saved cursor (`CursorTooOld`). With `BACKFILL_SOURCE` set to `auto` or `replay`, HappyView replays the gap from the archive instead of skipping it. It resumes the live stream at the archive's newest sealed segment right away, and a replay job fills in the records between. The `jetstream.gap` event names that job in `replay_job_id`. If the archive can't be reached, or doesn't plan the gap within 30 seconds, HappyView resumes the live stream without filling the gap, and a [backfill](#when-backfill-runs) is the way to recover what was missed. With `BACKFILL_SOURCE=crawl`, the default, gaps are never replayed.

### Rate limiting

Crawl discovery, resolution and fetching all handle HTTP 429 responses. HappyView reads the `RateLimit-Reset` header (a Unix timestamp, the atproto convention) to determine how long to wait, falling back to the `retry-after` header, then to 5 seconds, and it waits at most 2 minutes at a time. Replay paces itself to the archive's quota instead; see [Replay and crawl](#replay-and-crawl).

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

The `stage` field tracks which phase the job is in: `pending`, `discovering_repos`, `resolving_and_fetching`, `completed`, `failed`, or `cancelled`. A replay job moves through `replaying` (records), `replaying_accounts` (account events) and, in a retry job, `retrying_blocks`.

If a job runs out of work while accounts it could not complete are still queued, HappyView pauses it rather than marking it completed, and records why in the job's `error` (for example "paused: 3 units could not be completed; resume to retry"). The dashboard shows such a job as **paused automatically** with that reason. Resuming it retries the queued accounts.

## Cancelling a job

Running and paused jobs can be cancelled via `POST /admin/backfill/{id}/cancel` or **Cancel** in **Backfill details**. Cancellation is two-phase:

1. The endpoint sets the job status to `cancelling`.
2. The worker checks for cancellation between relay pages, about every 10 DIDs during resolution, and after each account during fetching. When it detects the `cancelling` status, it stops work and sets the final status to `cancelled`.

There may be a short delay between clicking **Cancel** and the job fully stopping, depending on what the worker is doing at that moment.

## Resuming after restart

Backfill jobs survive restarts. On startup, HappyView checks for jobs that were running when the instance last stopped:

- **Running** jobs are re-spawned and resume from where they left off. Discovery continues from each collection's saved relay cursor, queued accounts keep their resolved PDS, and finished accounts have already left the queue. An account cut short by the restart is fetched again; re-fetching an unchanged record does not rewrite it.
- **Cancelling** jobs (where the cancel was requested but the worker hadn't stopped yet) are immediately finalised as `cancelled`.
- **Pausing** jobs are immediately finalised as `paused`.

The queue is kept in the database, so a job that was halfway through fetching records picks up from the next queued account rather than starting over.

## Re-running backfills

Re-running a backfill for a collection that's already been backfilled is safe, whichever source it uses. Each record is upserted by its AT URI, so existing records are refreshed in place and any new records discovered since the last run are added. This also picks up accounts that have started writing to the collection since the previous backfill.

## Restoring deleted records

Deleting records from HappyView (via the dashboard or API) only removes them from the local database, and the records still exist on the atproto network. To restore deleted records, create a backfill for the affected collection. A crawl discovers the accounts again and fetches every record from each PDS, restoring any that were deleted.

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

On an instance reading the network store, a backfill of a collection the store holds shows **Network store** as its source. It has no crawl phases, and **In the network store** shows how many records the store holds for the collection. Pending [happyview#319](https://github.com/gamesgamesgamesgamesgames/happyview/pull/319), **Backfill details** offers **Pause** and **Resume** but no **Cancel** on these backfills, because the store restarts a cancelled or failed one within about a minute.

### Data retention

Per-account detail data is retained after job completion for later diagnosis. A background task runs daily and deletes the detail rows, and any accounts left queued by a cancelled or failed job, of jobs that finished more than 28 days ago (configurable via **System > General**, or the `BACKFILL_RETENTION_DAYS` environment variable). Set to `0` to keep data indefinitely.

You can also manually clear detail data:

- **Per-job**: **Clear details** in the footer of **Backfill details**. A job created by an older version can be cleared whenever it isn't running; any other job only once it is completed, cancelled or failed, since its queue is work it still has to do.
- **All finished jobs**: **Clear all details** in the **Backfills** page header clears every completed, cancelled and failed job.

Both actions require the `backfill:create` permission.

## Next steps

- [Lexicons](/docs/reference/lexicons#backfill-flag): Control whether lexicons trigger backfill on upload
- [Admin API: Backfill](/docs/reference/admin/backfill): Full reference for backfill endpoints
