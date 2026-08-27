# Lesson 14 — Packaging a bundle

**Files:** [`dsh-lesson-bundle/`](./dsh-lesson-bundle/) — `package.json`, `cordis.patch.yml`, `index.ts`

## The problem with everything so far

Every lesson used absolute paths:

```yaml
name: '/Users/you/Desktop/dsh-custom-plugin/lessons/05-your-first-tool/plugin.ts'
```

That is fine for learning and useless for sharing. Packaging fixes it.

## Two manifests, two concepts

Both are a `package.json`. They differ only in the `dsh` key, and **nothing is
both**.

### Bundle — what *you author and distribute*

An npm package that ships **one configuration layer**.

```
dsh-lesson-bundle/
├── package.json         # declares dsh.bundle
├── cordis.patch.yml     # the layer applied when a profile lists this bundle
└── index.ts             # the plugin modules the patch rows reference
```

```json
{
  "name": "dsh-lesson-bundle",
  "version": "0.1.0",
  "type": "module",
  "main": "index.ts",
  "files": ["index.ts", "cordis.patch.yml"],
  "dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
}
```

And the key difference in its patch — **`name` is the package name**, not a path:

```yaml
- insert:
    - id: dsh-lesson-bundle-tool
      name: 'dsh-lesson-bundle'
```

Node resolution finds the installed code, so the bundle is portable.

> A package **without** `dsh.bundle` still installs, but only as a plain
> dependency: `dsh plugin` warns and activates no layer. That is the correct shape
> for a *library* other plugins import — not for a plugin users enable.

### Profile — what a *user boots*

A directory under `$DSH_HOME/profiles/<name>` describing one runnable composition.

```
~/.dsh/profiles/web/
├── package.json         # out-of-tree deps + dsh.profile.bundles
├── cordis.patch.yml     # the user's own layer  ← you have been editing this
└── pnpm-workspace.yaml
```

```json
{
  "name": "dsh-profile-web",
  "private": true,
  "dependencies": { "dsh-lesson-bundle": "link:/path/to/dsh-lesson-bundle" },
  "dsh": { "profile": { "bundles": ["@deepseek-ai/dsh-base", "dsh-lesson-bundle"] } }
}
```

> **You never hand-write a profile manifest.** `dsh plugin` creates and maintains
> it. (Its `cordis.patch.yml` is yours to edit; its `package.json` is not.)

## Installing

`dsh plugin --profile <name> <args…>` forwards to **pnpm** in the profile
directory, so every pnpm verb works.

```bash
# from the directory containing dsh-lesson-bundle/
dsh plugin --profile web add ./dsh-lesson-bundle

# from git, pinned
dsh plugin --profile web add github:you/dsh-lesson-bundle#<sha>

# from npm
dsh plugin --profile web add @deepseek-ai/dsh-subagent-codex

# verify the layer appeared, without booting
dsh --profile web --dump-config | grep -B2 -A5 dsh-lesson-bundle

# remove — drops the dependency AND the bundle entry together
dsh plugin --profile web remove dsh-lesson-bundle
```

On first use for a new profile name, the profile is initialized (shipped
templates: `web` = base + web-app, `headless` = base + headless; anything else
gets just `@deepseek-ai/dsh-base`).

> ⚠️ **Bundle membership is not hot.** A successful `add`/`remove` changes the
> manifest on disk, but a running profile keeps the bundle set it started with.
> **Restart.**

## If you are running dsh from source

The `dsh` binary may not be on your PATH. Prefix with pnpm from the checkout:

```bash
cd ~/deepseek-harness
pnpm dsh plugin --profile web add /Users/hanlinchen/Desktop/dsh-custom-plugin/lessons/14-packaging-a-bundle/dsh-lesson-bundle
```

Note this lesson's bundle uses `"main": "index.ts"` so it runs under the
harness's tsx loader without a build. A bundle published to npm should ship
**compiled JS** and point `main` at that instead — do not assume a consumer runs
under tsx.

## Choosing your install path

| Situation | Do this |
|---|---|
| Learning, iterating fast | `--patch ./cordis.patch.yml` (every lesson) |
| Personal setup on one machine | rows in `~/.dsh/profiles/web/cordis.patch.yml` (the capstone) |
| Same setup across all your profiles | rows in `~/.dsh/cordis.patch.yml` |
| Sharing with others / surviving upgrades | **package a bundle** and `dsh plugin add` |

## Publishing for discovery

Add the `dsh-plugin` topic to your GitHub repository — that is the ecosystem's
discovery convention.

## Exercises

1. Install this bundle into the `web` profile, restart, and call
   `lesson_bundle_hello` in the UI.
2. Inspect `~/.dsh/profiles/web/package.json` and find the two things `add`
   changed.
3. Remove the `dsh` key from the bundle's `package.json` and re-add it. Read the
   warning about no layer being activated.
4. Create a fresh profile: `dsh plugin --profile scratch add ./dsh-lesson-bundle`,
   then `dsh --profile scratch --dump-config`. Note how little it mounts compared
   to `web`.

---

Prev: **[13 — Composition and layers](../13-composition-and-layers/)** · Next: **[15 — Capstone](../15-capstone/)**
