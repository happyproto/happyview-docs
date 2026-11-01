---
title: "Lexicons"
description: "Add a record lexicon to your project and start indexing its collection, then decide whether to backfill."
prerequisites:
  - /docs/getting-started/project-structure
---

This page adds a record lexicon to your project, so your instance starts indexing that collection, and shows the other ways a lexicon can reach an instance.

A lexicon is a schema document. Three kinds matter for building an app:

- A **record lexicon** describes a kind of record. HappyView indexes every record of that collection it sees.
- A **query lexicon** or **procedure lexicon** describes an endpoint. HappyView serves it at `/xrpc/<NSID>`; [Queries and procedures](/docs/getting-started/queries-and-procedures) covers those.

The examples use Statusphere's `xyz.statusphere.status`: a status emoji a user sets on their account.

## Add a record lexicon

A lexicon's file path is its NSID: `xyz.statusphere.status` lives at `src/lexicons/xyz/statusphere/status.json`.

```json
{
  "lexicon": 1,
  "id": "xyz.statusphere.status",
  "defs": {
    "main": {
      "type": "record",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["status", "createdAt"],
        "properties": {
          "status": { "type": "string", "minLength": 1, "maxGraphemes": 1, "maxLength": 32 },
          "createdAt": { "type": "string", "format": "datetime" }
        }
      }
    }
  }
}
```

Save it while `hpy happyview dev` runs. The instance rebuilds and starts listening to Jetstream for `xyz.statusphere.status` records. Each one that arrives is indexed: open **Data > Records** in the local dashboard to watch them come in.

Records arrive only when someone writes one, so the list can stay empty for a while. To see records straight away, backfill the ones already on the network, as the next section shows.

If the `id` doesn't match the path, the build fails and tells you where the file should be.

## Backfill what came before

Indexing starts from now: records written before your instance started listening aren't fetched unless you ask for a **backfill**. Turn it on for a lexicon in `happyview.toml`:

```toml
[lexicons."xyz.statusphere.status"]
backfill = true
```

A backfill finds every account with records in that collection and fetches them from each account's PDS. It runs once per collection: when you deploy, or at an instance's next start, and not again after that. [Backfill](/docs/guides/backfill) covers watching one and running it again.

A local instance doesn't backfill unless you also set `backfill = true` under `[dev]`, so developing doesn't crawl the network every time you start.

## Use a lexicon someone else published

Many lexicons are already published by their authors, such as Bluesky's `app.bsky.feed.post`. You don't need a copy in your project: list it under `[network_lexicons]` and the instance fetches it from the network and keeps it up to date.

```toml
[network_lexicons]
include = ["app.bsky.feed.post"]
```

A network lexicon is indexed like your own, but it never backfills on its own; start one from **Data > Backfills** if you want history. Only lexicons in your project can have record scripts beside them, because a script's path names its lexicon.

## Lexicons added in the dashboard

An operator can also add a lexicon to an instance in the dashboard, under **Data > Lexicons**, or through the admin API. Those **uploaded lexicons** live in that instance's database, not in your project. When a project file and an uploaded lexicon have the same NSID, the project's wins, and the dashboard refuses to change or delete it.

## Removing a lexicon

Delete the file and the instance stops indexing that collection. The records it already indexed stay; deleting them is a separate step under **Data > Records**.

## Next steps

- [Queries and procedures](/docs/getting-started/queries-and-procedures): serve the records you index.
- [Reacting to records](/docs/getting-started/reacting-to-records): run a script when a record in your collection changes.
- [Lexicons reference](/docs/reference/lexicons): every lexicon type, network resolution, and what happens to methods you don't define.
