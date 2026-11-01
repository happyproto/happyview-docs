---
title: "JSON"
description: "The internal.json built-in module: how Lua values encode to JSON and decode back."
---

`require("internal.json")` serializes Lua values to JSON and back. It is a [built-in module](/docs/reference/scripts/built-in-modules#internaljson), available in every script type. In JavaScript and TypeScript the module has `encode` and `decode`, and no `to_array`.

```lua
local json = require("internal.json")
```

## `json.encode(value)`

```lua
local str = json.encode({ key = "value", items = { 1, 2, 3 } })
-- '{"key":"value","items":[1,2,3]}'
```

Converts a Lua value to a JSON string. A table whose length (`#`) is greater than 0 encodes as an array of its elements 1 to that length, and any other keys it has are left out. A table of length 0 encodes as an object, and raises if a key is not a string. A table marked with `to_array`, or an array that came from JSON, always encodes as an array.

## `json.decode(string)`

```lua
local tbl = json.decode('{"key": "value"}')
-- tbl.key == "value"
```

Parses a JSON string into a Lua value. Raises when the input is not valid JSON. A JSON `null` decodes to a sentinel value rather than `nil`: the sentinel is truthy, and it encodes back to `null`. A decoded array keeps its array marking, so emptying it still encodes as `[]`.

## `json.to_array(table)`

```lua
return { items = json.to_array(results) }
-- With results:    {"items": [{"name": "a"}, {"name": "b"}]}
-- Without results: {"items": []}
```

Returns a copy of the table's elements 1 to its length, marked so it always encodes as a JSON array. The table you pass is left as it was, so use the returned one. Lua does not distinguish an empty array from an empty object, so an empty `{}` encodes as `{}` unless it is marked. Pages and record lists returned by a library are already marked. Mark a table you build yourself with `table.insert` or index assignment, whether it is returned from `handle` or passed to `json.encode`.
