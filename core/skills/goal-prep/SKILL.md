---
name: goal-prep
description: Shape a plan, task, or session output into one paste-ready condition string for `/goal` in a fresh Claude Code session. Use when the user types /goal-prep, asks to "prep a goal", "shape this for /goal", "convert this to a goal prompt", "make a bootstrap prompt", or wants to hand off work to a fresh execution session. Produces a single self-contained condition that runs the work end to end; splits into checkpoints only when the user asks or an autonomous run would be unsafe.
---

# goal-prep

Turn what the user has — a plan file, a task, or session output — into one condition string they paste after `/goal` in a fresh session. That's the whole job: a prompt-refinement step, not a planning step. The output is the condition itself, ready for the copy button — nothing wrapped around it.

## What `/goal` needs

- The condition is **both** the opening directive (it starts the first turn) **and** the success test a small fast model checks after every turn.
- It can be up to **4,000 characters** — that budget is the condition (the fenced block), not your surrounding message. Stay well under it; if it creeps up, cut ceremony, not substance.
- The evaluator reads only the **conversation transcript** — it runs no tools. So the end state must be something Claude's own output demonstrates (a command result it pastes, a grep that returns nothing).
- The fresh session has **no memory of this conversation**. The condition must stand on its own.

## A good condition has four things

1. **A directive** — what to do, in a sentence or two. Most often "implement the plan at `<absolute path>`", with the parts enumerated inline so it reads without opening the file.
2. **A measurable end state + how to prove it** — a command that exits 0, a grep that returns nothing, a file count, a clean `git status`. Name the command and tell Claude to paste the output, so the evaluator can see it.
3. **The constraints that matter** — what must not change or happen on the way there: "don't push or open a PR", "no existing test fails", "only touch files under `src/auth*`".
4. **A turn bound** — `Stop after N turns regardless.` Always. Scale it to scope (~15 small, ~60 medium, ~150 for a long multi-part plan).

Add **escape hatches** ("Stop and ask if a test fails for an unrelated reason") and **settled decisions** ("keep only X — Y is debt") *only* when the work has a real branch point or a closed question the executor might reopen. Don't pad every goal with them — that's what makes a condition bias the work it's meant to describe.

## Default: one goal, end to end

Produce a single condition that runs the whole thing. `/goal` handles multi-step work natively, so a plan with many parts is still one goal. Don't explain or defend this — just produce it.

Split into checkpoints (the user runs one, then pastes the next) only when:

- **the user asks** — args like `phase-3`, `phases-0-to-4`, `whole`. Use the requested slicing without questioning.
- **an autonomous run is genuinely unsafe** — an irreversible step with no git rollback that a human must eyeball first (a prod schema drop, a decommission), or a wall-clock wait measured in days.

A reversible step on a fresh branch is *not* a reason to split — encode the danger as an escape hatch instead. If you do split, say so in one line with the specific reason.

## Pre-flight gate

If the condition tells the new session to "read the plan at `<path>`", that file is **load-bearing** — a fresh session (usually on a new branch) that can't open it stops early, the exact failure this skill exists to prevent. Before returning:

- Confirm the file is **committed** on a branch the new session can use, by **absolute path**.
- If it isn't committed: either commit it (**ask first**), or inline the load-bearing parts into the condition and drop the file dependency.

Resolve this before handing over the condition — it's a gate, not advice.

## Output

The condition in **one fenced code block**, paste-ready. Multi-line is fine — `/goal` accepts it. After the block, at most two short lines: the char count (`N / 4000`), and the pre-flight result if a file is load-bearing. No preamble paragraph, no notes section.

## Refuse and rewrite

- **Vague success** ("looks right", "the code is clean") → ask for the verifier command.
- **Hidden judgement** ("until it's well-designed") → name the property (a coverage threshold, a file-size limit, a type-check exit code).
- **No bound** → add a turn cap.
- **GUI-only checks** ("the dashboard renders") → require a programmatic proof (HTTP status, a saved screenshot Claude greps, an HTML snapshot diff).
- **Bare labels** ("Phase 3", "Parts A-D", "the agreed approach") → enumerate the parts inline; a cold session can't resolve them.
- **Load-bearing pointer to an uncommitted file** → clear the pre-flight gate first.

## Inputs

- `/goal-prep <path>` — read the plan from disk
- `/goal-prep <path> phase-3` | `whole` — slicing specified, use it
- inline text — operate on what's pasted
- no args — ask which plan; offer the most recent committed plan under the repo's `plans/` (`plans/YYYY-MM-DD-<slug>/plan.md`, where the hook mirrors it). That's the canonical copy a fresh session can open — not the local `~/.claude/plans/` drafts, which aren't committed and would fail the pre-flight gate.
- a **session recap** describes what happened, not what to do next — ask the user for the success criterion before drafting; don't invent one from the recap.

Before returning, confirm: a measurable end state with a check Claude can run and paste, a turn bound, absolute paths, no bare labels, the pre-flight gate cleared. If any is missing, fix it — don't ship with caveats.

## Example — implement a plan (the common case)

```
Implement the plan at /Users/me/repos/app/plans/2026-06-01-checkout-rework/plan.md — read it first; it has the file list and the new pricing schema. Work on a new branch feat/checkout-rework off main. The plan, in order: (A) add the pricing module, (B) route the cart through it, (C) delete the legacy calculator.

Done when:
- `pnpm typecheck && pnpm test` exits 0 — paste the tail of each.
- `grep -rn "legacyCalc" src/` returns nothing.

Don't push or open a PR. No existing test may fail.

Stop and ask if a test fails for a reason unrelated to this work.

Stop after 60 turns regardless.
```

## Example — one-shot task (leaner still)

```
Migrate the auth module from express-session to JWT in /Users/me/repos/api.

Done when:
- `grep -rn "express-session" src/` returns nothing.
- `pnpm test:integration && pnpm typecheck` exits 0 — paste both.

Don't alter the database schema. Only files under src/{routes,middleware,lib}/auth* and package.json may change.

Stop after 80 turns regardless.
```
