---
name: wrap-up
description: "Close out the work. Finalizes the plan artifact, then propagates docs and lessons via doc-update. Use when the user says 'wrap up', 'we're done', 'finish up', 'close this out', 'wrap-up', or after completing all plan steps."
user-invocable: true
---

# Wrap Up

Close out the current plan execution. You are running in the session that did the work, so you have the full conversation history available.

Announce at start: "Wrapping up — reviewing plan and session."

## Step 1: Find the Active Plan

Find the most recently modified plan folder in the project's `plans/` directory — the harness's hook mirrors plan-mode files there, and that in-repo copy is the canonical one to finalize:

```
ls -t plans/*/plan.md 2>/dev/null | head -5
```

(Plan mode also leaves a flat draft at `~/.claude/plans/<slug>.md`, but the repo copy under `plans/YYYY-MM-DD-<slug>/` is the one that gets committed.)

Cross-reference with conversation history — you know which plan you've been working on. If ambiguous, ask the user.

Read both `plan.md`, `worklog.md` and any other relevant docs from that respective plan folder.

If there's no active plan (the work wasn't run against one), skip Step 2 and go straight to Step 3 — closing out still propagates docs and learnings.

## Step 2: Finalize the Plan

Review what actually happened during this session (conversation history, git diff, worklog entries) against what the plan said.

In `plan.md`:
- Mark completed steps as **DONE**
- Mark abandoned steps with ~~strikethrough~~ and a brief reason
- If a `## Revision Log` section exists, confirm it's current
- If not, add one summarizing any mid-session re-plans (check worklog for `RE-PLAN` entries and review conversation for moments where the approach changed)
- Add a status line at the top, right after the title: `**Status: COMPLETE — YYYY-MM-DD**` (or `PARTIAL` if not everything finished)

In `worklog.md`:
- Append a final row: `| YYYY-MM-DD HH:MM | COMPLETE | plan wrapped up |`

## Step 3: Propagate Docs and Learnings

Invoke the `doc-update` skill. It reads the conversation and the git diff, then
refreshes architectural docs (fanning out writer subagents per module) and folds
session learnings into the steering docs and memory (via `learn`). That's where
every "what did we learn / what doc is now stale" decision is made — don't draft
those updates here.

## Step 4: Summary

Print a wrap-up:

```
## Session Complete

**Plan**: [plan folder name, or "none"]
**Status**: COMPLETE | PARTIAL (N of M steps done)
**Docs propagated**: [summary from doc-update, or "none"]
**Revisions during execution**: [count of RE-PLAN entries, or "none"]
```

## Rules

- Keep the plan readable — a new reader should understand the final state without knowing the history.
- The worklog and revision log carry the history. The plan body carries the final state.
- This skill is the close-out orchestrator: it finalizes the plan artifact, then delegates all documentation and lesson capture to `doc-update`. `/commit` reaches it when a commit completes the work.
