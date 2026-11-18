#!/bin/bash
# autobyteus-407 API/E2E AC-012 on the emulator. Usage: ac012.sh off|revoke
# off:    the owner turns Phone Access off while the phone streams (PUT /rest/remote-access/settings), then on again
# revoke: the owner revokes the paired phone (DELETE /rest/remote-access/devices/:id)
B=/private/tmp/abx407-api
A=~/Library/Android/sdk/platform-tools/adb
C="node $B/probes/cdp407.mjs 9407"
N=$B/probes/node.sh
NODE=http://127.0.0.1:56465
st() { $C eval "document.querySelector('[data-testid=mobile-node-desktop-status]')?.innerText"; }
now() { python3 -c 'import time;print(time.time())'; }
since() { python3 -c "import time;print(round(time.time()-$1,1))"; }
reopen() {
  $B/probes/tapsel.sh '[data-testid="mobile-screen-bar"] button' >/dev/null 2>&1; sleep 2
  $C click '[data-testid="mobile-run-menu-button"]' >/dev/null 2>&1; sleep 1
  $B/probes/tapsel.sh '[data-testid="mobile-run-menu-desktop"]' >/dev/null 2>&1; sleep 5
}
echo "before: status=$(st) up=$($N up)"
T0=$(now)
if [ "$1" = "off" ]; then
  echo "owner: Phone Access off -> $(curl -s -X PUT -H 'content-type: application/json' -d '{"phoneAccessEnabled":false}' $NODE/rest/remote-access/settings | head -c 90)"
else
  DEV=$(curl -s $NODE/rest/remote-access/devices | python3 -c 'import sys,json; d=json.load(sys.stdin); ds=d.get("devices", d) if isinstance(d, dict) else d; print(max(ds, key=lambda x: x.get("lastSeenAt") or "")["deviceId"])')
  echo "owner: revoke the emulator's device ($DEV) -> HTTP $(curl -s -o /dev/null -w '%{http_code}' -X DELETE $NODE/rest/remote-access/devices/$DEV)"
fi
for i in $(seq 1 35); do
  sleep 1; S=$(st); U=$($N up)
  echo "  +$(since $T0)s status=$S up=$U"
  if [ "$U" = "0" ] && echo "$S" | grep -q -i "not allowed"; then break; fi
done
echo "node log: $($N log 1)"
$A exec-out screencap -p > $B/API-07-$1-not-allowed.png
echo "## reopen the view"
reopen
echo "reopened: status=$(st) up=$($N up) page=$($C eval location.search)"
if [ "$1" = "off" ]; then
  echo "## owner: Phone Access on again -> $(curl -s -X PUT -H 'content-type: application/json' -d '{"phoneAccessEnabled":true}' $NODE/rest/remote-access/settings | head -c 90)"
  reopen
  echo "reopened after on: status=$(st) up=$($N up)"
fi
