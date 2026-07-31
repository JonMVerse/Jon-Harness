# Porting from `ai-toolkit` (enrichment sync)

This harness (`JonMVerse/Jon-Harness`) and the org's `ai-toolkit`
(`Multiverse-io/ai-toolkit`, the `upstream` remote) have **no shared git
history** and **different layouts**. So they cannot be synced with
`git merge`/`rebase` — syncing is **change-level porting**, one item at a time,
`ai-toolkit → here`. The goal is to stay enriched with org changes while keeping
this fork's preferred ways of working.

This is a maintenance process for *this repo*, deliberately **not** a plugin
skill — a skill would ship to marketplace consumers who have no `upstream`
remote and can't use it.

## Direction & intent

- **Pull down** capabilities we lack or where upstream's definition is genuinely
  deeper. **Adapt, don't copy** — retarget to this harness's agent tier.
- **Do not** blind-overwrite our agents/skills: several are intentionally ahead
  (e.g. the Claude-5 migration landed here before/independently of upstream).
- **Contribute up** genuinely-shared improvements via ai-toolkit's own
  governance (`CONTRIBUTING.md`, `suggested/ → plugins/`), not by inverting this
  relationship — ai-toolkit is the org-canonical, org-governed marketplace.

## Layout map (`ai-toolkit` path → here)

| ai-toolkit | here |
|------------|------|
| `plugins/harness-core/` | `core/` |
| `plugins/harness-security/` | `security/` |
| `plugins/<other>/` (e.g. `typescript-standards`) | `<other>/` (repo root) |
| `plugins/harness-core/skills/<s>/` | `core/skills/<s>/` |
| `plugins/harness-core/agents/<a>.md` | `core/agents/<a>.md` |
| `plugins/harness-core/commands/<c>.md` | `core/commands/<c>.md` |

## Agent-model map (their taxonomy → ours)

Upstream uses a leaner worker set; this harness uses a richer tier. When porting
a skill that dispatches upstream workers, retarget the references:

| ai-toolkit agent | here | note |
|------------------|------|------|
| `investigator` (haiku breadth) | `scout` | read-only recon, same role |
| `implementer` (sonnet worker) | `mech-executor` (mechanical) / `executor` (judgment) | our two-tier split |
| `code-explorer` | `code-explorer` | same |
| `verifier` | `verifier` | same |
| the `build` skill | `/linear-build` + executor tier | we keep `linear-build` as our execution path; don't adopt `build` verbatim |

## Port procedure

1. **Find the gap:** `bash scripts/upstream-gap.sh` (fetches `upstream`, prints
   skills/agents/commands/plugins we lack + a depth comparison for overlaps).
2. **Bring the tree over** into our layout:
   ```
   git checkout upstream/main -- plugins/<path>
   git mv plugins/<path> <here-path>
   rm -rf plugins            # remove the empty staging dir
   ```
3. **Adapt** the content:
   - Retarget agent references per the map above.
   - Strip I/O-contract references tied to the other runtime (mount paths, build
     / registration steps, framework-specific orchestrator names). See the root
     `CLAUDE.md` "porting" authoring rule.
   - Fix cross-references (README section names, hook names) to this repo.
4. **Register & version** (the `lint-plugin-manifests` hook enforces this):
   - New skill → add `./skills/<name>` to the plugin's `plugin.json` `skills`.
   - New plugin → add an entry to `.claude-plugin/marketplace.json` `plugins[]`
     with `version` mirroring the plugin's own `plugin.json` version; bump the
     suite-level `marketplace.json` `version`.
   - Bump the touched plugin's version; mirror it in `marketplace.json`; add a
     `CHANGELOG.md` entry for `core` changes.
5. **Verify:** re-run `node <plugin>/evals/check.mjs` where present; confirm no
   broken links and that the hook lints clean.

## What NOT to pull

- Our agents when we're ahead (check the depth comparison — "mine deeper").
- Shared skills already in sync (identical line counts) — nothing to gain.
- `build` verbatim — adapt to our executor tier / `linear-build` instead.
- `suggested/*` unless deliberately adopting an RFC (it's pre-promotion, org-experimental).
