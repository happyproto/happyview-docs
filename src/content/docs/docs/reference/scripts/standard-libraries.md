---
title: "Lua standard libraries"
description: "The parts of Lua 5.4's standard library a script can use in the Lua interpreter."
---

The Lua interpreter (`happyview-lua`) keeps these Lua 5.4 standard libraries and builtins. JavaScript and TypeScript scripts get their engine's own built-ins; see [Languages](/docs/reference/scripts/languages).

## string

The whole [`string`](https://lua.org/manual/5.4/manual.html#6.4) library.

## table

The whole [`table`](https://lua.org/manual/5.4/manual.html#6.6) library.

## math

The whole [`math`](https://lua.org/manual/5.4/manual.html#6.7) library.

## os (safe subset)

Only these three functions are available from the `os` module:

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
- [`rawlen`](https://lua.org/manual/5.4/manual.html#pdf-rawlen)
- [`warn`](https://lua.org/manual/5.4/manual.html#pdf-warn)
- [`_G`](https://lua.org/manual/5.4/manual.html#pdf-_G)
- [`_VERSION`](https://lua.org/manual/5.4/manual.html#pdf-_VERSION)

## Removed modules

These parts of standard Lua are **removed** and unavailable in the sandbox:

`io`, `debug`, `package`, `dofile`, `loadfile`, `load`, `collectgarbage`

Lua's own `require` is removed too, and HappyView installs its own in its place: it loads installed library plugins and the `internal.*` built-ins. See [Built-in modules](/docs/reference/scripts/built-in-modules).
