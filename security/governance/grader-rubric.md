# Assessment Grader Rubric (v0.1)

This rubric is the **self-check** the `/governance-assess` orchestrator runs at the
end of its flow to decide whether its assessment artefact is good enough. It is
independent from the assessment rubric itself (`rubric.md`) — that one defines what
the agents look for in a use case; this one defines what makes a good assessment of
that use case.

The orchestrator walks through every required check below. If any fails, it fixes
the gap inline (re-dispatch a reviewer, rewrite an artefact, re-aggregate) before
reporting completion. There is no separate grader pass and no iteration loop —
the orchestrator is both producer and self-grader, and the work either ships or
gets fixed in the same turn.

---

## Required checks (all must pass)

### 1. Coverage
- [ ] All five domains have an explicit RAG rating: Privacy, Security, Legal,
  Workforce, Oversight.
- [ ] Each domain has at least three specific findings (a "finding" is a sentence
  identifying a concern, observation, or confirmation tied to a question in the
  rubric).
- [ ] No domain section is empty or skipped with "not applicable" — if a domain
  is genuinely irrelevant, the rating is GREEN and the rationale must say why.

### 2. Hard-fails
- [ ] HF-1 (children's data): explicitly yes/no with reasoning.
- [ ] HF-2 (unexplained automated decisions): explicitly yes/no with reasoning.
- [ ] HF-3 (unsafe cross-border transfer): explicitly yes/no with reasoning.
- [ ] If any hard-fail is `yes`, overall RAG is RED and the trigger is named in
  the summary section.

### 3. Aggregation correctness
- [ ] Overall RAG is the strictest of the five domain RAGs (when no hard-fail
  fired) OR is RED with a named hard-fail.
- [ ] The aggregation step is shown (per-domain ratings → strictest → final).

### 4. Evidence
- [ ] Every finding cites at least one of: a policy clause path, a target-repo
  path, or a named regulation/standard.
- [ ] Findings citing the target repo include a file path and, where possible, a
  line range.

### 5. Outputs on disk
- [ ] `governance/assessment.md` exists with the narrative report.
- [ ] `governance/rag.json` exists and is valid JSON containing:
  `overall`, `domains` (the five), `hard_fails`, `hard_fails_detail`,
  `classification_hard_fails_yes`, `ai_act_risk_tier`, `ai_act_obligations_due`.
- [ ] Five `governance/findings-<domain>.md` files exist, one per reviewer
  subagent (privacy, security, legal, workforce, oversight).
- [ ] If overall is AMBER or RED, `governance/tickets.md` exists with two
  top-level sections in this order: `## Remediation tickets` (one block per
  firm finding above GREEN that names an action) and `## Open question
  tickets` (one block per unresolved `OQ-N` surfaced as AMBER-pending).
- [ ] Each remediation ticket has the required header block (Domain +
  Owner (single role)) plus all six `##` body sections from
  `governance/templates/remediation-ticket-template.md`:
  `## Why this matters`; `## Current state`; `## Done when`;
  `## Decision points (resolve first)`; `## Dependencies`;
  `## Source artefacts`. The header may also carry `Advisors`,
  `Milestone`, `Closes` (HF-N / CHF-N), and `Hard-fail` (★ ☣ legend) —
  these are conditional and only fail the check if they appear without
  matching a real signal (e.g. `Closes: HF-1` when no HF-1 fired).
- [ ] Each OQ ticket has the required header block (Source + Decider
  (single role) + Decision deadline) plus all eight `##` body sections
  from `governance/templates/oq-ticket-template.md`:
  `## The question`; `## Why we need to answer`; `## Current state`;
  `## Options`; `## Decision criteria`; `## What "decided" looks like`;
  `## Dependencies + downstream`; `## References`. The header may also
  carry `Advisors` and `Affects`; these are conditional (an OQ that
  blocks nothing has `Affects:` empty).
- [ ] OQ ticket IDs follow the `OQ-B-N` / `OQ-C-N` prefix convention
  (`OQ-B-` from `brief.md`, `OQ-C-` from `classification.md`). Bare
  `OQ-N` cross-references fail — ambiguous between brief and
  classification namespaces.
- [ ] `## Done when` and `## What "decided" looks like` checklists name
  a **resulting artefact** per bullet (a file, clause, row, test,
  decision record, or CHF / HF flip). Bullets that fail the artefact
  test (typically those starting with a bare verb — `Implement`,
  `Document`, `Build`, `Decide` — without naming what gets produced)
  fail the check.
- [ ] **Citation-existence grep.** For every Article / statute / vendor-
  name citation in any ticket body, the exact citation string appears
  somewhere in `findings-<domain>.md`, `brief.md`, `classification.md`,
  or a `governance/policies/` slice. Self-attestation is not enough —
  the grader performs the literal-substring check. Missing → finding
  fails; rewrite or drop the citation.
- [ ] Every `## Options` entry traces to source material (a finding, a
  policy slice, the rubric, or the regulation text). Single-option
  tickets carry `**Recommendation:**` with a citation; padded
  alternatives without source support fail the check.
- [ ] Cross-ticket references in `tickets.md` are plain-text identifiers
  (`PRIV-1`, `OQ-B-7`, `OQ-C-3`). No `<issue>` tags, no HTML wrappers,
  no Linear / Jira numbers.
- [ ] **Dependencies are derived, not asserted.** The grader walks every
  remediation ticket's `## Decision points (resolve first)` list,
  builds the implied OQ→remediation blocking map, and confirms each OQ
  ticket's `This blocks:` list matches the derived set exactly.
  Mismatch → re-derive in one pass; do not edit the OQ list manually.
- [ ] Owner (remediation) and Decider (OQ) name a **single role**, not a
  list. Multi-role coordination lives under `**Advisors:**`.
- [ ] If Privacy is AMBER or RED, `governance/dpia-draft.md` exists,
  populated from the plugin's `governance/templates/dpia-template.md`.

### 6. Internal consistency
- [ ] Per-domain RAG ratings agree with the findings in the body (e.g. a domain
  rated GREEN must not contain findings phrased as concerns).
- [ ] The summary section reflects the overall RAG and surfaces the most material
  concerns first.

---

## Optional checks (nice to have, not blocking)

- [ ] Reviewer notes call out genuine ambiguity rather than papering over it.
- [ ] Suggested next steps are concrete enough to action without further
  clarification.
- [ ] When `ai_act_risk_tier: high`, the 2026-08-02 enforcement deadline is
  surfaced prominently in the summary, not buried in the Legal section.

---

## When to abort

If the use-case description is empty, or describes something that is not an AI
system at all, stop and tell the user — do not produce an assessment in those
cases. This is a pre-flight check, distinct from the AMBER/RED ratings that come
out of a normal assessment.
