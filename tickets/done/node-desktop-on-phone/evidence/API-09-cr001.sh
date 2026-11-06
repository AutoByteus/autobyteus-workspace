#!/bin/bash
# autobyteus-407 API/E2E CR-001 on the emulator: the first availability request fails, then the node answers again.
# Precondition: the app was just started with the node reachable (page at Home, no availability asked yet).
B=/private/tmp/abx407-api
A=~/Library/Android/sdk/platform-tools/adb
C="node $B/probes/cdp407.mjs 9407"
nd() { grep -c '"/rest/node-desktop"' $B/node-access.jsonl; }
inj() { grep -c 'injected-502' $B/node-access.jsonl; }
launch() {
  $C click '[data-testid="mobile-new-run-button"]' >/dev/null; sleep 2
  $C click '[data-testid="mobile-run-model-select-toggle"]' >/dev/null; sleep 1.5
  $C eval "(async()=>{ const i=document.querySelector('[data-testid=mobile-run-model-select-search]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'qwen3-max'); i.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,800)); return 1; })()" >/dev/null
  $C click '[data-testid="mobile-run-model-select-option"]' >/dev/null; sleep 1
  $C click '[data-testid="mobile-run-launch"]' >/dev/null; sleep 6
}
menu() {
  $C click '[data-testid="mobile-run-menu-button"]' >/dev/null; sleep 1.5
  $C eval "JSON.stringify({opened: !!document.querySelector('[data-testid=mobile-run-menu-files]'), entries: [...document.querySelectorAll('[data-testid^=mobile-run-menu-]')].map(e=>(e.innerText||'').trim()).filter(Boolean)})"
}
closemenu() { $C click '[data-testid="mobile-run-menu-button"]' >/dev/null 2>&1; sleep 1; }
echo "(1) fresh page: $($C eval "location.pathname + location.search") node-desktop requests so far=$(nd) injected=$(inj)"
touch $B/fail-node-desktop
echo "(2) fault on: GET /rest/node-desktop via proxy -> $(curl -s -m 3 -o /dev/null -w '%{http_code}' http://127.0.0.1:56466/rest/node-desktop) (this curl is counted too)"
launch
echo "    first run screen: $($C eval "location.search") node-desktop requests=$(nd) injected=$(inj)"
echo "    menu: $(menu)"; $A exec-out screencap -p > $B/API-09-1-error-menu.png; closemenu
rm -f $B/fail-node-desktop
echo "(3) fault off: GET /rest/node-desktop via proxy -> $(curl -s -m 3 http://127.0.0.1:56466/rest/node-desktop)"
$C click '[data-testid="mobile-run-back"]' >/dev/null; sleep 2
launch
echo "    next run screen: $($C eval "location.search") node-desktop requests=$(nd) injected=$(inj) pid=$($A shell pidof org.autobyteus.mobile | tr -d '\r')"
echo "    menu: $(menu)"; $A exec-out screencap -p > $B/API-09-2-back-menu.png
echo "node-desktop lines of the proxy log (this case):"; grep -E 'node-desktop|injected' $B/node-access.jsonl | tail -5
