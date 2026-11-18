#!/bin/bash
# start-node.sh <name> <port>: a test-owned server of the manage-nodes-professional worktree, own data root, clean env.
set -e
NAME=$1; PORT=$2
ROOT=/tmp/mnp-visual/$NAME
SERVER=/Users/normy/autobyteus_org/autobyteus-worktrees/manage-nodes-professional/autobyteus-server-ts
mkdir -p $ROOT/data $ROOT/home
[ -f $ROOT/data/.env ] || printf "AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:$PORT\nAPP_ENV=test\nLOG_LEVEL=WARN\nHTTP_ACCESS_LOG_MODE=off\n" > $ROOT/data/.env
cd $SERVER
exec env -i PATH="$PATH" HOME=$ROOT/home TMPDIR="${TMPDIR:-/tmp}" APP_ENV=test LOG_LEVEL=WARN HTTP_ACCESS_LOG_MODE=off AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:$PORT \
  node dist/app.js --host 127.0.0.1 --port $PORT --data-dir $ROOT/data > $ROOT/server.log 2>&1
