---
description: drive delivery from an agent-ready Linear board — stage each plan, verify it with an LLM-as-judge panel (security · scope/design · risk) looping until it passes, get explicit human approval, then build (executor + verifier + a judge on the final diff, non-vacuous unit→e2e tests, stack standards enforced), ask explicit permission before pushing a PR, and teach the reasoning as you go (verbose + Socratic)
---

Drive delivery from a Linear project whose board was compiled by the `delivery-reality-check`
skill (or any board meeting the agent-ready standard). You are the orchestrator: agents build,
you route, gate, and report — and **a human approves every plan and every PR**. But approval
is earned, not asked: every plan is first put through an **LLM-as-judge panel** (security,
scope/design, risk & verification) and rewritten until it passes; only then does the human
green-light it, and again — explicitly — before any push. The agent never green-lights itself,
holds the change to the **stack's standards** (language, framework, skills) with
**non-vacuous tests from unit to e2e**, and keeps the human learning by explaining every
decision as it goes (verbose + Socratic). Requires the Linear MCP.

Usage: `/linear-build <project name or ID> [--batch N] [--dry-run] [--allow-soft-deps]`

`--dry-run`: execute setup and the pick/lint/size/plan stages as a report only — show what
would be labelled, fixed, sized, and dispatched, with proposed plans — but write nothing to
Linear, dispatch no executors, and push no PRs.

`--allow-soft-deps`: opt in to treating blockers that are in review with a PR pushed as
satisfied (see Pick). Default is off: dependency chains pause at review boundaries and the
human merge re-arms them. Only sensible for a solo maintainer who reviews quickly and
accepts stacked-PR rebasing.

## Adversarial stance (applies at every stage)

At each decision point, actively argue against your own default before committing: is this
the right ticket to do next, the right approach, the right scope? Name the strongest
alternative and why it loses. A choice you cannot defend against its best alternative is not
ready to execute. This applies to ticket selection, implementation planning, verification,
and PR review alike.

Corollary for every human decision point: **never ask for a bare approval**. Each request
for a green light states the risk of each available choice — what can go wrong if we
proceed, what it costs if we don't, and the blast radius either way. The human decides;
the agent's job is to make the decision informed.

Corollary — **verbose in-flight reporting**: the human is supervising, not just gating. At
every decision surface report, in full (not terse): the decision made, its rationale, the
alternatives weighed, and the downstream implications — what it enables, blocks, or puts at
risk. Loop bookkeeping can be terse; **decisions get the long form**.

Corollary — **Socratic throughout**: the run is also a learning journey for the human. Don't
merely announce decisions — teach the reasoning. Frame the trade-offs as questions the human
can engage with, name the principle each move applies (why file-disjoint batching, why a
non-vacuous test, why the plan panel caught a given flaw), and let them build the judgment
rather than just click approve. Explain, don't just execute.

Corollary — **standards are non-negotiable**: hold the change to the standards of the
language, framework, and skills in play (e.g. `typescript-standards` for TS, `a11y-audit`
for accessible UI, the repo's own conventions/lint/format gates). Both the executor and the
judges enforce them; a diff that violates the stack's standards is not done, however green
its behaviour.

## Setup (once per run)

1. Resolve the project and its team.
2. **Ensure routing labels exist on the team** — `agent:mech`, `agent:judgment`, `human` —
   creating any that are missing.
3. **Apply labels**: for tickets in the project that lack a routing label, propose one from
   the lint (below), show the user the proposed labelling as a table, and apply on approval.

## Loop

Repeat until no eligible tickets remain (default one ticket at a time; `--batch N` runs up to
N *independent* tickets in parallel — never two tickets that share a `blockedBy` chain or
touch the same files; establishing file overlap requires a scout pass across the candidate
set *before* batch selection, since per-ticket scouting happens later):

1. **Pick.** List the project's unstarted tickets whose blockers are all completed/canceled.
   Chains therefore pause at review boundaries — the agent never merges, so a ticket whose
   blocker sits in review is *not* eligible; the human merge is what re-arms the chain. This
   is deliberate: it paces the loop to real review throughput, keeps every PR cut against
   main, and avoids stacked-PR rebase cascades. When a chain pauses, move to independent
   tickets elsewhere on the board; if everything eligible is exhausted, stop and report
   what's waiting on merges.
   With `--allow-soft-deps`, a blocker in review with a PR pushed counts as satisfied
   (**soft dependency**) — the softness must be named in the plan proposal and the PR
   description, the new branch is cut from the upstream PR's branch (stacked), and an
   upstream rebase triggers re-verification downstream.
   Also surface **stalled** tickets: in-progress with no open PR (an interrupted or
   twice-refuted earlier run) — re-lint and propose re-dispatch, or return them to unstarted
   with a comment explaining why.
   Also surface **stalled** tickets: in-progress with no open PR (an interrupted or
   twice-refuted earlier run) — re-lint and propose re-dispatch, or return them to unstarted
   with a comment explaining why.
   Order by milestone date, then priority. Adversarial check: would a different ticket
   unblock more downstream work or retire more risk? Say so if yes. Skip tickets labelled
   `human` — surface them to the user as "awaiting human" instead.

2. **Lint.** Check the ticket against the agent-ready standard in
   `../skills/delivery-reality-check/references/agent-ready-ticket.md`.
   - READY → continue.
   - FIXABLE → draft the fix, show the user, update the ticket on approval, then continue.
   - BLOCKED → report what's missing and who owns the decision; move on to the next ticket.

   **Sizing**: if a ticket is otherwise ready but unsized (or its size predates a scope
   change), propose an estimate on the XS/S/M scale (XS = 0.5 day, S = 1 day, M = up to
   3 days) with one line of reasoning — grounded in the entry points and to-do list, and
   calibrated against comparable sized tickets on the same team. Adversarial check: state
   what would make it the next size up. Apply to Linear on the user's approval, batching
   sizing proposals with any FIXABLE fixes so approval is one pass, not many. Bigger than
   M → propose the split instead of a size.

3. **Widen the lens.** A ticket is not an island. Before planning, check: which other tickets
   or projects touch the same files, contracts, or user journeys; what product behaviour
   changes (not just what code changes); whether the change constrains a decision another
   team hasn't made yet. Use a scout pass for file-level overlap. Product vs tech tension —
   e.g. "fastest implementation" vs "the UX the roadmap implies" — is surfaced to the human,
   never resolved silently by the agent.

4. **Gate.** Regardless of labels, if the diff will plausibly touch authentication, personal
   or learner data, spend-bearing integrations, or destructive migrations — stop and get an
   explicit go-ahead from the user before dispatching. The go-ahead request must explain
   the risk, concretely: which sensitive surface is touched and how, the worst plausible
   outcome (data exposed, spend runaway, irreversible loss), what mitigates it, and whether
   the change is reversible. If the project has an open privacy or
   compliance action — screening-level check or full assessment — tickets in its scope are
   human-gated until the user says otherwise. Don't demand an assessment that isn't
   indicated: gating applies only when one exists or the ticket's data footprint plainly
   calls for one. If the user declines the go-ahead, relabel the ticket `human` with a
   comment recording the refusal — otherwise the pick step re-selects it every iteration.

5. **Stage the plan.** For every agent-bound ticket, produce a short implementation outline —
   no code yet, and **not shown for approval yet**; it is a draft to be adversarially judged
   (step 6) first:
   - **Approach**: what will be built, entry points, contract honoured, and the
     **language/framework standards and skills** the change must honour (e.g.
     `typescript-standards`, `a11y-audit`, the repo's conventions doc for the stack in play).
   - **Alternatives considered**: at least one credible alternative and why it was rejected
     (the adversarial case, not a strawman).
   - **Wider impact**: product-facing changes, affected tickets/teams, dependency
     implications from step 3.
   - **Risks**: what could go wrong with the chosen approach, its blast radius, and the
     rollback path — plus the risk of *not* doing the ticket now (what it blocks or lets rot).
   - **Verification**: exactly how done will be proven — a **test ladder from unit →
     integration → e2e** as the change warrants, every assertion **non-vacuous** (it must go
     red if the behaviour regresses; name what each test would catch), run through the
     **repo's own gates**, not a stubbed proxy. A layer the change touches but doesn't test
     is a gap, not a pass.

6. **Judge the plan — LLM-as-judge panel, loop until it passes.** Before any human green
   light, fan out **three independent judge subagents in parallel**, each grounded in the
   actual code (read-only) and adversarial by design, each returning a verdict
   **SOUND / AMEND / REJECT** with concrete file:line findings:
   - **security** — auth/authz, personal-or-learner-data exposure, secrets, injection, spend,
     destructive/irreversible surfaces the plan would touch.
   - **scope & design** — is the ticket one reviewable unit; is the approach the right design;
     couple/split; bounded vs open-ended; product/design decisions the plan resolves silently;
     collisions with other tickets.
   - **risk & verification** — does the stated verification actually PROVE the AC (not
     vacuously — e.g. jsdom can't assert CSS/contrast/media-queries; a class-string check
     proves no behaviour); blast radius into shared surfaces; collisions with open PRs on the
     same files; rollback cleanliness; missing test cases.
   Consolidate the verdicts. If any judge returns **AMEND or REJECT, rewrite the plan against
   the findings and re-run the panel** — repeat until all three return SOUND, or a finding is
   explicitly and defensibly **waived with the reason recorded**. A plan is not presentable
   until it has survived the panel. Fold durable findings into the ticket so the brief stays
   the source of truth. (Under `--dry-run`, run the panel and report the verdicts + the plan
   that would be presented, but stop before step 7.)

7. **Human green light on the verified plan — required.** Present the plan *that passed the
   panel*, including the judges' residual notes and any waived findings, with the
   risk-of-each-choice framing (never a bare approval). Wait for **explicit** approval — no
   dispatch without it. The human may still amend; an amendment that changes approach, scope,
   or risk **re-enters the panel (step 6)** before dispatch.

8. **Dispatch.** Compile the approved, panel-verified plan + ticket into a one-shot brief
   (goal, constraints, done-criteria, the why, entry points, contract links, **the
   language/framework standards and skills the plan named** — the executor must follow them
   and invoke the relevant standards skill, e.g. `typescript-standards` for TS, `a11y-audit`
   for accessible UI, **and build the non-vacuous unit→e2e test ladder from the plan's
   Verification**). Route by label:
   - `agent:mech` → mech-executor. Escalate to executor after two failed attempts (a
     REFUTED verdict counts as a failed attempt).
   - `agent:judgment` → executor, preceded by a scout pass if the brief lacks file-level
     grounding.
   Parallel work is **worktree-isolated** and file-disjoint per the batch rule. Move the
   ticket to its in-progress state and note the dispatch + approved plan in a ticket comment.

9. **Verify (build cycle).** All non-trivial output gets a verifier pass — fresh context,
   adversarial by design: it tries to REFUTE the done-claim using the ticket's Verification
   section. It confirms the tests are **non-vacuous** (each goes red on a revert of the
   change) and that coverage spans the levels the diff touches — **unit through e2e**, not
   only the cheapest layer; a vacuous or single-layer proof is itself a REFUTE. REFUTED →
   back to the executor with the evidence; two refutations on the same ticket (regardless of
   executor tier) → return the ticket to unstarted with a comment explaining the failure,
   then stop and surface to the user.

10. **Judge the final output — LLM-as-judge on the diff.** The build-cycle counterpart of the
    plan panel: fan out `code-reviewer`, `security-reviewer`, and `tech-debt-reviewer` in
    parallel over the built diff (as `/review` does) and consolidate by severity. Blocking
    findings go back to the executor; re-verify after fixes. Two review rounds with blocking
    findings still standing → same treatment as double refutation: ticket back to unstarted
    with the evidence, stop, and surface to the user. Only a diff that has survived **both**
    the verifier (step 9) and this output-judge proceeds.

11. **Settle, then ask explicit permission to push.** Only once the diff has settled — the
    verifier (9) and the output-judge (10) both clean — **request the human's explicit
    permission to push the PR**: a distinct green light from the plan approval, naming what
    will be pushed and to where. **Never auto-push.** On that explicit go, commit and open the
    PR per the host repo's workflow (`/commit`), with a description containing: the approved
    (panel-verified) plan,
    what changed, verification evidence, the output-judge findings (including accepted
    non-blocking ones), and the wider-impact notes from step 3. Request review from the
    ticket's human owner (or the user if unset). **The agent never merges** — merge is a
    human act.

12. **Report back.** Write a ticket comment with the PR link, verification evidence, and
    review summary; move the ticket to its review state (not done — done follows the human
    merge). Newly unblocked tickets become eligible next iteration.

## Stop conditions

Stop the loop and hand back to the user when: every remaining chain is paused at a review
boundary awaiting a human merge; a human-gated ticket is the only eligible work;
a plan is waiting on green light with nothing else independent to progress; a contract a
ticket depends on is missing; two consecutive tickets end BLOCKED or REFUTED; or the
milestone the tickets belong to has passed its date (re-plan beats silent slippage — suggest
re-running `delivery-reality-check`).

## End of run

Summarise: tickets with PRs awaiting human review, tickets awaiting plan approval, tickets
awaiting humans and why, tickets blocked and on what, and the board's remaining critical
path. Offer to draft a project status update in Linear from that summary.
