#!/usr/bin/env bash
# Investigator-owned comparative harness. Does not alter source/test files or use a provider/model/database.
set -uo pipefail
E="$(cd "$(dirname "$0")" && pwd)"
S="/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/autobyteus-server-ts"
created=0
if [ ! -e "$E/node_modules" ]; then ln -s "$S/node_modules" "$E/node_modules"; created=1; fi
trap '[ "$created" = 0 ] || rm "$E/node_modules"' EXIT
# Reruns append exact-generation receipts; use a fresh copy/output folder to compare rounds.
for v in - t tc bc tbc; do
  label="$v"; [ "$v" != - ] || label=incoming
  SD_VARIANT="$v" pnpm -C "$S" exec vitest run --config "$E/vitest.config.mts" "$E/discrimination.test.ts" --no-watch > "$E/$label-rerun.log" 2>&1
  printf '%s exit=%s\n' "$label" "$?"
done
for v in tc tbc; do
  SD_VARIANT="$v" pnpm -C "$S" exec vitest run --config "$E/vitest.config.mts" "$E/queued-pipeline.test.ts" --no-watch > "$E/$v-queued-rerun.log" 2>&1
  printf '%s-queued exit=%s\n' "$v" "$?"
done
for v in - tbc; do
  label="$v"; [ "$v" != - ] || label=incoming
  SD_VARIANT="$v" pnpm -C "$S" exec vitest run --config "$E/vitest.config.mts" "$E/immediate-terminal.test.ts" --no-watch > "$E/$label-immediate-rerun.log" 2>&1
  printf '%s-immediate exit=%s\n' "$label" "$?"
done
SD_VARIANT=tbc pnpm -C "$S" exec vitest run --config "$E/vitest.config.mts" "$E/durable-current.test.ts" --no-watch > "$E/durable-current-rerun.log" 2>&1
printf 'durable-current exit=%s\n' "$?"
