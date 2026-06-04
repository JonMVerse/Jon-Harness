# MV Claude Harness

> A workflow harness for Claude Code: plan-driven development, multi-agent review, and a learning loop that compounds across sessions.

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/Multiverse-io/mv-claude-harness)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Compatible-purple.svg)](https://claude.ai)

## Why this exists

Claude Code out of the box is a smart chat with tools. That's enough for quick edits — not enough for real engineering work. The gaps:

- **Continuity** — sessions start blank. Rationale dies in scrollback at `/clear`.
- **Consistency** — no shared workflow means two engineers using the same tool produce wildly different work.
- **Verification** — review and testing are whatever the model improvises, if anything.
- **Learning** — corrections you give in one session evaporate at the next `/clear`. The same mistakes recur.

This harness wraps Claude Code in a structured six-phase lifecycle — **Plan → Build → Review → Test → Learn → Ship** — backed by persistent artefacts in the repo and a self-improving steering-doc loop. Workflow becomes repeatable; the project gets smarter every time it's worked on.

## Philosophy

A few load-bearing beliefs shape the design:

- **Plans are first-class artefacts, not thinking aloud.** They live in the repo, have worklogs, and any future session can resume them. Re-plan in place — never start a parallel plan.
- **Steering docs beat repeated prompts.** Write a preference into `CLAUDE.md` once; Claude Code loads it every session. Stop pasting "remember to…" into every chat.
- **Throw compute at hard problems.** Subagents are cheap. For review, exploration, and reasoning, parallel specialised agents beat a single sequential pass.
- **Verify before "done."** Every phase has a verification step. The harness encourages "prove it works", not "looks done".
- **Mistakes are lessons.** Every correction is data. `/learn` extracts the lesson and writes it into a steering doc, so the same mistake doesn't happen twice.

## What it does

Every change runs through the same pipeline:

```
Plan → Build → Review → Test → Learn → Ship
 │       │       │       │       │       │
plan   agents  /review  /pw-test /learn /commit
mode                    /a11y     │
                                  ▼
 └──────────── Feedback Loop ─────┘
```

| Phase  | What it gives you                                          | Tool                           |
|--------|------------------------------------------------------------|--------------------------------|
| Plan   | Persistent dated plan folders + worklog                    | plan mode + `rename-plan` hook |
| Build  | Codebase-aware agent that explores the codebase            | `code-explorer` agent          |
| Review | Three reviewers (logic, security, tech-debt) in parallel   | `/review`                      |
| Test   | Exploratory + generated E2E and accessibility tests        | `/pw-test`, `/a11y-audit`      |
| Learn  | Patterns from the session land in your `CLAUDE.md`         | `/wrap-up`, `/learn`           |
| Ship   | Conventional commits + changelog generation                | `/commit`, `/gen-changelog`    |

## Install

```
/plugin marketplace add Multiverse-io/mv-claude-harness
/plugin install core@mv-claude-harness
```

To install manually, clone the repo and copy `core/` into your Claude Code plugins directory.

## Plans as living artefacts

When you enter plan mode, Claude Code writes a plan to `~/.claude/plans/<slug>.md`. The harness's `rename-plan` hook automatically mirrors it into the active project at `plans/YYYY-MM-DD-<slug>/plan.md`, with a `worklog.md` alongside.

```
plans/
└── 2026-05-08-add-tunnel-routing/
    ├── plan.md         the design — what and why
    └── worklog.md      what's been done, when, by what
```

Why the artefact matters:

- **Plans survive `/clear`** — they're files in the repo, not chat scrollback.
- **Sessions can be resumed** — read the worklog, pick up where the last session left off.
- **Re-planning happens in place** — when an assumption changes, edit the existing `plan.md` and log a `RE-PLAN` row in the worklog. One plan = one consolidated artefact, never a parallel fork.
- **Agent worklogs ride alongside** — subagents drop progress into `worklog-<id>.md` next to the parent plan, so multi-agent work stays auditable.

`/wrap-up` finalises the plan when the work is done and captures lessons before the session ends.

## The learning loop

Corrections you give Claude in one session are wasted if they evaporate at `/clear`. The harness writes them down automatically, in the right place.

After a session with mistakes, corrections, or non-obvious patterns:

```
/learn
```

The skill scans the conversation for generalisable lessons and updates the right steering doc — root `CLAUDE.md` for project-wide rules, directory-level `CLAUDE.md` for module-specific guidance, dedicated standards docs for cross-cutting concerns (error handling, security, accessibility, etc.). Steering docs are loaded into context every session, so:

> The same mistake never happens twice.

This compounds. Every session ends a little smarter than it started — and a team using the harness gets a project that captures its own institutional knowledge as it goes.

## Steering docs cascade

Claude Code reads `CLAUDE.md` files in cascade. Higher levels are inherited by lower levels:

```bash
# Organisation policy (managed, deployable via MDM)
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

## What ships

- **Agents** — `code-reviewer`, `security-reviewer`, `tech-debt-reviewer`, `test-generator`, `documentation-generator`, `code-explorer`
- **Commands** — `/review`, `/commit`, `/wrap-up`, `/pw-test`, `/a11y-audit`, `/gen-changelog`, …
- **Skills** — `playwright-cli`, `a11y-audit`, `learn`, `github-project-tickets`, …
- **Hooks** — `rename-plan` mirrors plan-mode files into the project automatically. Wiring in [`core/HOOKS.md`](core/HOOKS.md).
- **Status line** — model · cwd · branch · context-usage · cost · session duration. Optional, see below.

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

## Repo layout

```
.claude-plugin/   marketplace manifest
core/             the plugin — see core/README.md
plans/            auto-organised plan folders (created on demand by the rename-plan hook)
```

## Contributing · Support

- Issues and feature requests: [GitHub Issues](https://github.com/Multiverse-io/mv-claude-harness/issues)
- Discussions: [GitHub Discussions](https://github.com/Multiverse-io/mv-claude-harness/discussions)

---

Built by Multiverse.
