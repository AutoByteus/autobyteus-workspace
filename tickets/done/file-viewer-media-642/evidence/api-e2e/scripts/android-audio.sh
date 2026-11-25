#!/bin/bash
# Temporary (642): open an audio file by a step; time from just before the tap to the system's audio track "started";
# then the node's requests. Usage: android-audio.sh <label> <step...>
S=emulator-5646; L=$1; shift
CP=$(node -e 'console.log(JSON.parse(require("fs").readFileSync("/tmp/api642/stack-android/stack-info.json")).controlPort)')
T=$(node -e 'console.log(Date.now())')
node /tmp/api642/scripts/android-step.mjs "$@" > /dev/null &
for i in $(seq 1 100); do adb -s $S shell dumpsys audio | grep -q "u/pid:[0-9]*/[0-9]* state:started" && break; sleep 0.1; done
P=$(node -e 'console.log(Date.now())'); wait
echo "$L: tap → audio started $((P - T)) ms (host clock, includes the CDP tap and the poll)"
sleep 3; adb -s $S exec-out screencap -p > /tmp/api642/results/android/$L.png
curl -s "http://127.0.0.1:$CP/log?since=$T" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{for(const e of JSON.parse(s).filter(e=>/content\?path|references/.test(e.path)))console.log(" ",e.path.replace(/.*path=/,"").slice(0,30),e.range,e.status,e.bytes,e.ms+"ms",e.credential,e.urlCredential?"URLCRED":"")})'
