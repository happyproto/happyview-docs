---
title: "Quickstart"
description: "Install hpy, create a project and call its starter query on a local instance."
---

[Installation](/docs/getting-started/installation) and [Running locally](/docs/getting-started/running-locally) explain steps 1 to 3 in more detail.

You need macOS or Linux (on Windows, use WSL), and the DID of an atproto account to develop with. Use a test account, because the local instance writes to that account's real PDS. [pds.rip](https://pds.rip) issues sandbox accounts.

1. Install `hpy` from its `beta` channel, then check it:

   ```sh
   brew install happyproto/tap/hpy-beta
   hpy --version
   ```

   For the install script and other package managers, see [Install hpy](/docs/getting-started/installation#install-hpy).

2. Create a project:

   ```sh
   hpy happyview create --name my-app
   ```

   `create` asks for a **Superadmin DID** (your test account's DID), **Interpreters** (keep the default, Lua), **Libraries** (none are needed here) and an **App name** (it defaults to `my-app`). It then prints:

   ```text
   created /home/you/my-app

     cd my-app
     hpy happyview dev
   ```

   The project contains a query lexicon, `src/lexicons/com/example/hello.json`, and the Lua script that answers it, `hello.lua`.

3. Run the project as a local instance:

   ```sh
   cd my-app
   hpy happyview dev
   ```

   The first run downloads HappyView and the project's plugins. When the instance is ready, `dev` prints:

   ```text
   happyview dev: serving /home/you/my-app at http://127.0.0.1:3000
   dashboard: http://127.0.0.1:3000/dashboard/
   writes from this instance go to your real PDS and the live network, where any instance indexing the same collections, including your production one, will index them; use `hpy happyview dev --network local` to keep test writes private
   ```

   Leave it running.

4. In another terminal, call the starter query:

   ```sh
   curl 'http://127.0.0.1:3000/xrpc/com.example.hello?name=Ada'
   ```

   ```text
   {"message":"Hello, Ada!"}
   ```

   Without `name`, the query answers `{"message":"Hello, world!"}`. Edit `hello.lua` and save it, and the next request runs the new version.

## Next steps

- [Running locally](/docs/getting-started/running-locally): what `dev` reloads, where it keeps data, and its options, including a local atproto network.
- [Installation](/docs/getting-started/installation): every install method, each `create` prompt, and the files `create` writes.
