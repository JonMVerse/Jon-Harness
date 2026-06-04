# security

AI governance for the current repo, as a Claude Code plugin.

Three commands that each produce a committable artefact under `governance/` — the discovery brief, the data classification, and a five-domain assessment (Privacy, Security, Legal, Workforce, Oversight) with explicit RAG ratings, hard-fail tracking, and a DPIA draft when Privacy is amber or red. The commands usually run in sequence; each one also stands alone, and `/governance-assess` will offer to seed missing prerequisites — so you can take the full flow from a single entry point or refresh just one phase as needed.

This is the in-repo replacement for the `security-agent` managed-agents architecture. Same prompts, same governance pack, same schemas — but it runs entirely inside a Claude Code session against the codebase you already have open.

## What it does

| Step | Command | What happens | Output |
|---|---|---|---|
| 1 | `/governance-discovery [optional one-line description]` | Multi-turn intake. Greps the repo for AI vendors / data flows / decision points / leakage vectors and asks the user only what isn't visible. Builds the brief incrementally; finalises on user "accept". | `governance/brief.md` |
| 2 | `/data-classification` | Multi-turn classification. Reads the brief if present (or runs in standalone mode), scans the repo for PII patterns and leakage vectors, asks targeted follow-ups across four pillars (EU AI Act risk tier · data category inventory · sensitivity tier · lifecycle posture). Mirrors `HF-N` from brief; populates `CHF-*` from `regulatory-rules.md`. | `governance/classification.md` |
| 3 | `/governance-assess` | Reads brief + classification, dispatches five reviewer subagents in parallel, aggregates findings mechanically (any `HF-N: yes` or `CHF-…: yes` → RED for that domain), self-checks against the grader rubric. If `brief.md` or `classification.md` is missing, offers to invoke the relevant skill in-line so the full flow runs from this one command. | `governance/assessment.md`, `governance/rag.json`, `governance/findings-{privacy,security,legal,workforce,oversight}.md`, also `governance/deliberation.md` (always — cross-domain council deliberation), conditionally `governance/tickets.md` (if AMBER/RED — split into `## Remediation tickets` and `## Open question tickets` with full decision-grade body per block) and `governance/dpia-draft.md` (if Privacy AMBER/RED) |

### Two ways to drive it

- **End-to-end from one entry point.** Run `/governance-assess` with nothing in `governance/`. It detects the missing brief, offers to invoke `governance-discovery`, walks intake, then offers `data-classification`, walks that, and continues into the assessment. One command, three phases.
- **Phase-at-a-time.** Run each command directly when you want to refresh just one artefact — for example, `/data-classification` after editing a brief OQ, without re-doing discovery or the assessment.

## Components

```
security/
├── commands/
│   └── governance-assess.md          # /governance-assess
├── agents/
│   ├── governance-privacy.md         # owns HF-1 (children's data), HF-3 (cross-border)
│   ├── governance-security.md        # owns CHF-PASSWORD-PLAINTEXT, CHF-LOG-PII, CHF-EXPORT-UNENCRYPTED escalation
│   ├── governance-legal.md           # surfaces 2026-08-02 EU AI Act high-risk deadline
│   ├── governance-workforce.md       # workforce monitoring + biometric / behavioural-PII detection
│   └── governance-oversight.md       # owns HF-2 (unexplained automated decisions)
├── skills/
│   ├── governance-discovery/         # /governance-discovery
│   └── data-classification/          # /data-classification
└── governance/                       # canonical governance pack
    ├── rubric.md                     # HF-1..3 + 5 domains + RAG criteria
    ├── grader-rubric.md              # meta-rubric for self-check
    ├── policies/                     # 5 domain policy slices
    ├── templates/
    │   ├── dpia-template.md                    # DPO-fill template (Privacy AMBER/RED)
    │   ├── remediation-ticket-template.md      # canonical structure for action tickets
    │   └── oq-ticket-template.md               # canonical structure for decision tickets
    └── data-classification/          # CHF-N + AIA-* + V-NN reference content
```

## Output layout

After all three steps, the user's repo contains:

```
governance/
├── brief.md
├── classification.md
├── assessment.md                  # narrative report, summary first
├── rag.json                       # machine-readable outcome
├── findings-privacy.md
├── findings-security.md
├── findings-legal.md
├── findings-workforce.md
├── findings-oversight.md
├── deliberation.md                  # cross-domain council deliberation (Step 5a)
├── tickets.md                     # only if overall is AMBER or RED
└── dpia-draft.md                  # only if Privacy is AMBER or RED
```

These files are intended to be **committed to the repo**, the same way you'd commit a `SECURITY.md` or `THREAT-MODEL.md`. Future repo-cataloguing automation can crawl `governance/assessment.md` across many repos to build a portfolio-level view of governance posture; that's what the standardised location buys.

## Hard-fail tracking

Two namespaces, kept separate:

- **HF-N** (rubric hard-fails) — owned by reviewers. Any `yes` → overall RED.
  - HF-1 children's data (Privacy)
  - HF-2 unexplained automated decisions (Oversight)
  - HF-3 unsafe cross-border transfer (Privacy)
- **CHF-N** (classification hard-fails) — recorded by Classification, escalated by reviewers. Any `yes` → automatic RED for the relevant domain. See `governance/data-classification/regulatory-rules.md` for the catalogue (CHF-AIA-PROHIBITED, CHF-GDPR-SPECIAL-NO-BASIS, CHF-LOG-PII, CHF-EXPORT-UNENCRYPTED, CHF-PCI-CVV, …).

## What it does not do (yet)

- No multi-feature support — single `governance/` directory per repo. If a repo houses multiple AI features, run the flow separately and rename / move the artefacts. Slug-namespacing (`governance/<slug>/...`) is on the roadmap.
- No cross-run memory. Each invocation is fresh. Git history is the audit trail.
- No CI / non-interactive mode. The slash commands assume an interactive Claude Code session. Each artefact does carry a `run_metadata` frontmatter block (governance-pack version, repo commit, scope, triggered_by) so an external scheduler can read it and decide what's stale — a precursor to a headless mode.
- No automatic updates when the repo changes. Re-run the relevant command; `run_metadata.repo_commit` makes it trivial to spot drift.

## Authoring rules (load-bearing)

- **Editing `governance/**/*.md`** ships immediately to the next session — these files are read directly by skills, agents, and the assess command at runtime. No build step.
- **Editing skills (`skills/*/SKILL.md`)** ships immediately too. Both skills are registered in `.claude-plugin/plugin.json` — don't remove them from the `skills` array, that silently disables them (per `tricky-cc-plugins/CLAUDE.md` rule 1).
- **Don't rename CHF-N, V-NN, HF-N, AIA-* anchors** in the governance pack. Schemas (`brief-schema.md`, `classification-schema.md`) cite them by ID; renaming breaks the cross-references.
- **`governance/rubric.md` is the canonical source for hard-fails and assessment domains.** The discovery skill reads it for question priorities; reviewers read it for RAG criteria. Adding a new HF means editing the rubric only; the brief schema's `hard_fail_signals` map adapts automatically.
