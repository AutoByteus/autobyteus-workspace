#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker/compose.personal-test.yml"
RUNTIME_DIR="${ROOT_DIR}/docker/.runtime"
DEFAULT_PROJECT="$(basename "${ROOT_DIR}" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-')"

mkdir -p "${RUNTIME_DIR}"

usage() {
  cat <<USAGE
Usage:
  ./scripts/personal-docker.sh <command> [options]

Commands:
  up           Start/update stack with collision-safe ports
  down         Stop stack
  ps           Show service status
  logs         Tail logs
  ports        Print current mapped ports and URLs
  seed         Seed test fixtures through GraphQL
  sync-remotes Run full sync from main node to remote node(s)

Options (all commands):
  -p, --project <name>   Compose project name (default: ${DEFAULT_PROJECT})

Options (up only):
  -r, --remote-nodes <n> Number of remote server containers (default: 1)
  --no-build             Skip Docker image build
  --fresh-ports          Pick a new set of host ports
  --seed-test-fixtures   Seed fixtures after startup (default: on)
  --no-seed-test-fixtures Disable fixture seeding during startup
  --sync-remotes         Run post-start sync to remotes (default: on)
  --no-sync-remotes      Disable post-start remote sync

Options (down only):
  --volumes              Remove named volumes
  --delete-state         Remove saved runtime env for this project
USAGE
}

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

run_seed_fixtures() {
  local env_file="$1"
  local seed_script="${ROOT_DIR}/scripts/seed-personal-test-fixtures.py"
  [[ -f "${seed_script}" ]] || fail "Seed script not found: ${seed_script}"

  # shellcheck disable=SC1090
  source "${env_file}"
  local graphql_url="http://127.0.0.1:${AUTOBYTEUS_HOST_BACKEND_PORT}/graphql"

  log "Seeding test fixtures via ${graphql_url}"
  python3 "${seed_script}" --graphql-url "${graphql_url}"
}

run_remote_full_sync() {
  local env_file="$1"
  local project="$2"
  local remote_count="$3"
  local sync_script="${ROOT_DIR}/scripts/run-personal-remote-sync.py"
  [[ -f "${sync_script}" ]] || fail "Remote sync script not found: ${sync_script}"

  # shellcheck disable=SC1090
  source "${env_file}"
  local graphql_url="http://127.0.0.1:${AUTOBYTEUS_HOST_BACKEND_PORT}/graphql"

  log "Running full sync to remotes via ${graphql_url} (expected remotes=${remote_count})"
  python3 "${sync_script}" \
    --graphql-url "${graphql_url}" \
    --project "${project}" \
    --remote-count "${remote_count}"
}

normalize_project() {
  local raw="$1"
  local normalized
  normalized="$(printf '%s' "${raw}" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-')"
  normalized="${normalized#-}"
  normalized="${normalized%-}"
  printf '%s\n' "${normalized}"
}

random_port() {
  python3 - <<'PY'
import socket
s = socket.socket()
s.bind(('127.0.0.1', 0))
print(s.getsockname()[1])
s.close()
PY
}

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 24
  else
    python3 - <<'PY'
import secrets
print(secrets.token_hex(24))
PY
  fi
}

USED_PORTS=""
reserve_port() {
  local value="$1"
  if [[ -z "${value}" ]]; then
    return
  fi
  if [[ -z "${USED_PORTS}" ]]; then
    USED_PORTS=" ${value} "
  elif [[ " ${USED_PORTS} " != *" ${value} "* ]]; then
    USED_PORTS+="${value} "
  fi
}

pick_unique_port() {
  local candidate
  while true; do
    candidate="$(random_port)"
    if [[ " ${USED_PORTS} " != *" ${candidate} "* ]]; then
      reserve_port "${candidate}"
      printf '%s\n' "${candidate}"
      return
    fi
  done
}

runtime_env_file() {
  local project="$1"
  printf '%s/%s.env\n' "${RUNTIME_DIR}" "${project}"
}

compose_cmd() {
  local project="$1"
  local env_file="$2"
  docker compose \
    --project-name "${project}" \
    --env-file "${env_file}" \
    -f "${COMPOSE_FILE}" \
    "${@:3}"
}

load_reserved_ports_from_env() {
  local env_file="$1"
  [[ -f "${env_file}" ]] || return 0
  # shellcheck disable=SC1090
  source "${env_file}"
  reserve_port "${AUTOBYTEUS_HOST_BACKEND_PORT:-}"
  reserve_port "${AUTOBYTEUS_HOST_WEB_PORT:-}"
  reserve_port "${AUTOBYTEUS_HOST_GATEWAY_PORT:-}"
  reserve_port "${AUTOBYTEUS_HOST_VNC_PORT:-}"
  reserve_port "${AUTOBYTEUS_HOST_NOVNC_PORT:-}"
  reserve_port "${AUTOBYTEUS_HOST_CHROME_DEBUG_PORT:-}"
}

write_runtime_env() {
  local env_file="$1"
  local backend_port="$2"
  local web_port="$3"
  local gateway_port="$4"
  local vnc_port="$5"
  local novnc_port="$6"
  local chrome_debug_port="$7"
  local shared_secret="$8"
  local admin_token="$9"

  cat > "${env_file}" <<EOF_ENV
AUTOBYTEUS_HOST_BACKEND_PORT=${backend_port}
AUTOBYTEUS_HOST_WEB_PORT=${web_port}
AUTOBYTEUS_HOST_GATEWAY_PORT=${gateway_port}
AUTOBYTEUS_HOST_VNC_PORT=${vnc_port}
AUTOBYTEUS_HOST_NOVNC_PORT=${novnc_port}
AUTOBYTEUS_HOST_CHROME_DEBUG_PORT=${chrome_debug_port}
AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:${backend_port}
AUTOBYTEUS_VNC_SERVER_HOSTS=127.0.0.1:${novnc_port}
GATEWAY_SERVER_SHARED_SECRET=${shared_secret}
GATEWAY_ADMIN_TOKEN=${admin_token}
EOF_ENV
}

print_endpoints() {
  local env_file="$1"
  # shellcheck disable=SC1090
  source "${env_file}"
  cat <<EOF_PORTS
web:            http://127.0.0.1:${AUTOBYTEUS_HOST_WEB_PORT}
backend:        http://127.0.0.1:${AUTOBYTEUS_HOST_BACKEND_PORT}
gateway:        http://127.0.0.1:${AUTOBYTEUS_HOST_GATEWAY_PORT}
noVNC:          http://127.0.0.1:${AUTOBYTEUS_HOST_NOVNC_PORT}
VNC (TigerVNC): 127.0.0.1:${AUTOBYTEUS_HOST_VNC_PORT}
chrome debug:   127.0.0.1:${AUTOBYTEUS_HOST_CHROME_DEBUG_PORT}
EOF_PORTS
}

cmd="${1:-}"
[[ -n "${cmd}" ]] || {
  usage
  exit 1
}
shift || true

project="${DEFAULT_PROJECT}"
remote_nodes=1
build_flag=1
fresh_ports=0
remove_volumes=0
remove_state=0
seed_test_fixtures=1
sync_remotes=1
extra_args=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--project)
      [[ $# -ge 2 ]] || fail "Missing value for $1"
      project="$2"
      shift 2
      ;;
    -r|--remote-nodes)
      [[ $# -ge 2 ]] || fail "Missing value for $1"
      remote_nodes="$2"
      shift 2
      ;;
    --no-build)
      build_flag=0
      shift
      ;;
    --fresh-ports)
      fresh_ports=1
      shift
      ;;
    --seed-test-fixtures)
      seed_test_fixtures=1
      shift
      ;;
    --no-seed-test-fixtures)
      seed_test_fixtures=0
      shift
      ;;
    --sync-remotes)
      sync_remotes=1
      shift
      ;;
    --no-sync-remotes)
      sync_remotes=0
      shift
      ;;
    --volumes)
      remove_volumes=1
      shift
      ;;
    --delete-state)
      remove_state=1
      shift
      ;;
    --)
      shift
      extra_args+=("$@")
      break
      ;;
    *)
      extra_args+=("$1")
      shift
      ;;
  esac
done

project="$(normalize_project "${project}")"
[[ -n "${project}" ]] || fail "Project name resolved to empty value"
[[ "${remote_nodes}" =~ ^[0-9]+$ ]] || fail "--remote-nodes must be a non-negative integer"

env_file="$(runtime_env_file "${project}")"

require_cmd docker
require_cmd python3

case "${cmd}" in
  up)
    if [[ ! -f "${env_file}" || "${fresh_ports}" -eq 1 ]]; then
      USED_PORTS=""
      load_reserved_ports_from_env "${env_file}"
      backend_port="$(pick_unique_port)"
      web_port="$(pick_unique_port)"
      gateway_port="$(pick_unique_port)"
      vnc_port="$(pick_unique_port)"
      novnc_port="$(pick_unique_port)"
      chrome_debug_port="$(pick_unique_port)"
      shared_secret="${GATEWAY_SERVER_SHARED_SECRET:-$(generate_secret)}"
      admin_token="${GATEWAY_ADMIN_TOKEN:-$(generate_secret)}"
      write_runtime_env \
        "${env_file}" \
        "${backend_port}" \
        "${web_port}" \
        "${gateway_port}" \
        "${vnc_port}" \
        "${novnc_port}" \
        "${chrome_debug_port}" \
        "${shared_secret}" \
        "${admin_token}"
      log "Wrote runtime env: ${env_file}"
    else
      log "Reusing runtime env: ${env_file}"
    fi

    compose_up_args=(up -d --remove-orphans)
    if [[ "${remote_nodes}" -gt 0 ]]; then
      compose_up_args=(--profile remote "${compose_up_args[@]}" --scale "remote-server=${remote_nodes}")
    fi
    if [[ "${build_flag}" -eq 1 ]]; then
      compose_up_args+=(--build)
    fi

    log "Starting stack for project=${project} remote_nodes=${remote_nodes}"
    compose_cmd "${project}" "${env_file}" "${compose_up_args[@]}"

    if [[ "${seed_test_fixtures}" -eq 1 ]]; then
      run_seed_fixtures "${env_file}"
    fi
    if [[ "${sync_remotes}" -eq 1 ]]; then
      if [[ "${remote_nodes}" -gt 0 ]]; then
        run_remote_full_sync "${env_file}" "${project}" "${remote_nodes}"
      else
        log "Skipping remote sync: --remote-nodes is 0."
      fi
    fi

    printf '\n'
    print_endpoints "${env_file}"
    ;;

  down)
    [[ -f "${env_file}" ]] || fail "Runtime env file not found: ${env_file}"
    compose_down_args=(--profile remote down --remove-orphans)
    if [[ "${remove_volumes}" -eq 1 ]]; then
      compose_down_args+=(--volumes)
    fi
    log "Stopping stack for project=${project}"
    compose_cmd "${project}" "${env_file}" "${compose_down_args[@]}"
    if [[ "${remove_state}" -eq 1 ]]; then
      rm -f "${env_file}"
      log "Deleted runtime env: ${env_file}"
    fi
    ;;

  ps)
    [[ -f "${env_file}" ]] || fail "Runtime env file not found: ${env_file}"
    compose_cmd "${project}" "${env_file}" ps
    ;;

  logs)
    [[ -f "${env_file}" ]] || fail "Runtime env file not found: ${env_file}"
    if [[ ${#extra_args[@]} -gt 0 ]]; then
      compose_cmd "${project}" "${env_file}" logs -f "${extra_args[@]}"
    else
      compose_cmd "${project}" "${env_file}" logs -f
    fi
    ;;

  ports)
    [[ -f "${env_file}" ]] || fail "Runtime env file not found: ${env_file}"
    print_endpoints "${env_file}"
    ;;

  seed)
    [[ -f "${env_file}" ]] || fail "Runtime env file not found: ${env_file}"
    run_seed_fixtures "${env_file}"
    ;;

  sync-remotes)
    [[ -f "${env_file}" ]] || fail "Runtime env file not found: ${env_file}"
    expected_remote_count="${remote_nodes}"
    if [[ "${expected_remote_count}" -le 0 ]]; then
      expected_remote_count=1
    fi
    run_remote_full_sync "${env_file}" "${project}" "${expected_remote_count}"
    ;;

  *)
    usage
    exit 1
    ;;
esac
