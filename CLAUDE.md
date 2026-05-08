# MV Claude Harness — project context

This repo authors a **Claude Code plugin marketplace**. It is not an app — there is no build, no tests, no runtime. Edits under `core/` ship to end users via the `/plugin marketplace` system once published.

## Layout

- `.claude-plugin/marketplace.json` — suite-level manifest (lists `core` as a plugin)
- `core/` — the only published plugin
  - `.claude-plugin/plugin.json` — plugin manifest; the `skills` array must list every skill directory
  - `agents/*.md` · `commands/*.md` · `skills/*/SKILL.md` — component definitions
  - `hooks/hooks.json` — registers the PostToolUse hook for plan-file organisation
  - `scripts/rename-plan.sh`, `scripts/statusline.sh`
- `plans/` — dated plan folders; new plans land in `plans/.tmp/` and the hook moves them

See `README.md` for the user-facing harness overview and `core/README.md` for the full component catalogue.

## Authoring rules (load-bearing)

- **New skill** → create `core/skills/<name>/SKILL.md` **and** add `./skills/<name>` to the `skills` array in `core/.claude-plugin/plugin.json`. Skipping the second step silently disables the skill.
- **New agent / command** → drop a markdown file with `name` and `description` frontmatter into `core/agents/` or `core/commands/`. No registration step.
- **Hook edits** → `core/hooks/hooks.json` must follow the documented PostToolUse matcher shape. This was broken twice in recent history (commits `c9aa0b3`, `0fda92d`) — verify against current Claude Code hook docs before changing.
- **Plan files** → start at `plans/.tmp/<slug>.md`. The PostToolUse hook moves them to `plans/YYYY-MM-DD-<slug>/plan.md` and creates `worklog.md`. Don't create dated folders manually.

## Versioning

- Bump `core/.claude-plugin/plugin.json` `version` for plugin changes.
- Bump `.claude-plugin/marketplace.json` `version` for suite-level changes (e.g. adding a second plugin).

## What this repo is not

- No `package.json`, no install step, no test runner. Don't suggest adding one.
- No CI runtime — just markdown + bash. The only lint signal is cSpell warnings (mostly false positives on British spelling and project terms).
