---
name: linear-em-dashboard
description: >
  Creates a live, reusable Engineering Manager dashboard from Linear data — showing cycle
  velocity, in-progress time, carry-over rate, scope growth, and per-assignee throughput for
  any Linear team. Trigger this skill whenever an EM or engineering manager asks for sprint
  or cycle analytics, team velocity, delivery metrics, ticket turnaround time, carry-over
  tracking, or wants to understand their team's performance trends in Linear. Also trigger
  when someone asks to repurpose, share, or customise an existing EM dashboard for a different
  team. If the user mentions Linear and any kind of team health or delivery analytics, use
  this skill.
---

# Linear EM Dashboard Skill

This skill creates a **persistent, team-switchable artifact** that fetches live Linear data
each time it is opened. Any EM can pick their team from a dropdown and instantly see their
metrics — no code changes needed.

## Dashboard metrics

| Panel | What it shows |
|-------|--------------|
| Velocity | Completed issues (bar) + story points (line) per cycle |
| In-progress time | Median days from `startedAt → completedAt` for completed issues |
| Carry-over rate | % of non-cancelled issues not finished within the cycle |
| Scope growth | Issues at cycle start vs. added mid-cycle |
| Throughput by assignee | Completed issues per person across recent cycles |
| Cycle summary table | All metrics at a glance, newest cycle first |

## Steps

### 1 — Gather context (fast)

If the user mentioned a specific team name, note it — you'll use it to pre-select the
dropdown. If not, that's fine; the artifact has a full team picker so the EM can choose on
first load.

### 2 — Read the template

Read the HTML template from the `assets/` folder alongside this SKILL.md:

```
<skill-dir>/assets/dashboard-template.html
```

### 3 — Optionally pre-set the default team

The template contains this line near the top of the `<script>` block:

```js
const DEFAULT_TEAM_NAME = '';
```

If the user told you a specific team, replace the empty string with that team name
(case-insensitive match is used at runtime):

```js
const DEFAULT_TEAM_NAME = 'Manatees';
```

If no team was specified, leave it as `''` — the picker will show all teams.

### 4 — Write the filled template to a temp file

Write the (possibly modified) HTML to:
```
/sessions/<session-id>/linear-em-dashboard-artifact.html
```

### 5 — Create the artifact

Call `mcp__cowork__create_artifact` with:
- `id`: `linear-em-dashboard`
- `html_path`: the temp file path from step 4
- `description`: "Live Engineering Manager dashboard — team-switchable. Fetches velocity,
  in-progress time, carry-over rate, scope growth, and assignee throughput from Linear each
  time it is opened."
- `mcp_tools`: `["mcp__7bfc320b-e884-4155-a5c2-458f5c37269e__list_teams",
  "mcp__7bfc320b-e884-4155-a5c2-458f5c37269e__list_cycles",
  "mcp__7bfc320b-e884-4155-a5c2-458f5c37269e__list_issues"]`

### 6 — Tell the user

Let them know the dashboard is live. Mention:
- They can switch teams using the picker at the top — useful for sharing with other EMs
- Data refreshes every time the artifact is opened
- In-progress time only counts issues that have a `startedAt` timestamp (i.e. were actively
  started, not just moved straight to Done)
- Teams that don't use story point estimates will show 0 pts on the velocity chart

## Data notes

- **Cycles fetched**: last 8 cycles that have issue-count history (future/empty cycles skipped)
- **Carry-over**: excludes cancelled issues from both numerator and denominator
- **In-progress time**: uses `startedAt → completedAt`; issues without `startedAt` excluded from median
- **Story points**: Linear's `estimate.value` field
- **Team list**: fetches up to 250 teams; covers all typical workspace sizes
