/**
 * Lesson 03 — Lifecycle and effects: how a plugin cleans up after itself.
 *
 * THE RULE: anything you register through a Cordis API is already tracked and
 * is undone when your plugin unloads. Anything you create OUTSIDE Cordis — a
 * timer, a socket, a file watcher, a child process — you must wrap in
 * ctx.effect(), or it keeps running after your plugin is gone.
 *
 * This lesson demonstrates disposal for real: it mounts a CHILD plugin, lets it
 * register three effects, then disposes it and prints the teardown order.
 */

import type { Context } from '@deepseek-ai/cordis'

export const name = 'lesson-03-lifecycle'

/**
 * A small child plugin whose only job is to register effects so we can watch
 * them unwind. In real life this is your plugin: a timer, a watcher, a
 * connection.
 */
function leakyThenTidy(ctx: Context) {
  // ctx.effect(execute, label?) runs `execute` IMMEDIATELY. Whatever disposer
  // it returns is bound to this plugin instance (its "fiber") and runs when the
  // plugin unloads — or when you call the handle it returns, whichever is first.
  ctx.effect(() => {
    console.log('[lesson-03]   effect A: acquired')
    return () => console.log('[lesson-03]   effect A: released')
  }, 'lesson-03: effect A')

  ctx.effect(() => {
    const timer = setInterval(() => {
      // Without the disposer below, this interval would keep firing forever
      // after the plugin unloaded — on a dead context. That is THE bug
      // ctx.effect exists to prevent.
      console.log('[lesson-03]   tick from a live interval')
    }, 400)
    console.log('[lesson-03]   effect B: interval started')
    return () => {
      clearInterval(timer)
      console.log('[lesson-03]   effect B: interval cleared')
    }
  }, 'lesson-03: heartbeat')

  ctx.effect(() => {
    console.log('[lesson-03]   effect C: acquired')
    return () => console.log('[lesson-03]   effect C: released')
  }, 'lesson-03: effect C')

  // ctx.on(...) is ALREADY an effect — no wrapper needed, no removeListener to
  // remember. It disappears with the plugin automatically.
  ctx.on('internal/error', () => {})
}

export async function apply(ctx: Context) {
  console.log('[lesson-03] mounting a child plugin that registers 3 effects…')

  // ctx.plugin() mounts a plugin in the current context and returns its Fiber:
  // the object that represents one loaded plugin instance. A fiber is the unit
  // of disposal — everything registered through its ctx belongs to it.
  const fiber = await ctx.plugin(leakyThenTidy)

  // FiberState is a numeric enum: 0 PENDING, 1 LOADING, 2 ACTIVE, 3 FAILED,
  // 4 DISPOSED, 5 UNLOADING. A healthy just-mounted plugin reads 2.
  console.log('[lesson-03] child fiber state =', fiber.state, '(2 == ACTIVE)')

  // fiber.getEffects() returns one EffectMeta { label, children } per live
  // effect — this is why passing `label` is worth it. Note the 4th entry:
  // ctx.on("internal/error") is in here too, auto-labelled by Cordis. That is
  // the proof that ctx.on() really is an effect owned by this fiber, exactly
  // like the three we registered by hand.
  const labels = fiber.getEffects().map((e) => e.label)
  console.log('[lesson-03] live effects:', JSON.stringify(labels))

  // Let the interval fire a couple of times so you can see it alive.
  await new Promise((resolve) => setTimeout(resolve, 1000))

  console.log('[lesson-03] disposing the child…')

  // Disposal unwinds effects in REVERSE registration order: C, then B, then A.
  // await resolves only after all cleanup — including async disposers — is done.
  await fiber.dispose()

  console.log('[lesson-03] disposed. fiber.uid is now', fiber.uid, '(null == gone)')
  console.log('[lesson-03] note the interval stopped ticking — that is effect B unwinding.')

  // NOTE: you normally never call dispose() yourself. Cordis calls it for you
  // when your plugin is unloaded, replaced, or hot-reloaded. We call it here
  // only to make the invisible visible.
}
