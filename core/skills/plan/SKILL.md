---
name: plan
description: "Planning stage — synthesise a formal implementation plan from a Findings Brief or session context, at high reasoning effort. Complements Claude Code's native plan mode and the harness plan lifecycle; it never bypasses them. Use when the user says 'plan this', 'make a plan', 'write an implementation plan', 'turn the findings into a plan', or 'plan the work before we build'. The second stage of the Investigate → Plan → Build lifecycle. (For the status of existing plans, that's `/plan-status`, not this.)"
effort: high
---

# Plan

Turn understanding into a formal, executable plan — the artefact the
execution stage runs against. This is the reasoning-heavy stage of the lifecycle (it
runs at high effort), so spend the thinking here: on sequencing, on the
seams between steps, on what could go wrong.

This skill **complements native plan mode** — it does not replace it. Claude
Code's plan mode gives you the approval gate and the `opusplan` model
upgrade; the harness's `rename-plan` hook already turns a plan file into a
tracked `plans/YYYY-MM-DD-<slug>/plan.md` with a `worklog.md`. Your job is to
author *good plan content* through that existing machinery, not to build new
plumbing.

Announce at start: "Planning — synthesising at high effort."

## Step 1: Gather

Pull together what you're planning from:

- the **Findings Brief** from a preceding `investigate` run, if present in
  the conversation — that's the ideal input;
- the session's own context (a bug just diagnosed, a feature just discussed).

If the area is genuinely unexplored and you'd be guessing at files and flows,
**suggest running the `investigate` skill first** rather than writing a plan
on assumptions. A plan built on a wrong mental model is worse than no plan.

## Step 2: Author through the existing lifecycle

Where you write the plan depends on whether plan mode is active. Both paths
land in the same tracked location via the `rename-plan` hook — **never write
directly into a dated `plans/YYYY-MM-DD-<slug>/` folder yourself.**

- **In native plan mode** → author the plan into the plan-mode file as
  normal. On save, the hook mirrors `~/.claude/plans/<slug>.md` into
  `plans/YYYY-MM-DD-<slug>/plan.md` and creates `worklog.md` alongside it.
- **Outside plan mode** → write the draft to `plans/.tmp/<slug>.md`. The same
  hook organises it into the dated folder + worklog.

**Model pairing.** Mention `opusplan` as the zero-config way to get this
lifecycle's tiering for free: it runs Opus during plan mode for the reasoning
here, then switches to Sonnet for execution. Teams that don't set it still
get the tiering explicitly by dispatching each step to the executor tier
(`mech-executor` for mechanical steps, `executor` for steps needing judgment).

## Step 3: Plan structure

Write the plan so a cheaper executor-tier worker can execute any single step
from its text alone. Execution hands each step to a `mech-executor`/`executor`
that sees only the brief you enable here — so every step must be self-contained.

```
# <title>

## Context
<condensed Findings Brief — the problem, the verified findings, the chosen
approach and why. This persists the investigation into the tracked artefact.>

## Steps
1. <what to do> — files: `path`, `path` — done when: <verifiable criterion>
   [workstream: A]
2. ...
   (each step: the change, the files it touches, a done-when/verify
    criterion, and a [workstream: X] marker so build can parallelise
    steps with disjoint file sets safely)

## Risks & open questions
- <what might go wrong; anything still unresolved>

## Out of scope
- <what this deliberately does not do>
```

The `[workstream: X]` markers matter: execution parallelises workstreams with
non-overlapping files and runs overlapping ones in sequence (this is exactly how
`/linear-build` sequences its dispatch). Steps that touch the same file belong to
the same workstream.

## Step 4: Re-planning

When a plan needs to change mid-flight, follow the harness's existing
re-planning rules — don't invent a parallel process and don't spawn a second
plan file: edit `plan.md` in place, log a `RE-PLAN` row in the worklog, and
keep a `## Revision Log`. (Those rules live in the harness-core README's
Plan Lifecycle section; point at them rather than restating them.)

## Heavy mode (optional, if dynamic workflows are available)

For a high-stakes or wide-ranging plan, and when **dynamic workflows
(ultracode)** are available, draft the plan from a couple of independent
angles, run an **adversarial critique pass** (feasibility, missing steps,
hidden coupling between steps, wrong sequencing), then revise from the
strongest draft. The single-pass authoring above is the default.

## Rules

- **Complement, don't bypass.** When plan mode is active, work through it —
  keep its approval gate and `opusplan` upgrade.
- **Every step self-contained.** If a step can't be handed to a worker
  without the worker re-reading half the codebase, split or enrich it.
- **British English** in the plan prose.
- **Next stage:** once the plan is written and tracked, suggest executing it —
  dispatch each step to the executor tier (`mech-executor`/`executor`), or drive
  it via `/linear-build` when the work is tracked on a Linear board. Suggest —
  never auto-invoke.
