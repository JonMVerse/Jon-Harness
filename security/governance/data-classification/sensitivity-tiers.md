# Organisational sensitivity tiers

The four-tier sensitivity classification used in `classification.md`'s
`org_sensitivity_max` field and in `sensitivity_assignments[]`. Each
`data_categories[]` entry gets exactly one tier from this file.

These tiers map data classes to **required controls**. Reviewers cite the
anchors below (e.g. `sensitivity-tiers.md#tier-confidential`) when justifying
recommendations against a specific data flow.

The org's data-classification policy at
[`governance/policies/data-classification.md`](../policies/data-classification.md)
is the authority on which tier each business data class lives in for *this*
organisation; this file aligns the AI-specific classification process to that
policy.

---

## tier-public

**Definition.** Data intended for unrestricted public access. Disclosure
causes no harm.

**Examples.** Press releases, published API documentation, marketing pages,
open-data datasets, the org's published privacy policy.

**Required controls.**
- No access controls beyond integrity protection.
- May be served from a CDN, archived publicly, embedded in product UIs.
- Versioning and authenticity (so attackers can't substitute it) — yes.
- Encryption in transit — yes (HTTPS / TLS as a baseline of operational
  hygiene, not a confidentiality control).
- Encryption at rest — not required.
- Retention — indefinite acceptable.

**AI use.** Public data is acceptable as training input or system input
without further classification work. Provenance still matters under
EU AI Act Art. 53(1)(c) (copyright) — public ≠ open-licensed.

---

## tier-internal

**Definition.** Data intended for internal use across the organisation.
Disclosure causes minor reputational or operational impact but no
regulatory exposure.

**Examples.** Internal wiki pages, non-confidential meeting notes, staff
directories, public-region performance metrics, generic ticket logs.

**Required controls.**
- SSO / org-wide auth required for access.
- Role-based access not required, but service accounts must be scoped.
- Encryption at rest — yes (default cloud-provider keys acceptable).
- Encryption in transit — yes.
- Logging — access logs for audit, no per-read alerting.
- Retention — per data type; no special PII retention rules apply.

**AI use.** Acceptable as input or training data with workforce notice;
output is treated as `internal` unless a downstream classification raises
it. Workers must be informed when their internal data feeds an AI system
(see [`policies/workforce-monitoring.md`](../policies/workforce-monitoring.md)).

---

## tier-confidential

**Definition.** Data with material business or personal sensitivity.
Disclosure causes regulatory exposure, contract breach, or competitive
harm.

**Examples.** PII (`pii.identity`, `pii.contact`, `pii.location`,
`pii.behavioural`, `financial.non-card`), pricing data, customer lists,
unreleased financial figures, third-party data under NDA, internal
security findings.

**Required controls.**
- **Access:** RBAC, least-privilege; MFA for admin / export paths.
- **Encryption at rest:** yes — customer-managed keys (CMK) or KMS-managed.
- **Encryption in transit:** yes — TLS ≥1.2.
- **Logging:** access events recorded; periodic review for anomalous access.
- **Sharing:** only with parties under signed DPA / NDA; record sub-processor
  list.
- **Retention:** documented retention period; deletion path mandatory
  (CCPA / GDPR Art. 17). Soft-delete-only is **not** sufficient — see
  [regulatory-rules.md](regulatory-rules.md) `CHF-DEL`.
- **Cross-border:** transfers outside UK/EEA require an Art. 46 mechanism
  (adequacy / SCCs / IDTA / BCRs). Triggers `HF-3` consideration.
- **Backup:** encrypted; restoration tested.

**AI use.** Acceptable as input only with documented lawful basis (GDPR
Art. 6) and the controls above. Acceptable as training data only with
explicit lawful basis and documented bias-mitigation evidence (Art. 10 if
high-risk). Outputs derived from confidential data are themselves
`tier-confidential` minimum.

---

## tier-restricted

**Definition.** Data with the highest sensitivity. Disclosure causes severe
regulatory, legal, or safety impact. Default treatment for special-category
GDPR data and statutory protected categories.

**Examples.** All `special-category.*` (health, biometric, genetic,
racial-ethnic, political-religious-union, sexual, criminal),
`pii.government-id`, `phi`, `pci.cardholder`, `pci.cvv` (storage
prohibited — see CHF-PCI-CVV), `auth.credentials`, `child-data`.

**Required controls.**
- **Access:** RBAC + JIT elevation + per-record audit on every **read**
  (not just writes). Mandatory MFA, no service-account-only access.
- **Encryption at rest:** customer-managed keys, AES-256 minimum;
  field-level encryption for primary identifiers (e.g. SSN stored as
  BYTEA / BLOB encrypted, with `*_last_four` for display).
- **Encryption in transit:** TLS ≥1.3 where supported.
- **Logging:** every read and write; alerting on bulk export, unusual
  geography, off-hours access.
- **Sharing:** prohibited without explicit data-protection sign-off; for
  PHI, requires a signed BAA. For special-category data, requires Art.
  9(2) lawful basis recorded in the lawful-basis register.
- **Retention:** strict, documented; biometric data must carry an
  explicit `biometric_expires_at` retention timestamp (BIPA).
- **Cross-border:** transfer outside UK/EEA only with Art. 46 mechanism +
  documented Transfer Impact Assessment; **prohibited** for child-data
  without DPO sign-off.
- **Deletion:** hard-delete required; cascading deletion across
  vendors / analytics / backups; CCPA Right to Erasure response within
  45 days.
- **DPIA:** mandatory for processing of special-category, child, or
  biometric data at scale (UK GDPR Art. 35).
- **Audit trail:** per-record, immutable, retained for the length of any
  applicable statute of limitations (typically 6 years for UK / EU
  contractual matters).

**AI use.** Use as training data **only** with documented Art. 9(2)
exemption + bias-mitigation evidence + DPIA. Use as input requires the
above + Art. 13 transparency notices. Output containing restricted data
inherits `tier-restricted` and may not be cached, logged in plaintext, or
sent to analytics tooling. Caches and logs of restricted data trigger
multiple CHFs in [regulatory-rules.md](regulatory-rules.md).

---

## Tier-assignment heuristics

When the data category does not map cleanly:

- **Default upward, not downward.** If a category sits between two tiers,
  pick the higher one and emit an OQ for the policy owner to confirm.
- **Aggregation matters.** Several `tier-internal` fields combined to
  enable re-identification become `tier-confidential` or higher
  (e.g. age + ZIP code + gender → quasi-identifier).
- **Inference matters.** A model that infers a `special-category.*`
  attribute from non-special inputs makes its inputs `tier-restricted`
  in practice.
- **Children's data is restricted by default.** No exception to this rule.
- **Unknown is acceptable.** Set the assignment to the highest plausible
  tier and emit an OQ. Defaulting to `tier-public` because you don't know
  is **not** acceptable.
