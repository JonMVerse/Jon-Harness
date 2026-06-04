---
name: data-classification
description: Multi-turn classification conversation that produces governance/classification.md for the AI feature in the current repo. Use when the user wants to classify data against EU AI Act risk tiers, data category inventories with regulatory cross-walk (GDPR / CCPA / HIPAA / PCI-DSS / BIPA / COPPA / FERPA / GLBA), organisational sensitivity tiers, and data lifecycle posture (retention, residency, cross-border transfer, training-data provenance, bias mitigation). Designed to run after /governance-discovery (consuming governance/brief.md), but supports a standalone "no brief" mode for retroactive classification. Outputs facts and structured signals only — never findings, ratings, or recommendations.
user-invocable: true
---

# Data Classification

Through a multi-turn conversation with the submitter **and a deep read of the current repository**, produce a structured `governance/classification.md` that downstream governance reviewers will consume as mandatory input alongside the discovery brief.

This skill produces **facts, structured signals, and explicit open questions** — not ratings, findings, or recommendations. Judgement happens later in `/governance-assess`.

## What this skill produces

A single file at `governance/classification.md` (relative to the user's current working directory). It must conform to the schema in [classification-schema.md](classification-schema.md) — read that file before the first turn. Its YAML frontmatter and body sections are the contract the artefact must follow.

## Source of truth: bundled governance content

Six files at `../../governance/data-classification/` define the parameterised content the schema references. **Read them before the first turn:**

- `../../governance/data-classification/eu-ai-act-risk-tiers.md` — the four risk tiers (`unacceptable | high | limited | minimal`), criterion IDs (`AIA-PR-NN`, `AIA-HR-NN`, `AIA-LR-NN`, `AIA-GP-NN`), Article quotes, and the **enforcement-date table**. High-risk obligations enforce **2026-08-02** — surface this date prominently when `ai_act_risk_tier: high`.
- `../../governance/data-classification/data-categories.md` — canonical category labels used in `data_categories[].label`. PII / special-category / sector-specific / AI-specific.
- `../../governance/data-classification/sensitivity-tiers.md` — Public / Internal / Confidential / Restricted with stable anchors and required-control bullets per tier.
- `../../governance/data-classification/regulatory-rules.md` — the **classification hard-fail rules**, parameterised as `CHF-N` IDs. Every CHF declared here MUST appear as a key in the artefact's `classification_hard_fail_signals` map.
- `../../governance/data-classification/field-patterns.md` — PII field-name patterns with stable anchors (`#critical-sensitivity`, `#high-sensitivity`, `#lower-sensitivity`, `#indirect-abbreviated`). Used when matching repo fields against known PII categories.
- `../../governance/data-classification/leakage-vectors.md` — repo-scan checklist for the lifecycle pillar (logging, error handling, analytics, caching, external APIs, serializers, file storage, config). Used by `CHF-LOG-PII`.

## Source of truth: rubric-derived hard-fails

The discovery brief carries `hard_fail_signals` keyed by `HF-N` from `../../governance/rubric.md`. **Mirror those keys into the classification artefact's `hard_fail_signals` map** so reviewers can compare brief and classification side-by-side. The classification's own `classification_hard_fail_signals` map (`CHF-N`) is **separate** — never collapse the two namespaces.

When `CHF-GDPR-CHILDREN: yes`, also set `HF-1: yes`. When `CHF-GDPR-XBORDER: yes`, also set `HF-3: yes`. The classification carries both views; reviewers downstream cite whichever maps to their domain.

## What this skill expects

The current working directory **is** the target repository. Use `Glob`, `Grep`, and `Read` to inspect it directly. Inputs available per session:

- `governance/brief.md` from a prior `/governance-discovery` run, when present — read it first and only ask follow-ups for the four classification pillars where the brief is silent. When absent, set `source_brief_slug: null` and ask the minimum discovery-style intake to populate classification fields — do not re-do full discovery; point the user to `/governance-discovery` if the use case warrants it.
- The submitter's verbatim use-case description.
- The repo on disk — read it.
- Optional architecture diagrams / screenshots (the user may attach them).

Set `repo_inspected: true` in the frontmatter — repo access is the whole point of running classification here.

## Conversation contract

1. **Open with acknowledgement, not interrogation.** Restate the system in plain language. Briefly say what comes next (read the brief if present, scan the repo, then ask focused questions for the four pillars).
2. **Read the brief first when present.** Read `governance/brief.md` end-to-end and surface the slug, vendors, data flows, and unresolved `OQ-N`s. Note which classification pillars the brief already covers.
3. **Do the cheap reads next.** Scan the repo for fields matching `field-patterns.md` and for leakage vectors from `leakage-vectors.md`. Surface what was found; do not assume.
4. **Ask in batches of ≤5 questions per turn, ranked by impact.** Hard-fail-relevant questions go first — see `regulatory-rules.md` for the authoritative `CHF-*` catalogue. Then EU AI Act tier determination. Then data categories. Then sensitivity tier. Then lifecycle posture.
5. **Build the artefact incrementally.** After each turn, write or update `governance/classification.md`. Confirm to the user what changed.
6. **Propose, then iterate.** When the artefact looks complete:
   - Finalise the draft.
   - Tell the user: "Classification ready for review. Reply 'accept' to finalise, or tell me what to change."
   - Wait for their response.
7. **On acceptance, confirm and stop.** The classification is the artefact; the caller decides what runs next.

## Hard rules

1. **Cite `file:line` for every repo-derived data-category, transfer, retention, or sensitivity claim.** Use the path as it appears in the repo (e.g. `src/db/models.py:42`), never absolute paths. *Prevents inferring facts from PR descriptions and treating inferences as evidence.*
2. **Quote the Article number** when asserting an EU AI Act obligation applies (`Annex III §4(b)`, `Art. 10(2)(a)`, `Art. 53(1)(c)`). Reject phrases like "high-risk under the AI Act" without an Article citation. *Prevents tier inflation by vibes.*
3. **Never decide `ai_act_risk_tier` from prose alone.** Require at least one entry in `ai_act_tier_evidence`, OR set tier to `unknown` with a matching OQ in `domain: ai-act`. *Prevents guessing "limited" because the system "feels low-stakes."*
4. **`data_categories[].pattern_match` must reference an existing anchor in `field-patterns.md`** (e.g. `#critical-sensitivity`), OR the entry must carry `confidence: low` and an OQ. *Prevents inventing categories the schema cannot validate.*
5. **`classification_hard_fail_signals` keys come from `regulatory-rules.md` only.** Add one entry per CHF declared there; never invent in-line. If a CHF is missing from the artefact, that's a bug — record it. *Mirrors the HF-N → rubric.md contract.*
6. **When `source_brief_slug` is set, do not re-elicit facts the brief already records.** Read `governance/brief.md` first; only ask follow-ups for the four classification pillars where the brief is silent. Mirror the brief's `hard_fail_signals` (`HF-N`) into the classification. *Prevents user thrash from a downstream skill re-asking what discovery already captured.*
7. **Produce facts and structured signals — not findings, ratings, or recommendations.** Reviewer subagents (Privacy / Security / Legal / Workforce / Oversight) consume this artefact alongside the brief as their primary input. *Prevents pre-judging the assessment, which would collapse separation of duties.*
8. **The artefact lives at `governance/classification.md` in the user's working directory.** If the directory doesn't exist, create it. If `governance/classification.md` already exists, ask the user: "An existing `classification.md` was found. (1) overwrite, (2) back up to `classification.md.bak-<YYYY-MM-DD-HHMM>` and start fresh, or (3) treat as a different use case (rename old to a slug-based filename) — which?" Wait for the choice before proceeding.
9. **Apply CHF chain rules from `regulatory-rules.md`.** Some CHFs trigger others: `CHF-LOG-PII: yes` with PHI in scope implies `CHF-HIPAA-NO-AUDIT-READ: yes`; `CHF-GDPR-CHILDREN: yes` implies `HF-1: yes` (already documented separately in `regulatory-rules.md`); `CHF-GDPR-XBORDER: yes` implies `HF-3: yes` (likewise). When setting a primary CHF, walk the chain and update derivatives in the same artefact. *Prevents partial classification where one root cause produces only one signal.*
10. **Populate `run_metadata` at finalisation.** `governance_pack_version` from `security/.claude-plugin/plugin.json` `version`; `repo_commit` from `git rev-parse --short HEAD` (or `null` if not a git repo); `scope` as a one-line summary of this run (`initial run`, `refresh after AI Act tier change`, etc.); `triggered_by: skill` for direct slash-command invocations, or whatever value the calling command instructed when the skill was invoked via soft pre-flight. See `classification-schema.md` for field rules. *Lets external schedulers detect stale artefacts without re-running the skill blind.*
