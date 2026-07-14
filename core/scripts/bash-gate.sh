#!/usr/bin/env bash
# PreToolUse(Bash) gate — deterministic guardrail around shell commands.
#
#   1. Blocks a small, high-confidence denylist of destructive patterns
#      (rm -rf on roots, force-push to main/master, curl|sh, device wipes).
#   2. Appends every command to a locally-ignored audit log.
#
# Deny is emitted as JSON permissionDecision; clean commands pass silently.
# The denylist is deliberately conservative — a false block is easy to work
# around (run the command manually), a false pass is not.
set -uo pipefail

INPUT=$(cat)

# NB: the heredoc feeds python its *script* via stdin, so the hook payload
# must travel via the environment — piping it would be swallowed by the heredoc.
DECISION=$(CLAUDE_HOOK_INPUT="$INPUT" python3 - <<'PY'
import json, os, re

try:
    cmd = json.loads(os.environ.get("CLAUDE_HOOK_INPUT", "{}")).get("tool_input", {}).get("command", "")
except Exception:
    cmd = ""

RULES = [
    (r"\brm\s+(-[a-z]*[rf][a-z]*\s+)*-[a-z]*[rf][a-z]*\s+[\"']?(/|~/?|\$HOME)[\"']?\s*($|[;&|])",
     "rm -rf aimed at /, ~ or $HOME"),
    (r"\brm\b[^|;&]*--no-preserve-root",
     "rm with --no-preserve-root (only exists to allow deleting /)"),
    (r"\brm\b(?=[^|;&]*--recursive)(?=[^|;&]*--force)[^|;&]*\s[\"']?(/|~/?|\$HOME)[\"']?\s*($|[;&|])",
     "rm --recursive --force aimed at /, ~ or $HOME"),
    (r"\bgit\s+push\b(?=.*(\s--force(?!-with-lease)\b|\s-f\b|\s\+))(?=.*\b(main|master)\b)",
     "force-push to main/master"),
    (r"\b(curl|wget)\b[^|;&]*\|\s*(sudo\s+)?(ba|z|da)?sh\b",
     "piping a network download straight into a shell"),
    (r"\bmkfs(\.[a-z0-9]+)?\b|\bdd\b[^;|&]*\bof=/dev/(sd|nvme|disk)",
     "filesystem/device overwrite"),
    (r"\bchmod\s+(-R\s+)?777\s+/\s*($|[;&|])",
     "chmod 777 on /"),
]

for pattern, why in RULES:
    if re.search(pattern, cmd, re.IGNORECASE):
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": (
                    f"bash-gate: blocked — {why}. If this is intentional, run it "
                    "manually outside the agent, or adjust the denylist in "
                    "core/scripts/bash-gate.sh."
                ),
            }
        }))
        break
PY
)

# Audit log — every command, one flattened line, kept out of version control
if [ -n "${CLAUDE_PROJECT_DIR:-}" ] && cd "$CLAUDE_PROJECT_DIR" 2>/dev/null \
   && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  LOG=".claude/bash-commands.log"
  mkdir -p .claude
  EXCLUDE="$(git rev-parse --git-dir)/info/exclude"
  grep -qxF "$LOG" "$EXCLUDE" 2>/dev/null || echo "$LOG" >> "$EXCLUDE"
  CMD_LINE=$(printf '%s' "$INPUT" | python3 -c "import sys,json; c=json.load(sys.stdin).get('tool_input',{}).get('command',''); print(' '.join(c.split())[:500])" 2>/dev/null || true)
  [ -n "$CMD_LINE" ] && echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | $CMD_LINE" >> "$LOG"
fi

if [ -n "$DECISION" ]; then
  printf '%s\n' "$DECISION"
fi

exit 0
