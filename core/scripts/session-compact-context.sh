#!/usr/bin/env bash
# SessionStart(compact) hook — re-inject ground truth after a context compaction.
#
# A compacted session continues from a lossy summary. This hook restores the
# parts that must never be guessed: live git state and the active plan's
# worklog, read from disk at the moment of compaction. Zero model calls.
# stdout (exit 0) is added to the session context.
set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

{
  echo "## Post-compaction re-orientation"
  echo
  echo "Context was just compacted. The summary is lossy — the state below, read live from disk, is ground truth. Trust it over the summary. Do not redo work already recorded as done; re-read the active plan and worklog before continuing."

  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo
    echo "### Git state (live)"
    echo '```'
    echo "branch: $(git branch --show-current 2>/dev/null || echo detached)"
    echo "dirty files:"
    git status --porcelain 2>/dev/null | head -30
    echo "recent commits:"
    git log --oneline -5 2>/dev/null
    echo '```'
  fi

  # Most recently touched plan folder, if this repo keeps plans/
  if [ -d plans ]; then
    LATEST=$(ls -td plans/*/ 2>/dev/null | head -1)
    if [ -n "${LATEST:-}" ] && [ -f "${LATEST}worklog.md" ]; then
      echo
      echo "### Active plan: ${LATEST}"
      echo '```'
      tail -15 "${LATEST}worklog.md"
      echo '```'
    fi
  fi
}

exit 0
