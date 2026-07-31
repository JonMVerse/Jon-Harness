// TypeScript-standards — shared ESLint flat config. Ships as just this file (no
// deps): run standalone (`eslint --config <plugin>/eslint.config.mjs <paths>`) or
// `extends` it from a repo's own config — both equal. `typescript-eslint` resolves
// from the repo (cwd, then this file's dir), with a clear error if absent.
//
// Syntax-only (fast, no tsconfig): type-aware and semantic rules stay in the
// `review` skill. Stricter than @multiverse-io/eslint (e.g. no-explicit-any). Being
// syntax-only it matches direct AST forms only, not values that flow through an
// alias or a type — type-aware lint + the skill are the backstop.
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

function loadTseslint() {
  for (const base of [join(process.cwd(), "noop.js"), fileURLToPath(import.meta.url)]) {
    try {
      return createRequire(base)("typescript-eslint");
    } catch {
      // try the next resolution base
    }
  }
  throw new Error(
    "typescript-standards/eslint.config.mjs: cannot resolve `typescript-eslint` — " +
      "install it in this repo (it is a peer dependency of this shared config).",
  );
}
const tseslint = loadTseslint();

export default tseslint.config({
  files: ["**/*.ts", "**/*.tsx"],
  extends: [tseslint.configs.base],
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-non-null-assertion": "error",
    "@typescript-eslint/ban-ts-comment": "error",
    // Ban `as` type assertions but NOT `as const` (assertionStyle "never" still
    // permits const assertions). Load-bearing: `as const` is the sanctioned `enum`
    // replacement and brand constructor — don't tighten to a blanket `as` ban.
    // good/enum-status.ts exercises it, so a regression fails the eval.
    "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
    "no-restricted-syntax": [
      "error",
      { selector: "TSEnumDeclaration", message: "Use an `as const` object + a derived union instead of `enum` (typescript-standards)." },
    ],
    // Read process.env in ONE validated config module (guard/validate there) and
    // import the typed value elsewhere — this flags scattered reads. The single
    // sanctioned read opts out with a localized `// eslint-disable-next-line`.
    "no-restricted-properties": [
      "error",
      { object: "process", property: "env", message: "Read env in one validated config module, not `process.env` scattered across the codebase — see references/runtime-validation.md (typescript-standards)." },
    ],
    // Avoid mutation: const over let, and never reassign or mutate parameters.
    "prefer-const": "error",
    "no-param-reassign": ["error", { props: true }],
    // Return early — no `else` after a `return`. `else if` chains stay allowed.
    "no-else-return": ["error", { allowElseIf: true }],
    // Cap nesting. Stricter than ESLint's default of 4 — flat, guard-claused code
    // rarely needs more than 3 levels; deeper usually wants extraction.
    "max-depth": ["error", 3],
  },
});
