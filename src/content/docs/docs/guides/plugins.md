---
title: Plugins
description: Install plugins from the registry, a URL, environment variables or the file system, and configure their secrets.
---

Plugins are WebAssembly modules that HappyView loads. Interpreters run scripts in one language, and libraries are what a script loads with `require("happyview.*")`.

The official plugins are built in the [plugins](https://github.com/happyproto/plugins) repository and published to the HappyProto plugin registry. Releases built before capability declarations, including earlier official plugin releases, are refused at install; pick a release whose manifest has `api_version` `"2"`.

## Installing plugins

### From the registry

HappyView reads its plugins from a registry of `software.release` records, `https://api.happyproto.at` by default. Each plugin there is a project: a publisher's DID and a project name, such as `did:plc:mo7vq4jbioxwafy5zkcc3eux` and `happyview-lua`. HappyView refreshes its copy of the registry every 15 minutes.

1. Go to **Integrations > Plugins**
2. Click **Add plugin**
3. Pick a plugin from the registry
4. Choose a channel
5. Review the plugin details and the capabilities it asks for
6. Click **Install**
7. Configure any required secrets on the installed plugin's **Settings** tab

To install one without the dashboard, see [`POST /admin/plugins`](/docs/reference/admin/plugins#install-a-plugin) with `registry`.

#### Channels

A project publishes up to three channels: `latest` for releases, and `beta` and `alpha` for prereleases. An install follows a channel, `latest` by default, and is offered an update whenever the channel moves to another version that may be installed. Pin an install to one version instead and it is never offered one. **Switch channel** on an installed plugin moves it to another channel's version and follows that channel from then on.

#### Lifecycle states

The publisher sets every version's state, and can change it after publishing:

| State | Installable | What it means |
|-------|-------------|---------------|
| `active` | yes | The normal state |
| `deprecated` | yes | Still works, but the publisher would rather you moved on; the dashboard shows their reason |
| `unavailable` | no | The publisher no longer distributes it |
| `retired` | no | The publisher no longer supports it |

A version is also refused when the registry doesn't hold its files, or when the registry has flagged it as suspect because its record changed after it was published. A project can be retired as a whole; the registry listing hides it from **Add plugin**.

A lifecycle state never turns a plugin off. A plugin whose installed version is later retired keeps running, and the dashboard marks it in red with the publisher's reason. When a channel moves to a version that can't be installed, nothing is offered, and the dashboard says why.

#### Verified by CID

Each registry version names its manifest and its module by CID. HappyView fetches both from the registry and refuses either one whose bytes don't match its CID, naming both CIDs in the error. The CIDs are stored with the install, so a reload or a restart fetches the same bytes and checks them again; if the registry starts serving something else, the plugin isn't loaded. A registry install takes no `sha256`: its CIDs do that job.

#### Capabilities on update

Installing, updating or switching channel each show the capabilities the incoming version would be granted, and ask you to accept them before it replaces what is running. A version that asks for something you didn't accept is refused, and the installed version keeps running.

#### Publishers

An install records its project's publisher. Updates come only from that publisher, even when another publisher's project shares the plugin's name in the registry; to move a plugin to another publisher's project, remove it and add it again.

#### Turning the registry off

Set `PLUGIN_REGISTRY_URL` to `off`, or to an empty value, to stop HappyView reading the registry. The registry isn't read, **Add plugin** offers only URL installs, and installed plugins are offered no updates. Point it at another URL to read another registry.

Turning the registry off doesn't cut a plugin installed from the registry off from it. Each registry install stores the `getArtifact` URLs its manifest and module were fetched from, and fetches them again, checked against their CIDs, at every boot and reload. The registry it came from is a boot dependency for that plugin: while it can't be reached, the plugin isn't loaded. Changing `PLUGIN_REGISTRY_URL` doesn't move stored installs either; they keep fetching from the registry they were installed from. To run with no registry at all, install your plugins from URLs or the file system instead.

### From a URL

**Add plugin** also takes the URL of a plugin's `manifest.json` or `.wasm` file, or any other URL that answers with a manifest, for a plugin you host yourself or one that isn't in the registry. A URL install is checked against the `sha256` you give it, if any. A URL names no project, so it is offered no updates until it is matched to one.

A plugin installed from a URL, by the dashboard or `PLUGIN_URLS`, is matched to the official publisher's registry project with the plugin's id at each registry refresh. A matched plugin follows that project's channel from then on: the prerelease channel its version was published on (`alpha` for `1.1.0-alpha.2`) when the project has one, and `latest` otherwise. Until its first update installs it from the registry by CID, it is offered only versions newer than the one installed. One no project matches is marked **Unresolved**, keeps working as a URL install, and is offered no updates; it is matched again at every refresh, so it attaches if its project is published later. To get updates sooner, remove it and add it from the registry.

### Via environment variables

Set `PLUGIN_URLS` to load plugins at startup:

```
PLUGIN_URLS=example-search|https://example.com/plugins/example-search/manifest.json
```

Format: `id|url` or `id|url|sha256:hash` (comma-separated for multiple).

A `PLUGIN_URLS` plugin is registered from its environment URL at every boot. It is matched to its registry project like any URL install, but an update installed through the registry lasts only until the next restart, which loads the environment URL again. Install plugins that are in the registry through the registry instead, and keep `PLUGIN_URLS` for plugins you host yourself.

### Default plugins

Set `HAPPYVIEW_DEFAULT_PLUGINS` to give a new instance plugins it starts with, such as an interpreter:

```
HAPPYVIEW_DEFAULT_PLUGINS=https://example.com/plugins/lua/manifest.json
```

Each comma-separated source is installed once, as if an operator added it from that URL and accepted every capability its manifest declares; listing it is the operator's consent. The sources applied are recorded in the instance settings under `default_plugins.applied`, so a default plugin an operator uninstalls stays uninstalled, and one already installed under the same id is left as it is. A source that can't be fetched or installed is logged as a warning and tried again at the next boot. The installs run in the background after boot, each given up on after two minutes, so they never hold up the instance.

### Via file system

Place plugins in the `./plugins/` directory, or the directory `PLUGIN_DIR` names, one subdirectory per plugin:

```
plugins/
  example-search/
    manifest.json
    plugin.wasm
```

## Plugin configuration

Plugins may require secrets, such as API keys and client credentials. Set them in the dashboard or as environment variables.

### Dashboard configuration

Open the plugin from **Integrations > Plugins** and enter its secrets on its **Settings** tab. These are encrypted using AES-256-GCM and stored in the database.

**Requires:** `TOKEN_ENCRYPTION_KEY` environment variable (base64-encoded 32-byte key).

Generate one with:

```bash
openssl rand -base64 32
```

### Environment variables

Set secrets as environment variables with the `PLUGIN_<ID>_` prefix, where `<ID>` is the plugin's id upper-cased with every non-alphanumeric character replaced by `_`. A plugin with the id `example-search` reads `PLUGIN_EXAMPLE_SEARCH_API_KEY`:

```bash
PLUGIN_EXAMPLE_SEARCH_API_KEY=your-api-key
```

These are only necessary if you can't configure secrets in the dashboard. Dashboard-configured secrets take precedence: once any secret for a plugin is saved in the dashboard, HappyView reads none of that plugin's secrets from the environment.

## Security

- Plugins run in isolated WebAssembly environments.
- A plugin reaches only the host functions its declared [capabilities](/docs/reference/plugin-sdk#capabilities) cover, and you accept those at install.
- OAuth tokens and secrets are encrypted at rest using AES-256-GCM.
- Plugin KV storage is isolated per plugin and per user.
- Plugins cannot access the host filesystem.

## Next steps

- [Developing plugins](/docs/guides/developing-plugins): create your own plugins
- [Official plugins repository](https://github.com/happyproto/plugins): the source of the official plugins
- [Plugins admin API](/docs/reference/admin/plugins): install, update and switch plugins by registry project
- [API keys](/docs/guides/api-keys): authenticate programmatic access to admin endpoints
- [Permissions](/docs/guides/permissions): configure operator access to plugin management
