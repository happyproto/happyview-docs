---
title: "Test"
description: "Run HappyView's test suites and CI checks locally, from unit tests to the browser tests."
---

Run these checks from the root of a checkout set up as in [Develop](/docs/contributing/develop). To test an app built on HappyView instead, see [Testing](/docs/getting-started/testing).

## Checks and their local commands

The checks below are the ones CI runs on `beta`, and the **Required to merge** column holds for pull requests into `beta`. `release/v2` runs a subset of the checks: it has no `e2e-tests-sqlite`, `lua-differential` or `portability` job, and its `lint` job runs only `cargo fmt` and the first `cargo clippy` command. Into `release/v2`, the required checks are `unit-tests`, `e2e-tests`, `frontend`, `playwright`, `lint`, `docs-moved` and `v2-guard`.

| CI check | Required to merge | Run it locally |
| --- | --- | --- |
| `lint` | Yes | [Lint](#lint) |
| `unit-tests` | Yes | [Unit tests](#unit-tests) |
| `e2e-tests` | Yes | [End-to-end tests](#end-to-end-tests), on Postgres |
| `e2e-tests-sqlite` | No | [End-to-end tests](#end-to-end-tests), on SQLite |
| `lua-differential` | No | [Lua differential test](#lua-differential-test) |
| `frontend` | Yes | [Dashboard](#dashboard) |
| `playwright` | No | [Browser tests](#browser-tests) |
| `portability` | No | [Portability](#portability) |
| `test-<package>` | Yes, except `test-nsid` | [SDK packages](#sdk-packages) |
| `audit` | No | `cargo audit`, after `cargo install cargo-audit` |
| `Spaces interop` workflow | No | [Interop tests](#interop-tests) |
| `DCO` | Yes | [Sign off every commit](/docs/contributing/develop#sign-off-every-commit) |
| `docs-moved` | Yes | Nothing to run. It fails when a change adds or modifies a file under `docs/` or `packages/docs/`, because HappyView's docs live in their own repositories |

Some checks that aren't required to merge still gate a release. [The release gate](/docs/contributing/release#the-release-gate) lists the gate for each branch.

CI runs a job only when the files it covers change. The path filters are in the `changes` job of `.github/workflows/ci.yml`, which lists the server's files and, for each `test-<package>` check, the files that trigger it.

On `beta`, a draft pull request skips every job except `audit` and the SDK package tests, and `e2e-tests` fails until the pull request is marked ready. See [Open a pull request](/docs/contributing/develop#open-a-pull-request).

## Missing prerequisites fail

A test that needs a database, a built plugin fixture or an interpreter plugin fails when that prerequisite is missing, and its message names what is missing and how to get it. To run without them, set `HAPPYVIEW_ALLOW_SKIPS=1` and those tests skip instead.

A test written for one database backend still skips on the other, since nothing is missing.

## Lint

```sh
cargo fmt -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo clippy --workspace --all-targets --features testkit -- -D warnings
cargo clippy --features lua-reference --all-targets -- -D warnings
bash scripts/check-no-native-lua.sh
bash scripts/check-no-openssl.sh
bash scripts/stamp-version.test.sh
```

| Script | Fails when |
| --- | --- |
| `check-no-native-lua.sh` | A default build links a Lua interpreter. Scripts run in an interpreter plugin, and the native Lua runtime exists only behind the `lua-reference` feature |
| `check-no-openssl.sh` | Anything in the dependency graph pulls in OpenSSL or `native-tls`. TLS comes from rustls |
| `stamp-version.test.sh` | `scripts/stamp-version.sh`, which writes a release's version into the manifest, stops behaving as its test expects |

CI also runs `bash scripts/check-migration-drift.sh release/v2 main` after fetching those two branches. It fails when a migration that `release/v2` or `main` ships is missing from your branch or differs from it, unless `migrations/renumbered.tsv` records that the file moved to another version.

## Unit tests

Unit tests need no database and no fixtures:

```sh
HAPPYVIEW_ALLOW_SKIPS=1 cargo test --lib
HAPPYVIEW_ALLOW_SKIPS=1 cargo test --workspace --exclude happyview
cargo test --features lua-reference --lib --test codemod_cases
```

The third command runs the tests gated behind `lua-reference`, the feature that compiles the native Lua runtime. Building it compiles Lua from C, so it needs a C toolchain.

## End-to-end tests

The end-to-end tests need a database, the plugin fixtures and the interpreter plugins.

1. Build the plugin fixtures, which are WebAssembly modules under `tests/fixtures/`:

   ```sh
   bash scripts/build-plugin-fixtures.sh
   ```

2. Fetch the pinned interpreter plugins and point the tests at them:

   ```sh
   bash scripts/fetch-lua-plugin.sh
   export HAPPYVIEW_LUA_PLUGIN=tests/fixtures/lua-plugin
   bash scripts/fetch-quickjs-plugins.sh
   export HAPPYVIEW_JAVASCRIPT_PLUGIN=tests/fixtures/javascript-plugin
   export HAPPYVIEW_TYPESCRIPT_PLUGIN=tests/fixtures/typescript-plugin
   ```

   Each script downloads a pinned release from `happyproto/plugins` and checks its hash, so a local run loads the same modules CI does.

3. Start the test database, which listens on port 5433:

   ```sh
   docker compose -f docker-compose.test.yml up -d
   ```

4. Run the suite:

   ```sh
   TEST_DATABASE_URL=postgres://happyview:happyview@localhost:5433/happyview_test cargo test --tests
   ```

5. Stop the database:

   ```sh
   docker compose -f docker-compose.test.yml down
   ```

To check that every prerequisite is in place before a run, use `bash scripts/check-plugin-fixtures.sh --require`, `bash scripts/check-lua-plugin.sh --require` and `bash scripts/check-quickjs-plugins.sh --require`. Each names what is missing.

### On SQLite

The same suite runs on SQLite when `TEST_DATABASE_URL` names a SQLite file. Run it when a change touches SQL, migrations or the write path:

```sh
dir=$(mktemp -d)
TEST_DATABASE_URL="sqlite://$dir/e2e.db?mode=rwc" cargo test --tests -- --test-threads=1
```

### When a run fails without naming the cause

A few targets read a plugin fixture directly rather than through the prerequisite check, so an unbuilt fixture can fail many tests without saying why. `external_storage` is one: without `test_library`, many of its tests panic. Build the fixtures first:

```sh
bash scripts/build-plugin-fixtures.sh
```

A fresh worktree has no built fixtures until you do.

In a worktree created inside the main checkout, such as under `.worktrees/`, the build can fail with "current package believes it's in a workspace when it's not". Cargo walks up from the fixture to the parent checkout's `Cargo.toml`, whose `workspace.exclude` may lack a fixture your branch added. Create the worktree outside the checkout, with `git worktree add ../my-branch -b my-branch`, or bring the parent checkout's `Cargo.toml` up to date with your branch.

### Measure storage and ingest cost

For a change that affects storage or ingest cost, measure it with `scripts/measure-backfill-storage.sh [dids-file] [collection]`. It backfills a fixed list of repos, `scripts/measure-backfill-dids.txt` by default, into a fresh SQLite database. It reports the write-ahead log's peak size, the database size and, on Linux, the bytes the server wrote; elsewhere `write_bytes` reads `unavailable`.

The script reaches the real PLC directory and PDSes, so results vary over time. Run it on your branch and on `beta` back to back, and put both summaries in the pull request. The storage settings it exercises are in [Configuration](/docs/reference/configuration).

### The provider conformance cases

The record-provider conformance cases build only with the `testkit` feature, so the run above leaves them out:

```sh
TEST_DATABASE_URL=postgres://happyview:happyview@localhost:5433/happyview_test cargo test --features testkit --test conformance
```

### Shards

CI splits the suite into two shards per database. `scripts/e2e-shard.sh` computes them from `cargo metadata`, so a local run can reproduce one:

```sh
bash scripts/e2e-shard.sh --list 2
cargo test $(bash scripts/e2e-shard.sh 1 2)
```

### Coverage

The Postgres shards run under [`cargo-llvm-cov`](https://github.com/taiki-e/cargo-llvm-cov), and the `coverage` job merges their reports and uploads them to Coveralls. No coverage threshold blocks a merge. To produce the report locally:

```sh
cargo install cargo-llvm-cov
rustup component add llvm-tools
TEST_DATABASE_URL=postgres://happyview:happyview@localhost:5433/happyview_test cargo llvm-cov --workspace --open
```

## Interop tests

The atproto spaces interop tests run HappyView against other PDS implementations. The `Spaces interop` workflow runs them against the PDS images pinned in `interop/images.env`. It runs on a pull request or a push to `main`, `beta` or `alpha` that changes the atproto spaces code, the interop tests or their Compose files; the full path list is in the workflow's `on` block. It also tests each new upstream PDS image on its own, so a failure there can come from the upstream change rather than yours. Each PDS has its own Compose file and ignored test targets:

| PDS | Compose file | Test target |
| --- | --- | --- |
| The Bluesky reference PDS with permissioned data | `docker-compose.spaces-alpha.yml` | `spaces_reference_interop` |
| atproto-pds | `docker-compose.atproto-pds.yml` | `spaces_atproto_pds_interop` |
| pds.js | `docker-compose.pdsjs.yml` | `spaces_pdsjs_interop` and `spaces_migration_e2e` |
| ZDS | `docker-compose.zds.yml` | `spaces_zds_interop` |

```sh
docker compose --env-file interop/images.env -f docker-compose.zds.yml up -d --wait
cargo test --test spaces_zds_interop -- --ignored --nocapture
docker compose -f docker-compose.zds.yml down -v
```

`spaces_migration_e2e` also needs `TEST_DATABASE_URL`, as in the [end-to-end tests](#end-to-end-tests).

## Lua differential test

This test runs each case through the Lua interpreter plugin and through the native Lua runtime, and compares the results. It's ignored by default because it's slow. To run it:

```sh
bash scripts/build-plugin-fixtures.sh differential_library
bash scripts/fetch-lua-plugin.sh
export HAPPYVIEW_LUA_PLUGIN=tests/fixtures/lua-plugin
TEST_DATABASE_URL="sqlite://$(mktemp -d)/differential.db?mode=rwc" cargo test --features lua-reference --test lua_differential -- --ignored --nocapture
```

## Dashboard

Run these in `web/`:

```sh
npm ci
npm run format:check
npm test
NEXT_PUBLIC_BASE_PATH=/__HAPPYVIEW_BP__ npm run build
```

The `frontend` job also checks that the release binary carries the dashboard. It builds the library tests with the `embedded-dashboard` feature, moves `web/out` aside, and runs the `dashboard::` tests, which pass only if the dashboard is compiled in. From the repository root, after the build above:

```sh
bin=$(cargo test --release --features embedded-dashboard --lib --no-run --message-format=json \
  | jq -r 'select(.profile.test == true and .target.kind[0] == "lib") | .executable' | tail -1)
mv web/out web/out.aside
"$bin" dashboard::
mv web/out.aside web/out
```

## Browser tests

Playwright drives the whole stack in Docker: HappyView behind Caddy, its own Postgres, a PLC directory and a PDS.

```sh
bash scripts/fetch-lua-plugin.sh
docker compose -f docker-compose.e2e.yml down -v
docker compose -f docker-compose.e2e.yml up -d --build --wait
cd web && npx playwright install chromium && npx playwright test
```

:::caution[Two setup steps the run depends on]
The stack bind-mounts `tests/fixtures/lua-plugin`, which `fetch-lua-plugin.sh` fills. Without it Docker mounts an empty directory, every script save is refused, and `globalSetup` stops the run.

Run `down -v` first, because the database init script runs only when the volume is new. On a reused volume the PDS and PLC containers crash-loop, and the first-run setup specs find setup already done.
:::

## Portability

The `portability` job builds the static musl binary, which no other job compiles, and starts it from an empty directory until `/health` answers. That shows the binary carries its migrations and needs no system OpenSSL. To build it locally on Debian or Ubuntu:

```sh
sudo apt-get install -y musl-tools
rustup target add x86_64-unknown-linux-musl
cargo build --locked --bin happyview --target x86_64-unknown-linux-musl
```

## SDK packages

Each of the five SDK packages has its own check: `test-oauth-client`, `test-oauth-client-browser`, `test-oauth-client-node`, `test-lex-agent` and `test-nsid`. Run one from the repository root, with the package's name in place of `@happyview/oauth-client`:

```sh
bun install
bun run --filter '@happyview/oauth-client' build
bun run --filter '@happyview/oauth-client' typecheck
bun run --filter '@happyview/oauth-client' test
```

`@happyview/oauth-client-browser`, `@happyview/oauth-client-node` and `@happyview/lex-agent` depend on `@happyview/oauth-client`, so build it first.
