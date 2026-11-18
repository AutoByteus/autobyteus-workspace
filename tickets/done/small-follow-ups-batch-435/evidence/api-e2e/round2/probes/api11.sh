#!/bin/bash
# autobyteus-435 API/E2E API-11 (AC-008-1): a pairing link whose node does not answer at the first load (the test proxy
# in front of the node is stopped: connection refused), the node back (proxy pass), Retry on the overlay: the pairing
# page opens and pairs with the same code. Then, paired: the path down again, back, Retry loads the node's page.
# Portrait throughout (uiautomator allowed). The pairing link and code are never printed.
. /private/tmp/abx435-api2/probes/env.sh; . /private/tmp/abx435-api2/probes/node-rest.sh; . /private/tmp/abx435-api2/probes/ui.sh
Q=$(cut -d' ' -f1 $B/proxy-ports)
echo "# API-11; $(date -u +%FT%TZ); emulator-5600 abx435r2_api35 Android 15; APK of b5da2d15a0 (worktree); node abx435r2-api-node behind test proxy 10.0.2.2:$Q"
$A shell pm clear org.autobyteus.mobile >/dev/null; echo "app data cleared"
pmode stopped
pairlink "http://10.0.2.2:$Q" "abx435 Proxy Node"
DEV_BEFORE=$(nrest GET /remote-access/devices | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const b=JSON.parse(s);console.log((b.devices??b).length)}catch{console.log("?")}})')
echo "paired phone devices on the node before: $DEV_BEFORE"
launch; sleep 4; share; sleep 10
echo "R1 overlay (node not answering): $(uitexts)"
$A exec-out screencap -p > $B/API-11-1-first-load-unreachable.png
pmode pass; sleep 2
uitap Retry || uitap RETRY; sleep 6
fwd >/dev/null
echo "R2 after Retry: page=$($EV 'JSON.stringify({pairing:location.search.includes("pairing="),path:location.pathname,pairButton:!!document.querySelector("[data-testid=mobile-pair-button]"),text:document.body.innerText.slice(0,160)})')"
$A exec-out screencap -p > $B/API-11-2-after-retry-pairing-page.png
$EV 'document.querySelector("[data-testid=mobile-pair-button]")?.click(), 1' >/dev/null
for i in $(seq 1 30); do R=$($EV '!!document.querySelector("[data-testid=mobile-node-switcher], [data-testid=mobile-run-list], [data-testid=mobile-run-tree]") || document.body.innerText.includes("No runs yet") || document.body.innerText.includes("Connected")'); [ "$R" = "true" ] && break; sleep 1; done
echo "R3 paired: page=$($EV 'JSON.stringify({q:location.search.includes("pairing=")?"(pairing)":location.search,connected:document.body.innerText.includes("Connected"),node:document.body.innerText.includes("abx435 Proxy Node")})')"
DEV_AFTER=$(nrest GET /remote-access/devices | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const b=JSON.parse(s);console.log((b.devices??b).length)}catch{console.log("?")}})')
echo "paired phone devices on the node after: $DEV_AFTER"
$A exec-out screencap -p > $B/API-11-3-paired.png
echo "## after pairing: Retry loads the node's page"
pmode stopped; sleep 1
$A shell am force-stop org.autobyteus.mobile; launch; sleep 10
echo "R4 overlay (saved node, not answering): $(uitexts)"
pmode pass; sleep 2
uitap Retry || uitap RETRY; sleep 8
fwd >/dev/null
echo "R5 after Retry: page=$($EV 'JSON.stringify({q:location.search.includes("pairing=")?"(pairing)":location.search,path:location.pathname,connected:document.body.innerText.includes("Connected"),pairButton:!!document.querySelector("[data-testid=mobile-pair-button]")})')"
