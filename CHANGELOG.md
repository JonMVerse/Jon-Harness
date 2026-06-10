# Changelog

All notable changes to the **`core`** plugin in this harness (`mv-claude-harness`).
Versions are the `core` plugin version (`core/.claude-plugin/plugin.json`); the
suite-level `marketplace.json` version moves independently and is noted where relevant.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/).

## [3.8.0] — 2026-06-10
- **New skill `security-review`** — pulled in from upstream `multiverse-io/ai-toolkit`
  `harness-core` (the live successor to the now-archived `mv-claude-harness`). Reference
  library for the `security-reviewer` agent: vulnerability patterns + code examples, severity
  classification, report/PR-review templates. Closes a dangling reference — `security-reviewer.md`
  already said "see skill: `security-review`" but the skill didn't exist in this fork.
  Plugin-name refs rewritten `harness-core` → `core` to match this fork (per the
  port-stripping rule). Registered in `plugin.json` skills array.
- `wt-merge`: adopted upstream's more robust worktree detection — match `pwd` against the
  first `git worktree list` entry instead of the brittle branch-name heuristic
  (`worktree-*`/not-`main`), so detection no longer breaks on non-standard branch names.
- **Re-pointed `upstream` remote** to `multiverse-io/ai-toolkit` (was the archived
  `Multiverse-io/mv-claude-harness`).

## [3.7.2] — 2026-06-10
- `linear-em-dashboard`: renamed "ticket lifespan" → "in-progress time" throughout the
  dashboard template (KPI card, lifespan-trend chart subtitle/dataset label, cycle-summary
  header) to match the estimation-accuracy definition (start → done); tickets without a
  start date are now explicitly noted as excluded. Added a **Weekly Throughput & Estimation
  Accuracy** card (last 12 weeks) with an estimate-vs-days-to-resolve scatter and a clickable
  custom tooltip. Outlier cap aligned to 365d (was 90d) to match `resolDays`. No logic change
  to the existing computation (already used `startedAt → completedAt`). (commit `0eb1bc3`.)

## [3.7.1] — 2026-06-10
- `atlas-verify`: hardened the Phase-1 **test-plan runner** (`run-test-plan.ts`) — per-turn
  served-model capture (parsed from the GENERATION name), `forbidTools` plus
  `section`/`prompt`/`response` scenario fields (§G-style inverse rules **pass** when a
  forbidden tool does *not* fire), degrade-don't-crash on transient Langfuse blips
  (`lfFetch` 6× retry, `fetchObs` throws instead of `process.exit`, per-scenario `error`
  fallback that still captures the reply), incremental `RESULTS_OUT` writes so a mid-run
  abort loses nothing, and env-tunable `INGEST_TIMEOUT_MS`. Added scenario sets
  `a-set-otj.json`, `b2g-set.json`, `b2g-cont.json`. (PR #6 PoC + #8 hardening.)
- **Repo-level `templates/`** (reference content, no plugin code): `ai-feature-test-plan.md`
  — reusable AI-feature test-plan, shipped with the `converse-atlas` execution-design doc
  under `atlas-verify/docs/` (PR #5); `rfc.md` — lightweight decision-oriented RFC template
  (PR #7).
- README: recommends the official code-quality plugins (`code-review`, `code-simplifier`,
  `code-modernization`, `pr-review-toolkit`) as user-scope **Review-phase companions**
  rather than bundling them — bundling would fork code we don't own.
- **Maintenance:** retired the now-archived read-only `upstream` remote (all post-fork
  upstream commits verified already in `main`); synced the embedded `core` version in
  `marketplace.json` to match the plugin manifest (3.7.1).

## [3.7.0] — 2026-06-04
Synced with upstream `Multiverse-io/mv-claude-harness` (core v2.9.1). Custom skills
(`atlas-*`, `langfuse-query`, `linear-em-dashboard`, `mv-slides`, `onboarding-clone`) and
the agents' Socratic communication style are preserved.
- Added core skills **`doc-update`** (propagate session changes into docs/steering, fanning
  out `documentation-generator` writers) and **`goal-prep`** (shape work into a `/goal`
  bootstrap string).
- Core cleanups from upstream: `/warp` prompt-only, `/learn` ref fix, the **layered
  doc/steering close-out loop** in `wrap-up`, and refreshed `commit` / `review` / `a11y-audit`.
- `documentation-generator` updated to upstream's `doc-update`-dispatched version (Socratic
  block re-applied). **Removed legacy agents** `claude-md-generator` + `feature-creator`
  (matching upstream); cleaned README references.
- **Doc/steering restructure**: root `CLAUDE.md` is now a cross-plugin index that
  `@`-includes per-plugin steering (`core/CLAUDE.md`, `security/CLAUDE.md`); the
  `github-project-tickets` nested-dir note is preserved in `core/CLAUDE.md`.
- **Suite:** added the new **`security`** (AI governance) plugin alongside `core` →
  `marketplace.json` v1.2.0. `atlas-ai-assessment` kept as-is.
- Added a read-only `upstream` git remote for future diffs.

## [3.6.0] — 2026-06-04
- `atlas-verify`: added a browserless **API mode** (default) — GraphQL `askAtlas`/
  `sendMessage` + `botResponseStream`/`threadMessageSent` (graphql-ws) for `atlas`, and
  `POST /api/chat` + SSE for `atlas-2`; the Playwright **UI mode** is kept as a
  lazy-loaded fallback (`MODE=ui`). Replies stream to the terminal.
- `atlas-verify`: added `package.json` (deps resolve via `npm install`; `npm run
  setup:ui` for Playwright), `.gitignore`, and `ONBOARDING.md`.
- `atlas-verify`: Langfuse verifier filters environment client-side and anchors the
  window to the newest trace in the target environment; `--expect` is now optional.

## [3.5.0] — 2026-06-03
- Renamed the `atlas-staging-verify` skill → **`atlas-verify`**.
- `atlas-verify`: tool calls are read as Langfuse observation `type=TOOL`.

## [3.4.0] — 2026-06-03
- Added the **`atlas-staging-verify`** skill (drive staging Ask Atlas + confirm the
  resolved model in Langfuse).

## [3.3.0] — 2026-06-03
- Added the **`onboarding-clone`** skill (forks the Coda "Welcome to Tech" doc for new
  joiners and strips personalised subpages).

## [3.2.0] — 2026-05-29
- Added the **`langfuse-query`** skill.
- `linear-em-dashboard`: added Linear deep-links and bug fixes (anchor overlay for KPI
  links, debug logging).

## [3.1.0] — 2026-05-21
- Added a **Socratic communication style** to all agents.

## [3.0.0] — 2026-05-20
- Added the **`mv-slides`** skill (Multiverse-branded Google Slides / python-pptx).
- Shipped `linear-em-dashboard` updates.

## [2.8.0] — 2026-05-18
- Updated `atlas-ai-assessment` with v7 findings.

## [2.7.0] — 2026-05-14
- Added the **`atlas-ai-assessment`** skill (16-area AI governance/lifecycle review).

## [2.6.0] — 2026-05-08
- Hook now captures plan-mode files from `~/.claude/plans/`.
- Renamed the suite to **`mv-claude-harness`** for Multiverse adoption.

## [2.5.0] — 2026-05-08
- Hooks cover MultiEdit; documented `/reload-plugins` activation.

## [2.4.0] — 2026-05-08
- Harness recognises `steering/` standards folders.

## [2.3.0] — 2026-05-05
- Generalised the `test-generator` and `documentation-generator` agents.

## [2.2.0] — 2026-05-01
- Corrected the hooks structure (resolved the installation error).
- Suite `marketplace.json` bumped to 1.1.0.

## [2.1.0] — 2026-05-01
- Fixed installation commands and plugin configuration.

## [2.0.1] — 2026-04-11
- Version bump.

## [2.0.0] — 2026-04-11
- Updated all commands, **consolidated skills**, and migrated old commands into skills.

## [1.0.0–1.0.5] — 2025-10-22 → 2026-03-03
- Initial marketplace, manifest, and folder structure (first plugin: react).
- Clean-ups and commit-command tweaks across 1.0.1–1.0.5.

[3.6.0]: https://github.com/JonMVerse/Jon-Harness/commits/main
