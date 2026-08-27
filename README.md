# dsh-course — Learn DeepSeek Harness by building plugins

A hands-on course for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
(`dsh`), the agent harness where *everything is a plugin*. Fifteen lessons, each
with runnable code you load into a **live** harness and drive from the real UI.

Every code sample in this repository was executed against a running dsh instance
and its output verified. Where a claim turned out to be wrong, the lesson records
what actually happens instead.

**Start here → [Lesson 01 — Orientation](./lessons/01-orientation/)**

---

## Table of contents

- [Prerequisites](#prerequisites) · [Setup](#setup) · [How to run a lesson](#how-to-run-a-lesson)
- [Curriculum](#curriculum)
- **Reference digest** — [Mental model](#the-mental-model) · [Plugin anatomy](#plugin-anatomy)
  · [Context API](#context-api-the-part-you-actually-use) · [Services](#services-and-capability-seams)
  · [Tools](#tools) · [Events](#events-and-extension-points) · [Config](#configuration)
  · [Composition](#composition-rows-patches-layers) · [Skills/Commands/MCP](#skills-commands-and-mcp)
  · [Host vs browser](#host-vs-browser) · [Agent lifecycle](#agent-lifecycle)
- [Gotchas](#gotchas-that-cost-real-time) · [CLI](#cli-cheat-sheet) · [Official docs map](#official-docs-map)

---

## Prerequisites

| Need | Notes |
|---|---|
| Node `^22.19` or `>=24` | dsh's engine requirement |
| A `deepseek-harness` source checkout | assumed at `~/deepseek-harness` |
| A working `dsh web` | i.e. you can already open the UI |
| An initialized `web` profile | `~/.dsh/profiles/web/` exists |

If your checkout is elsewhere, every command here takes `DSH_REPO=/your/path`.

## Setup

```bash
git clone <this-repo> dsh-course && cd dsh-course
npm install
./scripts/fix-paths.sh      # ← required after cloning
```

One install at the course root serves every lesson — the lesson plugins resolve
`@deepseek-ai/cordis`, `@deepseek-ai/dsh-tools`, `@deepseek-ai/schemastery`, the
MCP SDK, and `tsx` from here.

**Why `fix-paths.sh` is required.** Every lesson row uses an *absolute* path,
because a `--patch` overlay contributes configuration but does **not** change the
directory module specifiers resolve from — they resolve against the profile
directory (`~/.dsh/profiles/web`), not against the patch file. Absolute paths
aren't portable, so the script rewrites them to wherever you cloned the course.
`./scripts/fix-paths.sh --check` verifies without writing.

## How to run a lesson

```bash
./scripts/try-lesson.sh 05-your-first-tool          # boot and keep running
./scripts/try-lesson.sh 05-your-first-tool --check  # boot, verify, exit
./scripts/try-lesson.sh                             # list lessons
```

The runner boots dsh on **port 3099** with the lesson's patch as a `--patch`
overlay, so your real harness on 3080 is never touched and a broken lesson cannot
wedge your setup. Open <http://127.0.0.1:3099> and talk to the agent.

> Flag order matters: `--profile` and `--patch` are **launcher** flags and must
> precede the app's own (`--no-open`, `--port`). `dsh web --patch …` fails with
> `unknown option '--patch'`.

## Curriculum

| # | Lesson | Teaches | Code |
|---|---|---|---|
| 01 | [Orientation](./lessons/01-orientation/) | what dsh is, profiles, `--dump-config` | — |
| 02 | [Your first plugin](./lessons/02-first-plugin/) | `apply`, Context, the patch row | ✅ |
| 03 | [Lifecycle and effects](./lessons/03-lifecycle-and-effects/) | `ctx.effect`, disposal order, fibers | ✅ |
| 04 | [Config and schema](./lessons/04-config-and-schema/) | Schemastery, validation, defaults | ✅ |
| 05 | [Your first tool](./lessons/05-your-first-tool/) | `inject`, `defineTool`, `ctx.tools` | ✅ |
| 06 | [Tools, properly](./lessons/06-tool-deep-dive/) | schema DSL, `render`, cards, errors, cancellation | ✅ |
| 07 | [System prompt](./lessons/07-system-prompt/) | `ctx.systemPrompt.section`, ordering bands | ✅ |
| 08 | [Events and policy](./lessons/08-events-and-policy/) | waterfalls, `tools/pre-execute`, guards | ✅ |
| 09 | [Services and seams](./lessons/09-services-and-seams/) | Definition / Provider / Consumer | ✅ |
| 10 | [Skills](./lessons/10-skills/) | `SKILL.md`, discovery ranks, `/skill-name` | ✅ |
| 11 | [Human commands](./lessons/11-commands/) | `ctx.commands`, real `/slash` entry points | ✅ |
| 12 | [MCP integration](./lessons/12-mcp-integration/) | `dsh-mcp-client`, transports, env scrubbing | ✅ |
| 13 | [Composition and layers](./lessons/13-composition-and-layers/) | patches, layer order, `!!js`, HMR | ✅ |
| 14 | [Packaging a bundle](./lessons/14-packaging-a-bundle/) | `dsh.bundle`, `dsh plugin add` | ✅ |
| 15 | [Capstone](./lessons/15-capstone/) | native tools + a custom MCP server, installed | ✅ |

```
dsh-course/
├── lessons/01-orientation … 15-capstone/    each: README.md + code + cordis.patch.yml
├── capstone/                                the finished plugin, installed in your profile
│   ├── index.ts                             native tools
│   ├── mcp-server/index.ts                  a standalone MCP server
│   └── cordis.patch.yml
├── scripts/try-lesson.sh                    the lesson runner
└── package.json                             shared deps for every lesson
```

---

# Reference digest

Condensed from the [official reference](https://deepseek-harness.github.io/deepseek-harness/en/reference/)
and the source. Use it as a lookup once you've done the lessons.

## The mental model

dsh has **no privileged core with an extension API**. The core *is* a plugin
framework — **Cordis** — and every capability (models, tools, sessions,
sandboxes, storage, the agent loop, the web UI) is a plugin composed on top.
Consequence: you extend dsh with the same mechanism its own features use.

Four words:

| Term | Is |
|---|---|
| **Plugin** | an ES module exporting `apply(ctx, config)` |
| **Context** (`ctx`) | your handle on the system; one child per plugin instance |
| **Service** | a named capability on the context (`ctx.tools`, `ctx.llm`, `ctx.fs`) |
| **Fiber** | one loaded plugin instance — the unit of disposal |
| **Row** | one line of composition: `{ id, name, config }` |

## Plugin anatomy

```ts
import type { Context } from '@deepseek-ai/cordis'

export const name = 'my-plugin'        // optional: diagnostics label only
export const inject = ['tools']        // optional: services required before apply
export const Config = Schema.object({…})  // optional: runtime validator
export function apply(ctx: Context, config: Config) { … }   // required
```

Three valid plugin forms: a **function**, an **object** with `apply`, or a
**`Service` subclass** (a constructor).

> **Export shape trap:** service packages `export default` their class. Function
> plugins use **named exports only, with no default export**. Mixing the forms
> makes the Loader discard the function plugin's namespace.

Fiber states: `0 PENDING · 1 LOADING · 2 ACTIVE · 3 FAILED · 4 DISPOSED · 5 UNLOADING`.
`PENDING` means *waiting for an injected service*.

## Context API (the part you actually use)

```ts
ctx.plugin(plugin, config?)        // mount a child plugin -> Fiber (awaitable)
ctx.inject(deps, callback)         // run callback while deps are available
ctx.on(event, listener, options?)  // listen (already an effect)
ctx.once(event, listener)
ctx.emit / parallel / serial / bail / waterfall (name, …args)
ctx.effect(execute, label?)        // wrap a non-Cordis resource
ctx.get(name, strict?)             // probe a service without inject
ctx.provide(name, value)           // low-level service registration
ctx.set(name, value)               // OVERWRITE an already-provided value only
ctx.extend(meta) / isolate(name, label?) / intercept(name, config)
ctx.logger('name') · ctx.fiber · ctx.root · ctx.registry · ctx.events
```

### Effects

```ts
ctx.effect(() => {
  const timer = setInterval(tick, 400)
  return () => clearInterval(timer)
}, 'my-heartbeat')
```

- `execute` runs **immediately**; disposers run in **reverse** registration order.
- Multiple async disposers run **concurrently** — keep ordered teardown in one.
- Already effects (call bare): `ctx.on`, `ctx.plugin`, `ctx.tools.register`,
  `ctx.systemPrompt.section`, `ctx.commands.register`, `ctx.skills.register`.
- Wrap anything returning a raw disposer: `ctx.effect(() => reg.register(x), 'label')`.
- You **never** call your own plugin-lifetime disposer.

## Services and capability seams

Three roles that never depend on each other sideways:

| Role | Owns |
|---|---|
| **Definition** | the service name, the abstract class, the types |
| **Provider** | one concrete implementation |
| **Consumer** | the presentation (usually a tool) |

```ts
import { Service, type Context } from '@deepseek-ai/cordis'

declare module '@deepseek-ai/cordis' {
  interface Context { quotes: QuoteService }
}

export abstract class QuoteService extends Service {
  constructor(ctx: Context) { super(ctx, 'quotes') }   // ← the registration
  abstract random(): Promise<Quote>
}
```

- `super(ctx, name)` **is** the registration. `ctx.set()` is **not**.
- The `declare module` block lives in the **Definition**; consumers pull it in
  with `import type {} from '…'`.
- **One implementation per context** — a second throws. Use `ctx.isolate()` for
  side-by-side.
- If a provider unloads, **every injecting plugin unloads** and reloads when it
  returns.

Service **roles**: `seam` (replaceable — `ctx.shell`, `ctx.fs`, `ctx.llm`,
`ctx.subagents`), `core` (single owner — `ctx.tools`, `ctx.sessions`,
`ctx.systemPrompt`), `bundle` (composition point — `ctx.agentLoop`).
**Do not split preemptively.**

Real seams:

| Seam | Definition | Providers | Consumers |
|---|---|---|---|
| `ctx.shell` | `dsh-shell` | `bash-local`, `bash-sandbox`, `pwsh-local` | `tool-bash`, `tool-pwsh` |
| `ctx.fs` | `dsh-fs` | `fs-local`, `fs-sandbox`, `fs-e2b` | `tool-fs` |
| `ctx.llm` | `dsh-llm` | `llm-deepseek`, `llm-pi-ai`, `llm-replay` | `agent-loop`, `compaction-basic` |

## Tools

```ts
import { defineTool } from '@deepseek-ai/dsh-tools'
export const inject = ['tools']
ctx.tools.register(defineTool({ … }))     // returns a disposer; already an effect
```

| Field | Req. | Purpose |
|---|---|---|
| `name` | ✅ | model-facing name; unique per layer; `run_code` reserved |
| `description` | ✅ | the routing signal — write it for the model |
| `parameters` | ✅ | bare property map (**not** a JSON Schema object) |
| `output.schema` | ✅ | the canonical value `execute` returns |
| `output.render(args, value)` | ✅ | → `ContentBlock[]` the model reads |
| `output.presentationMeta` | — | replayable UI metadata |
| `execute(args, exec)` | ✅ | the body |
| `timeoutMs` | — | cooperative deadline; positive finite |
| `isConcurrencySafe(args)` | — | exactly `true` opts into parallel siblings |
| `finalizeContent(exec, result)` | — | sync, once per outcome, must not throw |
| `presentCall` / `presentResult` | — | UI cards; must be **pure** |

**One tool, three audiences:** the model sees name/description/parameters and
reads `render`; a programmatic caller gets `output.schema`'s value verbatim; the
UI gets the cards. Return structure, not prose.

### Parameter schema DSL

`type`: `string number integer boolean null array object json`, or a `oneOf`
branch node (with no `type`). Annotations: `description title default examples`.

```ts
parameters: {
  path:   { type: 'string', required: true },
  limit:  { type: 'integer' },                          // optional
  mode:   { type: 'string', enum: ['fast','exact'] },
  tags:   { type: 'array', items: { type: 'string' } },
  where:  { type: 'object', additionalProperties: false,  // MANDATORY on nested
            properties: { file: { type: 'string', required: true } } },
  target: { oneOf: [{ type: 'string' }, { type: 'integer' }] },
  raw:    { type: 'json' },
}
```

**Not supported** — the compiler rejects them: `minimum maximum maxLength
minLength pattern format minItems nullable`. Validate those in `execute`.

Other rules: `required: false` **rejected** (omit the key); `default` is an
annotation and **never applied**; parameter root is implicitly open but nested
objects need explicit `additionalProperties`; `oneOf` needs ≥2 branches and
forbids `required` inside.

### `execute(args, exec)`

`args` is validated and frozen. `exec` carries `signal` (**honor it**), `callId`,
`name`, `agent?` (optional!), `deferContext()`, `concludeTurn()`.

**Signal failure by `throw`** — the registry turns it into an `isError` result.
Never return `"error: …"`. Throw for infrastructure failures; put non-ideal
*domain* outcomes in the canonical value.

### Pipeline

`tool/call` → `presentCall` → **`tools/pre-execute`** → `ctx.tools.guard()` →
**`tools/execute`** → `execute` → validate + `render` → **`tools/post-execute`** →
`finalizeContent` → **`tools/result`** → `tool/result` logged → `presentResult`.

`tool/result` persists `content`, `error`, `meta` — **never** the canonical value.

## Events and extension points

Five dispatch modes: `emit` (sync broadcast), `parallel` (concurrent, awaited),
`serial` (ordered, first meaningful return wins), `bail` (sync serial),
`waterfall` (around-middleware).

> **In a waterfall, call `next()` unless you are deliberately short-circuiting.**
> Forgetting it silently swallows everyone else's behavior.

| Hook | Mode | Use to |
|---|---|---|
| `tools/pre-execute` | waterfall | **decide**: `allow` / `deny(reason)` / `ask` |
| `ctx.tools.guard(fn)` | monotonic | a **final** denial ordering can't undo |
| `tools/execute` | waterfall | wrap the dispatch **lifetime** (timeout/retry/metrics) |
| `tools/post-execute` | waterfall | **transform**: replace `content` **or** `value`, or `block` |
| `tools/result` | emit | **observe** the immutable outcome |
| `agent/pre-step` | waterfall | `reject` a step or `enter(messages)` — how context injection works |
| `system-prompt/assemble` | waterfall | transform the whole prompt (expert) |
| `agent/request` | waterfall | replace the LLM call config (not messages) |
| `agent/request-error` | waterfall | `{kind:'retry'}` to own recovery |
| `agent/turn-stopping` | serial | object to a turn ending via `agent.steer()` |
| `session/event` | emit | the replayable transcript stream |
| `agent/status`, `agent/created`, `*/change` | emit | observation; `*/change` carries no diff — refetch |

Guidance: **events for interception and policy; service methods for direct calls.**
Note `tools/post-execute` content replacement is **not** a confidentiality
boundary — replace the value or block.

Declare your own:

```ts
declare module '@deepseek-ai/cordis' {
  interface Events { 'my/event'(a: string): void }
}
```

### System prompt

```ts
ctx.systemPrompt.section({ name: 'tool:mine', order: 150, text })
```

Ascending order. Bands: `-100` identity, `0` persona, **`100–199` tool guidance**.
Ties break by load order, so pick a distinct number. Siblings: `context()` for
cache-safe dynamic content, `variable()` for `{{name}}`, `tools()`, `assemble()`.
Restricting a tool does **not** remove its section.

## Configuration

```ts
import Schema from '@deepseek-ai/schemastery'
export interface Config { greeting: string }
export const Config: Schema<Config> = Schema.object({
  greeting: Schema.string().default('Hello'),
  times: Schema.number().step(1).min(1).max(5).default(1),
  mode: Schema.union(['quiet', 'loud'] as const).default('quiet'),
  names: Schema.array(String).default([]),
})
```

Constructors: `string number boolean date array dict object union tuple intersect
const natural percent any never transform lazy`.
Modifiers: `.default() .required() .min() .max() .step() .pattern()
.description() .hidden() .deprecated()`.

Cordis validates, **fills defaults**, then calls `apply(ctx, config)`. Sync only.
A bad config fails the **load** with `expected number <= 5 but got 99 (at times)`
and exit code 1.

> A **plain object** exported as `Config` silently does nothing — no validation,
> no defaults. It must be a real schema.

## Composition: rows, patches, layers

A patch file is a top-level YAML **array**. Two entry kinds:

```yaml
- insert:                       # ADD rows
    - id: my-thing
      name: '/abs/path/plugin.ts'   # or a package name
      config: { … }

- id: some-existing-row         # MODIFY by id
  config: { … }
- id: hmr
  disabled: true
```

Row fields: `id name config disabled inject group isolate`.

**Layer order** (over an empty root):

1. each bundle in `dsh.profile.bundles` order (`dsh-base` first)
2. `~/.dsh/profiles/<name>/cordis.patch.yml`
3. `~/.dsh/cordis.patch.yml` (**outranks** the per-profile file)
4. each `--patch` overlay, in argv order

> **THE RULE: later layers win per row `id`, and an id-targeted patch REPLACES
> the row's entire `config`. No deep merge.** Restate every key you keep.

Always write explicit `id`s — the loader diffs by id, and ids must be unique
across the whole composed tree.

### `!!js`

Two bangs. Allowed **only** in `config` (any depth) and `disabled`; inert
elsewhere. Scope: `ctx`, `process`, `dshHomePath(...)`. `config` is evaluated once
at activation (after injects); `disabled` at every mount decision.

```yaml
config:
  root: !!js dshHomePath('sessions')
  mode: !!js process.env.DSH_PERMISSION_MODE ?? 'workspace-write'
disabled: !!js process.platform === 'win32'
```

It is `eval` with `with(ctx)` — **a patch file is executable code.**

### Bundles vs profiles

| | Bundle | Profile |
|---|---|---|
| Is | an npm package shipping one config layer | a directory describing one runnable composition |
| Manifest | `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }` | `"dsh": { "profile": { "bundles": [...] } }` |
| Who writes it | **you** (the author) | `dsh plugin` (never by hand) |
| Rows name | the **package** | — |

Bundle membership is **not** hot — restart after `dsh plugin add/remove`.

### HMR

Plugins hot-reload by **unload then load** (which is why disposal discipline
matters). Hot: source files, a row's `config`, either `cordis.patch.yml`. Not hot:
bundle membership. A `name`/`inject`/`group` diff forces dispose+restart with
rollback.

## Skills, commands, and MCP

### Skills — instructions, not code

`<name>/SKILL.md` or `<name>.md`. Name must be kebab-case. No recursive discovery.

```markdown
---
name: my-skill
description: Use when … (this is the ENTIRE routing signal; max 500 chars)
disable-model-invocation: false     # kebab-case
user-invocable: true                # kebab-case
whenToUse: extra guidance           # camelCase (yes, inconsistent — enforced)
---
body…
```

CamelCase spellings of the two invocation flags **throw**. Bad frontmatter →
**warned and skipped**, so a typo means silent absence.

Discovery roots, lower rank wins: `100` `<proj>/.dsh/skills` · `200`
`<proj>/.agents/skills` · `300` `customSkillDirs` · `400` `<dshHome>/skills` ·
`500` `<agentsHome>/skills` · `600` bundled.
**But rank only breaks ties within one layer — the nearest layer wins a duplicate
name outright.**

Two entry points: the model calls the `skill` tool from a catalog of
name+description; a human types `/skill-name` (whitespace-bounded, anywhere) —
the **only** route for `disable-model-invocation: true`.

dsh does **not** enumerate a skill's `references/` or `scripts/` — the body must
name its own files. `agents/*.yaml` sidecars are for other harnesses; dsh ignores
them.

**Tool vs skill:** tools give new *capability* (schema cost every request); skills
give new *behavior* (one catalog line until loaded, hot-editable).

### Commands — real `/slash` entry points

```ts
export const inject = ['commands']
ctx.commands.register({
  name: 'wordcount',
  description: 'count words',
  input: { hint: '<text>', images: false },
  recordInput: true,
  handler: (inv) => ({ kind: 'success', text: `${inv.rawInput.trim()}` }),
})
```

`CommandInvocation`: `commandId agent rawInput attachments signal`.
`rawInput` **includes the leading separator whitespace**.
`CommandResult`: `{kind:'success', text?, sourceEventSeq?}` | `{kind:'error', text}`.

**Two slash namespaces, easily confused:**

| | `ctx.commands` | `/skill-name` |
|---|---|---|
| Namespace | closed registry | open catalog |
| Slash position | **byte zero only** | anywhere, whitespace-bounded |
| Resolved | client-side, pre-prompt | host-side, `agent/pre-step` |
| Model sees | **nothing** | the full skill body |

Nothing reaches the model implicitly. Text input only — no typed args.

### MCP — one row per server

```yaml
- id: mcp-github
  name: '@deepseek-ai/dsh-mcp-client'
  config:
    serverName: github          # /^[A-Za-z0-9_-]{1,32}$/, unique
    transport: stdio            # or streamable-http (url, headers)
    command: npx
    args: ['-y', '@modelcontextprotocol/server-github']
    env: { GITHUB_TOKEN: !!js process.env.GITHUB_TOKEN }
    # cwd, toolCallTimeoutMs 60000, failOnStartupError false,
    # reconnect: { enabled true, initialDelayMs 500, maxDelayMs 30000, maxAttempts 10 }
```

Tools arrive as `mcp__<serverName>__<rawName>`, **64-char budget**, charset
`[A-Za-z0-9_-]`; overflow truncates and appends `_` + 12 hex of SHA-256, so names
never collide. Names are a pure function of `(serverName, rawName)`.

**Env scrubbing for stdio children:** strips any name matching
`/KEY|PASSWORD|SECRET|TOKEN/i` **and** every `DSH_*`. `config.env` merges *after*
— default-deny with explicit forwarding.

Limits: **tools only** (no Resources/Prompts); no exposed connect timeout (SDK's
60 s); images are the only durable rich result; after `maxAttempts` failures tools
are unregistered until restart.

> **dsh cannot act as an MCP server** — consume only. To expose dsh outward use
> ACP (`packages/acp`), the JSON-RPC SDK (`packages/sdk`), or the Typert Gateway
> (`@Remote`).

## Host vs browser

dsh has two compiler "faces": **host** (`tsconfig.host.json`, extends
`tsconfig.base.json`) and **client** (`tsconfig.client.json`, extends
`tsconfig.base.client.json`). A package registers in exactly one.

There is **no `face` field**. A browser half is *declared*, not located:

```json
{ "dsh": { "client": { "platform": "web" } },
  "exports": { "./client": "./lib/client.js" } }
```

Both are required — `dsh.client` without an `exports["./client"]` throws. And
`exports["./client"]` **alone does not** make a package client-side; many
host-only packages have one as a browser-safe type projection.

Host↔browser calls cross via `@Remote` on a host service method, consumed as
`ctx.remote.<namespace>` on the client. **Cross-plugin value imports in browser
bundles are a build error** (type-only is fine).

One row mounts either kind — there are no separate host and client manifests.

## Agent lifecycle

An **Agent** is the live handle (`ctx.agents.get(id)`); a **Session** is an
**append-only log of typed events** and the single source of truth. The LLM
message history is **derived** from the log, never stored separately.

A **turn** opens when the driver claims queued input and closes at quiescence. A
**step** is one model call plus the tool executions it requested; a turn may run
many steps.

```
turn/start
  claim input → agent/pre-step [waterfall]
    step/start
      user/message → system-prompt/assemble → agent/request → llm/stream
      assistant/chunk* → assistant/message
      per tool call: tool/call → tools/pre-execute → guard → tools/execute
                     → execute → tools/post-execute → tools/result → tool/result
    step/end
    [natural stop + empty inbox] → agent/turn-stopping [serial]
turn/end { reason }
```

Tool calls sit strictly **inside** a step, between `assistant/message` and
`step/end`.

Only three event types produce LLM messages — `user/message`,
`assistant/message`, `tool/result` — and each must declare a `SurfaceIntent`.
Plugin-contributed event types are **log-only**. All `event.data` must be
JSON-serializable (validated at append).

`agent.ctx` is the per-agent extension seam: registrations there are agent-local
and unwind on disposal. `agent.inject()` adds durable model-facing context.

**The split to remember:** consume `session/event` for replayable transcript data;
`agent/*` is the live coordination API.

---

## Gotchas that cost real time

| Symptom | Cause |
|---|---|
| `parameters.x.required must be true when present` | `required: false`. Omit the key. |
| `pending (waiting for service: X)` at boot, exit 1 | something you `inject`ed was never provided |
| `unknown option '--patch'` | launcher flags must precede the subcommand's flags |
| Plugin prints nothing, no error | in bare Cordis, a `PENDING` fiber. dsh's boot guard usually catches it — but check `inject`. |
| `ctx.logger(...)` output invisible | no console exporter in the `web` profile. Use `console.log` while learning. |
| Config defaults not applied | `Config` is a plain object, not a schema |
| Four config keys vanished after a patch | id-targeted patches **replace** the whole `config` |
| `duplicate loader entry id: X` | row ids are unique across the **whole tree**, not per layer |
| `!!js` in `name`/`id` does nothing | only `config` and `disabled` are interpolated |
| Skill silently missing | frontmatter typo → warned and skipped; or camelCase invocation key |
| Skills absent in the `web` profile | `tool-skill`/`skill-filesystem` are `disabled: true` there |
| MCP child can't see your API key | env scrubbing. Forward it explicitly via `config.env`. |
| MCP tools vanished and stayed gone | `reconnect.maxAttempts` exhausted — restart |
| Row remounts on every file edit | the row has no explicit `id` |
| Bundle changes not picked up | bundle membership isn't hot — restart |
| Named exports ignored on a plugin | it also has a `export default` — don't mix forms |

## CLI cheat sheet

```bash
# run (from a source checkout)
node --import tsx/esm apps/cli/src/bin.ts web
node --import tsx/esm apps/cli/src/bin.ts --profile web --no-open --port 3099

# one-off overlay (repeatable, argv order)
node --import tsx/esm apps/cli/src/bin.ts --profile web --patch ./x.yml

# inspect composition
… --profile web --dump-config            # everything, incl. your layers
… --profile web --dump-default-config    # bundle layers only

# bundles
dsh plugin --profile web add ./my-bundle
dsh plugin --profile web add github:you/repo#<sha>
dsh plugin --profile web remove my-bundle

# headless (one task, print, exit)
dsh --profile headless "run the tests"
```

## Official docs map

Local: `~/deepseek-harness/docs/`. Online:
<https://deepseek-harness.github.io/deepseek-harness/en/reference/>

| Want | Read |
|---|---|
| Architecture overview | `docs/architecture.md` |
| Cordis concepts | `docs/cordis-primer.md`, `docs/cordis-tutorial/01…07` |
| Cordis API | `docs/cordis-api/{context,service,events,fiber,registry,inherited}.md` |
| Capability services | `docs/capability-seams.md` |
| Agent lifecycle | `docs/agent-lifecycle.md` |
| Tool execution | `docs/tool-execution-pipeline.md` |
| **Legal `config` of every plugin** | **`docs/config-catalog.md`** (generated) |
| **Every shipped tool's schema** | **`docs/tool-catalog.md`** (generated) |
| Persistence events | `docs/persistence-catalog.md` |
| Recipes | `docs/cookbook/adding-a-{package,tool,conversation-node,settings-card}.md`, `adding-an-llm-adapter.md`, `extension-cookbook.md` |
| 47 subsystems | `docs/subsystems/<name>.md` |
| Tutorials | `docs/user/develop/basic/{index,tool,config,publish}.md` |

## License / attribution

Course material written for personal learning. DeepSeek Harness is MIT-licensed
by DeepSeek AI — see the upstream repository.
