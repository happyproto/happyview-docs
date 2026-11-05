---
title: Native binary
description: Run HappyView from a release archive, with its dashboard and migrations built in.
---

Every v3 alpha release publishes a self-contained `happyview` binary for macOS (Apple silicon and Intel) and Linux (x86_64 and arm64, glibc and static musl). It carries its dashboard and its database migrations, so it needs nothing beside it but a database. There is no Windows build.

1. Open the [releases page](https://github.com/gamesgamesgamesgamesgames/happyview/releases) and pick the newest `v3.0.0-alpha.*` prerelease. Stable releases are v2 and don't carry these archives.
2. Download `happyview-<target>.tar.xz` and the `.sha256` file beside it. On Linux, the `musl` build runs on any distribution; the `gnu` build needs glibc 2.35 or later.
3. Check the archive and extract it:

   ```bash
   shasum -a 256 -c happyview-<target>.tar.xz.sha256
   tar -xJf happyview-<target>.tar.xz
   cd happyview-<target>
   ```

4. Start HappyView:

   ```bash
   DATABASE_URL="sqlite://$PWD/data/happyview.db?mode=rwc" \
   PUBLIC_URL=http://127.0.0.1:3000 \
   SESSION_SECRET="$(openssl rand -base64 48)" \
   ./happyview
   ```

5. Confirm it's serving. `curl http://127.0.0.1:3000/health` answers `ok`.

The startup log warns that no interpreter is installed. Install one before saving any script ([Languages](/docs/reference/scripts/languages#install-an-interpreter)), and set `TOKEN_ENCRYPTION_KEY` before you sign an app in ([Production](/docs/guides/self-hosting/production#token-encryption-key)). The session secret in the command above changes on every run, so keep yours in a file for a real instance.

The archive also holds `happyview-codemod`, `migrate-lua-sql` and `migrate-space-cids`; [Other binaries](/docs/reference/cli#other-binaries) describes them.

The dashboard is served from inside the binary, and `BASE_PATH` is applied to it as it is served. Set `STATIC_DIR` to serve a different build from disk instead. HappyView does not rewrite files read from a directory, so that build has to be exported for the subpath you serve it under. The Docker image rewrites its own copy at startup, which is why `BASE_PATH` works there. A `STATIC_DIR` that is set but empty counts as unset.

If your instance has no outbound network, set `PLUGIN_REGISTRY_URL=off` so it doesn't try to read the official registry.
