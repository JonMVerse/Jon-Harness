---
name: delivery-reality-check
description: >
  Stress-test a delivery timeline against real Linear data, then compile the resulting plan
  into an agent-executable Linear board. Trigger whenever someone asks if a timeline is
  realistic ("is 2 weeks realistic?", "can we ship by the 21st?", "dev complete by end of
  August"),
  asks to plan or milestone a workstream week-by-week, asks how two projects' timelines
  interact or align, wants resourcing scenarios ("what if I add a junior?", "who can we
  repurpose?"), or wants a plan converted into tickets agents can build from. Also trigger
  on "timeline these side by side", "break it into lanes", or "make these tickets agent
  ready". NOT for retrospective metrics/analytics dashboards (velocity charts, carry-over
  tracking) — that is linear-em-dashboard; this skill is forward-looking planning.
  Requires the Linear MCP; degrades to advisory-only if Linear tools are absent.
---

# Delivery Reality Check

Turn a proposed timeline into an evidence-based verdict, a sequenced plan, and — on request —
a Linear board structured so the `/linear-build` command and the executor agent tier can
drive delivery from it.

This is a **main-thread skill**: the planning phases are conversational and depend on the
user's judgment calls. Do not delegate phases 1–5 to subagents; they lose the conversation.

## Phase 1 — Ground in real data, never the ask

Resolve the people and projects named in Linear before answering anything:

- Pull the project(s): open issues, estimates, milestones + progress %, project target dates,
  and the current cycle's assignments for every person named.
- Sum estimated points; count unestimated tickets separately and treat them as risk, not zero.
- **Sizing scale**: XS = 0.5 day, S = 1 day, M = up to 3 days. Convert existing point
  estimates onto this scale when computing capacity (state the mapping used). Anything that
  won't fit in an M is not one ticket — flag it for splitting.
- Check the assignee's *other* commitments in the current cycle — nobody is 100% dedicated
  until proven otherwise.
- Compute all durations from the current session date. Never hardcode "today".

If the Linear MCP is unavailable, say so, answer from whatever the user provides, and label
every number as unverified.

## Phase 2 — Map dependencies both ways

- **Hard dependencies**: milestones marked dependent on other projects, `blockedBy` relations,
  external API changes.
- **Pattern dependencies**: work that copies a pattern someone else is still building (not a
  blocker, but a reason to sequence and to involve that person in review).
- **Duplicated scope**: work repeated across two systems as a hedge (e.g. legacy + new
  architecture) — name the hedge explicitly, because cutting it is usually the biggest lever
  and the biggest new risk.

## Phase 3 — Verdict with a defensible slice

Never answer just "no". State:

1. The multiple by which the ask is off (points ÷ realistic capacity).
2. What **does** fit the window — a coherent, demo-able slice, not a percentage.
3. The project's own target date, as evidence of how the team already sized it.

## Phase 4 — Scenario levers, in this order

Work the levers with the user; each has a cost that must be stated alongside the gain:

1. **Scope cut** — what's removed, what risk it converts from soft to hard (e.g. removing a
   legacy fallback makes a dependency load-bearing).
2. **Parallelisation** — what is genuinely gated vs. free; distinguish "gated on go-live"
   from "gated on the code existing" (dev-complete rarely needs production).
3. **Resourcing** — who frees up when, ramp-up cost, and the **escape valve**: pre-agree who
   gets pulled back where if their home lane wobbles. Juniors: keep them off the critical
   path, budget ~15% of the senior's week for review.
4. **Redefinition** — what "done" means: dev-complete vs shipped, shadow vs visible,
   launch scope vs fast-follow.

## Phase 5 — Outputs, escalating on request

Produce the lightest artefact that answers the question; escalate only when asked:

1. Lane-based timeline visual (one lane per person/track; dashed = gated; mark today,
   the goal date, and quarter end).
2. Week-by-week milestone table — one row per week, one column per lane, plus a
   **"capability delivered"** column phrased as what the system can do at week's end.
   That column is the stakeholder-update spine.
3. Saved markdown plan (include checkpoints, deferred scope, and an explicit
   **Assumptions** section: points≈effort mapping, dedication %, whose sizing is inherited).
4. Compiled Linear board — phase 7.

## Phase 6 — Cross-check the non-engineering gates

Before presenting any go-live date:

- **Compliance — screen first, escalate only if indicated.** Ask what is actually being
  built: does it process personal data, use AI on data about people, introduce a new
  vendor, or change who can access what? If none apply, note that and move on — no
  rabbit hole. If any apply, check for an existing PAVE-level assessment for the
  workstream (search Slack/Drive if connected); run or request one if absent. (PAVE is
  Multiverse's privacy screening; outside Multiverse, substitute your organisation's
  screening process.) Only a
  PAVE outcome that indicates deeper review (e.g. a RED verdict) escalates to a DPIA —
  and at that point it becomes a go-live gate equal to any infra dependency. One trap
  worth naming when it applies: shadow/dark traffic that processes real user data is in
  scope of privacy review even with no user-facing exposure.
- **Date drift**: compare dates in planning docs/PAVEs against Linear targets. Name any
  divergence explicitly; someone upstream is holding a stale expectation.
- **Missing tickets**: work the plan implies but the board lacks (e.g. a shadow-mirroring
  mechanism, retention jobs). Offer to create them — written to the agent-ready standard.

## Phase 7 — Compile the plan into the board (on request)

The plan is scaffolding; the board is the deliverable. When the user wants agents (or a
team) to drive delivery:

1. **Milestones**: create dated Linear milestones matching the weekly plan.
2. **Dependencies**: every sequencing fact becomes a real `blockedBy` relation. A dependency
   that lives only in prose does not exist to an agent walking the graph.
3. **Ticket rewrite**: bring every ticket in the plan up to the agent-ready standard in
   [references/agent-ready-ticket.md](references/agent-ready-ticket.md). Draft rewrites for
   the user to approve; batch by project.
   **Estimate every ticket** on the XS/S/M scale (XS = 0.5 day, S = 1 day, M = up to
   3 days) and set the estimate in Linear. Split anything bigger than M into M-or-smaller
   tickets with `blockedBy` chaining — oversized tickets are where agent runs and human
   reviews both go to die.
4. **Triage lane**: ensure the routing labels exist on the team (create if missing), then
   propose a label per ticket and **apply on the user's approval** (labels are the routing
   authority for what agents may touch — never applied silently): `agent:mech` (fully
   specified, pattern-following),
   `agent:judgment` (needs local design decisions), or `human` (architecture-shaping,
   creates the pattern others follow, or touches a human-gate area — auth, personal data,
   spend, destructive migrations).
5. **Readiness report**: "X of Y tickets agent-ready" is part of the feasibility verdict —
   un-agentic tickets are a timeline risk (they cost senior clarification loops).

Hand off: tell the user the board is compiled and `/linear-build` can start executing it.

## Guardrails

- State assumptions in every output; never silently inherit someone else's sizing.
- Inferred dates are not commitments — say "nobody has agreed to this calendar" when the
  dates came from your arithmetic rather than the team.
- Every borrowed person gets an escape valve named in the same breath as the gain.
- Review capacity, not build capacity, is the bottleneck of agent-driven delivery — budget
  the humans' review time explicitly when triaging tickets to agents.
