#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)
echo "$INPUT" >> /tmp/rename-plan-debug.log
FILE=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))")

[ -z "$FILE" ] && exit 0
FILE=$(realpath "$FILE" 2>/dev/null || echo "$FILE")

# Two trigger paths:
#   1. ~/.claude/plans/<slug>.md  — Claude Code plan-mode artifacts. Mirror into
#      the running project's plans/ dir (located via $CLAUDE_PROJECT_DIR).
#   2. <project>/plans/.tmp/<slug>.md — in-project drafts. Move into a dated
#      sibling folder under the same plans/ dir.
if [[ "$FILE" == */.claude/plans/*.md ]]; then
  [ -z "${CLAUDE_PROJECT_DIR:-}" ] && exit 0
  PLANS_DIR="${CLAUDE_PROJECT_DIR}/plans"
elif [[ "$FILE" == */plans/.tmp/*.md ]]; then
  PLANS_DIR=$(dirname "$(dirname "$FILE")")  # .../plans/
else
  exit 0
fi

# Ensure PLANS_DIR exists — for plan-mode flow it may not on first use, and the
# `find` call below would exit 1 under `set -euo pipefail` and abort the script.
mkdir -p "$PLANS_DIR"

BASENAME=$(basename "$FILE" .md)

# Detect if this is an agent worklog (contains -agent- suffix)
if [[ "$BASENAME" =~ ^(.+)-agent-([a-f0-9]+)$ ]]; then
  # --- Agent worklog ---
  SESSION="${BASH_REMATCH[1]}"
  AGENT_ID="${BASH_REMATCH[2]}"

  # Find the folder by checking the session's namecard
  SESSION_NAMECARD="${PLANS_DIR}/.tmp/${SESSION}.md.name"
  if [ -f "$SESSION_NAMECARD" ]; then
    FOLDER_NAME=$(cat "$SESSION_NAMECARD")
    mkdir -p "$PLANS_DIR/$FOLDER_NAME"
    cp "$FILE" "$PLANS_DIR/$FOLDER_NAME/worklog-${AGENT_ID}.md"
  else
    # Parent plan hasn't been named yet — stash with a marker so it can
    # be moved once the plan folder is created
    mkdir -p "$PLANS_DIR/.tmp/pending"
    cp "$FILE" "$PLANS_DIR/.tmp/pending/${SESSION}--agent-${AGENT_ID}.md"
  fi
else
  # --- Main plan ---
  NAMECARD="${FILE}.name"

  if [ -f "$NAMECARD" ]; then
    FOLDER_NAME=$(cat "$NAMECARD")
  else
    # First write — summarize with LLM, store result in .name file
    DESC=$(head -c 1500 "$FILE" | claude -p "Summarize this plan in 3-5 words as snake_case, lowercase only, no punctuation. Output ONLY the description.")
    DESC=$(echo "$DESC" | tr '[:upper:]' '[:lower:]' | tr ' ' '_' | tr -cd 'a-z0-9_')
    [ -z "$DESC" ] && exit 0

    # Check for existing folder with same description (different date prefix)
    EXISTING=$(find "$PLANS_DIR" -maxdepth 1 -type d -name "*-${DESC}" | head -1)
    if [ -n "$EXISTING" ]; then
      FOLDER_NAME=$(basename "$EXISTING")
    else
      DATE=$(date +%Y-%m-%d)
      FOLDER_NAME="${DATE}-${DESC}"
    fi
    echo "$FOLDER_NAME" > "$NAMECARD"
  fi

  mkdir -p "$PLANS_DIR/$FOLDER_NAME"
  cp "$FILE" "$PLANS_DIR/$FOLDER_NAME/plan.md"

  # Auto-create worklog
  WORKLOG="$PLANS_DIR/$FOLDER_NAME/worklog.md"
  if [ ! -f "$WORKLOG" ]; then
    cat > "$WORKLOG" <<EOF
# Worklog — ${FOLDER_NAME}

| Timestamp | Action | Detail |
|-----------|--------|--------|
EOF
  fi

  # Adopt any pending worklogs for this session
  PENDING_DIR="$PLANS_DIR/.tmp/pending"
  if [ -d "$PENDING_DIR" ]; then
    for PENDING in "$PENDING_DIR/${BASENAME}--agent-"*.md; do
      [ -f "$PENDING" ] || continue
      PENDING_BASE=$(basename "$PENDING" .md)
      AGENT_ID="${PENDING_BASE##*--agent-}"
      cp "$PENDING" "$PLANS_DIR/$FOLDER_NAME/worklog-${AGENT_ID}.md"
      rm "$PENDING"
    done
  fi
fi