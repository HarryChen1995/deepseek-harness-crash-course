/**
 * Lesson 02 — Your first Cordis plugin.
 *
 * A dsh plugin is just an ES module with named exports. There is no manifest,
 * no registration call, no base class to extend. Cordis looks for:
 *
 *   name    (optional) a label used in diagnostics and logs
 *   inject  (optional) service names this plugin needs before it may start
 *   apply   (required) the body — runs once per plugin instance
 *
 * That's the whole contract. Everything else in this course is things you can
 * *do* inside apply().
 */

import type { Context } from '@deepseek-ai/cordis'

import Schema from '@deepseek-ai/schemastery'

// 1. Define the TypeScript types for safety
export interface Config {
  greeting: string
  maxRetries: number
}

// 2. Define the structural schema with fallback defaults
export const Config: Schema<Config> = Schema.object({
  greeting: Schema.string().default(''),
  maxRetries: Schema.number().default(0),
})

// `name` is metadata only. It is NOT a service name and nothing resolves it —
// it just makes logs and error messages readable.
export const name = 'lesson-02-first-plugin'

/**
 * `apply` receives its own child Context. "Its own" matters: every registration
 * you make through this `ctx` is attributed to this plugin instance, which is
 * how Cordis can cleanly unload you later (lesson 03).
 *
 * `ctx.logger(...)` is the framework's logger service. We use it instead of
 * console.log because it is what the harness's own plugins use, and it tags
 * output with the plugin it came from.
 */
export function apply(ctx: Context, config: Config) {
  // Deliberately console.log and not ctx.logger(...).
  //
  // ctx.logger('name') IS the framework logger and is what harness plugins use
  // — but in the `web` profile nothing attaches a console exporter to it, so
  // ctx.logger output goes nowhere you can see. For learning, we want output on
  // the terminal, so this course uses console.log for teaching signals and
  // saves ctx.logger for when you ship something.

  console.log(`[less_02]  config: ${JSON.stringify(config)}`)
  console.log('[lesson-02] hello from my first dsh plugin')

  // Proof that this really is a fresh child Context per plugin instance:
  // ctx.fiber is the object representing THIS loaded instance (lesson 03).
  console.log('[lesson-02] fiber uid =', ctx.fiber.uid, '| name =', ctx.fiber.name)
}
