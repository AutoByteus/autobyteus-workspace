#!/bin/bash
# autobyteus-435 API/E2E API-13: a test node of this worktree's server dist on 127.0.0.1:<port>, its own data root and
# HOME. Usage: refnode.sh <allowed-hosts or ''> (runs in the foreground; the caller backgrounds it).
B=/private/tmp/abx435-api; P=$(cut -d' ' -f1 $B/refnode-ports)
cd /Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/autobyteus-server-ts
exec env -i PATH="$PATH" HOME=$B/refnode/home TMPDIR="$TMPDIR" APP_ENV=test LOG_LEVEL=WARN AUTOBYTEUS_HTTP_ACCESS_LOG_MODE=all \
  AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:$P AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL="$(cat $B/owner-credential)" ${1:+AUTOBYTEUS_ALLOWED_HOSTS=$1} \
  node dist/app.js --host 127.0.0.1 --port $P --data-dir $B/refnode/data
