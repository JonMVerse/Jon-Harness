---
name: doc-update
description: "Propagate a session's changes into the project's documentation. Reads the conversation and the git diff, then refreshes architectural docs (fanning out writer subagents per affected module) and folds session learnings into the steering docs and memory. Use when the user says 'update the docs', 'sync the docs', 'docs are stale', 'refresh the documentation', after a feature lands, or as the documentation stream of a session close-out."
user-invocable: true
---

# Doc Update

Keep the project's documentation in step with what just changed. You run in the
session that did the work, so you have the full conversation history — the *why*
behind each change, the corrections, the decisions. That context is what the
writer subagents lack, so your job is to **gather and route** it: decide what
needs updating and hand each writer a self-contained brief.

Announce at start: "Updating docs — reviewing what changed."

Two kinds of documentation, handled by two streams:

- **Architectural / descriptive** — design rationale, navigation, how things
  connect (`CLAUDE.md`/`AGENTS.md` architectural sections, `ARCHITECTURE.md`,
  `docs/`). Heavy, generative, often one doc per touched module. **Fanned out**
  to `documentation-generator` subagents in parallel.
- **Steering / prescriptive + memory** — rules, conventions, user preferences.
  Surgical, judgement-heavy, driven by what was corrected or validated in the
  conversation. Handled **in-session** by the `learn` skill.

## Step 1: Gather context

- **Conversation** — what was built, what design decisions were made and why,
  what the user corrected or confirmed.
- **Git diff** — what actually changed on disk:

  ```
  git diff --stat HEAD && git status --short
  ```

  Use the file list to map changes to the modules they touch.

## Step 2: Classify the changes

Sort what changed into the two streams:

- **Architectural** — new modules, changed component boundaries, new integration
  points, a workflow whose shape changed, a non-obvious decision a future reader
  would need explained. These need the architectural stream.
- **Steering / learnings** — a correction that should never recur, a convention
  that was validated, a pattern worth enforcing, a user preference. These need
  the learn stream.

A single change can feed both streams. Within a shared `CLAUDE.md`/`AGENTS.md`,
respect the seam: architectural sections belong to the architectural stream,
prescriptive rules belong to the learn stream.

If nothing architectural changed, skip Step 3. If nothing was learned, skip
Step 4. Don't manufacture work to fill a stream.

## Step 3: Architecture stream (fan out)

For each module whose architecture changed:

1. Detect the doc convention at that scope (an existing `CLAUDE.md`/`AGENTS.md`/
   `ARCHITECTURE.md`, or the convention a sibling/parent uses).
2. **Resolve each scope to its target doc file, then group by that file.** A
   module with no local doc resolves to the nearest parent (often the root
   `CLAUDE.md`), so several scopes can land on the same file. Collapse those into
   one writer — never dispatch two parallel subagents that edit the same file, or
   their writes clobber each other.
3. Dispatch **one `documentation-generator` subagent per distinct target file**,
   **in parallel** (a single message with multiple agent calls). Give each a
   self-contained change-brief covering every scope that maps to its file, so it
   doesn't have to rediscover scope:
   - the files that changed in those scopes and a one-line *what* for each,
   - the *why* from the conversation (the rationale the diff can't show),
   - the target doc and the instruction to **refresh only architectural
     sections**, leaving steering rules and unrelated content untouched.

The brief carries the context the subagent can't see, which is the whole point
of routing this from the main thread.

## Step 4: Steering + memory stream (in-session)

Invoke the `learn` skill. It owns the logic for extracting generalizable lessons
from the conversation, checking them against existing rules, and writing them to
the right steering doc or to memory. Don't duplicate that logic here — delegate
to it.

## Step 5: Report

Print a consolidated summary:

```
## Docs Updated

**Architectural**: [files refreshed, or "none"]
**Steering / memory**: [handed to learn — N rules added, or "none"]
**Skipped**: [streams with nothing to do, briefly]
```

## Rules

- Route, don't write the steering edits yourself — the `learn` skill is the
  single source of that logic; this skill orchestrates.
- Don't fabricate documentation needs. If the diff is small and self-explanatory
  and nothing was learned, say "docs already current" and stop.
- Never touch application code.
- Fan out architectural writers in parallel — one writer per distinct target
  doc file (group scopes that resolve to the same file), never two on one file.
- This skill is the documentation stream of a close-out: the `wrap-up` skill
  invokes it after finalizing the plan, and `/commit` reaches it through wrap-up.
  It also runs standalone any time the docs drift.
