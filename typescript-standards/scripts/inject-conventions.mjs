#!/usr/bin/env node
/**
 * SessionStart hook (opt-in): injects Multiverse TS conventions + quality bar into
 * context before Claude writes code, and points at references/ for depth.
 * Off by default; enable with TYPESCRIPT_STANDARDS_INJECT=1. Scoped to TS repos —
 * injects nothing unless a tsconfig.json is reachable from the session cwd.
 */

import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const REFS_DIR = join(PLUGIN_ROOT, "references");

// Exported so evals/check.mjs can verify it against the references without
// re-parsing this source. The rule sections are a hand-written paraphrase of
// references/*.md; the eval guards against drift.
export const SUMMARY = `Follow Multiverse's TypeScript conventions AND quality bar as you write code (typescript-standards plugin):

Compiler (tsconfig)
- \`strict\` is non-negotiable; also enable \`noUncheckedIndexedAccess\` (indexing yields \`T | undefined\`), \`exactOptionalPropertyTypes\`, \`noImplicitOverride\`, \`verbatimModuleSyntax\`, \`erasableSyntaxOnly\`.

Type safety
- Never \`any\` — use \`unknown\` + a type guard, or a zod schema at a boundary.
- No \`as\` assertions (narrow or validate instead; \`as const\` is fine); no non-null \`!\`; \`@ts-expect-error\` with a reason, never \`@ts-ignore\`.
- No \`enum\` — an \`as const\` object + a derived union.
- Errors: catch as \`unknown\` and narrow; only ever throw an \`Error\` (subclass for domain errors, centralise them); standard throw/catch, no Result/Either wrappers.

Type design
- Model state with discriminated unions so impossible states can't be represented; \`type\` by default, \`interface\` for object/service contracts.
- Use \`satisfies\` (not a widening annotation) to check without losing inference; derive types from the source of truth (\`z.infer\`, \`$inferSelect\`, \`typeof\`) and compose with \`Pick\`/\`Omit\`/unions — never hand-maintain parallel types.
- \`readonly\` props / \`ReadonlyArray<T>\` by default; \`x: T | undefined\` over \`x?: T\` when a value must be supplied; brand validated primitives with zod \`.brand()\`.

Functions & generics
- Small, single-purpose functions, composed; self-documenting names over comments; RORO — take an options object / return an object for multiple or optional params.
- Let return types infer internally but annotate them at exported boundaries, and annotate inputs; reach for a generic only to relate an input type to an output; narrow with type predicates (\`x is T\`) or assertion functions.
- Return early with guard clauses — no \`else\` after \`return\`, avoid deep nesting; exhaustive \`switch\` via an \`assertNever\` default; type handlers from the library's generic (e.g. \`EventHandler\`).

Validation & data
- Validate all external input (HTTP, env, queue, JSON) with zod at the boundary — \`.safeParse\` for inputs you don't control; read \`process.env\` in one validated config module (import the typed value elsewhere), never scattered.
- Keep DB access in a repository layer (derive Drizzle \`$inferSelect\` / \`$inferInsert\` types), never inline in handlers; never \`as\`-cast a query result.

Immutability & style
- Immutable by default — \`const\` over \`let\`, never mutate params or shared state, prefer structural sharing (or \`structuredClone\`, not \`cloneDeep\`); prefer array methods (\`map\`/\`filter\`/\`reduce\`/\`flatMap\`) over \`for\` loops where one fits.
- \`??\` not \`||\` for defaults; DRY — reuse the org's \`@multiverse-io/*\` shared packages first; log an id, never the payload/PII.

Testing
- Vitest (no Jest); never \`as any\` a mock — build a reusable typed factory, or mock a minimal typed interface.

Check your work
- After editing \`.ts\`/\`.tsx\`, run the plugin's shared ESLint config over the changed files and fix what it reports:
  \`npx eslint --config "${join(PLUGIN_ROOT, "eslint.config.mjs")}" <changed files>\`
  It's a standalone, syntax-only check — it does NOT read or modify this repo's own ESLint config, and nothing is committed. (Needs \`eslint\` + \`typescript-eslint\` resolvable in the repo; if they aren't, it fails with a clear message — note that and move on.)`;

// Dirs never worth scanning for a tsconfig (and slow if we did).
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "out", "coverage", ".next", ".turbo", ".cache"]);

function hasTsconfigIn(dir) {
  try {
    return readdirSync(dir).some((f) => f === "tsconfig.json" || (f.startsWith("tsconfig.") && f.endsWith(".json")));
  } catch {
    return false; // unreadable dir → treat as no tsconfig
  }
}

// Bounded, node_modules-skipping descendant scan; short-circuits on first hit.
// Depth 3 reaches the common monorepo layouts (packages/foo, apps/web/...).
function scanDescendants(dir, depth) {
  if (hasTsconfigIn(dir)) return true;
  if (depth <= 0) return false;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return false;
  }
  for (const e of entries) {
    if (!e.isDirectory() || SKIP_DIRS.has(e.name) || e.name.startsWith(".")) continue;
    if (scanDescendants(join(dir, e.name), depth - 1)) return true;
  }
  return false;
}

// Does dir, or an ancestor up to the repo root, hold a tsconfig? Stops at the
// .git boundary so it never climbs out of the repo.
function hasTsconfigInAncestor(dir) {
  if (hasTsconfigIn(dir)) return true;
  if (existsSync(join(dir, ".git"))) return false; // repo root — stop here
  const parent = dirname(dir);
  return parent === dir ? false : hasTsconfigInAncestor(parent);
}

// Nearest ancestor containing .git, or null if none — never the filesystem root
// (scanning down from `/` would walk the whole disk).
function repoRoot(dir) {
  if (existsSync(join(dir, ".git"))) return dir;
  const parent = dirname(dir);
  return parent === dir ? null : repoRoot(parent);
}

// Is this plausibly a TypeScript repo? Claude may be launched anywhere in the
// tree, so check the cwd and its ancestors, then scan down from the repo root —
// that finds a tsconfig in a sibling package even when the cwd's subtree has none.
// With no .git, scan from the cwd (not `/`). Injects nothing when no tsconfig is
// reachable, so non-TS sessions stay zero-cost.
function looksLikeTypeScriptRepo(startDir) {
  if (hasTsconfigInAncestor(startDir)) return true;
  return scanDescendants(repoRoot(startDir) ?? startDir, 3);
}

// hooks.json gates the spawn on the same flag, so this normally won't even run
// when off — it's the belt-and-braces guard for when the script is run directly.
function isOptedIn() {
  const flag = process.env.TYPESCRIPT_STANDARDS_INJECT;
  return Boolean(flag) && flag !== "0" && flag !== "false";
}

// cwd from the SessionStart payload (stdin), falling back to process.cwd().
// If stdin is a TTY (or absent) there's no payload to read — bail before
// readFileSync(0), which would otherwise block until the hook's 10s timeout.
function sessionCwd() {
  if (process.stdin.isTTY) return process.cwd();
  try {
    const payload = JSON.parse(readFileSync(0, "utf8"));
    return payload?.cwd ?? process.cwd();
  } catch {
    return process.cwd(); // no stdin / not JSON
  }
}

// A pointer to the reference files, so the agent reads the relevant one for depth
// rather than inlining the whole rule book. Empty string if they can't be listed.
function referencesPointer() {
  try {
    const files = readdirSync(REFS_DIR).filter((f) => f.endsWith(".md")).sort();
    if (files.length === 0) return "";
    return `\n\nFor the rationale, the full rules and bad→good examples, read the relevant file in\n${REFS_DIR}\n(${files.join(", ")}) — e.g. anti-patterns.md is the bad→good catalogue.`;
  } catch {
    return "";
  }
}

function runHook() {
  if (!isOptedIn()) return; // opt-in: off by default
  if (!looksLikeTypeScriptRepo(sessionCwd())) return; // no tsconfig reachable
  const additionalContext = SUMMARY + referencesPointer();
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: "SessionStart", additionalContext },
  }));
}

// Run the injection only when executed directly (the SessionStart hook). When
// imported (e.g. by evals/check.mjs to verify SUMMARY), do nothing — no stdin
// read, no output — so importing has zero side effects.
const invokedAsScript =
  process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (invokedAsScript) runHook();
