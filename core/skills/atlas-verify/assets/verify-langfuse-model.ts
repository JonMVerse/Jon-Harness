#!/usr/bin/env npx tsx
/**
 * Langfuse model-confirmation check.
 *
 * Reports the model(s) that recently served Atlas LLM generations in a Langfuse
 * project, and optionally PASS/FAILs against an expected model. Also optionally
 * reports tool-calling spans.
 *
 * Reads LANGFUSE_SECRET_KEY, LANGFUSE_PUBLIC_KEY, LANGFUSE_BASE_URL from env
 * (point these at the target environment's Langfuse project).
 *
 * Usage:
 *   npx tsx verify-langfuse-model.ts \
 *     [--expect <model>] [--minutes 30] [--environment <env>] [--check-tools] [--json]
 *
 * Without --expect: lists the models seen (exit 0 if any generations found, else 1).
 * With --expect:    exit 0 if a generation matching --expect was found, 1 otherwise
 * (so it can gate a script / CI step).
 */

import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    expect:        { type: "string",  default: undefined },
    minutes:       { type: "string",  default: "30" },
    environment:   { type: "string",  default: undefined },
    "check-tools": { type: "boolean", default: false },
    json:          { type: "boolean", default: false },
  },
  allowPositionals: false,
});

// --expect is optional. Without it we just REPORT the models seen in the window
// (confirms "a message landed and which model served it"); with it we also
// PASS/FAIL on whether that specific model served a generation.
const EXPECT_MODEL = (args.expect ?? "").toLowerCase();
const HAS_EXPECT = EXPECT_MODEL.length > 0;
// Langfuse stores the resolved model in the observation NAME (e.g.
// "chat gpt54mini-2026-03-17" for Azure, "chat gpt-5.4-mini-2026-03-17" for
// litellm) — the `model` field comes back null via this API. Match the name
// against both the dotted id and the dots-stripped Azure deployment form.
const EXPECT_COMPACT = EXPECT_MODEL.replace(/[.\-\s]/g, "");
const WINDOW_MIN = parseInt(args.minutes ?? "30", 10);
// Staging + production share one Langfuse project, so filter by environment to
// avoid mistaking a prod trace for a staging one. Pass --environment staging.
const ENVIRONMENT = args.environment ?? null;
const CHECK_TOOLS = !!args["check-tools"];
const AS_JSON = !!args.json;

if (!Number.isFinite(WINDOW_MIN) || WINDOW_MIN <= 0) {
  console.error("--minutes must be a positive integer");
  process.exit(2);
}

const SECRET = process.env.LANGFUSE_SECRET_KEY ?? "";
const PUBLIC = process.env.LANGFUSE_PUBLIC_KEY ?? "";
const BASE_URL = (process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com").replace(/\/$/, "");

if (!SECRET || !PUBLIC) {
  console.error("ERROR: LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY must be set (staging project).");
  process.exit(2);
}

const AUTH = "Basic " + Buffer.from(`${PUBLIC}:${SECRET}`).toString("base64");

interface Observation {
  id: string;
  traceId: string | null;
  type: string | null;
  name: string | null;
  model: string | null;
  startTime: string | null;
  environment: string | null;
}

interface ObservationsResponse {
  data: Observation[];
  meta: { cursor?: string };
}

/**
 * Fetch observations newest-first and keep those within `windowMin` of the most
 * recent observation — a DATA-ANCHORED window. We deliberately do NOT use
 * `fromStartTime: now - windowMin`, because the local clock can be skewed from
 * the trace timestamps (observed ~38 min on a sandbox), which silently drops
 * real recent traces. Anchoring to the newest observed startTime is clock-safe.
 *
 * Pass `cutoffMsOverride` to reuse another fetch's window (so SPANs share the
 * GENERATION window). Returns the rows kept and the cutoff used.
 */
async function fetchRecent(
  type: string,
  environment: string | null,
  windowMin: number,
  cutoffMsOverride: number | null,
): Promise<{ rows: Observation[]; cutoffMs: number | null; anchorIso: string | null }> {
  const rows: Observation[] = [];
  let cursor: string | undefined;
  let cutoffMs = cutoffMsOverride;
  let anchorIso: string | null = null;
  let pages = 0;

  outer: do {
    const params = new URLSearchParams({ type, limit: "100", fields: "core,basic,metrics" });
    if (environment) params.set("environment", environment);
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(`${BASE_URL}/api/public/v2/observations?${params}`, {
      headers: { Authorization: AUTH },
    });
    if (!res.ok) {
      console.error(`HTTP ${res.status}: ${await res.text()}`);
      process.exit(2);
    }
    const body = (await res.json()) as ObservationsResponse;

    for (const obs of body.data) {
      const t = obs.startTime ? Date.parse(obs.startTime) : NaN;
      if (!Number.isFinite(t)) continue;
      if (cutoffMs === null) { anchorIso = obs.startTime; cutoffMs = t - windowMin * 60_000; }
      if (t >= cutoffMs) rows.push(obs);
      else break outer; // results are newest-first, so we're past the window
    }
    cursor = body.meta?.cursor;
  } while (cursor && ++pages < 50);

  return { rows, cutoffMs, anchorIso };
}

async function main() {
// Belt-and-braces: filter by environment client-side too, in case the API
// ignores the param (staging + prod share one project).
const inEnv = (o: Observation) => !ENVIRONMENT || o.environment === ENVIRONMENT;

const gen = await fetchRecent("GENERATION", ENVIRONMENT, WINDOW_MIN, null);
const generations = gen.rows.filter(inEnv);
// Most recent first
generations.sort((a, b) => (b.startTime ?? "").localeCompare(a.startTime ?? ""));

// The model lives in the name (model field is null); derive it for display + matching.
const modelOf = (o: Observation) => (o.model ?? (o.name ?? "").replace(/^(chat|embeddings|execute_tool)\s+/i, "") ?? "(unknown)");
const matchesExpect = (o: Observation) => {
  if (!HAS_EXPECT) return false;
  const hay = `${o.name ?? ""} ${o.model ?? ""}`.toLowerCase();
  return hay.includes(EXPECT_MODEL) || hay.includes(EXPECT_COMPACT);
};

const matched = generations.filter(matchesExpect);

let toolSpans: Observation[] = [];
if (CHECK_TOOLS) {
  // Reuse the generations' window so spans line up with the same activity.
  const sp = await fetchRecent("SPAN", ENVIRONMENT, WINDOW_MIN, gen.cutoffMs);
  toolSpans = sp.rows.filter(inEnv).filter((s) => /tool|function/i.test(s.name ?? ""));
}

if (AS_JSON) {
  console.log(JSON.stringify({
    expect: HAS_EXPECT ? EXPECT_MODEL : null,
    windowMinutes: WINDOW_MIN,
    generationsFound: generations.length,
    matchedExpectedModel: HAS_EXPECT ? matched.length : undefined,
    distinctModels: [...new Set(generations.map(modelOf))],
    toolSpans: CHECK_TOOLS ? toolSpans.length : undefined,
    sample: generations.slice(0, 10).map((g) => ({
      time: g.startTime, environment: g.environment, model: modelOf(g), name: g.name, traceId: g.traceId,
    })),
  }, null, 2));
} else {
  console.log(
    HAS_EXPECT
      ? `\nLangfuse model check — expecting "${EXPECT_MODEL}" within ${WINDOW_MIN} min of the newest trace`
      : `\nLangfuse model report — models within ${WINDOW_MIN} min of the newest trace`
  );
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Environment filter: ${ENVIRONMENT ?? "(none — all envs in project)"}`);
  console.log(`Window anchor (newest trace): ${gen.anchorIso ?? "(none found)"}`);
  console.log(`\nGenerations found: ${generations.length}`);
  if (generations.length > 0) {
    const models = new Map<string, number>();
    for (const g of generations) { const m = modelOf(g); models.set(m, (models.get(m) ?? 0) + 1); }
    console.log("Models seen (from observation name):");
    for (const [m, n] of [...models.entries()].sort((a, b) => b[1] - a[1])) {
      const hit = HAS_EXPECT && (m.toLowerCase().includes(EXPECT_MODEL) || m.toLowerCase().includes(EXPECT_COMPACT));
      console.log(`  ${hit ? "✅" : "  "} ${m.padEnd(28)} ${n}`);
    }
    console.log("\nMost recent generations:");
    console.log(`  ${"time".padEnd(24)} ${"env".padEnd(12)} ${"model".padEnd(26)} traceId`);
    for (const g of generations.slice(0, 10)) {
      console.log(`  ${(g.startTime ?? "").padEnd(24)} ${(g.environment ?? "-").padEnd(12)} ${modelOf(g).padEnd(26)} ${g.traceId ?? ""}`);
    }
  }
  if (CHECK_TOOLS) {
    console.log(`\nTool-call spans (name ~ tool/function): ${toolSpans.length}`);
    for (const t of toolSpans.slice(0, 10)) console.log(`  ${t.startTime}  ${t.name}  trace=${t.traceId}`);
  }
  if (HAS_EXPECT) {
    console.log(
      matched.length > 0
        ? `\n✅ PASS — ${matched.length} generation(s) served by "${EXPECT_MODEL}".`
        : `\n❌ FAIL — no generations served by "${EXPECT_MODEL}" in the window.`
    );
  } else {
    console.log(
      generations.length > 0
        ? `\n✅ ${generations.length} generation(s) found — see models above.`
        : `\n❌ No generations found in the window.`
    );
  }
  if (CHECK_TOOLS) {
    console.log(toolSpans.length > 0 ? "✅ Tool-calling spans present." : "⚠️  No tool-calling spans in the window.");
  }
}

// Exit 0 when the assertion holds: a matching model with --expect, else any generation.
process.exit((HAS_EXPECT ? matched.length > 0 : generations.length > 0) ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
