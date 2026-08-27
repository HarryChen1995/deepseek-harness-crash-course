# Lesson 05 — Your first tool

**Files:** [`plugin.ts`](./plugin.ts) · [`cordis.patch.yml`](./cordis.patch.yml)

## Run it

```bash
./scripts/try-lesson.sh 05-your-first-tool
```

Then open <http://127.0.0.1:3099> and ask:

> Use the lesson_greet tool to greet Ada, excited.

You should see a `Tool call · lesson_greet` row in the transcript and
`Hello, Ada!` come back.

## What's new

Two things beyond lessons 02-04:

```ts
export const inject = ['tools']              // 1. declare the dependency
ctx.tools.register(defineTool({ … }))        // 2. register the tool
```

### `inject`

`ctx.tools` does not exist for you by default. `inject = ['tools']` tells Cordis:
hold this plugin in **PENDING** until the `tools` service is available, then run
`apply`.

Consequences worth internalizing:

- `apply` **never** sees a missing dependency. No defensive `if (!ctx.tools)`.
- **Row order in YAML is irrelevant.** Activation is driven by service
  availability, not file order.
- If the service never appears, your plugin never runs — and dsh fails the boot
  loudly telling you which service is missing (you'll see this in lesson 09).

### `ctx.tools.register`

Returns a disposer, but it is already an effect — unload the plugin and the tool
unregisters itself. Call it bare; no `ctx.effect` wrapper (lesson 03).

## The four required fields

```ts
defineTool({
  name: 'lesson_greet',
  description: 'Greet a person by name. Use when the user asks for a greeting.',
  parameters: { … },
  output: { schema, render },
  async execute(args) { … },
})
```

**`name`** — what the model types. snake_case, to match the shipped tools
(`read`, `write`, `bash`, `web_search`). Must be unique in its registry layer.
`run_code` is reserved and throws.

**`description`** — the model decides whether to call your tool based almost
entirely on this. Write it for the model: say what it does *and when to use it*.
Shipped skills use the same trick — start with "Use when…".

**`parameters`** — **not** a JSON Schema object. A bare property map:

```ts
parameters: {
  name:    { type: 'string', required: true, description: '…' },
  excited: { type: 'boolean', description: '…' },        // optional
}
```

Properties are **optional by default**. Add `required: true` to demand one.

> ⚠️ `required: false` is **rejected at load time**:
> `unsupported JSON schema: parameters.excited.required must be true when present`.
> Omit the key instead. This is the single most common first-time error.

**`output`** — mandatory, and the part people skip past. Two halves:

| | |
|---|---|
| `schema` | the *canonical value* `execute` returns. Validated and frozen. This is the programmatic contract — also what a Code Mode caller receives. |
| `render(args, value)` | converts that value into the content blocks the **model** reads. |

Splitting them is what lets one tool serve both a machine caller and a language
model. Keep prose and formatting in `render`; keep the return value structured.

**`execute(args)`** — `args` is validated and frozen before you see it, so no
manual type checks. Return exactly what `output.schema` promised.

## Where the tool goes

Registered tools become part of the system prompt automatically: the registry
projects an allowlist of `name` + `description` + `parameters` into each model
request. Your `execute`, `output`, `presentCall` etc. never reach the wire.

Nothing else is needed to "expose" a tool. Register it and it is offered.

## Exercises

1. Ask the model to call `lesson_greet` with no name. Watch the validation error
   the model receives — it explains itself and retries.
2. Add `required: false` to `excited` and reboot, to see the load error firsthand.
3. Change the description to something vague ("greets"). Ask an indirect
   question and observe the model choosing the tool less reliably. Descriptions
   are the routing signal.

---

Prev: **[04 — Config and schema](../04-config-and-schema/)** · Next: **[06 — Tools, properly](../06-tool-deep-dive/)**
