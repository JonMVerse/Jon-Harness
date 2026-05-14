---
name: atlas-ai-assessment
description: "AI governance and lifecycle assessment for the Atlas platform. Use when the user says 'atlas assessment', 'assess atlas', 'ai assessment', 'review atlas ai', 'atlas governance', or asks about Atlas AI requirements, capabilities, models, harm, bias, safety, risk, testing, privacy, explainability, feedback, or model cards. Works from the Atlas codebase at ~/Documents/GitHub/atlas."
user-invocable: true
---

# Atlas AI Assessment

Structured assessment of the Atlas AI system across its full lifecycle — development, deployment, and operations. Covers the 16 topic areas below. Claude picks the relevant area(s) based on the user's question, or runs all areas when a full assessment is requested.

---

## Context

**What Atlas is:** A Phoenix/Elixir + React platform that provides AI-powered chat assistance, contextual prompt suggestions, semantic search (RAG), thread summarisation, and project ideation for Multiverse apprentices, candidates, and learners.

**Codebase location:** `~/Documents/GitHub/atlas`

**Key AI entry points:**
- `lib/atlas/bots/` — bot configuration and system prompt management
- `lib/atlas/copilot/` — learning copilot (page-contextual prompt generation)
- `lib/atlas/open_ai/` — central LLM integration layer (LangChain, embeddings, summariser, tool calling)
- `lib/atlas/rag/` — RAG pipeline (chunking, embedding ingestion)
- `lib/atlas/messages/` — message flow including bot responses and feedback
- `docs/` and `documentation/` — developer docs and component specs

---

## Assessment Areas

### 1. AI Requirements

**What to look for:** Formal or implicit statements of what the AI system must do.

**Process:**
1. Read `documentation/project_overview.md` and `documentation/architecture.md` for the stated purpose.
2. Read `docs/features/learning-copilot.md`, `docs/features/llm-functions.md`, `docs/features/alas-chat-actions.md` for feature-level requirements.
3. Check `adrs/` for any requirements-shaping decisions.

**Report on:**
- Is there a standalone AI requirements document? (Currently: No)
- What are the implicit requirements derivable from the product?
- What user needs drive the AI features?
- Gap: absence of explicit, versioned requirements means there is no baseline to test against.

---

### 2. AI Capabilities

**What to look for:** The distinct AI functions the system performs.

**Current capabilities (verify each still exists):**

| Capability | Primary files |
|---|---|
| Atlas Bot (LLM chat) | `lib/atlas/bots/`, `lib/atlas/messages/messages.ex` |
| Learning Copilot | `lib/atlas/copilot/page_prompt_generator.ex` |
| RAG (semantic search) | `lib/atlas/rag/`, `lib/atlas/open_ai/functions/` |
| Thread Summariser | `lib/atlas/channels/thread_summariser_worker.ex` |
| Tool Calling | `lib/atlas/open_ai/functions/` (intercom_search, ksb_search, learning_objectives_search) |
| Project Ideas | `lib/atlas/project_ideas/project_ideas_generator.ex` |
| AI Message Summaries | `client/src/components/messaging/MessageSummaryBottomSheet.tsx` |

**Report on:** What each capability does, its trigger, and its user-facing purpose.

---

### 3. Integrated Models

**What to look for:** Which LLMs and embedding models are in use, via which access routes.

**Process:**
1. Read `lib/atlas/open_ai/open_ai.ex` — look for model name constants and ChatOpenAI struct construction.
2. Read `config/runtime.exs` lines 177-188 — endpoint and key configuration.
3. Read `documentation/specs/EXT_OpenAi.md` for the summary.

**Current models (verify):**
- Chat: GPT-4o, GPT-4.1, GPT-5, GPT-5.2 variants via AI Service Proxy (Pantheon/LiteLLM)
- Embeddings: `text-embedding-3-small` via Azure OpenAI
- Model selection gated by ConfigCat feature flags (e.g. `use_gpt_5_mini?`)

**Report on:** Model versions, routing, selection logic, and any version-lock risks.

---

### 4. Affected Populations

**What to look for:** Who interacts with or is affected by the AI features.

**Process:**
1. Read `adrs/0001-unified-user-authorisation-for-atlas.md` for user type definitions.
2. Read `lib/atlas/bots/system_messages/system_message_params.ex` for per-user-type prompt logic.
3. Check `lib/atlas/feature_flags.ex` for population-specific feature gating.

**Current populations (verify):**
- Apprentices (levy) — primary; receive personalised bot responses
- Candidates (programme applicants) — candidate-specific system prompt
- SaaS learners — deprecated pathway, still code-present
- Coaches/guides — receive AI-generated conversation summaries
- Employers — indirect (apprenticeship data feeds prompt context)
- Staff — access with levy prompt, admin route access

**Report on:** Whether a formal affected-population impact analysis exists (currently: No). Differential treatment across user types.

---

### 5. Harm Assessments

**What to look for:** Documentation or tooling that identifies and mitigates potential harms.

**Process:**
1. Search `docs/` and `documentation/` for any harm, safety, or ethics documents.
2. Check `lib/atlas/open_ai/errors.ex` for content filter handling.
3. Check `lib/atlas/open_ai/open_ai.ex` for content filter detection in the run loop.

**Current state:**
- Azure OpenAI content filter detection present — content filter errors are not retried
- User-type gating limits AI access to authorised users
- Feature flag control per user
- No dedicated harm assessment, red-teaming, or adversarial content testing found

**Report on:** What mitigations exist, what is absent, and what harms are unaddressed (hallucination to learners, inappropriate advice on apprenticeship matters, prompt injection via RAG content).

---

### 6. Data Quality

**What to look for:** How the data feeding the AI is validated, refreshed, and monitored.

**Process:**
1. Read `lib/atlas/intercom/source_embedding_worker.ex` — Intercom sync and embedding refresh.
2. Read `lib/atlas/learning_objectives/learning_objective_embedding_worker.ex` — LO embedding with hash-based change detection.
3. Check `config/runtime.exs` for cron schedules.

**Current state:**
- Intercom knowledge base synced hourly 9am–5pm weekdays
- Embeddings use SHA-256 content hash to skip unchanged content
- No data quality SLAs, drift monitoring, or retrieval accuracy metrics

**Report on:** Freshness, validation, and monitoring gaps for each data source feeding the AI.

---

### 7. Risk Assessments per Lifecycle Stage

**What to look for:** Documented risks at design, development, testing, deployment, operation, and retirement stages.

**Process:**
1. Read `documentation/project_overview.md` — "Risks, Constraints, and Assumptions" section.
2. Read `adrs/` for risk-motivated decisions.
3. Check `documentation/verification_report.md` for unresolved gaps.

**Current state:**
- Risks noted in project overview: embedding vendor lock, AI service coupling, no lifecycle-stage framework
- ADRs 0001-0004 address specific technical decisions, not AI risk governance

**Report on:** Which risks are identified, which lifecycle stages lack coverage, and whether there is a risk register or review process.

---

### 8. Test, Evaluation, Verification & Validation (TEVV) Plan

**What to look for:** A plan for how AI outputs are tested and validated.

**Process:**
1. Read `documentation/concerns/Testing_UnitTesting.md`, `Testing_IntegrationTesting.md`, `Testing_EndToEndTesting.md`.
2. Look in `test/atlas/open_ai/` for AI-specific tests.
3. Check `build_pipeline/` for CI steps.

**Current state:**
- ExUnit for backend, Vitest + Playwright for frontend, Percy for visual regression
- LLM function tests in `test/atlas/open_ai/functions/` using Mimic to mock OpenAI
- No AI-specific TEVV plan, no prompt regression suite, no golden-set evaluation

**Report on:** What testing exists for AI components vs. what is absent. Highlight the lack of output quality benchmarks and prompt regression testing.

---

### 9. Bias Testing

**What to look for:** Evidence that the system has been tested for differential performance across demographic groups or user types.

**Process:**
1. Search `test/` for any bias, fairness, or demographic evaluation.
2. Check `docs/` and `documentation/` for any bias or equity documentation.
3. Check if prompts differentiate by user type in ways that could disadvantage groups.

**Current state:** No evidence of bias testing found anywhere in the codebase or documentation.

**Report on:** Absence of bias testing, and which axes are most at risk (user type, programme type, employer size, geographic region).

---

### 10. Performance Metrics

**What to look for:** How AI output quality and system performance are measured.

**Process:**
1. Read `documentation/concerns/Observability_Metrics.md` and `Observability_Tracing.md`.
2. Read `documentation/specs/EXT_OpenAi.md` observability section.
3. Read `docs/observability.md`.

**Current state:**
- Token usage (input/output) tracked via OpenTelemetry → Langfuse and Datadog
- Prompt name/version linked to each generation via OTel attributes
- No AI-specific performance benchmarks: accuracy, relevance, hallucination rate, embedding retrieval quality

**Report on:** What is measured vs. what is needed for responsible AI operation.

---

### 11. Model Testing

**What to look for:** Testing that validates model behaviour, not just code behaviour.

**Process:**
1. Read `test/atlas/open_ai/` directory.
2. Check for any eval frameworks or golden-set test fixtures.

**Current state:**
- Tool calling functions have unit tests using Mimic (mocked OpenAI responses)
- No prompt regression suite, no golden-set evaluation, no output quality benchmarks
- Tests validate code paths, not model output quality

**Report on:** The gap between code-level testing and model-level evaluation.

---

### 12. Safety Testing

**What to look for:** Tests for harmful, unsafe, or unintended model outputs.

**Process:**
1. Check `build_pipeline/` for any safety-specific CI steps.
2. Check `test/` for prompt injection, jailbreak, or output safety tests.
3. Read `documentation/concerns/SecuritySensitiveSurfaces.md`.

**Current state:**
- Sobelow for general Elixir security scanning in CI
- Content filter handling in `lib/atlas/open_ai/errors.ex`
- No AI-specific safety tests: no prompt injection, jailbreak, or output safety benchmarks

**Report on:** What safety testing exists, and what is needed (especially given RAG content that could introduce indirect injection).

---

### 13. AI Security Tests

**What to look for:** Security testing specific to LLM attack surfaces.

**Process:**
1. Read `documentation/concerns/SecuritySensitiveSurfaces.md`.
2. Check `lib/atlas_web/controllers/langfuse_controller.ex` for prompt deployment security.
3. Examine the RAG pipeline for indirect injection risk via Intercom content.

**Current state:**
- Langfuse webhook signature verification protects prompt deployment
- Sobelow covers general Elixir security
- No LLM-specific security testing: no prompt injection, indirect injection via RAG, model extraction, or data exfiltration tests

**Report on:** The specific LLM attack surfaces present in Atlas and whether any are tested.

---

### 14. AI PIAs, Anonymisation, or Differential Privacy

**What to look for:** Privacy Impact Assessments, data anonymisation, or differential privacy for AI processing.

**Process:**
1. Read `docs/testing-with-production-data.md` for anonymisation tooling.
2. Check `scripts/copy_anonymised_db` for the anonymisation strategy.
3. Search `docs/` and `documentation/` for any PIA or privacy documentation.

**Current state:**
- `scripts/copy_anonymised_db` anonymises emails, names, etc. before developer access to production data
- Anonymiser strategy validated in CI
- No PIA documentation for AI features
- No differential privacy implementation
- Personal data (name, employer, job title, ULN, programme) is injected directly into system prompts

**Report on:** What privacy protections exist, and what is absent — particularly for personal data in prompts.

---

### 15. Model Registry, Model Cards, and Explainability

**What to look for:** A registry of models in use, model cards describing their properties, and mechanisms for explaining AI decisions to users.

**Process:**
1. Check `adrs/` for any model governance decisions.
2. Read `docs/system-prompts.md` for the prompt versioning system.
3. Check the frontend for any AI disclosure or explainability features.

**Current state:**
- No model registry or model cards
- System prompts versioned in Langfuse (closest thing to a prompt registry) — name + version linked to traces
- 4 ADRs: authorisation, prompt placeholders, automatic prompt deployment, agentic language — no AI ethics or model governance ADRs
- No learner-facing explainability: learners cannot see which model responded, what prompt was used, or why a particular answer was generated

**Report on:** What exists vs. what responsible AI practice requires at each maturity level.

---

### 16. Learner Feedback on AI Features

**What to look for:** Mechanisms for users to provide feedback on AI outputs, and evidence that this feedback improves the system.

**Process:**
1. Read `lib/atlas/messages/feedback.ex` — the message feedback schema.
2. Check `lib/atlas_web/schema/messaging.ex` and resolvers for the feedback GraphQL API.
3. Check `config/config.exs` for the `chat_message_feedback` RabbitMQ publisher.
4. Look for any feedback analysis tooling or process documentation.

**Current state:**
- `message_feedback` table: `helpful` boolean + optional free-text `content`, linked to user and message
- Chat action clicks tracked (6 action types) via `ActionTakenOnMessage` mutation
- Both signals published downstream via RabbitMQ (`chat_message_feedback`, `chat_customer_survey`)
- No documented process for how feedback is reviewed, aggregated, or used to improve prompts/models
- No feedback loop from Langfuse or Datadog back to prompt authors

**Report on:** What feedback is collected, where it goes, and the gap between collection and improvement.

---

## Full Assessment Mode

When the user asks for a complete assessment (e.g. "run the full atlas ai assessment"):

1. Work through all 16 areas in order.
2. For each area, read the relevant files before reporting — don't rely solely on this document.
3. After completing all areas, produce a **Gap Summary Table**:

```markdown
| Assessment Area | Evidence Present | Gaps |
|---|---|---|
| AI requirements | ... | ... |
| AI capabilities | ... | ... |
| Integrated models | ... | ... |
| Affected populations | ... | ... |
| Harm assessments | ... | ... |
| Data quality | ... | ... |
| Risk assessments | ... | ... |
| TEVV plan | ... | ... |
| Bias testing | ... | ... |
| Performance metrics | ... | ... |
| Model testing | ... | ... |
| Safety testing | ... | ... |
| AI security tests | ... | ... |
| PIAs / anonymisation | ... | ... |
| Model registry / explainability | ... | ... |
| Learner feedback loop | ... | ... |
```

4. Close with a **Priority Recommendations** list — the 3-5 highest-value actions to close the most critical gaps, ordered by risk.

---

## Rules

- Always read the relevant source files before reporting on an area — don't assert from memory alone.
- Distinguish between **present** (evidence exists), **partial** (some evidence, gaps remain), and **absent** (no evidence found).
- When something is absent, say so directly. Do not soften gaps with hedging.
- Reference specific files and line numbers for every finding.
- If the user asks a question that doesn't fit a named area, apply the same approach: read first, then report with evidence.
- The assessment covers the codebase only. It cannot tell you what exists in external systems (Langfuse config, Datadog dashboards, Confluence docs) unless the user provides access or pastes content.
