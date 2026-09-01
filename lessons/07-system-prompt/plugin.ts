/**
 * Lesson 07 — Teaching the model, via the system prompt.
 *
 * A tool's `description` covers ONE call. But some guidance spans calls:
 * "always check the exit code", "prefer X over Y", "never call this twice in a
 * row". That belongs in the system prompt, not crammed into schema prose.
 *
 * ctx.systemPrompt.section() contributes a named, ordered block of text to the
 * assembled system prompt. Like tool registration it is already an effect —
 * unload the plugin and the guidance goes with it.
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
// Side-effect type import: this is what declaration-merges `systemPrompt` onto
// Context so `ctx.systemPrompt` type-checks. Importing nothing by name is
// intentional and idiomatic in this codebase.
import type {} from '@deepseek-ai/dsh-system-prompt'

export const name = 'lesson-07-system-prompt'
export const inject = ['tools', 'systemPrompt']

/**
 * Ordering convention (sections are concatenated in ASCENDING order):
 *   -100  harness identity
 *      0  deployment persona
 *  100-199 tool guidance   <-- yours goes here
 *
 * Real values in the shipped tree: tool:read 100, tool:bash 105, tool:lsp 112,
 * tool:cordis 115. Ties break by plugin load order, which is an accident of
 * composition — so pick a distinct number inside your band.
 */
const GUIDANCE = `
## The lesson_temperature tool

Temperatures returned by lesson_temperature are always in {{lesson_unit}}, even when the
user asked in Fahrenheit. Convert before answering, and say which unit you used.

Call it at most once per city per turn; the value does not change within a turn.
`.trim()

export function apply(ctx: Context) {
  // section({ name, order, text }) — `name` must be unique within this layer
  // (a duplicate throws). `text` may also be a function of the assemble context
  // if you need it computed, and may contain {{variable}} placeholders.
  ctx.systemPrompt.variable('lesson_unit', () => 'celsius') 

  ctx.systemPrompt.section({
    name: 'lesson:temperature',
    order: 150,
    text: GUIDANCE,
  })

  ctx.tools.register(defineTool({
    name: 'lesson_temperature',
    // Note what is NOT in this description: the celsius rule and the
    // once-per-turn rule. Those are cross-call policy, so they live in the
    // section above. This description covers only what this one call does.
    description: 'Look up the current temperature for a city.',
    parameters: {
      city: { type: 'string', required: true, description: 'City name' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: { city: { type: 'string' }, celsius: { type: 'number' } },
      },
      render: (_args, value) => [
        { type: 'text', text: `${value.city}: ${value.celsius}C` },
      ],
    },
    async execute(args) {
      // Deterministic stand-in for a real weather API, so the lesson is
      // reproducible: hash the city name into a plausible temperature.
      const hash = [...args.city].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
      return { city: args.city, celsius: (hash % 45) - 5 }
    },
  }))

  console.log('[lesson-07] registered tool lesson_temperature + prompt section lesson:temperature @150')

  // Want to SEE the assembled prompt? ctx.systemPrompt.assemble() returns it.
  // We do not print it here because it is long and contains the whole persona.
}
