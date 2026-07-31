#!/usr/bin/env bash
# upstream-gap.sh — enrichment-sync gap check against ai-toolkit (`upstream`).
#
# Surfaces what ai-toolkit has that this harness lacks, and where an item we
# both have is materially deeper upstream. Read-only; prints a report. See
# PORTING.md for the layout/agent maps and the port procedure.
#
# Usage: bash scripts/upstream-gap.sh
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1

git remote get-url upstream >/dev/null 2>&1 || {
  echo "no 'upstream' remote — add ai-toolkit: git remote add upstream https://github.com/Multiverse-io/ai-toolkit.git"; exit 1; }
echo "fetching upstream…"; git fetch -q upstream 2>/dev/null

tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT

names_up () { git ls-tree -r --name-only upstream/main "$1" 2>/dev/null; }

echo
echo "########## SKILLS: harness-core → core ##########"
names_up plugins/harness-core/skills | grep '/SKILL.md$' | sed -E 's#plugins/harness-core/skills/([^/]+)/.*#\1#' | sort -u > "$tmp/up_skills"
ls -1 core/skills 2>/dev/null | sort -u > "$tmp/my_skills"
echo "--- in ai-toolkit, NOT here (candidates to ADD) ---"; comm -23 "$tmp/up_skills" "$tmp/my_skills"
echo "--- here only (our own — keep) ---"; comm -13 "$tmp/up_skills" "$tmp/my_skills"

echo
echo "########## AGENTS: harness-core → core ##########"
names_up plugins/harness-core/agents | grep '\.md$' | sed -E 's#.*/([^/]+)\.md#\1#' | sort -u > "$tmp/up_agents"
ls -1 core/agents 2>/dev/null | sed 's/\.md$//' | sort -u > "$tmp/my_agents"
echo "--- in ai-toolkit, NOT here ---"; comm -23 "$tmp/up_agents" "$tmp/my_agents"
echo "--- here only ---"; comm -13 "$tmp/up_agents" "$tmp/my_agents"

echo
echo "########## COMMANDS: harness-core → core ##########"
names_up plugins/harness-core/commands | grep '\.md$' | sed -E 's#.*/([^/]+)\.md#\1#' | sort -u > "$tmp/up_cmds"
ls -1 core/commands 2>/dev/null | sed 's/\.md$//' | sort -u > "$tmp/my_cmds"
echo "--- in ai-toolkit, NOT here ---"; comm -23 "$tmp/up_cmds" "$tmp/my_cmds"

echo
echo "########## DEPTH: overlapping core skills (upstream vs here) ##########"
printf "%-26s %8s %8s   %s\n" "skill" "upstrm" "here" "flag"
while read -r s; do
  upn=$(git show "upstream/main:plugins/harness-core/skills/$s/SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
  [ -z "$upn" ] || [ "$upn" = 0 ] && continue
  myf="core/skills/$s/SKILL.md"; [ -f "core/skills/$s/$s/SKILL.md" ] && myf="core/skills/$s/$s/SKILL.md"
  myn=$(wc -l < "$myf" 2>/dev/null | tr -d ' '); [ -z "$myn" ] && myn=0
  flag=""; [ "$upn" -gt "$((myn + 20))" ] && flag="<< UPSTREAM DEEPER (+$((upn-myn)))"
  [ "$myn" -gt "$((upn + 20))" ] && flag="ours deeper (+$((myn-upn)))"
  printf "%-26s %8s %8s   %s\n" "$s" "$upn" "$myn" "$flag"
done < "$tmp/my_skills"

echo
echo "########## OTHER UPSTREAM PLUGINS (whole-plugin candidates) ##########"
for p in $(git ls-tree --name-only upstream/main:plugins 2>/dev/null); do
  case "$p" in harness-core|harness-security) continue;; esac
  [ -d "$p" ] && echo "  $p — already here" || echo "  $p — NOT here"
done

echo
echo "########## suggested/ (RFC staging — opt-in only) ##########"
git ls-tree --name-only upstream/main:suggested 2>/dev/null | grep -v '^README.md$'

echo
echo "Done. See PORTING.md for the port procedure."
