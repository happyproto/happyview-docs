---
title: Built-in modules
---

`require` serves two kinds of module, and `import` serves the same two in JavaScript and TypeScript. Installed [libraries](/docs/reference/scripts/libraries) are plugins. Built-in modules come with every interpreter under the `internal.` prefix and need nothing installed. A plugin cannot claim a namespace starting with `internal.`.

The examples are in Lua. JavaScript and TypeScript use the same names through `import`, such as `import log from "internal.logging"`.

| Module | Functions |
| --- | --- |
| `internal.logging` | `debug`, `info`, `warn`, `error`, each `(message[, fields])` |
| `internal.time` | `now()`, `to_iso8601(ms)`, `from_iso8601(text)` |
| `internal.tids` | `create()`, `to_tid(ms)`, `from_tid(tid)` |
| `internal.json` | `encode(value)`, `decode(text)`, and in Lua only `to_array(table)` |
| `internal.async` | Lua only: `all(f1, f2, ...)` |

## `internal.logging`

```lua
local log = require("internal.logging")
log.debug(message[, fields])
log.info(message[, fields])
log.warn(message[, fields])
log.error(message[, fields])
```

`fields` is a table stored as JSON on the event, so `log.error("save failed", { uri = uri, err = tostring(err) })` is queryable rather than a stringified blob. `info`, `warn` and `error` are recorded as `script.log` events in the [event log](/docs/guides/event-logs), carrying the trigger id and caller; `debug` writes only to the process log. In a job script, `info`, `warn` and `error` also write to that job's own log.

In JavaScript and TypeScript, `console.log`, `info`, `debug`, `warn` and `error` write through `internal.logging` at the matching level, with `console.log` at `info`.

## `internal.time`

```lua
local time = require("internal.time")
time.now()                       -- unix milliseconds, integer
time.to_iso8601(ms)              -- "2026-09-13T15:04:05.000Z", raises on an out-of-range timestamp
time.from_iso8601(string)        -- unix milliseconds, or nil on an unparseable string
```

`time.to_iso8601(time.now())` is the current UTC timestamp for a `createdAt` field.

## `internal.tids`

```lua
local tids = require("internal.tids")
tids.create()            -- a fresh TID for now
tids.to_tid(ms)          -- TID for a unix-millisecond timestamp
tids.from_tid(tid)       -- unix milliseconds, raises on an invalid TID
```

A TID is atproto's 13-character sortable record key. `tids.create()` is the rkey to use when a script needs to name a record before writing it.

## `internal.json`

```lua
local json = require("internal.json")
json.encode(value)       -- Lua value -> JSON string
json.decode(string)      -- JSON string -> Lua value
json.to_array(table)     -- marks a table as a JSON array, so an empty one encodes as [] rather than {}
```

Encoding rules and examples: [JSON](/docs/reference/scripts/json). `to_array` exists only in Lua, because a Lua table can't say on its own whether it's an empty array or an empty object.

## `internal.async`

Lua only. A library call blocks until it answers, so `all` is how a Lua script runs several at once. It takes functions and returns each function's first value, in argument order. JavaScript and TypeScript use `Promise.all` instead.

```lua
local async = require("internal.async")
local posts, profile = async.all(
  function() return db.records("app.example.post"):limit(10):run() end,
  function() return http.get("https://example.com/" .. input.did) end
)
```

## Next steps

- [The script contract](/docs/reference/scripts/contract): `handle(input, ctx)` and what `ctx` carries
- [Libraries](/docs/reference/scripts/libraries): the `happyview.*` modules, reached the same way via `require`
