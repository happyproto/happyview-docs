---
title: "How HappyView fits atproto"
description: "The atproto terms these docs use, and the path a record takes from a user's repository to a HappyView instance."
---

A HappyView instance is an AppView: it indexes atproto records from many repositories and answers your app's queries over them.

## Terms

| Term | Meaning |
| --- | --- |
| DID | An account's permanent identifier, such as `did:plc:ewvi7nxzyoun6zhxrhs64oiz`. A handle, such as `alice.bsky.social`, resolves to a DID. (This is unrelated to the `handle` function that scripts define.) |
| PDS | Personal Data Server: the server that hosts an account's data. Every write to an account goes to its PDS. |
| Repository | An account's data on its PDS: a set of records, each with a URI such as `at://did:plc:…/xyz.statusphere.status/3l2k…`. |
| Record | One item in a repository, such as a status, a post or a like. A lexicon defines its shape. |
| Lexicon | A schema document. A record lexicon describes a kind of record. A query or procedure lexicon describes an XRPC method. |
| NSID | Namespaced identifier: a reversed domain name followed by a name, such as `xyz.statusphere.status`. atproto uses NSIDs to name lexicons, record collections and XRPC methods. |
| Collection | The records of one record lexicon, named by that lexicon's NSID. HappyView indexes by collection. |
| XRPC | atproto's HTTP API convention. A method is called at `/xrpc/<NSID>`: a query with `GET`, and a procedure, which changes state, with `POST`. |
| Jetstream | A live feed of record changes across the network, filterable by collection. HappyView subscribes to it for the collections it indexes. |
| AppView | A service that indexes records from many repositories and answers queries over them. A HappyView instance is an AppView. |
| DPoP | A mechanism that binds a user's OAuth tokens to a key the app holds ([RFC 9449](https://www.rfc-editor.org/rfc/rfc9449)). An app uses it to call an instance as a signed-in user. |

## How a record reaches your app

A record takes this path from a user's PDS to your app:

```mermaid
flowchart TD
  accTitle: How a record reaches your app
  user([A user]) -- writes a record --> pds[(Their PDS)]
  pds -- the change --> jetstream[Jetstream]
  jetstream -- records in collections it indexes --> instance[Your HappyView instance]
  pds -. backfill: records written before .-> instance
  app([Your app]) -- XRPC query --> instance
  app -- XRPC procedure, as the user --> instance
  instance -- writes as the user --> pds
```

1. A user writes a record to their PDS, through your app or any other.
2. Jetstream carries the change, and your instance keeps it if it indexes that collection. Records written before your instance started indexing come in by backfill, which crawls each PDS or replays the Jetstream archive ([Backfill](/docs/guides/backfill)).
3. Your app calls a query on your instance, and reads results from the instance's index.
4. Your app calls a procedure to change something. The instance writes to the user's PDS as that user, and indexes the result without waiting for Jetstream to deliver it.

A project configures steps 2 to 4: which collections are indexed, what each query returns and what each procedure writes.

## Next steps

- [Installation](/docs/getting-started/installation): install `hpy` and create a project.
- [Glossary](/docs/architecture/glossary): the words HappyView v3 uses.
