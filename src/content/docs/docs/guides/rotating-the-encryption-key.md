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

2. In the instance's environment, move the key in use today to `TOKEN_ENCRYPTION_KEY_PREVIOUS` and put the new one in `TOKEN_ENCRYPTION_KEY`. Change both in the same edit, with no restart in between:

   ```sh
   TOKEN_ENCRYPTION_KEY=<new key>
   TOKEN_ENCRYPTION_KEY_PREVIOUS=<current key>
   ```

3. Restart HappyView. Anything saved from now on is sealed with the new key. Older values still open, through the previous key. Shortly after boot, HappyView looks for values sealed with the previous key or stored as plaintext, and when it finds some it queues a `happyview.reseal` [background job](/docs/reference/admin/jobs). The job rewrites them under the new key in batches of 200 rows. If a value is saved again while the job runs, the job skips it, because the saved value already uses the new key.

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

Until you remove the previous key in step 5, a rollback is the same rotation run backwards: swap the two variables' values and restart. The re-seal job then moves every value back to the old key.

After step 5, nothing the instance holds opens with the old key, so going back to it is a new rotation.

## Backups

A backup holds values sealed under the key that was current when it was taken. Keep each old key for as long as you keep backups sealed under it.

An older backup can still be restored after a rotation. Give the restored instance two keys: today's key in `TOKEN_ENCRYPTION_KEY`, and the key in use when the backup was taken in `TOKEN_ENCRYPTION_KEY_PREVIOUS`. It re-seals the restored values on boot, and you finish from step 4.

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

**Why.** HappyView tried both configured keys on these values and neither worked. Either a key you no longer have configured sealed them, or the stored bytes are corrupt. The re-seal job can't move them, so it leaves them in place.

**Fix.** `stores` in the status shows where they are. If you still have the key that sealed them, set it as `TOKEN_ENCRYPTION_KEY_PREVIOUS` and restart. Otherwise those values are lost, and have to be set again: save the script variable or plugin secret again, for example.
