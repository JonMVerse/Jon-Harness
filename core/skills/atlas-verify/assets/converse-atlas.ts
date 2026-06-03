#!/usr/bin/env npx tsx
/**
 * Hold a real, multi-turn "Ask Atlas" conversation and stream the reply to the
 * terminal. Two modes:
 *
 *   MODE=api  (default) — talk to the backend directly. No browser.
 *     atlas  → GraphQL over HTTP (askAtlas / sendMessage) + a graphql-ws
 *              subscription (botResponseStream) for token-by-token streaming.
 *     atlas2 → POST /api/chat and read the SSE stream. [experimental]
 *   MODE=ui            — drive the real web widget with Playwright (heavier;
 *              use when you specifically want to verify the rendered UI).
 *
 * Auth (atlas, api mode): the mv_auth session token — passed as the graphql-ws
 * `authCookie` connection param AND as a Cookie header on the HTTP mutations.
 * Obtain it once (browser login → DevTools cookie, or your own session) and keep
 * it in Keychain; it's long-lived. No browser is needed at run time.
 *
 * ── Common env ──────────────────────────────────────────────────────────────
 *   REPO          "atlas" (default) or "atlas2".
 *   MODE          "api" (default) or "ui".
 *   ENVIRONMENT   atlas: local|staging|demo|production (default staging).
 *                 atlas2: local.
 *
 * ── api mode (atlas) ────────────────────────────────────────────────────────
 *   ATLAS_AUTH         the mv_auth session token (required).
 *   ATLAS_API_URL      backend origin. Default per ENVIRONMENT:
 *                        local→http://localhost:4040
 *                        staging→https://atlas-staging.multiverse.io
 *                        demo→https://atlas-demo.multiverse.io
 *                        production→https://atlas.multiverse.io
 *   ATLAS_AUTH_COOKIE  cookie name carrying the token. Default per ENVIRONMENT:
 *                        staging→mv_auth_staging, production→mv_auth_prod,
 *                        else→mv_auth.
 *
 * ── api mode (atlas2) ───────────────────────────────────────────────────────
 *   ATLAS_API_URL      app origin (default http://localhost:3000). /api/chat is used.
 *
 * ── ui mode (Playwright) ────────────────────────────────────────────────────
 *   ATLAS_URL          surface that hosts the chat (widget host page / atlas2 /chat).
 *   STORAGE_STATE      Playwright storageState JSON (logged-in session), or
 *   DEV_LOGIN_UUID     dev-login bypass uuid (only where /dev/login is exposed).
 *   HEADLESS=false, SCREENSHOT=<path>
 *
 * ── Messages (one or more — sent in order, same thread) ─────────────────────
 *   Repeated --message/-m args, OR MESSAGES_JSON='["q1","q2"]' / MESSAGES_FILE=path.
 *
 *   TURN_TIMEOUT   per-turn settle timeout ms (default 120000).
 */

import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";

const { values: args } = parseArgs({
  options: { message: { type: "string", multiple: true, short: "m", default: [] } },
  allowPositionals: false,
});

const REPO = (process.env.REPO ?? "atlas").toLowerCase();
const MODE = (process.env.MODE ?? "api").toLowerCase();
const ENVIRONMENT = (process.env.ENVIRONMENT ?? (REPO === "atlas2" ? "local" : "staging")).toLowerCase();
const TURN_TIMEOUT = parseInt(process.env.TURN_TIMEOUT ?? "120000", 10);

if (REPO !== "atlas" && REPO !== "atlas2") {
  console.error(`ERROR: REPO must be "atlas" or "atlas2" (got "${REPO}").`);
  process.exit(2);
}
if (MODE !== "api" && MODE !== "ui") {
  console.error(`ERROR: MODE must be "api" or "ui" (got "${MODE}").`);
  process.exit(2);
}

function loadMessages(): string[] {
  const fromArgs = (args.message ?? []).filter((m) => m.trim().length > 0);
  if (fromArgs.length > 0) return fromArgs;
  const raw = process.env.MESSAGES_FILE
    ? readFileSync(process.env.MESSAGES_FILE, "utf8")
    : process.env.MESSAGES_JSON ?? "";
  if (raw.trim()) {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((m) => typeof m === "string")) {
      return parsed.filter((m) => m.trim().length > 0);
    }
    console.error("ERROR: MESSAGES_FILE/MESSAGES_JSON must be a JSON array of strings.");
    process.exit(2);
  }
  return [];
}

const MESSAGES = loadMessages();
if (MESSAGES.length === 0) {
  console.error("ERROR: provide at least one message via --message/-m, MESSAGES_FILE, or MESSAGES_JSON.");
  process.exit(2);
}

const DEFAULT_API_URL: Record<string, string> = {
  local: REPO === "atlas2" ? "http://localhost:3000" : "http://localhost:4040",
  staging: "https://atlas-staging.multiverse.io",
  demo: "https://atlas-demo.multiverse.io",
  production: "https://atlas.multiverse.io",
};
const DEFAULT_COOKIE: Record<string, string> = {
  staging: "mv_auth_staging",
  production: "mv_auth_prod",
  demo: "mv_auth_demo",
  local: "mv_auth",
};

const markers: string[] = [];
let threadId = "";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

console.log(`Atlas conversation`);
console.log(`  repo:        ${REPO}`);
console.log(`  mode:        ${MODE}`);
console.log(`  environment: ${ENVIRONMENT}`);
console.log(`  messages:    ${MESSAGES.length}`);

// ── API mode: atlas (GraphQL + graphql-ws) ───────────────────────────────────

const ASK_ATLAS = `mutation AskAtlas($query: String!) {
  askAtlas(query: $query) { id thread { id channel { id } } }
}`;
const SEND_MESSAGE = `mutation SendMessage($text: String!, $channelId: UUID!, $threadId: UUID!) {
  sendMessage(text: $text, channelId: $channelId, threadId: $threadId) { node { id } }
}`;
const SUB_STREAM = `subscription Stream($threadId: UUID!) {
  botResponseStream(threadId: $threadId) { text threadId }
}`;
const SUB_MSG = `subscription Msg($threadId: UUID!) {
  threadMessageSent(threadId: $threadId) { node { text sender { __typename } } }
}`;
const SUB_ERR = `subscription Err($threadId: UUID!) {
  botResponseError(threadId: $threadId) { __typename }
}`;

async function runAtlasApi(): Promise<void> {
  const TOKEN = process.env.ATLAS_AUTH ?? "";
  if (!TOKEN) {
    console.error("ERROR: ATLAS_AUTH (mv_auth session token) is required for atlas api mode.");
    process.exit(2);
  }
  const API_URL = (process.env.ATLAS_API_URL ?? DEFAULT_API_URL[ENVIRONMENT] ?? "").replace(/\/$/, "");
  const COOKIE_NAME = process.env.ATLAS_AUTH_COOKIE ?? DEFAULT_COOKIE[ENVIRONMENT] ?? "mv_auth";
  if (!API_URL) { console.error(`ERROR: no ATLAS_API_URL and no default for environment "${ENVIRONMENT}".`); process.exit(2); }
  console.log(`  api url:     ${API_URL}`);
  console.log(`  auth cookie: ${COOKIE_NAME}=<token len ${TOKEN.length}>`);

  const { createClient } = await import("graphql-ws");
  const ws = await import("ws");
  const WebSocketImpl = (ws as any).WebSocket ?? (ws as any).default;

  async function httpGraphql(query: string, variables: Record<string, unknown>): Promise<any> {
    const res = await fetch(`${API_URL}/api/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${COOKIE_NAME}=${TOKEN}`,
        Origin: API_URL,
      },
      body: JSON.stringify({ query, variables }),
    });
    const text = await res.text();
    let json: any;
    try { json = JSON.parse(text); } catch { throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`); }
    if (json.errors) throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
    return json.data;
  }

  const client = createClient({
    url: `${API_URL.replace(/^http/, "ws")}/api/websocket`,
    webSocketImpl: WebSocketImpl,
    connectionParams: { authCookie: TOKEN },
    retryAttempts: 3,
  });

  // Per-turn state: tokens streamed, and a resolver fired when the bot's whole
  // message lands (threadMessageSent with a Bot sender) — the end-of-turn signal.
  let turnStreamed = "";
  let resolveTurn: (() => void) | null = null;

  const subscribe = (query: string, onNext: (d: any) => void) =>
    client.subscribe({ query, variables: { threadId } }, {
      next: (msg: any) => onNext(msg.data),
      error: () => {},
      complete: () => {},
    });

  // Turn 0 — askAtlas creates the thread and starts the first bot response.
  console.log(`\n\n─── turn 1/${MESSAGES.length} ───`);
  console.log(`you> ${MESSAGES[0]}`);
  const d0 = await httpGraphql(ASK_ATLAS, { query: MESSAGES[0] });
  threadId = d0.askAtlas.thread.id;
  const channelId = d0.askAtlas.thread.channel.id;

  // Subscribe once for the life of the thread (the resolver delays the first
  // chunk ~1s so this lands in time).
  subscribe(SUB_STREAM, (data) => {
    const chunk = data?.botResponseStream;
    if (chunk?.text) { turnStreamed += chunk.text; process.stdout.write(chunk.text); }
  });
  subscribe(SUB_MSG, (data) => {
    const node = data?.threadMessageSent?.node;
    if (node?.sender?.__typename === "Bot") {
      if (!turnStreamed.trim() && node.text) process.stdout.write(node.text); // no deltas → print whole
      resolveTurn?.();
    }
  });
  subscribe(SUB_ERR, () => { process.stdout.write("\n[bot response error]"); resolveTurn?.(); });

  const awaitTurn = () =>
    new Promise<void>((resolve) => {
      let done = false;
      resolveTurn = () => { if (!done) { done = true; resolve(); } };
      setTimeout(() => resolveTurn?.(), TURN_TIMEOUT);
    });

  process.stdout.write("atlas> ");
  await awaitTurn();

  // Follow-up turns — sendMessage into the same thread; the bot replies again.
  for (let i = 1; i < MESSAGES.length; i++) {
    turnStreamed = "";
    console.log(`\n\n─── turn ${i + 1}/${MESSAGES.length} ───`);
    console.log(`you> ${MESSAGES[i]}`);
    process.stdout.write("atlas> ");
    await httpGraphql(SEND_MESSAGE, { text: MESSAGES[i], channelId, threadId });
    await awaitTurn();
  }

  await client.dispose();
}

// ── API mode: atlas2 (POST /api/chat + SSE) [experimental] ───────────────────

async function runAtlas2Api(): Promise<void> {
  const API_URL = (process.env.ATLAS_API_URL ?? DEFAULT_API_URL.local).replace(/\/$/, "");
  console.log(`  api url:     ${API_URL} (atlas2 SSE — experimental)`);
  const history: Array<{ role: string; parts: Array<{ type: string; text: string }> }> = [];

  for (let i = 0; i < MESSAGES.length; i++) {
    console.log(`\n\n─── turn ${i + 1}/${MESSAGES.length} ───`);
    console.log(`you> ${MESSAGES[i]}`);
    process.stdout.write("atlas> ");
    history.push({ role: "user", parts: [{ type: "text", text: MESSAGES[i] }] });

    const res = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history, ...(threadId ? { threadId } : {}) }),
    });
    const tid = res.headers.get("x-atlas-thread-id");
    if (tid) threadId = tid;
    if (!res.ok || !res.body) { console.error(`\nHTTP ${res.status}`); return; }

    // Tolerant SSE / AI-SDK UI-message-stream reader: pull text deltas out of
    // any JSON `data:` frames (field named delta/textDelta/text).
    let assistant = "";
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        const m = line.startsWith("data:") ? line.slice(5).trim() : line.trim();
        if (!m || m === "[DONE]") continue;
        try {
          const obj = JSON.parse(m);
          const delta = obj.delta ?? obj.textDelta ?? (obj.type && /text/.test(obj.type) ? obj.text : undefined);
          if (typeof delta === "string") { assistant += delta; process.stdout.write(delta); }
        } catch { /* non-JSON keepalive */ }
      }
    }
    history.push({ role: "assistant", parts: [{ type: "text", text: assistant }] });
  }
}

// ── UI mode (Playwright) ─────────────────────────────────────────────────────

async function runUi(): Promise<void> {
  const { chromium } = await import("playwright");
  type PWPage = import("playwright").Page;
  type PWSocket = import("playwright").WebSocket;

  const ATLAS_URL = process.env.ATLAS_URL ?? "";
  const DEV_LOGIN_UUID = process.env.DEV_LOGIN_UUID ?? "";
  const STORAGE_STATE = process.env.STORAGE_STATE ?? "";
  const HEADLESS = process.env.HEADLESS !== "false";
  const SCREENSHOT = process.env.SCREENSHOT ?? "/tmp/atlas-verify.png";
  if (!ATLAS_URL) { console.error("ERROR: ui mode needs ATLAS_URL."); process.exit(2); }
  if (REPO === "atlas" && !DEV_LOGIN_UUID && !STORAGE_STATE) {
    console.error("ERROR: ui mode (atlas) needs STORAGE_STATE or DEV_LOGIN_UUID."); process.exit(2);
  }
  const origin = new URL(ATLAS_URL).origin;
  let turnStreamed = "";

  async function dismissOverlays(page: PWPage): Promise<void> {
    const names = [/accept all/i, /^accept$/i, /agree/i, /got it/i];
    for (let attempt = 0; attempt < 10; attempt++) {
      let clicked = false;
      for (const re of names) {
        const btn = page.getByRole("button", { name: re }).first();
        if (await btn.isVisible().catch(() => false)) { await btn.click({ timeout: 3000 }).catch(() => {}); clicked = true; break; }
      }
      if (clicked) break;
      await page.waitForTimeout(700);
    }
    await page.evaluate(
      "document.querySelectorAll('[data-ketch-backdrop],[data-ketch-banner],#lanyard_root').forEach(e=>e.remove())",
    ).catch(() => {});
  }

  function tapWebsocket(ws: PWSocket): void {
    if (!/\/api\/websocket/.test(ws.url())) return;
    ws.on("framereceived", (frame) => {
      const payload = typeof frame.payload === "string" ? frame.payload : frame.payload.toString("utf8");
      if (!payload.includes("botResponseStream") && !payload.includes("threadMessageSent")) return;
      try {
        const msg = JSON.parse(payload);
        if (msg.type !== "next") return;
        const data = msg.payload?.data ?? {};
        const chunk = data.botResponseStream;
        if (chunk?.text) { turnStreamed += chunk.text; process.stdout.write(chunk.text); if (chunk.threadId) threadId = chunk.threadId; return; }
        const node = data.threadMessageSent?.node;
        const senderType = node?.sender?.__typename ?? node?.sender?.__isNode;
        if (node?.text && senderType === "Bot" && !turnStreamed.trim()) { process.stdout.write(node.text); turnStreamed += node.text; }
      } catch { /* ignore */ }
    });
  }

  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext(STORAGE_STATE ? { storageState: STORAGE_STATE } : {});
  try {
    if (REPO === "atlas" && DEV_LOGIN_UUID) {
      const res = await context.request.fetch(`${origin}/dev/login?user_uuid=${DEV_LOGIN_UUID}`);
      if (!res.ok()) { console.error(`dev-login failed: HTTP ${res.status()} — use STORAGE_STATE.`); process.exit(2); }
    }
    const page = await context.newPage();

    if (REPO === "atlas") {
      page.on("websocket", tapWebsocket);
      await page.goto(ATLAS_URL, { waitUntil: "domcontentloaded" });
      await dismissOverlays(page);
      const box = page.getByLabel("editable markdown");
      if (!(await box.isVisible().catch(() => false))) await page.locator("#atlas-nav-button").click().catch(() => {});
      await box.waitFor({ state: "visible", timeout: 30_000 });
      for (let i = 0; i < MESSAGES.length; i++) {
        const marker = `atlas-verify-${Date.now()}-${i}`;
        markers.push(marker);
        turnStreamed = "";
        console.log(`\n\n─── turn ${i + 1}/${MESSAGES.length} ───`);
        console.log(`you> ${MESSAGES[i]}  (${marker})`);
        process.stdout.write("atlas> ");
        await box.click();
        await page.keyboard.insertText(`${MESSAGES[i]} (${marker})`);
        const sendBtn = page.getByRole("button", { name: /send/i }).first();
        if (await sendBtn.isVisible().catch(() => false)) await sendBtn.click().catch(() => page.keyboard.press("Enter"));
        else await page.keyboard.press("Enter");
        await page.getByText(marker).waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
        await page.waitForLoadState("networkidle", { timeout: TURN_TIMEOUT }).catch(() => {});
      }
    } else {
      const chatUrl = new URL(ATLAS_URL).pathname === "/" ? ATLAS_URL.replace(/\/$/, "") + "/chat" : ATLAS_URL;
      page.on("response", (res) => { if (/\/api\/chat/.test(res.url())) { const t = res.headers()["x-atlas-thread-id"]; if (t) threadId = t; } });
      await page.goto(chatUrl, { waitUntil: "domcontentloaded" });
      await dismissOverlays(page);
      const input = page.getByLabel("Message Atlas");
      await input.waitFor({ state: "visible" });
      for (let i = 0; i < MESSAGES.length; i++) {
        console.log(`\n\n─── turn ${i + 1}/${MESSAGES.length} ───`);
        console.log(`you> ${MESSAGES[i]}`);
        process.stdout.write("atlas> ");
        const bubbles = page.locator('[data-role="assistant"], [data-message-role="assistant"]');
        const before = await bubbles.count();
        await input.fill(MESSAGES[i]);
        await page.getByRole("button", { name: /send/i }).click();
        const target = bubbles.nth(before);
        await target.waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
        let printed = "", stable = 0;
        const deadline = Date.now() + TURN_TIMEOUT;
        while (Date.now() < deadline) {
          const text = (await target.textContent().catch(() => "")) ?? "";
          if (text.length > printed.length) { process.stdout.write(text.slice(printed.length)); printed = text; stable = 0; }
          else { stable += 150; if (printed.length > 0 && stable >= 1500) break; }
          await page.waitForTimeout(150);
        }
      }
    }
    await page.screenshot({ path: SCREENSHOT, fullPage: true });
    console.log(`\n\nScreenshot: ${SCREENSHOT}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

// ── dispatch ─────────────────────────────────────────────────────────────────

async function main() {
  if (MODE === "ui") await runUi();
  else if (REPO === "atlas") await runAtlasApi();
  else await runAtlas2Api();

  console.log(`\n\n✅ Conversation complete.`);
  if (threadId) console.log(`Thread id: ${threadId}`);
  if (markers.length) console.log(`Markers (for Langfuse correlation): ${markers.join(", ")}`);
  if (REPO === "atlas") {
    console.log(`\nNow confirm the model in Langfuse:\n  npx tsx verify-langfuse-model.ts --environment ${ENVIRONMENT} --minutes 15`);
  } else {
    console.log(`\natlas-2 Langfuse is not enabled — model is fixed in code (claude-sonnet-4-6).`);
  }
}

main().catch((e) => { console.error("\n" + String(e)); process.exit(2); });
