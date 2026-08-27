# Lesson 02 — Your first plugin

**Files:** [`plugin.ts`](./plugin.ts) · [`cordis.patch.yml`](./cordis.patch.yml)

## Run it

```bash
cd ~/Desktop/dsh-custom-plugin
./scripts/try-lesson.sh 02-first-plugin
```

Expected output before the server URL appears:

```
[lesson-02] hello from my first dsh plugin
[lesson-02] fiber uid = 35 | name = lesson-02-first-plugin
```

Ctrl-C to stop. (`--check` instead of no flag boots, verifies, and exits.)

## The whole contract

A dsh plugin is an ES module with named exports. That is all.

```ts
export const name = 'lesson-02-first-plugin'   // optional: a label for diagnostics
export function apply(ctx: Context) { … }      // required: the body
```

No manifest file. No base class. No `registerPlugin()` call. If the module
exports an `apply` function, it is a plugin.

Three more optional exports complete the picture — you will meet each in turn:

| Export | Lesson | Purpose |
|---|---|---|
| `inject` | 05 | services this plugin needs before it may start |
| `Config` | 04 | a validator for the plugin's config |
| `name` | here | a diagnostics label — **not** a service name, nothing resolves it |

## What `apply` receives

`ctx` is a **Context** — and specifically *this plugin instance's own* child
context. That ownership is the whole trick: every registration you make through
this `ctx` is attributed to your plugin, which is how Cordis can cleanly unload
you later (lesson 03).

The second argument is your validated config (lesson 04). We ignore it here.

## The row that mounts it

```yaml
- insert:
    - id: lesson-02-first-plugin
      name: '/absolute/path/to/plugin.ts'
```

- **`insert`** — this patch entry *adds* rows. (The other kind of entry modifies
  an existing row by `id` — lesson 13.)
- **`id`** — a stable identity. **Always write one explicitly.** A row without an
  `id` gets a generated one on every read, so any edit to the file makes the
  loader think the row was removed and re-added, and it needlessly remounts.
- **`name`** — what to load. An absolute path here; for a published package it is
  the package name (lesson 14).

## Two things that will bite you

**1. `.ts` works with no build step — but only because of how dsh starts.**
The harness runs under `node --import tsx/esm`, which registers a loader hook
process-wide, so any `.ts` file imported anywhere gets transpiled on the fly. It
strips types; it does **not** type-check. A type error will not stop your plugin
from running.

**2. `ctx.logger(...)` output is invisible in the `web` profile.**
`ctx.logger('name')` is the real framework logger and is what shipped plugins
use — but nothing attaches a console exporter to it in this profile, so its
output goes nowhere you can see. This course uses `console.log` for teaching
signals deliberately. Use `ctx.logger` in code you ship.

## Exercises

1. Change `name` to something else and re-run. Notice the `fiber.name` in the
   output changes — that is where the label surfaces.
2. Add `config:` with any keys to the patch row, then log the second argument of
   `apply`. It arrives unvalidated, since we declared no `Config` yet.
3. Break the path in `cordis.patch.yml` and re-run. Read the error carefully —
   `Cannot find module ... imported from ~/.dsh/profiles/web/`. Note the
   resolution base: a `--patch` file contributes config but does **not** change
   the directory module paths resolve from. That is why the course uses absolute
   paths.

---

Prev: **[01 — Orientation](../01-orientation/)** · Next: **[03 — Lifecycle and effects](../03-lifecycle-and-effects/)**
