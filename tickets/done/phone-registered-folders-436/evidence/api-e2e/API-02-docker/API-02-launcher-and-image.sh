#!/bin/bash
# API-02 (autobyteus-436): a test-owned Docker node running this branch's server, made by this branch's launcher with a
# temp state and shared folder; then the phone probe (api02-phone.mjs). The docker CLI is the guarded wrapper.
set -u
W=/Users/normy/autobyteus_org/autobyteus-worktrees/phone-registered-folders-436; E=$W/tickets/in-progress/phone-registered-folders-436/evidence/api-e2e/API-02-docker; mkdir -p $E
export PATH=/tmp/abtest436/bin:$PATH AUTOBYTEUS_DOCKER_STATE_DIR=/tmp/abtest436/docker-state AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR=/tmp/abtest436/shared-host AUTOBYTEUS_DOCKER_INSTALL_DIR=/tmp/abtest436/docker-install
L=$E/API-02-launcher.log; red() { sed -E 's/(Setup code for [^:]+: )[A-Za-z0-9_-]+/\1<redacted>/'; }
{
echo "# API-02 Docker node for AC-005; commit $(git -C $W rev-parse --short HEAD); $(date -u +%FT%TZ)"
echo "## server package (docker buildx --target server-package, Dockerfile without its '# syntax' line) and the test image"
sed '1{/^# syntax/d;}' $W/autobyteus-server-ts/docker/Dockerfile.monorepo > /tmp/abtest436/Dockerfile.nosyntax
rm -rf /tmp/abtest436/ctx; mkdir -p /tmp/abtest436/ctx
(cd $W && docker buildx build --builder desktop-linux --platform linux/arm64 --progress plain -f /tmp/abtest436/Dockerfile.nosyntax --target server-package --output type=local,dest=/tmp/abtest436/ctx/server-package . > /tmp/abtest436/buildx.log 2>&1); echo "buildx exit $?"; tail -2 /tmp/abtest436/buildx.log
printf 'FROM autobyteus/autobyteus-server:beta\nRUN rm -rf /opt/autobyteus/server-package\nCOPY server-package /opt/autobyteus/server-package\n' > /tmp/abtest436/ctx/Dockerfile
docker build -q -t abtest436/autobyteus-server:test /tmp/abtest436/ctx | tail -1
ls /tmp/abtest436/ctx/server-package/dist/node-files/ 2>&1 | head -3
echo "## this branch's launcher: new-container (temp state, temp shared folder)"
bash $W/scripts/public/docker/autobyteus-docker.sh new-container --image abtest436/autobyteus-server --tag test > /tmp/abtest436/new-container.txt 2>&1; echo "new-container exit $?"; red < /tmp/abtest436/new-container.txt | tail -6
N=$(ls $AUTOBYTEUS_DOCKER_STATE_DIR/nodes | head -1 | sed 's/\.env$//'); eval "$(grep -E '^(BACKEND_PORT|CONTAINER_NAME)=' $AUTOBYTEUS_DOCKER_STATE_DIR/nodes/$N.env)"
echo "node $N container $CONTAINER_NAME port $BACKEND_PORT published: $(docker port $CONTAINER_NAME 8000 | tr '\n' ' ')"
echo "mounts: $(docker inspect $CONTAINER_NAME --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}; {{end}}' | tr ';' '\n' | grep -E 'shared' | tr '\n' ' ')"
for i in $(seq 1 120); do curl -s -m 2 -o /dev/null http://127.0.0.1:$BACKEND_PORT/rest/health && break; sleep 2; done
python3 /tmp/abtest436/make-files.py $AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR/shared
docker exec $CONTAINER_NAME ls -la /home/autobyteus/shared
echo "$N $CONTAINER_NAME $BACKEND_PORT" > /tmp/abtest436/node.txt
} > $L 2>&1
cd $W/autobyteus-web && node /tmp/abtest436/api02-phone.mjs $(cut -d' ' -f3 /tmp/abtest436/node.txt) /tmp/abtest436/new-container.txt $E > $E/API-02-phone-run.log 2>&1; echo "phone probe exit $?" >> $L
echo DONE > /tmp/abtest436/api02.done
