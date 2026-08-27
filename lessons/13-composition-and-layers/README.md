# Lesson 13 — Composition and layers

**Files:** [`cordis.patch.yml`](./cordis.patch.yml) — the file *is* the lesson.

## Run it

```bash
./scripts/try-lesson.sh 13-composition-and-layers
```

## The two kinds of patch entry

A patch file is a top-level YAML **array**. Every entry is one of two things,
distinguished by whether it has `insert`:

```yaml
# KIND 1 — insert: ADD rows
- insert:
    - id: my-thing
      name: '/path/to/plugin.ts'
      config: { … }

# KIND 2 — id-targeted: MODIFY a row an earlier layer created
- id: agent-presets
  config:
    default: standard

# disabling is the same kind
- id: hmr
  disabled: true
```

An entry with no `id` and no `insert` is meaningless. An `id` that matches nothing
**warns on stderr and is skipped** — never an error. So a typo'd `id` fails
quietly; check stderr.

## Row fields

| Field | Meaning |
|---|---|
| `id` | stable identity; the patch key. **Always write it.** |
| `name` | module specifier to load (path or package name) |
| `config` | value handed to the plugin, validated by its schema |
| `disabled` | `true` keeps the row but does not mount it (nor its descendants) |
| `inject` | required services / service intercept config for this row |
| `group` | `true` marks a nested group; `config` is then a sub-list of rows |
| `isolate` | give this subtree its own realm for a service name |

You can insert *into* a group by targeting it:

```yaml
- id: persistent-shell     # must be a row with group: true
  insert:
    - id: my-extra
      name: '@example/extra'
```

## THE RULE: layers win per row id, and `config` is REPLACED

Composition order, over an empty root:

1. each bundle patch in `dsh.profile.bundles` order (`@deepseek-ai/dsh-base` first)
2. the profile's `~/.dsh/profiles/<name>/cordis.patch.yml`
3. the home-level `~/.dsh/cordis.patch.yml` — **outranks the per-profile file**
4. each `--patch` overlay, in argv order

> **Later layers win per row `id`, and an id-targeted patch replaces the row's
> ENTIRE `config`. There is no deep merge.**

This is the single most consequential rule in dsh configuration. If a row sets
five keys and you patch one, **the other four are gone**. You must restate every
key you want to keep.

The correct workflow, therefore:

```bash
# 1. see the row's REAL current config
dsh --profile web --dump-default-config | grep -A10 'id: the-row'
# 2. copy it wholesale into your patch
# 3. change the one field
# 4. verify
dsh --profile web --dump-config | grep -A10 'id: the-row'
```

This is why `dsh-web-app` restates all of `session-query-sqlite`'s fields to
change one.

Corollaries for plugin authors:

- Keep any single row to *one* bundle layer plus the user's.
- Prefer config defaults users will keep, and let the schema carry the rest —
  users can then override your rows without touching your package.
- Row order carries **no** load semantics; activation is service-driven (lesson 09).

## `!!js` expressions

`!!js <expr>` (**two** bangs — `!js` is wrong) is parsed into an expression node
and evaluated by the loader.

**Allowed only in `config` (at any depth) and in `disabled`.** In `id`, `name`,
`inject`, `group`, or `isolate` it is inert data that silently changes nothing —
a genuine footgun. (The repo has a verify script that catches this internally.)

In scope: `ctx` (and any injected service as `ctx.<name>`), `process`, and the
boot-provided `dshHomePath(...segments)`.

Timing differs by field:

| Field | Evaluated |
|---|---|
| `config` | **once**, when the row activates — *after* its injected services exist |
| `disabled` | at **every** mount decision, against the loader context |

Real examples from the shipped base bundle:

```yaml
config:
  root: !!js dshHomePath('sessions')
  workspaceRoot: !!js process.cwd()
  mode: !!js process.env.DSH_PERMISSION_MODE ?? 'workspace-write'
disabled: !!js process.platform === 'win32'
```

Quote the scalar when YAML would mangle it:

```yaml
policy: !!js "(process.env.MODE ?? 'a') === 'b' ? 'never' : 'ask'"
```

Two warnings:

1. **`!!js` is `eval` with `with(ctx)`.** A patch file is executable code. Treat
   one you did not write like a shell script you did not write.
2. A user patch that replaces a whole `config` with literals **deletes** the
   `!!js` runtime read. That is exactly how CLI-flag precedence gets accidentally
   lost.

`--dump-config` prints `!!js` expressions **unevaluated**.

## Inspecting composition

```bash
dsh --profile web --dump-default-config    # bundle layers only
dsh --profile web --dump-config            # + profile + home + overlays
dsh --profile web --patch ./x.yml --dump-config
```

Output is one loadable YAML document, with `# == <file>, patched by <layer>`
markers showing provenance. It uses the *same* patch-application code as boot, so
a dump cannot drift from what actually runs.

## Hot reload

Plugins **do** hot-reload (`@deepseek-ai/cordis-plugin-hmr`). Reload = **unload
then load**: the old fiber's effects all unwind, the new module's `apply` runs.
This is why lesson 03's discipline matters — HMR exercises your disposal path on
every save.

What is and isn't hot:

| Change | Hot? |
|---|---|
| Plugin source file | ✅ |
| A row's `config` | ✅ (a config-only diff goes through `fiber.update`) |
| A row's `name`, `inject`, or `group` | ✅ but forces a full dispose+restart, with rollback on failure |
| Either `cordis.patch.yml` | ✅ — both layers stay watched; a bad parse keeps the last good tree running |
| **Bundle membership** (`dsh plugin add/remove`) | ❌ **restart required** |

The loader diffs rows **by `id`** — which is the concrete reason to always write
explicit ids. And note: a live patch edit re-evaluates `!!js` against services
that are still up, so it cannot reset an already-served port.

## Exercises

1. Uncomment the `agent-presets` override, but *only* set `default`. Compare
   `--dump-config` before and after to see what you deleted.
2. Add `- id: hmr` / `disabled: true`, reboot, and edit a plugin file. No reload.
3. Write an entry targeting `id: does-not-exist` and find the stderr warning.
4. Put `!!js process.cwd()` in a row's `name` and watch it fail to resolve as a
   literal string — the footgun, safely.

---

Prev: **[12 — MCP integration](../12-mcp-integration/)** · Next: **[14 — Packaging a bundle](../14-packaging-a-bundle/)**
