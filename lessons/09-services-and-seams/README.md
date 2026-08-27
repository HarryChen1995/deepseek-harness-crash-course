# Lesson 09 — Services and capability seams

**Files:** [`service.ts`](./service.ts) · [`provider.ts`](./provider.ts) · [`consumer.ts`](./consumer.ts) · [`cordis.patch.yml`](./cordis.patch.yml)

## Run it

```bash
./scripts/try-lesson.sh 09-services-and-seams
```

```
[lesson-09] provider mounted: ctx.quotes is now available
[lesson-09] consumer mounted: registered lesson_random_quote
```

Then ask the UI for a random programming quote.

## The three-role split

dsh divides a **replaceable** capability into three parts that never depend on
each other sideways:

| Role | Owns | Depends on |
|---|---|---|
| **Service Definition** | the service *name* + the abstract shape + the types | nothing but Cordis |
| **Service Provider** | one concrete implementation | the Definition |
| **Consumer** | how it is presented (usually a tool) | the Definition |

The Provider and the Consumer **never import each other**. That is the entire
point: swap the provider and the consumer needs zero changes.

Real examples in the tree:

| Seam | Definition | Providers | Consumers |
|---|---|---|---|
| `ctx.shell` | `dsh-shell` | `bash-local`, `bash-sandbox`, `pwsh-local` | `tool-bash`, `tool-pwsh` |
| `ctx.fs` | `dsh-fs` | `fs-local`, `fs-sandbox`, `fs-e2b` | `tool-fs` |
| `ctx.llm` | `dsh-llm` | `llm-deepseek`, `llm-pi-ai`, `llm-replay` | `agent-loop`, `compaction-basic` |

Vocabulary point the docs insist on: *the complete capability is the seam. No
individual role is a seam.*

## Defining a service

```ts
import { Service, type Context } from '@deepseek-ai/cordis'

declare module '@deepseek-ai/cordis' {
  interface Context { quotes: QuoteService }     // ← makes ctx.quotes typed
}

export abstract class QuoteService extends Service {
  constructor(ctx: Context) { super(ctx, 'quotes') }   // ← the registration
  abstract random(): Promise<Quote>
}
```

- `super(ctx, 'quotes')` **is** the registration. The string is both the service
  name and the `ctx.` key.
- The `declare module` block belongs in the **Definition**, never in a provider or
  consumer. Consumers pull it in with `import type {} from '…'`.
- `abstract` is what makes this a seam rather than an implementation.

> ⚠️ **`ctx.set()` is not how you register a service.** It only *overwrites* an
> already-provided value, only from the providing fiber, and throws on an
> unprovided name. Use a `Service` subclass, or `ctx.provide(name, value)` for the
> low-level case. This trips people up constantly.

## Export shape — a real trap

> **Service packages `export default` their service class. Function plugins use
> named exports (`name`/`inject`/`Config`/`apply`) and have NO default export.
> Mixing the forms makes the Loader discard the function plugin's namespace.**

This has its own postmortem in the repo. Note how the lesson files differ:
`provider.ts` default-exports the class and nothing else; `consumer.ts` uses only
named exports.

## Consuming

```ts
export const inject = ['tools', 'quotes']    // both must exist before apply runs
```

Then just call it: `await ctx.quotes.random()`. The consumer has no idea which
provider is mounted.

**Optional** dependency instead? Omit it from `inject` and probe at the use site:

```ts
const quotes = ctx.get('quotes')
const q = await quotes?.random()
```

## One provider per context

Loading a second implementation of `quotes` **throws** — standard Cordis
duplicate-service behavior. If you genuinely need two side by side in different
subtrees, use `ctx.isolate('quotes', label)`, which is what the group plugin's
`isolate: { shell: true }` config does.

## Dependency-driven unload

If a provider unloads, **every plugin injecting that service unloads too** — its
effects unwind — and reloads when the service returns. This is why lesson 03's
cleanup discipline is not optional: swapping a provider at runtime exercises your
disposal path.

## The most valuable debugging lesson in this course

Comment out the provider row and reboot:

```
Error: dsh: plugin tree failed to load: dsh: 1 entry did not activate
.../consumer.ts: pending (waiting for service: quotes)
```

Read that as: *something I injected was never provided.* In bare Cordis this
would be **silence** — the fiber sits in `PENDING` forever, nothing prints, and a
composition with nothing else running just exits 0. dsh adds a boot-time
activation guard so you get the message above and exit code 1 instead. Be
grateful; then go find which row was supposed to provide the service.

## When NOT to build a seam

The docs are explicit: **do not split preemptively.** Services are classified by
role:

- **seam** — genuinely replaceable providers (`ctx.shell`, `ctx.fs`, `ctx.llm`)
- **core** — a spine service with exactly one owner (`ctx.tools`, `ctx.sessions`,
  `ctx.systemPrompt`)
- **bundle** — a composition point (`ctx.agentLoop`)

If your capability has one sensible implementation, write a plain concrete
`class MyService extends Service` and skip the abstraction entirely.

## Exercises

1. Swap the two rows in `cordis.patch.yml`. Nothing changes — activation is
   service-driven, not order-driven.
2. Write a second provider (`provider-uppercase.ts`) that wraps the same quotes in
   uppercase. Point the row at it. The consumer is untouched.
3. Mount both providers at once and read the duplicate-service error.
4. Remove `'quotes'` from `inject` and use `ctx.get('quotes')` instead. Now the
   plugin activates with or without a provider.

---

Prev: **[08 — Events and policy](../08-events-and-policy/)** · Next: **[10 — Skills](../10-skills/)**
