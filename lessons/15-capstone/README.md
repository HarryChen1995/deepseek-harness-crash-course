# Lesson 15 — Capstone

**Files:** [`../../capstone/`](../../capstone/) — `index.ts`, `mcp-server/index.ts`, `cordis.patch.yml`

## This one is already running

Unlike every other lesson, the capstone is **not** loaded with `--patch`. It is
installed permanently in your profile layer at
`~/.dsh/profiles/web/cordis.patch.yml`, so it is live on your real harness at
<http://localhost:3080> right now.

Try it there:

> Call dsh_ping with message "hello", then call mcp_echo with text "world".

```
pong: hello
echo: world
```

> **Why there is no `cordis.patch.yml` in this folder.** Adding one and running
> `try-lesson.sh 15-capstone` would apply the same rows a second time as an
> overlay, and you would get:
>
> ```
> Error: dsh: plugin tree failed to load: duplicate loader entry id: dsh-course-capstone-tools
> ```
>
> Row ids must be unique across the *whole composed tree*, not per layer. That
> error is worth causing once on purpose.

## What it combines

```
capstone/
├── index.ts                # native tools   (lessons 02-09)
├── mcp-server/index.ts     # an MCP server  (lesson 12)
└── cordis.patch.yml        # both rows      (lesson 13)
```

### Row 1 — native tools

`index.ts` is an ordinary function plugin: `name`, `inject = ['tools']`, `apply`.
It registers two tools directly on the registry.

| Tool | Does |
|---|---|
| `dsh_ping` | replies `pong: <message>` |
| `dsh_mock_run` | returns a fake structured task result |

Loaded as raw TypeScript, because the host process runs under
`node --import tsx/esm`.

### Row 2 — a custom MCP server

`mcp-server/index.ts` is a **standalone** MCP server built on
`@modelcontextprotocol/sdk`. It knows nothing about dsh. The `dsh-mcp-client`
bridge spawns it and republishes its tools:

| Raw name | Appears as |
|---|---|
| `mcp_echo` | `mcp__dsh_custom_mock__mcp_echo` |
| `mcp_roll_dice` | `mcp__dsh_custom_mock__mcp_roll_dice` |
| `mcp_mock_run` | `mcp__dsh_custom_mock__mcp_mock_run` |

Because the child is a **separate process**, it does not inherit the harness's tsx
loader — which is why the row's `command` points at the course's own
`node_modules/.bin/tsx` rather than plain `node`. That asymmetry is the single most
useful practical detail in the whole course.

## Verified end to end

All four paths were exercised live against the running profile:

| Call | Result |
|---|---|
| `dsh_ping("hello")` | `pong: hello` |
| `mcp__dsh_custom_mock__mcp_echo("world")` | `echo: world` |
| `dsh_mock_run("ts-check")` | `{"id":"w9nfzsvt","task":"ts-check","status":"completed",…}` |
| `mcp__dsh_custom_mock__mcp_roll_dice({"sides":20})` | `rolled a d20: 13` |

## Managing it

```bash
# see it in the composed tree
cd ~/deepseek-harness
node --import tsx/esm apps/cli/src/bin.ts --profile web --dump-config | tail -25

# edit the rows
$EDITOR ~/.dsh/profiles/web/cordis.patch.yml

# turn it off without deleting anything
#   add   disabled: true   to each row, then restart

# restart the harness
pkill -f "apps/cli/src/bin.ts web"
cd ~/deepseek-harness && node --import tsx/esm apps/cli/src/bin.ts web
```

## Now make it yours

The mock tools exist to prove the wiring. Replace them:

1. **Pick a real capability.** Something you actually want the agent to do.
2. **Decide the shape** — the lesson that applies:
   - deterministic computation or I/O → a **tool** (05, 06)
   - a procedure or house style → a **skill** (10)
   - a human utility → a **command** (11)
   - a policy over existing tools → an **event listener** (08)
   - a swappable backend → a **service seam** (09)
   - an existing MCP server → **one row** (12)
3. **Add cross-call guidance** as a prompt section if the model needs it (07).
4. **Package it** as a bundle once it works (14).

Two things to carry forward from the debugging you will inevitably do:

- `required: false` on a parameter is rejected — omit the key.
- `pending (waiting for service: X)` at boot means something you `inject`ed was
  never provided.

## Where to go next

| Want | Read |
|---|---|
| The legal `config` of any shipped plugin | `docs/config-catalog.md` |
| Every shipped tool's schema | `docs/tool-catalog.md` |
| A specific subsystem | `docs/subsystems/<name>.md` (47 of them) |
| Cordis API detail | `docs/cordis-api/{context,service,events,fiber,registry}.md` |
| Step-by-step recipes | `docs/cookbook/` |
| An LLM adapter | `docs/cookbook/adding-an-llm-adapter.md` |
| A settings card / UI node | `docs/cookbook/adding-a-settings-card.md`, `adding-a-conversation-node.md` |

Online: <https://deepseek-harness.github.io/deepseek-harness/en/reference/>

---

Prev: **[14 — Packaging a bundle](../14-packaging-a-bundle/)** · [Course home](../../README.md)
