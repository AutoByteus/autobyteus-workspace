#!/bin/bash
# CRR-064: names cited in the long-lived docs 461 changed that exist in neither the base's
# nor the branch's source, and that 461's own history added and later removed.
# Delivery's base-vs-branch check cannot see these. Run from anywhere; writes to $TMPDIR.
set -u
WT=/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461
BASE=3d738de6e6
OUT=${TMPDIR:-/tmp}/crr064
mkdir -p "$OUT"
cd "$WT" || exit 1
SRC_PATHS="autobyteus-server-ts/src autobyteus-web autobyteus-ts/src"

git diff --name-only "$BASE" HEAD -- '*.md' | grep -v '^tickets/' | grep -v CHANGELOG > "$OUT/docs.txt"
: > "$OUT/ids.txt"
while read -r f; do
  [ -f "$f" ] || continue
  grep -o -E '`[A-Z][A-Za-z0-9]*[a-z][A-Za-z0-9]*`|`[A-Z][A-Z0-9]*_[A-Z0-9_]*`' "$f" | tr -d '`' | sort -u | sed "s|^|$f |" >> "$OUT/ids.txt"
done < "$OUT/docs.txt"

git archive HEAD $SRC_PATHS | tar -xO > "$OUT/head.blob" 2>/dev/null
git archive "$BASE" $SRC_PATHS | tar -xO > "$OUT/base.blob" 2>/dev/null

awk '{print $2}' "$OUT/ids.txt" | sort -u | while read -r id; do
  grep -q -w -- "$id" "$OUT/head.blob" && continue
  grep -q -w -- "$id" "$OUT/base.blob" && continue
  n=$(git log --format=%h -S "$id" "$BASE"..HEAD -- autobyteus-server-ts/src autobyteus-web/components autobyteus-web/composables autobyteus-web/stores autobyteus-web/services autobyteus-web/utils | wc -l)
  [ "$n" -gt 0 ] || continue
  echo "$id :: $(grep " $id\$" "$OUT/ids.txt" | awk '{print $1}' | tr '\n' ' ')"
done
