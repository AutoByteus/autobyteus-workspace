# autobyteus-435 API/E2E device helpers: only the ticket's own emulator (emulator-5600) and DevTools port 9435.
export ANDROID_SERIAL=emulator-5600
A="$HOME/Library/Android/sdk/platform-tools/adb -s emulator-5600"
B=/private/tmp/abx435-api2
EV="node $B/probes/cdp-eval.mjs 9435"
fwd() { for i in $(seq 1 30); do P=$($A shell pidof org.autobyteus.mobile | tr -d '\r'); if [ -n "$P" ]; then $A forward --remove tcp:9435 >/dev/null 2>&1; $A forward tcp:9435 localabstract:webview_devtools_remote_$P >/dev/null 2>&1 && $EV '1' >/dev/null 2>&1 && return 0; fi; sleep 1; done; return 1; }
android() {
  rot=$($A shell dumpsys window displays | grep -oE 'mDisplayRotation=ROTATION_[0-9]+' | head -1 | sed 's/mDisplayRotation=//')
  req=$($A shell dumpsys activity activities | awk '/ActivityRecord\{.*org\.autobyteus\.mobile\/\.MainActivity/{f=1} f && /requestedOrientation=/{sub(/.*requestedOrientation=/,""); print; exit}')
  bars=$($A shell dumpsys window | grep -m2 -oE 'type=(statusBars|navigationBars) frame=[^ ]+ visible=[a-z]+' | grep -oE 'visible=[a-z]+' | tr '\n' ' ')
  echo "$1 | $rot requested=$req bars: $bars pid=$($A shell pidof org.autobyteus.mobile | tr -d '\r')"
}
# One line of page state: query (pairing hidden), screens, viewport vs screen, canvas and picture.
page() { $EV 'JSON.stringify({q:location.search.includes("pairing=")?"(pairing)":location.search,status:document.querySelector("[data-testid=mobile-node-desktop-status]")?.textContent.trim()??null,runScreen:document.querySelector("[data-testid=mobile-run-screen]")?.getAttribute("data-state")??null,runName:document.querySelector("[data-testid=mobile-run-name]")?.textContent.trim()??null,opening:!!document.querySelector("[data-testid=mobile-run-opening]"),list:!!document.querySelector("[data-testid=mobile-run-tree]")?.offsetParent,activity:!!document.querySelector("[data-testid=mobile-activity]"),viewer:!!document.querySelector("[data-testid=mobile-node-desktop-stage]"),handle:!!document.querySelector("[data-testid=mobile-node-desktop-handle]"),viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,screen:[screen.width,screen.height],canvas:(r=>r?[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]:null)(document.querySelector("[data-testid=mobile-node-desktop-stage] canvas")?.getBoundingClientRect()),stage:(r=>r?[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]:null)(document.querySelector("[data-testid=mobile-node-desktop-stage]")?.getBoundingClientRect()),picture:document.querySelector("[data-testid=mobile-node-desktop-picture]")?.style.transform??null})'; }
state() { echo "$(android "$1") | page=$(page)"; }
# Real tap (adb input tap) on the centre of an element; the WebView fills the screen in full screen (origin 0,0).
tapid() { XY=$($EV "(r=>r&&r.width?Math.round((r.x+r.width/2)*devicePixelRatio)+' '+Math.round((r.y+r.height/2)*devicePixelRatio):'none')(document.querySelector('[data-testid=$1]')?.getBoundingClientRect())" | tr -d '"'); [ "$XY" = "none" ] && { echo "not found or hidden: $1"; return 1; }; $A shell input tap $XY; echo "tapped $1 at device $XY"; }
launch() { $A shell am start -n org.autobyteus.mobile/.MainActivity -a android.intent.action.MAIN -c android.intent.category.LAUNCHER >/dev/null 2>&1; }
shotto() { $A exec-out screencap -p > "$1"; }
