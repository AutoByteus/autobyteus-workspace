#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../../../.." && pwd)"
launcher="$repo_root/scripts/public/docker/autobyteus-docker.sh"
suffix="$(python3 -c 'import uuid; print(uuid.uuid4().hex[:10])')"
target="codex-api-e2e-target-${suffix}"
holder="codex-api-e2e-holder-${suffix}"
volume="codex-api-e2e-volume-${suffix}"
node="autobyteus-server-e2e-${suffix}"
root="$(mktemp -d "${TMPDIR:-/tmp}/autobyteus-real-docker-e2e.XXXXXX")"
state_root="$root/state"
shared_root="$root/shared"

cleanup() {
  set +e
  docker rm -f "$target" "$holder" >/dev/null 2>&1
  docker volume rm "$volume" >/dev/null 2>&1
  rm -rf "$root"
}
trap cleanup EXIT INT TERM

docker info >/dev/null
docker volume create "$volume" >/dev/null
docker create --name "$holder" --mount "source=$volume,target=/data" autobyteus/autobyteus-server:latest >/dev/null
docker create \
  --name "$target" \
  --label com.autobyteus.launcher=server-docker \
  --label "com.autobyteus.nodeName=$node" \
  --mount "source=$volume,target=/data" \
  autobyteus/autobyteus-server:latest >/dev/null

mkdir -p "$state_root/nodes"
cat > "$state_root/nodes/$node.env" <<STATE
NODE_NAME=$node
CONTAINER_NAME=$target
BACKEND_PORT=38101
VNC_PORT=38102
NOVNC_PORT=38103
DEBUG_PORT=38104
IMAGE_REF=autobyteus/autobyteus-server:latest
CREATED_AT=2026-07-13T00:00:00Z
CONFIG_HASH=real-docker-e2e
STATE

docker inspect --format '{{ index .Config.Labels "com.autobyteus.launcher" }} {{ index .Config.Labels "com.autobyteus.nodeName" }}' "$target"
echo "before_target_exists=$(docker container inspect "$target" >/dev/null 2>&1; echo $?)"
AUTOBYTEUS_DOCKER_STATE_DIR="$state_root" \
AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR="$shared_root" \
  "$launcher" destroy --name "$node"
echo "after_target_exists=$(docker container inspect "$target" >/dev/null 2>&1; echo $?)"
echo "state_exists=$(test -e "$state_root/nodes/$node.env"; echo $?)"
echo "volume_exists=$(docker volume inspect "$volume" >/dev/null 2>&1; echo $?)"
echo "holder_exists=$(docker container inspect "$holder" >/dev/null 2>&1; echo $?)"
status_output="$(AUTOBYTEUS_DOCKER_STATE_DIR="$state_root" AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR="$shared_root" "$launcher" status)"
printf '%s\n' "$status_output"

test ! -e "$state_root/nodes/$node.env"
! docker container inspect "$target" >/dev/null 2>&1
docker volume inspect "$volume" >/dev/null
docker container inspect "$holder" >/dev/null
if printf '%s\n' "$status_output" | grep -Fq "$node"; then
  echo "target node still appears in status" >&2
  exit 1
fi
