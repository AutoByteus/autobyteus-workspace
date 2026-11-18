#!/bin/bash
# Established TCP sockets to 127.0.0.1:5900 (Xvnc) inside the node: one per open node-desktop stream (server side).
docker exec abx405-api-node cat /proc/net/tcp /proc/net/tcp6 | awk 'NR>1 && $4=="01" && $3 ~ /:170C$/' | wc -l | tr -d ' '
