# Data Classification Policy (v0.1, draft)

This is a placeholder policy used by the assessment agent. The DPO and Security
team own the real version; replace this file when the canonical one is ready.

> **Operational note.** When assessing AI use cases, the
> `data-classification` skill produces a `classification.md` artefact
> that classifies the system's data against the four levels below
> (Public / Internal / Confidential / Restricted). The artefact's
> `org_sensitivity_max` field carries the highest tier present, and
> per-data-class assignments live in `sensitivity_assignments[]` keyed
> against the stable anchors in
> `governance/data-classification/sensitivity-tiers.md`. Reviewers cite
> those anchors when justifying control recommendations.

## Classification levels

| Level | Description | Examples |
|---|---|---|
| **Public** | Information intended for, or already in, the public domain. | Marketing material, published research, public website content. |
| **Internal** | Default for company information not classified higher. Disclosure outside the company would not cause material harm. | Internal documentation, non-sensitive process notes, anonymised analytics. |
| **Confidential** | Information whose disclosure could materially harm the company, customers, or partners. | Customer records, internal financials, source code, contracts, PII not in the categories below. |
| **Restricted** | Highly sensitive — disclosure could cause severe harm. | Special-category personal data, credentials, security incident details, M&A material, board papers. |

## Classification rules for AI use cases

1. Identify the highest classification level of any data the AI use case will
   process, store, or expose to a third party.
2. **Public / Internal** data: AI processing is generally permissible subject to
   the standard security and contract review.
3. **Confidential** data: explicit DPO approval is required before any data is
   sent to a third-party AI service. SCCs/IDTA must be in place if the service
   processes outside the UK/EEA.
4. **Restricted** data: must not be processed by external AI services without
   board-level approval. Use of internal/private models with appropriate
   isolation may be acceptable.

## Cross-border transfer

For Confidential and Restricted data:
- UK adequacy regulations or EU adequacy decisions are the preferred mechanism.
- Where adequacy is not in place, the IDTA (UK) or EU SCCs are required, plus a
  documented Transfer Risk Assessment.
- Transfers to the US must reference the most current adequacy basis (EU-US Data
  Privacy Framework or UK Extension where applicable) and confirm the vendor's
  certification status.

## Special categories (UK/EU GDPR Art. 9)

Health, biometric, genetic, racial/ethnic, political, religious, trade-union,
sexual-orientation, sex-life, criminal-offence data are special category and
trigger Restricted classification by default. AI processing requires:
- An Art. 9(2) lawful basis explicitly identified
- A DPIA
- Demonstrable necessity (less-intrusive alternatives ruled out)

## Children's data

Any data of individuals under 18 is treated as Restricted regardless of category.
This is a hard-fail trigger for AI assessment (HF-1 in the rubric).
