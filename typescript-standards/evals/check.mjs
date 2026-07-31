#!/usr/bin/env node
/**
 * Deterministic, model-free check: links, manifest, SUMMARY grounding,
 * trigger-evals structure, and the ESLint config over fixtures/ + good/.
 * Needs eslint + typescript-eslint resolvable. Run: node check.mjs
 */

import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync, statSync, realpathSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { SUMMARY } from "../scripts/inject-conventions.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PLUGIN = dirname(HERE);
const SKILL_DIR = join(PLUGIN, "skills", "review");
const REFS = join(PLUGIN, "references");
const FIXTURES = join(HERE, "review-fixtures", "fixtures");
const GOOD = join(HERE, "review-fixtures", "good");
const PLUGIN_JSON = join(PLUGIN, ".claude-plugin", "plugin.json");
const CONFIG = join(PLUGIN, "eslint.config.mjs");

const LINK_RE = /\]\(([^)]+)\)/g;

// Parse JSON without a let-in-try: returns { data } or { error } so call sites stay const.
const parseJson = (text) => {
  try {
    return { data: JSON.parse(text) };
  } catch (e) {
    return { error: e.message };
  }
};
const isFile = (p) => existsSync(p) && statSync(p).isFile();
const isDir = (p) => existsSync(p) && statSync(p).isDirectory();
const relToPlugin = (p) => relative(PLUGIN, p);
const tsFilesIn = (dir) => (isDir(dir) ? readdirSync(dir).filter((f) => f.endsWith(".ts")) : []);
const mdFilesIn = (dir) => (isDir(dir) ? readdirSync(dir).filter((f) => f.endsWith(".md")) : []);

// Each check returns its own findings — no shared mutable state.
function checkLinks() {
  const mdFiles = [join(SKILL_DIR, "SKILL.md"), ...mdFilesIn(REFS).map((f) => join(REFS, f))];
  const found = [];
  for (const path of mdFiles) {
    if (!isFile(path)) {
      found.push(`missing markdown file: ${relToPlugin(path)}`);
      continue;
    }
    for (const match of readFileSync(path, "utf8").matchAll(LINK_RE)) {
      const raw = match[1].trim();
      if (/^(https?:|mailto:|#)/.test(raw)) continue;
      const target = raw.split("#")[0];
      if (!target || !target.endsWith(".md")) continue;
      if (!isFile(normalize(join(dirname(path), target)))) found.push(`broken link in ${relToPlugin(path)} -> ${match[1]}`);
    }
  }
  return found;
}

function checkManifest() {
  const { data: manifest, error } = parseJson(isFile(PLUGIN_JSON) ? readFileSync(PLUGIN_JSON, "utf8") : "");
  if (error) return [`plugin.json unreadable: ${error}`];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) return ["plugin.json is not a JSON object"];
  const found = [];
  // `claude plugin validate --strict` (CI gate) errors on either — catch it here too.
  if (!manifest.version) found.push("plugin.json missing `version` (--strict CI gate fails)");
  if (!manifest.author) found.push("plugin.json missing `author` (--strict CI gate fails)");
  for (const skill of manifest.skills ?? []) {
    const sdir = normalize(join(PLUGIN, skill));
    if (!isDir(sdir)) found.push(`plugin.json skill path missing: ${skill}`);
    else if (!isFile(join(sdir, "SKILL.md"))) found.push(`plugin.json skill has no SKILL.md: ${skill}`);
  }
  return found;
}

// The SessionStart SUMMARY is a hand-written paraphrase of the references, so it
// can silently drift. Guard it: every construct it cites in `backticks` (rule
// sections only — the operational "Check your work" section carries an eslint
// command + an absolute path, not rule content) must appear in references/*.md.
function checkSummaryGrounding() {
  if (!isDir(REFS)) return ["references/ missing — cannot verify SUMMARY grounding"];
  const rulesPart = SUMMARY.split("Check your work")[0];
  const tokens = [...new Set([...rulesPart.matchAll(/`([^`]+)`/g)].map((m) => m[1]))];
  const corpus = mdFilesIn(REFS).map((f) => readFileSync(join(REFS, f), "utf8")).join("\n");
  return tokens
    .filter((t) => !corpus.includes(t))
    .map((t) => `SUMMARY cites \`${t}\` but no references/*.md mentions it — summary/refs drift?`);
}

// Structurally validate trigger-evals.json. Trigger *matching* is semantic (the
// model decides from the skill description), so it isn't run here — but the
// fixture file itself can rot (bad shape, one-sided, duplicate queries), and that
// we can catch deterministically. Accepts both a bare array and a { cases } wrapper.
function checkTriggerEvals() {
  const path = join(HERE, "trigger-evals.json");
  if (!isFile(path)) return ["evals/trigger-evals.json missing"];
  let data;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    return [`trigger-evals.json unreadable: ${e.message}`];
  }
  const cases = Array.isArray(data) ? data : data.cases;
  if (!Array.isArray(cases) || cases.length === 0) return ["trigger-evals.json has no cases"];

  const found = [];
  const seen = new Set();
  cases.forEach((c, i) => {
    if (typeof c?.query !== "string" || c.query.trim() === "") found.push(`trigger-evals case ${i}: missing/empty \`query\``);
    if (typeof c?.should_trigger !== "boolean") found.push(`trigger-evals case ${i}: \`should_trigger\` must be a boolean`);
    if (typeof c?.query === "string") {
      const key = c.query.trim().toLowerCase();
      if (seen.has(key)) found.push(`trigger-evals: duplicate query ${JSON.stringify(c.query)}`);
      seen.add(key);
    }
  });
  // A one-sided suite (all-true or all-false) proves nothing about precision.
  if (!cases.some((c) => c?.should_trigger === true)) found.push("trigger-evals: no positive (should_trigger:true) cases");
  if (!cases.some((c) => c?.should_trigger === false)) found.push("trigger-evals: no negative (should_trigger:false) cases");
  return found;
}

// Run the shared config over the corpus: every fixture must fire (ESLint flags
// it), and every good/ file must be clean.
function checkEslint() {
  // `--no` (npm 7+; --no-install is deprecated) fails fast instead of fetching
  // eslint from the registry. The `--` is load-bearing: without it npx eats the
  // eslint flags as its own options.
  const res = spawnSync(
    "npx",
    ["--no", "--", "eslint", "--config", CONFIG, "--format", "json", FIXTURES, GOOD],
    { cwd: PLUGIN, encoding: "utf8", timeout: 120000 },
  );
  if (res.error || typeof res.stdout !== "string" || res.stdout.trim() === "") {
    // Distinguish a real config/parse failure (surface it) from "not installed".
    const stderr = (res.stderr ?? "").trim();
    return [
      stderr
        ? `ESLint failed to run — likely a config-load error:\n${stderr.split("\n").slice(0, 6).join("\n")}`
        : "ESLint could not run — install eslint + typescript-eslint to run the check",
    ];
  }
  const { data: report, error } = parseJson(res.stdout);
  if (error) return ["could not parse ESLint JSON output"];
  // ESLint reports filePath as a realpath; canonicalise both sides so lookups
  // match even when the checkout is under a symlinked dir (macOS /tmp, CI temp).
  const canonical = (p) => { try { return realpathSync(p); } catch { return p; } };
  const messageCount = Object.fromEntries(report.map((f) => [canonical(f.filePath), f.messages.length]));
  const findingsAt = (dir, file) => messageCount[canonical(join(dir, file))] ?? 0;

  const found = [];
  for (const file of tsFilesIn(FIXTURES)) {
    if (findingsAt(FIXTURES, file) === 0) found.push(`fixtures/${file}: expected ESLint to flag it, got 0`);
    if (!isFile(join(GOOD, file))) found.push(`fixtures/${file}: no matching good/ counterpart`);
  }
  for (const file of tsFilesIn(GOOD)) {
    if (findingsAt(GOOD, file) > 0) found.push(`good/${file}: expected ESLint-clean, got ${findingsAt(GOOD, file)} finding(s)`);
    if (!isFile(join(FIXTURES, file))) found.push(`good/${file}: no matching broken fixture in fixtures/`);
  }
  return found;
}

const problems = [...checkLinks(), ...checkManifest(), ...checkSummaryGrounding(), ...checkTriggerEvals(), ...checkEslint()];

if (problems.length) {
  console.log(`\nCHECK FAILED — ${problems.length} problem(s):`);
  for (const p of problems) console.log(`  - ${p}`);
  process.exit(1);
}
console.log("\nCHECK PASSED — links, manifest, SUMMARY grounding, trigger-evals, and the ESLint config over fixtures/ + good/ are consistent.");
process.exit(0);
