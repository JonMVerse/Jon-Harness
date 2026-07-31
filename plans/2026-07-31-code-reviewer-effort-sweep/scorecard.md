# Code-reviewer effort sweep — scorecard

**Date:** 2026-07-31
**Context:** Claude 5 prompt migration (core 3.12.0). Rule 7 says re-measure effort
with evals, don't port. This sweep calibrates `code-reviewer`'s `effort` setting.
**Result:** `effort: high` → `medium` (evidence rules out `high`; corpus too easy to
justify `low` for the merge gate).

## Method

No model-based eval harness exists in the repo or upstream (upstream README defers
it as a marketplace-level follow-up), so one was built for this run.

- **Corpus:** 6 single-function TypeScript files — 5 with one unambiguous planted
  defect each, 1 clean decoy (false-positive test). Ground truth and fixtures saved
  in the session scratchpad (`eval-corpus/`), reproduced below.
- **Sweep:** the `code-reviewer` review logic (faithful compact of
  `core/agents/code-reviewer.md`, post-R2 — no confidence gate) run over each file at
  `effort` ∈ {low, medium, high}. Prompt held FIXED across runs so effort is the only
  variable. 18 runs total, structured findings output.
- **Scoring:** recall = planted defect caught (judged vs. criterion); false positive =
  any HIGH/CRITICAL finding on the decoy; verbosity = total findings.
- **Harness:** Workflow `code-reviewer-effort-sweep` (run `wf_d882d48b-4c3`),
  script at `scratchpad/wf-effort-sweep.js`.

## Ground truth

| File | Planted severity | Defect |
|------|------------------|--------|
| null-deref.ts | HIGH | `.find()` result used without undefined check → runtime crash |
| off-by-one.ts | HIGH | loop `i <= nums.length` reads past end → `NaN` |
| sql-injection.ts | CRITICAL | user input string-interpolated into SQL |
| race-cond.ts | HIGH | check-then-act on balance across an await gap (TOCTOU) |
| resource-leak.ts | MEDIUM | file handle not closed if `read` throws (no try/finally) |
| clean-decoy.ts | — (none) | null-safe, parameterised, idiomatic |

## Results

| Corpus file | Planted | low | medium | high |
|---|---|---|---|---|
| null-deref.ts | HIGH | ✅ HIGH | ✅ HIGH | ✅ HIGH |
| off-by-one.ts | HIGH | ✅ HIGH | ✅ HIGH | ✅ HIGH |
| sql-injection.ts | CRITICAL | ✅ CRIT | ✅ CRIT | ✅ CRIT |
| race-cond.ts | HIGH | ✅ HIGH | ✅ HIGH | ✅ CRIT (escalated) |
| resource-leak.ts | MEDIUM | ✅ MED | ✅ MED | ✅ MED |
| clean-decoy.ts | none | 0 FP | 0 FP | 0 FP |
| **Recall** | | **5/5** | **5/5** | **5/5** |
| **False positives** | | **0** | **0** | **0** |
| **Total findings (verbosity)** | | 10 | 9 | 9 |

## Findings

- **Quality saturates at `low`.** Higher effort added no recall, no precision, no extra
  findings. Secondary real bugs on `race-cond` (missing amount-validation, silent
  failure on insufficient funds) were caught at every level.
- **`high`'s only observable effect was severity inflation** (race-cond HIGH→CRITICAL;
  amount-check MEDIUM→HIGH) and marginally *lower* confidence scores — arguably slightly
  worse calibration, not better.
- **R2 fix corroborated:** on the decoy, all levels correctly declined a HIGH/CRITICAL
  and surfaced a genuine nullable-`email` edge case at LOW confidence (40–55) — the
  report-with-a-score-don't-gate behaviour working as intended.
- Reproduces the guide's Rule 2 note: "review accuracy holds at lower effort."

## Decision

`code-reviewer` `effort: high` → **`medium`**.

Data alone points to `low`; stepped to `medium` (not `low`) because the corpus is
easier than production — 6 textbook single-function bugs — and this is the merge-gate
reviewer. The sweep conclusively rules out `high` (no gain, mild severity inflation);
`medium` keeps a margin for the subtler, multi-file, context-dependent defects the
corpus can't represent.

## Limitations

- **Per-effort token cost not captured** — the workflow journal records findings, not
  per-agent tokens (aggregate ≈452k over 18 runs). Quality side measured; cost side
  inferred from the guide (effort ↑ = thinking tokens ↑).
- **Single run per cell** — directional signal, no variance measurement.
- **Corpus is deliberately easy** and TypeScript-only — biases toward "low is enough."
- **Only `code-reviewer` swept.** `security-reviewer` (high) and the medium-tier agents
  (`code-explorer`, `tech-debt-reviewer`, `test-generator`) and `documentation-generator`
  (low) keep reasoned defaults — no corpus yet.

## Next steps (optional)

- Build planted-bug corpora for the other specialised agents to sweep their effort too.
- Add multi-file / subtler-bug fixtures so the corpus better represents real PRs; re-run
  and re-check whether `low` holds (would justify dropping `code-reviewer` to `low`).
- Promote this into a shared model-based eval harness (upstream's deferred follow-up).

## Appendix — corpus fixtures

```typescript
// null-deref.ts  (planted: HIGH)
export function getUserEmail(users: { id: string; email: string }[], id: string): string {
  const user = users.find((u) => u.id === id);
  return user.email.toLowerCase();
}

// off-by-one.ts  (planted: HIGH)
export function sum(nums: number[]): number {
  let total = 0;
  for (let i = 0; i <= nums.length; i++) {
    total += nums[i];
  }
  return total;
}

// sql-injection.ts  (planted: CRITICAL)
import { db } from "./db";
export async function findByName(name: string) {
  const query = `SELECT * FROM users WHERE name = '${name}'`;
  return db.raw(query);
}

// race-cond.ts  (planted: HIGH)
export async function withdraw(account: Account, amount: number): Promise<void> {
  const balance = await account.getBalance();
  if (balance >= amount) {
    await account.setBalance(balance - amount);
  }
}

// resource-leak.ts  (planted: MEDIUM)
import { open } from "node:fs/promises";
export async function readHeader(path: string): Promise<string> {
  const fh = await open(path, "r");
  const { buffer } = await fh.read(Buffer.alloc(16), 0, 16, 0);
  await fh.close();
  return buffer.toString("utf8");
}

// clean-decoy.ts  (planted: none)
import { db } from "./db";
export async function getUserEmail(id: string): Promise<string | null> {
  const rows = await db.query("SELECT email FROM users WHERE id = $1", [id]);
  const row = rows[0];
  return row ? row.email.toLowerCase() : null;
}
```
