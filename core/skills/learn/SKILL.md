---
name: learn
description: "Self-improving loop for the project's institutional knowledge. This project maintains a structured knowledge system — a root CLAUDE.md that indexes standards docs (error handling, database, security, accessibility, etc.), directory-level CLAUDE.md files for each module, and dedicated docs for cross-cutting concerns. These steering docs are what enable high-quality, consistent, secure code across every session. Invoke /learn after sessions where mistakes were made, corrections given, or non-obvious patterns validated. It scans the conversation, extracts generalizable lessons, and updates the right doc so the same mistake never happens twice. Invoked deliberately — directly via /learn, or by doc-update as its steering stream during a close-out; it never fires from a hook or on its own initiative."
user-invocable: true
---

# Learn

This project's code quality depends on a structured knowledge system: CLAUDE.md files, standards docs, and conventions that steer every future session. When a session surfaces a correction, a bug from a bad assumption, or a pattern that worked well, that knowledge needs to flow back into the docs — otherwise the next session will make the same mistake.

This skill closes that loop. It reads the conversation, extracts what was learned, and updates the right steering doc. It never touches application code.

Run it standalone any time a session surfaces a lesson, or as the steering + memory stream of `doc-update` (which pairs it with an architectural-doc refresh). Either way, this skill owns the logic for *what* gets learned and *where* it goes.

## What to look for

Scan the conversation for these signals:

- **Corrections**: "no, don't do that", "stop doing X", "that's wrong because..."
- **Bugs from assumptions**: Something broke because a pattern was assumed rather than verified
- **Non-obvious architectural decisions**: A choice that wasn't intuitive but turned out to be right (or wrong)
- **Review findings**: Systemic issues surfaced during code review
- **Validated approaches**: Patterns the user confirmed worked well — "yes exactly", "perfect", accepting a non-obvious choice without pushback

## The generalizability test

For each candidate lesson, ask: "Would this apply to the next 10 similar situations, or just this one?"

- "Always use `.maybeSingle()` instead of `.single()` when a row might not exist" — generalizable, keep it
- "The deployment detail page needs a loading spinner on the participants tab" — too specific, discard it
- "When adding a new service, always create `index.ts`, `validation.ts`, and `__tests__/`" — generalizable, keep it

If in doubt, discard. The docs should stay lean. One strong rule beats three weak ones.

## Discovering where lessons belong

Every project structures its documentation differently. Rather than following a fixed mapping, discover the project's steering structure and place lessons where they naturally fit.

### Step 1: Read the root CLAUDE.md

The root CLAUDE.md is the master index. It typically points to standards docs, directory-level CLAUDE.md files, and other steering files. Read it to understand the project's documentation topology — what docs exist, what they cover, and how they're organized.

Look specifically for:

- A **Required Reading**-style table that lists steering docs by area. If entries use an `@path` prefix, that prefix tells Claude Code to auto-load the file into context when the relevant area is touched — adding a new steering doc means adding a new row.
- A `steering/` folder — common home for prescriptive LLM-facing rules.
- A `docs/` folder — common home for human-facing reference material (project briefs, setup guides, ADRs).
- Directory-level `CLAUDE.md` files in module folders.

### Step 2: Identify the right home for each lesson

Based on what you found in Step 1, match each lesson to the most specific existing doc that covers that topic. The hierarchy, from most preferred to least:

1. **Directory-level CLAUDE.md** — if the lesson is scoped to a specific module (e.g., a store pattern belongs in `src/store/CLAUDE.md`, not the root)
2. **Dedicated standards doc** — if the project has a standards doc for the topic (e.g., error handling, database patterns, security, testing, accessibility)
3. **Root CLAUDE.md** — for cross-cutting conventions that don't fit a specific module or standards doc (coding conventions, architectural patterns, data fetching)
4. **Memory** — if the lesson is about user preferences or collaboration style rather than codebase rules, use the memory system instead of docs

For example, a project might have `steering/ERROR_HANDLING.md` (auto-loaded via the root CLAUDE.md's index), `docs/ERROR_HANDLING.md`, or a section in the root CLAUDE.md. A monorepo might have per-package CLAUDE.md files. Use whatever structure already exists.

### Step 3: Handle lessons with no clean fit

If a lesson doesn't fit any existing doc:

- Check if the root CLAUDE.md has a general-purpose section (like "Coding Conventions" or "Patterns") where it could go
- If not, create a single catch-all standards file using whichever location the project's root CLAUDE.md already uses for cross-cutting rules. Common locations: `steering/STANDARDS.md` (under a `steering/` folder), `docs/STANDARDS.md` (under a `docs/` folder), or a new section in the root CLAUDE.md itself. Add a pointer from the root CLAUDE.md to the new file. If the root indexes steering docs through an auto-loading table (`@path`-prefixed entries), add a row there too — that's what makes the file load in future sessions. This is the one exception to the "never create new files" rule — but only for this single catch-all, and only when no existing file is appropriate.

## Process

### 1. Extract candidates

Read through the conversation and list every potential lesson. For each one, note:

- What happened (the mistake, correction, or validated pattern)
- The generalizable rule
- Which topic area it falls under (error handling, database, security, testing, UI, architecture, etc.)

### 2. Filter

Drop anything that fails the generalizability test. Drop anything the user didn't actually validate or correct — don't infer lessons from your own internal reasoning.

### 3. Discover the doc structure

Read the root CLAUDE.md. Scan for pointers to standards docs, directory CLAUDE.md files, and any other steering files. Build a mental map of what exists and what each file covers.

### 4. Check for duplicates and conflicts

For each surviving lesson, read the target doc. Check whether:

- The rule already exists (skip it)
- An existing rule conflicts (flag it to the user before changing anything)
- There's a natural place to insert it (prefer appending to an existing section over creating a new one)

### 5. Write the updates

For docs and CLAUDE.md files:

- 2-5 lines per rule. Be concise.
- Include a short code example only if it genuinely clarifies the rule — most rules don't need one.
- Match the existing doc's voice and formatting. Read a few lines of the target doc before writing to absorb its style.
- Append to the most relevant existing section. Only create a new section if there truly isn't an appropriate home.
- If you create a new standards file, also add an index entry for it in the root CLAUDE.md (or wherever the project's existing index lives). For projects whose index uses an auto-loading prefix like `@steering/X.md`, mirror that format — otherwise the file won't load in future sessions.

For memory (user preferences / workflow lessons):

- Use the memory system as documented in the system prompt.
- Create or update the appropriate memory file with proper frontmatter.

### 6. Report

Output a short summary:

```
## Lessons Learned

### 1. [Short title]
- **Updated**: [file path]
- **Rule**: [the 1-2 sentence rule that was added]

### 2. [Short title]
...

### Skipped
- [Brief note on anything considered but discarded, and why]
```

## Rules

- Never modify application code. This skill is docs-only.
- Never add a rule the user didn't actually validate through correction or confirmation. Your own opinions about best practices don't count — only things that emerged from real work in this conversation.
- Never duplicate an existing rule. If a lesson is already captured, skip it and say so.
- If unsure whether something is generalizable, ask the user rather than guessing.
- Prefer the most specific existing doc over the root CLAUDE.md. A store lesson goes in the store's CLAUDE.md, not the root.
- Only create a new file as a last resort — a single catch-all standards doc when no existing file fits. When you do, register it in the project's index (root CLAUDE.md and any auto-loading table it uses) so it's discoverable in future sessions. Never create topic-specific docs unilaterally.
