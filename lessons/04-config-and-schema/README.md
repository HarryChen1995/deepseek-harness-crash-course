# Lesson 04 — Config and schema

**Files:** [`plugin.ts`](./plugin.ts) · [`cordis.patch.yml`](./cordis.patch.yml)

## Run it

```bash
./scripts/try-lesson.sh 04-config-and-schema
```

```
[lesson-04] config Cordis handed me: {"greeting":"Hei","times":2,"mode":"loud","names":["Ada","Linus"]}
[lesson-04] HEI, ADA!
[lesson-04] HEI, ADA!
[lesson-04] HEI, LINUS!
[lesson-04] HEI, LINUS!
```

## The idea

A plugin that hardcodes its behavior can be used exactly one way. The repo's own
test for what belongs in config is worth memorizing:

> Can `cordis.yml` change this without a code edit?

If two deployments might reasonably want different values, it is config.

## Declare it twice, on purpose

```ts
export interface Config { … }               // the TypeScript type
export const Config: Schema<Config> = …     // the runtime validator
```

Same name, two meanings. TypeScript takes the interface; Cordis takes the value.
This is idiomatic in the codebase, not a trick.

Class-form plugins use `static Config = …` instead.

## Schemastery in practice

```ts
import Schema from '@deepseek-ai/schemastery'
```

The package's default export is both a value and a type alias, so `Schema<Config>`
works as a type annotation. Shipped packages usually import it as `z`; the docs
call it `Schema`. Same thing.

**Constructors:** `string() number() boolean() date() array(inner) dict(inner)
object({…}) union([…]) tuple([…]) intersect([…]) const(v) natural() percent()
any() never() transform(inner, cb) lazy(cb)`

**Modifiers** (chainable): `.default(v) .required() .min(n) .max(n) .step(n)
.pattern(re) .description(s) .hidden() .deprecated() .role(s)`

`.max()` works on numbers *and* collection lengths. `Schema.array(String)` is
shorthand — bare `String`/`Number`/`Boolean` constructors are accepted anywhere a
schema is.

## What Cordis does with it

Cordis accepts any [Standard Schema](https://standardschema.dev/) validator. At
load it validates your row's `config`, **fills in defaults**, and passes the
*result* to `apply`. So:

- `config` inside `apply` is always complete and correct. **Never re-default it.**
- Validation is **sync only** — an async validator throws
  `TypeError: Async config validation is not supported`.
- A bad config fails the **load**, not the call.

Try it — set `times: 99` and re-run:

```
ValidationError: invalid config:
expected number <= 5 but got 99 (at times)
```

and `dsh` exits with code **1**. That is deliberate: a dead harness beats one
running half-configured.

## The silent failure to know about

```ts
export const Config = { greeting: 'Hello' }   // ⛔ a plain object
```

This does **nothing**. Cordis looks for a Standard Schema validator, finds none,
and passes your YAML through unvalidated — no error, no defaults, no types. The
docs warn about it twice. If defaults mysteriously aren't applied, check this
first.

## Exercises

1. Delete `mode` from the patch row. It comes back as `'quiet'` — the default.
2. Set `times: 'three'`. Read the type error; note it names the path.
3. Add a `.required()` field with no default and omit it. Confirm the load fails.
4. Add a nested object field with `Schema.object({...})` and set it from YAML.

## Reference

`docs/config-catalog.md` in the checkout is a **generated** catalog of the legal
`config` shape of every shipped plugin, with a `Requires:` line naming the
services each one injects. When you want to configure a built-in row, that file
is the lookup — not the source.

---

Prev: **[03 — Lifecycle and effects](../03-lifecycle-and-effects/)** · Next: **[05 — Your first tool](../05-your-first-tool/)**
