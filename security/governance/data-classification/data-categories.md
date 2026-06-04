# Data category taxonomy

Canonical category labels for the `data_categories[].label` field in
`classification.md`. The classification agent assigns a `label` from this
file (or, for novel data, sets `confidence: low` and emits an OQ).

Reviewers cite categories by these labels — do not rename without updating
`classification-schema.md` and the reviewer prompts.

Each category lists which regulations care about it; use these in
`data_categories[].regulatory_exposure`.

---

## PII (Personally Identifiable Information)

### `pii.identity`
First/last name, full name, maiden name, display name, signature, photo,
date of birth, age (exact), gender, nationality.

- **Regulatory exposure:** `gdpr` (personal data, Art. 4(1)), `ccpa`
  (consumer personal information).
- **Field-pattern anchor:** [field-patterns.md#high-sensitivity](field-patterns.md)
  → "Identity" block.

### `pii.contact`
Email, phone, mobile, address (street/city/state/zip), country, mailing /
billing / shipping address.

- **Regulatory exposure:** `gdpr`, `ccpa`.
- **Field-pattern anchor:** [field-patterns.md#high-sensitivity](field-patterns.md)
  → "Contact" block.

### `pii.government-id`
SSN, tax ID, passport, driver's licence, national ID, ITIN, EIN.

- **Regulatory exposure:** `gdpr` (often special-category if linked to
  criminal-offence data), `ccpa` (sensitive PI), state breach-notification
  laws (US).
- **Field-pattern anchor:** [field-patterns.md#critical-sensitivity](field-patterns.md)
  → "Government IDs" block.
- **Lawful basis (GDPR):** typically Art. 6(1)(c) legal obligation or
  Art. 6(1)(b) contract; must minimise.

### `pii.location`
GPS coordinates, latitude/longitude, IP address (when persistent), device
location.

- **Regulatory exposure:** `gdpr` (precise location is personal data),
  `ccpa` (precise geolocation is sensitive PI).
- **Field-pattern anchor:** [field-patterns.md#high-sensitivity](field-patterns.md)
  → "Location / Tracking" block.

### `pii.behavioural`
Device ID, advertising ID (IDFA, GAID), browser fingerprint, search /
browsing / click history, session activity.

- **Regulatory exposure:** `gdpr`, `ccpa` (with Strengthening of
  Consumer Privacy Act amendments treating cross-context behavioural advertising
  as sensitive).
- **Field-pattern anchor:** [field-patterns.md#lower-sensitivity](field-patterns.md)
  → "Behavioral" block.

---

## Special-category data (GDPR Article 9)

Processing of any of these is prohibited unless an Art. 9(2) exemption
applies. Set `data_categories[].is_special_category: yes`.

### `special-category.health`
Diagnosis, condition, medication, prescription, medical record, EHR,
insurance number, ICD/CPT codes, mental health, therapy notes.

- **Regulatory exposure:** `gdpr` (Art. 9), `hipaa` (PHI under US scope),
  `eu-ai-act` (Art. 10 high-risk if used in training).
- **Field-pattern anchor:** [field-patterns.md#critical-sensitivity](field-patterns.md)
  → "Health / Medical" block.
- **Lawful basis:** typically Art. 9(2)(a) explicit consent, 9(2)(h) health /
  social care, 9(2)(i) public health.

### `special-category.biometric`
Fingerprint, face data / facial recognition, retina / iris scan, voice
print, DNA — when processed for the purpose of uniquely identifying a
natural person.

- **Regulatory exposure:** `gdpr` (Art. 9), `bipa` (Illinois — written
  consent + retention limit), `eu-ai-act` (Art. 5 prohibition for some
  uses; Annex III §1 for others).
- **Field-pattern anchor:** [field-patterns.md#critical-sensitivity](field-patterns.md)
  → "Biometric" block.
- **Lawful basis:** typically Art. 9(2)(a) explicit consent; written consent
  required in BIPA jurisdictions.

### `special-category.genetic`
DNA, genetic markers, inherited / acquired genetic characteristics.

- **Regulatory exposure:** `gdpr` (Art. 9), `gina` (US Genetic Information
  Nondiscrimination Act — limited).

### `special-category.racial-ethnic`
Racial or ethnic origin (including inferred from photo / name / location).

- **Regulatory exposure:** `gdpr` (Art. 9), `eu-ai-act` (Art. 5(1)(g)
  prohibition for biometric categorisation by these attributes).

### `special-category.political-religious-union`
Political opinions, religious or philosophical beliefs, trade-union
membership.

- **Regulatory exposure:** `gdpr` (Art. 9), `eu-ai-act` (Art. 5(1)(g)).

### `special-category.sexual`
Sex life, sexual orientation.

- **Regulatory exposure:** `gdpr` (Art. 9), `eu-ai-act` (Art. 5(1)(g)).

### `special-category.criminal`
Criminal-offence data, convictions, alleged offences (Art. 10 GDPR — closely
related to Art. 9 but governed separately).

- **Regulatory exposure:** `gdpr` (Art. 10), `eu-ai-act` (Annex III §6 for
  law-enforcement systems).

---

## Sector-specific personal data

### `phi`
Protected Health Information under HIPAA. Often overlaps with
`special-category.health` — record both when both regimes apply
(EU + US-scoped systems).

- **Regulatory exposure:** `hipaa`, `gdpr` (Art. 9 if EU subjects), `ccpa`
  (sensitive PI if not under HIPAA).

### `pci.cardholder`
Primary account number (PAN), cardholder name, expiry, service code (≠ CVV).

- **Regulatory exposure:** `pci-dss`.
- **Field-pattern anchor:** [field-patterns.md#critical-sensitivity](field-patterns.md)
  → "Payment Card" block.

### `pci.cvv`
Card verification value (CVV / CVV2 / CVC). Storage **prohibited** by
PCI-DSS Requirement 3.2 — see [regulatory-rules.md](regulatory-rules.md)
`CHF-PCI-CVV`.

- **Regulatory exposure:** `pci-dss` (storage prohibited regardless of
  encryption).

### `child-data`
Data of individuals under 18 (or under 13 in COPPA scope).

- **Regulatory exposure:** `gdpr` (Art. 8 — parental consent below ~16),
  `coppa` (US, under 13), `eu-ai-act` (heightened scrutiny).
- **Internal hard-fail:** also triggers `HF-1` from `governance/rubric.md`.

### `educational-record`
Student records, grades, educational identifiers.

- **Regulatory exposure:** `ferpa` (US).

### `financial.non-card`
Salary, wage, income, balance, credit score, transaction / spending history.

- **Regulatory exposure:** `gdpr`, `ccpa` (sensitive PI), `glba` (US
  financial institutions).
- **Field-pattern anchor:** [field-patterns.md#high-sensitivity](field-patterns.md)
  → "Financial (non-card)" block.

### `auth.credentials`
Passwords, password hashes, API keys, tokens (auth / session / refresh /
bearer), client secrets, signing keys, security question answers.

- **Regulatory exposure:** all — credential exposure is a security finding
  regardless of regulatory regime.
- **Field-pattern anchor:** [field-patterns.md#critical-sensitivity](field-patterns.md)
  → "Auth / Secrets" block.

---

## AI-specific data classes

These are unique to AI systems and central to EU AI Act analysis.

### `ai.training-data`
Data used to train, fine-tune, validate, or test the AI model — whether
collected, purchased, scraped, or generated.

- **Regulatory exposure:** `eu-ai-act` (Art. 10 dataset governance for
  high-risk; Art. 53(1)(c)+(d) for GPAI), `gdpr` (Art. 6 / Art. 9 if
  personal data is included).
- **Always document** training-data provenance under "Training data
  provenance" section of `classification.md` when `is_gpai_model: yes`.

### `ai.input`
Data fed to the system at inference time (user prompts, file uploads,
sensor data, retrieved documents in RAG pipelines).

- **Regulatory exposure:** depends on content; classify the underlying
  data class additionally.

### `ai.output`
Data generated by the model — text, image, audio, structured decisions.

- **Regulatory exposure:** `eu-ai-act` (Art. 50(2) marking obligations
  for synthetic content; Art. 50(4) deepfake disclosure), `gdpr` (output
  containing personal data is itself personal data).

### `ai.feedback`
User corrections, preference rankings, RLHF labels.

- **Regulatory exposure:** typically `gdpr` if linked to a user; carries
  forward the input class.

---

## Non-personal data (still worth recording)

### `business.confidential`
Trade secrets, internal financials, unreleased product specifications,
customer pipelines.

- **Regulatory exposure:** none of the above, but maps to
  `org_sensitivity_max: confidential` or `restricted` and triggers
  contractual / NDA-level controls. See [sensitivity-tiers.md](sensitivity-tiers.md).

### `public`
Press releases, published documentation, marketing copy, public APIs.

- **Regulatory exposure:** none. Maps to `org_sensitivity_max: public`.

---

## Use guidance

- **One row per material category.** A user-record table containing
  email + phone + DOB is **one** `pii.contact` row plus **one** `pii.identity`
  row (DOB), not seven.
- **Special-category overrides PII.** If health-data inference is happening
  on contact data, record both: `pii.contact` plus `special-category.health`
  (with `is_special_category: yes`).
- **Children's data is its own category.** When `child-data` applies, also
  set `data_categories[].is_children_data: yes` and ensure `HF-1: yes` in
  the rubric-derived signals.
- **Unknown is fine.** If you can't classify a data flow from repo / brief
  / user statements, use `confidence: low`, leave `regulatory_exposure`
  empty, and emit an OQ.
