#!/bin/bash
# AC-I3: 10 sequential manual dispatches of release-ios.yml on the fix branch, publish disabled.
REF=codex/ios-release-ui-test-flakiness
OUT="$1"
seen=""
for i in $(seq 1 10); do
  before=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  gh workflow run release-ios.yml --ref "$REF" -f publish_app_store_connect=false || { echo "{\"run\":$i,\"error\":\"dispatch failed\"}" >> "$OUT"; exit 1; }
  id=""
  for t in $(seq 1 60); do
    sleep 5
    id=$(gh run list --workflow release-ios.yml --branch "$REF" --event workflow_dispatch --limit 5 --json databaseId,createdAt \
      -q "[.[] | select(.createdAt >= \"$before\")] | sort_by(.createdAt) | last | .databaseId // empty")
    [ -n "$id" ] && ! echo "$seen" | grep -qw "$id" && break
    id=""
  done
  [ -z "$id" ] && { echo "{\"run\":$i,\"error\":\"run id not found\"}" >> "$OUT"; exit 1; }
  seen="$seen $id"
  while true; do
    st=$(gh run view "$id" --json status -q .status 2>/dev/null)
    [ "$st" = "completed" ] && break
    sleep 30
  done
  gh run view "$id" --json databaseId,attempt,conclusion,createdAt,updatedAt,headSha,jobs \
    -q "{run: $i, id: .databaseId, attempt: .attempt, conclusion: .conclusion, headSha: .headSha, createdAt: .createdAt, updatedAt: .updatedAt, jobs: [.jobs[] | {name: .name, conclusion: .conclusion}]}" -c >> "$OUT"
  concl=$(gh run view "$id" --json conclusion -q .conclusion)
  [ "$concl" != "success" ] && { echo "series stopped at run $i ($id): $concl"; exit 2; }
done
echo "series complete"
