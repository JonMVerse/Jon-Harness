# Open Question Ticket — Template

> This template is the canonical structure for **decision tickets** written
> by `/governance-assess` into `governance/tickets.md` under the `## Open
> question tickets` section. One block per unresolved `OQ-N` from `brief.md`
> or `classification.md` that the assessment surfaced as an AMBER-pending
> finding.
>
> A decision ticket is a question that needs an owner, an answer, and an
> artefact. The named decider must be able to choose from the body alone,
> without opening other governance docs. Options must be grounded in source
> material; no fabricated alternatives.

---

## Block structure

```markdown
### OQ-B-{N} or OQ-C-{N} — {one-line decision name}

**Source:** {brief.md OQ-{N} → ticket ID `OQ-B-{N}`; or classification.md
            OQ-{N} → ticket ID `OQ-C-{N}`. The orchestrator prefixes the
            source-schema `OQ-N` here so cross-references stay unambiguous
            — brief and classification each carry their own `OQ-N`
            namespace in the frontmatter.}
**Decider:** {one specific role}
**Advisors:** {comma-separated roles}
**Decision deadline:** {pilot YYYY-MM-DD | AI Act 2026-08-02 | other dated
                       milestone}
**Affects:** {CHFs / HFs this resolves; remediation ticket IDs it unblocks}

## The question

{Concrete 2–4 sentence question quoted verbatim from the source OQ. Where the
source asks several things, break into numbered sub-decisions sharing one
decider.}

## Why we need to answer

- **Regulatory hook:** {specific Article(s); what happens if unresolved}
- **Operational hook:** {what's blocked; what's at risk}
- **What "unanswered" means in practice:** {for the pilot / deadline /
  customer commitment}

## Current state

- {file:line evidence — what's in the codebase / DPA stack / config today.
  Pulled from `brief.md §Repo pointers per domain`, `classification.md`
  field-level sources, and any inline citations in
  `findings-<domain>.md`.}
- {Tables where comparing multiple destinations / vendors / data categories
  helps the decider see the field at once.}

## Options

A) **{Option name}** — {short description}
   - Pros: {…}
   - Cons: {…}
   - Cost / effort: {hours | days | weeks}
   - Reversibility: {low | medium | high}

B) **{Option name}** — {…}

C) **{Option name}** — {…}

{If the source materials clearly favour one option, surface as
`**Recommendation:**` with a citation to the relevant
`findings-<domain>.md` finding or policy slice. Single-option tickets are
normal — pad only when the source materials actually support multiple
viable paths. Never fabricate alternatives the source doesn't support.}

## Decision criteria

What should drive the choice:

- {Factor 1 — e.g. pilot timing}
- {Factor 2 — e.g. customer geography}
- {Factor 3 — e.g. engineering cost / regulatory exposure}

## What "decided" looks like

- [ ] {Concrete artefact 1 — written decision record, code change, contract
       clause}
- [ ] {Concrete artefact 2}
- [ ] Update `governance/<file>.md` reflecting the decision (mirror to
       `classification.md` HF/CHF if applicable)
- [ ] CHF-{N} / HF-{N} flipped from `unknown` / `yes` to `no`

## Dependencies + downstream

- **This blocks:** {Aggregated automatically by the orchestrator from every
  remediation ticket whose `Decision points` list cites this OQ. Do not
  enter manually — the orchestrator builds the list after composing all
  remediation tickets.}
- **Substantively overlaps with:** {When brief and classification ask
  substantively the same question, brief is canonical (`OQ-B-N`);
  classification's ticket (`OQ-C-N`) carries
  `**Substantively overlaps with:** OQ-B-{N} — resolve once across both.`}
- **Depends on:** {earlier OQs that must resolve first; cite as `OQ-B-N` /
  `OQ-C-N`}

## References

- `governance/brief.md` OQ-{N} (original question text quoted; this is the
  source-schema ID — the ticket header above wraps it as `OQ-B-{N}`)
- `governance/classification.md` OQ-{N} + relevant fields (ditto for
  `OQ-C-{N}`)
- `governance/findings-<domain>.md` F-{N} (where the reviewer surfaced this
  OQ as a finding)
- {Article + statute citations exactly as they appear in
  `findings-<domain>.md` / `brief.md` / `classification.md` / a policy
  slice — never paste from this prompt}
- {Repo file:line where applicable}
```

---

## Authoring rules

- **Decider is one role, not a committee.** Advisors are listed separately.
  Linear / Jira assigns one human; the ticket mirrors that.
- **OQ tickets prefix the source.** Brief OQ-7 becomes ticket `OQ-B-7`;
  classification OQ-7 becomes ticket `OQ-C-7`. The schema-side `OQ-N`
  stays unchanged in `brief.md` / `classification.md` frontmatter — the
  prefix is synthesised here so cross-references in `tickets.md` stay
  unambiguous when both artefacts independently number from `OQ-1`. When
  brief and classification ask substantively the same question, brief is
  canonical (`OQ-B-N`); the classification ticket (`OQ-C-N`) carries
  `**Substantively overlaps with:** OQ-B-{N} — resolve once across both.`
- **Options are grounded.** Every option must trace to material in
  `findings-<domain>.md`, a policy slice under `governance/policies/`, the
  rubric, or the regulation text. No fabricated alternatives.
- **`What "decided" looks like` items name a resulting artefact.** Each
  bullet identifies a file, a clause, a row, a decision record, or a CHF /
  HF flip. "Retention period documented in `governance/classification.md
  §Retention` per DC-id; cron purge job landed at `<path>:<line>`; CHF-DEL
  flipped to `no`" is right; "Decide retention period" fails the artefact
  test.
- **Cross-ticket references use plain text identifiers** (`PRIV-1`,
  `OQ-B-7`, `OQ-C-3`). No `<issue>` tags. No HTML wrappers. No Linear /
  Jira numbers.
- **Dependencies are derived, not asserted.** `This blocks:` is aggregated
  by the orchestrator from remediation tickets whose `Decision points`
  cite this OQ. Don't write entries by hand — they get overwritten when
  the orchestrator re-derives.
- **No fictional content.** No Articles, statutes, vendors, or options
  that aren't in the source artefacts. If the source is silent, the
  option is silent. Use citation strings exactly as they appear in
  `findings-<domain>.md` / `brief.md` / `classification.md` / a policy
  slice — never paste an example from this template's placeholder text
  as if it were sourced.
- **Lift sensitive content with care.** If the repo is public-facing,
  role-anonymise customer / vendor / contract specifics before
  committing. `tickets.md` is a committed artefact; the brief and
  classification it draws from may contain names that shouldn't ship
  publicly.
- **Placeholder syntax `{…}` is an orchestrator-fill slot** — the agent
  composes the body using this template's structure. The plugin also
  ships `dpia-template.md` which uses `[…]` for consumer-fill slots (a
  DPO reads and completes that file by hand). Different audiences,
  different conventions — keep them separate.
