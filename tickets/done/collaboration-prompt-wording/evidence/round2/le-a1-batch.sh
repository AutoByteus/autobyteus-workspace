#!/bin/bash
# Usage: le-a1-batch.sh <branch|base> <claude|codex|lmstudio> <n> [first run number]
# Runs LE-A1 n times sequentially on the given side and runtime (real HOME for signed-in CLIs), keeping each run's memory folder (helper traces).
SIDE=$1; RT=$2; N=$3; START=${4:-1}
ROOT=/Users/normy/autobyteus_org/autobyteus-worktrees
[ "$SIDE" = branch ] && D=$ROOT/collaboration-prompt-wording || D=$ROOT/cpw-base-check
OUT=$ROOT/collaboration-prompt-wording/tickets/in-progress/collaboration-prompt-wording/evidence/round2
case $RT in claude) GATE=RUN_CLAUDE_E2E; FILTER='claude_agent_sdk: LE-A1';; codex) GATE=RUN_CODEX_E2E; FILTER='codex_app_server: LE-A1';; lmstudio) GATE=RUN_LMSTUDIO_E2E; FILTER='autobyteus: LE-A1';; esac
for i in $(seq $START $((START+N-1))); do
  KEEP=$OUT/traces/$SIDE-$RT-run$i; mkdir -p $KEEP
  cd $D && env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" $GATE=1 CPW_KEEP_DIR=$KEEP pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/zz-keep-agent-initiated-collaborators.e2e.test.ts -t "$FILTER" --no-watch > $OUT/LE-A1-$SIDE-$RT-run$i.log 2>&1
  echo "$SIDE $RT run $i exit $?" >> $OUT/LE-A1-$SIDE-$RT-from$START.exits
done
echo done >> $OUT/LE-A1-$SIDE-$RT-from$START.exits
