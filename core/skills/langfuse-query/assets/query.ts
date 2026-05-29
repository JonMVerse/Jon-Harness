#!/usr/bin/env npx tsx
/**
 * Langfuse tool-call query script.
 *
 * Reads LANGFUSE_SECRET_KEY, LANGFUSE_PUBLIC_KEY, LANGFUSE_BASE_URL from env.
 * Uses the Langfuse v2 /api/public/v2/observations endpoint (cursor pagination).
 *
 * Usage:
 *   npx tsx query.ts [--tool <name>] [--window 30|60|90] [--type volume|latency|both]
 */

import { parseArgs } from "node:util";

// ── Args ─────────────────────────────────────────────────────────────────────

const { values: args } = parseArgs({
  options: {
    tool:   { type: "string",  default: undefined },
    window: { type: "string",  default: "90" },
    type:   { type: "string",  default: "both" },
  },
  allowPositionals: false,
});

const WINDOW_DAYS = parseInt(args.window ?? "90", 10);
const TOOL_NAME   = args.tool ?? null;
const QUERY_TYPE  = (args.type ?? "both") as "volume" | "latency" | "both";

if (![30, 60, 90].includes(WINDOW_DAYS)) {
  console.error("--window must be 30, 60, or 90");
  process.exit(1);
}
if (!["volume", "latency", "both"].includes(QUERY_TYPE)) {
  console.error("--type must be volume, latency, or both");
  process.exit(1);
}

// ── Auth / config ─────────────────────────────────────────────────────────────

const SECRET = process.env.LANGFUSE_SECRET_KEY ?? "";
const PUBLIC = process.env.LANGFUSE_PUBLIC_KEY ?? "";
const BASE_URL = (process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com").replace(/\/$/, "");

if (!SECRET || !PUBLIC) {
  console.error("ERROR: LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY must be set.");
  process.exit(1);
}

const AUTH = "Basic " + Buffer.from(`${PUBLIC}:${SECRET}`).toString("base64");

// ── Langfuse types ─────────────────────────────────────────────────────────────

interface Observation {
  id: string;
  name: string | null;
  startTime: string | null;
  latency: number | null; // seconds
}

interface ObservationsResponse {
  data: Observation[];
  meta: {
    cursor?: string;
  };
}

// ── Fetch all observations (cursor pagination) ────────────────────────────────

async function fetchObservations(toolName: string | null, fromDate: Date): Promise<Observation[]> {
  const observations: Observation[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({
      fromStartTime: fromDate.toISOString(),
      limit: "100",
      type: "SPAN",
    });
    if (toolName) params.set("name", toolName);
    if (cursor)   params.set("cursor", cursor);

    const res = await fetch(`${BASE_URL}/api/public/v2/observations?${params}`, {
      headers: { Authorization: AUTH },
    });

    if (!res.ok) {
      console.error(`HTTP ${res.status}: ${await res.text()}`);
      process.exit(1);
    }

    const data = (await res.json()) as ObservationsResponse;
    observations.push(...data.data);
    cursor = data.meta?.cursor;
  } while (cursor);

  return observations;
}

// ── Statistics ────────────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(Math.floor((sorted.length * p) / 100), sorted.length - 1);
  return sorted[idx];
}

// ── Volume report ─────────────────────────────────────────────────────────────

function reportVolume(observations: Observation[]): void {
  const daily = new Map<string, number>();
  for (const obs of observations) {
    if (obs.startTime) {
      const day = obs.startTime.slice(0, 10);
      daily.set(day, (daily.get(day) ?? 0) + 1);
    }
  }

  if (daily.size === 0) {
    console.log("No observations found.");
    return;
  }

  const counts = [...daily.values()].sort((a, b) => a - b);
  const total = counts.reduce((s, c) => s + c, 0);
  const days = [...daily.entries()].sort(([a], [b]) => a.localeCompare(b));

  console.log(`\nTotal calls:       ${total}`);
  console.log(`Days with calls:   ${counts.length}`);
  console.log(
    `Daily count percentiles — p50: ${percentile(counts, 50)}  ` +
    `p90: ${percentile(counts, 90)}  ` +
    `p99: ${percentile(counts, 99)}`
  );
  console.log("\nDaily breakdown (most recent 10):");
  console.log(`  ${"Date".padEnd(12)} ${"Calls".padStart(6)}`);
  console.log(`  ${"-".repeat(12)} ${"-".repeat(6)}`);
  for (const [day, count] of days.slice(-10)) {
    console.log(`  ${day.padEnd(12)} ${String(count).padStart(6)}`);
  }
}

// ── Latency report ────────────────────────────────────────────────────────────

function reportLatency(observations: Observation[]): void {
  const latenciesMs = observations
    .filter((o) => o.latency != null)
    .map((o) => (o.latency as number) * 1000)
    .sort((a, b) => a - b);

  if (latenciesMs.length === 0) {
    console.log("No latency data found.");
    return;
  }

  console.log(`\nLatency percentiles (ms) — n=${latenciesMs.length}`);
  console.log(`  p50:  ${percentile(latenciesMs, 50).toFixed(1).padStart(9)} ms`);
  console.log(`  p90:  ${percentile(latenciesMs, 90).toFixed(1).padStart(9)} ms`);
  console.log(`  p99:  ${percentile(latenciesMs, 99).toFixed(1).padStart(9)} ms`);
  console.log(`  max:  ${Math.max(...latenciesMs).toFixed(1).padStart(9)} ms`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

const fromDate = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
const label = `tool=${TOOL_NAME ?? "all"}, window=${WINDOW_DAYS}d`;
console.log(`Fetching observations: ${label}`);

const observations = await fetchObservations(TOOL_NAME, fromDate);
console.log(`Retrieved ${observations.length} observations.`);

if (QUERY_TYPE === "volume" || QUERY_TYPE === "both") {
  console.log("\n=== VOLUME ===");
  reportVolume(observations);
}

if (QUERY_TYPE === "latency" || QUERY_TYPE === "both") {
  console.log("\n=== LATENCY ===");
  reportLatency(observations);
}
