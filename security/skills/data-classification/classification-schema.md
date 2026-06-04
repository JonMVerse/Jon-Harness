---
title: Data Classification Schema
version: 0.1-draft
owner: CISO
last_reviewed: 2026-05-09
---

# Data Classification Schema

The `governance/classification.md` artefact produced by the
`/data-classification` skill and consumed (alongside `governance/brief.md`)
by the `/governance-assess` command and the five reviewer subagents. Together
with the brief, the classification is the mandatory input to an assessment
of any AI system handling data.

This file is the contract. The classification skill follows it; reviewers
cite by section header; `/governance-assess` parses the YAML frontmatter
for metadata.

The artefact is **facts, structured signals, and explicit open questions —
not judgement.** Open questions are deterministic, parameterised, and
under-determined on purpose: reviewers either resolve them with repo
evidence or surface them as AMBER-pending findings.

---

## Required structure

A classification is a single markdown file with two parts:

1. **YAML frontmatter** — machine-readable signals + audit metadata.
2. **Markdown body** — predictable section headers (cited by reviewers).

Both parts are required. A classification missing either fails parsing in
`/governance-assess`.

---

## Frontmatter keys

```yaml
---
schema_version: 1                            # bump on schema-breaking changes
slug: <kebab-case-slug>                      # carry from brief if source_brief_slug is set
created_at: <ISO-8601 UTC>                   # e.g. 2026-05-09T14:32:00Z
classification_iterations: <int>             # # of conversational turns

# Source linkage
source_brief_slug: <slug or null>            # null only when ran without a brief
target_repo: <URL or empty string>
target_branch: <branch or empty string>      # only if non-default
repo_inspected: <true | false>               # always true in the plugin (live repo)
images_attached:                             # filenames the user uploaded
  - <basename1.png>

# Run metadata — what version of the governance pack and what repo state
# produced this artefact. External schedulers read this to decide whether
# the classification is stale. Optional within the schema (schema_version
# stays 1), but the classification skill populates it on every run.
run_metadata:
  governance_pack_version: "0.2.0"           # from security/.claude-plugin/plugin.json `version`
  repo_commit: <short-sha or null>           # `git rev-parse --short HEAD`; null if not a git repo
  scope: <one-line free text>                # e.g. "initial run", "refresh after AI Act tier change"
  triggered_by: <skill | command | external>

# --- Pillar 1: EU AI Act risk tier ---
ai_act_risk_tier: <unacceptable | high | limited | minimal | unknown>
ai_act_tier_evidence:                        # required when tier != unknown; >= 1 entry
  - article: "Annex III §4(b)"               # verbatim Article quote
    criterion_id: AIA-HR-04b                 # ID from eu-ai-act-risk-tiers.md
    evidence: "brief.md §Decision boundary | src/scoring.py:42"
ai_act_obligations_due: <ISO date or null>   # 2026-08-02 if high; 2025-08-02 if GPAI
is_gpai_model: <yes | no | unknown>
gpai_training_summary_required: <yes | no | unknown>
gpai_systemic_risk: <yes | no | unknown>     # Art. 51 ≥10²⁵ FLOPs threshold

# --- Pillar 2: Data category inventory ---
data_categories:                             # list, never flat tags. Empty list permitted only with explicit OQ.
  - id: DC-1                                 # monotonic; no reuse
    label: <data-categories.md label>        # e.g. "pii.contact", "special-category.health"
    pattern_match: <field-patterns.md anchor>   # e.g. "field-patterns.md#critical-sensitivity"
    regulatory_exposure: [eu-ai-act, gdpr, ccpa, hipaa, pci-dss, bipa, coppa, ferpa, glba]
    is_special_category: <yes | no | unknown>   # GDPR Art. 9
    is_children_data: <yes | no | unknown>      # mirrors HF-1 in rubric
    volume_estimate: <low | medium | high | unknown>
    source: <brief.md §X | file:line | user-stated>
    confidence: <high | medium | low>

# --- Pillar 3: Organisational sensitivity ---
org_sensitivity_max: <public | internal | confidential | restricted>
sensitivity_assignments:                     # one entry per data_categories[] item
  - data_category_id: DC-1
    tier: <public | internal | confidential | restricted>
    rationale_anchor: <sensitivity-tiers.md#tier-confidential>

# --- Pillar 4: Lifecycle posture ---
lifecycle_posture:
  ingress_documented: <yes | partial | no | unknown>
  retention_documented: <yes | partial | no | unknown>
  residency_documented: <yes | partial | no | unknown>
  deletion_documented: <yes | partial | no | unknown>
cross_border_transfer: <yes | no | unknown>
transfer_mechanism: <adequacy | sccs | idta | bcr | none | unknown>   # required if cross_border_transfer == yes

# --- Article-evidence flags ---
bias_mitigation_documented: <yes | partial | no | not-applicable>     # Art. 10 high-risk; not-applicable for minimal/limited
transparency_measures_documented: <yes | partial | no>                # Art. 13 (high-risk) + Art. 50/52 (limited)

# --- Regulatory scope ---
regulatory_scope:                            # list of applicable regs; derived from data_categories[].regulatory_exposure
  - eu-ai-act
  - gdpr

# --- Hard-fails: TWO namespaces ---
# HF-N — mirrors rubric.md (carry forward from brief.md when source_brief_slug is set)
hard_fail_signals:
  HF-1: <yes | no | unknown>
  HF-2: <yes | no | unknown>
  HF-3: <yes | no | unknown>

# CHF-N — classification-specific, keys come from bundled regulatory-rules.md
classification_hard_fail_signals:
  CHF-AIA-PROHIBITED: <yes | no | unknown>
  CHF-AIA-HIGHRISK-NO-DATAGOV: <yes | no | unknown>
  CHF-AIA-GPAI-NO-SUMMARY: <yes | no | unknown>
  CHF-GDPR-SPECIAL-NO-BASIS: <yes | no | unknown>
  CHF-GDPR-CHILDREN: <yes | no | unknown>
  CHF-GDPR-XBORDER: <yes | no | unknown>
  CHF-GDPR-NO-LAWFUL-BASIS: <yes | no | unknown>
  CHF-PCI-CVV: <yes | no | unknown>
  CHF-PCI-PAN-PLAINTEXT: <yes | no | unknown>
  CHF-HIPAA-NO-BAA: <yes | no | unknown>
  CHF-HIPAA-NO-AUDIT-READ: <yes | no | unknown>
  CHF-BIPA-NO-CONSENT: <yes | no | unknown>
  CHF-COPPA-UNDER-13: <yes | no | unknown>
  CHF-PASSWORD-PLAINTEXT: <yes | no | unknown>
  CHF-DEL: <yes | no | unknown>
  CHF-LOG-PII: <yes | no | unknown>
  CHF-EXPORT-UNENCRYPTED: <yes | no | unknown>

open_questions:
  - id: OQ-1
    domain: <data-categories | sensitivity | lifecycle | ai-act | cross-border | bias | transparency>
    question: <one-sentence question>
    why_it_matters: <ties to a CHF-id, an HF-id, or a regulatory_scope entry>
---
```

### Field rules

- **`schema_version`**: integer, currently `1`. Bump when adding a
  required key or changing the meaning of an existing one. Optional keys
  added without changing semantics do **not** bump the version.
- **`slug`**: kebab-case, ≤6 words. When `source_brief_slug` is set, the
  classification's slug must equal it. Slug is a stable logical identifier
  carried into the assessment artefacts; it is not a directory namespace
  in v0.1.
- **`source_brief_slug`**: brief slug or `null`. Standalone runs without
  a brief use `null` and surface that in the body's "Use case statement"
  section.
- **`ai_act_risk_tier`**: parameterised against
  [eu-ai-act-risk-tiers.md](../../governance/data-classification/eu-ai-act-risk-tiers.md).
  Five values; `unknown` is acceptable only when `ai_act_tier_evidence`
  is empty AND a matching OQ exists in `domain: ai-act`.
- **`ai_act_obligations_due`**: drawn from the enforcement-date table:
  `2025-02-02` for unacceptable (Article 5 prohibitions already in force —
  any deployment is non-compliant *now*), `2026-08-02` for high-risk,
  `2025-08-02` for GPAI new models, `null` for limited and minimal,
  `null` for `unknown` (placeholder pending tier determination —
  classifier must also raise a matching OQ in `domain: ai-act`; do not
  infer a deadline from an undetermined tier). The agent should compute
  the gap between the current session date and the relevant deadline
  and surface urgency proportionally; for tiers where the deadline is
  in the past, the obligation is live and the finding is RED on the
  legal domain.
- **`data_categories[].label`**: must match a label declared in
  [data-categories.md](../../governance/data-classification/data-categories.md)
  (e.g. `pii.contact`, `special-category.health`), OR the entry must
  carry `confidence: low` plus an OQ.
- **`data_categories[].pattern_match`**: must reference an anchor in
  [field-patterns.md](../../governance/data-classification/field-patterns.md)
  (e.g. `field-patterns.md#critical-sensitivity`), OR
  `confidence: low` + OQ.
- **`org_sensitivity_max`**: highest tier across all
  `sensitivity_assignments[]`. The four tier names are stable —
  see [sensitivity-tiers.md](../../governance/data-classification/sensitivity-tiers.md).
- **`hard_fail_signals`** (HF-N): keys MUST match the hard-fails defined
  in `governance/rubric.md`. When a brief is present, mirror its values.
  Adding a new hard-fail in the rubric automatically adds a new key here
  on the next discovery / classification — no schema edit required.
- **`classification_hard_fail_signals`** (CHF-N): keys come from the
  plugin's `governance/data-classification/regulatory-rules.md` only.
  Every CHF declared there MUST appear here. Adding a new CHF means
  editing `regulatory-rules.md`; changes ship to the next session
  immediately — no schema edit required.
- **`open_questions[].id`**: monotonically `OQ-1`, `OQ-2`, … No reuse,
  no gaps. Reviewers reference these IDs as evidence (e.g.
  `evidence: classification.md OQ-3`).
- **`open_questions[].domain`**: one of the seven listed. Routes the
  question to the right reviewer through `regulatory_scope`.
- **`run_metadata`**: optional in the schema sense (omitting it does not
  fail parsing in v0.1), but the classification skill populates it on
  every run. `governance_pack_version` carries the `version` string
  from `security/.claude-plugin/plugin.json` at run time — drift
  signals that the classification was built against an older rubric or
  CHF catalogue. `repo_commit` is the short SHA of `HEAD` at run time,
  or `null` if the working directory is not a git repo. `scope` is
  free-text rationale for *why* this run happened — keep it under one
  line. `triggered_by` is `skill` for direct `/data-classification`
  invocations, `command` when a command (currently `/governance-assess`
  via soft pre-flight) invoked the skill mid-flow, and `external` for
  future headless callers.

---

## Body sections

The body uses these `## Heading` names, in this order. Reviewers cite by
heading; do not rename without updating reviewer prompts and this schema.

```markdown
# Data Classification

## Use case statement
**Source:** <brief.md slug, OR "Standalone — no discovery brief">

**As submitted (verbatim):** <user's exact one-liner from the CLI; carry
forward from brief.md when source_brief_slug is set>

**Refined:** <2–4 sentences in plain English; what the system actually
does, who uses it, and the decision/action it produces>

## EU AI Act risk-tier determination
**Tier:** <unacceptable | high | limited | minimal | unknown>

**Obligations due:** <2026-08-02 | 2025-08-02 | null>

**GPAI:** <yes | no | unknown> — <if yes, summary required: yes|no>

| Criterion | Article | Evidence |
|---|---|---|
| AIA-HR-04b | Annex III §4(b) | brief.md §Decision boundary; src/scoring.py:42 |

<Brief rationale paragraph. If tier is `high`, surface the 2026-08-02
deadline prominently and list the Art. 10 / Art. 13 / Art. 14 obligations
that fire. If `unacceptable`, name the Art. 5(1)(<x>) practice. If
`unknown`, list the criteria you couldn't evaluate.>

## Data category inventory

| DC-id | Label | Pattern anchor | Regulatory exposure | Special category? | Volume | Source | Confidence |
|---|---|---|---|---|---|---|---|
| DC-1 | pii.contact | #high-sensitivity | gdpr, ccpa | no | high | brief.md §Data flows | high |
| DC-2 | special-category.health | #critical-sensitivity | gdpr, hipaa | yes | medium | src/models.py:88 | medium |

## Organisational sensitivity classification

| DC-id | Tier | Rationale anchor | Required controls (summary) |
|---|---|---|---|
| DC-1 | confidential | sensitivity-tiers.md#tier-confidential | RBAC, encryption at rest, deletion path |
| DC-2 | restricted | sensitivity-tiers.md#tier-restricted | per-read audit, BAA, Art. 9(2) basis |

**Highest tier present:** <restricted>

## Data lifecycle posture

### Sources
**Documented:** <yes | partial | no | unknown>
<Where data originates: user input, third-party API, synthetic, public dataset, internal logs. Cite file:line or brief section.>

### Transformations
<What happens to the data between ingest and use. Embedding? PII redaction? De-identification?>

### Retention
**Documented:** <yes | partial | no | unknown>
<Period or "unknown — see OQ-N">

### Residency
**Documented:** <yes | partial | no | unknown>
<UK / EEA / US / multi-region; storage region; processing region.>

### Deletion
**Documented:** <yes | partial | no | unknown>
<Hard-delete path; cascade to vendors; CCPA Right to Erasure response time.>

## Cross-border transfer details
> Only when `cross_border_transfer != no`.

| Data class (DC-id) | Destination | Mechanism | Evidence |
|---|---|---|---|
| DC-1 | US (vendor: Anthropic) | sccs | EU SCCs Module 1, vendor DPA §4.2 |

## Training data provenance
> Only when `is_gpai_model: yes`.

**Sources:** <list publicly-available datasets, scraped data, licensed corpora>
**Copyright opt-out compliance:** <yes | partial | no | unknown> — <Art. 53(1)(c) evidence>
**Public summary status:** <published | drafted | not started> — <Art. 53(1)(d)>

## Bias detection & mitigation
**Documented:** <yes | partial | no | not-applicable>
<Article 10 evidence: dataset representativeness statements, bias-test references, mitigation logs. Set `not-applicable` only if `ai_act_risk_tier in {minimal, limited}` and no Art. 10 hooks exist.>

## Transparency measures
**Documented:** <yes | partial | no>
<Article 13 (high-risk: instructions for use, performance, limitations, foreseeable risks). Article 50/52 (limited-risk: AI disclosure, deepfake labelling, emotion-recognition notice).>

## Regulatory cross-walk

|   | gdpr | ccpa | hipaa | pci-dss | eu-ai-act |
|---|---|---|---|---|---|
| DC-1 | applies | applies | n/a | n/a | applies (Art. 10) |
| DC-2 | applies (Art. 9) | sensitive PI | applies | n/a | applies (Annex III §1) |

## Hard-fail signals

### Rubric (HF-N)
| Signal | Value | Evidence / OQ |
|---|---|---|
| HF-1 (children's data) | <yes/no/unknown> | <…> |
| HF-2 (unexplained ADM) | <yes/no/unknown> | <…> |
| HF-3 (unsafe transfer) | <yes/no/unknown> | <…> |

### Classification (CHF-N)
| Signal | Value | Evidence / OQ |
|---|---|---|
| CHF-AIA-PROHIBITED | <yes/no/unknown> | <…> |
| CHF-GDPR-SPECIAL-NO-BASIS | <yes/no/unknown> | <…> |
| <…one row per CHF in regulatory-rules.md…> | | |

## Open questions
> Each is also in the frontmatter. Reviewers either resolve via repo
> inspection or surface as AMBER-pending findings with `evidence:
> classification.md OQ-N`.

- **OQ-1 (ai-act):** <question> — affects <CHF-AIA-HIGHRISK-NO-DATAGOV>
- **OQ-2 (lifecycle):** <question> — affects <retention>

## Compliance readiness summary
<One paragraph. State: highest sensitivity tier, AI Act tier, count of
triggered CHF-N and HF-N, count of unresolved OQ-N. No rating, no
recommendation. Reviewer LLMs read this first.>
```

---

## Authoring rules (Data Classification Agent)

- **Cite `file:line` for every repo-derived data-category, transfer,
  retention, or sensitivity claim.** No bare path references.
- **Quote the Article number** when claiming an EU AI Act obligation
  applies (`Annex III §N`, `Art. 10(2)(a)`, `Art. 53(1)(c)`). Reject
  citation-free claims.
- **Never decide `ai_act_risk_tier` from prose alone.** Require ≥1
  `ai_act_tier_evidence` entry, OR set `unknown` with a matching OQ.
- **`data_categories[].pattern_match` must reference an existing anchor
  in bundled `field-patterns.md`**, OR carry `confidence: low` + an OQ.
- **`classification_hard_fail_signals` keys come from bundled
  `regulatory-rules.md` only.** Add one entry per CHF declared there;
  never invent in-line.
- **Mirror the brief verbatim where it overlaps** when `source_brief_slug`
  is set. Use the brief's "As submitted (verbatim)" line; mirror the
  brief's `hard_fail_signals` (`HF-N`) values.
- **Do not write findings, ratings, or recommendations.** Reviewers
  produce judgement; the classification produces facts and structured
  signals.

---

## Consumption rules (orchestrator and reviewers)

- The classification is the authoritative source for data-handling
  judgement alongside `brief.md`. Reviewers do **not** have live repo
  access — `file:line` pointers in the classification are citation
  anchors recorded by classification, not follow-up targets.
- Each unresolved `OQ-N` in a reviewer's domain becomes an AMBER-pending
  finding with `evidence: classification.md OQ-N`.
- A `classification_hard_fail_signals.CHF-… : yes` is **automatic
  RED** for the relevant domain, regardless of other findings. The
  orchestrator names the CHF in the summary.
- Findings must reference the classification when present (a DC-id, a
  CHF-id, the AI Act risk tier, the sensitivity tier, a lifecycle row)
  — the orchestrator's hard rules enforce this.
- When `ai_act_risk_tier: high`, every domain's findings must include
  an EU AI Act consideration referencing the **2026-08-02 enforcement
  deadline**.
