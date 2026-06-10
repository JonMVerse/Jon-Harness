<!--
TEMPLATE: RFC (request for comments — lightweight design proposal)
A short, decision-oriented design doc: frame a problem, lay out a couple of
options with their trade-offs, and recommend one. Use it for cross-team
technical decisions that need shared input before building — an integration
pattern, a caching strategy, an API contract, a migration approach.

How to use: copy this file, replace every <PLACEHOLDER>, delete the guidance
comments. Keep it short — an RFC that doesn't fit on two screens is a design
doc, not an RFC. Aim for 2–4 options, and always name a recommendation; an RFC
with no recommendation is a survey, not a proposal.
-->

# RFC: <SHORT TITLE>

**Status:** Draft for discussion <!-- → Under review → Accepted / Rejected / Superseded -->
**Author:** <NAME> · **Reviewers:** <NAMES / TEAMS>
**Date:** <YYYY-MM-DD>
**Decision it unblocks:** <the open decision, ticket, or meeting this resolves — link it>

## Context & problem
<!-- Why are we writing this now? State the problem in terms a reader outside
the thread can follow: what's happening today, what it costs, and what forces
the decision. Cite where it was raised (meeting, doc, incident) so the RFC is
traceable to the conversation it settles. 1–2 short paragraphs. -->

## The key insight (optional)
<!-- Many decisions stall because two things are being conflated. If separating
them resolves most of the disagreement, name the distinction here — it's often
the most valuable part of the RFC. Delete this section if there's no such split. -->

## Goals / non-goals
- **Goals:** <what a good outcome must achieve>
- **Non-goals:** <what this RFC deliberately does not try to solve — bounds the debate>

## Options

<!-- One subsection per option. Give each a memorable name, a one-line summary,
and honest pros/cons. Attribute ideas to people where it helps ("X's suggestion
in the thread"). Mark the recommended one in its heading. -->

### Option A — <name>
<one-line description>
- ➕ <benefit> · <benefit>
- ➖ <cost / risk / limit>

### Option B — <name> (recommended)
<one-line description>
- ➕ <benefit> · <benefit>
- ➖ <cost / risk / limit>

### Option C — <name>
<one-line description>
- ➕ <benefit>
- ➖ <cost / risk — and, if it conflicts with an existing standard, say so explicitly>

## Recommendation — **<chosen option>**
<!-- State the choice and why it wins given the goals. If you recommend
phasing (ship a safe subset now, evolve later), spell out the steps. If you are
explicitly deferring an option, say which and what would make you revisit it. -->
1. **Now:** <smallest valuable, low-risk slice>
2. **Next:** <the fuller version, and what it depends on>
3. **Not yet:** <deferred option + the condition that would reopen it>

## Design specifics
<!-- The concrete decisions an implementer needs: placement, interfaces, keys,
limits, defaults, storage, failure handling. Bullet form. Only what's
load-bearing for the recommendation — not a full implementation plan. -->
- <decision>
- <decision>

## Open questions
<!-- The things you don't know yet that would change the design. Each should be
answerable — name who/what resolves it. These become follow-up actions. -->
- <question — owner / how it gets answered>
- <question>

## Alignment with existing standards
<!-- How this sits with the team's established principles / steering docs. If it
follows them, say which and how; if it diverges, flag it as a logged exception
rather than a silent one. Delete if there's no relevant standard yet. -->
- <reference to the standard + how this RFC is consistent with / diverges from it>
