---
title: Use Case Brief Schema
version: 0.1-draft
owner: CISO
last_reviewed: 2026-05-09
---

# Use Case Brief Schema

The `governance/brief.md` artefact produced by the `/governance-discovery`
skill and consumed by the `/governance-assess` command and the five reviewer
subagents. The brief replaces the verbatim use case description as the
primary input to an assessment.

This file is the contract. Discovery follows it; reviewers cite by section
header; `/governance-assess` parses the YAML frontmatter for slug derivation
and metadata.

The brief is **facts and questions, not judgement.** Discovery does not
produce ratings or findings. Open questions are explicit, deterministic,
and deliberately under-determined — reviewers either resolve them with
repo evidence or surface them as AMBER-pending findings.

---

## Required structure

A brief is a single markdown file with two parts:

1. **YAML frontmatter** — machine-readable signals + audit metadata.
2. **Markdown body** — predictable section headers (cited by reviewers).

Both parts are required. A brief missing either fails parsing in
`/governance-assess`.

---

## Frontmatter keys

```yaml
---
schema_version: 1                           # bump on schema-breaking changes
slug: <kebab-case-slug>                     # e.g. claude-cowork-engineering
created_at: <ISO-8601 UTC>                  # e.g. 2026-05-09T14:32:00Z
discovery_iterations: <int>                 # # of conversational turns
target_repo: <URL or empty string>
target_branch: <branch or empty string>     # only if non-default
repo_inspected: <true | false>              # always true in the plugin (live repo)
images_attached:                            # filenames the user uploaded
  - <basename1.png>
  - <basename2.svg>

# Run metadata — what version of the governance pack and what repo state
# produced this artefact. External schedulers read this to decide whether
# the brief is stale. Optional within the schema (schema_version stays 1),
# but the discovery skill populates it on every run.
run_metadata:
  governance_pack_version: "0.2.0"          # from security/.claude-plugin/plugin.json `version`
  repo_commit: <short-sha or null>          # `git rev-parse --short HEAD`; null if not a git repo
  scope: <one-line free text>               # e.g. "initial run", "refresh after vendor change"
  triggered_by: <skill | command | external>

# Discovered signals — short, machine-readable hints. The body is the
# source of truth; these are shortcuts for reviewers and the orchestrator's
# self-check.
ai_vendors:
  - name: <vendor>                          # e.g. anthropic, openai, google
    sdk: <library or empty string>          # e.g. "@anthropic-ai/sdk"
    evidence: <file:line>                   # repo evidence; required when the SDK is in-repo

data_categories:                            # multiple may apply
  - <none | personal | special-category | unknown>

# Hard-fail signals — one entry per hard-fail defined in the bundled
# rubric.md. Keys are HF-IDs from the rubric (HF-1, HF-2, HF-3, …);
# values are yes/no/unknown. Add new keys when the rubric adds new
# hard-fails — no schema edit required.
hard_fail_signals:
  HF-1: <yes | no | unknown>
  HF-2: <yes | no | unknown>
  HF-3: <yes | no | unknown>

# Domain-specific signals not tied to a single hard-fail.
is_workforce_monitoring: <yes | no | unknown>

prior_register_matches: []                  # deprecated in v0.1; always empty list. Will reactivate when cross-run register lands.

open_questions:
  - id: OQ-1
    domain: <privacy | security | legal | workforce | oversight>
    question: <one-sentence question>
    why_it_matters: <one-sentence rationale tied to RAG / hard-fail>
---
```

### Field rules

- **`schema_version`**: integer, currently `1`. Bump when adding a
  required key or changing the meaning of an existing one. Optional keys
  added without changing semantics do **not** bump the version.
- **`slug`**: kebab-case, ≤6 words, derived from the use case (not the
  user's name or team). Stable logical identifier shared with the
  classification and assessment artefacts in the repo's `governance/`
  directory; it is not a directory namespace in v0.1.
- **`created_at`**: ISO-8601 UTC. Auditable timestamp, not for display.
- **`ai_vendors[].evidence`**: repo `file:line` reference (e.g.
  `src/lib/claude.ts:14`). Always populated when the repo contains the
  vendor SDK; never invented — if it isn't a real path, leave the field
  empty and surface the vendor as an open question.
- **`hard_fail_signals`**: a map from hard-fail ID (e.g. `HF-1`) to one
  of `yes`, `no`, `unknown`. The keys MUST match the hard-fails defined
  in the bundled `rubric.md` — if the rubric defines `HF-1`, `HF-2`,
  `HF-3`, the brief must include all three keys. When the rubric adds a
  new hard-fail (e.g. `HF-4`), the brief gains a corresponding key
  automatically — no schema or skill edit needed. `unknown` is correct
  when the user did not confirm and the repo did not reveal — surface a
  matching open question for any `unknown`.
- **`is_workforce_monitoring`**: always one of `yes`, `no`, `unknown`.
  Domain-specific signal kept named because it's referenced directly
  by the workforce reviewer.
- **`prior_register_matches`**: deprecated in v0.1 — always empty list.
  The cross-run register is out of scope for this version; git history
  serves as the audit trail. Field retained in the schema for forward
  compatibility.
- **`open_questions[].id`**: monotonically `OQ-1`, `OQ-2`, … No reuse,
  no gaps. Reviewers reference these IDs as evidence (e.g. `evidence:
  brief.md OQ-3`).
- **`open_questions[].domain`**: one of the five reviewer domains.
  Routes the question to the right reviewer.
- **`run_metadata`**: optional in the schema sense (omitting it does not
  fail parsing in v0.1), but the discovery skill populates it on every
  run. `governance_pack_version` carries the `version` string from
  `security/.claude-plugin/plugin.json` at run time — when the plugin
  publishes a new pack, this drifts and an external scheduler knows the
  brief was built against an older rubric. `repo_commit` is the short
  SHA of `HEAD` at run time, or `null` if the working directory is not
  a git repo; differs from the current SHA means the repo has moved
  since discovery scanned it. `scope` is free-text rationale for *why*
  this run happened — keep it under one line. `triggered_by` is `skill`
  for direct `/governance-discovery` invocations, `command` when a
  command (currently `/governance-assess` via soft pre-flight) invoked
  the skill mid-flow, and `external` for future headless callers.

---

## Body sections

The body uses these `## Heading` names, in this order. Reviewers cite by
heading; do not rename without updating reviewer prompts and this schema.

```markdown
# Use case brief

## Use case statement
**As submitted (verbatim):** <user's exact one-liner from the CLI>

**Refined:** <2–4 sentences in plain English; what the system actually
does, who uses it, and the decision/action it produces>

## Stakeholders and scale
- Intended users: <e.g. "engineering ICs across 3 UK offices, ~120 people">
- Affected individuals: <who else's data flows through; e.g. "Slack
  message authors">
- Owner: <team / role, not a person's name>
- Sponsor: <role>
- Scale: <pilot | team | org | external customers>

## Data flows
- **Inputs:** <each input source, one bullet, with evidence ref where
  applicable>
- **Outputs:** <where output lands; format>
- **Retention:** <stated period or "unknown — see OQ-N">
- **Sharing:** <who else gets the data; sub-processors>
- **International transfer:** <UK-only | EEA | US | unknown>

## AI vendors and SDKs
| Vendor | Model | SDK / library | Evidence |
|---|---|---|---|
| <vendor> | <model name> | <library> | <file:line or empty> |

## Integrations and external systems
- <each external system: role, evidence ref>

## Decision boundary
- What the AI decides: <verbatim or "unknown — see OQ-N">
- Auto-acts vs suggests: <auto-acts | suggests | both>
- Reversibility: <reversible | partial | irreversible>
- Human-in-the-loop: <yes | partial | no | unknown>

## Architecture notes
<prose summary; reference each uploaded diagram by filename, e.g. "see
`architecture-v2.png`">

## Repo pointers per domain
> Where each reviewer should start their grep. Pointers, not substitutes
> for their own search.

- **Privacy hotspots:** <paths>
- **Auth surfaces:** <paths>
- **AI call sites:** <paths>
- **Logging / telemetry:** <paths>
- **Decision/action paths:** <paths>

## Open questions
> Each is also in the frontmatter. Reviewers either resolve via repo
> inspection or surface as AMBER-pending findings with `evidence:
> brief.md OQ-N`.

- **OQ-1 (privacy):** <question> — affects <hard-fail or RAG threshold>
- **OQ-2 (oversight):** <question> — …

## Prior assessments / duplicates
<!-- Optional. Always empty in v0.1 (cross-run register is deferred). Kept for forward compatibility. -->
- <slug-YYYY-MM-DD>.md — <one-line difference vs this submission>
```

---

## Authoring rules (Discovery Agent)

- **Never invent.** If a vendor, data flow, or decision boundary isn't
  visible in the repo and not stated by the user, it's an open question,
  not a claim. Speculation is what causes downstream RAG drift.
- **Cite `file:line` for every repo-derived claim.** The brief is the
  reviewers' citation anchor; weak evidence here weakens the
  downstream assessment, which is graded against
  `grader-rubric.md` §Evidence.
- **Preserve the verbatim user one-liner** in the "As submitted" field.
  Do not paraphrase it away.
- **One open question, one ID.** OQ-1, OQ-2, … No reuse.
- **Do not write findings, ratings, or recommendations.** That is the
  reviewer subagents' job. The brief is facts and questions.

---

## Consumption rules (orchestrator and reviewers)

- The brief is the reviewers' primary evidence base alongside
  `classification.md`. Reviewers may Glob/Grep/Read the user's repo to
  verify a single brief claim when needed, but a verification that
  takes more than one or two reads should become an `OQ` instead. Do
  not silently re-do discovery work mid-review.
- Each unresolved `OQ-N` in a reviewer's domain becomes an AMBER-pending
  finding with `evidence: brief.md OQ-N`.
- Findings must reference the brief in some form (an OQ-id, a data-flow
  item, the vendor list) when a brief is present — the orchestrator's
  hard rules enforce this.
