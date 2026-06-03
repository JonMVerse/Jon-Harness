# atlas-verify — quickstart

Talk to **Atlas** from your terminal (multi-turn, streamed) and confirm **which model**
served the reply in Langfuse. Default path is **browserless** (GraphQL/SSE); a Playwright
UI mode exists as a fallback.

Skill lives at `core/skills/atlas-verify/` in the harness plugin. Trigger phrases:
"talk to Atlas", "verify a model is live in staging", "is the new model being used".

---

## 3-step quickstart (API mode — no browser)

```bash
cd core/skills/atlas-verify
npm install                                   # graphql-ws + ws + tsx

# one-time: stash your Atlas session token (grab mv_auth_staging from your browser:
# DevTools → Application → Cookies → .multiverse.io → mv_auth_staging → copy value)
security add-generic-password -U -A -a "$USER" -s atlas_mv_auth_staging -w   # paste when prompted

# converse (replies stream to the terminal):
ATLAS_AUTH="$(security find-generic-password -a "$USER" -s atlas_mv_auth_staging -w)" \
REPO=atlas MODE=api ENVIRONMENT=staging \
npx tsx assets/converse-atlas.ts -m "What is a KSB?" -m "Give one example."
```

That token is long-lived — grab it once. No browser runs at conversation time.

---

## Confirm the serving model in Langfuse

```bash
# one-time: stash Langfuse staging keys
security add-generic-password -U -A -a "$USER" -s langfuse_staging_pub -w   # pk-lf-...
security add-generic-password -U -A -a "$USER" -s langfuse_staging_sec -w   # sk-lf-...

export LANGFUSE_PUBLIC_KEY="$(security find-generic-password -a "$USER" -s langfuse_staging_pub -w)"
export LANGFUSE_SECRET_KEY="$(security find-generic-password -a "$USER" -s langfuse_staging_sec -w)"
export LANGFUSE_BASE_URL="https://cloud.langfuse.com"

# report models seen (last 15 min, staging):
npx tsx assets/verify-langfuse-model.ts --environment staging --minutes 15
# or PASS/FAIL a specific model + tool calls:
npx tsx assets/verify-langfuse-model.ts --environment staging --minutes 15 --expect gpt-5.4-mini --check-tools
```

Always pass `--environment` — staging and prod share one Langfuse project.

---

## Environments & repos

- `ENVIRONMENT`: `local` | `staging` | `demo` | `production` (atlas). **Production is gated** —
  it's a real LLM call + prod trace; confirm before sending.
- `REPO=atlas` (Elixir, GraphQL/WS) or `REPO=atlas2` (Next.js, `POST /api/chat` + SSE,
  local-only, **experimental**, Langfuse not wired yet).
- Override the backend with `ATLAS_API_URL` if a default doesn't fit.

## UI mode (fallback — only if you need the real rendered widget)

```bash
npm run setup:ui     # adds Playwright + chromium
MODE=ui REPO=atlas ATLAS_URL="<surface page that embeds the widget>" \
STORAGE_STATE=/path/to/logged-in-state.json \
npx tsx assets/converse-atlas.ts -m "What is a KSB?"
```
`/dev/login` is usually disabled on staging, so capture a `storageState` from a real
session. UI mode handles the consent banner, docked-open widget, and shadow-DOM input.

## Gotchas

- **Auth is the only real prerequisite** — one `mv_auth` token (Keychain). Without it, API mode exits 2.
- **Don't paste tokens into chat/PRs** — use Keychain (`security add-generic-password`).
- **atlas-2 SSE** parsing is best-effort until verified against a running atlas-2 (`yarn dev`, `DEMO_MODE=true`).
- **Local atlas** needs the full Elixir stack running (DB + LLM creds) — out of scope for this skill.
