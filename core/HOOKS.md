# Plugin Hooks

This plugin ships five Claude Code hooks — deterministic guardrails around a probabilistic agent. The common thread: plan capture, manifest hygiene, shell safety, and continuity across compaction and sessions, all made automatic.

| Hook | Event (matcher) | Script | Purpose |
|------|-----------------|--------|---------|
| rename-plan | PostToolUse (`Write\|Edit\|MultiEdit`) | `scripts/rename-plan.sh` | Auto-organises plan files into dated folders with worklogs |
| lint-plugin-manifests | PostToolUse (`Write\|Edit\|MultiEdit`) | `scripts/lint-plugin-manifests.sh` | In plugin-marketplace repos: flags unregistered skills and plugin/marketplace version drift |
| bash-gate | PreToolUse (`Bash`) | `scripts/bash-gate.sh` | Blocks high-confidence destructive commands; logs every command |
| session-compact-context | SessionStart (`compact`) | `scripts/session-compact-context.sh` | Re-injects orientation + live git state after a context compaction |
| session-end-breadcrumb | SessionEnd | `scripts/session-end-breadcrumb.sh` | Appends a one-line breadcrumb so the next session can pick up the trail |

## How they're wired

`hooks/hooks.json` registers all five. The rename-plan entry looks like this; the others follow the same shape under their own event keys:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          { "type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/scripts/rename-plan.sh" },
          { "type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/scripts/lint-plugin-manifests.sh" }
        ]
      }
    ]
  }
}
```

What each piece does:

- **`PreToolUse` / `PostToolUse`** — fire before / after the tool call; tool-name matchers are literal alternations of exact tool names.
- **`SessionStart` with matcher `compact`** — fires only when a session resumes from a context compaction (other sources: `startup`, `resume`, `clear`). The script's stdout is injected into the session context.
- **`SessionEnd`** — takes no tool matcher; receives a `reason` on stdin. Cannot block anything — informational only.
- **`${CLAUDE_PLUGIN_ROOT}`** — resolves to the plugin's installation directory, so the scripts work regardless of where the plugin was installed or what the working directory is.

## bash-gate

Reads the pending Bash command from stdin. Two jobs:

1. **Deny high-confidence destructive patterns** via JSON `permissionDecision: "deny"` — `rm -rf` aimed at `/`, `~` or `$HOME`; force-push to main/master (`--force-with-lease` is allowed); `curl`/`wget` piped straight into a shell; `mkfs` / `dd of=/dev/…`; `chmod 777 /`. The list is deliberately conservative: a false block is easy to work around, a false pass is not.
2. **Audit-log every command** (flattened, 500-char cap) to `.claude/bash-commands.log`, kept out of version control via `.git/info/exclude`.

## lint-plugin-manifests

Only acts when the edited file is a `plugin.json`, `marketplace.json`, or `SKILL.md` inside a repo whose root has `.claude-plugin/marketplace.json` — everywhere else it exits 0 instantly. It enforces this harness's two mechanical authoring rules: every on-disk `skills/<dir>` must be registered in its plugin's `plugin.json`, and `marketplace.json` must mirror each plugin's version. Violations exit 2, which feeds the findings back to Claude to fix in-session (the write itself is not blocked).

## session-compact-context

After a compaction, the summarized session re-receives: an instruction to trust disk state over the summary, the live git branch / dirty files / recent commits, and the tail of the most recently touched `plans/*/worklog.md`. Zero model calls — everything is read from disk.

## session-end-breadcrumb

Appends `<utc-time> | reason=<reason> | branch=<branch> | dirty=<n>` to `.claude/session-breadcrumbs.log` (auto-added to `.git/info/exclude`). Zero tokens — no model runs at session end. The log is the cheap end of episodic memory: `tail` it at the start of a session to see how the last one ended.

When the plugin is installed and enabled via `/plugin marketplace`, the hooks register on the next session start. If you enable the plugin mid-session, run **`/reload-plugins`** to activate them without restarting Claude Code. They unregister automatically when the plugin is disabled.

> **Heads-up:** if you also have any of these scripts wired in `~/.claude/settings.json` (e.g. from a pre-plugin manual install), those hooks will fire twice. Remove the user-level entry to let the plugin be the sole source.

## rename-plan — what the script does

`scripts/rename-plan.sh` reads the tool-call JSON from stdin, extracts `tool_input.file_path`, and acts on either of two source paths. Anything else exits 0 and the tool call proceeds normally.

**Source A — Claude Code plan-mode artifacts** at `~/.claude/plans/<slug>.md`. The hook mirrors these into the *running* project's `plans/` directory (resolved via `$CLAUDE_PROJECT_DIR`, which Claude Code sets on hook invocation). The original file is left in place — plan mode keeps owning it during the session — and the project gets a continuously-updated copy at `plans/YYYY-MM-DD-<slug>/plan.md`. **This is the primary path** — it's how plans authored in Claude Code's plan mode end up captured in the repo.

**Source B — in-project drafts** at `<project>/plans/.tmp/<slug>.md`. Treated the same way, but the destination `plans/` dir is derived from the source path (sibling of `.tmp/`).

For matching files:

1. **First write of a plan** — reads the first 1500 chars, asks Claude (`claude -p`) for a 3-5 word snake_case slug, and creates `plans/YYYY-MM-DD-<slug>/plan.md` plus a fresh `worklog.md`. The chosen slug is cached in a `<file>.name` sidecar so subsequent edits route to the same folder without re-prompting.
2. **Agent worklogs** (in-project flow only) — files named `<session>-agent-<id>.md` under `plans/.tmp/` are routed to `plans/YYYY-MM-DD-<slug>/worklog-<id>.md` based on the parent session's namecard. If the parent plan hasn't been named yet, the worklog stashes in `plans/.tmp/pending/` and is adopted when the parent's folder is created. Plan-mode files don't use this branch — plan mode is single-file.

The hook is idempotent — re-editing a plan file copies the updated content into the same target folder.

## Wiring it manually

If you're using these scripts outside the plugin (copied into your own project), drop the JSON above into one of:

- `~/.claude/settings.json` — applies to all your projects
- `.claude/settings.json` — project-scoped, can be committed
- `.claude/settings.local.json` — project-scoped, gitignored

…and replace `${CLAUDE_PLUGIN_ROOT}` with `"$CLAUDE_PROJECT_DIR"/path/to/rename-plan.sh` (quotes matter — `$CLAUDE_PROJECT_DIR` may contain spaces).

The script needs `python3`, `claude` (the CLI), `realpath`, and `find` on `PATH`. `claude -p` is only invoked on first-write, so existing plans don't pay the LLM cost.

## Custom status line

To use the bundled status line, add to your `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "/path/to/plugin/core/scripts/statusline.sh",
    "padding": 2
  }
}
```

This is a separate Claude Code feature, not a hook — it doesn't go inside the `hooks` block.

The status line shows: model · cwd · branch · context-usage bar · session cost · duration.
