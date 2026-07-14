#!/usr/bin/env bash
# SessionEnd hook — append a one-line breadcrumb (time, reason, branch, dirty
# count) to a locally-ignored log so the next session can pick up the trail.
# Zero tokens — no model runs at session end.
set -uo pipefail

INPUT=$(cat)
REASON=$(printf '%s' "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('reason','unknown'))" 2>/dev/null || echo unknown)

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

LOG=".claude/session-breadcrumbs.log"
mkdir -p .claude

# Keep the log out of version control without touching the repo's .gitignore
EXCLUDE="$(git rev-parse --git-dir)/info/exclude"
grep -qxF "$LOG" "$EXCLUDE" 2>/dev/null || echo "$LOG" >> "$EXCLUDE"

BRANCH=$(git branch --show-current 2>/dev/null || echo detached)
DIRTY=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | reason=${REASON} | branch=${BRANCH} | dirty=${DIRTY}" >> "$LOG"

exit 0
