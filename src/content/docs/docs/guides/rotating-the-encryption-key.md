---
title: "Rotating the encryption key"
description: "Replace TOKEN_ENCRYPTION_KEY on a running instance, with the old key kept as TOKEN_ENCRYPTION_KEY_PREVIOUS until every stored value is re-sealed."
---

`TOKEN_ENCRYPTION_KEY` seals the secrets an instance stores. To replace it, you restart HappyView with the new key as `TOKEN_ENCRYPTION_KEY` and the old one as `TOKEN_ENCRYPTION_KEY_PREVIOUS`. HappyView opens stored values with either key, re-seals them under the new key in a background job, and reports when the old key is no longer needed. A second restart without the old key finishes the rotation.

An instance that has never had a key doesn't need a rotation. Set `TOKEN_ENCRYPTION_KEY` and restart, and HappyView seals the values it holds in plaintext.

## What the key seals

HappyView seals these with AES-256-GCM under `TOKEN_ENCRYPTION_KEY`:

- DPoP keys and sessions
- OAuth client keys, OAuth sessions and pending sign-in state
- linked repo sessions
- external account tokens
- the service identity's keys, verification method keys and space DID keys
- the attestation and delegation keys
- [script variables](/docs/reference/admin/script-variables)
- [plugin](/docs/guides/plugins) secrets

A value opens only with the key that sealed it. If you change `TOKEN_ENCRYPTION_KEY` without setting the old key as `TOKEN_ENCRYPTION_KEY_PREVIOUS`, HappyView can't open its OAuth client key and [won't start](/docs/guides/troubleshooting#the-instance-wont-start-after-changing-token_encryption_key).

## Before you start

You need:

- the current key, saved somewhere other than the instance. Step 2 uses it, and so does restoring any backup taken before the rotation.
- an API key with `settings:manage`, to read the rotation's status:

  ```sh
  TOKEN="hv_..."
  BASE="https://happyview.example.com"
  ```

## Rotate the key

1. Generate a new key:

   ```sh
   openssl rand -base64 32
   ```

2. Set the new key as `TOKEN_ENCRYPTION_KEY` and the current key as `TOKEN_ENCRYPTION_KEY_PREVIOUS`, both before you restart:

   ```sh
   TOKEN_ENCRYPTION_KEY=<new key>
   TOKEN_ENCRYPTION_KEY_PREVIOUS=<current key>
   ```

3. Restart HappyView. At startup it counts the values that only the previous key opens, and the values still stored in plaintext. If there are any, it starts a `happyview.reseal` [background job](/docs/reference/admin/jobs) that re-seals them under the new key, 200 rows at a time. New writes are sealed under the new key. A value written while the job runs keeps what was written.

4. Check the [rotation status](/docs/reference/admin/encryption#rotation-status) until `previous_key_can_go` is `true`:

   ```sh
   curl -s "$BASE/admin/encryption/rotation" -H "Authorization: Bearer $TOKEN"
   ```

   ```json
   {
     "key_configured": true,
     "previous_key_configured": true,
     "previous_key_can_go": true,
     "remaining": 0,
     "unsealed": 0,
     "unreadable": 0,
     "stores": [ ... ],
     "job": null
   }
   ```

   Each call reads every sealed value, so poll it no more often than every few seconds.

5. Remove `TOKEN_ENCRYPTION_KEY_PREVIOUS` and restart HappyView.

After the second restart, the status shows `previous_key_configured: false`, with `remaining`, `unsealed` and `unreadable` all `0`.

## Roll back

Before step 5, you can return to the old key. Set the old key as `TOKEN_ENCRYPTION_KEY` and the new one as `TOKEN_ENCRYPTION_KEY_PREVIOUS`, then restart. HappyView re-seals everything under the old key in the same way.

After step 5, nothing the instance holds opens with the old key, so going back to it is a new rotation.

## Backups

A backup holds values sealed under the key that was current when it was taken. Keep each old key for as long as you keep backups sealed under it.

To restore a backup taken before a rotation, start the restored instance with the current key as `TOKEN_ENCRYPTION_KEY` and the backup's key as `TOKEN_ENCRYPTION_KEY_PREVIOUS`. Then continue from step 4.

Rotation limits what an old key can open from now on. If a database and the key that sealed it leak together, every value in that database can be read.

## Problems during a rotation

### HappyView refuses to start with only the previous key set

**You see**, at startup:

```
TOKEN_ENCRYPTION_KEY_PREVIOUS is set without TOKEN_ENCRYPTION_KEY, which seals every value; set TOKEN_ENCRYPTION_KEY to the new key
```

**Fix.** Set `TOKEN_ENCRYPTION_KEY` to the new key. HappyView also refuses to start when `TOKEN_ENCRYPTION_KEY_PREVIOUS` isn't base64 of exactly 32 bytes.

### `unreadable` stays above 0

**You see** `unreadable` above `0` in the status, and this line at every startup:

```
stored values open under no configured TOKEN_ENCRYPTION_KEY and cannot be re-sealed
```

**Why.** Some values open with neither key. They were sealed under a third key, or they're damaged, and the re-seal job leaves them as they are.

**Fix.** `stores` in the status shows where they are. If you still have the key that sealed them, set it as `TOKEN_ENCRYPTION_KEY_PREVIOUS` and restart. Otherwise those values are lost, and have to be set again: save the script variable or plugin secret again, for example.
