#!/bin/bash
# autobyteus-458 API/E2E round 2 (temporary): API-03, a live Org member's stop in the app's Settings (CR-001).
# Usage: r2-org-stop.sh <member address> <message> <row pattern> <label>
#   wakes the member (a message from another client), opens it in the app (the list row matching <row pattern>), ⋮ → Settings,
#   one real tap on the stop icon; then the node, the URL, Settings (rows open), a change and Save, and ← to the conversation.
DIR=$(cd "$(dirname "$0")" && pwd); export JOURNEY_DIR=r2-android; S="$DIR/step.sh"
ADDR=$1; MSG=$2; ROW=$3; L=$4
OR=$(node -pe "require('/tmp/abtest458/runs.json').org")
MID=$(node -pe "require('/tmp/abtest458/runs.json').orgMembers.find(m => m.address === '$ADDR').agentRunId")
J='const j=JSON.parse(require("fs").readFileSync(0));'
if [ "$MSG" != "-" ]; then "$S" API-03 api say-org "$OR" "$MID" "$MSG" > /dev/null; fi
n=0; until "$S" API-03 api org "$OR" | grep -q '"isActive": true' || [ $n -ge 60 ]; do n=$((n+1)); sleep 1; done; sleep 4
echo "org active before: $("$S" API-03 api org "$OR" | grep -o "\"isActive\": [a-z]*")"
# ROW "-": the member's conversation is already open in the app.
if [ "$ROW" != "-" ]; then
  while node "$DIR/ph.mjs" state | grep -q 'screen='; do "$S" API-03 ph back > /dev/null; sleep 1; done
  "$S" API-03 ph row "$ROW" | node -e "$J console.log('opened', j.tapped, j.after.url, j.after.runScreen)"
fi
"$S" API-03 ph tap mobile-run-menu-button > /dev/null
"$S" API-03 ph tap mobile-run-menu-settings > /dev/null; sleep 3
"$S" API-03 ph state | node -e "$J console.log('live', j.url, JSON.stringify(j.settings))"
"$S" API-03 ph shot "r2-API-03-$L-1-live" > /dev/null
"$S" API-03 ph toastrec > /dev/null
"$S" API-03 ph tap mobile-run-settings-stop > /dev/null
n=0; until "$S" API-03 api org "$OR" | grep -q '"isActive": false' || [ $n -ge 90 ]; do n=$((n+1)); sleep 1; done; sleep 4
echo "org after the tap ($n s): $("$S" API-03 api org "$OR" | grep -o "\"isActive\": [a-z]*")"
"$S" API-03 ph state | node -e "$J console.log('after stop', j.url, JSON.stringify(j.settings), 'toasts', JSON.stringify(j.toastLog))"
"$S" API-03 ph shot "r2-API-03-$L-2-after-stop" > /dev/null
"$S" API-03 ph tap mobile-run-runtime-select-toggle > /dev/null
"$S" API-03 ph option runtime "Grok" > /dev/null
"$S" API-03 ph tap mobile-run-model-select-toggle > /dev/null
"$S" API-03 ph option model "grok" | node -e "$J console.log('changed', JSON.stringify(j.after.settings))"
"$S" API-03 ph tap mobile-run-settings-save | node -e "$J console.log('saved', j.after.url, j.after.runScreen, 'settings', JSON.stringify(j.after.settings), 'statusLine', j.after.statusLine, 'composer', JSON.stringify(j.after.conversation && { gap: j.after.conversation.composerGap, last: j.after.conversation.lastText }))"
"$S" API-03 ph shot "r2-API-03-$L-3-saved-conversation" > /dev/null
"$S" API-03 api org "$OR" | node -e "$J console.log('node', JSON.stringify(j))"
