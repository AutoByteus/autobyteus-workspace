#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
RUNTIME_DIR="${SCRIPT_DIR}/.runtime"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
DEFAULT_PROJECT="autobyteus-server"

mkdir -p "${RUNTIME_DIR}"

usage() {
  cat <<USAGE
Usage:
  ./docker-start.sh <command> [options]

Commands:
  up           Build and start the server with collision-safe ports
  down         Stop the server
  ps           Show status
  logs         Tail logs
  ports        Print current mapped ports and URLs

Options:
  -p, --project <name>   Instance project name (default: ${DEFAULT_PROJECT})
  -v, --variant <v>      Image variant: latest or zh (default: latest)
  --no-build             Skip Docker image build
  --volumes              (down only) Remove named volumes
  --delete-state         (down only) Remove saved port configuration for this project
USAGE
}

log() {
  printf '[%s] %s
' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  printf 'error: %s
' "$*" >&2
  exit 1
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

USED_PORTS=""
reserve_port() {
  local value="$1"
  if [[ -z "${value}" ]]; then return; fi
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
      printf '%s
' "${candidate}"
      return
    fi
  done
}

normalize_project() {
  local raw="$1"
  local normalized
  normalized="$(printf '%s' "${raw}" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-')"
  normalized="${normalized#-}"
  normalized="${normalized%-}"
  printf '%s
' "${normalized}"
}

cmd="${1:-}"
[[ -n "${cmd}" ]] || { usage; exit 1; }
shift || true

project="${DEFAULT_PROJECT}"
variant="latest"
build_flag=1
remove_volumes=0
remove_state=0
extra_args=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--project) project="$2"; shift 2 ;;
    -v|--variant) variant="$2"; shift 2 ;;
    --no-build) build_flag=0; shift ;;
    --volumes) remove_volumes=1; shift ;;
    --delete-state) remove_state=1; shift ;;
    *) extra_args+=("$1"); shift ;;
  esac
done

project="$(normalize_project "${project}")"
env_file="${RUNTIME_DIR}/${project}.env"

case "${cmd}" in
  up)
    if [[ ! -f "${env_file}" ]]; then
      log "Picking unique ports for new project: ${project}"
      USED_PORTS=""
      # Check existing project envs to avoid system-wide collision
      for f in "${RUNTIME_DIR}"/*.env; do
        if [[ -f "$f" ]]; then
          while IFS='=' read -r key value; do
            if [[ "$key" == *"PORT"* ]]; then reserve_port "$value"; fi
          done < "$f"
        fi
      done

      backend_port="$(pick_unique_port)"
      vnc_port="$(pick_unique_port)"
      novnc_port="$(pick_unique_port)"
      debug_port="$(pick_unique_port)"

      image_tag="latest"
      if [[ -n "${variant}" && "${variant}" != "latest" ]]; then
        image_tag="latest-${variant}"
      fi

      cat <<EOF > "${env_file}"
AUTOBYTEUS_BACKEND_PORT=${backend_port}
AUTOBYTEUS_VNC_PORT=${vnc_port}
AUTOBYTEUS_WEB_VNC_PORT=${novnc_port}
AUTOBYTEUS_CHROME_DEBUG_PORT=${debug_port}
AUTOBYTEUS_IMAGE_TAG=${image_tag}

# Optional: GitHub credentials for runtime sync (set SKIP_SYNC=0 to use)
# GITHUB_PAT=your_pat_here
# GITHUB_USERNAME=your_username
# GITHUB_EMAIL=your_email
AUTOBYTEUS_SKIP_SYNC=1
EOF
    fi

    # Build if requested
    if [[ "${build_flag}" -eq 1 ]]; then
      log "Building variant: ${variant}"
      "${SCRIPT_DIR}/build.sh" --variant "${variant}"
    fi

    log "Starting instance: ${project} (variant=${variant})"
    docker compose -p "${project}" -f "${COMPOSE_FILE}" --env-file "${env_file}" up -d --remove-orphans

    log "Instance ${project} is up."
    # shellcheck disable=SC1090
    source "${env_file}"
    echo "Endpoints:"
    echo "  Backend: http://localhost:${AUTOBYTEUS_BACKEND_PORT}"
    echo "  GraphQL: http://localhost:${AUTOBYTEUS_BACKEND_PORT}/graphql"
    echo "  noVNC:   http://localhost:${AUTOBYTEUS_WEB_VNC_PORT}"
    ;;

  down)
    [[ -f "${env_file}" ]] || fail "Project ${project} not found (no state at ${env_file})"
    args=("-p" "${project}" "-f" "${COMPOSE_FILE}" "--env-file" "${env_file}" "down" "--remove-orphans")
    if [[ "${remove_volumes}" -eq 1 ]]; then args+=("--volumes"); fi
    docker compose "${args[@]}"
    if [[ "${remove_state}" -eq 1 ]]; then rm -f "${env_file}"; log "Deleted state: ${env_file}"; fi
    ;;

  ps|logs)
    [[ -f "${env_file}" ]] || fail "Project ${project} not found"
    docker compose -p "${project}" -f "${COMPOSE_FILE}" --env-file "${env_file}" "${cmd}" "${extra_args[@]}"
    ;;

  ports)
    [[ -f "${env_file}" ]] || fail "Project ${project} not found"
    cat "${env_file}"
    ;;

  *)
    usage
    exit 1
    ;;
esac
