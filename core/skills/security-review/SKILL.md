---
name: security-review
description: "Reference library for the security-reviewer agent: detailed vulnerability patterns with code examples, severity classification, report templates, and PR review templates. Invoke /core:security-review to run a structured security review of the current diff or a specified path."
user-invocable: true
---

# Security Review

Reference library for the `security-reviewer` agent. Contains the detailed patterns, examples, report templates, and PR review templates that the agent needs during `/review` flows.

When invoked directly, runs a structured security review of the current diff (or the path passed as an argument) and outputs a completed findings report.

---

## 1. Vulnerability Patterns and Code Examples

### 1.1 Injection

**SQL injection — string concatenation**

```ts
// CRITICAL — never do this
const rows = await db.query(`SELECT * FROM users WHERE email = '${email}'`);

// Correct — parameterised
const rows = await db.query('SELECT * FROM users WHERE email = $1', [email]);
```

**Command injection**

```ts
// CRITICAL
exec(`convert ${userFile} output.png`);

// Correct — never pass user input to a shell; use safe APIs
execFile('convert', [userFile, 'output.png']);
```

**Template/expression injection** — watch for `eval()`, `new Function()`, `vm.runInNewContext()`, Handlebars `{{{triple}}}`, and server-side template engines rendering user-supplied strings.

---

### 1.2 Broken Authentication

**Weak password hashing**

```ts
// CRITICAL
const hash = crypto.createHash('md5').update(password).digest('hex');

// Correct
const hash = await bcrypt.hash(password, 12); // argon2 also acceptable
```

**Insecure JWT handling**

```ts
// HIGH — algorithm confusion: accepts 'none', or trusts header alg
jwt.verify(token, secret); // ← missing { algorithms: ['HS256'] }

// Correct
jwt.verify(token, secret, { algorithms: ['HS256'] });
```

**Missing brute-force protection** — any login, password-reset, or OTP endpoint without rate limiting is HIGH severity.

---

### 1.3 Sensitive Data Exposure

**Hardcoded credentials**

```ts
// CRITICAL — patterns to flag:
const API_KEY = 'sk-live-abc123';
const DB_PASS = 'hunter2';
const token   = 'ghp_xxxxxxxxxxxx';

// Correct
const API_KEY = process.env.API_KEY;
```

Common secret patterns to grep:

```
/(?:password|passwd|secret|api.?key|token|auth)\s*[:=]\s*['"][^'"]{6,}/i
/(?:AKIA|sk-live-|ghp_|xoxb-|xoxp-)[A-Za-z0-9+/]{16,}/
```

**PII in logs**

```ts
// MEDIUM
logger.info('Login attempt', { email, password }); // ← never log passwords

// Correct
logger.info('Login attempt', { email });
```

---

### 1.4 Broken Access Control

**Missing authorisation check**

```ts
// CRITICAL — route returns any user's data
app.get('/api/users/:id/profile', async (req, res) => {
  const user = await db.users.findById(req.params.id);
  res.json(user);
});

// Correct
app.get('/api/users/:id/profile', requireAuth, async (req, res) => {
  if (req.user.id !== req.params.id && !req.user.isAdmin) return res.sendStatus(403);
  const user = await db.users.findById(req.params.id);
  res.json(user);
});
```

**IDOR (Insecure Direct Object Reference)** — any endpoint that accepts a resource ID without verifying the caller owns it.

---

### 1.5 Security Misconfiguration

**Dangerous CORS**

```ts
// HIGH
app.use(cors({ origin: '*', credentials: true })); // credentials + wildcard is invalid and ignored by browsers — but indicates intent to allow broadly

// Correct
app.use(cors({ origin: process.env.ALLOWED_ORIGIN, credentials: true }));
```

**Missing security headers** — flag responses lacking:

```
Content-Security-Policy
X-Frame-Options (or CSP frame-ancestors)
X-Content-Type-Options: nosniff
Strict-Transport-Security
```

**Debug mode in production** — `DEBUG=*`, `NODE_ENV !== 'production'`, stack traces in API error responses.

---

### 1.6 XSS (Cross-Site Scripting)

```ts
// HIGH — direct DOM injection
element.innerHTML = userInput;
document.write(userInput);
eval(userInput);

// Correct
element.textContent = userInput;
// Or sanitise with DOMPurify when HTML is genuinely needed
element.innerHTML = DOMPurify.sanitize(userInput);
```

React, Vue, and Angular auto-escape by default — flag `dangerouslySetInnerHTML`, `v-html`, and `[innerHTML]` as requiring review.

---

### 1.7 SSRF (Server-Side Request Forgery)

```ts
// HIGH — fetches a URL supplied by the user
const response = await fetch(req.body.url);

// Correct — allowlist approach
const ALLOWED = new Set(['https://api.partner.com', 'https://hooks.example.com']);
const parsed = new URL(req.body.url);
if (!ALLOWED.has(parsed.origin)) return res.status(400).json({ error: 'URL not allowed' });
const response = await fetch(req.body.url);
```

---

### 1.8 Insecure Deserialization

```ts
// HIGH
const data = JSON.parse(req.body);       // safe if input is validated afterwards
const obj  = deserialize(req.body);      // libraries like node-serialize, pickle — dangerous
const obj  = eval(`(${req.body})`);      // CRITICAL
```

---

### 1.9 Race Conditions / TOCTOU

```ts
// CRITICAL — balance check without lock
const balance = await db.query('SELECT balance FROM accounts WHERE id = $1', [id]);
if (balance.rows[0].balance >= amount) {
  await db.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, id]);
}

// Correct — single atomic statement with guard
const result = await db.query(
  'UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING balance',
  [amount, id]
);
if (result.rowCount === 0) throw new Error('Insufficient funds');
```

---

### 1.10 Vulnerable Dependencies

```bash
npm audit --audit-level=high
npx snyk test
```

Flag any `high` or `critical` advisories. Check `package-lock.json` for indirect dependencies with known CVEs.

---

## 2. Severity Classification

| Severity | Description | SLA |
|----------|-------------|-----|
| **CRITICAL** | Direct exploit path; data breach, auth bypass, RCE, financial loss | Block merge — fix before merge |
| **HIGH** | Significant risk; requires specific conditions or user interaction | Fix within 1 sprint |
| **MEDIUM** | Defence-in-depth gap; low direct exploitability | Fix within current quarter |
| **LOW** | Hardening improvement; minimal real-world impact | Track as tech debt |
| **INFO** | Observation or best-practice suggestion | Optional |

---

## 3. Report Template

Use this structure when the `security-reviewer` agent outputs findings:

```markdown
## Security Review — [PR title or path] — [YYYY-MM-DD]

**Reviewer:** security-reviewer agent
**Scope:** [files reviewed / diff range]
**Overall risk:** CRITICAL | HIGH | MEDIUM | LOW | PASS

---

### Findings

#### [CRITICAL-001] [Short title]
- **File:** `path/to/file.ts:42`
- **Pattern:** [e.g. Hardcoded API key]
- **Impact:** [What an attacker could do]
- **Reproduction:** [Minimal steps]
- **Fix:**

```ts
// Before
const key = 'sk-live-abc';

// After
const key = process.env.STRIPE_SECRET_KEY;
```

---

#### [HIGH-001] [Short title]
...

---

### OWASP Top 10 Coverage

| # | Category | Status |
|---|----------|--------|
| A01 | Broken Access Control | Pass / Finding(s) |
| A02 | Cryptographic Failures | Pass / Finding(s) |
| A03 | Injection | Pass / Finding(s) |
| A04 | Insecure Design | Pass / Finding(s) |
| A05 | Security Misconfiguration | Pass / Finding(s) |
| A06 | Vulnerable Components | Pass / Finding(s) |
| A07 | Identification and Authentication Failures | Pass / Finding(s) |
| A08 | Software and Data Integrity Failures | Pass / Finding(s) |
| A09 | Security Logging and Monitoring | Pass / Finding(s) |
| A10 | SSRF | Pass / Finding(s) |

### Secrets Scan
- [ ] No hardcoded secrets detected
- [ ] `.env.example` values are placeholders only
- [ ] No secrets committed in git history (checked with `git log -p | grep -E 'sk-|ghp_|AKIA'`)

### Dependencies
- `npm audit` result: [clean / N high / N critical]

### Recommended next steps
1. [Action] by [owner]
2. ...
```

---

## 4. PR Review Template

Post this as a PR comment when running a security review against a pull request:

```markdown
### Security Review

> Automated findings from the `security-reviewer` agent. Each item links to
> the relevant line. CRITICAL and HIGH items must be resolved before merge.

#### Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 0 |
| LOW | 0 |

**Result:** ✅ No blocking issues | ⚠️ Review required | ❌ Must fix before merge

---

#### Findings

<!-- Repeat per finding -->
**[SEVERITY] Short title** — `path/to/file.ts:L42`

> [One-sentence description of the issue and its impact]

<details>
<summary>Detail and fix</summary>

**Pattern:** ...
**Impact:** ...

```ts
// Before
...

// After
...
```

</details>

---

*Generated by `security-reviewer`. False positives? Add a `// security-review-ignore: reason` comment on the line and re-run.*
```

---

## 5. Inline Suppression Convention

To suppress a finding on a specific line, add an inline comment:

```ts
const hash = md5(checksumInput); // security-review-ignore: checksum only, not a password
```

The `security-reviewer` agent will skip flagged lines but log the suppression in its report so humans can audit them.

---

## 6. Running a Review

**Full diff review (most common — used by `/review`):**

```
/core:security-review
```

**Review a specific path:**

```
/core:security-review src/api/payments/
```

**Review with PR comment output:**

```
/core:security-review --comment
```

The skill delegates to the `security-reviewer` agent, which runs the analysis commands, applies the patterns from §1, and outputs a completed report using the template from §3 (or §4 if `--comment` is passed).
