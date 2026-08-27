/**
 * Lesson 05 — Your first tool.
 *
 * A "tool" is a function the MODEL can call. This is the single most common
 * reason to write a dsh plugin.
 *
 * Two new things versus lessons 02-04:
 *
 *   export const inject = ['tools']
 *       Declares that this plugin needs the `tools` service. Cordis holds the
 *       plugin in PENDING until ctx.tools exists, so apply() never sees a
 *       missing dependency and YAML row order does not matter.
 *
 *   ctx.tools.register(defineTool({...}))
 *       Registers the tool. This is already an effect: unload the plugin and the
 *       tool disappears. You do not need ctx.effect() around it.
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'lesson-05-first-tool'

// Without this, ctx.tools would be undefined. With it, apply() is deferred
// until the tool registry is available.
export const inject = ['tools']

export function apply(ctx: Context) {
  ctx.tools.register(defineTool({
    // What the model sees and types when calling. Keep it snake_case to match
    // the rest of the harness (read, write, bash, web_search...).
    name: 'lesson_greet',

    // The model decides whether to call your tool based almost entirely on this
    // string. Write it for the model, not for a human reading source.
    description: 'Greet a person by name. Use when the user asks for a greeting.',

    // `parameters` is NOT a JSON Schema object — it is a bare property map.
    // A property is OPTIONAL by default; add `required: true` to demand it.
    // (`required: false` is rejected at load time — omit the key instead.)
    parameters: {
      name: { type: 'string', required: true, description: 'The name to greet' },
      excited: { type: 'boolean', description: 'Add an exclamation mark' },
    },

    // Every tool must declare `output`. Two parts:
    //   schema — the canonical value execute() returns. This is the programmatic
    //            contract (also what Code Mode sees). Validated + frozen.
    //   render — turns that value into the content blocks the MODEL reads.
    // Separating them is what lets one tool serve a machine caller and a model.
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },

    // The body. `args` is validated and frozen before you see it, so no manual
    // type-checking. Return exactly what output.schema promised.
    async execute(args) {
      return `Hello, ${args.name}${args.excited ? '!' : '.'}`
    },
  }))

  console.log('[lesson-05] registered tool: lesson_greet')
}
