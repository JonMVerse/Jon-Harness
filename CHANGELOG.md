# Changelog

All notable changes to the **`core`** plugin in this harness (`mv-claude-harness`).
Versions are the `core` plugin version (`core/.claude-plugin/plugin.json`); the
suite-level `marketplace.json` version moves independently and is noted where relevant.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/).

## [3.10.0] — 2026-07-21

Delivery planning → agent-driven execution: a Linear-native planning skill and the command that turns its output into work for the executor tier.

- **`delivery-reality-check`**: new skill. Stress-tests a proposed timeline against real Linear data (scope, estimates, milestones, cycle load), maps hard/pattern/hedge dependencies, works four scenario levers (scope cut, parallelisation, resourcing with escape valves, done-redefinition), and escalates outputs from lane timeline → week-by-week milestone table with a "capability delivered" column → saved plan → compiled Linear board. Compilation makes sequencing machine-readable (`blockedBy` relations, dated milestones), rewrites tickets to the bundled agent-ready standard (`references/agent-ready-ticket.md`: 8-point checklist, routing labels `agent:mech` / `agent:judgment` / `human`, lint verdicts), and cross-checks non-engineering gates (compliance screened at PAVE level first — escalating to DPIA only when the screening indicates it; doc↔board date drift; missing implied tickets).
- **`/linear-build`**: new command. Orchestrates delivery from an agent-ready board with a human in the loop at both ends — walks the dependency graph for unblocked tickets, ensures the routing labels exist on the team and are applied, lints each ticket against the readiness standard, widens the lens beyond the ticket (file/contract overlap, product-vs-tech implications surfaced to the human, never resolved silently), human-gates auth/personal-data/spend/migration work and anything under an open privacy action, then **proposes an implementation outline (approach, adversarially-argued alternatives, wider impact, verification) for explicit human green light before any code is written**. Approved plans compile into one-shot briefs routed to `mech-executor`/`executor` (scout pass when grounding is thin); output must survive an adversarial `verifier` pass **and** a `/review`-style fan-out (code/security/tech-debt reviewers) before a PR is pushed; the PR carries the plan + evidence and requests human review — the agent never merges. Adversarial stance applies at every stage: each decision names its strongest alternative and why it loses. Stops on consecutive blocks/refutations or a passed milestone date and recommends re-planning.



Hooks, agent tiers, and registry hygiene — ideas adopted from Alexander Langolf's personal setup, adapted for a distributed plugin.

- **Hooks** (all new scripts in `core/scripts/`, wired in `hooks/hooks.json`):
  - `session-compact-context.sh` — SessionStart(compact): after a context compaction, re-injects re-orientation instructions plus live git state and the active plan's worklog tail, so a summarized session doesn't lose ground truth. Zero model calls.
  - `session-end-breadcrumb.sh` — SessionEnd: appends a one-line breadcrumb (UTC time, reason, branch, dirty-file count) to `.claude/session-breadcrumbs.log`, kept out of version control via `.git/info/exclude`. Zero tokens.
  - `bash-gate.sh` — PreToolUse(Bash): blocks a conservative denylist (rm -rf on /, ~ or $HOME; force-push to main/master; curl/wget piped to a shell; mkfs / dd to block devices; chmod 777 /) via JSON `permissionDecision: deny`, and logs every command to `.claude/bash-commands.log`.
  - `lint-plugin-manifests.sh` — PostToolUse(Write|Edit|MultiEdit): in plugin-marketplace repos, enforces the two mechanical authoring rules (every on-disk skill registered in `plugin.json`; `marketplace.json` version mirroring) — exits 2 so violations feed back to Claude.
- **Agents** — five orchestration-tier profiles with model routing owned by the profile: `scout` (haiku, read-only recon), `mech-executor` (sonnet, fully-specified mechanical work), `executor` (opus, implementation needing judgment), `verifier` (opus, fresh-context adversarial check, read-and-run only), `doc-digest` (haiku, long-doc compression). Routing policy: cheapest tier that can plausibly succeed; escalate after two failures; verifier pass before non-trivial work is reported done.
- **`skill-audit`**: new skill. Monthly registry hygiene — inventories all registered skills across plugin/user/project scope, grades trigger descriptions, finds overlaps and dead weight, estimates context cost, recommends prunes/merges/rewrites. Read-only.
- Docs: `HOOKS.md` rewritten to cover all five hooks; README gains a session-continuity section and an episodic-memory companion note; `core/CLAUDE.md` layout updated.
- Fixed: `rename-plan.sh` no longer tracebacks (exit 1 under `set -e`) on empty or non-JSON stdin — malformed input now exits 0 silently, matching the other hook scripts' defensive contract.

## [3.8.9] — 2026-06-16
- `weekly-coach`: new skill. Produces a weekly personal coaching debrief — SBI observations, SMART development goals, and 360 feedback prompts — by gathering signals from Gmail, Slack, Google Drive, and Calendar and framing them against the Multiverse Manager Expectations guide. Delivers by email or file.

## [3.8.8] — 2026-06-16
- `cowork-insights`: new skill. Produces a candid written report on how the user is using Cowork — recurring session patterns, automation opportunities (backward- and forward-looking), tooling gaps, and concrete workflow tips. Invoked explicitly via `/cowork-insights`.

## [3.8.7] — 2026-06-11
- `linear-em-dashboard`: truly-empty teams (no cycles, no triage, no issues completed in the
  last 12 weeks — e.g. Legal Team) now show a friendly "No Linear data yet" message instead of
  a shell of empty charts and "—" KPIs. Distinct from the old no-cycle bail: a no-cycle team
  that *has* triage or weekly data still renders the full board.

## [3.8.6] — 2026-06-11
- `linear-em-dashboard`: team picker moved to its own row, left-aligned directly below the
  header, in a fixed `.team-bar`. Previously it sat in `.header-right` beside `#lastUpdated`,
  which is empty until a team loads — so the picker visibly shifted once the "refreshed …"
  text appeared and the flex row reflowed. Now its position is stable across loading/loaded states.

## [3.8.5] — 2026-06-11
- `linear-em-dashboard`: completed the team-load race guard — the `loadDashboard` **catch
  block** now also checks `myToken !== loadToken`, so a superseded load that *fails* can't
  paint its error over the team the user has since switched to (the success path was already
  guarded in 3.8.4). Runtime-verified in the desktop app (rapid Atlas → no-cycle-team switching).
- Tightened the no-cycle code comment to reflect that the path also serves teams with cycles
  *enabled but not planned in* (e.g. Manatees), not only teams with no cycles at all.

## [3.8.4] — 2026-06-10
- `linear-em-dashboard`: addressed the Bugbot re-scan of ai-toolkit PR #5 (not yet pushed to
  the PR — batching with desktop testing to avoid a fix/rescan ping-pong):
  - **Fixed (Med)** — overlapping team-load race: `loadDashboard` now claims a monotonic
    `loadToken`; a slower earlier load whose token is stale bails before `render()`, so the
    last-selected team always wins.
  - **Documented as known limitations** (SKILL.md "Known limitations") rather than fixed —
    both are pre-existing v1 tradeoffs for reviewers to weigh: (a) carry-over reflects
    *current* completion state, not end-of-cycle state (understates historical rollover);
    (b) weekly/30-day metrics fetch a single `list_issues` page (`limit:250`), so >250-issue
    windows are silently undercounted.
  - **Runtime-verified:** the no-cycle-team dashboard (3.8.2 fix) confirmed working in the
    desktop app on a real non-cycle team.

## [3.8.3] — 2026-06-10
- `linear-em-dashboard`: fixed 3 follow-on issues from Bugbot's re-scan of ai-toolkit PR #5:
  - **High/Med** — deep-link metadata: `teamKey` is now parsed from the issue **URL** path
    (`/issue/ATLAS-1234/…`) rather than the issue `id` (a UUID, so it never matched), with a
    fallback to `identifier`/`id`. Extraction now scans **all** issue sources (cycle results
    **and** `weeklyIssues`), so no-cycle teams resolve their triage/cycle deep links too.
  - **Low** — scatter tooltip handlers on `#scatterTip` now use `.onmouseenter`/`.onmouseleave`
    property assignment instead of `addEventListener`, so renders/team switches replace rather
    than stack them.
  - Note: link resolution still warrants a runtime check against the real Linear MCP response shape.

## [3.8.2] — 2026-06-10
- `linear-em-dashboard`: fixed 4 issues found by Cursor Bugbot on ai-toolkit PR #5
  (all in `dashboard-template.html`):
  - **High** — no-cycle teams lost the dashboard: `loadDashboard` returned early when a
    team had no cycles with `issueCountHistory`, *before* triage + weekly data loaded, so
    teams that don't use cycles (the weekly view's whole audience) saw only an empty state.
    Now it no longer bails — triage KPIs + the 12-week table render, and the cycle-based
    KPIs/charts degrade to "—"/empty. `render()` guards the cycle-KPI block against empty metrics.
  - **Med** — triage KPI card links stacked on team switch (`addCardLink` appended a new
    overlay `<a>` each render); now removes any prior overlay first (`data-card-link`).
  - **Med** — estimation scatter could stay visible with a stale/empty canvas after a switch
    to a team with <5 estimated tickets; `weeklyScatterWrap` is now reset to hidden each render.
  - **Low** — removed 4 debug `console.log` calls from the load/render path.
  - Note: the no-cycle refactor (High) needs a runtime check against a real no-cycle Linear team.

## [3.8.1] — 2026-06-10
- `linear-em-dashboard`: completed the "lifespan" → "in-progress time" rename started in
  `0eb1bc3` — now consistent across all user-facing surfaces (SKILL.md description/trigger
  text, metrics table, artifact description, data notes; dashboard header subtitle and the
  "Ticket Lifespan Trend" → "In-Progress Time Trend" card title). Internal code identifiers
  (`cLifespan` canvas id, `lifespans`/`medLife` vars) deliberately kept to avoid breaking the
  canvas-id linkage. No logic change.

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
