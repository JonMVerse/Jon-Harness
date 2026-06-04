# EU AI Act — Risk Tiers and Criteria

Reference for the `/data-classification` skill. The schema's `ai_act_risk_tier`
field takes one of the four values below; `ai_act_tier_evidence[].criterion_id`
references the stable IDs in this file.

This file is read at runtime by the skill. Edits ship to the next session
immediately; the `AIA-*` criterion IDs are stable contracts referenced by
`classification-schema.md` — add new IDs at the end, never rename or renumber.

---

## Enforcement timeline

| Date | What is in force |
|---|---|
| 2024-08-01 | Act enters into force; preparatory phase begins. |
| 2025-02-02 | **Article 5 prohibited practices** + penalties regime in force. Banned uses are unlawful and enforceable from this date. |
| 2025-08-02 | **GPAI obligations (Art. 53–55)** in force for *new* GPAI models placed on market. Older models have until 2027-08-02. |
| **2026-08-02** | **High-risk system obligations (Annex III) in force.** Article 10 (data governance), Article 11 + Annex IV (technical documentation), Article 13 (transparency to deployers), Article 14 (human oversight), Article 17 (quality management), conformity assessment, monitoring. Reviewers should compute the gap from the current session date and surface urgency proportionally. |
| 2027-08-02 | High-risk Annex I (regulated products: medical devices, machinery, toys, etc.) obligations in force; legacy GPAI models must be compliant. |

If `ai_act_risk_tier: unacceptable`, set `ai_act_obligations_due: 2025-02-02`
— Article 5 prohibitions are already in force from that date, so any
deployment is non-compliant *now*, not at a future deadline. Reviewers
must surface this as RED with the specific Art. 5 prohibition cited.

If `ai_act_risk_tier: high`, set `ai_act_obligations_due: 2026-08-02`. If
`is_gpai_model: yes` and the model was placed on the market on/after
2025-08-02, set `ai_act_obligations_due: 2025-08-02`.

For `limited` and `minimal` tiers, set `ai_act_obligations_due: null` —
there is no high-risk-style enforcement deadline; limited-risk
transparency obligations (Art. 50) apply continuously rather than at a
fixed cut-over.

If `ai_act_risk_tier: unknown`, set `ai_act_obligations_due: null` and
raise an open question in `domain: ai-act` pending tier determination.
This is a placeholder, not a "no obligations" signal — do **not** infer
a deadline. Reviewers should treat the tier as undetermined and surface
the OQ as an AMBER-pending finding until classification is resolved.

---

## Tier: Unacceptable risk (Article 5 — prohibited)

These practices are absolutely prohibited from EU deployment. Article 5 is in
force since 2025-02-02. If any criterion below applies, set
`ai_act_risk_tier: unacceptable` and emit at least one `ai_act_tier_evidence`
entry citing the relevant criterion ID.

- **AIA-PR-01** — Subliminal / manipulative techniques beyond a person's
  consciousness that materially distort behaviour and cause harm. Art. 5(1)(a).
- **AIA-PR-02** — Exploitation of vulnerabilities (age, disability, social /
  economic situation) to materially distort behaviour and cause harm.
  Art. 5(1)(b).
- **AIA-PR-03** — Social scoring by public or private actors evaluating /
  classifying natural persons over time leading to detrimental treatment in
  unrelated social contexts or that is unjustified / disproportionate.
  Art. 5(1)(c).
- **AIA-PR-04** — Predictive policing based solely on profiling or personality
  traits (without objective verifiable facts linked to criminal activity).
  Art. 5(1)(d).
- **AIA-PR-05** — Untargeted scraping of facial images from the internet or
  CCTV to create or expand facial-recognition databases. Art. 5(1)(e).
- **AIA-PR-06** — Emotion inference in workplace and educational institutions
  (with narrow medical / safety exceptions). Art. 5(1)(f).
- **AIA-PR-07** — Biometric categorisation inferring race, political opinions,
  trade-union membership, religion, philosophical beliefs, sex life or sexual
  orientation. Art. 5(1)(g).
- **AIA-PR-08** — Real-time remote biometric identification in publicly
  accessible spaces for law-enforcement purposes (with narrow exceptions
  requiring judicial authorisation). Art. 5(1)(h).

---

## Tier: High risk (Annex III — and Annex I)

Set `ai_act_risk_tier: high` if **any** of the following criteria apply.
Obligations enforce 2026-08-02 (Annex III) or 2027-08-02 (Annex I products).

### Annex III standalone categories

- **AIA-HR-01** — Biometrics: remote biometric identification, biometric
  categorisation by sensitive attributes, emotion recognition (outside the
  Art. 5 prohibitions). Annex III §1.
- **AIA-HR-02** — Critical infrastructure: safety components in management /
  operation of road traffic, water, gas, heating, electricity, digital
  infrastructure. Annex III §2.
- **AIA-HR-03** — Education / vocational training: access, admission,
  evaluation, exam-cheating detection. Annex III §3.
- **AIA-HR-04** — Employment, worker management, access to self-employment:
  - **AIA-HR-04a** — Recruitment, advertising, candidate filtering /
    evaluation. Annex III §4(a).
  - **AIA-HR-04b** — Decisions affecting terms of work, promotion, termination,
    task allocation, performance / behaviour monitoring. Annex III §4(b).
- **AIA-HR-05** — Essential private/public services: public benefit eligibility,
  creditworthiness scoring (excluding financial-fraud detection), risk
  assessment / pricing for life and health insurance, emergency triage.
  Annex III §5.
- **AIA-HR-06** — Law enforcement: victim risk assessment, polygraph /
  emotion-inference, evidence reliability evaluation, recidivism prediction,
  profiling under Art. 6 LED. Annex III §6.
- **AIA-HR-07** — Migration, asylum, border control: polygraphs, risk
  assessments, asylum / visa application examination, biometric matching.
  Annex III §7.
- **AIA-HR-08** — Administration of justice and democratic processes:
  judicial-authority research / interpretation aids; influencing election /
  referendum outcomes; voting-behaviour profiling. Annex III §8.

### Annex I — AI as a safety component of regulated products

- **AIA-HR-AI-01** — AI is a safety component of, or itself a product
  covered by, EU harmonisation legislation listed in Annex I (medical devices,
  in-vitro diagnostics, machinery, toys, lifts, radio equipment, civil
  aviation, marine equipment, rail, automotive, agricultural vehicles,
  recreational craft). Obligations enforce 2027-08-02.

### Article 6(3) — narrow exceptions

A system that *would* fall under Annex III may be classified non-high-risk if
the provider documents (Art. 6(3)) that it performs only a narrow procedural
task, improves the result of a previously completed human activity, detects
deviation patterns, or is preparatory to a human-made decision. Document the
exception under `ai_act_tier_evidence` with `criterion_id: AIA-HR-EXEMPT` and
the supporting rationale.

---

## Tier: Limited risk (Article 50 / 52 transparency)

Set `ai_act_risk_tier: limited` for systems that are not high-risk but trigger
transparency obligations under Art. 50 (provider) / Art. 52 (deployer).
Obligations in force since 2025-08-02 for GPAI; otherwise from 2026-08-02.

- **AIA-LR-01** — AI systems intended to interact directly with natural
  persons (chatbots): must disclose AI nature unless obvious. Art. 50(1).
- **AIA-LR-02** — AI generating synthetic audio, image, video, text: outputs
  must be marked as AI-generated in machine-readable format. Art. 50(2).
- **AIA-LR-03** — Emotion-recognition / biometric-categorisation systems
  (deployer obligation): inform exposed individuals. Art. 50(3) / Art. 52.
- **AIA-LR-04** — Deepfakes (synthetic image/audio/video resembling existing
  persons / events): disclose as artificially generated. Art. 50(4).

---

## Tier: Minimal risk

Set `ai_act_risk_tier: minimal` if **none** of the above criteria apply.
Minimal-risk systems have no specific EU AI Act obligations (but GDPR and
sector law still apply). Examples: spam filters, recommendation systems for
non-essential services, AI-enabled video games. Set
`ai_act_obligations_due: null`.

---

## GPAI carve-out (Articles 51–55)

GPAI status is **orthogonal** to risk tier — a GPAI model can also be
embedded in a high-risk system. Set `is_gpai_model: yes` if any of the
following apply.

- **AIA-GP-01** — Model trained with a large amount of data using
  self-supervision at scale, displaying significant generality, capable of
  competently performing a wide range of distinct tasks. Art. 3(63).
- **AIA-GP-02** — GPAI model with **systemic risk**: training compute
  ≥10²⁵ FLOPs, OR designated as systemic by the AI Office. Art. 51 / Annex
  XIII. If yes, set `gpai_systemic_risk: yes` — additional obligations
  (Art. 55: model evaluation, adversarial testing, serious-incident
  reporting, cybersecurity).
- **AIA-GP-03** — Open-source GPAI: limited carve-out from Art. 53
  obligations *unless* placed on the market with systemic risk
  (Art. 53(2)).

GPAI obligations (Art. 53):

- Technical documentation of the model (Art. 53(1)(a)).
- Information / documentation for downstream providers (Art. 53(1)(b)).
- Compliance with Union copyright law, including respect for opt-outs
  (Art. 53(1)(c)).
- **Public summary of training content** (Art. 53(1)(d)) — set
  `gpai_training_summary_required: yes` and capture the summary status in the
  classification body's "Training data provenance" section.

---

## Cross-references

- Art. 10 (data governance) applies to **all high-risk** systems.
  Classification body must capture bias-mitigation and dataset-representativeness
  evidence — set `bias_mitigation_documented` accordingly.
- Art. 13 (transparency to deployers) applies to **high-risk**. Set
  `transparency_measures_documented` accordingly.
- Art. 27 (Fundamental Rights Impact Assessment) applies to public-sector
  deployers of high-risk systems and to certain Annex III §5 deployers — flag
  as an open question (`OQ-N domain: ai-act`) when the deployer profile is
  unclear.
