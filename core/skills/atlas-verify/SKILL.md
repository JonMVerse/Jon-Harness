---
name: atlas-verify
description: >
  Hold a real, multi-turn conversation with Atlas in a chosen repo + environment,
  streaming the reply into the terminal, then confirm in Langfuse which model
  served it. Default path is a direct GraphQL/SSE client (no browser); a Playwright
  UI mode is available as a fallback. Trigger when someone says "talk to Atlas",
  "ask Atlas in staging/local/prod", "verify a model is live", "is the new model
  actually being used", "check Atlas end-to-end", or wants to message atlas /
  atlas-2 and confirm the trace.
user-invocable: true
allowed-tools: "Read, Bash, AskUserQuestion"
---

# atlas-verify

Sends real messages to Atlas and proves which model answered, in two steps:

1. **Converse** — send the user's question(s), multi-turn in one thread, and
   **stream the reply into the terminal**.
2. **Confirm** — query the environment's Langfuse project and report which model
   served the generation(s), with optional PASS/FAIL and tool-call checks.

Default is **API mode** (no browser). A **UI mode** drives the real web widget with
Playwright when you specifically want to verify the rendered UI.

## Setup (once)

```bash
cd <this skill dir>     # core/skills/atlas-verify
npm install             # graphql-ws + ws + tsx  (API mode)
npm run setup:ui        # ONLY if you'll use MODE=ui — adds Playwright + chromium
```

## Targets

| Repo | API transport (default) | UI transport | Langfuse | Environments |
|------|-------------------------|--------------|----------|--------------|
| `atlas` | GraphQL `askAtlas`/`sendMessage` + `botResponseStream` (graphql-ws) | Playwright widget | model in observation **name**, env-tagged | local, staging, demo, production |
| `atlas-2` | `POST /api/chat` + SSE *(experimental)* | Playwright `/chat` | **not wired up yet** | local only |

API base URLs default per environment (override with `ATLAS_API_URL`):
local `http://localhost:4040` · staging `https://atlas-staging.multiverse.io` ·
demo `https://atlas-demo.multiverse.io` · production `https://atlas.multiverse.io`
(atlas-2 local → `http://localhost:3000`).

## Auth (API mode, atlas)

You need **one** credential: the `mv_auth` session token. Obtain it once — log into
the env in a browser, then DevTools → Application → Cookies → `.multiverse.io` →
copy the value of `mv_auth_staging` (or `mv_auth_prod`, etc.). It's long-lived. Keep
it in Keychain so it never lands in shell history or chat:

```bash
security add-generic-password -U -A -a "$USER" -s atlas_mv_auth_staging -w
# paste the token when prompted
```

(No browser is needed at run time — only to grab the token once.)

## Step 0 — choose target, environment, questions

Use **AskUserQuestion** to collect repo (`atlas`/`atlas-2`), environment (gate
**production** behind an explicit confirmation — it's a real LLM call + prod trace),
and the question(s) to ask (one or more → a multi-turn conversation).

## Step 1 — converse (API mode, default)

```bash
ATLAS_AUTH="$(security find-generic-password -a "$USER" -s atlas_mv_auth_staging -w)" \
REPO=atlas MODE=api ENVIRONMENT=staging \
npx tsx assets/converse-atlas.ts \
  -m "What is a KSB?" \
  -m "Give one example of a Knowledge KSB."
```

The reply streams to stdout token-by-token (from the `botResponseStream`
subscription; falls back to the whole `threadMessageSent` message if a surface
doesn't emit deltas). Prints the thread id at the end. Pass questions with repeated
`-m/--message`, or `MESSAGES_JSON='["q1","q2"]'`.

**UI mode (fallback)** — drives the real widget; needs `npm run setup:ui` and a
logged-in session (`STORAGE_STATE` JSON; `/dev/login` is usually disabled on staging):

```bash
MODE=ui REPO=atlas ATLAS_URL="https://my-staging.multiverse.io/learner/.../activities/<id>" \
STORAGE_STATE=/path/to/state.json \
npx tsx assets/converse-atlas.ts -m "What is a KSB?"
```

## Step 2 — confirm the model in Langfuse (atlas)

```bash
export LANGFUSE_PUBLIC_KEY="$(security find-generic-password -a "$USER" -s langfuse_staging_pub -w)"
export LANGFUSE_SECRET_KEY="$(security find-generic-password -a "$USER" -s langfuse_staging_sec -w)"
export LANGFUSE_BASE_URL="https://cloud.langfuse.com"
# Report models seen (env-filtered, last few minutes):
npx tsx assets/verify-langfuse-model.ts --environment staging --minutes 15
# Or PASS/FAIL a specific model + check tool calls:
npx tsx assets/verify-langfuse-model.ts --environment staging --minutes 15 --expect gpt-5.4-mini --check-tools
```

- `--expect` optional (omit to just report models seen). `--check-tools` lists tool
  calls (observation `type=TOOL`, e.g. `ksb_search`).
- **Always pass `--environment <env>`:** staging and production **share one Langfuse
  project**; the filter prevents mistaking a prod trace for staging. The window is
  anchored to the newest trace **in that environment** (clock-skew-safe), and the
  environment is filtered **client-side** (the server-side filter isn't newest-first).

**atlas-2** — Langfuse is not enabled (`atlas-2/src/lib/langfuse.ts`); report the
model fixed in code (`ATLAS_MODEL='claude-sonnet-4-6'`) and the thread id, and say so.

## Step 3 — summarise

Report: repo, environment, each question asked, the streamed answer, the thread id,
and the Langfuse confirmation (models seen / matched, trace ids, tool calls).

## How the model is read (atlas)

Langfuse's observation **`model` field is null** for Atlas via the public API. The
resolved model is in the observation **name**, e.g. `chat gpt54mini-2026-03-17`
(Azure) or `chat gpt-5.4-mini-2026-03-17` (litellm). The verifier matches the name
against both the dotted id and the dots-stripped Azure form (`--expect gpt-5.4-mini`
matches either).

## Notes

- **API mode contract** (verified): `askAtlas(query)` creates the thread →
  `thread.id` + `thread.channel.id`; `sendMessage(text, channelId, threadId)` for
  follow-ups; subscriptions over `wss://<api>/api/websocket` (graphql-ws) with
  `connectionParams.authCookie = <token>`; HTTP mutations send `Cookie: <name>=<token>`.
- **UI-mode selectors** mirror `atlas/client/e2e/utils.ts` (`#atlas-nav-button`,
  `getByLabel('editable markdown')`); the widget may be docked-open (click toggles
  it) and behind a consent banner — the script handles both.
- atlas-2 SSE parsing is best-effort/experimental until verified against a running
  atlas-2 (`yarn dev`, `DEMO_MODE=true`).
