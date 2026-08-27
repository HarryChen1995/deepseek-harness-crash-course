# Lesson 07 — Teaching the model via the system prompt

**Files:** [`plugin.ts`](./plugin.ts) · [`cordis.patch.yml`](./cordis.patch.yml)

## Run it

```bash
./scripts/try-lesson.sh 07-system-prompt
```

At <http://127.0.0.1:3099>:

> What's the temperature in Oslo in Fahrenheit?

Watch the model call `lesson_temperature`, then *convert* — because the prompt
section told it the value is always Celsius. That instruction is nowhere in the
tool's schema.

## The problem this solves

A tool's `description` describes **one call**. But some guidance spans calls:

- "the value is always in Celsius, convert before answering"
- "check the exit code on every result before continuing"
- "call this at most once per turn"
- "prefer `grep` over `bash grep`"

Cramming that into schema prose bloats every request and reads badly. It belongs
in the system prompt.

## The API

```ts
export const inject = ['tools', 'systemPrompt']
import type {} from '@deepseek-ai/dsh-system-prompt'

ctx.systemPrompt.section({
  name: 'lesson:temperature',   // unique within this layer; duplicate throws
  order: 150,                   // ascending; finite (NaN/Infinity throw)
  text: GUIDANCE,               // string, or (assembleContext) => string
})
```

Already an effect — unload the plugin and the guidance goes with it.

Note that bare `import type {}` line. It imports **nothing by name**; its only
job is to pull in the module's TypeScript declaration merge so `ctx.systemPrompt`
type-checks. This is idiomatic throughout the codebase and looks like a mistake
until you know it.

## Ordering bands

Sections are concatenated in **ascending** `order`:

| Band | Contents |
|---|---|
| `-100` | harness identity |
| `0` | deployment persona |
| **`100`–`199`** | **tool guidance — yours goes here** |

Real values in the shipped tree: `tool:read` 100, `tool:bash` 105, `tool:lsp` 112,
`tool:cordis` 115.

Ties break by plugin **load order**, which is an accident of composition — so
determinism depends on you picking a distinct number. Don't collide.

## Siblings on the same service

| Method | Purpose |
|---|---|
| `section({name, order, text, complete?})` | static-ish prompt text |
| `context({name, order, text})` | cache-safe **dynamic** model context; materialized as a durable user-role snapshot, logged only when changed |
| `variable(name, provider)` | fills `{{name}}` placeholders in section text |
| `tools(provider)` | contribute tool schemas |
| `assemble(context?)` | build the whole prompt — useful for debugging |
| `suppressRuntimeContext()` | opt out of runtime context |

Prefer `context()` over `section()` for anything that changes frequently:
`section` text participates in the cached prefix, so churning it costs you prompt
cache hits.

## Scoping and shadowing

`ctx.systemPrompt.section(...)` on a plain context is **global**. The same call on
`agent.ctx.systemPrompt` contributes to that **one agent** and *shadows* a global
section of the same name. Registration and disposal both emit
`system-prompt/change`.

## The gotcha

Sections and tool schemas are **separate** assembly inputs. So restricting or
removing a tool does **not** remove its prompt section — you own that with the
disposer. A section describing a tool the model can no longer see is worse than
no section at all.

## Exercises

1. Delete the section registration, reboot, ask the Fahrenheit question again.
   The model now reports the raw number as if it were Fahrenheit. That gap is
   what the section was buying.
2. Change `order` to `50` — before the persona band. Still works, but now your
   tool guidance precedes the harness's own framing. Consider why the bands exist.
3. Register two sections with the same `name` and watch it throw.
4. Add `ctx.systemPrompt.variable('lessonUnit', () => 'celsius')` and reference
   `{{lessonUnit}}` in the section text.

---

Prev: **[06 — Tools, properly](../06-tool-deep-dive/)** · Next: **[08 — Events and policy](../08-events-and-policy/)**
