---
description: review the changes just made
---

Launch code-reviewer, tech-debt-reviewer, security-reviewer agents in parallel to review the latest uncommitted changes. This is the triage pass: the reviewers report findings by severity, and code-reviewer and security-reviewer attach a 0-100 confidence to each (tech-debt-reviewer is severity-only and writes its own `.debt` report). Consolidate them into one overall report that shows ALL issues broken down by severity, each with a short 1-2 line descriptor and its confidence where provided. Order by severity, then by confidence where available. The merge verdict (Approve/Warn/Block) rests on confident findings only — a low-confidence CRITICAL gets flagged for a human look rather than blocking on its own. If working on a plan, ensure you create a review.md in the respective plan directory, and update the worklog as necessary.
