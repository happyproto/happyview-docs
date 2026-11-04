---
title: Hardening an instance
description: Narrow the OAuth authority an instance holds, through API client scopes, the XRPC proxy, linked repos and key backups.
---

A HappyView instance holds OAuth credentials for its users and will act with them on behalf of the applications you register.

Any scope you grant can be used by some application. Several of these settings can't be changed later without the account holder consenting again, so set them narrowly the first time.

## Scope your API clients

An API client's registered scopes are the ceiling on what a session registered through it can carry. HappyView refuses to register a session whose token carries scopes the client is not registered for.

### Prefer granular scopes to `transition:generic`

`transition:generic` is the broad legacy grant. It covers:

- every `repo` operation, on every collection
- every `blob` upload, of every type
- every `rpc` call whose method is not under `chat.bsky.`

It does not cover `identity` or `account` operations, which always need explicit scopes, even for a client holding it.

Granular scopes name what your app actually does:

```
atproto repo:com.example.post repo:com.example.like blob:image/*
```

- `repo:<nsid>` grants create, update and delete on that collection. Narrow further with repeated `?action=` parameters: `repo:com.example.post?action=create&action=update`.
- `blob:<type>/<subtype>` grants uploads of that media type. `blob:image/*` is a reasonable middle ground; `blob:*/*` is not much better than nothing.
- `rpc:<nsid>?aud=<did>` grants calling a method against a service. The audience is required. `?aud=*` permits any service, so prefer a concrete `did:web:example.com#service` where you know it.

`atproto` is required in every token's scope.

### Use permission sets for anything non-trivial

A `permission-set` lexicon lets you declare a group of permissions once and reference it as `include:<nsid>`:

```
atproto include:com.example.appAccess
```

Two rules limit what a permission set can grant:

- **Authority containment.** A permission set may only grant NSIDs under its own authority group. `com.example.appAccess` can grant `com.example.*` and nothing else.
- **No pinned audiences.** An `rpc` permission inside a set may declare `aud: "*"` or inherit the audience from the `include:` scope, but may not name a concrete service itself. So a set can't direct your users' credentials to a service the set names.

Containment is all-or-nothing per permission entry. An entry listing both your own collection and someone else's grants neither. Split them into separate entries, and declare the foreign collection directly in the client's registered scopes instead.

## Lock down the XRPC proxy

Any XRPC method with no lexicon registered on your instance falls through to the proxy. The default is **Open**: it attempts to serve any NSID a caller names.

Under **System > XRPC Proxy** you can change this to:

- **Disabled**: only locally registered lexicons are served. The strongest setting, and correct if your instance serves only its own lexicons.
- **Allowlist**: only NSIDs matching a listed pattern are proxied. Patterns may be exact (`com.example.feed.getHot`) or wildcards (`com.example.*`).
- **Blocklist**: everything except the listed patterns.

Use allowlist mode if you can, and list the NSIDs your app calls. It takes more setup, and HappyView refuses a call to any method not on the list.

:::note
Set the mode explicitly even if you want **Open**, so your configuration states what your instance does.
:::

### Choose a routing mode deliberately

Separately from whether a method may be proxied, **Routing** decides where it goes.

- **Lexicon authority** (the default) resolves the NSID's authority via DNS and forwards there, unauthenticated. This answers "who defines this lexicon", not "who serves this request". For `com.atproto.repo.*` those have different answers: the authority is whoever publishes the `com.atproto` lexicons, which has no access to your users' repos, so such requests arrive unauthenticated and are refused.
- **Service proxy** forwards to the caller's own PDS, authenticated as them, following the [service proxying](https://atproto.com/specs/xrpc#service-proxying) model. Absent an `atproto-proxy` header the PDS handles the request itself, which is what makes `com.atproto.repo.createRecord` work through HappyView. With one, the header is passed through for the PDS to relay onwards.

Prefer **Service proxy**. Two consequences to weigh before switching:

- **Anonymous unrecognized queries stop working.** Under authority routing an unauthenticated caller can hit an unrecognized NSID and get an answer. Under service proxy there is no PDS to forward to, so it returns 401. Apps that rely on that need to authenticate first.
- **Authenticated clients reach more.** Requests are forwarded with the user's token, so what a client can do is bounded by that token's scopes rather than by which lexicons you have registered. Scope your API clients before switching, per the section above.

HappyView checks repo writes and blob uploads against the session's granted scopes before forwarding, and the PDS enforces scopes on every request.

## Scope linked repos narrowly, because you cannot edit them

A [linked repo](/docs/guides/linked-repos) is an admin-managed OAuth grant over somebody's repo. Its scopes are immutable: changing them means revoking the grant and creating a new one, which requires the account holder to complete the invite again.

To narrow a grant created with `repo:*`, the account holder has to authorize it again, so decide the scopes before you send the invite.

Two rules apply when you write a grant's scopes:

- `putRecord` is an upsert, so it needs both `create` and `update` unless the caller supplies `swap_cid`. Passing `swap_cid` is a no-create guarantee, which narrows the requirement to `update` alone.
- Repo reads need no scope at all. There is no read permission in the grammar because repo records are public.

## Back up the OAuth client-authentication key

Confidential OAuth clients (the primary instance identity, each registered
domain, and any API client with `private_key_jwt` authentication configured)
sign every login and every token refresh with an ES256 key HappyView holds
in `happyview_oauth_client_keys`. Every session is pinned, at the moment it
is established, to the exact `kid` that signed it. A refresh is only ever
attempted with that same key, never with whatever key happens to be current
later.

Losing the row for a key destroys every session pinned to it, permanently. There is no key to sign their next refresh
with, and the authorization server has no way to accept one signed by a
substitute. This applies to a `retiring` key just as much as to `current`:
rotating a key keeps the old one so its existing sessions keep working, and
that only holds if the row survives.

`happyview_oauth_client_keys` needs no backup procedure of its own. It lives
in the same database as every other table, so your regular
[database backup](/docs/guides/self-hosting/production#backups) covers it,
and restoring that backup restores it.

## Understand `atproto-proxy` forwarding

When a request carries an `atproto-proxy` header, it is asking to be relayed onwards to a named service. HappyView forwards that header to the user's PDS rather than resolving it, because the token that accompanies a relayed request is signed by the user's own identity key, which only their PDS holds.

The decision to sign for a given audience belongs to the party holding the key, which is the PDS. You decide who gets to make such a request at all, because registering an API client is what grants it. Register clients deliberately, and scope them as above.

## A checklist

- [ ] Every API client registered with granular scopes, or a permission set, rather than `transition:generic`
- [ ] `blob:` scopes narrowed to the media types the app uploads
- [ ] `rpc:` scopes given a concrete `aud` wherever the service is known
- [ ] XRPC proxy set explicitly: allowlist if you can enumerate your NSIDs, disabled if you serve only your own
- [ ] Linked-repo grants scoped before the invite goes out
- [ ] Third-party API clients registered deliberately and scoped as above
- [ ] Database backups cover `happyview_oauth_client_keys`

## Related

- [API Clients](/docs/guides/api-clients): creating clients and choosing a type
- [Linked Repos](/docs/guides/linked-repos): the grant and invite lifecycle
- [Permissions](/docs/guides/permissions): operator permissions, which are separate from OAuth scopes
