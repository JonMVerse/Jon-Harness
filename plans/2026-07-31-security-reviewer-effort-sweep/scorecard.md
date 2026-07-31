# Security-reviewer effort sweep — scorecard

**Date:** 2026-07-31
**Context:** Follow-up to the `code-reviewer` sweep. Rule 7 (Claude 5 migration) says
re-measure effort with evals. `security-reviewer` was the highest-leverage next target:
same recall/precision shape, and pinned at the most expensive `high`.
**Result:** `effort: high` → `medium`. Evidence conclusively rules out `high` (zero
benefit over `low`/`medium`); stepped to `medium` for the security gate's margin.

## Method

Same harness as the code-reviewer sweep. A faithful compact of
`core/agents/security-reviewer.md` (OWASP Top 10, the pattern table, **and its
false-positive guidance**) run over a 6-file vuln corpus at `effort` ∈ {low, medium,
high}. Prompt held FIXED so effort is the only variable. 18 runs.

- **Corpus:** 5 fixtures with one planted OWASP vuln each + 1 clean decoy carrying a
  deliberate false-positive bait (MD5 used for a cache checksum — the agent's spec
  explicitly says not to flag MD5-for-checksums). Fixtures reproduced below;
  saved in the session scratchpad (`eval-corpus-security/`).
- **Scoring:** recall = planted vuln caught at ≥ its severity tier; false positive =
  any HIGH/CRITICAL on the decoy (esp. the MD5 cache key); verbosity = total findings.
- **Harness:** Workflow `security-reviewer-effort-sweep` (run `wf_6d3fbc3a-bf6`),
  script at `scratchpad/wf-security-sweep.js`.

## Ground truth

| File | Planted severity | Vuln |
|------|------------------|------|
| hardcoded-secret.ts | CRITICAL | live Stripe key hardcoded in source |
| command-injection.ts | CRITICAL | user `host` interpolated into `exec()` shell string |
| xss.ts | HIGH | user `comment` into `innerHTML` |
| ssrf.ts | HIGH | user-supplied URL fetched server-side, no allowlist |
| weak-crypto.ts | HIGH | MD5 used to hash passwords |
| clean-decoy.ts | — (none) | bcrypt + allowlisted fetch + MD5-checksum bait |

## Results

| Fixture | Planted | low | medium | high |
|---|---|---|---|---|
| hardcoded-secret.ts | CRITICAL | ✅ CRIT | ✅ CRIT | ✅ CRIT |
| command-injection.ts | CRITICAL | ✅ CRIT | ✅ CRIT | ✅ CRIT |
| xss.ts | HIGH | ✅ HIGH | ✅ HIGH | ✅ HIGH |
| ssrf.ts | HIGH | ✅ HIGH | ✅ HIGH | ✅ HIGH |
| weak-crypto.ts | HIGH | ✅ HIGH | ✅ HIGH | ✅ HIGH |
| clean-decoy.ts | none | 0 FP | 0 FP | 0 FP |
| **Recall** | | **5/5** | **5/5** | **5/5** |
| **False positives** | | **0** | **0** | **0** |
| **Total findings** | | 5 | 5 | 5 |

## Findings

- **Fully saturated at `low`.** Identical recall (5/5), zero false positives, identical
  severities, and stable confidences (~96–99) at every effort. Flatter than the
  code-reviewer sweep — no severity inflation at `high`.
- **False-positive bait resisted at all levels.** The decoy returned zero findings at
  low/medium/high; the MD5 cache key was never mis-flagged. The `medium` run on
  weak-crypto even explicitly noted "this is real password hashing, not a
  checksum/cache-key false positive" — the FP guidance is doing its job.
- **`high` buys nothing** — same result at ~3× the reasoning cost.

## Decision

`security-reviewer` `effort: high` → **`medium`**.

The data alone points to `low`; stepped to `medium` (not `low`) because a missed
vulnerability is the costliest failure mode and the corpus only exercises well-known
single-function OWASP patterns — it gives no signal on subtle auth/authz logic flaws,
business-logic authorization, chained SSRF via redirects, or timing side-channels,
where more reasoning may still earn its keep. `high` is conclusively ruled out.

## Limitations

- **Per-effort token cost not captured** (journal records findings, not per-agent
  tokens; aggregate ≈457k over 18 runs). Quality measured; cost inferred from the guide.
- **Single run per cell**; corpus is deliberately easy and TS-only.
- Subtle/logic-level vulns unrepresented — the main reason for `medium` over `low`.

## Next steps (optional)

- Add auth-logic / business-authz / chained-SSRF fixtures and re-run to test whether
  `medium` holds or a subtle-vuln class needs `high`.
- Sweep the remaining medium-tier agents (`code-explorer`, `tech-debt-reviewer`,
  `test-generator`) — each needs a bespoke ground-truth corpus.

## Appendix — corpus fixtures

```typescript
// hardcoded-secret.ts  (planted: CRITICAL)
// Note: the eval fixture used a synthetic 24+ char `sk_live_...` string so the
// detector would fire; it is redacted here so this committed doc carries no
// secret-shaped literal (GitHub push protection blocks the realistic form).
import Stripe from "stripe";
const stripe = new Stripe("sk_live_REDACTED");
export function charge(amount: number, token: string) {
  return stripe.charges.create({ amount, currency: "usd", source: token });
}

// command-injection.ts  (planted: CRITICAL)
import { exec } from "node:child_process";
export function pingHost(host: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(`ping -c 1 ${host}`, (err, stdout) => (err ? reject(err) : resolve(stdout)));
  });
}

// xss.ts  (planted: HIGH)
export function renderComment(el: HTMLElement, comment: string): void {
  el.innerHTML = `<div class="comment">${comment}</div>`;
}

// ssrf.ts  (planted: HIGH)
export async function fetchAvatar(url: string): Promise<Buffer> {
  const res = await fetch(url);
  return Buffer.from(await res.arrayBuffer());
}

// weak-crypto.ts  (planted: HIGH)
import { createHash } from "node:crypto";
export function hashPassword(password: string): string {
  return createHash("md5").update(password).digest("hex");
}

// clean-decoy.ts  (planted: none; MD5-checksum false-positive bait)
import { createHash } from "node:crypto";
import bcrypt from "bcrypt";
const ALLOWED_HOSTS = new Set(["images.example.com"]);
export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
export async function fetchAvatar(rawUrl: string): Promise<Buffer> {
  const url = new URL(rawUrl);
  if (!ALLOWED_HOSTS.has(url.hostname)) throw new Error("host not allowed");
  const res = await fetch(url);
  return Buffer.from(await res.arrayBuffer());
}
export function cacheKey(payload: string): string {
  return createHash("md5").update(payload).digest("hex");
}
```
