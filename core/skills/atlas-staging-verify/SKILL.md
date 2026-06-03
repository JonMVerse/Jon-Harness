---
name: atlas-staging-verify
description: >
  Verifies which model Atlas actually pings in staging by driving Ask Atlas with
  Playwright and confirming the resolved model in Langfuse. Built for ATLAS-3699
  (gpt-5.4-mini in staging). Trigger when someone asks to confirm a model is live
  in staging, verify gpt-5.4-mini / a model swap, check tool calling end-to-end in
  staging, or "is the new model actually being used".
user-invocable: true
---

# atlas-staging-verify

Proves which model staging Atlas uses, end-to-end, in two steps:

1. **Drive** — Playwright sends one real message through staging **Ask Atlas** (the
   bot chat path that calls the LLM), generating a genuine Langfuse trace.
2. **Confirm** — query the staging Langfuse project and assert the generation's
   `model` is the expected one (default `gpt-5.4-mini`), optionally checking that
   tool-calling spans are present.

There is no way to confirm staging model routing without a real request — this
skill produces that request and then reads the authoritative record (Langfuse).

## Prerequisites (post-deploy)

- `ai_pantheon_hub` rate-limit PR merged + Atlas deployed to staging.
- ConfigCat `use_gpt_5_4_mini` = ON in staging (already set).
- **Langfuse staging** creds: `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL`.
- **Staging access** for the driver: `STAGING_ATLAS_URL` (page that embeds the
  widget) + auth — either `STAGING_DEV_LOGIN_UUID` (if staging exposes the
  dev-login bypass) or `STAGING_STORAGE_STATE` (a saved logged-in session).
- `npx playwright install chromium` once.

## Step 1 — drive Ask Atlas

```bash
STAGING_ATLAS_URL="https://<staging-surface>/demo" \
STAGING_DEV_LOGIN_UUID="<test-user-uuid>" \
npx tsx assets/drive-staging-atlas.ts
```

Sends a tool-triggering prompt by default (override with `TEST_MESSAGE`). Prints a
unique `marker` + timestamp to correlate with the trace, and saves a screenshot.

## Step 2 — confirm the model in Langfuse

```bash
export LANGFUSE_PUBLIC_KEY=pk-lf-... LANGFUSE_SECRET_KEY=sk-lf-... LANGFUSE_BASE_URL=https://cloud.langfuse.com
npx tsx assets/verify-langfuse-model.ts --expect gpt-5.4-mini --minutes 15 --environment staging --check-tools
```

Prints the models seen in the window and **PASS/FAIL** for the expected model
(exit 0 on pass, 1 on fail). `--check-tools` also reports tool-calling spans.

**Always pass `--environment staging`:** Atlas's staging and production share **one
Langfuse project**, so without the filter a prod trace could be mistaken for staging.
Known environment labels: `production`, `staging`, `langfuse-llm-as-a-judge`.

## How the model is read (important)

Langfuse's observation **`model` field comes back null** for Atlas via the public API.
The resolved model is in the observation **name**, e.g. `chat gpt54mini-2026-03-17`
(Azure) or `chat gpt-5.4-mini-2026-03-17` (litellm). The verifier requests
`fields=core,basic,metrics` and matches the name against both the dotted id and the
dots-stripped Azure deployment form (so `--expect gpt-5.4-mini` matches either).

## Notes / to finalise against real staging

- Selectors mirror `client/e2e/utils.ts` (`#atlas-nav-button`, `getByLabel('editable markdown')`,
  "Send message"). Confirm they still match the deployed staging widget.
- Staging uses **real auth** — the dev-login bypass may be disabled; if so use a
  captured `STAGING_STORAGE_STATE`.
- Tool calling requires the relevant per-user tool feature flags to be on for the
  test user. The default message aims to trigger a KSB lookup.
