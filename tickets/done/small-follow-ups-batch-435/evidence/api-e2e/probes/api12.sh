#!/bin/bash
# autobyteus-435 API/E2E API-12 (AC-007-1): the saved node's page answers HTTP 502 for its page (the test proxy in front of it answers 502 only for GET /mobile; the status check passes).
. /private/tmp/abx435-api/probes/env.sh; . /private/tmp/abx435-api/probes/ui.sh
echo "# API-12; $(date -u +%FT%TZ); emulator-5600; APK of d37397b40d; saved node 'abx435 Proxy Node' at 10.0.2.2:63826 (test proxy)"
pmode 502page
$A shell am force-stop org.autobyteus.mobile; launch; sleep 10
T=$(uitexts)
echo "O1 overlay: $T"
F=$(echo "$T" | grep -o -iE 'HTTP|URL|/mobile|10\.0\.2\.2|63826|AutoByteus returned' | sort -u | tr '\n' ' ')
echo "forbidden words present: [$F]"
$A exec-out screencap -p > $B/API-12-overlay-502.png
pmode pass; uitap Retry; sleep 8; fwd >/dev/null
echo "O2 after Retry with the node answering: $($EV 'JSON.stringify({q:location.search,connected:document.body.innerText.includes("Connected")})')"
