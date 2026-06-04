# core plugin — workflow harness

Cross-cutting workflow tooling (commands, agents, skills, hooks)
that supports day-to-day Claude Code use. Ships independently of any
domain plugin.

## Layout

- `.claude-plugin/plugin.json` — manifest; the `skills` array must list every skill directory
- `agents/*.md` · `commands/*.md` · `skills/*/SKILL.md` — component definitions
- `hooks/hooks.json` — registers the PostToolUse hook that organises plan files
- `scripts/rename-plan.sh`, `scripts/statusline.sh` — referenced by `hooks.json` / settings

## Authoring rules (load-bearing)

- **Hook edits** → `hooks/hooks.json` must follow the documented Claude Code PostToolUse matcher shape. Verify against current Claude Code hook docs before changing — the matcher shape is easy to get wrong and fails silently.
- **Plan files** → the PostToolUse hook captures them automatically into the repo's `plans/` directory. Two sources: (1) Claude Code plan-mode artefacts at `~/.claude/plans/<slug>.md` are mirrored into `plans/YYYY-MM-DD-<slug>/plan.md` (the primary case — just use plan mode); (2) in-project drafts at `plans/.tmp/<slug>.md` get the same treatment. Both grow a `worklog.md` alongside. Don't create dated folders manually.
- **Scripts referenced by hooks** are sourced via `${CLAUDE_PLUGIN_ROOT}` in `hooks.json` — that substitution works in `hooks.json` and `.mcp.json` but NOT in agent/command/skill markdown (see the marketplace-level rule).
- **`github-project-tickets` anomaly** → this skill's `SKILL.md` lives one level deeper than all others: `skills/github-project-tickets/github-project-tickets/SKILL.md`. The `plugin.json` correctly points at `./skills/github-project-tickets`. Don't flatten it when editing — the nesting is intentional.
