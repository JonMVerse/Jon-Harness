# Data classification governance

Reference content for the **Data Classification skill** (`skills/data-classification/`).

These files are read at runtime by the skill (and cross-referenced by reviewer
subagents through the `classification.md` artefact). They are the authoritative
source for:

- EU AI Act risk-tier criteria (`eu-ai-act-risk-tiers.md`)
- Data category taxonomy (`data-categories.md`)
- Organisational sensitivity tiers + control implications (`sensitivity-tiers.md`)
- Classification hard-fail rules — `CHF-N` IDs (`regulatory-rules.md`)
- PII field-name patterns (`field-patterns.md`)
- PII leakage vectors for repo-scan checks (`leakage-vectors.md`)

Reviewer subagents do not load these files directly — the `classification.md`
artefact carries the per-system classification *result*, and reviewers cite
anchors from this reference content *through* the classification artefact.

## Editing

Edits here ship to the next `/data-classification` session immediately — there
is no build step. The `CHF-N`, `V-NN`, and `AIA-*` anchor IDs are stable
contracts referenced by `classification-schema.md`; add new IDs at the end,
never rename or renumber existing ones.
