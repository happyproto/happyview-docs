---
title: Linked repos
description: Give your instance durable write access to an atproto repo, and write to it from any script.
---

Linked repos give your instance durable write access to a specific atproto repo. Once an operator links a repo, any script can write to it through the `happyview.linked_repos` library. These repos work like service accounts: an account your instance posts on behalf of, a partner repo you mirror data into, or an account your instance maintains on its own.

This is different from writing on behalf of the user making a request. Those writes use the caller's own OAuth session and only work while that session is live. A linked repo belongs to the instance: HappyView stores the session, handles token refreshes in the background, and allows scripts to act as the linked repo rather than the caller.

## How it works

1. An operator adds a linked repo from the dashboard (Access > Linked Repos), choosing which scopes it needs.
2. The operator either runs the OAuth flow directly, or sends an invite link to someone who can sign in to the repo.
3. Scripts call `linked_repos.get(did)` and write through the returned handle. A background worker keeps the session alive so rarely used repos stay working.

## Adding a linked repo

In the dashboard, go to **Access > Linked Repos** and choose **Link a repo** to open the side panel.

The **Handle or DID** is optional, but it decides who is allowed to complete the authorization:

- If a handle or DID is set, the grant is **pinned**: that is the only account that can be connected.
- If a handle or DID is not set, the grant is **open**. Whoever follows the invite gets to decide which account is linked.

Set the identifier unless you have a reason not to, so that someone who gets hold of the invite link can't connect a different account.

The **Reason** explains why you're asking for access. It's shown to whoever opens the invite link, who uses it to decide whether to complete the authorization.

The **Scopes** are what the authorization asks for. Request only the ones your scripts need.

Scopes are immutable. To change what a grant can do, delete it and create a new one.

## Authorizing

### Inline

If the grant names a handle or DID, **Authorize now** takes you straight to the OAuth flow. Afterward it returns you to the Linked Repos page. Use this for accounts you control. A grant that has stopped working offers **Re-authorize** in the same place, on its detail panel.

### By invite link

**Create link** mints an invite and shows its URL, with a button to copy it. On an existing grant, **Create a new invite link** in its detail panel mints one and copies it to your clipboard. Send the invite link to whoever has credentials for the repo.

The URL is shown once and can't be recovered. If you lose it, revoke the invite and mint another. The **Invite links** column counts each grant's outstanding invites, and the grant's detail panel lists them with their expiry. Revoke one there if you sent it to the wrong person. An invite expires after seven days unless the [admin API](/docs/reference/admin/linked-repos) set another lifetime.

An invite stays usable until it expires or a repo is linked, so someone who closes the tab at the consent screen can use the same link again. Once a repo is linked, every outstanding invite for that grant is cleared.

### What the recipient sees

The recipient of an invite link doesn't need to be added to your HappyView instance, and they never see your dashboard. They get a page naming your instance, your stated reason, and the access being requested in plain language. It then asks for their handle, or for a pinned grant, confirms which account the link is for. After approving at their own PDS they land on a result page confirming what was linked and reminding them they can revoke it from their own account settings at any time.

## Grant status

| Status         | Meaning                                                                  |
| -------------- | ------------------------------------------------------------------------ |
| `pending`      | Created but never authorized                                             |
| `active`       | Authorized and usable                                                    |
| `needs_reauth` | The stored session failed to refresh; the grant must be authorized again |

A background worker refreshes each active grant's session periodically, so a rarely used grant doesn't go stale. If a refresh fails, the grant flips to `needs_reauth` and the error is recorded and shown in the dashboard. A script hitting a dead grant triggers the same transition, so failures surface either way.

## Using a linked repo from a script

`happyview.linked_repos` acts as the linked repo, so it works from every script context: procedures, queries, record scripts, label scripts, and job scripts. For example, this script writes through the linked repo `did:plc:abc123`:

```lua
local linked_repos = require("happyview.linked_repos")

function handle(input, ctx)
  local repo = linked_repos.get("did:plc:abc123")

  repo:create_record{
    collection = "com.example.note",
    record = { text = "posted by the instance" },
  }

  return { ok = true }
end
```

`create_record`, `put_record`, `delete_record` and `upload_blob` check scopes locally, before any network call. If a grant lacks the scope one needs, the call fails immediately with a message naming the grant and the missing scope.

Every method re-reads the grant from the database. If a grant is revoked or flips to `needs_reauth` while a long-running script is working, the next call it makes is refused.

`linked_repos.get(did)` never fails on its own; an unlinked or revoked DID surfaces as `NOT_LINKED` on the first method called on it. The full surface is in the [library's README](https://github.com/happyproto/plugins/tree/alpha/plugins/happyview/linked-repos); see [Libraries](/docs/reference/scripts/libraries) for the capability it needs.

:::caution
Any script can use any linked repo. Scripts are already operator-authored code with database, HTTP, and environment access, and linked repos sit at the same trust level. Be deliberate about scripts that write to a linked repo in response to unauthenticated requests.
:::

## Permissions

| Permission            | Grants                                                       |
| --------------------- | ------------------------------------------------------------ |
| `linked-repos:read`   | View grants, their status, and their outstanding invites     |
| `linked-repos:create` | Create grants, start authorizations, mint and revoke invites |
| `linked-repos:delete` | Delete a grant and its stored session                        |

Revoking an invite uses `linked-repos:create` rather than `linked-repos:delete`, because minting and revoking are part of the same lifecycle: whoever can send an invite link should be able to revoke it. `linked-repos:delete` is reserved for destroying a grant and the session behind it.

## Removing a linked repo

Deleting the grant for a linked repo also removes its stored OAuth session. Scripts writing to that repo fail on their next call.

Deleting the grant on HappyView's side doesn't revoke the authorization at the PDS. The person who granted access can also revoke it from their own account settings, which is what causes a grant to land in `needs_reauth`.

## See also

- [Linked Repos admin API](/docs/reference/admin/linked-repos): Drive the whole lifecycle headlessly
- [Libraries](/docs/reference/scripts/libraries): `happyview.linked_repos` and the other script libraries
- [Scripts](/docs/getting-started/scripts): Script contexts and triggers
- [Permissions](/docs/guides/permissions): The full permission list
