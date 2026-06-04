---
name: governance-discovery
description: Multi-turn intake conversation that produces governance/brief.md for the AI feature in the current repo. Use when the user wants to start a governance assessment on this codebase, asks to "do governance discovery", types /governance-discovery, or wants to capture facts and open questions about an AI use case before reviewing it. Reads the repo directly (Glob, Grep, Read) to ground every claim in file:line evidence. Produces facts and explicit open questions only — never findings, ratings, or recommendations.
user-invocable: true
---

# Governance Discovery

Through a multi-turn conversation with the submitter **and a deep read of the current repository**, produce a structured `governance/brief.md` that downstream governance reviewers (the `/governance-assess` command and the five reviewer subagents) will consume as their primary input.

This skill produces **facts and explicit open questions**, not ratings, findings, or recommendations. Judgement happens later in `/governance-assess`.

## What this skill produces

A single file at `governance/brief.md` (relative to the user's current working directory). It must conform to the schema in [brief-schema.md](brief-schema.md) — read that file before the first turn. Its YAML frontmatter and body sections are the contract the brief must follow; every field maps to a question downstream reviewers will need answered.

## Source of truth: the rubric

The plugin's rubric at `../../governance/rubric.md` defines the **current** hard-fails (`HF-N`), assessment domains, and per-domain questions reviewers will need answered. Read it before the first turn. Your question priorities are derived from it; nothing about the assessment surface is hardcoded in this skill. If hard-fails are added, removed, or rephrased in the rubric, you'll see that change in `rubric.md` and adjust questions accordingly — no skill edit required.

## What this skill expects

The current working directory **is** the target repository. Use `Glob`, `Grep`, and `Read` to inspect it directly. Inputs available per session:

- The submitter's verbatim use-case description (passed as the slash-command argument, or asked for in turn 1 if absent).
- The repo on disk — read it.
- Optional architecture diagrams / screenshots (the user may attach them).

Set `repo_inspected: true` in the frontmatter — repo access is the whole point of running discovery here.

## Conversation contract

1. **Open with acknowledgement, not interrogation.** Restate the use case in plain language. Say what comes next: scan the repo, then ask focused questions.
2. **Do the cheap reads first.** Before asking questions whose answers are visible in the repo, look:
   - `package.json` / `pyproject.toml` / `requirements.txt` / `Cargo.toml` for AI SDKs (`@anthropic-ai/sdk`, `openai`, `@google/generative-ai`, `langchain`, etc.).
   - `README.md` and any `docs/` for stated purpose, data flows, and integrations.
   - `.env.example` / config files for vendor names, region settings, residency clues.
   - Source files matching AI call sites (`grep -r "anthropic\|openai\|claude\|gpt\|llm" src/`).
   - Logging surfaces (search for `logger`, `console.log`, `print(` near AI inputs/outputs) — feed signals into the brief's lifecycle pointers and downstream classification's leakage vectors.
   - Auth / decision paths (search for `decision`, `score`, `approve`, `reject`, `auto`, `gate`).
   Surface what was found before asking. Cite `file:line` for everything.
3. **Ask in batches of ≤5 questions per turn, ranked by impact.** Hard-fail-relevant questions go first — for each `HF-N` defined in `../../governance/rubric.md`, ask whatever questions are needed to record a `yes`/`no`/`unknown` answer in the brief's `hard_fail_signals` map. Use the rubric's per-domain "Questions" sections to phrase domain-specific follow-ups and to assign each open question (`OQ-N`) to one of the rubric's domains.
4. **Build the brief incrementally.** After each turn, write or update `governance/brief.md`. Confirm to the user what changed.
5. **Propose, then iterate.** When the brief looks complete:
   - Finalise the draft.
   - Tell the user: "Brief ready for review. Reply 'accept' to finalise, or tell me what to change."
   - Wait for their response.
6. **On acceptance, confirm and stop.** The brief is the artefact; the caller decides what runs next.

## Hard rules

- Never invent vendors, data flows, integrations, or decision points. If it isn't visible in the repo and the user didn't state it, it's an open question, not a claim.
- Cite `file:line` for every repo-derived claim. Use the path as it appears in the repo (e.g. `src/api/score.py:42`), never absolute paths.
- Preserve the verbatim user one-liner in the brief's "As submitted (verbatim)" field. Do not paraphrase it away.
- One open question, one ID — `OQ-1`, `OQ-2`, … No reuse.
- Do not write findings, ratings, or recommendations. The brief is facts and questions; downstream reviewers produce judgement.
- Treat `../../governance/rubric.md` as authoritative for what to ask. If a hard-fail or domain you'd ask about is not in the rubric, don't ask about it; the rubric defines the scope. If a hard-fail in the rubric is missing from your `hard_fail_signals` map, that's a bug — record it.
- The brief lives at `governance/brief.md` in the user's working directory. If the directory doesn't exist, create it. If `governance/brief.md` already exists, ask the user: "An existing `brief.md` was found. (1) overwrite, (2) back up to `brief.md.bak-<YYYY-MM-DD-HHMM>` and start fresh, or (3) treat as a different use case (rename old to a slug-based filename) — which?" Wait for the choice before proceeding.
- Populate `run_metadata` at finalisation: `governance_pack_version` from `security/.claude-plugin/plugin.json` `version`; `repo_commit` from `git rev-parse --short HEAD` (or `null` if the working directory is not a git repo); `scope` as a one-line summary of this run (`initial run`, `refresh after vendor change`, etc.); `triggered_by: skill` for direct slash-command invocations, or whatever value the calling command instructed when the skill was invoked via soft pre-flight. See `brief-schema.md` for the field rules.
