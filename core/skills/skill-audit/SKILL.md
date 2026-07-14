---
name: skill-audit
description: "Audit the skill registry for trigger quality, overlap, and context bloat. Every registered skill's name + description is injected into every session's initial context, so a bloated or badly-described registry taxes every conversation. Run /skill-audit monthly, after adding several skills, or when skills mis-fire (trigger when they shouldn't, or fail to trigger when they should). It inventories every registered skill across plugin and user scope, grades each trigger description, finds overlapping or dead skills, estimates the context cost, and recommends prunes, merges, and description rewrites. Read-only — it reports; it never edits or deletes skills itself."
user-invocable: true
---

# Skill Audit

Skills are cheap to add and expensive in aggregate: every registered skill's name and description ride along in every session's context, and each poorly-written description degrades trigger accuracy for all the others. This skill is the monthly hygiene pass.

## Step 1 — Inventory

Build the full registry across scopes:

1. **Plugin skills** — for each installed plugin, read `.claude-plugin/plugin.json` and list its `skills` array; read each `SKILL.md` frontmatter (name, description, user-invocable).
2. **User skills** — list `~/.claude/skills/*/SKILL.md`.
3. **Project skills** — list `.claude/skills/*/SKILL.md` in the current project, if any.

For each skill capture: name, scope, description length (chars), last-modified date of its SKILL.md, and whether the directory is registered (cross-check against the lint rule: an on-disk skill missing from `plugin.json` is silently disabled).

## Step 2 — Grade each trigger description

Score each description A–D against these criteria:

- **Trigger clarity** — does it say *when* to fire, in the user's language ("use when the user says X, asks for Y"), not just what the skill does?
- **Disambiguation** — does it say when *not* to fire, especially against sibling skills that could plausibly match the same request?
- **Specificity** — concrete nouns and trigger phrases beat abstract capability statements ("reads .pptx files" beats "handles presentations").
- **Length discipline** — long enough to route correctly, no longer. Flag descriptions under ~15 words (likely under-triggers) and over ~200 words (bloat — move detail into the skill body).

## Step 3 — Cross-registry checks

- **Overlap** — pairs of skills whose descriptions could both match one plausible request. Recommend: merge, or sharpen both descriptions with mutual "do NOT use for" clauses.
- **Dead weight** — skills unused for months (stale SKILL.md, superseded by a newer skill, or tied to a tool no longer in use). Recommend prune or archive.
- **Scope placement** — personal/role-specific skills sitting in a globally-distributed plugin (candidates to move to user scope), and vice versa.
- **Context cost** — total registered skills and combined description size; call out the biggest contributors.

## Step 4 — Report

Write a concise report (chat, or a file if asked):

```
SKILL AUDIT — <date>
Registry: <N> skills (<n> plugin / <n> user / <n> project), ~<X> chars of descriptions

Grade summary: A: n  B: n  C: n  D: n

Top issues (ranked by impact):
1. <skill> — <grade> — <problem> → <recommended action>
...

Overlaps: <pairs + resolution>
Prune candidates: <skills + why>
Scope moves: <skills + where>
```

Offer to draft the rewritten descriptions for any skill graded C or D — but only apply changes the user approves, one skill at a time. For plugins in this marketplace, remind that description changes require a plugin version bump (see harness CLAUDE.md, Versioning).
