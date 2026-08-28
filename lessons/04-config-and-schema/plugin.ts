/**
 * Lesson 04 — Typed, validated plugin config.
 *
 * A plugin that hardcodes its behavior can only be used one way. dsh's rule of
 * thumb (docs/user/develop/basic/config.md): if two deployments might set it
 * differently, it belongs in config. The test is "can cordis.yml change this
 * without editing code?"
 *
 * Config is declared TWICE, deliberately, under the same name:
 *   export interface Config  — the TypeScript type, for you and your consumers
 *   export const Config      — the runtime validator, for Cordis
 *
 * Cordis validates the YAML against the schema, fills in defaults, and only
 * then calls apply(ctx, config). So `config` inside apply is always complete
 * and correct — never re-default it yourself.
 */

import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'

export const name = 'lesson-04-config'


export interface Config {
  /** What to greet with. */
  greeting: string
  /** How many times to repeat. */
  times: number
  /** Which mode to run in. */
  mode: 'quiet' | 'loud'
  /** Optional list of names to greet. */
  names: string[]

  customObject: Object
}

/**
 * Schemastery builds the validator. The common pieces:
 *   Schema.string() / .number() / .boolean() / .array(x) / .dict(x)
 *   Schema.object({...})         an object with known keys
 *   Schema.union([...])          one of a fixed set (great for string enums)
 *   .default(v)                  fill this in when the user omits it
 *   .required()                  fail the load if the user omits it
 *   .min(n) / .max(n) / .step(n) numeric (and collection-length) bounds
 *   .description(text)           documentation, surfaced in generated catalogs
 *
 * IMPORTANT: this must be a real Schemastery schema. Exporting a plain object
 * named Config silently does nothing — Cordis looks for a Standard Schema
 * validator, finds none, and hands your YAML through unvalidated.
 */
export const Config: Schema<Config> = Schema.object({
  greeting: Schema.string().default('Hello').description('Greeting word to use.'),
  times: Schema.number().step(1).min(1).max(5).default(1).description('Repeat count, 1-5.'),
  mode: Schema.union(['quiet', 'loud'] as const).required().default('quiet').description('Output style.'),
  names: Schema.array(String).default(['world']).description('Who to greet.'),
  customObject: Schema.object( {a: Schema.number().default(1), b: Schema.number().default(1) })
})

export function apply(ctx: Context, config: Config) {
  console.log('[lesson-04] config Cordis handed me:', JSON.stringify(config))

  for (const person of config.names) {
    for (let i = 0; i < config.times; i++) {
      const line = `${config.greeting}, ${person}!`
      console.log('[lesson-04]', config.mode === 'loud' ? line.toUpperCase() : line)
    }

    console.log(config.customObject)
  }

  // Try breaking it: set `times: 99` in cordis.patch.yml and reboot. dsh exits
  // with code 1 and prints the offending path:
  //
  //   ValidationError: invalid config:
  //   expected number <= 5 but got 99 (at times)
  //
  // Failing loudly at boot is intended — better a dead harness than one running
  // in a half-configured state.
}
