# Lesson 08 — Events: changing what other plugins do

**Files:** [`plugin.ts`](./plugin.ts) · [`cordis.patch.yml`](./cordis.patch.yml)

## Run it

```bash
./scripts/try-lesson.sh 08-events-and-policy
```

At <http://127.0.0.1:3099>, try both:

> Use lesson_delete_thing to delete "staging cache"

→ allowed, and the terminal logs `[lesson-08] allow …`

> Use lesson_delete_thing to delete "production db"

→ denied. The model is *told why*, so it explains instead of blindly retrying.

## Why this lesson is the important one

Every lesson so far **added** capability. This one **changes existing behavior
without touching the code that owns it**. That is the actual payoff of "everything
is a plugin" — and it is not a toy: sandboxing, the permission system, and plan
mode are all implemented exactly this way, as listeners on documented events.

The architecture docs call this "the microkernel claim made checkable": every
product feature maps to a listener on a published extension point, and **no
feature modifies the agent loop**.

## Waterfall events and `next()`

The interception points are **waterfall** events. Each listener receives a `next`
function:

```ts
ctx.on('tools/pre-execute', async (exec, next) => {
  if (notMyBusiness) return next()        // ← delegate. MANDATORY.
  return { kind: 'deny', reason: '…' }    // ← deliberate short-circuit
})
```

> **Forgetting `next()` silently swallows everyone else's behavior.** A listener
> that only observes or annotates *must* call it. Short-circuiting is correct only
> when you are deliberately making the single decision.

Cordis has five dispatch modes; the mode is part of an event's contract:

| Mode | Call | Semantics |
|---|---|---|
| emit | `ctx.emit(...)` | sync broadcast; returns ignored |
| parallel | `await ctx.parallel(...)` | all listeners concurrently, awaited |
| serial | `await ctx.serial(...)` | in order; first meaningful return wins and stops the rest |
| bail | `ctx.bail(...)` | sync serial |
| waterfall | `ctx.waterfall(..., next)` | around-middleware |

## Choosing the right tool-pipeline hook

This table is the thing to actually remember:

| Hook | Mode | Use it to |
|---|---|---|
| `tools/pre-execute` | reorderable waterfall | **Decide.** Return `{kind:'allow'}` / `{kind:'deny', reason}` / `{kind:'ask', reason?}`. Cannot rewrite args. |
| `ctx.tools.guard(fn)` | monotonic | Enforce an invariant with a **final** denial that ordering cannot undo. |
| `tools/execute` | waterfall wrapper | Wrap the dispatch **lifetime**: timeouts, retries, metrics. May replace only `exec.signal`. |
| `tools/post-execute` | waterfall | **Transform.** Replace `content` **or** `value` (never both), or `block` with feedback. |
| `tools/result` | emit | **Observe** the immutable outcome. Cannot change anything. |

`{kind:'ask'}` routes to `ctx.approval` when mounted; only an `allowed-once`
answer proceeds. With no approval service mounted, `ask` degrades to deny.

Two subtleties from the docs worth flagging:

- Content replacement in `post-execute` is **not a confidentiality boundary**. If
  a programmatic consumer must not see something, replace the *value* or block.
- Ordering cannot undo a `guard` denial — that is the whole point of the seam
  existing separately from `pre-execute`.

## Beyond the tool pipeline

The same pattern reaches the whole agent lifecycle:

| Event | Mode | Purpose |
|---|---|---|
| `agent/pre-step` | waterfall | `reject` a step, or `enter(messages)` to add/replace what enters it. **This is how context injection works.** |
| `system-prompt/assemble` | waterfall | reorder or transform the assembled prompt (expert-level) |
| `agent/request` | waterfall | replace the frozen LLM call config. Cannot mutate messages. |
| `agent/request-error` | waterfall | return `{kind:'retry'}` to own recovery |
| `agent/turn-stopping` | serial | object to a turn ending by calling `agent.steer(...)` |
| `session/event` | emit | the replayable transcript stream — for UIs and telemetry |
| `tools/change`, `commands/change`, `skills/change` | emit | registry invalidation (carry no diff — refetch) |

Rule of thumb from the primer: **prefer events for interception and policy;
prefer service methods for direct capability calls.**

## Declaring your own event

```ts
declare module '@deepseek-ai/cordis' {
  interface Events {
    'lesson/audited'(toolName: string, allowed: boolean): void
  }
}
// emit:   ctx.emit('lesson/audited', name, true)
// listen: ctx.on('lesson/audited', (name, ok) => { … })
```

`ctx.on` is an effect — no `removeListener` bookkeeping, ever.

## Exercises

1. Change the deny to `{ kind: 'ask', reason: '…' }` and see the approval flow.
2. Delete the `return next()` at the end and call *any* other tool. Watch things
   break in a confusing way — that is the bug the rule prevents.
3. Add a `tools/post-execute` listener that appends " [audited]" to the content.
4. Add `ctx.tools.guard(exec => exec.name === 'bash' ? 'no bash in this lesson' : undefined)`
   and try to run a bash command.

---

Prev: **[07 — System prompt](../07-system-prompt/)** · Next: **[09 — Services and seams](../09-services-and-seams/)**
