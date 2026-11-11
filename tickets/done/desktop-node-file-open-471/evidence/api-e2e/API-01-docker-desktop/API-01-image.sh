#!/bin/bash
# API-01 (autobyteus-471): the test image = autobyteus/autobyteus-server:beta with this worktree's server package
# (TESTING.md, Docker server nodes). The Dockerfile's '# syntax' line is dropped: its Docker Hub pull stalls here (as 436).
set -u
W=/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-node-file-open-471
export PATH=/tmp/abtest471/bin:$PATH
echo "# API-01 test image; commit $(git -C $W rev-parse --short HEAD); $(date -u +%FT%TZ)"
sed '1{/^# syntax/d;}' $W/autobyteus-server-ts/docker/Dockerfile.monorepo > /tmp/abtest471/Dockerfile.nosyntax
rm -rf /tmp/abtest471/ctx; mkdir -p /tmp/abtest471/ctx
(cd $W && docker buildx build --builder desktop-linux --platform linux/arm64 --progress plain -f /tmp/abtest471/Dockerfile.nosyntax --target server-package --output type=local,dest=/tmp/abtest471/ctx/server-package . > /tmp/abtest471/buildx.log 2>&1); echo "buildx exit $?"; tail -2 /tmp/abtest471/buildx.log
printf 'FROM autobyteus/autobyteus-server:beta\nRUN rm -rf /opt/autobyteus/server-package\nCOPY server-package /opt/autobyteus/server-package\n' > /tmp/abtest471/ctx/Dockerfile
docker build -q -t abtest471/autobyteus-server:test /tmp/abtest471/ctx | tail -1
echo "server package node-files route: $(ls /tmp/abtest471/ctx/server-package/dist/node-files/ 2>&1 | tr '\n' ' ')"
echo "package version: $(python3 -c 'import json;print(json.load(open("/tmp/abtest471/ctx/server-package/package.json"))["version"])' 2>&1)"
