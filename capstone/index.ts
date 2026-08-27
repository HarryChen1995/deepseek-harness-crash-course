import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'dsh-custom-plugin-tools'
export const inject = ['tools']

export function apply(ctx: Context) {
  ctx.tools.register(defineTool({
    name: 'dsh_ping',
    description: 'Mock/test tool: replies with a pong, proving the dsh-custom-plugin tool registration path works end to end.',
    parameters: {
      message: { type: 'string', description: 'Optional message to echo back' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      return `pong: ${args.message ?? 'hello from dsh-custom-plugin'}`
    },
  }))

  ctx.tools.register(defineTool({
    name: 'dsh_mock_run',
    description: 'Mock/test tool: simulates running a task and returns a fake structured result, for exercising tool-calling without any real backend.',
    parameters: {
      task: { type: 'string', required: true, description: 'Description of the mock task to run' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      const id = Math.random().toString(36).slice(2, 10)
      const payload = { id, task: args.task, status: 'completed', result: `mock result for: ${args.task}` }
      return JSON.stringify(payload, null, 2)
    },
  }))
}
