# MV Claude Harness

> A workflow harness for Claude Code: plan-driven development, multi-agent review, and a learning loop that compounds across sessions.

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/Multiverse-io/mv-claude-harness)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Compatible-purple.svg)](https://claude.ai)

## What this is

Claude Code out of the box is a chat with tools. This repo turns it into a structured engineering harness: a curated set of **agents**, **slash commands**, **skills**, **hooks**, and a **status line** that together enforce a six-phase lifecycle — Plan → Build → Review → Test → Learn → Ship. Each phase has dedicated tools, and the harness wires them together so the same workflow runs every session.

The full catalogue of components lives in [`core/README.md`](core/README.md). This file is the overview.

## Install

```
/plugin marketplace add Multiverse-io/mv-claude-harness
/plugin install core@mv-claude-harness
```

To install manually, clone the repo and copy `core/` into your Claude Code plugins directory.

## How the harness works

```
Plan → Build → Review → Test → Learn → Ship
 │       │        │       │       │       │
plan   agents  /review  /pw-test /learn /commit
mode                    /a11y     │
                                  ▼
 └──────────── Feedback Loop ─────┘
```

| Phase  | What it gives you                                    | Example tool             |
|--------|------------------------------------------------------|--------------------------|
| Plan   | Plans auto-organised into dated folders + worklog    | hook + `/plan-status`    |
| Build  | Codebase-aware agents that explore and implement     | `feature-creator` agent  |
| Review | Three reviewers (logic, security, tech-debt) in parallel | `/review`            |
| Test   | Exploratory + generated E2E and accessibility tests  | `/pw-test`, `/a11y-audit`|
| Learn  | Patterns from the session land in your CLAUDE.md     | `/wrap-up`, `/learn`     |
| Ship   | Conventional commits and changelog generation        | `/commit`, `/gen-changelog` |

The compounding effect is the point: every session ends by feeding lessons back into the steering docs, so the next session starts smarter.

## What's in the box

- **Agents** — `code-reviewer`, `security-reviewer`, `tech-debt-reviewer`, `test-generator`, `feature-creator`, …
- **Commands** — `/review`, `/commit`, `/wrap-up`, `/pw-test`, `/a11y-audit`, `/gen-changelog`, …
- **Skills** — `playwright-cli`, `a11y-audit`, `learn`, `github-project-tickets`, …
- **Hooks** — auto-organises plan files into dated folders with worklogs. Wiring details in [`core/HOOKS.md`](core/HOOKS.md).

→ Full catalogue, usage, and extension guide: [`core/README.md`](core/README.md).

## Status line (optional)

Add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "/path/to/plugin/core/scripts/statusline.sh",
    "padding": 2
  }
}
```

Renders model, cwd, branch, context-usage bar, cost, and session duration:

```
[claude-opus-4.7] 📁 my-project | 🌿 main
██████████░░░░ 65% | $0.42 | ⏱️ 5m 23s
```

## Configuration hierarchy

Claude Code reads CLAUDE.md files in cascade. Higher levels are inherited by lower levels:

```bash
# Organization policy (managed, deployable via MDM)
/Library/Application Support/ClaudeCode/CLAUDE.md

# User defaults (your preferences, every project)
~/.claude/CLAUDE.md
~/.claude/rules/*.md

# Project configuration (team-shared, in repo)
{project}/CLAUDE.md
{project}/.claude/rules/*.md

# Directory-specific (service boundaries)
{project}/src/services/CLAUDE.md
```

Keep each file under ~200 lines for best adherence.

## Repo layout

```
.claude-plugin/   marketplace manifest
core/             the plugin — see core/README.md
plans/            auto-organised plan folders (created by the rename-plan hook)
```

## Contributing · Support

- Issues and feature requests: [GitHub Issues](https://github.com/Multiverse-io/mv-claude-harness/issues)
- Discussions: [GitHub Discussions](https://github.com/Multiverse-io/mv-claude-harness/discussions)

---

Built by Multiverse.
