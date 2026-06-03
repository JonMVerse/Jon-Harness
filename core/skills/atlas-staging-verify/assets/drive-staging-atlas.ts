#!/usr/bin/env npx tsx
/**
 * Drive staging Ask Atlas to generate one real LLM call, so the model routing
 * (ATLAS-3699: gpt-5.4-mini) can be confirmed in Langfuse.
 *
 * Standalone Playwright script (does NOT use the mocked client/e2e fixture —
 * this hits the REAL staging backend). Selectors mirror client/e2e/utils.ts.
 *
 * Run with Playwright's browsers available:
 *   npx playwright install chromium   # once
 *   STAGING_ATLAS_URL=... [auth env] npx tsx drive-staging-atlas.ts
 *
 * ── Required env ───────────────────────────────────────────────────────────
 *   STAGING_ATLAS_URL   Surface that embeds the Atlas widget on staging
 *                       (the page where #atlas-nav-button renders, e.g. a
 *                       staging /demo page). VERIFY this against staging.
 *
 * ── Auth (pick ONE — staging uses real auth, not the dev mock) ─────────────
 *   STAGING_DEV_LOGIN_UUID   If staging exposes the dev-login bypass, the test
 *                            user's UUID; the script hits
 *                            `${origin}/dev/login?user_uuid=...` (same as the
 *                            e2e `login` helper). May be DISABLED on staging.
 *   STAGING_STORAGE_STATE    Path to a Playwright storageState JSON captured
 *                            from a real logged-in session (fallback when
 *                            dev-login is off — log in once, save state).
 *
 * ── Optional env ───────────────────────────────────────────────────────────
 *   TEST_MESSAGE   Message to send. Default is a tool-triggering prompt so the
 *                  trace also exercises tool calling (what Cem wants to test).
 *   HEADLESS       "false" to watch the browser. Default headless.
 *   SCREENSHOT     Output screenshot path. Default /tmp/atlas-staging-verify.png
 */

import { chromium } from "playwright";

const TARGET_URL = process.env.STAGING_ATLAS_URL ?? "";
const DEV_LOGIN_UUID = process.env.STAGING_DEV_LOGIN_UUID ?? "";
const STORAGE_STATE = process.env.STAGING_STORAGE_STATE ?? "";
const MESSAGE =
  process.env.TEST_MESSAGE ??
  "Find KSBs related to building data pipelines and summarise them.";
const HEADLESS = process.env.HEADLESS !== "false";
const SCREENSHOT = process.env.SCREENSHOT ?? "/tmp/atlas-staging-verify.png";

if (!TARGET_URL) {
  console.error("ERROR: STAGING_ATLAS_URL must be set.");
  process.exit(2);
}
if (!DEV_LOGIN_UUID && !STORAGE_STATE) {
  console.error("ERROR: set STAGING_DEV_LOGIN_UUID or STAGING_STORAGE_STATE for auth.");
  process.exit(2);
}

const marker = `atlas3699-verify-${Date.now()}`;
const origin = new URL(TARGET_URL).origin;

console.log(`Driving staging Ask Atlas`);
console.log(`  url:     ${TARGET_URL}`);
console.log(`  auth:    ${DEV_LOGIN_UUID ? "dev-login uuid" : "storageState"}`);
console.log(`  message: ${MESSAGE}`);
console.log(`  marker:  ${marker}  (use this + the timestamp to find the Langfuse trace)`);

async function main() {
const browser = await chromium.launch({ headless: HEADLESS });
const context = await browser.newContext(
  STORAGE_STATE ? { storageState: STORAGE_STATE } : {}
);

try {
  // Dev-login bypass (only if staging allows it) — sets the session cookie.
  if (DEV_LOGIN_UUID) {
    const res = await context.request.fetch(`${origin}/dev/login?user_uuid=${DEV_LOGIN_UUID}`);
    if (!res.ok()) {
      console.error(`dev-login failed: HTTP ${res.status()} — staging may not expose /dev/login. ` +
        `Use STAGING_STORAGE_STATE instead.`);
      process.exit(2);
    }
  }

  const page = await context.newPage();
  await page.goto(TARGET_URL, { waitUntil: "domcontentloaded" });

  // Open Ask Atlas (bot chat — this is the path that calls the LLM).
  await page.locator("#atlas-nav-button").click();
  await page.getByRole("heading", { name: "Ask Atlas" }).waitFor({ state: "visible" });

  // Type into the message box. insertText avoids the WebKit/Shadow-DOM fill bug.
  const box = page.getByLabel("editable markdown");
  await box.focus();
  await page.keyboard.insertText(`${MESSAGE} (${marker})`);

  // Capture the thread id from the GraphQL response if we can, for correlation.
  const threadResp = page
    .waitForResponse(
      (r) => r.url().includes("/api/graphql") && r.request().method() === "POST",
      { timeout: 60_000 }
    )
    .catch(() => null);

  await page.getByRole("button", { name: "Send message" }).click();

  // The user's message should echo into the transcript.
  await page.getByText(marker).waitFor({ state: "visible", timeout: 30_000 });

  // Wait for the assistant to start responding (a real LLM call → Langfuse trace).
  // Heuristic: wait for network to settle after the send.
  await page.waitForLoadState("networkidle", { timeout: 120_000 }).catch(() => {});
  await threadResp;

  await page.screenshot({ path: SCREENSHOT, fullPage: true });
  console.log(`\n✅ Message sent through staging Ask Atlas. Screenshot: ${SCREENSHOT}`);
  console.log(`Now confirm the model in Langfuse:\n` +
    `  npx tsx verify-langfuse-model.ts --expect gpt-5.4-mini --minutes 15 --check-tools`);
} finally {
  await context.close();
  await browser.close();
}
}

main().catch((e) => { console.error(e); process.exit(2); });
