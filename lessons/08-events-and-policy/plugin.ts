/**
 * Lesson 08 — Events: intercepting what other plugins do.
 *
 * Everything so far ADDED capability. This lesson CHANGES existing behavior
 * without touching the code that owns it. That is the core claim of the
 * "everything is a plugin" design, and it is how sandboxing, permissions, and
 * plan mode are all implemented.
 *
 * The tool pipeline exposes four interception points. Choosing correctly matters:
 *
 *   tools/pre-execute   reorderable POLICY. Return allow / deny / ask.
 *   ctx.tools.guard()   a monotonic FINAL denial that ordering cannot undo.
 *   tools/execute       wrap the dispatch LIFETIME (timeouts, retries, metrics).
 *   tools/post-execute  TRANSFORM the result, or block it with feedback.
 *   tools/result        OBSERVE the immutable outcome. Cannot change it.
 *
 * These are "waterfall" events: each listener receives a `next` function and
 * MUST call it unless it is deliberately short-circuiting. Forgetting next()
 * silently swallows everyone else's behavior.
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-tools'

export const name = 'lesson-08-events-and-policy'
export const inject = ['tools']

export function apply(ctx: Context) {
  // A deliberately dangerous-looking tool for the policy below to act on.
  ctx.tools.register(defineTool({
    name: 'lesson_delete_thing',
    description: 'Delete a named thing. (Lesson stub — deletes nothing real.)',
    parameters: {
      target: { type: 'string', required: true, description: 'What to delete' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      return `pretended to delete: ${args.target}`
    },
  }))

  // ---- 1. A policy gate on tools/pre-execute ------------------------------
  // Runs BEFORE the tool body. Return a typed decision:
  //   { kind: 'allow' }                    let it through
  //   { kind: 'deny', reason }             refuse; the model sees the reason
  //   { kind: 'ask', reason? }             route to the human approval flow
  // Note you cannot rewrite the arguments here — policy decides, it does not edit.
  ctx.on('tools/pre-execute', async (exec, next) => {
    if (exec.name === 'lesson_delete_thing') {
      const target = String((exec.arguments as { target?: unknown }).target ?? '')

      if (target.includes('production')) {
        console.log(`[lesson-08] DENY ${exec.name}(${target})`)
        return { kind: 'deny', reason: 'Refusing to touch anything named "production".' }
      }

      console.log(`[lesson-08] allow ${exec.name}(${target})`)
    }

    // Not our business -> delegate. This call is mandatory.
    return next()
  })

  // ---- 2. Observing the outcome on tools/result ---------------------------
  // Observe-only: the result is already final and frozen here. Failures in this
  // listener are contained and cannot break the call. Perfect for metrics and
  // audit logs; useless for changing anything.
  ctx.on('tools/result', (exec, result) => {
    console.log(
      `[lesson-08] observed ${exec.name} ->`,
      result.isError ? 'ERROR' : 'ok',
    )
  })

  console.log('[lesson-08] policy gate armed on tools/pre-execute')

  // ---- Try it -------------------------------------------------------------
  // In the UI ask:  Use lesson_delete_thing to delete "staging cache"   -> allowed
  //                 Use lesson_delete_thing to delete "production db"   -> denied,
  //                 and the model is told why, so it can explain instead of retry.
}
