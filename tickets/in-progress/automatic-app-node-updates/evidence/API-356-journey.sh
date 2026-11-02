#!/usr/bin/env bash
# TEMPORARY API/E2E harness (autobyteus-356), kept as evidence; not repository test code.
# One real automatic install of V1 -> the feed's version on a fresh isolated profile (round 3), sampled from outside:
#   fresh copy and data; start; feed `none` + Check; switch on by a click; optional busy Claude run; feed `good`;
#   sampler (state, health, busy marker) every 500 ms; Check; wait for the relaunch; collect the instance log.
# Usage: API-356-journey.sh <case id> <evidence dir> [busy]
CASE="$1"; E="$2"; BUSY="${3:-}"
R=$(cat /Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates/.an356-api-run-root)
bash $R/fresh.sh > /dev/null; echo '{"mode":"none"}' > $R/feed-control.json
J=$R/logs/inst-$CASE.json; bash $R/start.sh $R/copies/app/AutoByteus.app $R/data-app 47921 $J > /dev/null
CP=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1])).result.controlPort' $J); PID=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1])).result.pid' $J); LOG=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1])).result.logPath' $J)
cd $R/clean; sleep 12; node $E/API-356-drive.mjs $CP $E/API-356-page-switch-on.js > $R/logs/$CASE-switch.json
MARKER=""; if [ "$BUSY" = busy ]; then mkdir -p $R/workspace; MARKER="AN356r3_${CASE}_$(date +%s)"; node $E/API-356-busy-agent.mjs busy 47921 $R/workspace $MARKER > $R/logs/$CASE-busy.json; fi
echo '{"mode":"good"}' > $R/feed-control.json; echo "{\"marker\":\"$CASE check $(date -u +%FT%TZ)\"}" >> $R/logs/feed.jsonl
rm -f $E/$CASE-sampler.jsonl; node $E/API-356-sampler.mjs $CP 47921 $E/$CASE-sampler.jsonl 360 $MARKER & SAMP=$!
sleep 1; node $E/API-356-drive.mjs $CP $E/API-356-page-check.js > $R/logs/$CASE-check.json
for i in $(seq 1 120); do sleep 3; kill -0 $PID 2>/dev/null || break; done
for i in $(seq 1 40); do sleep 3; curl -s -m 2 -o /dev/null -w '%{http_code}' http://127.0.0.1:47921/rest/health | grep -q 200 && break; done
sleep 25; kill $SAMP 2>/dev/null; cp $LOG $E/$CASE-v1-instance.log; cp $R/data-app/logs/app.log $E/$CASE-v2-relaunched-app.log 2>/dev/null
echo "case=$CASE cp=$CP oldPid=$PID oldAlive=$(kill -0 $PID 2>/dev/null && echo yes || echo no) bundle=$(plutil -extract CFBundleShortVersionString raw $R/copies/app/AutoByteus.app/Contents/Info.plist) health=$(curl -s -m 2 -o /dev/null -w '%{http_code}' http://127.0.0.1:47921/rest/health)"
echo "record: $(tr -d ' \n' < $R/data-app/electron/user-data/app-update-notification.json)"
