# core — Claude Code workflow plugin

The plugin shipped by [mv-claude-harness](../README.md). It provides the agents, commands, skills, and hooks that implement the six-phase development lifecycle described in the root README. Install via the [root README](../README.md#install).

## At a glance

Components mapped onto the lifecycle:

| Phase  | Components                                                                |
|--------|---------------------------------------------------------------------------|
| Plan   | `rename-plan` hook · `/plan-status`                                       |
| Build  | `code-explorer` agent                                                     |
| Review | `/review` · `code-reviewer`, `security-reviewer`, `tech-debt-reviewer` agents |
| Test   | `/pw-test`, `/a11y-audit` · `test-generator` agent · `playwright-cli`, `a11y-audit` skills |
| Learn  | `/wrap-up` · `learn`, `wrap-up` skills · `documentation-generator` agent  |
| Ship   | `/commit`, `/gen-changelog`, `/wt-merge` · `gen-changelog`, `wt-merge`, `github-project-tickets` skills |

## Agents

Long-running, autonomous workers for complex tasks.

| Agent | Purpose |
|-------|---------|
| `code-reviewer` | Logic bugs, edge cases, convention violations |
| `security-reviewer` | Vulnerability scanning, unsafe patterns, exposed secrets |
| `tech-debt-reviewer` | Maintainability, dead code, duplication |
| `test-generator` | Runner-agnostic TypeScript unit tests (Jest / Vitest / `node:test`); follows host project's testing standards |
| `documentation-generator` | Architectural docs (the "why" / navigation); detects host's doc convention (CLAUDE.md / AGENTS.md / etc.) and updates in place |
| `code-explorer` | Codebase navigation and understanding |

Invoke via `/agent <name>` or trigger automatically through the commands that compose them (e.g. `/review`).

## Commands

Quick, single-shot slash commands.

| Command | Purpose |
|---------|---------|
| `/review` | Multi-agent review — fans out to `code-reviewer`, `security-reviewer`, `tech-debt-reviewer` in parallel and synthesises the results |
| `/commit` | Conventional-format commit; updates CLAUDE.md if affected; preps changelog content |
| `/pw-test` | Exploratory Playwright testing then E2E test generation |
| `/a11y-audit` | WCAG accessibility audit on changed files |
| `/gen-changelog` | Generates a categorised changelog from git history |
| `/wrap-up` | Finalises the active plan, captures lessons |
| `/wt-merge` | Squash-merge a worktree branch's PR and clean up |
| `/plan-status` | Lists status of every plan in `plans/` |
| `/product-lens` | Product-perspective review before building |
| `/optimize-doc` | Tightens a markdown/documentation file |
| `/warp` | Builds a session-summary you can paste into a fresh `/clear`'d session |
| `/linear-build` | Drives delivery from an agent-ready Linear board — labels tickets, proposes plans for human green light, dispatches `scout`/`mech-executor`/`executor`, adversarially verifies + reviews, pushes PRs for human review, writes status back |

## Skills

Capabilities Claude invokes automatically when relevant.

| Skill | Activates when… |
|-------|------------------|
| `playwright-cli` | Browser automation or E2E testing is needed |
| `a11y-audit` | Accessibility checking is requested |
| `gen-changelog` | Release notes are being prepared |
| `github-project-tickets` | Pushing completed work to a GitHub Project board |
| `learn` | Updating steering docs after corrections |
| `optimize-doc` | Improving an existing markdown file |
| `product-lens` | Strategic product questions arise before building |
| `wrap-up` | Closing out plan execution |
| `wt-merge` | Merging worktree branches |
| `delivery-reality-check` | A timeline needs stress-testing against Linear data, or a plan needs compiling into an agent-executable board |

## Hooks

`hooks/hooks.json` registers five hooks:

- **rename-plan** (PostToolUse on `Write|Edit|MultiEdit`) — mirrors plan-mode files from `~/.claude/plans/<slug>.md` into the running project's `plans/YYYY-MM-DD-<slug>/plan.md` (uses `$CLAUDE_PROJECT_DIR`), organises in-project drafts at `plans/.tmp/`, and maintains `worklog.md` / agent `worklog-<id>.md` files alongside each plan.
- **lint-plugin-manifests** (PostToolUse on `Write|Edit|MultiEdit`) — in plugin-marketplace repos, flags unregistered skills and plugin/marketplace version drift back to Claude.
- **bash-gate** (PreToolUse on `Bash`) — blocks a conservative denylist of destructive commands; audit-logs every command to `.claude/bash-commands.log`.
- **session-compact-context** (SessionStart, matcher `compact`) — re-injects live git state and the active plan's worklog after a context compaction.
- **session-end-breadcrumb** (SessionEnd) — appends a one-line trail entry to `.claude/session-breadcrumbs.log`. Zero tokens.

Full behavior, setup details, and the status-line config: [HOOKS.md](HOOKS.md).

## Workflow principles

Core principles for effective Claude Code development workflows.

### Planning

#### Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

#### Plan Lifecycle
When executing work against a plan in the `plans/` directory:
- A `worklog.md` is auto-created in the plan folder alongside `plan.md`
- Append a row to the worklog table after completing each meaningful step
- Format: `| YYYY-MM-DD HH:MM | action | brief detail |`
- Keep entries terse — one line per action, not paragraphs
- If resuming a plan from a previous session, read the worklog first to pick up context

#### Re-planning Rules
- **NEVER create a new plan file when re-planning.** Edit the existing `plan.md` in place.
- When a step fails, an assumption was wrong, or the approach needs to change:
  1. Log a `RE-PLAN` entry in the worklog: `| timestamp | RE-PLAN | reason for change |`
  2. Edit plan.md — update affected steps, ~~strikethrough~~ abandoned approaches, add new approach inline
  3. Add a `## Revision Log` section at the bottom of plan.md if it doesn't exist
- One plan folder = one consolidated artifact
- When done, run `/wrap-up` to finalize the plan and capture lessons

### Execution

#### Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

#### Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

#### Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### Learning

#### Self-Improvement Loop
- After ANY correction from the user: update the workspace level CLAUDE.md with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

#### Knowledge Capture
- Use `/learn` to update steering documentation
- Patterns that work become commands
- Commands that compose become workflows
- Workflows that repeat become skills

### Task Management

1. **Plan First**: Write plan before implementation
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add to existing plans and worklogs
6. **Capture Lessons**: Update lessons after corrections

### Core Principles

- **Simplicity First**: Make every change as simple as possible. Follow KISS and DRY principles.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Autonomous Operation**: When given a bug report: just fix it. Don't ask for hand-holding.
- **Zero Context Switching**: Point at logs, errors, failing tests - then resolve them.

### The Development Lifecycle

```
Plan → Implement → Review → Test → Learn → Ship
 │         │         │       │       │       │
 │    worklog.md  /review  /test  /learn  /commit
 │                                   │
 └────────── Feedback Loop ──────────┘
```

Each phase feeds into the next, creating a compounding effect where every session improves future work.

## Extending the plugin

**Add an agent** — drop a markdown file into `agents/`:

```markdown
---
name: api-reviewer
description: Reviews API design
---

You are an API design expert…
```

**Add a command** — drop a markdown file into `commands/`:

```markdown
---
name: deploy
description: Deploy to production
---

Run deployment checks then push to production.
```

**Add a skill** — create a directory under `skills/` containing `SKILL.md` (skill definition), an optional `scripts/` folder, and an optional `references/` folder. Then add the path to the `skills` array in `.claude-plugin/plugin.json`.

## Troubleshooting

- **Commands not recognised** — verify install with `claude-code plugin list`; restart Claude Code after installation.
- **Agent not completing** — check Claude Code logs; ensure you're on the latest version.
- **Skills not activating** — be specific in your request; check the skill description for trigger language.

## Plugin layout

```
core/
├── .claude-plugin/
│   └── plugin.json          plugin metadata
├── agents/                  agent definitions (reviewers + delegation tiers)
├── commands/                slash-command definitions
├── skills/                  skill directories with SKILL.md
├── hooks/
│   └── hooks.json           hook registrations (5 hooks)
├── scripts/
│   ├── rename-plan.sh       plan-organising hook script
│   ├── lint-plugin-manifests.sh  manifest-hygiene hook script
│   ├── bash-gate.sh         shell-command gate hook script
│   ├── session-compact-context.sh   post-compaction re-orientation
│   ├── session-end-breadcrumb.sh    session-end trail logger
│   └── statusline.sh        status-line renderer
├── HOOKS.md                 hooks + status-line setup
└── README.md                this file
```
