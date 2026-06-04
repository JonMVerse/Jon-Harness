# Classification hard-fail rules — `CHF-N`

These are the **classification hard-fail signals** the Data Classification
Agent must record as `yes`/`no`/`unknown` on every classification artefact,
under `classification_hard_fail_signals` in the frontmatter.

`CHF-N` IDs are **not** the same as `HF-N` (rubric.md). HF-N apply to the
overall assessment; CHF-N apply specifically to *classification correctness*
and *automatic-RED conditions* on data handling.

When a `CHF-N` is `yes`, downstream Privacy / Security / Legal reviewers
must treat it as a hard finding regardless of other signals. Each CHF below
maps to one or more regulations and one or more anchors in
[`field-patterns.md`](field-patterns.md), [`leakage-vectors.md`](leakage-vectors.md),
or [`eu-ai-act-risk-tiers.md`](eu-ai-act-risk-tiers.md).

---

## EU AI Act CHFs

### `CHF-AIA-PROHIBITED`
- **Trigger.** Use case matches any `AIA-PR-NN` criterion in
  `eu-ai-act-risk-tiers.md` (Art. 5 prohibited practices).
- **Required evidence.** Citation: `Art. 5(1)(<x>)` plus repo / brief
  evidence.
- **Consequence.** `ai_act_risk_tier: unacceptable` is mandatory; deployment
  in EU is unlawful.

### `CHF-AIA-HIGHRISK-NO-DATAGOV`
- **Trigger.** `ai_act_risk_tier: high` AND
  `bias_mitigation_documented: no` AND `lifecycle_posture.retention_documented`
  / `residency_documented` is `no` or `unknown`.
- **Required evidence.** Cite `Art. 10` and the missing evidence rows.
- **Consequence.** Will not pass conformity assessment for the
  2026-08-02 deadline; flag the deadline in the readiness summary.

### `CHF-AIA-GPAI-NO-SUMMARY`
- **Trigger.** `is_gpai_model: yes` AND `gpai_training_summary_required: yes`
  AND no public training-data summary documented.
- **Required evidence.** Cite `Art. 53(1)(d)`.
- **Consequence.** GPAI summary is a placement-on-market obligation; the
  system cannot legally be marketed in the EU until it exists.

---

## GDPR / UK GDPR CHFs

### `CHF-GDPR-SPECIAL-NO-BASIS`
- **Trigger.** Any `data_categories[]` with `is_special_category: yes`
  lacks a documented Art. 9(2) lawful basis in the brief, repo, or user
  statements.
- **Required evidence.** Cite `Art. 9(1)` (prohibition) and the missing
  Art. 9(2) sub-paragraph.
- **Consequence.** Processing is unlawful; mirrors `HF-1` if the special
  category is also child-data.

### `CHF-GDPR-CHILDREN`
- **Trigger.** Any `data_categories[]` with `is_children_data: yes` AND
  no Art. 8 parental consent flow documented.
- **Required evidence.** Cite `Art. 8` and quote the missing consent
  evidence.
- **Consequence.** Mirrors **HF-1** (rubric.md). Set `HF-1: yes` in the
  rubric-derived signals.

### `CHF-GDPR-XBORDER`
- **Trigger.** `cross_border_transfer: yes` AND `transfer_mechanism` is
  `none` or `unknown`.
- **Required evidence.** Cite `Art. 46` mechanisms and the missing
  documentation.
- **Consequence.** Mirrors **HF-3** (rubric.md). Set `HF-3: yes`.

### `CHF-GDPR-NO-LAWFUL-BASIS`
- **Trigger.** Any non-special `data_categories[]` lacks a documented
  Art. 6 lawful basis (consent, contract, legal obligation, vital
  interests, public task, legitimate interest).
- **Required evidence.** Quote which Art. 6(1)(<x>) is being relied on.
- **Consequence.** Processing of personal data without a lawful basis is
  unlawful; immediate Privacy reviewer concern.

---

## Sector-specific CHFs

### `CHF-PCI-CVV`
- **Trigger.** Any storage of `pci.cvv` data (CVV / CVV2 / CVC) — encrypted
  or not.
- **Required evidence.** Field-pattern match in
  `field-patterns.md#critical-sensitivity` ("Payment Card") OR repo
  `file:line` showing storage.
- **Consequence.** PCI-DSS Requirement 3.2 — **absolute prohibition**.
  Storage must be removed before deployment. No exceptions.

### `CHF-PCI-PAN-PLAINTEXT`
- **Trigger.** Card primary account number (`pci.cardholder`) stored
  without tokenisation or AES-256 encryption.
- **Required evidence.** Repo `file:line` or schema entry.
- **Consequence.** PCI-DSS Requirement 3.4 violation; tokenise via Stripe
  / Braintree / Adyen, or encrypt and display only last 4 digits.

### `CHF-HIPAA-NO-BAA`
- **Trigger.** `data_categories[]` includes `phi` AND data flows to a
  vendor without a signed Business Associate Agreement (BAA) in evidence.
- **Required evidence.** Cite the vendor and the missing BAA reference.
- **Consequence.** HIPAA violation; PHI must not flow to any tool
  (Sentry, Datadog, Mixpanel, HubSpot, Intercom, etc.) without a BAA.

### `CHF-HIPAA-NO-AUDIT-READ`
- **Trigger.** `data_categories[]` includes `phi` AND read-access logging
  is `no` or `unknown` in the lifecycle posture.
- **Required evidence.** Cite HIPAA 164.312(b) (audit controls).
- **Consequence.** HIPAA requires logging of every read access to PHI,
  not only mutations.

### `CHF-BIPA-NO-CONSENT`
- **Trigger.** `data_categories[]` includes `special-category.biometric`
  AND no written consent flow documented AND no
  `biometric_expires_at`-style retention limit.
- **Required evidence.** Cite BIPA §15.
- **Consequence.** Storage of biometric data without prior written consent
  is per-record statutory damages in BIPA jurisdictions; applies across
  the US, not only Illinois.

### `CHF-COPPA-UNDER-13`
- **Trigger.** `data_categories[]` includes `child-data` with users plausibly
  under 13 AND no verifiable parental consent flow.
- **Required evidence.** Cite COPPA §312.5.
- **Consequence.** Behavioural tracking of under-13s is prohibited without
  verifiable parental consent.

---

## Storage / lifecycle CHFs

### `CHF-PASSWORD-PLAINTEXT`
- **Trigger.** Any `auth.credentials` field stored in plaintext (field
  named `password`, `passwd`, `pwd`, `pass`, `passphrase` without `_hash`
  suffix and not annotated as a derived hash).
- **Required evidence.** Repo `file:line` or schema entry.
- **Consequence.** Always-fail; must use bcrypt (cost ≥12), argon2id, or
  scrypt.

### `CHF-DEL`
- **Trigger.** `lifecycle_posture.deletion_documented: no` for any data
  category with regulatory exposure that includes a right-to-erasure
  (`gdpr`, `ccpa`).
- **Required evidence.** Cite GDPR Art. 17 / CCPA §1798.105.
- **Consequence.** Soft-delete-only is **not** sufficient. A hard-delete
  path that purges the row and cascades to vendors (analytics, CRM,
  email) must exist.

### `CHF-LOG-PII`
- **Trigger.** Any `data_categories[]` with `tier-confidential` or
  `tier-restricted` AND repo evidence of plaintext logging in any of
  `leakage-vectors.md`'s V-01 (logging), V-02 (error handling),
  V-04 (caching), V-06 (API responses), V-07 (file storage).
- **Required evidence.** Repo `file:line` showing the leakage vector.
- **Consequence.** Logging restricted data in plaintext is a finding
  in its own right; if PHI, also triggers `CHF-HIPAA-NO-AUDIT-READ`.

### `CHF-EXPORT-UNENCRYPTED`
- **Trigger.** PII / restricted data exported to S3 / blob storage
  without `ServerSideEncryption` and `ACL: private`.
- **Required evidence.** Repo `file:line` showing the upload call.
- **Consequence.** Per leakage-vector V-07; must add encryption + private
  ACL.

---

## Use guidance

- **Every CHF in this file must appear** as a key in the artefact's
  `classification_hard_fail_signals` map. Missing CHFs are bugs in the
  classification, not silently-passed checks.
- **`unknown` is a real value.** When the agent cannot determine
  yes/no from the available evidence, set `unknown` and emit a matching
  OQ. Do not default to `no`.
- **CHFs that mirror HFs (rubric.md).** When `CHF-GDPR-CHILDREN: yes`, set
  `HF-1: yes` too. When `CHF-GDPR-XBORDER: yes`, set `HF-3: yes` too. The
  classification artefact carries both namespaces; reviewers downstream
  cite whichever maps to their domain language.
- **Adding a new CHF.** Edit this file; changes ship to the next session.
  The schema is parameterised — no schema edit required. Make sure the
  new `CHF-N` key appears in the classification artefact's
  `classification_hard_fail_signals` map.
