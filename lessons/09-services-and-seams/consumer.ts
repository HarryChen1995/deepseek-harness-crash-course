/**
 * Lesson 09, part 3 of 3 — the CONSUMER.
 *
 * Exposes the capability to the model as a tool. It depends on the Definition
 * (for the type) and on the service being present at runtime. It has no idea
 * WHICH provider is mounted.
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
// Type-only import pulls in the `ctx.quotes` declaration merge from the
// Definition. Without it TypeScript would not know ctx.quotes exists.
import type {} from './service.ts'

export const name = 'lesson-09-quote-consumer'

// Two services required. Cordis keeps this plugin PENDING until BOTH exist.
// This is why row order in the patch file is irrelevant — try reordering them.
export const inject = ['tools', 'quotes']

export function apply(ctx: Context) {
  ctx.tools.register(defineTool({
    name: 'lesson_random_quote',
    description: 'Return a random programming quote.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: { text: { type: 'string' }, author: { type: 'string' } },
      },
      render: (_args, value) => [
        { type: 'text', text: `"${value.text}" — ${value.author}` },
      ],
    },
    async execute() {
      // The whole point: we call the SEAM, not an implementation.
      const quote = await ctx.quotes.random()
      return { text: quote.text, author: quote.author }
    },
  }))

  console.log('[lesson-09] consumer mounted: registered lesson_random_quote')
}

// EXPERIMENT: comment out the provider row in cordis.patch.yml and reboot.
// This plugin never activates, because `quotes` never appears. In bare Cordis
// that means silence — the fiber just sits in PENDING forever, which is the
// classic baffling "my plugin does nothing" symptom.
//
// dsh improves on that. Its boot adds an activation guard, so you get:
//
//   Error: dsh: plugin tree failed to load: dsh: 1 entry did not activate
//   .../consumer.ts: pending (waiting for service: quotes)
//
// and the process exits 1. Read that message as "something I inject was never
// provided" — then go find which row was supposed to provide it.
