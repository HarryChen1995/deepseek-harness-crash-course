# Lesson 10 — Skills

**Files:** [`cordis.patch.yml`](./cordis.patch.yml) · [`skills/quote-formatter/SKILL.md`](./skills/quote-formatter/SKILL.md)

**No plugin code in this lesson.** A Skill is a Markdown file.

## Run it

```bash
./scripts/try-lesson.sh 10-skills
```

At <http://127.0.0.1:3099>, try both entry points:

> /quote-formatter

> format this quote: talk is cheap show me the code — Linus Torvalds

## Tool vs Skill

| | Tool | Skill |
|---|---|---|
| Is | code (`execute` + JSON schema) | **instructions** (Markdown) |
| Gives | new **capability** | new **behavior** over existing capability |
| Costs | a full JSON schema on **every** request | one catalog line (name + description) until loaded |
| Editing | reboot / HMR | **hot** — next call reads the new body |
| Good for | computation, I/O, typed contracts, permission gating | checklists, house style, workflows, judgment |

Rule of thumb: **tools give new capability; skills give new behavior.**

The third option people forget: **a Skill plus a script.** The skill supplies the
judgment, a file in its `scripts/` folder supplies the determinism, and no schema
is ever added to the request.

## Surprise: skills are OFF in the `web` profile

Verify it:

```bash
cd ~/deepseek-harness
node --import tsx/esm apps/cli/src/bin.ts --profile web --dump-default-config | grep -A2 'id: tool-skill'
```

```yaml
- id: tool-skill
  name: '@deepseek-ai/dsh-tool-skill'
  disabled: true
```

The `dsh-web-app` bundle disables `skill-filesystem` and `tool-skill` because
agent presets are meant to own local discovery there. This lesson's patch turns
them back on — a real, useful instance of id-targeted patching (lesson 13).

Note that `disabled` is a **top-level row field, not part of `config`** — so
patching it does not wipe the row's config.

## The file format

Either `<name>/SKILL.md` (directory bundle) or `<name>.md` (flat). Recursive
`**/SKILL.md` discovery is **not** supported. The name must be kebab-case:
`^[a-z0-9]+(?:-[a-z0-9]+)*$`.

```markdown
---
name: quote-formatter
description: Use when the user asks to format a quotation — trigger phrases…
---

# Formatting a quotation
…body…
```

### Frontmatter fields

| Key | Case | Required | Default |
|---|---|---|---|
| `name` | — | **yes** | — (must be kebab-case) |
| `description` | — | **yes** | — |
| `whenToUse` | **camelCase** | no | extra routing guidance; never shown in the catalog |
| `disable-model-invocation` | **kebab-case** | no | `false` → model may invoke |
| `user-invocable` | **kebab-case** | no | `true` → user may invoke |
| `metadata` | — | no | opaque passthrough object |

> ⚠️ The inconsistent casing is real and enforced. `whenToUse` is camelCase, but
> the two invocation flags are kebab-case — and their camelCase spellings
> (`disableModelInvocation`, `modelInvocable`, `userInvocable`) **throw**
> `frontmatter field "X" is unsupported; use "Y"` and the skill is skipped.

Bad frontmatter → the file is **warned and skipped**, never a hard discovery
failure. So a typo means your skill silently isn't there.

### `description` is the entire routing signal

Before loading, the model sees only `name` + `description`. Every skill in the
repo therefore starts with **"Use when …"** and enumerates trigger phrases.
Descriptions are truncated at `catalogDescriptionMaxLength` (default **500**).

### Resource subdirectories

```
quote-formatter/
├── SKILL.md
├── references/examples.md
└── scripts/format.py
```

> **dsh does NOT enumerate these directories.** The skill tool hands the model
> only a `resourceBase` path plus "resolve relative paths against it". **The body
> must name its own files** or they are invisible.

Sidecars like `agents/openai.yaml` are for Codex/Claude Code cross-compatibility;
**dsh ignores them entirely.**

## Discovery roots (lower rank wins)

| Rank | Source | Path |
|---|---|---|
| 100 | `project-dsh` | `<projectRoot>/.dsh/skills` |
| 200 | `project-agents` | `<projectRoot>/.agents/skills` |
| **300** | `custom` | **`Config.customSkillDirs`** ← this lesson |
| 400 | `user-dsh` | `<dshHome>/skills` (`$DSH_HOME` or `~/.dsh`) |
| 500 | `user-agents` | `<agentsHome>/skills` (`$DSH_AGENTS_HOME` or `~/.agents`) |
| 600 | `bundled` | `Config.bundledSkillDir` |

`projectRoot` = nearest ancestor containing `.git`.

> ⚠️ **Rank is subordinate to layering.** The registry is host + per-scope
> layered; **the nearest layer wins a duplicate name outright**, and rank only
> breaks ties *within* one layer. A preset-scoped skill beats a global one
> regardless of rank.

## Two ways a skill gets used

**1. The model calls the `skill` tool.** It sees a catalog injected as a system
reminder listing `name` + `description`, then calls `skill({name})` to load the
body. Skills with `disable-model-invocation: true` never appear here.

**2. The human types `/skill-name`.** A whitespace-bounded `/name` token
**anywhere** in a user message injects the body directly, appended *after* every
other injection so it sits closest to the answer. This is the **only** entry point
for `disable-model-invocation: true` skills.

Only messages genuinely from the user count — external text cannot forge the
gesture.

## Watch out: two different slash namespaces

`/quote-formatter` (a skill) and `/wordcount` (a command, lesson 11) look
identical and work completely differently. Lesson 11 has the comparison table.

## Exercises

1. Add `disable-model-invocation: true`, reboot, and confirm the model can no
   longer choose it while `/quote-formatter` still works.
2. Misspell `description` as `descriptions`. The skill silently vanishes — check
   the catalog to confirm.
3. Add a `references/examples.md` and reference it *by name* from the body.
4. Edit the body while the harness is running. The next invocation picks it up
   with no reboot.

---

Prev: **[09 — Services and seams](../09-services-and-seams/)** · Next: **[11 — Human commands](../11-commands/)**
