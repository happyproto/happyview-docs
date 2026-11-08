# HappyView docs

The words the happyview.dev docs use, and the ones they don't. This is the writers' list: the site's own Glossary page (`src/content/docs/docs/architecture/glossary.mdx`) defines these terms for readers and must agree with it, and `test/glossary.test.ts` fails the build when an avoided word appears in v3 docs prose.

## Things you run and build

**Instance**:
One running HappyView server, self-hosted or on HappyProto.
_Avoid_: server, tenant, deployment, AppView (for the server)

**Project**:
The directory holding `happyview.toml` and `src/` that is deployed to an instance.
_Avoid_: app, workspace, project (for a HappyProto project)

**HappyProto project**:
A container in the HappyProto dashboard that holds one instance today and other services later. Always written with "HappyProto"; your project deploys to the instance in a HappyProto project.

**App**:
The reader's own product, which talks to an instance.
_Avoid_: client (for the product), AppView (for the product)

**AppView**:
The atproto role an instance plays: a service that indexes records from the network and answers queries about them. Used only for the atproto concept.

**Service entry**:
A service an instance publishes in its DID document, and the id other services use to address it.

**Third-party API client**:
A child API client an app creates through `dev.happyview.createApiClient`.

## People and privileges

**Operator**:
A person who signs in to an instance's dashboard or admin API to run it.
_Avoid_: super user, superadmin (for a person), owner (for a person running an instance), admin user, user (for an operator)

**User**:
A person signed in to an app with their atproto account. The dashboard's **Users** page lists operators, not users.
_Avoid_: user (for an operator), end user, member (outside spaces)

**Permission**:
One named thing an operator is allowed to do on an instance, such as `lexicons:create`.

**Template**:
A named starting set of permissions an operator can be given: Viewer, Maintainer, Manager or Full Access. Written with "template" ("the **Maintainer** template"). Maintainer was called Operator, which clashed with the person; the admin API still accepts `operator`.
_Avoid_: the Operator template

**Superadmin**:
The privilege of holding every permission, which can't be restricted. Usually one operator holds it; a transfer moves it from one operator to another.
_Avoid_: super user, owner, root

**Space inspector**:
The dashboard pages and admin routes an operator uses to read private space contents while handling a report. Off by default.

**Access grant**:
Time-limited permission for one operator to read one space's contents, or one account's records in every space, given with a reason.

## Data

**Lexicon**:
A schema document describing a record type, a query or a procedure.
_Avoid_: schema (alone), lexicon file

**NSID**:
A lexicon's id, such as `xyz.statusphere.status`.

**Record lexicon**, **query lexicon**, **procedure lexicon**:
A lexicon named by its `main` type.

**Project lexicon**:
A lexicon defined by a file under a project's `src/lexicons/`.

**Network lexicon**:
A lexicon an instance fetches from its authority on the network and keeps up to date.

**Uploaded lexicon**:
A lexicon added to an instance through the dashboard or the admin API.
_Avoid_: local lexicon, manual lexicon (except quoting the dashboard's **Local** tab or the API's `manual` source)

**Account**:
An atproto identity with its own repository, as the dashboard's backfill form and progress name it. Backfill prose says "accounts"; `repos` stays only in API field names and the linked repos feature.

**Collection**:
The set of records of one record lexicon, named by that lexicon's NSID.
_Avoid_: collection (for the lexicon itself), table

## Backfills

**Backfill**:
Indexing the records a collection already has on the network, rather than waiting for new ones to arrive.
_Avoid_: store pass, import, sync

**Crawl**:
A backfill that lists accounts from the relay and fetches each account's records from its PDS.

**Replay**:
A backfill that reads the Jetstream archive.
_Avoid_: rewind

**Network store**:
The shared copy of public atproto records every HappyProto instance reads from.
_Avoid_: shared store, record store (for the network store; HappyView's own storage layer is record storage)

## Scripts

**Script**:
A program an instance runs when something happens. It defines `handle(input, ctx)`.
_Avoid_: hook, handler (for the script), function

**Query script**, **procedure script**, **record script**, **label script**, **job script**:
A script named by what triggers it: an XRPC query, an XRPC procedure, a record created, updated or deleted, a label applied, or a background job picked up.
_Avoid_: record hook, event handler, create hook

**Script variable**:
A named value a script reads from `ctx.env`, managed on the dashboard's **ENV Variables** page. It isn't an environment variable, which configures the instance.

**Script stats**:
What a backfill's records cost in record scripts. The API's field names, `hooks` and `hook_stats`, are older than this term.

**Trigger**:
What makes a script run, written as an id such as `record.create:xyz.statusphere.status`.

**Language**:
What a script is written in: Lua, JavaScript or TypeScript. Presented as equals.

## Plugins

**Plugin**:
Any WebAssembly add-on an instance loads.
_Avoid_: extension, add-on, WASM plugin (in prose)

**Interpreter**:
A plugin that runs scripts written in one language.
_Avoid_: runtime, VM, engine

**Library**:
A plugin a script loads with `require("happyview.*")`.
_Avoid_: module (for a library), package

**Auth plugin**:
A plugin that lets a user link an account on another platform, such as Steam or itch.

**Capability**:
One thing a plugin declares it needs to do, shown to the operator before installing it.
_Avoid_: permission (for a plugin)

**Registry**:
Where plugins are published and installed from.
_Avoid_: marketplace, store, catalogue (except as the dashboard's label)

**Channel**:
A named release line in the registry, such as `alpha`.

## Docs structure

**Getting started**, **Guides**, **Operating**, **Reference**, **Architecture**:
The docs' sections, written in sentence case. Getting started teaches building an app, in order. Guides are for one job while building. Operating is for running an instance. Reference owns every key, flag and field.

## Releases

**v3 beta**:
The state of HappyView v3 while it is cut as `3.0.0-beta.N` prereleases from the `beta` branch, before it ships stable. The interpreters and libraries are still published on the registry's `alpha` channel only (as of 2026-11-07), which is a plugin channel and not a HappyView branch. Prose names the branch or the channel, not a version number.
