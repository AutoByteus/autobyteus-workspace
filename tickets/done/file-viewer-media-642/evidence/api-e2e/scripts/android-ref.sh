#!/bin/bash
# Temporary (642): tap a reference (or another step) and report players, a screenshot and the node's requests since the tap.
# Usage: android-ref.sh <label> <step...>
S=emulator-5646; L=$1; shift; mkdir -p /tmp/api642/results/android
CP=$(node -e 'console.log(JSON.parse(require("fs").readFileSync("/tmp/api642/stack-android/stack-info.json")).controlPort)')
T=$(node -e 'console.log(Date.now())')
node /tmp/api642/scripts/android-step.mjs "$@" | tail -1
sleep ${WAIT:-6}
echo "players=$(adb -s $S shell dumpsys activity activities | grep -c 'Hist .*MediaPlayerActivity')"
adb -s $S exec-out screencap -p > /tmp/api642/results/android/$L.png
curl -s "http://127.0.0.1:$CP/log?since=$T" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{for(const e of JSON.parse(s).filter(e=>/references|content\?path|\/rest\/files/.test(e.path)))console.log(e.method,e.path.replace(/.*\/(messages|workspaces)\//,"…/").replace(/[0-9a-f]{64}/,"<ref>").slice(0,90),e.range,e.status,e.bytes,e.credential,e.urlCredential?"URLCRED":"",e.aborted?"aborted":"")})'
