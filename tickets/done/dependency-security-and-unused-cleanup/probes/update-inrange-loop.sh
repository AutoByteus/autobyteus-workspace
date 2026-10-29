#!/usr/bin/env bash
# Repeat: audit -> list IN-RANGE rows (probes/fixability.mjs) -> `pnpm update -r --depth Infinity <name>` one name at a time,
# until no IN-RANGE row is left or a round changes nothing. Usage: update-inrange-loop.sh <repoRoot> <fixability.mjs>
set -u; cd "$1"; FIX="$2"
for round in 1 2 3 4 5; do
  pnpm audit --json > /tmp/loop-audit.json 2>/dev/null
  names=$(node "$FIX" /tmp/loop-audit.json "$PWD" 2>/dev/null | grep '^IN-RANGE' | sed -E 's/^IN-RANGE (.+)@[0-9][^ ]* <- .*/\1/' | sort -u)
  [ -z "$names" ] && { echo "round $round: no in-range rows left"; break; }
  before=$(md5 -q pnpm-lock.yaml)
  echo "round $round: $(echo $names | wc -w) names: $names"
  for n in $names; do pnpm update -r --depth Infinity "$n" >/dev/null 2>&1 || echo "  update failed: $n"; done
  pnpm dedupe >/dev/null 2>&1
  [ "$before" = "$(md5 -q pnpm-lock.yaml)" ] && { echo "round $round: lockfile unchanged, stopping"; break; }
done
