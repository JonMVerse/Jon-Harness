# security plugin — AI governance assessment

Discovery → classification → assessment of an AI use case in the user's
current working directory. Three slash commands, five reviewer
subagents, two intake skills, one canonical governance pack.

## Layout

- `.claude-plugin/plugin.json` — manifest; the `skills` array must list every skill directory
- `commands/governance-assess.md` — orchestrator that dispatches the five reviewer subagents in parallel and aggregates per-domain RAGs into an overall RAG + artefact set. Also offers to invoke either intake skill via the Skill tool when its artefact is missing (soft pre-flight) so the full flow can run from this one entry point.
- `agents/governance-{privacy,security,legal,workforce,oversight}.md` — domain reviewers. Each declares `tools: Read, Glob, Grep, Write` (Write is required — they emit `governance/findings-<domain>.md`)
- `skills/governance-discovery/` — multi-turn intake skill; produces `governance/brief.md`
- `skills/data-classification/` — multi-turn intake skill; produces `governance/classification.md`
- `governance/` — canonical content read by the assessment at runtime:
  - `rubric.md` — domains, RAG criteria, hard-fail rules
  - `grader-rubric.md` — what makes a *good* assessment (self-check target)
  - `policies/` — five policy slices (data-classification, ai-usage, security-baseline, workforce-monitoring, human-oversight)
  - `templates/dpia-template.md` — DPO-fill DPIA starter (Privacy AMBER/RED)
  - `templates/remediation-ticket-template.md` — canonical structure for action tickets in `tickets.md`
  - `templates/oq-ticket-template.md` — canonical structure for decision tickets in `tickets.md`
  - `data-classification/` — reference content bundled by the classification skill

See `security/README.md` for the user-facing introduction and the anchor-stability contract.

## Authoring rules (load-bearing)

- **Anchor IDs are stable contracts.** `HF-1..3`, `CHF-*`, `V-01..NN`, `AIA-PR/HR/LR/GP-NN` are referenced from the discovery and classification schemas, the reviewer prompts, and the rubric. Add new IDs at the end; never rename or renumber existing ones.
- **The rubric is the source of truth for aggregation and hard-fails.** Both the orchestrator and the reviewer subagents consume it. When the rules change, the rubric changes — don't fork the logic into multiple prompts.
- **CHF ownership lives in two places that must agree**: the orchestrator's CHF→reviewer mapping (`commands/governance-assess.md`) and each reviewer's "What to read before writing" section. Edit both together.
- **`governance/findings-<domain>.md` is the durable record** of each reviewer's RAG. The JSON block returned in a subagent's message is a convenience handoff — if they disagree, the file wins.
- **Reviewers may verify a single brief claim** via Glob/Grep/Read, but verifications needing more than one or two reads must become an `OQ` rather than silent re-discovery.
- **Bump `.claude-plugin/plugin.json` `version` whenever you change anything under `governance/`** (rubric, policies, CHF catalogue, templates, classification reference content). Artefacts record this version into their `run_metadata.governance_pack_version` so external schedulers can detect when a brief / classification / assessment was produced against an older pack. Skipping the bump silently breaks staleness detection.
- **Ticket-template structure lives in three places that must agree**: the two `governance/templates/*-ticket-template.md` files, the orchestrator's `commands/governance-assess.md §How to compose each ticket body` block, and `governance/grader-rubric.md §5 Outputs on disk`. When changing a ticket section's name, presence, or required content, edit all three together. Same coupling pattern as the CHF-ownership rule above.
