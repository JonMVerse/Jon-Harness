# typescript-standards

Makes Claude write Multiverse-conforming TypeScript — and gives every repo the
same rules in its own lint.

> **This is an aspirational standard, not a description of the org's current
> code.** It sits at the strict end of modern TypeScript practice, and the org's repos do
> **not** conform — `@multiverse-io/eslint` leaves `no-explicit-any` off,
> `noUncheckedIndexedAccess` is only in ~4 repos, and there's no shared tsconfig.
> That gap is the point: the guardrail is the bar to migrate _toward_, and it
> stays stricter than current reality by design.

Three parts:

1. **Proactive injection (opt-in)** — a `SessionStart` hook
   (`scripts/inject-conventions.mjs`) puts the rule summary into Claude's
   context _before_ it writes code, so it follows the conventions from the start.
2. **A skill** — `references/` is the rule book (modern best practice, grounded
   in a scan of the org's TS repos) and `/typescript-standards:review` runs an
   on-demand full-checklist audit. Add `--fix` to apply the fixable findings and
   verify them against the repo's typecheck and build — reverting any change that
   can't be made green, so a fix never leaves the build broken.
3. **A shared ESLint config** ([`eslint.config.mjs`](./eslint.config.mjs)) — real
   `typescript-eslint` rules; run it standalone (`eslint --config …`) or extend it
   from your repo's own flat config, so the same rules hold for Claude, in your
   editor, and in CI.

## Install

Once approved and promoted to `plugins/` (listed in the marketplace catalogue):

```shell
/plugin install typescript-standards@multiverse
```

### While it's still in `suggested/` (now)

This plugin is a **proposal under review**, so it is deliberately absent from
`.claude-plugin/marketplace.json` — `/plugin install …@multiverse` will **not**
find it yet.

From the `ai-toolkit` repo root, start a session with the plugin loaded:

```shell
claude --plugin-dir ./suggested/typescript-standards
```

That makes everything available in the session: the `/typescript-standards:review`
skill and the `references/` rule book are usable immediately, and the
`SessionStart` injection hook is registered (still gated — see below). After
editing any plugin file, run `/reload-plugins` to pick the change up without
restarting.

To exercise the two opt-in pieces in that session:

- **Proactive injection** — set `TYPESCRIPT_STANDARDS_INJECT=1`. To make it
  always-on, add it to your shell profile (`~/.zshrc`) or to Claude Code settings
  `env`; or `export` it for a one-off session. It only injects in TS repos, so it
  costs nothing elsewhere.
- **The ESLint config** — point ESLint at it directly, no repo wiring needed:
  `eslint --config ./suggested/typescript-standards/eslint.config.mjs <paths>`
  (needs `eslint` + `typescript-eslint` resolvable in that repo).

## The ESLint config

[`eslint.config.mjs`](./eslint.config.mjs) is the executable rule set —
intentionally **syntax-only** (fast, no `tsconfig` needed) and **dependency-free**
(it resolves `typescript-eslint` from the repo it runs in). Two equally-supported
ways to use it:

- **Standalone** — point ESLint straight at it, no repo wiring and nothing in your
  repo changes: `eslint --config <plugin>/eslint.config.mjs <paths>`. (This is
  also how the injected "check your work" step runs it.)
- **Extend it** — add it to your repo's own flat config (`extends`) so the rules
  also hold in your editor, pre-commit, and CI.

It enforces, as real `typescript-eslint` rules:

- **No `any`** — use `unknown` + a guard, or a zod schema.
- **No `as` assertions** (`as const` excepted) and no non-null `!`.
- **No `enum`** — an `as const` object + a derived union.
- **No scattered `process.env`** — read it in one validated config module, import the typed value elsewhere.
- **No `@ts-ignore`** — use `@ts-expect-error` with a reason.
- **`const` over `let`**, and no parameter mutation.
- **Early return** — no `else` after `return`; nesting depth capped at 3.

[`eslint.config.mjs`](./eslint.config.mjs) is the single source; bad→good examples
are in [`anti-patterns.md`](./references/anti-patterns.md).

## Proactive injection (opt-in)

So Claude follows the conventions _as it writes_ (not only after), a
`SessionStart` hook (`scripts/inject-conventions.mjs`) injects the rule summary
into context before it generates anything.

**Off by default.** To enable it:

1. Install the plugin (or load it from the checkout — see [Install](#install)).
2. Set the env var `TYPESCRIPT_STANDARDS_INJECT=1` — for always-on, add it to
   your shell profile (`~/.zshrc`) or Claude Code settings `env`; or `export` it
   for a single session.
3. Start Claude in a TypeScript repo (one with a reachable `tsconfig.json`).

The hook then injects the summary at the start of each session. It injects
nothing in non-TS repos (no reachable `tsconfig.json`), so it costs zero tokens
elsewhere. Prefer the on-demand route? Leave it off and use
`/typescript-standards:review` or the references.

## The rule book

The conventions live in [`references/`](./references) —
[`anti-patterns.md`](./references/anti-patterns.md) is the bad→good catalogue,
the topic files (`type-design`, `functions-generics`, …) hold the rationale, and
[`org-conventions.md`](./references/org-conventions.md) records what the org's
codebase actually does. The `review` skill ([`SKILL.md`](./skills/review/SKILL.md))
routes to each.

## Evals

`node evals/check.mjs` is the deterministic, model-free check: it resolves the
markdown links, validates the manifest, and runs `eslint.config.mjs` over
`review-fixtures/fixtures/` (each must fire) and `review-fixtures/good/` (must be
clean) — proving the config catches what it claims and the fixes pass. It needs
`eslint` + `typescript-eslint` resolvable where you run it (the plugin commits neither).
`trigger-evals.json` holds skill trigger-precision cases. See
[`evals/README.md`](./evals/README.md).

## Owner

**TBC** — owning team not yet confirmed (candidate: Identity &
Access, `@multiverse-io/identity-access`, **#ask-product-identity-and-access**).
See [`PROPOSAL.md`](./PROPOSAL.md).
