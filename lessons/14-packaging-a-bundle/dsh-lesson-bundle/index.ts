import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'dsh-lesson-bundle'
export const inject = ['tools']

export function apply(ctx: Context) {
  ctx.tools.register(defineTool({
    name: 'lesson_bundle_hello',
    description: 'Proof that a packaged, installed dsh bundle works.',
    parameters: {},
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute() {
      return 'hello from an installed dsh bundle'
    },
  }))
  console.log('[lesson-14] installed bundle registered lesson_bundle_hello')
}
