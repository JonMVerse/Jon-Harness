#!/usr/bin/env npx tsx
/**
 * Drive a real, multi-turn "Ask Atlas" conversation through the web UI with
 * Playwright, streaming each assistant reply to the terminal as it generates.
 *
 * Two repos are supported via REPO:
 *   - atlas   (Elixir/Phoenix + Absinthe): the live Atlas. Replies stream over a
 *             graphql-ws websocket (subscription botResponseStream); we tap the
 *             frames Playwright already sees and print each `text` delta live.
 *   - atlas2  (TS/Next.js prototype): replies stream via SSE. No websocket, so we
 *             poll the growing assistant message DOM node and print new text.
 *
 * Standalone Playwright script — it hits the REAL backend of the chosen env.
 * Selectors mirror atlas/client/e2e/utils.ts and atlas-2/e2e/smoke.spec.ts.
 *
 * Run with Playwright's browsers available:
 *   npx playwright install chromium   # once
 *   REPO=atlas ATLAS_URL=... [auth env] npx tsx converse-atlas.ts -m "question"
 *
 * ── Required env ───────────────────────────────────────────────────────────
 *   REPO        "atlas" (default) or "atlas2".
 *   ATLAS_URL   The surface that hosts the chat.
 *                 atlas  → a page that embeds the widget (#atlas-nav-button),
 *                          e.g. https://atlas-staging.multiverse.io/demo
 *                 atlas2 → the app origin; /chat is appended automatically,
 *                          e.g. http://localhost:3000
 *
 * ── Messages (one or more — sent in order, same thread) ────────────────────
 *   Provide via repeated --message/-m args, OR a JSON string array in
 *   MESSAGES_FILE (path) or MESSAGES_JSON (inline). At least one is required.
 *
 * ── Auth (atlas only; atlas2 local runs in DEMO_MODE, no auth) ─────────────
 *   DEV_LOGIN_UUID   If the env exposes the dev-login bypass, the test user's
 *                    UUID; the script hits `${origin}/dev/login?user_uuid=...`.
 *                    May be DISABLED on staging/prod.
 *   STORAGE_STATE    Path to a Playwright storageState JSON captured from a real
 *                    logged-in session (fallback when dev-login is off).
 *
 * ── Optional env ───────────────────────────────────────────────────────────
 *   HEADLESS     "false" to watch the browser. Default headless.
 *   SCREENSHOT   Output screenshot path. Default /tmp/atlas-verify.png
 *   TURN_TIMEOUT Per-turn settle timeout in ms. Default 120000.
 */

import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import { chromium, type Page, type WebSocket } from "playwright";

const { values: args } = parseArgs({
  options: {
    message: { type: "string", multiple: true, short: "m", default: [] },
  },
  allowPositionals: false,
});

const REPO = (process.env.REPO ?? "atlas").toLowerCase();
const ATLAS_URL = process.env.ATLAS_URL ?? "";
const DEV_LOGIN_UUID = process.env.DEV_LOGIN_UUID ?? "";
const STORAGE_STATE = process.env.STORAGE_STATE ?? "";
const HEADLESS = process.env.HEADLESS !== "false";
const SCREENSHOT = process.env.SCREENSHOT ?? "/tmp/atlas-verify.png";
const TURN_TIMEOUT = parseInt(process.env.TURN_TIMEOUT ?? "120000", 10);

if (REPO !== "atlas" && REPO !== "atlas2") {
  console.error(`ERROR: REPO must be "atlas" or "atlas2" (got "${REPO}").`);
  process.exit(2);
}
if (!ATLAS_URL) {
  console.error("ERROR: ATLAS_URL must be set.");
  process.exit(2);
}

// Collect messages: --message args take precedence, else MESSAGES_FILE/MESSAGES_JSON.
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
if (REPO === "atlas" && !DEV_LOGIN_UUID && !STORAGE_STATE) {
  console.error("ERROR: atlas needs auth — set DEV_LOGIN_UUID or STORAGE_STATE.");
  process.exit(2);
}

const origin = new URL(ATLAS_URL).origin;
const markers: string[] = [];
let threadId = "";

console.log(`Atlas conversation`);
console.log(`  repo:     ${REPO}`);
console.log(`  url:      ${ATLAS_URL}`);
console.log(`  auth:     ${REPO === "atlas" ? (DEV_LOGIN_UUID ? "dev-login uuid" : "storageState") : "demo (none)"}`);
console.log(`  messages: ${MESSAGES.length}`);

/** Tap botResponseStream websocket frames and stream `text` deltas to stdout. */
function streamFromWebsocket(ws: WebSocket): void {
  if (!/\/api\/websocket/.test(ws.url())) return;
  ws.on("framereceived", (frame) => {
    const payload = typeof frame.payload === "string" ? frame.payload : frame.payload.toString("utf8");
    if (!payload.includes("botResponseStream")) return;
    try {
      const msg = JSON.parse(payload);
      if (msg.type !== "next") return;
      const chunk = msg.payload?.data?.botResponseStream;
      if (chunk?.text) {
        process.stdout.write(chunk.text);
        if (chunk.threadId) threadId = chunk.threadId;
      }
    } catch {
      /* non-JSON / partial frame — ignore */
    }
  });
}

async function runAtlas(page: Page): Promise<void> {
  // Stream every botResponseStream websocket as it opens.
  page.on("websocket", streamFromWebsocket);

  await page.goto(ATLAS_URL, { waitUntil: "domcontentloaded" });
  await page.locator("#atlas-nav-button").click();
  await page.getByRole("heading", { name: "Ask Atlas" }).waitFor({ state: "visible" });

  for (let i = 0; i < MESSAGES.length; i++) {
    const marker = `atlas-verify-${Date.now()}-${i}`;
    markers.push(marker);
    console.log(`\n\n─── turn ${i + 1}/${MESSAGES.length} ───`);
    console.log(`you> ${MESSAGES[i]}  (${marker})`);
    process.stdout.write("atlas> ");

    const box = page.getByLabel("editable markdown");
    await box.focus();
    // insertText avoids the WebKit/Shadow-DOM fill bug.
    await page.keyboard.insertText(`${MESSAGES[i]} (${marker})`);
    await page.getByRole("button", { name: "Send message" }).click();

    // The user's message echoes into the transcript; then the reply streams over WS.
    await page.getByText(marker).waitFor({ state: "visible", timeout: 30_000 });
    // Wait for the assistant turn to settle (network idle after streaming completes).
    await page.waitForLoadState("networkidle", { timeout: TURN_TIMEOUT }).catch(() => {});
  }
}

async function runAtlas2(page: Page): Promise<void> {
  // Capture the thread id from the chat response header for reporting.
  page.on("response", (res) => {
    if (/\/api\/chat/.test(res.url())) {
      const tid = res.headers()["x-atlas-thread-id"];
      if (tid) threadId = tid;
    }
  });

  const chatUrl = new URL(ATLAS_URL).pathname === "/"
    ? ATLAS_URL.replace(/\/$/, "") + "/chat"
    : ATLAS_URL;
  await page.goto(chatUrl, { waitUntil: "domcontentloaded" });

  const input = page.getByLabel("Message Atlas");
  await input.waitFor({ state: "visible" });

  for (let i = 0; i < MESSAGES.length; i++) {
    const marker = `atlas-verify-${Date.now()}-${i}`;
    markers.push(marker);
    console.log(`\n\n─── turn ${i + 1}/${MESSAGES.length} ───`);
    console.log(`you> ${MESSAGES[i]}`);
    process.stdout.write("atlas> ");

    // Index of the assistant bubble that will hold this turn's reply.
    const assistantBubbles = page.locator('[data-role="assistant"], [data-message-role="assistant"]');
    const before = await assistantBubbles.count();

    await input.fill(MESSAGES[i]);
    await page.getByRole("button", { name: /send/i }).click();

    // Poll the new assistant bubble's text and stream deltas to stdout (SSE has no
    // observable frames via Playwright, so we read the rendered text as it grows).
    const target = assistantBubbles.nth(before);
    await target.waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
    let printed = "";
    const deadline = Date.now() + TURN_TIMEOUT;
    let stableFor = 0;
    while (Date.now() < deadline) {
      const text = (await target.textContent().catch(() => "")) ?? "";
      if (text.length > printed.length) {
        process.stdout.write(text.slice(printed.length));
        printed = text;
        stableFor = 0;
      } else {
        stableFor += 150;
        if (printed.length > 0 && stableFor >= 1500) break; // settled
      }
      await page.waitForTimeout(150);
    }
  }
}

async function main() {
  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext(STORAGE_STATE ? { storageState: STORAGE_STATE } : {});

  try {
    // atlas dev-login bypass (only if a uuid was provided) — sets the session cookie.
    if (REPO === "atlas" && DEV_LOGIN_UUID) {
      const res = await context.request.fetch(`${origin}/dev/login?user_uuid=${DEV_LOGIN_UUID}`);
      if (!res.ok()) {
        console.error(`dev-login failed: HTTP ${res.status()} — env may not expose /dev/login. ` +
          `Use STORAGE_STATE instead.`);
        process.exit(2);
      }
    }

    const page = await context.newPage();
    if (REPO === "atlas") await runAtlas(page);
    else await runAtlas2(page);

    await page.screenshot({ path: SCREENSHOT, fullPage: true });
    console.log(`\n\n✅ Conversation complete. Screenshot: ${SCREENSHOT}`);
    if (threadId) console.log(`Thread id: ${threadId}`);
    console.log(`Markers (for Langfuse correlation): ${markers.join(", ")}`);
    if (REPO === "atlas") {
      console.log(`\nNow confirm the model in Langfuse:\n` +
        `  npx tsx verify-langfuse-model.ts --environment <env> --minutes 15`);
    } else {
      console.log(`\natlas-2 Langfuse is not enabled — model is fixed in code ` +
        `(claude-sonnet-4-6). Thread id above is the runtime record.`);
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((e) => { console.error(e); process.exit(2); });
