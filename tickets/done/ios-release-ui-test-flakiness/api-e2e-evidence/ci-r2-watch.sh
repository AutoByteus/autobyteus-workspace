#!/bin/bash
# Waits for the 10 parallel round-2 dispatches (IDs in ci-r2-run-ids.txt) and records each run.
E="$(cd "$(dirname "$0")" && pwd)"
IDS=$(cat "$E/ci-r2-run-ids.txt")
while true; do
  pending=0
  for id in $IDS; do
    st=$(gh run view "$id" -R AutoByteus/autobyteus-workspace --json status -q .status 2>/dev/null)
    [ "$st" != "completed" ] && pending=$((pending+1))
  done
  [ "$pending" = "0" ] && break
  sleep 60
done
: > "$E/ci-r2-results.jsonl"
for id in $IDS; do
  gh run view "$id" -R AutoByteus/autobyteus-workspace --json databaseId,attempt,conclusion,headSha,createdAt,updatedAt,jobs \
    -q '{id: .databaseId, attempt: .attempt, conclusion: .conclusion, headSha: .headSha, createdAt: .createdAt, updatedAt: .updatedAt, jobs: [.jobs[] | {name: .name, conclusion: .conclusion}]}' >> "$E/ci-r2-results.jsonl"
done
echo "done: $(grep -c '"conclusion":"success","createdAt' "$E/ci-r2-results.jsonl") of $(wc -l < "$E/ci-r2-results.jsonl")"
