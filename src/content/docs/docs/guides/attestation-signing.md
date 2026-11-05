---
title: Attestation signing
description: Sign records with the instance's secp256k1 key from a script, and verify those signatures later.
---

HappyView can sign records with an ECDSA (secp256k1) keypair so their origin can be verified later. Scripts call `sign` on `happyview.atproto` to attach an inline signature to a record and `verify_signature` to check one. HappyView's implementation follows the [atproto attestation spec](https://tangled.org/strings/did:plc:cbkjy5n7bk3ax2wplmtjofq2/3m3fy2xuahc22).

## Signing and verification

1. HappyView loads or generates a secp256k1 keypair on startup
2. `atproto.sign(record)` encodes the record to DAG-CBOR, computes its CID, and signs the CID with the private key
3. `sign` returns the inline signature object, for the script to add to the record's `signatures` array
4. `atproto.verify_signature(record, sig, repo_did)` recomputes the CID and verifies the signature

The repo DID is included in the signed data, so a signature for one user's record can't be replayed against another's. Any modification to the record invalidates the signature.

## Setup

Attestation signing is enabled by default. HappyView generates a keypair on first startup and stores it in the `happyview_attestation_key` table, encrypted with `TOKEN_ENCRYPTION_KEY` when the instance has one. No configuration is required.

To use an explicit key instead, set the `ATTESTATION_PRIVATE_KEY` environment variable:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ATTESTATION_PRIVATE_KEY` | no | auto-generated | Hex-encoded 32-byte secp256k1 private key |
| `ATTESTATION_KEY_ID` | no | `did:web:localhost#attestation` | Key identifier included in signatures. Read only when `ATTESTATION_PRIVATE_KEY` is set |
| `ATTESTATION_SIG_TYPE` | no | `games.gamesgamesgamesgames.attestation` | The `$type` value used in signature objects. Read only when `ATTESTATION_PRIVATE_KEY` is set |

A generated key takes the default `$type`, and a key ID derived from your `PUBLIC_URL`. For example, `PUBLIC_URL=https://happyview.example.com` produces a key ID of `did:web:happyview.example.com#attestation`. Set `ATTESTATION_KEY_ID` whenever you set `ATTESTATION_PRIVATE_KEY`, or verifiers get a `localhost` key ID.

### Priority order

HappyView checks for signing configuration in this order:

1. **Environment variables:** if `ATTESTATION_PRIVATE_KEY` is set, it's used
2. **Database:** if a previously generated key is stored, it's loaded. A key an earlier version kept in instance settings moves to `happyview_attestation_key` at boot, unchanged, so signatures it made still verify
3. **Auto-generation:** a new key is generated and persisted to the database

A stored key is never replaced: if it can't be read, for example because `TOKEN_ENCRYPTION_KEY` changed, no new key is generated. If key loading fails for any reason, signing is disabled and both `sign` and `verify_signature` raise `NO_SIGNER`.

## Using in scripts

Both functions live on the [`happyview.atproto`](/docs/reference/scripts/libraries) library, available in every script kind.

### Signing a record

This script signs a record before creating it:

```lua
local time = require("internal.time")
local record = require("happyview.record")
local atproto = require("happyview.atproto")

function handle(input, ctx)
  local body = { text = input.text, createdAt = time.to_iso8601(time.now()) }

  local sig = atproto.sign(body)
  body.signatures = { sig }

  local ref = record.create("com.example.post", body)
  return { uri = ref.uri, cid = ref.cid, signature = sig }
end
```

The returned signature object:

```json
{
  "$type": "games.gamesgamesgamesgames.attestation",
  "key": "did:web:happyview.example.com#attestation",
  "signature": {
    "$bytes": "base64-encoded-signature"
  }
}
```

`sign` signs as `ctx.caller_did`, since the DID is part of the signed content; it raises `BAD_INPUT` from a script with no caller.

### Verifying a signature

This script checks a stored record's signature:

```lua
local db = require("happyview.db")
local atproto = require("happyview.atproto")

function handle(input, ctx)
  local row = db.get(input.uri)
  if not row then
    return { error = "not found" }
  end
  local record = row.record

  local sig = record.signatures and record.signatures[1]
  if not sig then
    return { record = record, verified = false }
  end

  local ok, valid = pcall(atproto.verify_signature, record, sig, row.did)
  if not ok then
    -- Couldn't check, which is not the same as "the signature is bad".
    return { record = record, verified = nil, error = tostring(valid) }
  end
  return { record = record, verified = valid }
end
```

`verify_signature` returns `false` only when it checked the signature and it didn't match. It raises `UNVERIFIABLE` when it couldn't check: signature bytes that aren't valid base64, a missing field, or a record that won't encode. Keep those apart. A script that treats "couldn't check" as `false` reports a fault in its own verification path as a forged record.

### Checking availability

Both functions raise `NO_SIGNER` when no signer is configured. A script that should work either way wraps the call:

```lua
local ok, sig = pcall(atproto.sign, body)
if ok then
  body.signatures = { sig }
end
```

## Signature format

Signatures are stored as objects in the record's `signatures` array:

| Field       | Type   | Description                          |
| ----------- | ------ | ------------------------------------ |
| `$type`     | string | Signature type NSID                  |
| `key`       | string | Key identifier (DID with fragment)   |
| `signature` | table  | Contains `$bytes` (base64-encoded)   |

## Security considerations

`sign` exposes the instance's signing key to scripts. Treat it as a
privileged capability:

- It signs exactly what you give it. A signature only proves *"this HappyView
  instance signed this content"*. It doesn't prove the content is authentic,
  is present in anyone's repo, or was authored by any particular DID. Only sign
  content you have already verified, for example by having the script confirm the
  record's `did` and content against the source before it calls `sign`.
- It's available to any script with a caller, including a record script
  triggered by an arbitrary network record, where the caller is the record's
  repo DID. Don't sign untrusted input (a network record, a request parameter)
  unless you intend the instance to vouch for it.
- Installing `happyview.atproto` grants `attest:sign`. Creating scripts requires
  the `scripts:manage` permission, and deploying a project requires `project:deploy`.
  The signing key is therefore only reachable by operators you have trusted with one
  of those permissions, so grant them accordingly, and review scripts that call `sign`.

## Next steps

- [Libraries](/docs/reference/scripts/libraries): `happyview.atproto` and where its full surface is documented
- [Signed record](/docs/guides/recipes/signed-record): save a record with an attestation signature
- [Verify a signed record](/docs/guides/recipes/signed-record-verify): fetch a record and verify its signature
