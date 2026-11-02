#!/usr/bin/env bash
# TEMPORARY API/E2E harness (autobyteus-356), kept as evidence; not repository test code.
# Round 3 staged-path and second-native-fetch journeys on real Squirrel (fresh isolated profile each):
#   API-11   N-13: switch off; Download V2 by a click; wait for Squirrel's copy; Check; switch on -> installs, no 2nd fetch
#   API-12a  F-15 same V: as API-11, then Download again by a click (a 2nd native fetch of V2); switch on -> waits on it
#   API-12b  F-15 newer W: switch off; Download V2; wait; the feed offers V3; Check; switch on -> W downloads, 2nd fetch
#   API-12c  F-15 after a refusal: switch on; the feed's V2 fails Squirrel's signature check (refused in the wait);
#            the feed offers V3; Check -> W downloads in the same process, a native fetch after a failed one
# (Squirrel's 'Download completed' is its fetch only; its verify takes ~36 s more, hence READY_WAIT. A run with +5 s
#  checked during the verify and so started a second native fetch on top of the first: kept as API-11b.)
# (A first API-11 run clicked Download before any check had found V2: kept as API-11a; the script now checks first.)
# Samples the state, health and process from outside; collects the log. Usage: API-356-staged.sh <case> <evidence dir>
CASE="$1"; E="$2"; R=$(cat /Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates/.an356-api-run-root)
drive() { (cd $R/clean && node $E/API-356-drive.mjs $CP "$1" ${2:+"$2"}) | tr -d '\n' | cut -c1-300; echo; }
mark() { echo "{\"marker\":\"$CASE $1 $(date -u +%FT%TZ)\"}" >> $R/logs/feed.jsonl; echo "$(date -u +%T) $1"; }
cat > $R/p-download.js <<'EOF'
await go('#/settings?section=updates'); await click('[data-testid="settings-updates-download-update"]');
const s = await until(async () => { const s = await window.electronAPI.getAppUpdateState(); return s.status === 'downloaded' || s.status === 'error' ? s : null; }, 60000);
return { status: s?.status, staged: s?.updateStaged, preparing: s?.automaticInstallPreparing, automatic: s?.automaticUpdate };
EOF
cat > $R/p-check.js <<'EOF'
await go('#/settings?section=updates'); await click('[data-testid="settings-updates-check-updates"]');
const s = await until(async () => { const s = await window.electronAPI.getAppUpdateState(); return s.status !== 'checking' ? s : null; }, 30000);
return { status: s?.status, availableVersion: s?.availableVersion, staged: s?.updateStaged, preparing: s?.automaticInstallPreparing };
EOF
bash $R/fresh.sh > /dev/null; bash $R/feed.sh $( [ "$CASE" = API-12c ] && echo $R/feed-bad || echo $R/feed-v2 ) 1.5.11-beta.10 1.5.11-beta.11
echo '{"mode":"none"}' > $R/feed-control.json
J=$R/logs/inst-$CASE.json; bash $R/start.sh $R/copies/app/AutoByteus.app $R/data-app 47921 $J > /dev/null
CP=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1])).result.controlPort' $J); PID=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1])).result.pid' $J); LOG=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1])).result.logPath' $J)
sleep 12; rm -f $E/$CASE-sampler.jsonl; (cd $R/clean && node $E/API-356-sampler.mjs $CP 47921 $E/$CASE-sampler.jsonl 600) & SAMP=$!
echo '{"mode":"good"}' > $R/feed-control.json
if [ "$CASE" = API-12c ]; then
  mark "switch on (V2 refused in the wait expected)"; drive $E/API-356-page-toggle.js; drive $R/p-check.js
  for i in $(seq 1 40); do sleep 3; grep -q "could not prepare" $LOG && break; done; mark "refused"
else
  mark "check (finds V2, switch off)"; drive $R/p-check.js; mark "download V2 by a click (switch off)"; drive $R/p-download.js
  for i in $(seq 1 40); do sleep 3; grep -q "Download completed" $LOG && break; done; sleep ${READY_WAIT:-60}; mark "Squirrel fetched ('Download completed') + ${READY_WAIT:-60} s for its verify (~36 s)"
fi
case "$CASE" in
  API-11) mark "check"; drive $R/p-check.js; mark "switch on"; drive $E/API-356-page-toggle.js ;;
  API-12a) mark "check"; drive $R/p-check.js; mark "download V2 again by a click"; drive $R/p-download.js; mark "switch on"; drive $E/API-356-page-toggle.js ;;
  API-12b|API-12c) bash $R/feed.sh $R/feed-v3 1.5.11-beta.10 1.5.11-beta.12; echo '{"mode":"good"}' > $R/feed-control.json; mark "check (feed offers V3)"; drive $R/p-check.js
    [ "$CASE" = API-12b ] && { mark "switch on"; drive $E/API-356-page-toggle.js; } ;;
esac
for i in $(seq 1 ${WAIT_TICKS:-100}); do sleep 6; kill -0 $PID 2>/dev/null || break; done; mark "old process alive: $(kill -0 $PID 2>/dev/null && echo yes || echo no)"
for i in $(seq 1 30); do sleep 3; curl -s -m 2 -o /dev/null -w '%{http_code}' http://127.0.0.1:47921/rest/health | grep -q 200 && break; done; sleep 20; kill $SAMP 2>/dev/null
cp $LOG $E/$CASE-v1-instance.log; [ -f $R/data-app/logs/app.log ] && cp $R/data-app/logs/app.log $E/$CASE-relaunched-app.log
echo "bundle=$(plutil -extract CFBundleShortVersionString raw $R/copies/app/AutoByteus.app/Contents/Info.plist) health=$(curl -s -m 2 -o /dev/null -w '%{http_code}' http://127.0.0.1:47921/rest/health)"
echo "native fetches ('/ requested'): $(grep -c '/ requested' $LOG); Squirrel 'Download completed': $(grep -c 'Download completed' $LOG)"
echo "record: $(tr -d ' \n' < $R/data-app/electron/user-data/app-update-notification.json)"
