# Remediation Ticket — Template

> This template is the canonical structure for **remediation tickets** written
> by `/governance-assess` into `governance/tickets.md` under the `## Remediation
> tickets` section. One block per firm finding above GREEN that names an action
> (decisions go in the OQ-ticket template instead).
>
> The named owner must be able to act on this ticket from its body alone,
> without opening other governance docs. Source artefacts are linked at the
> bottom for depth; the body holds the decision-grade summary.

---

## Block structure

```markdown
### {★?} {☣?} {DOMAIN_PREFIX-N} — {one-line title from the finding}

**Domain:** {Privacy | Security | Legal | Workforce | Oversight}
**Owner (suggested):** {one specific role — the decider}
**Advisors:** {other roles, comma-separated; optional}
**Milestone:** {pilot date | AI Act 2026-08-02 | other dated commitment; optional}
**Closes:** {HF-N, CHF-N, comma-separated; omit if neither applies}
**Hard-fail:** {★ ☣ legend with one-line gloss; only when ★ or ☣ is set}

## Why this matters

{1–2 paragraphs lifted from the surrounding prose of the relevant
`findings-<domain>.md` finding — its regulatory citations, evidence chain,
and any prescriptive sentence the reviewer wrote. Cite Articles using the
exact citation strings that appear in the source finding; never paste an
Article number from this prompt as if it were from the source. Name the
concrete exposure if the ticket is not closed by the milestone, and call
out interactions with other tickets. No abstract risk-speak.}

## Current state

- {file:line bullet — what exists today vs what should exist. Specific paths,
  specific config values, specific schema columns. Pulled from
  `brief.md §Repo pointers per domain`, `classification.md` field-level
  sources, and any inline citations in `findings-<domain>.md`.}
- {Where multiple destinations / vendors / data categories share a property,
  render as a markdown table.}
- {…}

## Done when

- [ ] {Concrete artefact 1 — a written deliverable, code change, contract
       clause, or decision record. Phrase as "X is done", not "Implement X".
       Example: "Pino `redact` config landed in `src/lib/logger.ts` covering
       [field list]" — not "Implement PII redaction".}
- [ ] {Concrete artefact 2}
- [ ] {…}

## Decision points (resolve first)

- **OQ-B-{N}** or **OQ-C-{N}** — {one-line name of the decision the OQ
  resolves; references the OQ ticket in `## Open question tickets`. The
  `OQ-B-` prefix sources from `brief.md`; `OQ-C-` sources from
  `classification.md`.}
- {…}

## Dependencies

- **Blocked by:** {Every `OQ-B-N` / `OQ-C-N` listed under `Decision points`
  above implicitly blocks this ticket — the orchestrator does not duplicate
  the list here. Also list any *remediation* tickets that block this one
  (e.g. data classification must close before retention can be implemented),
  with a one-line "why".}
- **Blocks:** {Remediation tickets that this one unblocks when it
  completes. The orchestrator separately adds this ticket to the
  `This blocks:` list of every OQ ticket listed under `Decision points`
  above — no manual entry needed for OQ-side derivation.}
- **Co-owned with:** {ticket IDs sharing scope; resolve together}
- **Related:** {ticket IDs that touch overlapping areas without strict
  dependency}

## Source artefacts

- `governance/findings-<domain>.md` F-{N}
- `governance/classification.md` {CHF-id | DC-id | §section}
- `governance/brief.md` {OQ-{N} | §section}
- `governance/dpia-draft.md` (if Privacy)
- {Article + statute citations exactly as they appear in
  `findings-<domain>.md` / `brief.md` / `classification.md` / a policy
  slice — never paste from this prompt}
- {Repo file:line citations where applicable}
```

---

## Authoring rules

- **Owner is one role, not a committee.** Multi-role coordination goes in
  Advisors. Linear / Jira assigns one human; the ticket mirrors that.
- **`★`** marks stop-the-line items (e.g. HF-2 unexplained ADM surfaced by
  Oversight). **`☣`** marks items that close a hard-fail (HF-N or CHF-N).
  Both, one, or neither may apply. They live in the `### ` line and the
  `**Hard-fail:**` field carries the one-line gloss.
- **`{DOMAIN_PREFIX-N}`** is the plugin-internal ticket ID: `PRIV-N`,
  `SEC-N`, `LEG-N`, `WRK-N`, `OVR-N`. Monotonic within domain, no reuse.
  Domain prefixes do not change when a finding moves between reviewers — the
  ID is allocated by the orchestrator at ticket-generation time.
- **Cross-ticket references use plain text identifiers** with the
  source-prefixed form for OQ tickets: `PRIV-1`, `OQ-B-7`, `OQ-C-3`.
  Bare `OQ-N` cross-references fail the grader's check (ambiguous
  between brief and classification namespaces). No `<issue>` tags. No
  HTML wrappers. No Linear / Jira numbers — those are added by whoever
  imports tickets.md into their tracker.
- **Dependencies are derived, not asserted.** The OQ-side `Blocks` /
  `Blocked by` axis is computed by the orchestrator: every `OQ-B-N` /
  `OQ-C-N` listed under this ticket's `Decision points` implies the OQ
  ticket blocks this remediation. The orchestrator separately appends this
  ticket to the OQ's `This blocks:` list. Manual `Blocks` / `Blocked by`
  entries on remediation tickets cover only remediation→remediation
  dependencies (rarer; typically when one finding's deliverable is a
  precondition for another).
- **`Done when` items name a resulting artefact.** Each bullet identifies
  a file, a clause, a row, a test, or a decision record. "Pino `redact`
  config covering [fields] landed in `src/lib/logger.ts`; regression test
  fails if PII keys leak through" is right; "Implement PII redaction"
  fails the artefact test. Pull deliverables from whatever prescriptive
  sentence the reviewer wrote about closing the finding — the
  recommendation line(s), or the cited policy clause that names the
  required control.
- **No fictional content.** No Articles, statutes, vendors, or options that
  aren't in the source artefacts. If a finding says "consultation may be
  required in EU jurisdictions", the ticket cites that without inventing
  specific countries' statutes.
- **Lift sensitive content with care.** If the repo is public-facing,
  role-anonymise customer / vendor / contract specifics before committing.
  `tickets.md` is a committed artefact; the brief and classification it
  draws from may contain names that shouldn't ship publicly.
- **Placeholder syntax `{…}` is an orchestrator-fill slot** — the agent
  composes the body using this template's structure. The plugin also
  ships `dpia-template.md` which uses `[…]` for consumer-fill slots (a
  DPO reads and completes that file by hand). Different audiences,
  different conventions — keep them separate.
