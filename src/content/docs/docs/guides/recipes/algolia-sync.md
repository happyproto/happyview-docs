---
title: Algolia sync
---

Push records to an Algolia search index whenever they are created, updated, or deleted on the network.

**Script type:** record event (e.g. `record.index:<nsid>`)

```lua
local json = require("internal.json")
local http = require("happyview.http")

-- Percent-encode everything but unreserved characters, so the AT URI fits in a path segment
local function enc(s)
  return (s:gsub("[^%w%-_%.~]", function(c) return string.format("%%%02X", c:byte()) end))
end

function handle(input, ctx)
  local headers = {
    ["X-Algolia-API-Key"] = "your-api-key",
    ["X-Algolia-Application-Id"] = "your-app-id",
    ["Content-Type"] = "application/json",
  }

  if input.action == "delete" then
    http.delete("https://YOUR-APP.algolia.net/1/indexes/records/" .. enc(input.uri), {
      headers = headers,
    })
  else
    http.put("https://YOUR-APP.algolia.net/1/indexes/records/" .. enc(input.uri), {
      headers = headers,
      body = json.encode({
        objectID = input.uri,
        collection = input.collection,
        did = input.did,
        record = input.record,
      }),
    })
  end

  -- A delete has no record to return; `true` lets it proceed
  if input.action == "delete" then
    return true
  end
  return input.record
end
```

## How it works

1. On **create** or **update**: sends a `PUT` request to Algolia's index API with the record data, using the AT URI as the `objectID`. Algolia upserts the object — if it already exists, it's replaced.
2. On **delete**: sends a `DELETE` request to remove the object from the index by its AT URI.

The AT URI is percent-encoded with `enc` wherever it appears in a request path, because its `:` and `/` characters would otherwise be read as part of the path.

`input` is the [record event](/docs/reference/scripts/types-and-triggers#record-scripts). `json.encode` converts the Lua table into a JSON string for the request body. See [JSON](/docs/reference/scripts/json).

## Configuration

Replace the placeholder values:

| Placeholder              | Value                                                                 |
| ------------------------ | --------------------------------------------------------------------- |
| `your-api-key`           | Your Algolia Admin API key (with write permissions)                   |
| `your-app-id`            | Your Algolia Application ID                                           |
| `YOUR-APP`               | Your Algolia application subdomain (same as the Application ID)       |
| `records`                | The Algolia index name (choose any name you like)                     |

## Use case

This record script keeps an external search index in sync with your indexed records in real time. Users searching through Algolia get results that reflect the latest state of the network without polling or scheduled jobs.

Combine this with a [query script](/docs/reference/scripts/types-and-triggers#xrpc-scripts) that searches Algolia instead of the local database for a full-text search experience that goes beyond what `happyview.db`'s `search` offers.
