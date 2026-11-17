#!/bin/bash
# autobyteus-458 API/E2E round 2 (temporary): a Delivery Org run on the node, its ids in /tmp/abtest458/runs.json, then the
# Phone Access pairing link shared into the app (ACTION_SEND; the link is never printed).
DIR=$(cd "$(dirname "$0")" && pwd); export JOURNEY_DIR=r2-android
ADB=$HOME/Library/Android/sdk/platform-tools/adb
"$DIR/step.sh" SETUP api new-org > /tmp/abtest458/org.json
node -e "const o=JSON.parse(require('fs').readFileSync('/tmp/abtest458/org.json','utf8')); require('fs').writeFileSync('/tmp/abtest458/runs.json', JSON.stringify({ org: o.agentOrgRunId, orgMembers: o.members })); console.log(JSON.stringify({ org: o.agentOrgRunId, members: o.members.map(m => m.address) }))"
LINK=$(cat /tmp/abtest458/pairing-link.txt)
"$ADB" -s emulator-5640 shell am start -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT "'$LINK'" -n org.autobyteus.mobile/.MainActivity > /dev/null 2>&1
echo "pairing link shared"
until "$ADB" -s emulator-5640 shell cat /proc/net/unix | grep -q webview_devtools_remote; do sleep 2; done
echo "webview up"
