# Changelog

All notable changes to the **`core`** plugin in this harness (`mv-claude-harness`).
Versions are the `core` plugin version (`core/.claude-plugin/plugin.json`); the
suite-level `marketplace.json` version moves independently and is noted where relevant.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/).

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
