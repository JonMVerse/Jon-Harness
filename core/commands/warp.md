---
description: Create a copy-pasteable summary of the current session designed to allow you to /clear and bootstrap a new session with all the relevant context.
---

Produce a single copy-pasteable prompt that lets a new Claude Code session pick up exactly where this one left off. Do **not** write any files — this command is text-output only.

Cover, in order:

1. **What we were doing and why** — one short paragraph: the goal, the problem being solved, current state (in progress / blocked / verifying).
2. **Key references** — link to anything that already exists on disk that the next session should read first:
   - active plan(s) under `plans/YYYY-MM-DD-<slug>/plan.md` and the matching `worklog.md`, if any
   - files touched this session (paths with one-line "why it matters" each)
   - relevant external links (PRs, issues, docs) only if mentioned in this session
   Do not invent references. If no plan exists, skip that bullet — do not create one.
3. **What's next** — the immediate next step(s) the new session should take.
4. **Bootstrap prompt** — a fenced code block the user can copy directly into a fresh `/clear`'d session. It should restate the goal, point at the references from step 2, and end with the concrete next action.
