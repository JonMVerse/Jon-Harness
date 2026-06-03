#!/usr/bin/env npx tsx
/**
 * Langfuse model-confirmation check.
 *
 * Confirms that recent Atlas LLM generations in a Langfuse project were served
 * by an expected model (e.g. gpt-5.4-mini), and optionally that tool-calling
 * spans are present. Intended to verify ATLAS-3699 in staging after deploy.
 *
 * Reads LANGFUSE_SECRET_KEY, LANGFUSE_PUBLIC_KEY, LANGFUSE_BASE_URL from env
 * (point these at the STAGING Langfuse project).
 *
 * Usage:
 *   npx tsx verify-langfuse-model.ts \
 *     [--expect gpt-5.4-mini] [--minutes 30] [--check-tools] [--json]
 *
 * Exit code: 0 if a generation matching --expect was found, 1 otherwise
 * (so it can gate a script / CI step).
 */

import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    expect:        { type: "string",  default: "gpt-5.4-mini" },
    minutes:       { type: "string",  default: "30" },
    environment:   { type: "string",  default: undefined },
    "check-tools": { type: "boolean", default: false },
    json:          { type: "boolean", default: false },
  },
  allowPositionals: false,
});

const EXPECT_MODEL = (args.expect ?? "gpt-5.4-mini").toLowerCase();
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

async function fetchObservations(type: string, fromDate: Date, environment: string | null): Promise<Observation[]> {
  const out: Observation[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({
      fromStartTime: fromDate.toISOString(),
      type,
      limit: "100",
      fields: "core,basic,metrics",
    });
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
    out.push(...body.data);
    cursor = body.meta?.cursor;
  } while (cursor);

  return out;
}

async function main() {
const fromDate = new Date(Date.now() - WINDOW_MIN * 60 * 1000);

// Belt-and-braces: filter by environment client-side too, in case the API
// ignores the param (staging + prod share one project).
const inEnv = (o: Observation) => !ENVIRONMENT || o.environment === ENVIRONMENT;

const generations = (await fetchObservations("GENERATION", fromDate, ENVIRONMENT)).filter(inEnv);
// Most recent first
generations.sort((a, b) => (b.startTime ?? "").localeCompare(a.startTime ?? ""));

// The model lives in the name (model field is null); derive it for display + matching.
const modelOf = (o: Observation) => (o.model ?? (o.name ?? "").replace(/^(chat|embeddings|execute_tool)\s+/i, "") ?? "(unknown)");
const matchesExpect = (o: Observation) => {
  const hay = `${o.name ?? ""} ${o.model ?? ""}`.toLowerCase();
  return hay.includes(EXPECT_MODEL) || hay.includes(EXPECT_COMPACT);
};

const matched = generations.filter(matchesExpect);

let toolSpans: Observation[] = [];
if (CHECK_TOOLS) {
  const spans = (await fetchObservations("SPAN", fromDate, ENVIRONMENT)).filter(inEnv);
  toolSpans = spans.filter((s) => /tool|function/i.test(s.name ?? ""));
}

if (AS_JSON) {
  console.log(JSON.stringify({
    expect: EXPECT_MODEL,
    windowMinutes: WINDOW_MIN,
    generationsFound: generations.length,
    matchedExpectedModel: matched.length,
    distinctModels: [...new Set(generations.map(modelOf))],
    toolSpans: CHECK_TOOLS ? toolSpans.length : undefined,
    sample: generations.slice(0, 10).map((g) => ({
      time: g.startTime, environment: g.environment, model: modelOf(g), name: g.name, traceId: g.traceId,
    })),
  }, null, 2));
} else {
  console.log(`\nLangfuse model check — expecting "${EXPECT_MODEL}" in the last ${WINDOW_MIN} min`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Environment filter: ${ENVIRONMENT ?? "(none — all envs in project)"}`);
  console.log(`\nGenerations found: ${generations.length}`);
  if (generations.length > 0) {
    const models = new Map<string, number>();
    for (const g of generations) { const m = modelOf(g); models.set(m, (models.get(m) ?? 0) + 1); }
    console.log("Models seen (from observation name):");
    for (const [m, n] of [...models.entries()].sort((a, b) => b[1] - a[1])) {
      const hit = m.toLowerCase().includes(EXPECT_MODEL) || m.toLowerCase().includes(EXPECT_COMPACT);
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
  console.log(
    matched.length > 0
      ? `\n✅ PASS — ${matched.length} generation(s) served by "${EXPECT_MODEL}".`
      : `\n❌ FAIL — no generations served by "${EXPECT_MODEL}" in the window.`
  );
  if (CHECK_TOOLS) {
    console.log(toolSpans.length > 0 ? "✅ Tool-calling spans present." : "⚠️  No tool-calling spans in the window.");
  }
}

process.exit(matched.length > 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
