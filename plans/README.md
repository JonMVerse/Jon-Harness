# plans/

**This directory is committed on purpose. Please don't gitignore it.**

Plans and worklogs are among the highest-leverage artefacts this harness
produces. A plan records *why* we chose an approach; the worklog records what
actually happened — including where we changed our minds mid-flight. None of
that survives in the git history of the code, which only ever shows what we
finally did. Committing them means every future session, human or agent, starts
with the accumulated context of everything that came before instead of
re-deriving it.

It also makes the tooling work as designed. The `rename-plan` hook,
`/plan-status`, `build`, and `wrap-up` all read this directory. Left untracked,
they only work for whoever happened to author the plan locally.

## How it fills up

You don't create dated folders by hand — the `core` PostToolUse hook captures
them automatically (see `core/CLAUDE.md`). Two sources:

1. Claude Code plan-mode artefacts at `~/.claude/plans/<slug>.md` are mirrored
   into `plans/YYYY-MM-DD-<slug>/plan.md` (the primary path — just use plan mode).
2. In-project drafts at `plans/.tmp/<slug>.md` get the same treatment.

Both grow a `worklog.md` alongside as work proceeds.

## The principle

Leave every repo in a better contextual state than you found it. That's why
`plans/` is tracked here — and why it's worth tracking in every repo where we
run a harness.
