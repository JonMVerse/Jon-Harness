# Human Oversight Policy (v0.1, draft)

This is a placeholder policy used by the assessment agent. Replace this file
when the canonical version is ready.

## Principle

For any AI use case that produces decisions or outputs affecting individuals,
there must be human oversight proportionate to the impact and the reversibility
of those decisions.

## Tiers of oversight

### Tier 1 — High impact, irreversible
Examples: hiring decisions, dismissal, promotion, access revocation, content
removal that loses the original, fraud-flag decisions that lock accounts.

Required:
- Human review **before** the decision takes effect.
- The reviewer has access to: the input data, the model's output, the
  reasoning if available, and the documented criteria.
- A documented appeal route accessible to the affected individual.
- Audit log of every decision, the reviewer's call, and the rationale.
- Periodic review of model performance for drift and disparate impact.

### Tier 2 — High impact, reversible
Examples: support routing, content moderation that can be appealed, draft
generation for human-edited release.

Required:
- Human review **before or after** the decision, depending on time sensitivity.
- An appeal/correction route, more lightweight than Tier 1 but still documented.
- Audit log retained for the period required by the context (typically ≥ 12
  months).

### Tier 3 — Low impact
Examples: text completion suggestions, summarisation for internal use,
internal-tool autosuggest.

Required:
- Human is in the loop by virtue of being the user — they accept, edit, or
  ignore the AI output.
- No formal appeal route required for the AI output itself, but the underlying
  business decision (if any) should still be reviewable.

## Reviewer competence

A human review is meaningful only if the reviewer:
- Has the time to do the review (not driven to rubber-stamp by throughput targets)
- Has the information they need (full inputs, not just the AI's recommendation)
- Has the authority to override
- Is trained on the specific risks of the use case

If any of these are missing, oversight is nominal, not real, and the use case
should be rated AMBER or RED on the Oversight domain.

## Reversibility

If a decision is irreversible, the bar for oversight is higher. Where reversal
is possible, the assessment should describe how (specific mechanism, time
window, authority needed).

## Documentation requirements

For any AI use case in Tier 1 or Tier 2:
- Documented escalation path (named role, contact, expected response time)
- Documented appeal process (in language a non-expert can act on)
- Logs retained for audit
