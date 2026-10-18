#!/usr/bin/env bash
# Runs a gated native-runtime live suite on this worktree in a clean environment (TESTING.md: no live-app
# variable leaks). Provider keys are read BY NAME from the importer source file and passed only as credential
# aliases; each suite saves them into its own per-run test-owned vault (never the user's app database).
# Values are never printed.
# Usage: run-live.sh <GATE_VAR> <evidence-dir> <spec path relative to autobyteus-server-ts> [vitest -t filter]
set -euo pipefail
SOURCE=/Users/normy/.autobyteus/server-data/.env
WORKTREE=/Users/normy/autobyteus_org/autobyteus-worktrees/agent-loop-structure-refactor
GATE="$1"; EVIDENCE_DIR="$2"; SPEC="$3"; FILTER="${4:-}"
val() { grep -E "^$1=" "$SOURCE" | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"; }
HOME_DIR=$(mktemp -d "${TMPDIR:-/tmp}/alsr-live-home-XXXXXX")
trap 'rm -rf "$HOME_DIR"' EXIT
mkdir -p "$EVIDENCE_DIR"
cd "$WORKTREE/autobyteus-server-ts"
ARGS=(run "$SPEC" --no-watch)
[ -n "$FILTER" ] && ARGS+=(-t "$FILTER")
env -i PATH="$PATH" HOME="$HOME_DIR" TMPDIR="${TMPDIR:-/tmp}" \
  "$GATE=1" \
  OUTPUT_LIMIT_E2E_EVIDENCE_DIR="$EVIDENCE_DIR" ANTHROPIC_CACHE_E2E_EVIDENCE_DIR="$EVIDENCE_DIR" COMPACTION_CACHE_E2E_EVIDENCE_DIR="$EVIDENCE_DIR" \
  ANTHROPIC_API_KEY="$(val ANTHROPIC_API_KEY)" OPENAI_API_KEY="$(val OPENAI_API_KEY)" \
  DEEPSEEK_API_KEY="$(val DEEPSEEK_API_KEY)" GLM_API_KEY="$(val GLM_API_KEY)" GROK_API_KEY="$(val GROK_API_KEY)" \
  VERTEX_AI_API_KEY="$(val VERTEX_AI_API_KEY)" DASHSCOPE_API_KEY="$(val QWEN_API_KEY)" QWEN_BASE_URL="$(val QWEN_BASE_URL)" \
  ./node_modules/.bin/vitest "${ARGS[@]}"
