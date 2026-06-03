---
name: atlas-verify
description: >
  Hold a real, multi-turn conversation with Atlas in a chosen repo + environment,
  streaming the reply into the terminal, then confirm in Langfuse which model
  served it. Drives the live UI with Playwright (no mocks). Trigger when someone
  says "talk to Atlas", "ask Atlas in staging/local/prod", "verify a model is
  live", "is the new model actually being used", "check Atlas end-to-end", or
  wants to message atlas / atlas-2 and confirm the trace.
user-invocable: true
allowed-tools: "Read, Bash, AskUserQuestion"
---

# atlas-verify

Sends real messages through Atlas's chat UI and proves which model answered, in
two steps:

1. **Converse** — Playwright drives the live "Ask Atlas" widget (atlas) or chat
   surface (atlas-2), sending the user's question(s) and **streaming the reply
   into the terminal** as it generates. Multi-turn: follow-ups go to the same thread.
2. **Confirm** — query the environment's Langfuse project and report which model
   served the generation(s) (optionally PASS/FAIL against an expected model and
   check tool-calling spans).

There is no way to confirm model routing without a real request — this skill
produces that request and then reads the authoritative record (Langfuse).

## Targets

| Repo | Surface | Reply transport | Langfuse | Environments |
|------|---------|-----------------|----------|--------------|
| `atlas` (Elixir/Phoenix) | widget (`#atlas-nav-button`) | graphql-ws `botResponseStream` | model in observation **name**, env-tagged | local, staging, demo, production |
| `atlas-2` (TS/Next.js) | `/chat` | SSE | **not wired up yet** (model fixed in code) | local only |

Default env URLs (override with `ATLAS_URL` if the surface differs):

- atlas local → `http://localhost:4040` · staging → `https://atlas-staging.multiverse.io`
  · demo → `https://atlas-demo.multiverse.io` · production → `https://atlas.multiverse.io`
- atlas-2 local → `http://localhost:3000`

## Step 0 — choose target, environment, and questions

Use **AskUserQuestion** to collect:

1. **Repo** — `atlas` or `atlas-2`.
2. **Environment** — from the table above for the chosen repo.
   - **Production is gated:** if the user picks `atlas` / production, confirm
     explicitly ("send a real message to PRODUCTION Atlas?") before proceeding.
     A real prod message makes a real LLM call and writes a prod Langfuse trace.
3. **Question(s)** — ask what they want to ask Atlas. Accept one or more, in order
   (they become a multi-turn conversation in a single thread). Offer to add follow-ups.

## Step 1 — converse (stream the reply)

```bash
REPO=atlas \
ATLAS_URL="https://atlas-staging.multiverse.io/demo" \
DEV_LOGIN_UUID="<test-user-uuid>"   # or STORAGE_STATE=/path/to/state.json
npx tsx assets/converse-atlas.ts \
  -m "First question" \
  -m "Follow-up question"
```

- `npx playwright install chromium` once if not already installed.
- Pass each user question with a repeated `-m/--message` (preserves order), or set
  `MESSAGES_JSON='["q1","q2"]'` / `MESSAGES_FILE=path.json`.
- **atlas auth:** `DEV_LOGIN_UUID` (if the env exposes `/dev/login`) or a captured
  `STORAGE_STATE`. **atlas-2** local needs no auth (`DEMO_MODE`).
- Atlas's reply streams to stdout token-by-token (atlas: from the `botResponseStream`
  websocket frames; atlas-2: from the growing rendered message). The script prints
  the **thread id** and a unique **marker** per turn for Langfuse correlation.

## Step 2 — confirm the model in Langfuse

**atlas** (Langfuse is live):

```bash
export LANGFUSE_PUBLIC_KEY=pk-lf-... LANGFUSE_SECRET_KEY=sk-lf-... LANGFUSE_BASE_URL=https://cloud.langfuse.com
# Report which model(s) just served — env-filtered, last few minutes:
npx tsx assets/verify-langfuse-model.ts --environment staging --minutes 15
# Or PASS/FAIL against a specific model, and check tool calls:
npx tsx assets/verify-langfuse-model.ts --environment staging --minutes 15 --expect gpt-5.4-mini --check-tools
```

- `--expect` is **optional**: omit it to simply report the models seen; pass it to
  PASS/FAIL on a specific model. `--check-tools` reports tool-calling spans.
- **Always pass `--environment <env>`:** Atlas's staging and production share **one
  Langfuse project**, so without the filter a prod trace could be mistaken for staging.
  Known labels: `production`, `staging`, `langfuse-llm-as-a-judge`.

**atlas-2** — Langfuse is **stubbed / not enabled** (`atlas-2/src/lib/langfuse.ts`).
There is no trace to query. Report the model fixed in code
(`ATLAS_MODEL = 'claude-sonnet-4-6'`, `atlas-2/src/agent/atlas/config.ts`) and the
`X-Atlas-Thread-Id` captured during the conversation, and say so plainly.

## Step 3 — summarise

Report: repo, environment, each question asked, the streamed answer, the thread id,
and the Langfuse confirmation (models seen / matched, trace ids, tool spans).

## How the model is read (atlas, important)

Langfuse's observation **`model` field comes back null** for Atlas via the public API.
The resolved model is in the observation **name**, e.g. `chat gpt54mini-2026-03-17`
(Azure) or `chat gpt-5.4-mini-2026-03-17` (litellm). The verifier requests
`fields=core,basic,metrics` and matches the name against both the dotted id and the
dots-stripped Azure deployment form (so `--expect gpt-5.4-mini` matches either).

## Notes

- Selectors mirror `atlas/client/e2e/utils.ts` (`#atlas-nav-button`,
  `getByLabel('editable markdown')`, "Send message") and `atlas-2/e2e/smoke.spec.ts`
  (`getByLabel('Message Atlas')`, send button `name=/send/i`). Confirm they still match
  the deployed surface.
- Staging/prod use **real auth** — the dev-login bypass may be disabled; if so use a
  captured `STORAGE_STATE`.
- Tool calling requires the relevant per-user tool feature flags on for the test user.
  In Langfuse, tool calls are observation **type=`TOOL`** named after the function
  (e.g. `intercom_search`, `ksb_search`) — not SPANs named `execute_tool`. `--check-tools`
  queries `type=TOOL`.
- `HEADLESS=false` to watch the browser; `SCREENSHOT=<path>` to relocate the capture.
