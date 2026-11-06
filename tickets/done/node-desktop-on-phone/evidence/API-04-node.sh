#!/bin/bash
# autobyteus-407 API/E2E node-side truth for abx407-api-node.
# node.sh up        -> established TCP sockets to Xvnc :5900 (one per open stream, server side)
# node.sh mouse     -> pointer location
# node.sh dims      -> desktop size
# node.sh log [n]   -> last n [node-desktop] lines of the server log
C=abx407-api-node
case "$1" in
  up) docker exec $C cat /proc/net/tcp /proc/net/tcp6 | awk 'NR>1 && $4=="01" && $3 ~ /:170C$/' | wc -l | tr -d ' ' ;;
  mouse) docker exec --user vncuser -e DISPLAY=:99 $C xdotool getmouselocation | cut -d' ' -f1-2 ;;
  dims) docker exec --user vncuser -e DISPLAY=:99 $C xdpyinfo | grep -o 'dimensions: *[0-9x]*' ;;
  log) docker exec $C sh -c "grep -h '\[node-desktop\]' /var/log/supervisor/autobyteus_server.log 2>/dev/null; true" | tail -n "${2:-5}" ;;
esac
