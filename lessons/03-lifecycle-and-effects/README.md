# Lesson 03 — Lifecycle and effects

**Files:** [`plugin.ts`](./plugin.ts) · [`cordis.patch.yml`](./cordis.patch.yml)

## Run it

```bash
./scripts/try-lesson.sh 03-lifecycle-and-effects
```

```
[lesson-03] mounting a child plugin that registers 3 effects…
[lesson-03]   effect A: acquired
[lesson-03]   effect B: interval started
[lesson-03]   effect C: acquired
[lesson-03] child fiber state = 2 (2 == ACTIVE)
[lesson-03] live effects: ["lesson-03: effect A","lesson-03: heartbeat","lesson-03: effect C","ctx.on(\"internal/error\")"]
[lesson-03]   tick from a live interval
[lesson-03] disposing the child…
[lesson-03]   effect C: released
[lesson-03]   effect B: interval cleared
[lesson-03]   effect A: released
[lesson-03] disposed. fiber.uid is now null (null == gone)
```

Read that output twice. **C, B, A** — teardown runs in reverse.

## Why this lesson exists before any tool lesson

Plugins get unloaded. Constantly. A config edit unloads and reloads you. HMR
unloads and reloads you on every file save. A service you depend on going away
unloads you and reloads you when it returns. If your plugin leaks a timer or a
socket on unload, you now have a callback firing against a dead context — and in
a hot-reload loop, one leak per save.

So Cordis makes cleanup structural rather than something you remember.

## The rule

> Anything you register **through a Cordis API** is already tracked and undone on
> unload. Anything you create **outside** Cordis, you must wrap in `ctx.effect()`.

Already tracked — call these bare:

```ts
ctx.on('some/event', fn)                    // listener
ctx.plugin(child)                           // child plugin
ctx.tools.register(defineTool({ … }))       // tool          (lesson 05)
ctx.systemPrompt.section({ … })             // prompt section (lesson 07)
ctx.commands.register({ … })                // command        (lesson 11)
```

Needs wrapping — anything with its own lifetime:

```ts
ctx.effect(() => {
  const timer = setInterval(tick, 400)
  return () => clearInterval(timer)        // the disposer
}, 'my-heartbeat')                          // the label is optional but do it
```

The mixed case to watch for: a service method that hands you back a raw disposer
rather than tracking it itself. Then you wrap:

```ts
ctx.effect(() => ctx.someRegistry.register(thing), 'label')
```

## `ctx.effect` semantics

| | |
|---|---|
| When does `execute` run? | **Immediately**, synchronously. |
| When does the disposer run? | On plugin unload, or when you call the returned handle — whichever is first. |
| Order across effects | **Reverse** registration order. |
| Multiple async disposers | Started in reverse order but run **concurrently**. If teardown must be sequential, keep the steps inside *one* disposer and `await` them there. |
| Calling the handle twice | No-op. Single-shot. |
| Registering on a dead fiber | Throws `CordisError('INACTIVE_EFFECT')`. |

An effect body may return one disposer, a promise of one, or a (possibly async)
iterable yielding several.

## Fibers

A **fiber is one loaded plugin instance** — its state, its validated config, and
its registered effects. It is the unit of disposal.

```
PENDING → LOADING → ACTIVE → UNLOADING → DISPOSED
                 ↘ FAILED
```

Numeric values, since that is what prints: `0 PENDING, 1 LOADING, 2 ACTIVE,
3 FAILED, 4 DISPOSED, 5 UNLOADING`.

`PENDING` is the one to remember: it means *waiting for an injected service*
(lesson 09). `ctx.fiber` is your own fiber; `ctx.plugin(x)` returns the child's.

Useful members: `fiber.state`, `fiber.uid` (`null` once disposed),
`fiber.dispose()` (resolves after **all** cleanup, recursively), `fiber.restart()`,
`fiber.update(config)`, and `fiber.getEffects()` — which is why labels pay off.

Notice the fourth entry in the printed effect list:
`ctx.on("internal/error")`. We never labelled that; Cordis auto-labelled it.
That is direct proof `ctx.on` really is an effect owned by the fiber, exactly
like the three registered by hand.

## You normally never call `dispose()`

The lesson calls it only to make the invisible visible. In real code Cordis calls
it for you. Writing a manual dispose of your own plugin's lifetime effects is a
mistake — the docs are blunt about it: *"You never call the disposer yourself."*

## Exercises

1. Delete the `return () => clearInterval(timer)` line from effect B and re-run.
   The interval keeps ticking after `disposed.` prints — the leak, live.
2. Add a fourth effect whose disposer `await`s a 500 ms sleep before logging.
   Watch it interleave with the others: concurrent, not sequential.
3. Call `fiber.dispose()` twice. Nothing bad happens — disposers are single-shot.

---

Prev: **[02 — Your first plugin](../02-first-plugin/)** · Next: **[04 — Config and schema](../04-config-and-schema/)**
