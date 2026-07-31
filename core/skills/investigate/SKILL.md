---
name: investigate
description: "Discovery stage — fan out cheap read-only workers to map an unfamiliar area of the codebase before planning or building, then consolidate into a verified Findings Brief. Use when the user says 'investigate', 'look into', 'explore the codebase for', 'find out how X works before we change it', 'research this bug', 'scope this feature', or otherwise wants the ground mapped before committing to an approach. The first stage of the Investigate → Plan → Build lifecycle."
---

# Investigate

Map an unfamiliar area cheaply and in parallel, then hand a **verified
Findings Brief** to the `plan` stage. You are the orchestrator: you stay on
the session's smart model, decompose the question, and fan the actual
discovery out to cheap `scout` workers (haiku). Breadth comes from
running many shallow workers at once; depth, when a single thread genuinely
needs it, comes from `code-explorer`.

Announce at start: "Investigating — scoping questions and fanning out."

## Step 1: Decompose

Break the request into **3–7 independent, non-overlapping questions** a
worker can each answer alone. Good decompositions cut along natural seams:

- entry points (APIs, CLI, UI components, routes),
- data flow and storage,
- the existing patterns/abstractions a change would follow,
- tests and how the area is exercised,
- configuration, feature flags, and cross-cutting concerns (auth, logging).

Two guards:

- **Non-overlapping.** If two questions would read the same files to answer
  the same thing, merge them — never dispatch two workers onto one
  question, their work collides and you pay twice.
- **Depth exception.** If the request is really *one* deep trace through
  many layers ("how does a checkout flow end to end"), a fan-out of shallow
  workers is the wrong tool — dispatch a single `code-explorer` instead and
  skip to Step 3.

## Step 2: Fan out

Dispatch **one `scout` per question, all in a single message** so
they run in parallel. Give each a self-contained brief — the worker starts
from a blank context and sees only what you write:

- the **one question**, stated sharply,
- **why it matters** (one line — what decision it feeds),
- **starting points**: paths, symbols, or search terms you already know,
- **what "answered" looks like** so it knows when to stop.

Keep workers cheap: haiku at breadth is the point. Escalate a question to
`code-explorer` (sonnet) only when the first pass shows it needs real
depth — don't default to it.

## Step 3: Consolidate and verify

Workers return cited blocks. Merge them, and **spot-check the load-bearing
claims yourself** — the ones the plan will rest on. Open a couple of the
cited `path:line` references with Read/Grep and confirm them. A haiku worker
is fast but fallible; a wrong `path:line` that reaches the plan becomes a
wrong step in the build. Mark anything you could not confirm as
**unverified** rather than dropping or trusting it.

## Step 4: Findings Brief

Produce the **investigate → plan contract** — an in-conversation markdown
block, not a file (keeping this stage fully read-only). The `plan` stage
reads it directly; `plan` is what persists a condensed copy into `plan.md`.

```
## Findings Brief — <topic>

**Scope & questions asked**
- <the questions you fanned out>

**Verified findings**
- <finding, `path:line`> — <detail> (confidence: high/med/low)

**Architecture notes**
- <how the relevant pieces connect>

**Risks & unknowns**
- <what's unclear, unverified, or dangerous>

**Candidate approaches**
1. <approach> — <one-line trade-off>
   (1–3 options, not a decision — that's the plan's job)

**Critical files**
- `path` — <why it matters> (3–7 files)
```

## Heavy mode (optional, if dynamic workflows are available)

If the area is large and this session has **dynamic workflows (ultracode)**
available, offer to run the investigation as a workflow instead: fan out N
`scout` agents, add an **adversarial verifier pass** that re-checks
each finding against the tree, and synthesise to the same Findings Brief
contract above. This buys scale and cross-checking. The static fan-out in
Steps 2–3 is the portable default and needs no such feature — don't require
it.

## Rules

- **Fully read-only.** This stage discovers; it never edits code or writes
  files. The brief lives in the conversation.
- **Cost discipline.** Haiku `scout` workers for breadth; escalate to
  `code-explorer` only where depth genuinely demands it. The smart model
  orchestrates and verifies — it doesn't do the grunt searching itself.
- **Verify what's load-bearing.** Don't pass an unchecked `path:line` into
  the plan.
- **Honest unknowns.** A clearly-flagged gap is worth more than a confident
  guess.
- **Next stage:** when the brief is ready, suggest running the `plan` skill
  to turn it into a formal plan. Suggest — never auto-invoke.
