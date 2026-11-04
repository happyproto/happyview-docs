---
title: "Overview"
description: "The JavaScript packages for apps that sign users in to a HappyView instance and call it, and which one to use."
---

These JavaScript packages let your app sign users in to a HappyView instance and make XRPC requests on their behalf.

| Package                                                                                       | Purpose                                                                                                                    |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| [`@happyview/lex-agent`](https://npmx.dev/package/@happyview/lex-agent)                       | Recommended: type-safe XRPC via [`@atproto/lex`](https://npmx.dev/package/@atproto/lex) `Client` with HappyView DPoP auth |
| [`@happyview/oauth-client`](https://npmx.dev/package/@happyview/oauth-client)                 | Platform-agnostic core: DPoP key provisioning, session management, authenticated fetch                                    |
| [`@happyview/oauth-client-browser`](https://npmx.dev/package/@happyview/oauth-client-browser) | Browser OAuth client whose API matches `@atproto/oauth-client-browser`                                                     |
| [`@happyview/oauth-client-node`](https://npmx.dev/package/@happyview/oauth-client-node)       | Node.js OAuth client for server-side apps, matching `@atproto/oauth-client-node`                                           |
| [`@happyview/nsid`](https://npmx.dev/package/@happyview/nsid)                                 | AT Protocol NSID validation                                                                                                |

## Choosing a package

- For a new app, use `@happyview/lex-agent` with `@atproto/lex`. It gives you type-safe XRPC calls through a `Client` that routes requests to your HappyView instance with DPoP authentication.
- If you already use `@atproto/api`, `HappyViewSession` works directly as a session manager for `@atproto/api`'s `Agent`: pass it to `new Agent(session)`. See [Using with @atproto/api](/docs/reference/sdk/oauth-client-browser#using-with-atprotoapi).
- If you already use `@atproto/oauth-client-browser`, switch to `@happyview/oauth-client-browser`. Its `HappyViewBrowserClient` matches the API of `@atproto/oauth-client-browser`, and runs the atproto OAuth flow itself with HappyView's DPoP key provisioning and session registration added.
- For a server-side (Node.js) app, use `@happyview/oauth-client-node`. It handles handle resolution, DID resolution, PDS discovery, and the full OAuth flow server-side, and matches the API of `@atproto/oauth-client-node`.
- For anything more custom, use `@happyview/oauth-client` directly and provide your own `StorageAdapter`.

## How it works

Third-party apps authenticate using HappyView's [DPoP key provisioning](/docs/reference/authentication#dpop-key-provisioning-for-third-party-apps) flow:

1. The SDK requests a DPoP keypair from the HappyView instance.
2. Your app runs a standard atproto OAuth flow with the user's PDS using that keypair.
3. The SDK registers the resulting tokens with HappyView.
4. All subsequent XRPC requests are authenticated with DPoP proofs. HappyView handles its own lexicons locally and passes any other method to its [XRPC proxy](/docs/reference/lexicons#xrpc-routing-for-unknown-methods). The proxy forwards it to the user's PDS as the user only when the instance's proxy routing is `serviceproxy`.

If your app is a confidential atproto OAuth client, step 2 also needs a signed `private_key_jwt` assertion for its PAR and token-exchange requests. `@happyview/oauth-client`'s `getClientAssertion()` mints one. See [Client assertions](/docs/reference/sdk/oauth-client#client-assertions).

## Quick start

```bash
npm install @happyview/lex-agent @happyview/oauth-client-browser @atproto/lex
```

```typescript
import { Client } from "@atproto/lex";
import { HappyViewBrowserClient } from "@happyview/oauth-client-browser";
import { createAgent } from "@happyview/lex-agent";

// Set up the OAuth client
const oauthClient = new HappyViewBrowserClient({
  instanceUrl: "https://happyview.example.com",
  clientId: "https://example.com/oauth-client-metadata.json",
  clientKey: "hvc_your_client_key",
});

// Sign in: redirects to the user's PDS
await oauthClient.signIn("alice.bsky.social");

// On page load: restore session or process callback
const result = await oauthClient.init();
const session = result?.session;
if (!session) throw new Error("Not signed in");

// Create a type-safe Lex client
const agent = createAgent(session);
const lex = new Client(agent);

// Make type-safe XRPC calls
const game = await lex.xrpc(myLexicons.com.example.getGame, {
  params: { slug: "celeste" },
});
```

## Next steps

- [Lex agent](/docs/reference/sdk/lex-agent): type-safe XRPC with `@atproto/lex`
- [OAuth client](/docs/reference/sdk/oauth-client): platform-agnostic core client
- [Browser client](/docs/reference/sdk/oauth-client-browser): browser OAuth redirect flow
- [Node client](/docs/reference/sdk/oauth-client-node): server-side OAuth flow
- [Authentication](/docs/reference/authentication): full details on DPoP key provisioning and API client types
