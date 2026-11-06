#!/bin/bash
# autobyteus-405 API-04/05/08/09 test node (TESTING.md "Docker server nodes"):
# image autobyteus/autobyteus-server:beta (9c5aa01bb2fc), this commit's fresh-clone server package mounted
# read-only over /opt/autobyteus/server-package, fresh test-owned volumes, the launcher's run arguments,
# backend published on the Mac's LAN address only (AC-002: reachable only by that backend URL).
LAN=192.168.2.158
PORT=62053
B=/private/tmp/abx405-api
exec docker run -d --name abx405-api-node \
  --label com.autobyteus.api-e2e-owner=abx405-api \
  -e AUTOBYTEUS_DATA_DIR=/home/autobyteus/data -e AUTOBYTEUS_BIND_HOST=0.0.0.0 -e AUTOBYTEUS_SERVER_PORT=8000 \
  -e AUTOBYTEUS_SERVER_HOST=http://$LAN:$PORT -e APP_ENV=production -e DB_TYPE=sqlite -e LOG_LEVEL=INFO \
  -e AUTOBYTEUS_TEMP_WORKSPACE_DIR=/home/autobyteus/workspace \
  -v abx405-api-node-workspace:/app/autobyteus-server-ts/workspace \
  -v abx405-api-node-data:/home/autobyteus/data \
  -v abx405-api-node-root-home:/root \
  -v abx405-api-node-chromium-profile:/home/vncuser/.config/chromium \
  -v abx405-api-node-server-packages:/home/autobyteus/server-packages \
  --mount type=bind,source=$B/server-package,target=/opt/autobyteus/server-package,readonly \
  --mount type=bind,source=$B/node/workspace,target=/home/autobyteus/workspace \
  --mount type=bind,source=$B/node/shared,target=/home/autobyteus/shared \
  --cap-add SYS_ADMIN --security-opt seccomp=unconfined \
  -p $LAN:$PORT:8000 \
  9c5aa01bb2fc
