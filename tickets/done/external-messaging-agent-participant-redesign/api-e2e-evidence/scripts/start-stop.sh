#!/bin/bash
# usage: start-stop.sh <label> <dataDir> <port> <logFile>  -- starts candidate server, waits for health, reports, stops gracefully
W=/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign
label=$1; D=$2; P=$3; LOG=$4
cd $W/autobyteus-server-ts && (/private/tmp/emr-e2e/cleanenv.sh -- node dist/app.js --host 127.0.0.1 --port $P --data-dir $D > $LOG 2>&1 &)
code=000; for i in $(seq 1 90); do code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$P/rest/health 2>/dev/null); [ "$code" = "200" ] && break; sleep 1; done
echo "[$label] health=$code after ${i}s"
sqlite3 -header $D/db/production.db "select migration_id,status,attempts,summary,error_message from app_data_migration_records where migration_id='20260924_remove_external_messaging_data';"
grep -E "remove_external_messaging_data' is|Server listening on" $LOG | cut -c1-260
for r in external-channel extensions/messaging-gateway download/messaging-gateway logs/messaging-gateway; do [ -e "$D/$r" ] && echo "  PRESENT $r ($(find $D/$r -type f | wc -l | tr -d ' ') files)" || echo "  absent  $r"; done
PID=$(lsof -nP -iTCP:$P -sTCP:LISTEN -t); [ -n "$PID" ] && kill -TERM $PID; for i in $(seq 1 20); do lsof -nP -iTCP:$P -sTCP:LISTEN -t >/dev/null 2>&1 || break; sleep 1; done; echo "[$label] stopped"
