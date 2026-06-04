# Executing an AI-feature test plan with `atlas-verify`

**Status:** feasibility + design (no automation built yet).
**Question:** can the `converse-atlas` skill (+ `verify-langfuse-model`) execute the scenarios in
a conversational test plan — e.g. the **Curriculum-Intelligence Test Plan** (Treat Group Hub) —
and report pass/fail?

**Short answer:** yes for the *mechanics* (send the prompt, confirm which tools fired); the plan's
**tool-usage checks (§4 steps 1–2) are auto-assertable today** for the tools that exist. Full
pass/fail needs three additions (answer-quality judge, page-context, and the endpoints actually
being live). Recommended first step: automate the homepage + guardrail sets in API mode.

## What maps cleanly

| Test-plan row field | How `converse-atlas` / `verify-langfuse-model` covers it |
|---|---|
| *Full prompt to send* (one or more) | `converse-atlas` messages — `-m`, or `MESSAGES_FILE=<scenario>.json` (multi-turn, one thread). |
| Seed user (§3) | `ATLAS_AUTH` = that user's `mv_auth` token; `REPO=atlas ENVIRONMENT=staging`. |
| *Expected tools / endpoints* (§4 step 1 "did it call a tool", step 2 "the right one") | `verify-langfuse-model --environment staging --check-tools` reads `type=TOOL` observations on the thread's trace and lists which fired. Assert the expected codes are present (and, for guardrails, absent). |
| *Which model served it* | same verifier — model is read from the observation **name**. |
| Result column | write the verifier's PASS/FAIL + tool list back to the row. |

## Endpoint-code → tool-name mapping

The plan's *Expected tools* column uses codes; auto-assertion needs them mapped to the actual
Langfuse `type=TOOL` observation names (the Atlas tool `name`s).

| Plan code | Atlas tool (`lib/atlas/open_ai/functions/`) | Status |
|---|---|---|
| `PATH` | `get_pathway` | **stub** (hardcoded; real Ariel `GET /pathway` pending `ariel#3301`) |
| `UNIT` | `get_unit_content` | **stub** (real `GET /units/{id}` pending) |
| `KSB` | `ksb_search` | live |
| `INTERCOM` | `intercom_search` | live |
| (`learning_objectives`) | `learning_objectives_search` | live |
| `PROG` / `PROJ` / `FLOW` / `ACT` | — no discrete tool yet | **planned** (endpoints not yet implemented) |
| `PAGE` | n/a — page content the assistant already has | n/a |

> ⚠️ **Confirm the target repo first.** The codes above resolve against the **`atlas`** (Elixir)
> tool set. If the curriculum intelligence under test lives in **`atlas-2`**, re-derive the mapping
> from that repo's tool definitions and run `converse-atlas` with `REPO=atlas2`. Keep this table
> updated as endpoints land — it is the contract that makes "expected tools" assertable.

## Proposed pipeline (per scenario)

```
scenario row ──▶ MESSAGES_FILE (the prompt[s])
            ──▶ converse-atlas  (REPO/ENVIRONMENT/ATLAS_AUTH)  ──▶ reply + threadId
            ──▶ verify-langfuse-model --environment <env> --check-tools
                   └─ assert: expected tool codes fired (and guardrail tools did NOT)
            ──▶ [LLM-judge]  reply + retrieved data  vs  "Expected behaviour"   (see gap 1)
            ──▶ write PASS/FAIL + evidence back to the row's Result column
```

Scenario rows are already machine-shaped: one `MESSAGES_FILE` (JSON array of the prompt[s]) per
row, plus the expected-tools list and pass criteria.

## Gaps and how to close each

1. **Answer-quality is not graded.** `converse-atlas` captures the streamed reply but doesn't
   judge whether it is grounded / correct / "fails safely". Most §7 *Expected behaviour* and all
   §8-J guardrail criteria need this. → Add an **LLM-judge** step: prompt a model with the reply +
   the tool outputs + the row's *Expected behaviour* and have it return pass/fail + reason. Until
   then, those rows are **assisted-manual** (auto-run + auto tool-check, human reads the reply).
2. **Page-context scenarios.** §8-I and the Learning-Content/Project guidance prompts assume the
   assistant has the current page. API mode carries **no page context**. → Either pass a
   page-context input on the API path (if supported) or run those rows in `MODE=ui` on the real
   page. **Homepage sets (A–H) and guardrails (J) need no page context → fully API-runnable now.**
3. **Endpoint readiness + seed data.** The plan presumes the curriculum endpoints are live with
   rich data, but `get_pathway`/`get_unit_content` are **stubs** today and `PROG/PROJ/FLOW/ACT`
   don't exist yet. A scenario can only be meaningfully executed once its endpoint is real **and**
   the §3 seed user exists on staging. → Gate execution per-row on endpoint status (the §5 table's
   Status column) and provision the seed user + token first.

## Recommendation (phasing)

- **Phase 1 (runnable now):** automate the **homepage sets (A–H) + guardrails (J)** in `MODE=api`,
  asserting **tool usage** via `verify-langfuse-model --check-tools` against the live tools
  (`KSB`, `INTERCOM`, and `PATH`/`UNIT` once un-stubbed). Report tool-usage pass/fail; surface the
  reply for human quality review.
- **Phase 2 (follow-up):** add the **LLM-judge** (gap 1) to auto-grade *Expected behaviour*.
- **Phase 3 (follow-up):** add **page-context** support (gap 2) to cover §8-I + page-type prompts.

Phases 2–3 would graduate this from "feasibility + design" into a PoC and then a full
plan-ingesting harness skill — out of scope for this pass.
