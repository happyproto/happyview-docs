---
title: "Lua standard libraries"
description: "The parts of Lua 5.4's standard library a script can use in the Lua interpreter."
type: reference
---

The Lua interpreter (`happyview-lua`) keeps these Lua 5.4 standard libraries and builtins. JavaScript and TypeScript scripts get their engine's own built-ins; see [Languages](/docs/reference/scripts/languages).

## string

- [`byte`](https://lua.org/manual/5.4/manual.html#pdf-string.byte)
- [`char`](https://lua.org/manual/5.4/manual.html#pdf-string.char)
- [`find`](https://lua.org/manual/5.4/manual.html#pdf-string.find)
- [`format`](https://lua.org/manual/5.4/manual.html#pdf-string.format)
- [`gmatch`](https://lua.org/manual/5.4/manual.html#pdf-string.gmatch)
- [`gsub`](https://lua.org/manual/5.4/manual.html#pdf-string.gsub)
- [`len`](https://lua.org/manual/5.4/manual.html#pdf-string.len)
- [`lower`](https://lua.org/manual/5.4/manual.html#pdf-string.lower)
- [`match`](https://lua.org/manual/5.4/manual.html#pdf-string.match)
- [`rep`](https://lua.org/manual/5.4/manual.html#pdf-string.rep)
- [`reverse`](https://lua.org/manual/5.4/manual.html#pdf-string.reverse)
- [`sub`](https://lua.org/manual/5.4/manual.html#pdf-string.sub)
- [`upper`](https://lua.org/manual/5.4/manual.html#pdf-string.upper)

## table

- [`concat`](https://lua.org/manual/5.4/manual.html#pdf-table.concat)
- [`insert`](https://lua.org/manual/5.4/manual.html#pdf-table.insert)
- [`remove`](https://lua.org/manual/5.4/manual.html#pdf-table.remove)
- [`sort`](https://lua.org/manual/5.4/manual.html#pdf-table.sort)

## math

- [`abs`](https://lua.org/manual/5.4/manual.html#pdf-math.abs)
- [`ceil`](https://lua.org/manual/5.4/manual.html#pdf-math.ceil)
- [`floor`](https://lua.org/manual/5.4/manual.html#pdf-math.floor)
- [`max`](https://lua.org/manual/5.4/manual.html#pdf-math.max)
- [`min`](https://lua.org/manual/5.4/manual.html#pdf-math.min)
- [`random`](https://lua.org/manual/5.4/manual.html#pdf-math.random)
- [`sqrt`](https://lua.org/manual/5.4/manual.html#pdf-math.sqrt)
- [`huge`](https://lua.org/manual/5.4/manual.html#pdf-math.huge)
- [`pi`](https://lua.org/manual/5.4/manual.html#pdf-math.pi)

## os (safe subset)

Only the following safe functions are available from the `os` module:

- [`time`](https://lua.org/manual/5.4/manual.html#pdf-os.time)
- [`date`](https://lua.org/manual/5.4/manual.html#pdf-os.date)
- [`difftime`](https://lua.org/manual/5.4/manual.html#pdf-os.difftime)

Every other `os` function is absent, including `os.execute`, `os.remove`, `os.rename`, `os.exit`, `os.getenv` and `os.clock`.

## coroutine

The whole [`coroutine`](https://lua.org/manual/5.4/manual.html#6.2) library.

## utf8

The whole [`utf8`](https://lua.org/manual/5.4/manual.html#6.5) library.

## Builtins

- [`print`](https://lua.org/manual/5.4/manual.html#pdf-print)
- [`tostring`](https://lua.org/manual/5.4/manual.html#pdf-tostring)
- [`tonumber`](https://lua.org/manual/5.4/manual.html#pdf-tonumber)
- [`type`](https://lua.org/manual/5.4/manual.html#pdf-type)
- [`pairs`](https://lua.org/manual/5.4/manual.html#pdf-pairs)
- [`ipairs`](https://lua.org/manual/5.4/manual.html#pdf-ipairs)
- [`next`](https://lua.org/manual/5.4/manual.html#pdf-next)
- [`select`](https://lua.org/manual/5.4/manual.html#pdf-select)
- [`error`](https://lua.org/manual/5.4/manual.html#pdf-error)
- [`pcall`](https://lua.org/manual/5.4/manual.html#pdf-pcall)
- [`xpcall`](https://lua.org/manual/5.4/manual.html#pdf-xpcall)
- [`assert`](https://lua.org/manual/5.4/manual.html#pdf-assert)
- [`setmetatable`](https://lua.org/manual/5.4/manual.html#pdf-setmetatable)
- [`getmetatable`](https://lua.org/manual/5.4/manual.html#pdf-getmetatable)
- [`rawget`](https://lua.org/manual/5.4/manual.html#pdf-rawget)
- [`rawset`](https://lua.org/manual/5.4/manual.html#pdf-rawset)
- [`rawequal`](https://lua.org/manual/5.4/manual.html#pdf-rawequal)

## Removed modules

The following standard Lua modules are **removed** and unavailable in the sandbox:

`io`, `debug`, `package`, `dofile`, `loadfile`, `load`, `collectgarbage`

Lua's own `require` is removed too, but HappyView installs its own in its place: it loads installed library plugins and the `internal.*` built-ins — see [Built-in Modules](/docs/reference/scripts/built-in-modules).
