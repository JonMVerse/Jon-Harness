# MV Claude Harness — project context

This repo authors a **Claude Code plugin marketplace**. It is not an app — there is no build, no tests, no runtime. Edits under each plugin directory ship to end users via the `/plugin marketplace` system once published.

## Layout

- `.claude-plugin/marketplace.json` — suite-level manifest (lists every plugin)
- `core/` — workflow harness plugin. See `@core/CLAUDE.md`.
- `security/` — AI governance plugin (discovery / classification / assessment of AI use cases). See `@security/CLAUDE.md`.
- `plans/` — dated plan folders; new plans land in `plans/.tmp/` and the `core/` PostToolUse hook moves them into place

See `README.md` for the marketplace overview, `core/README.md` for the workflow harness catalogue, and `security/README.md` for the governance plugin.

## Authoring rules (load-bearing — cross-plugin)

- **New skill** → create `<plugin>/skills/<name>/SKILL.md` **and** add `./skills/<name>` to the `skills` array in `<plugin>/.claude-plugin/plugin.json`. Skipping the second step silently disables the skill.
- **New agent / command** → drop a markdown file with `name` and `description` frontmatter into `<plugin>/agents/` or `<plugin>/commands/`. No registration step.
- **`${CLAUDE_PLUGIN_ROOT}` only expands in `hooks.json` and `.mcp.json`** — NOT in skill, agent, or command markdown. For plugin-internal file refs in markdown, use relative paths from the consuming file: `../` to plugin root from `agents/` or `commands/`, `../../` from `skills/<name>/`. See Claude Code docs: Skills "Available string substitutions" and Hooks "Reference Scripts by Path".
- **Subagents that produce files must declare `Write`** (or `Edit`, `NotebookEdit` as needed) in their `tools:` frontmatter. `Read, Glob, Grep` alone won't grant file-write capability.
- **Subagents are context-blind: they receive only their prompt, never the session conversation.** So any work that depends on conversation history — extracting lessons, judging *why* something changed, reading the user's corrections — must live in a main-thread skill or command, not a subagent. Fan subagents out only for self-contained generative work, and hand each one a brief that carries the context it needs (see `doc-update`, which decides what to update in-session, then dispatches `documentation-generator` writers with per-module briefs).
- **When porting prompts or schemas from another runtime**, strip every I/O-contract reference tied to that runtime: mount paths, build / registration steps, framework-specific orchestrator names, and audit-directory conventions. "Verbatim" ports of contract-heavy files ship broken behaviour because the contract no longer holds.
- **Don't hardcode "today" / current-date strings** in agent prompts or reference content — they rot fast and drift between files. Instruct the agent to "compute the gap from the current session date" instead; Claude Code injects the current date into every session.

## Versioning

- Bump the plugin's own `<plugin>/.claude-plugin/plugin.json` `version` for changes scoped to that plugin.
- Bump `.claude-plugin/marketplace.json` `version` for suite-level changes (adding/removing a plugin, cross-plugin restructuring).

## What this repo is not

- No `package.json`, no install step, no test runner. Don't suggest adding one.
- No CI runtime — just markdown + bash. The only lint signal is cSpell warnings (mostly false positives on British spelling and project terms).

## Plugin-specific guidance

@core/CLAUDE.md
@security/CLAUDE.md
