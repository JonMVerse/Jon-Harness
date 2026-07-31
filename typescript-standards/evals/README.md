# Evals

Deterministic and model-free. `node check.mjs` verifies the plugin hangs
together; `trigger-evals.json` is data it validates.

## `check.mjs`

Five checks: (1) markdown links in `SKILL.md` + `references/*.md` resolve;
(2) `plugin.json` skills exist, each with a `SKILL.md`; (3) the ESLint config
flags every `review-fixtures/fixtures/` file and leaves every
`review-fixtures/good/` file clean — so rules and fixes can't drift; (4) the
injected `SUMMARY` is grounded in the references (every backtick-cited construct
in its rule sections appears in `references/*.md`); (5) `trigger-evals.json` is
structurally valid.

Needs `eslint` + `typescript-eslint` resolvable; the plugin commits neither, so
install them where you run the check.

## `trigger-evals.json`

Cases (`query` + `should_trigger`) for the `review` skill's trigger precision.
`check.mjs` validates their structure (well-formed, both polarities, no dupes);
the **semantic** judgement — does the description actually fire? — is
model-decided and not run here. A shared model-based harness is a
marketplace-level follow-up: no plugin ships one yet, and all use this shape.

## `review-fixtures/`

A bad/good pair for each ESLint-enforced (⚙️) rule, plus a few illustrating key
review patterns (e.g. `data-access`, `test-mock`) — paired by filename, so
`fixtures/` must fire and `good/` must be clean (a false-positive regression
test). Review-only rules live in
[`anti-patterns`](../references/anti-patterns.md). To add a case: drop a
violating file in `fixtures/` and its fix in `good/` (same name), then run
`node check.mjs`.
