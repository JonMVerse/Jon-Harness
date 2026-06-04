# AI Use-Case Assessment Rubric (v0.1, draft)

This is the rubric the `/governance-assess` orchestrator and its reviewer
subagents apply to every AI use case. It is owned jointly by Security,
Privacy (DPO), Legal, and AI Transformation.

**Propagation:** this file is read at runtime by `/governance-discovery` (for
question priorities), `/governance-assess` (for aggregation rules), and the
five reviewer subagents (for per-domain RAG criteria). Edits ship immediately
to the next session — there is no build step.

---

## Hard-fail rules — automatic RED, regardless of domain ratings

If **any** of the following are true, the overall RAG is RED and the assessment must
say which hard-fail(s) triggered. Subagents and the orchestrator must check these
explicitly and record yes/no for each.

- **HF-1: Children's data.** The use case processes data of individuals under 18,
  or data plausibly attributable to children (e.g. school accounts, family-sharing).
- **HF-2: Unexplained automated decisions.** The use case produces decisions
  affecting individuals (employment, credit, access, content moderation, safety
  flags) without meaningful human review, an explanation in plain language, or a
  route to appeal.
- **HF-3: Unsafe cross-border transfer.** Personal data is transferred outside
  UK/EEA without a recognised adequacy mechanism (UK adequacy regulations, EU
  adequacy decision, IDTA, EU SCCs, or a binding corporate rule with current
  approval).

---

## Domain: Privacy and Data Protection

### Questions
1. What personal data is processed? (categories, volume, source, retention)
2. Is special-category data involved (health, biometric, racial/ethnic, political,
   trade-union, sexual orientation, criminal-offence, genetic)?
3. What is the lawful basis under UK/EU GDPR Art. 6 (and Art. 9 for special category)?
4. Are international transfers involved? Is there an adequacy mechanism?
5. Is automated decision-making in scope (Art. 22)? If yes, is meaningful human
   review documented?
6. Is the data classification consistent with our internal data-classification
   policy (`policies/data-classification.md`)?
7. Is purpose limitation respected — does the use case use data only for the
   purpose it was collected for?
8. Has a DPIA been completed previously, or is one needed now?

### RAG criteria
- **GREEN** — only non-personal or fully pseudonymised data; no transfers; no ADM;
  data classification clearly within policy.
- **AMBER** — personal data with documented controls; transfers covered by SCCs/IDTA;
  ADM with human review in place; missing or stale DPIA that needs completion.
- **RED** — special-category data without lawful basis; ADM without human review;
  transfers without adequacy; ambiguity that the DPO cannot resolve in this round.

### Hard-fail triggers owned by this domain
HF-1 (children's data), HF-3 (unsafe cross-border transfer). Privacy reviewer must
record yes/no for both.

---

## Domain: Security

### Questions
1. Vendor security posture: SOC 2 Type II, ISO 27001, NCSC Cloud Security
   Principles, or equivalent? Date of most recent attestation?
2. Where is data residency for processing and storage? UK / EEA / US / elsewhere?
3. Supply chain: who is the model provider? What sub-processors? Are they listed
   in the vendor's DPA?
4. Token/API key handling: rotation policy, scope (least privilege), storage
   (vault vs. plain text)? Are any credentials in the target repo?
5. Logging and incident response: does the vendor commit to breach notification
   timelines compatible with our policy?
6. Vulnerability management: published security advisories, CVE tracking, patch
   commitments?
7. Does the vendor allow our threat-intel feeds to inform on it (i.e. can we get
   notified if they're breached)?

### RAG criteria
- **GREEN** — established vendor, current certifications (within 12 months),
  UK/EEA residency, scoped credentials in vault, breach notification ≤ 72h.
- **AMBER** — gaps in certifications or residency with documented mitigations;
  credentials adequately scoped but rotation policy weak; breach SLA > 72h.
- **RED** — no certifications; no residency control; plain-text credentials in
  the target repo; no breach notification commitment.

### Hard-fail triggers owned by this domain
None directly, but escalates anything that materially raises HF-3 risk to Privacy.

---

## Domain: Legal and Regulatory

### Questions
1. Equality Act 2010 considerations: could the use case produce indirect
   discrimination? Has bias testing been considered?
2. IP: who owns training data inputs and model outputs? What does the vendor's
   T&Cs say about derivative use?
3. EU AI Act risk classification: prohibited / high-risk / limited-risk / minimal?
   If high-risk, are conformity-assessment requirements addressable?
4. UK AI framework expectations (DSIT principles, sector-specific guidance from
   FCA, Ofcom, ICO).
5. Vendor contract: does the existing contract cover this use? If not, does Legal
   need to negotiate addenda before deployment?
6. Consumer protection / advertising standards if customer-facing.

### RAG criteria
- **GREEN** — minimal-risk under EU AI Act; existing contract covers the use;
  no IP encumbrances; no equality red flags.
- **AMBER** — limited-risk; contract addendum needed; some IP review required;
  bias testing recommended but not blocking.
- **RED** — prohibited under EU AI Act; high-risk without conformity path;
  contract does not permit the use case at all; clear discrimination risk.

---

## Domain: Workforce Impact

### Questions
1. Does the use case monitor employees, directly or as a side-effect (e.g.
   analytics on Slack messages, code commits, meeting transcripts)?
2. Are workers informed? Is the policy/guidance up to date?
3. Is consultation required (Works Councils in EU jurisdictions, recognised
   union arrangements in UK)?
4. Could the use case materially change job content, role expectations, or
   career progression?
5. Are there transparency obligations (e.g. Article 88 GDPR worker-data rules)?

### RAG criteria
- **GREEN** — no workforce monitoring; no material change in job content;
  workers informed.
- **AMBER** — incidental monitoring with controls; consultation completed or in
  flight; transparent notice to workers.
- **RED** — covert monitoring; consultation skipped where required; material
  job redesign without HR involvement.

---

## Domain: Human Oversight

### Questions
1. For the level of impact identified, is human review appropriate?
2. Are decisions reversible? If not, is the threshold for human approval right?
3. Is there a documented escalation path for users / data subjects /
   employees affected?
4. Is the human reviewer adequately informed (i.e. they have what they need to
   make a real judgment, not rubber-stamp)?
5. How are review decisions logged for audit?

### RAG criteria
- **GREEN** — human review proportionate to risk; reversibility designed in;
  escalation path documented and tested.
- **AMBER** — review present but limited; reversibility partial; escalation
  path documented but not exercised.
- **RED** — no human review for high-impact decisions; no reversibility; no
  escalation path; reviewer underinformed.

### Hard-fail triggers owned by this domain
HF-2 (unexplained automated decisions). Oversight reviewer must record yes/no.

---

## Aggregation

The orchestrator computes per-domain RAGs first, then derives overall. Hard-fail
(HF) and classification-hard-fail (CHF) upgrades both apply **unconditionally** —
not as a cascade. The procedure is mechanical:

1. **Start** with each reviewer's reported RAG as the per-domain rating.
2. **HF upgrade** (unconditional): for every `HF-N: yes`, upgrade the owner
   domain to RED. Ownership:
   - HF-1 (children's data) → Privacy
   - HF-2 (unexplained automated decisions) → Oversight
   - HF-3 (unsafe cross-border transfer) → Privacy
3. **CHF upgrade** (unconditional, runs even when HFs also fire): for every
   classification `CHF-…: yes`, upgrade the owning reviewer's domain to RED if
   not already. Ownership:
   - **Privacy**: `CHF-GDPR-*`, `CHF-HIPAA-*`, `CHF-COPPA-*`, `CHF-DEL`,
     `CHF-BIPA-NO-CONSENT` (default owner — biometrics are GDPR Art. 9
     special-category and BIPA is a privacy law).
   - **Security**: `CHF-PASSWORD-PLAINTEXT`, `CHF-PCI-*`, `CHF-LOG-PII`,
     `CHF-EXPORT-UNENCRYPTED`.
   - **Legal**: `CHF-AIA-*`.
   - **Workforce**: additionally escalates `CHF-BIPA-NO-CONSENT` to RED when
     biometric data is collected from workers (Privacy still owns the default
     non-worker case).
4. **Overall** = strictest of the five upgraded per-domain RAGs
   (RED > AMBER > GREEN).

The orchestrator must show its working in `assessment.md`: each reviewer's
reported RAG → HF upgrades applied → CHF upgrades applied → final per-domain →
overall. Every HF / CHF that triggered an upgrade is named explicitly. The
per-domain values written to `rag.json` are the **upgraded** values, not the
reviewers' raw reports.

---

## Evidence requirements

Every finding (in any domain, at any RAG level) must cite at least one of:
- a specific clause in a policy file under the plugin's `governance/policies/` directory
- a specific reference into the brief or classification — an `OQ-N`, a
  data-flow item, the vendor list, a `data_categories[]` DC-id, a
  `CHF-N` signal, the `ai_act_risk_tier`, the `org_sensitivity_max`, a
  lifecycle row, or a `file:line` pointer recorded by discovery
- a specific named regulation, standard, or section (e.g. "UK GDPR
  Art. 9(2)(a)", "Annex III §4(b)")

Reviewers' primary evidence base is the brief + classification. Limited
`Glob`/`Grep`/`Read` on the user's repo is permitted to verify a single
brief claim when needed, but a verification that takes more than one or two
reads should become an `OQ` instead. Do not silently re-do discovery work
mid-review — the brief is the system of record for what was found upstream.
Findings without evidence will be rejected by the grader.
