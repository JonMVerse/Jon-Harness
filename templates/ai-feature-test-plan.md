<!--
TEMPLATE: AI-feature conversational test plan
Source of truth for humans is the Coda template page (Treat Group Hub). This
Markdown mirror is the machine-friendly copy that pairs with the atlas-verify
`converse-atlas` + `verify-langfuse-model` execution pipeline
(see core/skills/atlas-verify/docs/test-plan-execution.md).

How to use: copy this file, replace every <PLACEHOLDER>, delete the guidance
comments, and fill the scenario tables. Generalised from Cem's
"Curriculum-Intelligence Test Plan" (Treat Group Hub).
-->

# <FEATURE> Test Plan

## 1. Purpose

What this plan proves and why. Name the moving parts under test — the
**API/endpoints**, the **tools**, and the **system-prompt / routing** changes —
and the outcome: *however a user asks, the assistant gives a grounded, useful,
safe answer.* Note that expected-behaviour columns describe **what the assistant
should do, not exact wording**.

It typically breaks into two parts:
1. **Promoted prompts** (highest priority — the prompts you actively put in front of users).
2. **Open-ended library** (the wider set a user might type themselves).

## 2. How to use this plan

- Start with the **promoted/priority** set (§7).
- Then work through the **scenario library** (§8, the lettered tables).
- Run each test on the seed users in §3.
- When the assistant misbehaves, use the **§4 triage checklist** to find the cause and owner.
- Record outcomes in each scenario row's **Result** column; feed fixes into the eval golden set.

## 3. Test-data setup (preconditions)

Most scenarios can't be tested on a thin/empty account. List the data the plan
depends on **before** running:
- Seed user(s) on `<ENVIRONMENT>` (usually staging) with: <e.g. a populated pathway —
  multiple modules, units, projects; linked KSBs/competencies>.
- **Varied state**: some items completed / in-progress / not-started.
- **Edge cases present and absent**: e.g. some deadlines set, others deliberately blank, so
  empty-state behaviour is testable.
- Note **who provisions this** and the seed user's auth (the `<AUTH_TOKEN>` used by execution).

## 4. When the assistant doesn't behave as expected (triage checklist)

Each failure points to a different fix/owner. Work top-down:
1. **Did it call a tool at all?** Answered from general knowledge / page-only when it should
   have used an endpoint → **system-prompt** cue issue.
2. **Did it call the *right* tool?** Wrong endpoint for the question → **tool-description** issue.
3. **Are the tool descriptions clear?** Vague/overlapping → tighten each tool's purpose + "when to use".
4. **Is the endpoint returning the right data?** Call it directly; wrong/missing/stale → **API/endpoint** issue (owner: <team>).
5. **Did it ground the answer in the data?** Right data, wrong/generic/embellished answer → **response-quality / system-prompt** issue.
6. **Was the intent/behaviour right?** Direct vs Socratic, right altitude, etc. → system-prompt rules / sub-agent routing.
7. **Re-test and log what fixed it** → feeds the eval golden dataset + prompt versioning.

## 5. Endpoints / tools under test

List every capability a scenario may exercise, with a short **code** used in the
scenario tables' *Expected tools* column. Include pre-existing tools so "should
NOT call X" is also assertable.

| Code | Tool / endpoint | What it's for | Status (live / stub / planned) |
|------|-----------------|---------------|-------------------------------|
| `<CODE>` | `<tool_name>` | <purpose> | <live/stub/planned> |
| `PAGE` | (page context the assistant already has) | current page content | n/a |

## 6. Domain legend (optional)

Group the codes into the user-facing domains they serve, e.g.:
- 🗺️ **<Domain A>** — `<CODE>`
- 📊 **<Domain B>** — `<CODE>`

---

## 7. Promoted / priority prompts

The exact prompts you plan to put in front of users. Each is **two things that
fail independently — test both**:
- **The label** the user sees/taps — clarity, appeal, click-through → outcome.
- **The full prompt** sent to the assistant behind the label — does it reliably trigger the
  right behaviour and a correct, grounded answer?

### <Page / surface type A>

| Rank | User-facing label | Full prompt sent | Expected behaviour | Expected tools | Why-candidate / notes | Automation |
|------|-------------------|------------------|--------------------|----------------|-----------------------|------------|
| ★1 | <short label> | <exact prompt text> | <what the assistant should do> | `<CODE> + <CODE>` | <rationale / data> | yes \| needs-page-context \| needs-judge |

<!-- Automation column: how runnable this row is via converse-atlas —
  yes               = no page context needed; tool-usage auto-assertable
  needs-page-context = assistant must have a current page (use MODE=ui or a pageContext input)
  needs-judge       = pass criteria require grading the answer's quality (LLM-judge step) -->

## 8. Scenario library (open-ended)

Group by **context**, because context changes how the assistant must answer:
- **No-context sections (e.g. from the homepage)** — no page content, so the assistant *must*
  use the endpoints. The cleanest proxy for "has context on any surface". Phrase prompts as
  "my first / next / current …" rather than "this …".
- **On-page sections** — the assistant already has the current page (`PAGE`). Check the endpoints
  don't conflict with/duplicate the page, and are still used for anything off the current page.
- **Boundary / guardrail section (highest priority)** — fails safely: never invents data,
  over-claims links, surfaces hidden/unpublished content, or applies the wrong intent.

### A. <Theme> (no context)

| ID | Prompt / scenario | Expected behaviour | Expected tools | Automation | Result |
|----|-------------------|--------------------|----------------|------------|--------|
| A1 | <prompt> | <expected> | `<CODE>` | yes | |

### J. Boundary, negative & guardrail tests (highest priority)

| ID | Prompt / scenario | Expected behaviour | Automation | Result |
|----|-------------------|--------------------|------------|--------|
| J1 | "<question with no data set>" | States no data is set rather than inventing it | yes | |
| J2 | Hidden content (`is_hidden_*` = true) | Does not surface/describe hidden content, even if asked directly | yes | |
| J3 | Unpublished/draft content | Does not present draft content as if it were live | yes | |
