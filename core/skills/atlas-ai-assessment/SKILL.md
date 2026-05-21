---
name: atlas-ai-assessment
description: "AI governance and lifecycle assessment for the Atlas-2 platform. Use when the user says 'atlas assessment', 'assess atlas', 'ai assessment', 'review atlas ai', 'atlas governance', or asks about Atlas AI requirements, capabilities, models, harm, bias, safety, risk, testing, privacy, explainability, feedback, or model cards. Works from the Atlas-2 codebase at Multiverse-io/atlas-2 (GitHub) or locally if cloned."
user-invocable: true
---

# Atlas AI Assessment

Structured assessment of the Atlas-2 AI system across its full lifecycle — development, deployment, and operations. Covers the 16 topic areas below. Claude picks the relevant area(s) based on the user's question, or runs all areas when a full assessment is requested.

---

## Context

**What Atlas-2 is:** A Next.js 16 + TypeScript rebuild of the Multiverse Atlas platform. Provides AI-powered chat assistance (apprentice ↔ Atlas), semantic knowledge retrieval (RAG over Learning Objectives + Intercom KB with citations), and project ideation for Multiverse apprentices, candidates, and learners. Built with the Vercel AI SDK and Anthropic Claude models.

**Codebase:** `Multiverse-io/atlas-2` on GitHub. Read files via `gh api "repos/Multiverse-io/atlas-2/contents/<path>"` or directly if a local clone exists.

**Key AI entry points:**
- `src/agent/atlas/config.ts` — model selection, temperature, max steps
- `src/agent/atlas/prompts.ts` — system prompts with semantic versioning
- `src/agent/atlas/index.ts` — agent entrypoint (`runAtlasAgent`)
- `src/agent/resilience.ts` — `resilientStreamText` wrapper (fallback + retry)
- `src/agent/token-tracking.ts` — usage logging
- `src/tools/definitions/` — SDK-agnostic tool definitions (Zod schemas + execute functions)
- `src/app/api/chat/route.ts` — chat streaming endpoint (SSE)
- `src/lib/retrieval.ts` — `fetchKnowledgeSources` (LLM-as-retriever pattern)
- `src/db/schema.ts` — Drizzle ORM table definitions
- `docs/epics/PERSONAS.md` — the five user personas
- `docs/epics/ARCHITECTURE.md` — system shape and request lifecycle
- `steering/` — coding conventions, tool standards, error handling, security

---

## Assessment Areas

### 1. AI Requirements

**What to look for:** Formal or implicit statements of what the AI system must do.

**Process:**
1. Read `docs/epics/README.md` — the two-bucket epic index (prototype vs post-prototype).
2. Read `docs/epics/prototype/E07-atlas-ai-conversation/README.md` — chat surface requirements.
3. Read `docs/epics/prototype/E08a-source-ingestion-embedding-pipeline/README.md` and `E08b-retrieval-rag-tools/README.md` — RAG requirements.
4. Read `docs/epics/prototype/E11-project-ideation-flow/README.md` — ideation requirements.
5. Read `CLAUDE.md` and `AGENTS.md` at repo root for the overarching architectural intent.

**Report on:**
- Is there a standalone AI requirements document? (Currently: No — requirements are embedded in epic READMEs)
- What are the implicit requirements derivable from the prototype scope?
- What user needs drive each AI feature?
- Gap: no explicit, versioned requirements document means there is no formal baseline to test against.

---

### 2. AI Capabilities

**What to look for:** The distinct AI functions the system performs.

**Current capabilities (verify each still exists):**

| Capability | Primary files |
|---|---|
| Conversational Chat | `src/agent/atlas/index.ts`, `src/app/api/chat/route.ts` |
| Knowledge Retrieval (RAG) | `src/tools/definitions/search-knowledge.ts`, `src/lib/retrieval.ts` |
| Programme Look-up | `src/tools/definitions/look-up-programme.ts` |
| Project Ideation | `src/tools/definitions/generate-project-ideas.ts` |
| Inline Citation Rendering | `src/agent/atlas/prompts.ts` (citation rules), client SSE parsing |

**Report on:** What each capability does, its trigger, and its user-facing purpose. Note that E09 (page-context / Copilot + Spotlight) and E22 (prompt registry) are prototype scope but not yet implemented.

---

### 3. Integrated Models

**What to look for:** Which LLMs and embedding models are in use, via which access routes.

**Process:**
1. Read `src/agent/atlas/config.ts` — model name constants, temperature, maxSteps.
2. Read `src/agent/resilience.ts` — fallback model and retry logic.
3. Read `package.json` — AI SDK versions (`ai`, `@ai-sdk/anthropic`).
4. Check `.env.example` or `src/lib/langfuse.ts` for any environment variable hints.

**Current models (verify):**
- Primary chat: Claude Sonnet 4.6 (`claude-sonnet-4-6`) via Vercel AI SDK + Anthropic
- Fallback chat: Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)
- Embeddings: not yet implemented in prototype (E08a deferred to production; demo uses in-memory LLM-as-retriever)
- Temperature: 0.4; maxSteps: 4

**Report on:** Model versions, fallback routing, whether model selection is configurable, and any version-lock risks. Note that the embedding pipeline (E08a) is deferred — no embedding model is currently wired.

---

### 4. Affected Populations

**What to look for:** Who interacts with or is affected by the AI features.

**Process:**
1. Read `docs/epics/PERSONAS.md` — the five personas, their JTBD, and surface scope.
2. Read `src/agent/atlas/prompts.ts` — does the system prompt differentiate by user type?
3. Check `src/db/schema.ts` — does the `users` table have a role column?

**Current populations (verify):**
- Apprentices — primary; receive AI chat, RAG, and ideation responses
- Candidates (programme applicants) — out of scope for prototype; E04 covers fixture variants
- Coaches / Guides — read-only oversight (no AI-generated content directed at them in prototype)
- Instructors — content authors; verify Learning Objectives feed RAG
- Managers — Multiverse staff; feature flag admin in E06

**Report on:** Whether a formal affected-population impact analysis exists (currently: No). Whether the system prompt differentiates treatment across user types. Whether E04 fixture variants for apprenticeship lifecycle states are implemented.

---

### 5. Harm Assessments

**What to look for:** Documentation or tooling that identifies and mitigates potential harms.

**Process:**
1. Read `src/agent/atlas/prompts.ts` — look for safeguarding, harm, or safety instructions in the system prompt.
2. Search `docs/` and `steering/` for any harm, safety, or ethics documents.
3. Read `steering/SECURITY_STANDARDS.md` for relevant protections.
4. Check `src/agent/resilience.ts` for error handling on safety-blocked responses.

**Current state:**
- System prompt (v1.1.0) includes tool guidance and citation rules — verify whether it includes safeguarding instructions (coach referral, safeguarding contacts)
- No dedicated harm assessment, red-teaming, or adversarial content testing found
- No harm register documenting covered vs. uncovered scenarios
- Prototype uses fixture users — no real apprentice data at risk yet

**Report on:** What safety instructions are in the prompt, what mitigations exist at the infrastructure level, and what is absent. Note that prototype scale limits immediate risk but safeguarding instructions should be established before any real users interact.

---

### 6. Data Quality

**What to look for:** How the data feeding the AI is validated, refreshed, and monitored.

**Process:**
1. Read `src/db/seed.ts` — fixture content seeded into the knowledge corpus.
2. Read `src/db/schema.ts` — `sources` table structure.
3. Read `src/lib/retrieval.ts` — how knowledge sources are fetched and ranked.
4. Check `docs/epics/prototype/E08a-source-ingestion-embedding-pipeline/README.md` — what the production pipeline will look like.

**Current state:**
- Demo: 5 Learning Objectives seeded as fixture content in `db/seed.ts`
- Production embedding pipeline (pgvector, one-shot embed script, Anthropic embeddings) is E08a — not yet implemented
- No data quality SLAs, drift monitoring, or retrieval accuracy metrics
- LLM-as-retriever pattern in `retrieval.ts` is a demo approximation, not production-grade semantic search

**Report on:** Freshness, validation, and monitoring gaps for each data source. Distinguish demo state from the intended production architecture described in E08a.

---

### 7. Risk Assessments per Lifecycle Stage

**What to look for:** Documented risks at design, development, testing, deployment, operation, and retirement stages.

**Process:**
1. Read `docs/TECH_DECISIONS.md` — ADR log for risk-motivated decisions.
2. Read `docs/epics/prototype/E01-system-architecture-conventions/README.md` — architectural risk signals.
3. Check `steering/` for any risk governance documents.

**Current state:**
- No formal AI risk register or lifecycle-stage risk framework
- ADRs (if any) address technical decisions, not AI risk governance
- Prototype stage: risks are primarily about demonstrating multi-agent viability before production commitment

**Report on:** Which risks are identified (vendor lock-in, model version drift, RAG content quality, safeguarding), which lifecycle stages lack coverage, and whether there is a risk review process.

---

### 8. Test, Evaluation, Verification & Validation (TEVV) Plan

**What to look for:** A plan for how AI outputs are tested and validated.

**Process:**
1. Read `steering/TESTING_AND_VERIFICATION.md` — test standards and requirements.
2. Read `src/agent/atlas/__tests__/` — agent-level tests.
3. Read `src/tools/definitions/__tests__/` — tool unit tests.
4. Check `playwright.config.ts` and `e2e/` for end-to-end AI tests.
5. Check `package.json` for CI scripts.

**Current state:**
- Vitest 3 for unit/integration tests; Playwright for e2e with mocked Anthropic responses
- Agent tests mock `resilientStreamText` and `trackTokenUsage` — validate code paths, not model output quality
- Tool unit tests validate Zod schemas and execute functions with mocked data
- No prompt regression suite, no golden-set evaluation, no output quality benchmarks
- E08b S04 (eval harness) is in prototype scope but not yet implemented

**Report on:** What testing exists for AI components vs. what is absent. Highlight the lack of output quality benchmarks and the distinction between code-level testing (present) and model-level evaluation (absent).

---

### 9. Bias Testing

**What to look for:** Evidence that the system has been tested for differential performance across demographic groups or user types.

**Process:**
1. Search `test/` and `src/` for any bias, fairness, or demographic evaluation.
2. Check `docs/` and `steering/` for any bias or equity documentation.
3. Read `src/agent/atlas/prompts.ts` — does the prompt introduce demographic differentials?

**Current state:** No evidence of bias testing found anywhere in the codebase or documentation. Prototype scope does not include real user data.

**Report on:** Absence of bias testing, and which axes are most at risk (user type, programme type, employer sector, geographic region, apprenticeship lifecycle stage).

---

### 10. Performance Metrics

**What to look for:** How AI output quality and system performance are measured.

**Process:**
1. Read `src/agent/token-tracking.ts` — what is captured per generation.
2. Read `src/lib/langfuse.ts` — Langfuse integration status.
3. Read `src/lib/logger.ts` — Pino logging configuration.
4. Check `steering/OBSERVABILITY.md` if it exists.

**Current state:**
- Token usage (feature, model, promptVersion, inputTokens, outputTokens, sessionId) logged via Pino on every agent completion
- Langfuse stub exists — OTel wiring is E06 work, not yet implemented
- No AI-specific performance benchmarks: accuracy, relevance, hallucination rate, retrieval quality
- Token tracking is fire-and-forget (non-blocking), which means failures are silently dropped

**Report on:** What is measured vs. what is needed for responsible AI operation. Note the Langfuse stub state.

---

### 11. Model Testing

**What to look for:** Testing that validates model behaviour, not just code behaviour.

**Process:**
1. Read `src/agent/atlas/__tests__/index.test.ts` — what the agent tests actually assert.
2. Check `src/tools/definitions/__tests__/` — what tool tests cover.
3. Look for any eval harness or golden-set test fixtures.

**Current state:**
- Tool unit tests use mocked execute functions — validate Zod schema contracts, not retrieval quality
- Agent tests mock `resilientStreamText` — validate the call chain, not the model's responses
- No prompt regression suite, no golden-set evaluation, no output quality benchmarks
- Tests validate that code calls the right things, not that the AI produces good answers

**Report on:** The gap between code-level testing (current state) and model-level evaluation (target state for production). Reference E08b S04 (eval harness) as the planned solution.

---

### 12. Safety Testing

**What to look for:** Tests for harmful, unsafe, or unintended model outputs.

**Process:**
1. Read `src/agent/atlas/prompts.ts` — system prompt safety instructions.
2. Check `e2e/` for any safety or guardrail tests.
3. Read `steering/SECURITY_STANDARDS.md` for relevant protections.

**Current state:**
- System prompt sets tone and tool guidance; verify whether safeguarding instructions are present
- Playwright e2e tests mock the Anthropic API — cannot test real model safety behaviours
- No adversarial tests: no jailbreak attempts, no indirect prompt injection via RAG, no social engineering scenarios
- No harm register documenting covered vs. uncovered safety scenarios

**Report on:** What safety instructions are in the prompt, whether any safety behaviour is tested (even via mocks), and what adversarial testing is absent.

---

### 13. AI Security Tests

**What to look for:** Security testing specific to LLM attack surfaces.

**Process:**
1. Read `steering/SECURITY_STANDARDS.md`.
2. Read `src/app/api/chat/route.ts` — input validation and auth on the chat endpoint.
3. Read `src/lib/api-handler.ts` — `withApiHandler` wrapper protections.
4. Read `src/lib/retrieval.ts` — indirect prompt injection risk via RAG content.
5. Check `src/agent/token-tracking.ts` — what data is logged (GDPR / data minimisation).

**Current state:**
- Zod input validation on `ChatRequestSchema` at the API boundary
- `withApiHandler` wrapper adds request ID and structured error handling
- SSE streaming — no evidence of specific SSE injection hardening
- Indirect prompt injection via RAG: fixture content is trusted, but production Intercom content is external — no injection guards
- Token tracking logs feature + session IDs (verify no PII in logged fields)
- No LLM-specific security tests: no prompt injection, model extraction, or data exfiltration tests

**Report on:** The specific LLM attack surfaces present in atlas-2, what is validated at the API boundary, and what security testing is absent.

---

### 14. AI PIAs, Anonymisation, or Differential Privacy

**What to look for:** Privacy Impact Assessments, data anonymisation, or differential privacy for AI processing.

**Process:**
1. Read `src/db/schema.ts` — what personal data fields exist in the schema.
2. Read `src/agent/atlas/prompts.ts` — does the system prompt inject personal data?
3. Read `src/agent/token-tracking.ts` — is any PII logged?
4. Search `docs/` for any PIA or privacy documentation.

**Current state:**
- Prototype uses fixture users — no real PII at risk yet
- `users` table has email, name, role fields — verify what is injected into prompts
- No PIA documentation for AI features
- No differential privacy implementation
- Langfuse stub: when real OTel wiring lands (E06), verify that tool call I/O logged to Langfuse does not include user PII

**Report on:** What personal data the AI system will handle in production, what privacy protections exist or are planned, and what is absent.

---

### 15. Model Registry, Model Cards, and Explainability

**What to look for:** A registry of models in use, model cards describing their properties, and mechanisms for explaining AI decisions to users.

**Process:**
1. Read `src/agent/atlas/prompts.ts` — prompt versioning approach.
2. Read `docs/TECH_DECISIONS.md` — any model governance ADRs.
3. Read `docs/epics/prototype/E22-prompt-registry-versioning/README.md` — the planned prompt registry.
4. Check the frontend for any AI disclosure or explainability features.

**Current state:**
- No model registry or model cards
- Prompts versioned inline in `prompts.ts` (v1.1.0 for chat, v1.0.0 for ideation) — semantic versioning present but no formal registry
- E22 (code-first prompt registry, `getPrompt(name, version?)`) is in prototype scope but not yet implemented
- No learner-facing explainability: users cannot see which model responded or what prompt was used
- Token tracking links `promptVersion` to usage logs — closest thing to a prompt audit trail

**Report on:** What exists vs. what responsible AI practice requires. Note E22 as the planned solution and its current implementation status.

---

### 16. Learner Feedback on AI Features

**What to look for:** Mechanisms for users to provide feedback on AI outputs, and evidence that this feedback improves the system.

**Process:**
1. Read `src/db/schema.ts` — is there a `message_feedback` table or similar?
2. Check `src/app/api/` for any feedback endpoints.
3. Check the client for any thumbs-up/down or feedback UI.
4. Check `src/agent/token-tracking.ts` — are action events tracked?

**Current state:**
- No feedback mechanism implemented in the prototype
- No `message_feedback` table in the current schema
- No thumbs-up/down or free-text feedback UI
- Token usage is tracked but no quality signal is captured alongside it
- No documented process for how future feedback would be reviewed or used to improve prompts

**Report on:** Absence of feedback collection in the prototype, what would need to be built, and how it connects to the prompt registry work in E22.

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
- Distinguish prototype state (current) from production intent (future epics) — many gaps are known and planned for; call out which are gaps vs. deferred scope.
