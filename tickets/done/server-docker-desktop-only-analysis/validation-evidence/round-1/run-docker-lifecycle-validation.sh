#!/usr/bin/env bash
set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../.." && pwd)"
EVIDENCE_DIR="${REPO_ROOT}/tickets/done/server-docker-desktop-only-analysis/validation-evidence/round-1"
LAUNCHER="${REPO_ROOT}/scripts/public/docker/autobyteus-docker.sh"
RUN_ID="$(date +%s)-$$"
DIND_NAME="autobyteus-validation-dind-${RUN_ID}"
HOST_ROOT="${EVIDENCE_DIR}/dind-host-${RUN_ID}"
STATE_DIR="${HOST_ROOT}/state"
SHARED_DIR_A="${HOST_ROOT}/shared-workspace-a"
SHARED_DIR_B="${HOST_ROOT}/shared-workspace-b"
OLD_SHARED_DIR="${HOST_ROOT}/old-shared-workspace"
MIGRATED_SHARED_DIR="${HOST_ROOT}/migrated-shared-workspace"
LOG_FILE="${EVIDENCE_DIR}/docker-lifecycle-validation.log"
SUMMARY_FILE="${EVIDENCE_DIR}/docker-lifecycle-summary.md"
INNER_DOCKER_HOST=""

mkdir -p "${EVIDENCE_DIR}" "${HOST_ROOT}"
: > "${LOG_FILE}"
exec > >(tee -a "${LOG_FILE}") 2>&1

step() { printf '\n### %s\n' "$*"; }
pass() { printf 'PASS: %s\n' "$*"; }
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

cleanup() {
  set +e
  if [[ -n "${INNER_DOCKER_HOST}" ]]; then
    env -u DOCKER_CONTEXT DOCKER_HOST="${INNER_DOCKER_HOST}" DOCKER_TLS_VERIFY= DOCKER_CERT_PATH= docker rm -f autobyteus-server-0 autobyteus-server-1 autobyteus-server-2 >/dev/null 2>&1
  fi
  docker rm -f "${DIND_NAME}" >/dev/null 2>&1
}
trap cleanup EXIT

inner_docker() {
  env -u DOCKER_CONTEXT DOCKER_HOST="${INNER_DOCKER_HOST}" DOCKER_TLS_VERIFY= DOCKER_CERT_PATH= DOCKER_CLI_HINTS=false docker "$@"
}

run_launcher_with_shared() {
  local shared_dir="$1"; shift
  env -u DOCKER_CONTEXT \
    DOCKER_HOST="${INNER_DOCKER_HOST}" \
    DOCKER_TLS_VERIFY= \
    DOCKER_CERT_PATH= \
    DOCKER_CLI_HINTS=false \
    AUTOBYTEUS_DOCKER_STATE_DIR="${STATE_DIR}" \
    AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR="${shared_dir}" \
    "${LAUNCHER}" "$@"
}

managed_count() {
  inner_docker ps -a --filter label=com.autobyteus.launcher=server-docker --format '{{.Names}}' | sed '/^$/d' | wc -l | tr -d ' '
}

inspect_container() {
  local name="$1" output="$2"
  inner_docker inspect "$name" > "$output"
}

assert_state_has_no_profile() {
  local state_file="$1"
  [[ -f "${state_file}" ]] || fail "state file missing: ${state_file}"
  if grep -q '^PROFILE=' "${state_file}"; then
    cat "${state_file}"
    fail "state still contains PROFILE=: ${state_file}"
  fi
  if grep -q 'AUTOBYTEUS_NODE_PROFILE' "${state_file}"; then
    cat "${state_file}"
    fail "state contains AUTOBYTEUS_NODE_PROFILE: ${state_file}"
  fi
}

assert_normal_run_shape() {
  local inspect_file="$1" shared_dir="$2" label="$3"
  jq -e '.[0].Config.Labels["com.autobyteus.launcher"] == "server-docker"' "${inspect_file}" >/dev/null || fail "${label}: missing launcher label"
  jq -e '.[0].Config.Labels["com.autobyteus.nodeName"] == "autobyteus-server-0"' "${inspect_file}" >/dev/null || fail "${label}: missing node label"
  jq -e '.[0].Config.Labels["com.autobyteus.profile"] == null' "${inspect_file}" >/dev/null || fail "${label}: obsolete profile label present"
  jq -e '([.[0].Config.Env[]? | select(startswith("AUTOBYTEUS_NODE_PROFILE="))] | length) == 0' "${inspect_file}" >/dev/null || fail "${label}: obsolete profile env present"
  jq -e '([.[0].Config.Env[]? | select(. == "AUTOBYTEUS_TEMP_WORKSPACE_DIR=/home/autobyteus/workspace")] | length) == 1' "${inspect_file}" >/dev/null || fail "${label}: temp workspace env missing"
  jq -e '((.[0].HostConfig.CapAdd // []) | (index("SYS_ADMIN") != null or index("CAP_SYS_ADMIN") != null))' "${inspect_file}" >/dev/null || fail "${label}: SYS_ADMIN cap missing"
  jq -e '((.[0].HostConfig.SecurityOpt // []) | index("seccomp=unconfined")) != null' "${inspect_file}" >/dev/null || fail "${label}: seccomp=unconfined missing"
  jq -e '.[0].HostConfig.PortBindings as $p | all(["8000/tcp","5900/tcp","6080/tcp","9223/tcp"][]; (($p[.] // []) | length) > 0 and (($p[.][0].HostIp // "") != "127.0.0.1"))' "${inspect_file}" >/dev/null || fail "${label}: expected unqualified/non-localhost port bindings for all service ports"
  jq -e --arg node_src "${shared_dir}/nodes/autobyteus-server-0" --arg shared_src "${shared_dir}/shared" '
    .[0].Mounts as $m
    | any($m[]; .Type == "volume" and .Name == "autobyteus-server-0-workspace" and .Destination == "/app/autobyteus-server-ts/workspace")
    and any($m[]; .Type == "volume" and .Name == "autobyteus-server-0-data" and .Destination == "/home/autobyteus/data")
    and any($m[]; .Type == "volume" and .Name == "autobyteus-server-0-root-home" and .Destination == "/root")
    and any($m[]; .Type == "bind" and .Source == $node_src and .Destination == "/home/autobyteus/workspace")
    and any($m[]; .Type == "bind" and .Source == $shared_src and .Destination == "/home/autobyteus/shared")
  ' "${inspect_file}" >/dev/null || fail "${label}: expected named volumes and bind mounts missing"
  pass "${label}: normal Docker run shape verified"
}

write_summary() {
  cat > "${SUMMARY_FILE}" <<SUMMARY
# Docker Lifecycle Validation Summary

- Run ID: ${RUN_ID}
- Validation time UTC: $(date -u '+%Y-%m-%dT%H:%M:%SZ')
- Isolated Docker daemon: Docker-in-Docker container ${DIND_NAME}
- Inner Docker host: ${INNER_DOCKER_HOST}
- Launcher: ${LAUNCHER}
- State dir: ${STATE_DIR}
- Evidence log: ${LOG_FILE}

## Scenarios

1. Profile option rejection: PASS
2. New container normal run shape: PASS
3. URLs/status/storage/logs reporting: PASS
4. Workspace apply --all recreation with changed shared workspace root: PASS
5. Upgrade --all image-change lifecycle: PASS
6. Reset lifecycle: PASS
7. Old v4/profile-managed state/container normalization: PASS

The Docker-in-Docker daemon and validation containers were removed during cleanup. Inspect JSON and command output files remain in this directory.
SUMMARY
}

step "Start isolated Docker-in-Docker daemon"
docker run -d --privileged --name "${DIND_NAME}" \
  -e DOCKER_TLS_CERTDIR= \
  -v "${HOST_ROOT}:${HOST_ROOT}" \
  -p 127.0.0.1::2375 \
  docker:29-dind \
  --host=tcp://0.0.0.0:2375 --host=unix:///var/run/docker.sock
DIND_PORT="$(docker port "${DIND_NAME}" 2375/tcp | sed -E 's/.*:([0-9]+)/\1/')"
INNER_DOCKER_HOST="tcp://127.0.0.1:${DIND_PORT}"
for attempt in $(seq 1 90); do
  if inner_docker info --format 'Inner Docker server={{.ServerVersion}} os={{.OperatingSystem}} arch={{.Architecture}} driver={{.Driver}}' ; then
    break
  fi
  if [[ "${attempt}" == "90" ]]; then
    docker logs "${DIND_NAME}" | tail -200
    fail "Docker-in-Docker daemon did not become reachable"
  fi
  sleep 1
done
pass "isolated daemon reachable at ${INNER_DOCKER_HOST}"

step "Prime validation images inside isolated daemon"
inner_docker pull nginx:alpine
inner_docker pull nginx:1.27-alpine
pass "nginx validation images pulled"

step "Scenario 1: --profile is rejected and does not create a container"
set +e
PROFILE_OUTPUT="$(run_launcher_with_shared "${SHARED_DIR_A}" new-container --profile standard --image nginx --tag alpine 2>&1)"
PROFILE_RC=$?
set -e
printf '%s\n' "${PROFILE_OUTPUT}" > "${EVIDENCE_DIR}/profile-rejection.txt"
[[ "${PROFILE_RC}" -ne 0 ]] || fail "--profile unexpectedly succeeded"
[[ "${PROFILE_OUTPUT}" == *"Unknown new-container option(s): --profile standard"* ]] || fail "--profile rejection message mismatch"
[[ "$(managed_count)" == "0" ]] || fail "profile rejection created a managed container"
pass "profile option rejected before docker run"

step "Scenario 2: new-container creates normal Docker node"
mkdir -p "${SHARED_DIR_A}"
run_launcher_with_shared "${SHARED_DIR_A}" new-container --image nginx --tag alpine | tee "${EVIDENCE_DIR}/new-container.txt"
[[ "$(managed_count)" == "1" ]] || fail "expected one managed container after new-container"
STATE_FILE="${STATE_DIR}/nodes/autobyteus-server-0.env"
assert_state_has_no_profile "${STATE_FILE}"
grep -q '^IMAGE_REF=nginx:alpine$' "${STATE_FILE}" || fail "state image ref mismatch after new-container"
inspect_container autobyteus-server-0 "${EVIDENCE_DIR}/inspect-new-container.json"
assert_normal_run_shape "${EVIDENCE_DIR}/inspect-new-container.json" "${SHARED_DIR_A}" "new-container"

step "Scenario 3: urls/status/storage/logs expose lifecycle information"
run_launcher_with_shared "${SHARED_DIR_A}" urls | tee "${EVIDENCE_DIR}/urls.txt"
run_launcher_with_shared "${SHARED_DIR_A}" status | tee "${EVIDENCE_DIR}/status.txt"
run_launcher_with_shared "${SHARED_DIR_A}" storage --all | tee "${EVIDENCE_DIR}/storage-all.txt"
run_launcher_with_shared "${SHARED_DIR_A}" logs autobyteus-server-0 --tail 20 | tee "${EVIDENCE_DIR}/logs-tail.txt"
grep -q '^Backend: http://localhost:' "${EVIDENCE_DIR}/urls.txt" || fail "urls output missing Backend"
grep -q '^GraphQL: http://localhost:' "${EVIDENCE_DIR}/urls.txt" || fail "urls output missing GraphQL"
grep -Eq 'autobyteus-server-0[[:space:]]+autobyteus-server-0[[:space:]]+running' "${EVIDENCE_DIR}/status.txt" || fail "status output missing running node"
grep -q '/home/autobyteus/workspace' "${EVIDENCE_DIR}/storage-all.txt" || fail "storage output missing workspace mapping"
grep -q '/home/autobyteus/shared' "${EVIDENCE_DIR}/storage-all.txt" || fail "storage output missing shared mapping"
pass "urls/status/storage/logs checked"

step "Scenario 4: workspace apply --all recreates stale config when shared root changes"
mkdir -p "${SHARED_DIR_B}"
run_launcher_with_shared "${SHARED_DIR_B}" workspace apply --all | tee "${EVIDENCE_DIR}/workspace-apply-all.txt"
grep -q 'Applying shared workspace bind mounts to autobyteus-server-0' "${EVIDENCE_DIR}/workspace-apply-all.txt" || fail "workspace apply did not target node"
grep -q 'Launcher config changed for autobyteus-server-0' "${EVIDENCE_DIR}/workspace-apply-all.txt" || fail "workspace apply did not report config change/recreate"
assert_state_has_no_profile "${STATE_FILE}"
inspect_container autobyteus-server-0 "${EVIDENCE_DIR}/inspect-workspace-apply.json"
assert_normal_run_shape "${EVIDENCE_DIR}/inspect-workspace-apply.json" "${SHARED_DIR_B}" "workspace apply --all"

step "Scenario 5: upgrade --all recreates node for changed image"
run_launcher_with_shared "${SHARED_DIR_B}" upgrade --all --image nginx --tag 1.27-alpine | tee "${EVIDENCE_DIR}/upgrade-all.txt"
grep -q 'Image changed for autobyteus-server-0' "${EVIDENCE_DIR}/upgrade-all.txt" || fail "upgrade did not report image-change recreation"
grep -q '^IMAGE_REF=nginx:1.27-alpine$' "${STATE_FILE}" || fail "state image ref mismatch after upgrade"
assert_state_has_no_profile "${STATE_FILE}"
inspect_container autobyteus-server-0 "${EVIDENCE_DIR}/inspect-upgrade-all.json"
assert_normal_run_shape "${EVIDENCE_DIR}/inspect-upgrade-all.json" "${SHARED_DIR_B}" "upgrade --all"
jq -e '.[0].Config.Image == "nginx:1.27-alpine"' "${EVIDENCE_DIR}/inspect-upgrade-all.json" >/dev/null || fail "container image mismatch after upgrade"

step "Scenario 6: reset destroys managed nodes and recreates default normal node"
run_launcher_with_shared "${SHARED_DIR_A}" reset --image nginx --tag alpine | tee "${EVIDENCE_DIR}/reset.txt"
grep -q 'Removed managed container autobyteus-server-0' "${EVIDENCE_DIR}/reset.txt" || fail "reset did not remove existing managed container"
grep -q 'Started autobyteus-server-0' "${EVIDENCE_DIR}/reset.txt" || fail "reset did not recreate default node"
[[ "$(managed_count)" == "1" ]] || fail "expected one managed container after reset"
grep -q '^IMAGE_REF=nginx:alpine$' "${STATE_FILE}" || fail "state image ref mismatch after reset"
assert_state_has_no_profile "${STATE_FILE}"
inspect_container autobyteus-server-0 "${EVIDENCE_DIR}/inspect-reset.json"
assert_normal_run_shape "${EVIDENCE_DIR}/inspect-reset.json" "${SHARED_DIR_A}" "reset"

step "Scenario 7: old v4/profile-managed state/container normalizes on workspace apply --all"
run_launcher_with_shared "${SHARED_DIR_A}" destroy --all | tee "${EVIDENCE_DIR}/destroy-before-old-profile.txt"
rm -rf "${STATE_DIR}" "${OLD_SHARED_DIR}" "${MIGRATED_SHARED_DIR}"
mkdir -p "${STATE_DIR}/nodes" "${OLD_SHARED_DIR}/nodes/autobyteus-server-0" "${OLD_SHARED_DIR}/shared" "${MIGRATED_SHARED_DIR}"
inner_docker pull nginx:alpine >/dev/null
inner_docker run -d \
  --name autobyteus-server-0 \
  --label com.autobyteus.launcher=server-docker \
  --label com.autobyteus.nodeName=autobyteus-server-0 \
  --label com.autobyteus.configHash=old-v4-profile-hash \
  --label com.autobyteus.profile=mobile-safe \
  -e AUTOBYTEUS_NODE_PROFILE=mobile-safe \
  -p 127.0.0.1:18001:80 \
  -p 127.0.0.1:15908:5900 \
  -p 127.0.0.1:16080:6080 \
  -p 127.0.0.1:19228:9223 \
  nginx:alpine >/dev/null
cat > "${STATE_FILE}" <<STATE
NODE_NAME=autobyteus-server-0
CONTAINER_NAME=autobyteus-server-0
BACKEND_PORT=18001
VNC_PORT=15908
NOVNC_PORT=16080
DEBUG_PORT=19228
IMAGE_REF=nginx:alpine
CREATED_AT=2026-05-23T00:00:00Z
CONFIG_HASH=old-v4-profile-hash
PROFILE=mobile-safe
UPDATED_AT=2026-05-23T00:00:00Z
STATE
inspect_container autobyteus-server-0 "${EVIDENCE_DIR}/inspect-old-profile-before.json"
jq -e '.[0].Config.Labels["com.autobyteus.profile"] == "mobile-safe"' "${EVIDENCE_DIR}/inspect-old-profile-before.json" >/dev/null || fail "old fixture missing profile label"
jq -e '([.[0].Config.Env[]? | select(. == "AUTOBYTEUS_NODE_PROFILE=mobile-safe")] | length) == 1' "${EVIDENCE_DIR}/inspect-old-profile-before.json" >/dev/null || fail "old fixture missing profile env"
run_launcher_with_shared "${MIGRATED_SHARED_DIR}" workspace apply --all | tee "${EVIDENCE_DIR}/old-profile-workspace-apply-all.txt"
grep -q 'Launcher config changed for autobyteus-server-0' "${EVIDENCE_DIR}/old-profile-workspace-apply-all.txt" || fail "old profile apply did not report config change"
assert_state_has_no_profile "${STATE_FILE}"
inspect_container autobyteus-server-0 "${EVIDENCE_DIR}/inspect-old-profile-after.json"
assert_normal_run_shape "${EVIDENCE_DIR}/inspect-old-profile-after.json" "${MIGRATED_SHARED_DIR}" "old profile normalization"
jq -e '.[0].HostConfig.PortBindings as $p | all(["8000/tcp","5900/tcp","6080/tcp","9223/tcp"][]; (($p[.][0].HostIp // "") != "127.0.0.1"))' "${EVIDENCE_DIR}/inspect-old-profile-after.json" >/dev/null || fail "old profile normalization retained localhost-only ports"
pass "old v4/profile-managed container/state normalized to v5 normal run shape"

write_summary
step "Validation complete"
cat "${SUMMARY_FILE}"
