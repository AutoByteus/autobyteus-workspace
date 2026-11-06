#!/bin/bash
# autobyteus-407 AC-012: revoke the emulator phone while its Control stream is open; time the close.
B=$(cat /private/tmp/abx-407/backend-port)
DEV=$1
C=abx407-phone-node
LOG=/var/log/supervisor/autobyteus_server.log
before=$(docker exec $C grep -c '\[node-desktop\] stream ended' $LOG)
echo "streams ended before: $before; upstream rows: $(docker exec $C sh -c 'ss -tn | grep -c ":5900 "')"
t0=$(python3 -c 'import time;print(time.time())')
echo "revoke: HTTP $(curl -s -o /dev/null -w '%{http_code}' -X DELETE http://127.0.0.1:$B/rest/remote-access/devices/$DEV)"
for i in $(seq 1 45); do
  n=$(docker exec $C grep -c '\[node-desktop\] stream ended' $LOG)
  if [ "$n" -gt "$before" ]; then
    t1=$(python3 -c 'import time;print(time.time())')
    python3 -c "print('closed after %.1f s' % ($t1 - $t0))"
    docker exec $C grep '\[node-desktop\] stream ended' $LOG | tail -1
    break
  fi
  sleep 1
done
sleep 2
echo "upstream rows after: $(docker exec $C sh -c 'ss -tn | grep -c ":5900 "')"
