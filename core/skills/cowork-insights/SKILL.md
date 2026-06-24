---
name: cowork-insights
description: "Produce a candid written report on how the user is using Claude Cowork — recurring patterns in recent sessions, manual work that could be automated, forward-looking opportunities (upcoming calendar load, recently shipped Claude/Cowork features, capabilities they haven't reached for), gaps in installed skills/plugins/connectors, and concrete workflow tips. Expected connections: a calendar connector (Google Calendar, Outlook, or similar), the scheduled-tasks tools, and the cowork artifacts tools — these are the standard Cowork connectors and the skill assumes they are present. Use ONLY when the user explicitly invokes /cowork-insights or asks something like 'Cowork insights', 'a Cowork review', 'a usage retrospective', or 'what patterns do you see in how I use Cowork'. Do not trigger proactively or as a side-effect of other tasks."
---

# Cowork Insights

You're writing a reflective report on how the user is using Cowork. Aim for the read a thoughtful colleague would give them after watching over their shoulder for a week — clear-eyed about what's working, blunt about what isn't, and grounded in specific sessions rather than generic advice.

The deliverable is a Markdown file in the current session's `mnt/outputs/` folder, shared back via a `computer://` link. Default to Markdown; if the user asked specifically for a Word doc, load the `docx` skill and produce `.docx` instead.

This skill runs only when the user explicitly invokes it. Don't run as a side-effect of another task.

## Step 1 — Inventory the setup

Pull the current state in parallel. These tools are available via ToolSearch if not already loaded:

- `mcp__session_info__list_sessions` with `limit: 30` — recent sessions, most recent first
- `mcp__scheduled-tasks__list_scheduled_tasks` — what's already on a schedule
- `mcp__cowork__list_artifacts` — live artifacts already built

For installed skills and plugins, prefer reading the files directly rather than the `list_skills` / `list_plugins` widget tools — the widgets are designed for showing to the user, not for analysis. Use `Glob` on `~/.claude/skills/*/SKILL.md` (the directory may resolve to `/sessions/<session-id>/mnt/.claude/skills/` in the sandbox) and `Read` the frontmatter of each. Plugins live under the same `.claude` tree; if you can't locate them on disk, fall back to `mcp__plugins__list_plugins` and read the structured result.

Note what's there. You'll lean on this inventory in Step 3 to avoid recommending things the user already has.

**Also check for prior insights reports.** Glob `mnt/outputs/cowork-insights-*.md` (in the current session's outputs folder if accessible, or the most recent one the user has handy). If a recent prior report exists, read it — the new report should surface **deltas** (what's progressed, what's stuck, what's new since last run) rather than restating the standing observations. If the user is running this skill on a cadence, the second-and-onwards report compounds in value only if it's comparative. If no prior report exists, this is the baseline and you proceed normally.

## Step 2 — Sample recent sessions

Read 15–20 sessions. **Diversify across session titles** rather than just taking the top 15 chronologically — heavy Cowork users often have long streaks of identical scheduled briefings, and reading 12 daily briefings in a row will crowd out the more interesting ad-hoc work below them. Cap any single recurring title at 2–3 samples (enough to confirm the pattern is stable), then spend the remaining sample budget on distinct titles further down the list. The goal is breadth of work seen, not raw recency.

For each, call `mcp__session_info__read_transcript` with `format: "auto"`, `max_wait_seconds: 0` (don't wait on running sessions — just take the snapshot), and `limit: 5` as a starting point. The first user prompt + the assistant's final summary usually carries everything you need to classify a session; bump the limit only when a session looks unfinished or the open/close messages don't make the purpose clear. Reading 15 transcripts at the default `limit: 30` will bloat your context with material you won't use.

For each session, capture in your working notes:

- Session title and ID
- The first user prompt (what the user was trying to do)
- Tools, skills, connectors actually used
- Whether the work looks one-off or recurring
- Any friction signs: the user repeating themselves, correcting Claude, re-running similar prompts across sessions

Sampling, not exhaustive. The most recent 15–20 sessions will surface the active patterns; older sessions add noise more than signal.

## Step 3 — Analyse

Look for four things: recurring patterns, opportunities (both backward- and forward-looking), tooling gaps, and workflow tips. Be specific — every observation should point to a concrete session, a calendar event, a specific release, or a named capability.

### Recurring patterns

Cluster sessions by intent. A pattern needs three or more sessions doing meaningfully similar work to count. For each cluster, name what it is, roughly how often it appears, and the trigger (calendar event, day of week, an upstream signal).

### Opportunities

Split this into two sub-sections — backward-looking (what to automate based on what you saw) and forward-looking (what the user might want even though it hasn't shown up yet). Both belong in the report; the forward-looking lens is often where the most interesting suggestions live.

**From recent sessions.** For each recurring pattern, ask: should this be a **scheduled task**, an **artifact**, or a **skill**?

- **Scheduled task** if there's a clear cadence (every Monday, end of day, after each board meeting).
- **Artifact** if the user is pulling the same data repeatedly and would benefit from a page that refreshes on open.
- **Skill** if the steps are non-trivial, the user drives the work themselves, and the procedure is stable enough to codify.

Cross-reference against the inventory from Step 1. Don't suggest what they already have. Don't suggest things they don't have *and* don't need — the bar for inclusion is a recurring pattern in the transcripts.

**Looking ahead.** Don't stop at first-order historical fixes. The strongest sections of this report often anticipate things the user hasn't tried yet. Three lenses to apply:

- **Upcoming workload.** Only run this lens if a calendar connector is available (look for any `list_events` tool in the connector inventory from Step 1 — e.g. a Google Calendar or Outlook MCP). If it is, offload the calendar pass to a subagent — `list_events` over a 4–8 week window can return 80k+ characters in one call (mostly recurring 1:1s and focus blocks that aren't useful here), and parsing it inline will overflow your context. Spawn a `general-purpose` agent with a prompt along these lines:

    > Fetch the user's calendar events for the next 8 weeks using their calendar `list_events` tool. Compute the date window yourself — start is today (resolve via `Bash` with `date -u +%Y-%m-%dT%H:%M:%SZ`, or from your environment's current date), end is start + 56 days. Don't accept hard-coded dates from the calling prompt; the skill is invoked on different dates and the window must always be relative to the day of invocation.
    >
    > Paginate with `pageSize: 20, orderBy: startTime` until you reach the end of the window. Filter out recurring meetings (standups, weekly 1:1s, focus time, lunch, OOO entries for other people) and return only **high-leverage one-off or low-frequency events** the user should pre-build for: board / SLT / All Hands, MBR / QBR, offsites and kick-offs, hiring loops, planned product or programme launches, premortems, post-mortems, exec reviews, conference talks, customer QBRs. For each, return: date, title, one-line "why it matters for prep". Aim for ≤ 10 events back. Under 300 words.

    Use the digest the subagent returns to populate this lens — flag specific upcoming events and what would help (an artifact, a skill, a scheduled prep brief) before each one lands. If no calendar connector is available, skip this lens entirely (don't flag it as a gap unless the user's transcripts show calendar work).
- **New Claude / Cowork capabilities.** Be inquisitive about what's shipped recently. Use `WebSearch` for posts on the Anthropic blog, changelog, or docs from the last 60 days; check `mcp__mcp-registry__list_connectors` for connectors the user isn't using. If something landed that would meaningfully change how they work — a new tool type, a new connector, a model upgrade — name it, explain in one line what it unlocks for their specific workflow, and link to the announcement. Don't list everything; pick the two or three most relevant.
- **Adjacent capabilities they haven't reached for.** Things Cowork already supports that the user isn't using and which fit their work — e.g. artifacts (do they have any live ones?), Claude in Chrome for live data, sub-agents for long parallel research, scheduled tasks beyond the cadences they already have. If the gap is real, name the specific use case where it'd help.

Forward-looking suggestions must still be grounded. "Board prep on 14 July; an artifact pulling live Q3 metrics would let the user glance at it each morning" is good. "AI is evolving fast, consider trying new tools" is not — cut anything that vague.

### Tooling gaps

Compare the work the user is doing to what's installed:

- If transcripts show repeated, clunky connector use (manual copy/paste, re-prompting for IDs, working around missing data), search `mcp__mcp-registry__search_mcp_registry` for relevant connectors and surface specific candidates.
- If a recurring pattern matches functionality bundled into a plugin they don't have, call `mcp__plugins__search_plugins` and name the candidates with one-line reasons.
- If a recurring pattern matches no installed skill but would benefit from one, recommend creating it via the `skill-creator` skill — and outline what the skill would do in one or two lines.

### Workflow tips

Two or three concrete tips, each tied to a specific session or pattern. Things worth flagging:

- Places where `AskUserQuestion` would've saved a clarification round-trip.
- One-off answers that should have been an artifact because they'll be re-asked.
- Long sessions where breaking work into sub-tasks earlier would have helped.
- Skills the user has installed but isn't reaching for when they'd apply.

Avoid generic Cowork advice ("use scheduled tasks!"). If a tip wouldn't change the user's behaviour next week, cut it.

## Step 4 — Write the report

**Length target: ≤ 1500 words total.** Most readers will skim this between meetings — a wall of text gets skimmed and the second-order observations get missed. The TL;DR should carry the most-important findings even if they read nothing else; subsequent sections elaborate, they don't repeat. If you're nearing 1500 words, cut the weakest item from each section rather than trimming everywhere proportionally.

Save to `<current-session>/mnt/outputs/cowork-insights-<YYYY-MM-DD>.md`. Use this structure exactly — keep section headings stable so future reports are easy to compare:

```
# Cowork Insights — <date>

## TL;DR
3–5 bullets. Headline observations only, no preamble.

## Since last report
*(Include this section ONLY if a prior `cowork-insights-*.md` was found in Step 1. Omit otherwise.)*
- **Progressed:** what's moved (e.g. a recommended scheduled task is now live).
- **Stuck:** what was flagged before and hasn't shifted.
- **New:** patterns or events that didn't appear last time.

## Recurring patterns
For each pattern (target ≤ 5, fewer is fine — never pad to fill):
- **<pattern name>** — what it is, frequency, example sessions (ID + title).

## Opportunities

### From recent sessions
For each (target ≤ 5, fewer is fine — never pad to fill):
- **<opportunity>** — what's being done manually, what to turn it into (scheduled task / artifact / skill), why it's worth it.

### Looking ahead
For each (target ≤ 5, fewer is fine — never pad to fill), drawn from upcoming calendar load, new Claude/Cowork features, or adjacent capabilities the user hasn't reached for:
- **<opportunity>** — what it is, what triggered the suggestion (calendar event / recent release / unused capability), what it'd unlock.

## Tooling gaps
- **Skills to consider** — concrete names with one-line reasons.
- **Plugins worth installing** — same.
- **Connectors worth adding** — same.
(If a category is empty, write "Nothing obvious." rather than padding.)

## Workflow tips
2–3 specific tips, each tied to a session or pattern.

## Sources
Bullet list of the sessions sampled (ID + title) so the user can spot-check.
```

If the user has a personal tone or style guide at a known path (e.g. `~/.claude/context/comms-style-guide.md`), read it before drafting. Otherwise default to: concise, data-led, no spin, no hedging filler.

## Step 5 — Self-check

Before sharing, scan the draft and verify every observation is sourced. Specifically:

- Every recurring pattern named ties to ≥ 3 session IDs in the Sources list (or fewer with an explicit "thin sample" caveat).
- Every backward-looking opportunity points to a specific session.
- Every forward-looking opportunity points to a specific calendar event, a recent release with a link, or a named unused capability.
- Every tooling-gap entry is consistent with the Step 1 inventory — you're not suggesting a skill / plugin / connector the user already has.
- The Sources list contains only sessions you actually read this run.

Anything that can't be sourced gets cut or downgraded to a less confident framing. Drift creeps in here — the discipline of grounding every line is what keeps the report worth reading.

## Step 6 — Surface the file

After writing, share the file with a single `computer://` link and a one-line summary. Don't restate the report in chat — the user will read the file.

If you found one clear high-leverage action (a scheduled task that obviously should exist, a plugin clearly worth installing), end with **one** specific follow-up offer. Not a list. Examples:

- "Want me to set this up as a scheduled task now?"
- "Want me to install <plugin> for you?"
- "Want me to draft the skill via `skill-creator`?"

If nothing stands out, end without an offer.

## Style notes

- This is a candid review, not a sales pitch. If the user has already automated their recurring work well, say so and keep the report short — a five-bullet TL;DR with mostly-empty sections is a fine outcome.
- Don't invent patterns to fill sections. Empty is honest.
- The most valuable observation is usually the second-order one — the thing the user hasn't already noticed themselves. Push past the obvious before you ship.
- Quote sparingly. A short verbatim line from a transcript ("can you re-run yesterday's...") is worth more than a paraphrase, but more than two or three quotes makes the report feel like a clip show.
