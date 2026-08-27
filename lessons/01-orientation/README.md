# Lesson 01 — Orientation: what dsh actually is

**No code in this lesson.** Read it, run the three commands, then move on.

## The one-sentence version

DeepSeek Harness (`dsh`) is an AI agent harness in which *everything is a plugin* —
models, tools, skills, sessions, sandboxes, storage, the agent loop, even the web
UI. There is no privileged core with an extension API bolted on; the "core" is a
plugin framework called **Cordis**, and every capability is a plugin composed on
top of it.

That design has one enormous consequence for you: **you extend dsh with exactly
the same mechanism its own features use.** Nothing you can build is second-class.

## The four words you need

| Word | What it is |
|---|---|
| **Plugin** | An ES module exporting `apply(ctx, config)`. The unit of capability. |
| **Context** (`ctx`) | Your handle on the running system: register tools, listen to events, reach services. Each plugin instance gets its own. |
| **Service** | A named capability on the context — `ctx.tools`, `ctx.llm`, `ctx.fs`, `ctx.shell`. Plugins provide them and consume them. |
| **Row** | One line of composition: `{ id, name, config }` in a YAML file. A row mounts a plugin. |

## Where things live

```
~/deepseek-harness/          the source checkout (docs live here too)
├── packages/                ~200 packages; every capability is one of these
│   ├── core/                the spine: session, tools, agent, system-prompt
│   ├── llm/, fs/, shell/    replaceable capability "seams"
│   ├── client/              the browser-side UI plugins
│   └── bundle/base/         the roster of what a default dsh mounts
├── docs/                    the reference (mirrors the website)
└── apps/cli/                the `dsh` command itself

~/.dsh/                      YOUR runtime state — not the source
├── profiles/web/            one runnable composition, named "web"
│   ├── package.json         which bundles compose it
│   └── cordis.patch.yml     YOUR overrides. You will edit this.
├── sessions/                conversation logs
└── .credentials.yaml        API keys (never commit these)
```

The distinction that matters: **`~/deepseek-harness` is the program;
`~/.dsh` is your configuration of it.**

## A profile is a composition

You do not "run dsh". You run a **profile** — an ordered stack of plugin rows.
The `web` profile is what serves the UI on port 3080. It is assembled from:

1. the `@deepseek-ai/dsh-base` bundle (the common roster),
2. the `@deepseek-ai/dsh-web-app` bundle (adds the browser UI, and *disables*
   some base rows — see lesson 10 for a surprising example),
3. your own `~/.dsh/profiles/web/cordis.patch.yml`,
4. any `--patch` overlays you pass on the command line.

Later layers win. This is lesson 13.

## Do these three things now

**1. See the composition your harness is actually running:**

```bash
cd ~/deepseek-harness
node --import tsx/esm apps/cli/src/bin.ts --profile web --dump-config
```

Several hundred rows scroll past. That is the entire harness, listed. Every row
is a plugin. Scroll to the very bottom — the last rows, under a
`# == ~/.dsh/profiles/web/cordis.patch.yml` marker, are the course capstone
plugin. Yours.

**2. Compare against the shipped default** (no user layer, no overlays):

```bash
node --import tsx/esm apps/cli/src/bin.ts --profile web --dump-default-config
```

The diff between these two commands is *exactly* what you have customized.

**3. Find a capability you recognize:**

```bash
node --import tsx/esm apps/cli/src/bin.ts --profile web --dump-config | grep -i "tool-bash\|tool-fs\|llm-deepseek"
```

Those rows are the bash tool, the file tools, and the DeepSeek model adapter.
Ordinary plugins, mounted by ordinary rows — same shape as the one you will write
in lesson 02.

## The mental shift

Coming from other agent frameworks, you may look for "the plugin API". There
isn't one, because there is no non-plugin part to have an API *to*. Instead:

- To add a model-facing function → register on `ctx.tools` (lessons 05-06)
- To add human-facing instructions → write a Skill (lesson 10)
- To add a `/command` → register on `ctx.commands` (lesson 11)
- To change existing behavior → listen to its event (lesson 08)
- To swap an implementation → provide the service (lesson 09)
- To wire in an external MCP server → add one row (lesson 12)

Same `ctx`, different method.

## Reference

- Architecture: `~/deepseek-harness/docs/architecture.md`
- Cordis primer: `~/deepseek-harness/docs/cordis-primer.md`
- Online: <https://deepseek-harness.github.io/deepseek-harness/en/reference/>

---

Next: **[Lesson 02 — Your first plugin](../02-first-plugin/)**
