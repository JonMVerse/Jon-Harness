#!/usr/bin/env npx tsx
/**
 * Phase-1 test-plan runner (PoC).
 *
 * For each scenario: send the prompt(s) through `converse-atlas` (API mode), then
 * confirm the EXPECTED TOOLS fired by reading the new Langfuse `type=TOOL`
 * observations. Tool-usage assertions only — answer-quality grading (the LLM-judge)
 * and page-context scenarios are Phase 2/3 (see ../docs/test-plan-execution.md).
 *
 * Correlation is DATA-ANCHORED, not clock-based: before each scenario we record the
 * max observation startTime in the target environment, then attribute any newer
 * GENERATION/TOOL observations to that scenario. (Clock-skew-safe; assumes the env is
 * quiet enough that scenarios don't interleave — fine for a small sequential sample.)
 *
 * Env:
 *   ATLAS_AUTH                          staging mv_auth token (required)
 *   LANGFUSE_PUBLIC_KEY/SECRET_KEY      Langfuse creds (required)
 *   LANGFUSE_BASE_URL                   default https://cloud.langfuse.com
 *   ENVIRONMENT                         default "staging"   REPO default "atlas"
 *   SCENARIOS                           path to scenarios JSON (default ./sample-scenarios.json)
 *
 * Scenario JSON: [{ "id": "...", "messages": ["..."], "expectedTools": ["ksb_search"], "note": "..." }]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ENVIRONMENT = process.env.ENVIRONMENT ?? "staging";
const REPO = process.env.REPO ?? "atlas";
const SCENARIOS_PATH = process.env.SCENARIOS ?? resolve(HERE, "sample-scenarios.json");
const INGEST_TIMEOUT_MS = Number(process.env.INGEST_TIMEOUT_MS ?? 300_000); // how long to wait for a trace to land (default 5 min)
const TOOL_SETTLE_MS = 20_000; // after the reply lands, wait for tool spans to flush
// CAPTURE_ONLY: run the conversation, print the reply + confirm the environment, and
// SKIP the Langfuse tool assertion entirely. Useful while API-mode tracing is unresolved
// (and while curriculum tools are stubbed). Needs ATLAS_AUTH only — no Langfuse creds.
const CAPTURE_ONLY = process.env.CAPTURE_ONLY === "true";

const SECRET = process.env.LANGFUSE_SECRET_KEY ?? "";
const PUBLIC = process.env.LANGFUSE_PUBLIC_KEY ?? "";
const BASE = (process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com").replace(/\/$/, "");

if (!process.env.ATLAS_AUTH) { console.error("ERROR: ATLAS_AUTH (staging mv_auth token) required."); process.exit(2); }
if (!CAPTURE_ONLY && (!SECRET || !PUBLIC)) { console.error("ERROR: LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY required (or set CAPTURE_ONLY=true)."); process.exit(2); }
const LF_AUTH = "Basic " + Buffer.from(`${PUBLIC}:${SECRET}`).toString("base64");

interface Scenario { id: string; messages: string[]; expectedTools: string[]; forbidTools?: string[]; section?: string; note?: string; }
interface Obs { type: string | null; name: string | null; startTime: string | null; traceId: string | null; environment: string | null; }

const scenarios: Scenario[] = JSON.parse(readFileSync(SCENARIOS_PATH, "utf8"));

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

// Langfuse Cloud occasionally drops a socket mid-request (UND_ERR_SOCKET). Retry
// transient network/5xx errors so one blip doesn't kill a multi-minute run.
async function lfFetch(url: string, attempts = 6): Promise<Response> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: { Authorization: LF_AUTH } });
      if (res.status >= 500) throw new Error(`Langfuse HTTP ${res.status}`);
      return res;
    } catch (e) {
      last = e;
      if (i < attempts - 1) await sleep(2000 * (i + 1));
    }
  }
  throw last;
}

async function fetchObs(type: string): Promise<Obs[]> {
  const out: Obs[] = [];
  let cursor: string | undefined;
  let pages = 0;
  do {
    const p = new URLSearchParams({ type, limit: "100", fields: "core,basic" });
    if (cursor) p.set("cursor", cursor);
    const res = await lfFetch(`${BASE}/api/public/v2/observations?${p}`);
    if (!res.ok) { throw new Error(`Langfuse HTTP ${res.status}: ${await res.text()}`); }
    const b = (await res.json()) as { data: Obs[]; meta?: { cursor?: string } };
    out.push(...b.data.filter((o) => o.environment === ENVIRONMENT));
    cursor = b.meta?.cursor;
  } while (cursor && ++pages < 5);
  return out;
}

// Atlas encodes the model in a GENERATION name as "chat <model>"; TOOL observations
// are named after the function (ksb_search, get_pathway, ...).
async function maxStart(): Promise<string> {
  const [g, t] = await Promise.all([fetchObs("GENERATION"), fetchObs("TOOL")]);
  return [...g, ...t].reduce((m, o) => (o.startTime && o.startTime > m ? o.startTime : m), "");
}

function runConverse(messages: string[]): { ok: boolean; reason: string; out: string } {
  console.log(`  → converse-atlas (${messages.length} msg)…`);
  const r = spawnSync("npx", ["tsx", resolve(HERE, "converse-atlas.ts")], {
    env: { ...process.env, REPO, ENVIRONMENT, MODE: "api", MESSAGES_JSON: JSON.stringify(messages) },
    encoding: "utf8",
    timeout: 180_000,
  });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  if (r.status === 0) return { ok: true, reason: "", out };
  const reason = /unauthor/i.test(out)
    ? "auth: staging mv_auth token expired/invalid — refresh atlas_mv_auth_staging"
    : (out.match(/Error:.*/)?.[0] ?? `converse-atlas exited ${r.status}`).slice(0, 160);
  console.log(`    ${reason}`);
  return { ok: false, reason, out };
}

/** Wait until a GENERATION newer than `since` appears, then return the models + TOOL names newer than `since`. */
async function toolsSince(since: string): Promise<{ tools: string[]; models: string[]; sawGeneration: boolean }> {
  const start = Date.now();
  let sawGeneration = false;
  while (Date.now() - start < INGEST_TIMEOUT_MS) {
    const gens = await fetchObs("GENERATION");
    if (gens.some((o) => o.startTime && o.startTime > since)) { sawGeneration = true; break; }
    await sleep(15_000);
  }
  if (sawGeneration) await sleep(TOOL_SETTLE_MS); // let tool spans flush
  // Model lives in the GENERATION name ("chat <model>"); the model field is null via this API.
  const models = [
    ...new Set(
      (await fetchObs("GENERATION"))
        .filter((o) => o.startTime && o.startTime > since)
        .map((o) => (o.name ?? "").replace(/^(chat|embeddings|execute_tool)\s+/i, ""))
        .filter(Boolean),
    ),
  ];
  const tools = (await fetchObs("TOOL"))
    .filter((o) => o.startTime && o.startTime > since)
    .map((o) => o.name ?? "")
    .filter(Boolean);
  return { tools, models, sawGeneration };
}

const matched = (expected: string, fired: string[]) =>
  fired.some((f) => f.toLowerCase().includes(expected.toLowerCase()));

const extractReply = (out: string) =>
  (out.match(/atlas>[\s\S]*?(?=\n+✅|\n+Thread id:|$)/g) ?? []).join("\n").replace(/atlas>\s?/g, "").trim();
const RESULTS_OUT = process.env.RESULTS_OUT ?? "/tmp/run-test-plan-results.json";

async function main() {
  console.log(`Phase-1 test-plan run — repo=${REPO} env=${ENVIRONMENT} scenarios=${scenarios.length}${CAPTURE_ONLY ? " (capture-only — Langfuse step skipped)" : ""}\n`);

  if (CAPTURE_ONLY) {
    const cap: { id: string; env: string; api: string; ok: boolean; reason: string }[] = [];
    for (const s of scenarios) {
      console.log(`── ${s.id} ──`);
      const conv = runConverse(s.messages);
      const env = conv.out.match(/environment:\s*(\S+)/)?.[1] ?? "?";
      const api = conv.out.match(/api url:\s*(\S+)/)?.[1] ?? "?";
      const reply = (conv.out.match(/atlas>[\s\S]*?(?=\n+✅|\n+Thread id:|$)/g) ?? []).join("\n").trim();
      console.log(`    env=${env}  api=${api}  ${conv.ok ? "✓ replied" : "ERROR: " + conv.reason}`);
      if (reply) console.log(reply.split("\n").map((l) => "    " + l).join("\n"));
      console.log();
      cap.push({ id: s.id, env, api, ok: conv.ok, reason: conv.reason });
    }
    console.log("=== CAPTURE SUMMARY (Langfuse assertion skipped) ===");
    for (const c of cap) console.log(`${c.id.padEnd(16)} env=${(c.env).padEnd(10)} ${c.ok ? "replied" : "ERROR " + c.reason}`);
    const allStaging = cap.every((c) => c.env === ENVIRONMENT);
    const replied = cap.filter((c) => c.ok).length;
    console.log(`\n${replied}/${cap.length} got a reply · environment confirmed: ${allStaging ? `all "${ENVIRONMENT}"` : "MIXED/UNKNOWN — see above"}`);
    process.exit(replied === cap.length && allStaging ? 0 : 1);
  }

  type Status = "pass" | "fail" | "error";
  interface Result { id: string; section: string; prompt: string; response: string; models: string[]; expected: string[]; forbidden: string[]; fired: string[]; status: Status; reason: string }
  const results: Result[] = [];
  const writeResults = () => writeFileSync(RESULTS_OUT, JSON.stringify(results, null, 2)); // incremental — survives a mid-run abort

  for (const s of scenarios) {
    const forbid = s.forbidTools ?? [];
    console.log(`── ${s.id} ──  expect: [${s.expectedTools.join(", ")}]${forbid.length ? `  forbid: [${forbid.join(", ")}]` : ""}`);
    const prompt = s.messages.join(" / ");
    const section = s.section ?? "";
    // Langfuse calls are wrapped so a transient network/DNS blip degrades THIS scenario
    // to "error" (response still captured) instead of crashing the whole run.
    const since = await maxStart().then((v) => v, () => null);
    const conv = runConverse(s.messages);
    const response = extractReply(conv.out);
    if (response) console.log(response.split("\n").map((l) => "    " + l).join("\n"));
    if (!conv.ok) { results.push({ id: s.id, section, prompt, response, models: [], expected: s.expectedTools, forbidden: [], fired: [], status: "error", reason: conv.reason }); writeResults(); console.log(); continue; }
    const ts = since === null ? null : await toolsSince(since).then((v) => v, () => null);
    const tools = ts?.tools ?? [];
    const models = ts?.models ?? [];
    const sawGeneration = ts?.sawGeneration ?? false;
    const lfFailed = since === null || ts === null;
    const fired = [...new Set(tools)];
    const firedForbidden = forbid.filter((f) => matched(f, tools));
    const expectedOk = s.expectedTools.every((e) => matched(e, tools));
    const status: Status = lfFailed || !sawGeneration ? "error" : expectedOk && firedForbidden.length === 0 ? "pass" : "fail";
    const reason = lfFailed
      ? "langfuse fetch failed (network) — response captured"
      : !sawGeneration
      ? "no trace landed in time (ingestion lag or API turn not traced)"
      : firedForbidden.length ? `forbidden tool fired: ${firedForbidden.join(",")}` : "";
    results.push({ id: s.id, section, prompt, response, models, expected: s.expectedTools, forbidden: firedForbidden, fired, status, reason });
    writeResults();
    console.log(`    model: [${models.join(", ") || "—"}]  fired: [${fired.join(", ") || "(none)"}]${firedForbidden.length ? ` forbidden:[${firedForbidden.join(",")}]` : ""}  → ${status === "pass" ? "✅ PASS" : status === "fail" ? "❌ FAIL" : "⚠️ ERROR"}\n`);
  }

  console.log("\n=== SUMMARY ===");
  console.log(`${"scenario".padEnd(8)} ${"result".padEnd(7)} ${"model".padEnd(22)} expected → fired`);
  for (const r of results) {
    const tag = r.status === "pass" ? "PASS" : r.status === "fail" ? "FAIL" : "ERROR";
    console.log(`${r.id.padEnd(8)} ${tag.padEnd(7)} ${(r.models.join(",") || "—").padEnd(22)} [${r.expected.join(",")}] → [${r.fired.join(",") || "—"}]${r.reason ? `  (${r.reason})` : ""}`);
  }
  const pass = results.filter((r) => r.status === "pass").length;
  const fail = results.filter((r) => r.status === "fail").length;
  const err = results.filter((r) => r.status === "error").length;
  console.log(`\n${pass} pass · ${fail} fail · ${err} error  (of ${results.length}).`);
  writeFileSync(RESULTS_OUT, JSON.stringify(results, null, 2));
  console.log(`Results written to ${RESULTS_OUT}`);
  process.exit(err > 0 ? 2 : fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
