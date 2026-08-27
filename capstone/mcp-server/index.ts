import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

// Standalone mock MCP server, spawned as a child process by
// @deepseek-ai/dsh-mcp-client (see ../cordis.patch.yml). It knows nothing
// about the harness that connects to it — it's just something real to call
// over the MCP protocol, exposed to the harness as mcp__dsh_custom_mock__*.

const server = new McpServer({ name: 'dsh-custom-mock', version: '0.1.0' })

server.tool(
  'mcp_echo',
  'Mock/test tool: echoes back whatever text is sent, to verify the MCP round trip works.',
  { text: z.string().describe('Text to echo back') },
  async ({ text }) => ({ content: [{ type: 'text' as const, text: `echo: ${text}` }] }),
)

server.tool(
  'mcp_roll_dice',
  'Mock/test tool: rolls an N-sided die and returns the result. Pure mock, no real backend.',
  { sides: z.number().int().min(2).max(1000).default(6).describe('Number of sides on the die') },
  async ({ sides }) => {
    const roll = 1 + Math.floor(Math.random() * sides)
    return { content: [{ type: 'text' as const, text: `rolled a d${sides}: ${roll}` }] }
  },
)

server.tool(
  'mcp_mock_run',
  'Mock/test tool: simulates kicking off a task and returns a fake structured result, for smoke-testing tool-calling plumbing end to end.',
  { task: z.string().describe('Description of the mock task to \'run\'') },
  async ({ task }) => {
    const id = Math.random().toString(36).slice(2, 10)
    const payload = { id, task, status: 'completed', result: `mock result for: ${task}` }
    return { content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }] }
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)
