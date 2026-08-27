# Lesson 11 — Human commands

**Files:** [`plugin.ts`](./plugin.ts) · [`cordis.patch.yml`](./cordis.patch.yml)

## Run it

```bash
./scripts/try-lesson.sh 11-commands
```

At <http://127.0.0.1:3099>:

> /wordcount the quick brown fox jumps over the lazy dog

You get an answer **instantly** — no model call, no tokens, no tool row in the
transcript. Then try `/wordcount` with no argument to see the error path.

## The point

Everything up to now was for the model. A command is for the **human**. The
handler runs immediately and its result is rendered directly by the UI. Nothing
reaches the model unless you explicitly send it.

That makes commands the right tool for: session utilities, exports, toggles,
diagnostics, "show me X" — anything where involving a language model would be
pure waste.

## dsh has two slash namespaces

This is the most common point of confusion in the whole system, and neither
subsystem's docs cross-reference the other:

| | `ctx.commands` (this lesson) | `/skill-name` (lesson 10) |
|---|---|---|
| Namespace | **closed** registry | **open** skill catalog |
| Slash position | **byte zero only** | whitespace-bounded, **anywhere** |
| Resolved | **client-side**, before the line becomes a prompt | **host-side**, inside `agent/pre-step` |
| Model sees | **nothing** | the full `<skill_content>` block |
| Session log | `command/run` + `command/done` (log-only) | a `user/message` injection |
| Unknown name | rejected by the adapter | stays ordinary prose |

`/wordcount` and `/quote-formatter` look identical in the composer and share
nothing mechanically.

## The API

```ts
export const inject = ['commands']

ctx.commands.register({
  name: 'wordcount',                         // lowercase, no leading slash
  description: 'count words in the text',    // shown in command discovery UI
  input: { hint: '<text>', images: false },  // advertises free-form input
  recordInput: true,                         // log rawInput on command/run?
  handler: (invocation) => CommandResult,
})
```

Already an effect — unloading the plugin unregisters the command.

### `CommandInvocation`

| Member | Notes |
|---|---|
| `commandId` | pairing id, already written to the `command/run` event |
| `agent` | the exact `Agent` whose UI received this |
| `rawInput` | everything after the name, **including the separator whitespace** — trim it yourself |
| `attachments` | frozen `ImageBlock[]`; empty unless `input.images: true` |
| `signal` | `AbortSignal` owned by the dispatching UI request |

### `CommandResult`

```ts
| { kind: 'success', text?: string, sourceEventSeq?: number }
| { kind: 'error',   text: string }
```

An error result is a **normal outcome**, not an exception. A thrown or aborted
handler also settles as `kind: 'error'`.

`sourceEventSeq` (success only) may reference an earlier non-command event in the
session log, letting a client render a richer projection instead of parsing your
`text`.

## Registry surface

```ts
register(definition): () => void
list(agent): readonly CommandDescriptor[]       // @Remote — name-sorted
find(agent, name): CommandDefinition | undefined
execute(agent, line, images, signal): Promise<CommandExecution | undefined>   // @Remote
```

`parseCommand` accepts: a slash at byte **zero**, then a lowercase name of
letters/digits/`_`/`-`, then end-of-input or whitespace. Everything after is
`rawInput` — **you own your own argument grammar.**

## Semantics to know

- **Scoping.** A plain-context registration is **global**. Registering through a
  child of `agent.ctx` makes it agent-local and it **shadows** a global of the
  same name. Duplicate names *within one layer* fail at registration.
- **Images are admitted in `execute`, not the composer.** Sending images to a
  command without `input.images` fails *before* your handler runs, and no durable
  object is published.
- **Nothing reaches the model implicitly.** The registry never submits `rawInput`
  to the agent. A producer *may* explicitly schedule model work — that is what
  `/plan [message]` does — and then owns that contract.
- **Logging.** `command/run` is appended *before* the handler, `command/done` at
  settlement. Both are standalone log-only appends with **no turn wrapping them**.
  Admission misses (bad syntax, unknown name) log **nothing**.
- **`commands/change`** fires on register/unregister.
- **Cancellation is cooperative** — the registry stops awaiting, but an
  uncooperative handler can keep running side effects.

Shipped examples to read: `packages/feedback/command-feedback` (the simplest),
`packages/compaction/command-compact`, `packages/goal/command-goal`, and the two
agent-scoped cases in `packages/plan/plan-mode` and
`packages/interaction/permission-presets`.

## Composition note

`@deepseek-ai/dsh-commands` is mounted by the base bundle and the web client
dispatches through it. UI-less compositions (ACP automation, demo spines) provide
no command adapter — a custom interactive composition must mount it explicitly.

## Known limits

Unstructured **text input only** — no forms, no completion schemas, no typed
arguments. Parsing is command-owned by design.

## Exercises

1. Add `images: true` and echo `invocation.attachments.length`.
2. Register a second command with the same name → registration error.
3. Return `{ kind: 'error', text: ... }` unconditionally and watch the UI render it.
4. From the handler, call an `Agent` method to actually send something to the
   model — then decide whether you wanted a command or a tool after all.

---

Prev: **[10 — Skills](../10-skills/)** · Next: **[12 — MCP integration](../12-mcp-integration/)**
