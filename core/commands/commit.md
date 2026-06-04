---
description: Git commit all changes, and close out the work when it's complete
---

Commit all changes across all repos (you may be run from a workspace).

First, judge whether this commit **completes the work** — every step of the active plan is done, or the user signalled they're finished ("final commit", "we're done", "ship it").

- **If the work looks complete**, ask the user whether to close it out. If they confirm, run the `wrap-up` skill **before staging** — it finalizes the plan artifact and runs the documentation stream (`doc-update` → architectural refresh + `learn`). These steps create and modify files (plan, worklog, docs, steering rules), so let the close-out finish first; otherwise its changes won't make it into the commit.
- **If this is a mid-work checkpoint**, skip the close-out — keep routine commits lean.

Then stage everything — code plus any plan, doc, and steering files the close-out touched — and commit it all together with a descriptive, conventional-format message sized to the change.

When unsure whether the work is complete, ask rather than guess.
