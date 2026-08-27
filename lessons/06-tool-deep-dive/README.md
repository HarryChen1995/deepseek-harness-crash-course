# Lesson 06 — Tools, properly

**Files:** [`plugin.ts`](./plugin.ts) · [`cordis.patch.yml`](./cordis.patch.yml)

## Run it

```bash
./scripts/try-lesson.sh 06-tool-deep-dive
```

Then at <http://127.0.0.1:3099>:

> Use lesson_word_stats on "the quick brown fox jumps over the lazy dog", top 2.

## One tool, three audiences

This is the organizing idea. A single tool definition serves three consumers that
see **different things**:

| Audience | Sees |
|---|---|
| The **model** | `name`, `description`, `parameters` — then reads `output.render(…)` |
| A **programmatic caller** (Code Mode) | `output.schema`'s value, verbatim |
| The **human UI** | `presentCall(…)` / `presentResult(…)` cards |

Which is why you never format prose into your return value. Return structure;
let `render` speak to the model and the cards speak to the human.

## The parameter DSL, exactly

Supported `type`: `string` `number` `integer` `boolean` `null` `array` `object`
`json`. Or a `oneOf` branch node — with **no** `type` alongside it.

Supported annotations: `description` `title` `default` `examples`.

```ts
parameters: {
  text: { type: 'string', required: true },

  sort: { type: 'string', enum: ['length', 'alpha'], default: 'length' },

  tags: { type: 'array', items: { type: 'string' } },

  where: {
    type: 'object',
    additionalProperties: false,      // ← MANDATORY on nested objects
    properties: { file: { type: 'string', required: true } },
  },

  target: { oneOf: [{ type: 'string' }, { type: 'integer' }] },

  raw: { type: 'json' },              // any lossless JSON, unconstrained
}
```

### What is NOT supported

`minimum` `maximum` `maxLength` `minLength` `pattern` `format` `minItems`
`nullable`. The compiler rejects unknown keys per node:

```
parameters.top.minimum is not supported by the value schema DSL
```

**Range-check those yourself in `execute` and `throw`.** That is what this
lesson's `top` bounds check demonstrates.

### Other rules the compiler enforces

- `additionalProperties` must be explicitly `true` or `false` on an object node.
  The parameter **root** is implicitly open, so extra top-level args pass.
- Cannot declare both `type` and `oneOf`; `oneOf` needs ≥2 branches.
- `required` is not allowed inside `oneOf` branches or `items`.
- `enum` must be a non-empty array of scalars.
- **`default` is an annotation only — it is never applied.** An omitted arg is
  genuinely `undefined`. Apply your own fallback (`args.top ?? 3`).

## `output`, in full

```ts
output: {
  schema: { … },                        // required: the canonical value
  render: (args, value) => ContentBlock[],   // required
  presentationMeta: (args, value) => JsonValue,   // optional, for the UI
}
```

`ContentBlock` is a union keyed by `type`. In practice you emit `text`, and
`image` when you have one:

```ts
render: (_a, v) => [
  { type: 'text', text: 'summary line' },
  { type: 'image', attachment: someImageRef },
]
```

`render` and `presentationMeta` must be **pure** — they also run when replaying an
old session log. No I/O, no clock, no randomness.

If `execute` returns something that violates `output.schema`, the call becomes an
error result (`INVALID_TOOL_OUTPUT`). The schema is enforced, not decorative.

## `execute(args, exec)`

The second argument is the `ToolRunContext`:

| Member | Use |
|---|---|
| `signal` | **An `AbortSignal`. Honor it.** Forward it to fetch/spawn; call `exec.signal.throwIfAborted()` at checkpoints. |
| `callId`, `name` | identity, for logging |
| `agent?` | the calling Agent — **optional**, tools can run outside an agent |
| `deferContext(msg)` | attach context emitted after this result |
| `concludeTurn()` | mark a successful result as ending the agent's turn |

### Signalling failure

**Throw.** The registry catches it and produces an `isError` result the model can
read and react to.

```ts
if (top < 1 || top > 10) throw new Error('`top` must be between 1 and 10')
```

Do **not** return `"error: ..."` as your value — that reads as success.

The nuance: throw for *infrastructure* failures. A non-ideal but genuine domain
outcome (a command exiting non-zero, a search finding nothing) belongs in the
canonical value, with `render` explaining it.

## Optional fields worth knowing

| Field | Purpose |
|---|---|
| `timeoutMs` | Cooperative deadline. Must be positive and finite. Never sent to the model. The registry does not abandon your promise — stay cooperative on `signal`. |
| `isConcurrencySafe(args)` | Pure classifier. Exactly `true` opts the call into a parallel sibling group. Only claim it if the body has no shared mutable state. |
| `finalizeContent(exec, result)` | Sync, runs **exactly once per outcome** including failures. A last content-only invariant. Must not throw. |
| `presentCall(args)` | The pending UI card. |
| `presentResult(args, result)` | The completed UI card. |

Card shapes are a `card`-tagged union: `generic` (with `title`, `kind`,
`locations`), `terminal`, `diff`, `search`, `read`, `web`. `kind` drives the icon:
`read|edit|delete|move|search|execute|fetch|other`.

## The execution pipeline

Between the model emitting a call and the result returning:

1. `tool/call` logged → `presentCall` renders the pending card
2. args materialized as frozen lossless JSON
3. **`tools/pre-execute`** (waterfall) → allow / deny / ask *(lesson 08)*
4. `ctx.tools.guard()` — monotonic final denials
5. **`tools/execute`** (waterfall) — wraps the dispatch lifetime
6. your `execute` runs → value validated + frozen → `render` + `presentationMeta`
7. **`tools/post-execute`** (waterfall) — replace content **or** value, or block
8. `finalizeContent` (once) → **`tools/result`** (observe only) → `tool/result` logged
9. `presentResult` renders the final card

Note step 8: `tool/result` persists `content`, `error`, and `meta` — **never the
canonical `value`**.

## Exercises

1. Add `minimum: 1` to `top` and reboot. Read the rejection; that is the DSL
   boundary.
2. Ask for `top: 50`. Confirm the thrown error surfaces to the model as an error
   result and it recovers.
3. Add a `presentResult` and watch the completed card change in the UI.
4. Make `render` return two blocks instead of one and observe the model's view.

---

Prev: **[05 — Your first tool](../05-your-first-tool/)** · Next: **[07 — System prompt](../07-system-prompt/)**
