# langfuse-query

Query a Langfuse project for tool call volume and latency metrics.

## Usage

```
/langfuse-query [tool=<name>] [window=30|60|90] [type=volume|latency|both]
```

**Arguments** (all optional — defaults shown):
- `tool` — Langfuse observation name to filter on. Omit to aggregate across all tools.
- `window` — lookback window in days. Default: `90`. Valid: `30`, `60`, `90`.
- `type` — what to compute. Default: `both`. Options: `volume` (daily counts + p50/p90/p99), `latency` (p50/p90/p99 in ms), `both`.

## Prerequisites

Export these three env vars before running:

```bash
export LANGFUSE_SECRET_KEY="sk-lf-..."
export LANGFUSE_PUBLIC_KEY="pk-lf-..."
export LANGFUSE_BASE_URL="https://cloud.langfuse.com"
```

The script reads them at runtime — they are never written to disk.

## What it does

1. Pages through the Langfuse v2 `/api/public/v2/observations` endpoint using cursor-based pagination.
2. Filters by `name` (tool name) and `fromStartTime` (window start).
3. Computes:
   - **Volume**: daily call counts, plus p50/p90/p99 of daily counts over the window.
   - **Latency**: p50/p90/p99 of individual call durations in milliseconds.
4. Prints a summary table to stdout.

## Running

Claude Code will run the bundled script automatically. To run manually:

```bash
npx tsx <path-to-harness>/core/skills/langfuse-query/assets/query.ts \
  --tool ksb_search \
  --window 90 \
  --type both
```

## Steps Claude Code takes

When you invoke `/langfuse-query`:

1. Check that `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY`, and `LANGFUSE_BASE_URL` are set; prompt the user to export them if not.
2. Run `npx tsx <skill-dir>/assets/query.ts` with the parsed arguments.
3. Present the output as a formatted summary. Offer to write results into a Coda table if the user has the Coda MCP connected.
