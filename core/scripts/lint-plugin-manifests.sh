#!/usr/bin/env bash
# PostToolUse(Write|Edit|MultiEdit) lint — enforces this marketplace's two
# mechanical authoring rules so they don't depend on the model remembering them:
#
#   1. every <plugin>/skills/<dir> on disk is registered in that plugin's
#      .claude-plugin/plugin.json "skills" array (unregistered = silently disabled)
#   2. marketplace.json plugins[].version mirrors each plugin.json version
#
# Scoped: only runs when the edited file is a plugin.json, marketplace.json, or
# SKILL.md inside a repo whose root has .claude-plugin/marketplace.json.
# Silent (exit 0) when clean or out of scope; violations exit 2 so stderr is
# fed back to Claude as feedback (the write itself is not blocked).
set -uo pipefail

INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" 2>/dev/null)
[ -z "$FILE" ] && exit 0

case "$FILE" in
  */plugin.json|*/marketplace.json|*/SKILL.md) ;;
  *) exit 0 ;;
esac

# Walk up to the marketplace root
DIR=$(dirname "$FILE")
ROOT=""
while [ "$DIR" != "/" ] && [ -n "$DIR" ]; do
  if [ -f "$DIR/.claude-plugin/marketplace.json" ]; then ROOT="$DIR"; break; fi
  DIR=$(dirname "$DIR")
done
[ -z "$ROOT" ] && exit 0

python3 - "$ROOT" <<'PY'
import json, os, sys

root = sys.argv[1]
problems = []

mp_path = os.path.join(root, ".claude-plugin", "marketplace.json")
try:
    with open(mp_path) as f:
        mp = json.load(f)
except Exception as e:
    print(f"plugin-manifest lint: {mp_path} is invalid JSON ({e})", file=sys.stderr)
    sys.exit(2)

for entry in mp.get("plugins", []):
    src = entry.get("source", "").lstrip("./").rstrip("/")
    pj_path = os.path.join(root, src, ".claude-plugin", "plugin.json")
    if not os.path.isfile(pj_path):
        problems.append(f"{entry.get('name')}: expected manifest missing at {pj_path}")
        continue
    try:
        with open(pj_path) as f:
            pj = json.load(f)
    except Exception as e:
        problems.append(f"{pj_path}: invalid JSON ({e})")
        continue

    # Rule 2 — version mirroring
    if entry.get("version") != pj.get("version"):
        problems.append(
            f"version drift: {src}/.claude-plugin/plugin.json says {pj.get('version')!r} "
            f"but marketplace.json advertises {entry.get('version')!r} — these are the "
            "same fact in two files (see harness CLAUDE.md, Versioning)")

    # Rule 1 — every skills/<dir> registered
    skills_dir = os.path.join(root, src, "skills")
    if os.path.isdir(skills_dir):
        registered = {s.replace("./skills/", "").strip("/") for s in pj.get("skills", [])}
        on_disk = {d for d in os.listdir(skills_dir)
                   if os.path.isdir(os.path.join(skills_dir, d)) and not d.startswith(".")}
        for missing in sorted(on_disk - registered):
            problems.append(
                f"unregistered skill: {src}/skills/{missing} exists on disk but is not in "
                f"{src}/.claude-plugin/plugin.json \"skills\" — the skill is silently disabled")

if problems:
    print("plugin-manifest lint:", file=sys.stderr)
    for p in problems:
        print(f"  - {p}", file=sys.stderr)
    sys.exit(2)
PY
exit $?
