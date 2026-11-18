#!/usr/bin/env bash
# TEMPORARY API/E2E harness (autobyteus-356), kept as evidence; not repository test code.
# Watches a real automatic install of a test copy, once a second, for up to <seconds>:
#   processes running from the copy's bundle (with their arguments), ShipIt for the copy's bundle id,
#   the copy's Info.plist version, the embedded server's /rest/health and release stamp, and the update record.
# One line per change. Usage: API-356-watch.sh <copy.app> <server port> <user-data dir> <seconds> <out.log>
COPY="$1"; PORT="$2"; UD="$3"; SECS="$4"; OUT="$5"
last=""
for ((i = 0; i < SECS; i++)); do
  procs=$(ps -A -o pid=,command= | grep -F "$COPY/Contents/MacOS/AutoByteus" | grep -v grep | sed -E 's/ --(remote-debugging-port|disable)[^ ]*//g' | awk '{print $1, $2, ($3 ~ /^--autobyteus-isolated/ ? $3 : "")}' | tr '\n' ';')
  ship=$(ps -A -o pid=,command= | grep -i "ShipIt" | grep -i "an356" | grep -v grep | awk '{print $1}' | tr '\n' ',')
  ver=$(plutil -extract CFBundleShortVersionString raw "$COPY/Contents/Info.plist" 2>/dev/null)
  health=$(curl -s -m 1 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/rest/health")
  rec=$(tr -d ' \n' < "$UD/app-update-notification.json" 2>/dev/null | cut -c1-400)
  now="procs=[$procs] shipit=[$ship] bundle=$ver health=$health record=$rec"
  if [ "$now" != "$last" ]; then echo "$(date -u +%FT%T.%3NZ 2>/dev/null || date -u +%FT%TZ) $now" >> "$OUT"; last="$now"; fi
  sleep 1
done
echo "$(date -u +%FT%TZ) watch ended" >> "$OUT"
