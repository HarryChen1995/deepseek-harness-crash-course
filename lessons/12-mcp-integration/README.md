# Lesson 12 — MCP integration

**Files:** [`cordis.patch.yml`](./cordis.patch.yml) · server: [`../../capstone/mcp-server/index.ts`](../../capstone/mcp-server/index.ts)

**No plugin code in this lesson** — and that is the lesson.

## Run it

```bash
./scripts/try-lesson.sh 12-mcp-integration
```

At <http://127.0.0.1:3099>:

> Use mcp_echo to echo "hello", then roll a d20.

## There is no "MCP config file"

Coming from Claude Code you will look for an `mcpServers` block or an `.mcp.json`.
**dsh has neither.** MCP is implemented as a plugin like everything else, so an
MCP server is just **one more row**:

```yaml
- insert:
    - id: lesson-12-mcp
      name: '@deepseek-ai/dsh-mcp-client'    # the shipped bridge plugin
      config:
        serverName: lesson_mcp
        transport: stdio
        command: …
        args: […]
```

**One row = one MCP server.** Three servers = three rows, each with a unique `id`
*and* a unique `serverName`.

The bridge connects, calls `listTools()`, and registers each discovered tool on
`ctx.tools` — so from the model's side an MCP tool is indistinguishable from a
native one. It arrives as a raw JSON-Schema `ToolDefinition`, which is exactly why
`ctx.tools.register` accepts those as well as `defineTool` output.

## Full config reference

Discriminated union on `transport`.

### Both transports

| Field | Required | Default | Constraint |
|---|---|---|---|
| `transport` | **yes** | — | `'stdio'` \| `'streamable-http'` |
| `serverName` | **yes** | — | `/^[A-Za-z0-9_-]{1,32}$/`, unique across live instances |
| `toolCallTimeoutMs` | no | `60000` | per `callTool` |
| `failOnStartupError` | no | `false` | `true` → refuse to activate if connect fails |
| `reconnect.enabled` | no | `true` | |
| `reconnect.initialDelayMs` | no | `500` | doubles per consecutive failure |
| `reconnect.maxDelayMs` | no | `30000` | **also** the uptime after which the attempt budget resets |
| `reconnect.maxAttempts` | no | `10` | consecutive failures **per outage** |

### `transport: stdio`

| Field | Required | Default | Notes |
|---|---|---|---|
| `command` | **yes** | — | executable to spawn |
| `args` | no | `[]` | passed directly — **no shell interpolation** |
| `env` | no | `{}` | merged **on top of** the scrubbed parent env |
| `cwd` | no | `''` | child working directory |

### `transport: streamable-http`

| Field | Required | Default |
|---|---|---|
| `url` | **yes** | — |
| `headers` | no | `{}` |

An unknown key under `reconnect` **throws at load** —
`<path>.<key> is not a reconnect option` — before any effect registers.

## Tool naming

Tools arrive as `mcp__<serverName>__<rawName>`:

```
mcp__lesson_mcp__mcp_echo
mcp__lesson_mcp__mcp_roll_dice
```

Budget: **64 characters**, charset `[A-Za-z0-9_-]`. If the joined name would
exceed that or contain anything else, dsh truncates and appends `_` plus **12 hex
chars of a SHA-256** of `(serverName, rawName)` — so two tools can never collapse
into one name.

Names are a **pure function of `(serverName, rawName)`**: connection order,
re-syncs, and other servers never rename a tool. The public name is never sent to
the server — calls use the raw name.

A **duplicate `serverName`** fails the *later* plugin instance at load and leaves
the earlier one running.

## Environment scrubbing — read this before debugging a missing key

Before spawning a stdio child, dsh strips from the inherited environment:

1. any variable whose **name** matches `/KEY|PASSWORD|SECRET|TOKEN/i`
2. **every** `DSH_*` variable (case-insensitive, so Windows `dsh_*` is caught too)

So the harness's own `DEEPSEEK_API_KEY` can never leak into a child implicitly.
`PATH`, `HOME`, locale, and proxy vars survive, so normal CLIs still work.

The escape hatch is deliberate — `config.env` merges **after** the scrub:

```yaml
env:
  GITHUB_TOKEN: !!js process.env.GITHUB_TOKEN
```

**Default-deny with explicit forwarding.** Forward secrets on purpose, never
ambiently. (This same `scrubbedParentEnv()` is shared by every harness spawner:
LSP, subprocess, subagents.)

## Lifecycle

- **Startup:** activation `await`s `listTools()` and registers everything *before*
  the first turn. On failure it logs, then either rejects activation
  (`failOnStartupError: true`) or **activates with no tools**.
- **`notifications/tools/list_changed`** → re-sync. A fetch failure keeps the
  previous generation; a registration conflict rolls back the whole attempted
  generation (never a partial set).
- **On crash:** exponential backoff, re-discovery on success, and the recovered
  generation *replaces* the old one. **During the outage the last good tools stay
  registered and calls against them fail.**
- **Budget exhausted** (`maxAttempts` consecutive failures): tools are
  **unregistered and reconnection stops** until an HMR reload or restart. A
  connection surviving past `maxDelayMs` resets the budget.
- **HMR** hot-swaps cleanly; an unchanged `serverName` reproduces identical names.

## Limits worth knowing up front

- **Only MCP *tools* are bridged.** Resources and Prompts have no consumer.
- **No connection/discovery timeout is exposed** — the MCP SDK's 60 s default
  applies, which can delay activation *and* teardown.
- **Images** are the only rich result bridged durably (PNG/JPEG/WebP/GIF), and
  only when `ctx.attachments` is mounted **and** the routed model declares image
  input. Audio and embedded resources become diagnostic text.
- **Token cost:** the server-qualified name adds tokens to every definition and
  call, and a re-sync that changes any schema can invalidate prompt-cache reuse
  from the first changed token.

## dsh cannot *be* an MCP server

There is no `mcp-server` package; `McpServer` appears only in test fixtures. MCP
in dsh is a **one-way bridge inward**.

To expose dsh outward, the seams are:

| Goal | Use |
|---|---|
| Editor / agent client protocol | ACP — `packages/acp`, `examples/acp-agent` |
| JSON-RPC (Python + TS SDKs) | `packages/sdk`, `examples/jsonrpc-agent` |
| HTTP API from a browser/client | Typert API Gateway — `@Remote`, `docs/api-gateway.md` |

If you want "expose my dsh tools to Claude Code", the answer is a **separate MCP
server process**, not a dsh plugin.

## Exercises

1. Add a second row pointing at the same server file with `serverName: other`.
   Both appear, namespaced apart.
2. Give both rows the same `serverName` and read the load failure.
3. Set `failOnStartupError: true` and break the `command` path. Compare the
   failure to the default (silent activation with zero tools).
4. Add a tool to `capstone/mcp-server/index.ts` and restart — watch it appear.

---

Prev: **[11 — Human commands](../11-commands/)** · Next: **[13 — Composition and layers](../13-composition-and-layers/)**
