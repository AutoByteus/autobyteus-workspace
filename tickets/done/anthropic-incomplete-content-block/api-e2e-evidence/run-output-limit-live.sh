#!/usr/bin/env bash
# Runs autobyteus-native-output-limit-live.e2e.test.ts in a clean environment (TESTING.md: no live-app variable leaks).
# Provider keys are read from the importer source file (the one implementation imported into the test vault) and
# passed only as credential aliases; the test saves them into its per-run test-owned vault. Values are never printed.
# Usage: run-output-limit-live.sh <evidence-dir> [vitest -t filter]
set -euo pipefail
SOURCE=/Users/normy/.autobyteus/server-data/.env
WORKTREE=/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-incomplete-content-block
EVIDENCE_DIR="$1"; FILTER="${2:-}"
val() { grep -E "^$1=" "$SOURCE" | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"; }
HOME_DIR=$(mktemp -d "${TMPDIR:-/tmp}/olm-e2e-home-XXXXXX")
trap 'rm -rf "$HOME_DIR"' EXIT
cd "$WORKTREE/autobyteus-server-ts"
ARGS=(run tests/e2e/runtime/autobyteus-native-output-limit-live.e2e.test.ts --no-watch)
[ -n "$FILTER" ] && ARGS+=(-t "$FILTER")
env -i PATH="$PATH" HOME="$HOME_DIR" TMPDIR="${TMPDIR:-/tmp}" \
  RUN_NATIVE_OUTPUT_LIMIT_E2E=1 OUTPUT_LIMIT_E2E_EVIDENCE_DIR="$EVIDENCE_DIR" \
  ANTHROPIC_API_KEY="$(val ANTHROPIC_API_KEY)" OPENAI_API_KEY="$(val OPENAI_API_KEY)" \
  DEEPSEEK_API_KEY="$(val DEEPSEEK_API_KEY)" GLM_API_KEY="$(val GLM_API_KEY)" GROK_API_KEY="$(val GROK_API_KEY)" \
  VERTEX_AI_API_KEY="$(val VERTEX_AI_API_KEY)" DASHSCOPE_API_KEY="$(val QWEN_API_KEY)" QWEN_BASE_URL="$(val QWEN_BASE_URL)" \
  ./node_modules/.bin/vitest "${ARGS[@]}"
