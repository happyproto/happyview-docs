---
title: OAuth client
description: "The platform-agnostic core of the HappyView SDK: DPoP key provisioning, client assertions, session registration, restoration and logout."
---

The core OAuth client handles DPoP key provisioning, session registration, and session restoration against a HappyView instance. It's platform-agnostic: it uses the Web Crypto API and `fetch`, so it runs wherever those exist, and you provide a `StorageAdapter` for your environment.

If you're building a browser app, use the [browser client](/docs/reference/sdk/oauth-client-browser) instead. It wraps this package with Web Crypto, localStorage, and a complete OAuth redirect flow.

## Installation

```bash
npm install @happyview/oauth-client
```

## Setup

```typescript
import { HappyViewOAuthClient } from "@happyview/oauth-client";

const client = new HappyViewOAuthClient({
  instanceUrl: "https://happyview.example.com",
  clientKey: "hvc_your_client_key",
  clientSecret: "hvs_your_secret", // optional, for confidential clients
  storage: myStorageAdapter, // optional, defaults to in-memory
});
```

| Option | Required | Description |
| --- | --- | --- |
| `instanceUrl` | Yes | The HappyView instance URL. Trailing slashes are trimmed. |
| `clientKey` | Yes | The API client key. |
| `clientSecret` | No | The API client secret. |
| `storage` | No | A [`StorageAdapter`](#storageadapter). Defaults to `MemoryStorage`. |
| `sessionHooks` | No | `onSessionUpdate(did)` and `onSessionDelete(did, cause?)`. |
| `fetch` | No | A custom fetch implementation. Defaults to the global `fetch`. |

The `clientSecret` parameter makes this a **confidential client**. Omit it for public clients (browser apps), which use PKCE instead. See [API clients](/docs/reference/authentication#api-clients-confidential-vs-public) for details.

## DPoP key provisioning

Request a DPoP keypair from the HappyView instance. This is the first step of the [DPoP key provisioning flow](/docs/reference/authentication#dpop-key-provisioning-for-third-party-apps).

```typescript
const { provisionId, dpopKey, rawJwk, pkceVerifier, confidential } =
  await client.provisionDpopKey();
```

For public clients, `pkceVerifier` is included and must be passed back when registering the session. For confidential clients it will be `undefined`.

Use the returned `dpopKey`, a `Key` object, as your DPoP keypair during your atproto OAuth flow with the user's PDS. `rawJwk` is the same key as a private JWK, which `registerSession` takes. `confidential` says whether your app has to authenticate to the PDS with a [client assertion](#client-assertions).

## Client assertions

If your app is a confidential atproto OAuth client, its `client_id_url` document publishes `token_endpoint_auth_method: "private_key_jwt"` and a `jwks_uri` pointing back at HappyView. The PDS then requires a signed `private_key_jwt` assertion at two points during the OAuth flow: the pushed authorization request (PAR) and the token exchange. HappyView holds the signing key on your behalf, so ask it to sign each one:

```typescript
const { clientAssertion, clientAssertionType } =
  await client.getClientAssertion(pdsIssuer);
```

`pdsIssuer` is the `issuer` field from the PDS authorization server's metadata. Attach `clientAssertion` and `clientAssertionType` as the `client_assertion` and `client_assertion_type` form parameters on the request.

:::caution
Call this once for the PAR and once more for the token exchange, and never reuse a single assertion for both. Each one is valid for only 60 seconds and carries a unique `jti`, so an app that mints one and reuses it fails at whichever call comes second.
:::

A client with no secret and no session yet proves itself with the provision it just received, as a second argument:

```typescript
const { clientAssertion, clientAssertionType } =
  await client.getClientAssertion(pdsIssuer, { provisionId, pkceVerifier });
```

`getClientAssertion` is unrelated to `isConfidential` on this class, which only describes whether this SDK instance authenticates *to HappyView* with a client secret, not whether your app is a confidential OAuth client to a user's PDS.

See [Confidential clients: attaching the client assertion](/docs/guides/api-clients#confidential-clients-attaching-the-client-assertion) for the endpoint this wraps and the full manual flow.

## Session registration

After completing OAuth authorization with the user's PDS, register the session with HappyView:

```typescript
const session = await client.registerSession({
  provisionId,
  pkceVerifier,       // required for public clients
  did: "did:plc:abc123",
  accessToken: tokens.access_token,
  refreshToken: tokens.refresh_token,
  scopes: "atproto transition:generic",
  pdsUrl: "https://bsky.social",
  issuer: tokens.iss,
  dpopKey: rawJwk,
});
```

The returned `HappyViewSession` is ready to make authenticated requests. The session data is also persisted to the `StorageAdapter` for later restoration.

The scopes you pass, as one space-separated string, are available on the session as a list:

```typescript
console.log(session.scopes);
// ["atproto", "transition:generic"]
```

## Retrieving session info

To fetch the current session's approved scopes from HappyView (e.g., after restoring from storage):

```typescript
const info = await client.getSession("did:plc:abc123");
console.log(info.scopes);
// ["atproto", "transition:generic"]
```

## Making authenticated requests

`HappyViewSession.fetchHandler` works like `fetch` but automatically attaches DPoP proof, authorization, and client key headers:

```typescript
// Relative path: prepends the HappyView instance URL
const response = await session.fetchHandler(
  "/xrpc/com.example.getStuff?limit=10",
  { method: "GET" },
);

// Absolute URL on the instance: used as-is
const sameResponse = await session.fetchHandler(
  "https://happyview.example.com/xrpc/com.example.getStuff",
  { method: "GET" },
);
```

The URL must be on the session's HappyView instance: the same origin, and under the instance's base path when its URL has one. For any other URL, `fetchHandler` throws `fetchHandler only sends requests to <instance URL>` without making a request, so the access token, DPoP proof and client key go only to the instance.

## Session restoration

Restore a previously stored session without re-authenticating:

```typescript
// Restore the last active session
const session = await client.restore();

// Restore a specific user's session
const userSession = await client.restoreSession("did:plc:abc123");
```

Returns `null` if no stored session is found.

## Logout

```typescript
await client.deleteSession("did:plc:abc123");
```

This deletes the session from HappyView and local storage, and revokes it at the user's PDS.

Without revocation the session would stay listed under the account's active sessions on their PDS until its refresh token expired, up to two years later. Revocation is best-effort, so a PDS that is unreachable or does not implement RFC 7009 will not make the logout fail.

### Signing in again replaces the previous session

Each login runs a full OAuth authorization and so creates a *new* session on the user's PDS; the DPoP key is minted fresh and the old key is overwritten in storage. Left alone, that means every re-login strands the previous session on their account with no way to reach it.

`registerSession` therefore retires this client's previous session for the same account as part of completing a login, revoking it at the PDS while the credentials to do so still exist. It is scoped to the account being signed into, so sessions for other accounts, and sessions belonging to the same account on other devices, are untouched. `onSessionDelete` doesn't fire: the user is signing in, not out.

### When HappyView refuses

The local session is always cleared. A `404`, `401`, or `403` from HappyView is treated as a completed logout, because the session is either already gone or the credential is no longer usable. A `5xx` or a network error still throws, because HappyView may still hold a live session. It throws after the local session is cleared, so calling `deleteSession` again is safe.

### Forgetting a session locally

```typescript
await client.forgetSession("did:plc:abc123");
```

Clears the stored session without contacting HappyView. Use it when revocation is impossible, such as an unreachable instance or a credential HappyView has already rejected. Nothing is revoked, so the instance may still consider the session live until it expires naturally.

### Storage keys

`STORAGE_PREFIX` (`"happyview:session:"`) and `LAST_ACTIVE_KEY` (`"happyview:last-active-did"`) are exported, so tooling that needs to inspect or clear stored sessions directly can do so without hardcoding the format:

```typescript
import { STORAGE_PREFIX, LAST_ACTIVE_KEY } from "@happyview/oauth-client";
```

## Adapters

### StorageAdapter

Implement this interface to persist sessions:

```typescript
interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}
```

If no `StorageAdapter` is provided, sessions are stored in memory and won't survive page reloads or process restarts.

:::note
The built-in `MemoryStorage` is exported for testing. In production, always provide a persistent storage adapter.
:::

## Other exports

| Export | What it is |
| --- | --- |
| `HappyViewOAuthClient.fetchMetadata({ clientId, fetch?, signal? })` | A static method that fetches and checks your OAuth client metadata document. |
| `session.getTokenInfo()` | Returns `{ scope, iss, aud, sub }` for the session, where `aud` is the PDS URL. |
| `importJwk(jwk)` | Imports a private ES256 JWK, such as `rawJwk`, as a `Key`. |
| `jwkThumbprint(jwk)` | Computes a JWK's thumbprint. |
| `@atproto/jwk`, `@atproto/jwk-webcrypto` | Re-exported in full. |

## Error handling

All errors extend `HappyViewError`:

| Error | When |
| --- | --- |
| `ApiError` | HappyView API returned a non-OK response (has `status` and `body`) |
| `AuthenticationError` | Authentication failed (default status 401) |
| `InvalidStateError` | Missing or invalid OAuth state |
| `TokenExchangeError` | Token exchange with the PDS failed (has `status` and `body`) |
| `ResolutionError` | Handle or DID resolution failed |
| `OAuthCallbackError` | The OAuth callback failed (has `params`, `state` and `cause`) |

```typescript
import { ApiError } from "@happyview/oauth-client";

try {
  await client.registerSession(params);
} catch (err) {
  if (err instanceof ApiError) {
    console.error(`API error ${err.status}:`, err.body);
  }
}
```
