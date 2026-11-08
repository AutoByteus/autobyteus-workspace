#!/bin/bash
# autobyteus-432: one line of the viewer's state, page side (CDP) and Android side (dumpsys). No URLs with secrets.
A=$HOME/Library/Android/sdk/platform-tools/adb
DIR=$(cd "$(dirname "$0")" && pwd)
LABEL=${1:-state}
rotation=$($A shell dumpsys window displays | grep -oE 'mDisplayRotation=ROTATION_[0-9]+' | head -1 | sed 's/mDisplayRotation=//')
requested=$($A shell dumpsys activity activities | awk '/ActivityRecord\{.*org\.autobyteus\.mobile\/\.MainActivity/{found=1} found && /requestedOrientation=/{sub(/.*requestedOrientation=/,""); print; exit}')
status=$($A shell dumpsys window | grep -m1 -oE 'InsetsSource id=[0-9a-f]+ type=statusBars frame=[^ ]+ visible=[a-z]+' | grep -oE 'visible=[a-z]+')
nav=$($A shell dumpsys window | grep -m1 -oE 'InsetsSource id=[0-9a-f]+ type=navigationBars frame=[^ ]+ visible=[a-z]+' | grep -oE 'visible=[a-z]+')
page=$(node "$DIR/cdp-eval.mjs" 9432 'JSON.stringify({q:location.search.includes("pairing=")?"(pairing)":location.search,status:document.querySelector("[data-testid=mobile-node-desktop-status]")?.textContent.trim()??null,bar:!!document.querySelector("[data-testid=mobile-screen-bar]"),handle:!!document.querySelector("[data-testid=mobile-node-desktop-handle]"),viewport:[innerWidth,innerHeight],canvas:(r=>r?[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]:null)(document.querySelector("[data-testid=mobile-node-desktop-stage] canvas")?.getBoundingClientRect()),picture:document.querySelector("[data-testid=mobile-node-desktop-picture]")?.style.transform??null})' 2>/dev/null)
echo "$LABEL | rotation=$rotation requested=$requested statusBar:$status navBar:$nav | page=$page"
