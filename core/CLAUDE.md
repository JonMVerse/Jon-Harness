# core plugin — workflow harness

Cross-cutting workflow tooling (commands, agents, skills, hooks)
that supports day-to-day Claude Code use. Ships independently of any
domain plugin.

## Layout

- `.claude-plugin/plugin.json` — manifest; the `skills` array must list every skill directory
- `agents/*.md` · `commands/*.md` · `skills/*/SKILL.md` — component definitions
- `hooks/hooks.json` — registers five hooks: rename-plan + lint-plugin-manifests (PostToolUse Write|Edit|MultiEdit), bash-gate (PreToolUse Bash), session-compact-context (SessionStart, matcher `compact`), session-end-breadcrumb (SessionEnd)
- `scripts/*.sh` — hook scripts above, plus `statusline.sh` (settings, not a hook); see `HOOKS.md`

## Authoring rules (load-bearing)

- **Hook edits** → `hooks/hooks.json` must follow the documented Claude Code hook shapes (PreToolUse/PostToolUse tool-name matchers, SessionStart source matchers, SessionEnd matcher-less). Verify against current Claude Code hook docs before changing — the matcher shape is easy to get wrong and fails silently.
- **Manifest edits are self-linted** → the `lint-plugin-manifests` hook enforces skill registration and version mirroring on every write in this repo. If it exits 2 with findings, fix them in the same session — don't suppress the hook.
- **bash-gate denylist** → keep it conservative: every pattern must be high-confidence destructive with no common legitimate use inside an agent session. A false block is a minor nuisance; a habit of overriding the gate is worse.
- **Agent tiers** → `scout`/`doc-digest` (haiku), `mech-executor` (sonnet), `executor`/`verifier` (opus). Model routing is owned by the profile frontmatter — don't override the model at invocation. Route cheapest-first; escalate after two failures; non-trivial changes get a `verifier` pass before being reported done.
- **Plan files** → the PostToolUse hook captures them automatically into the repo's `plans/` directory. Two sources: (1) Claude Code plan-mode artefacts at `~/.claude/plans/<slug>.md` are mirrored into `plans/YYYY-MM-DD-<slug>/plan.md` (the primary case — just use plan mode); (2) in-project drafts at `plans/.tmp/<slug>.md` get the same treatment. Both grow a `worklog.md` alongside. Don't create dated folders manually.
- **Scripts referenced by hooks** are sourced via `${CLAUDE_PLUGIN_ROOT}` in `hooks.json` — that substitution works in `hooks.json` and `.mcp.json` but NOT in agent/command/skill markdown (see the marketplace-level rule).
- **`github-project-tickets` anomaly** → this skill's `SKILL.md` lives one level deeper than all others: `skills/github-project-tickets/github-project-tickets/SKILL.md`. The `plugin.json` correctly points at `./skills/github-project-tickets`. Don't flatten it when editing — the nesting is intentional.
