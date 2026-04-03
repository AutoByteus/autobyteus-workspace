#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
RUNTIME_DIR="${SCRIPT_DIR}/.runtime"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
DEFAULT_PROJECT="autobyteus-server"
DEFAULT_REMOTE_IMAGE="autobyteus/autobyteus-server"

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
  --build-local          Build from local source explicitly (same behavior as default `up`)
  --no-build             Skip Docker image build
  --pull-remote          Pull the published remote release image instead of building locally
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

remote_image_name() {
  printf '%s
' "${AUTOBYTEUS_REMOTE_IMAGE_NAME:-${DEFAULT_REMOTE_IMAGE}}"
}

image_tag_for_variant() {
  local raw_variant="$1"
  if [[ -n "${raw_variant}" && "${raw_variant}" != "latest" ]]; then
    printf 'latest-%s
' "${raw_variant}"
    return
  fi
  printf 'latest
'
}

inspect_repo_digest() {
  local image_ref="$1"
  docker image inspect "${image_ref}" --format '{{join .RepoDigests "\n"}}' 2>/dev/null | head -n 1 || true
}

upsert_env_var() {
  local file_path="$1"
  local key="$2"
  local value="$3"

  if [[ ! -f "${file_path}" ]]; then
    fail "Cannot update missing env file: ${file_path}"
  fi

  if grep -q "^${key}=" "${file_path}"; then
    python3 - "${file_path}" "${key}" "${value}" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
key = sys.argv[2]
value = sys.argv[3]
lines = path.read_text().splitlines()
updated = []
for line in lines:
    if line.startswith(f"{key}="):
        updated.append(f"{key}={value}")
    else:
        updated.append(line)
path.write_text("\n".join(updated) + "\n")
PY
    return
  fi

  printf '%s=%s\n' "${key}" "${value}" >> "${file_path}"
}

remove_env_var() {
  local file_path="$1"
  local key="$2"

  if [[ ! -f "${file_path}" ]]; then
    return
  fi

  python3 - "${file_path}" "${key}" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
key = sys.argv[2]
lines = path.read_text().splitlines()
updated = [line for line in lines if not line.startswith(f"{key}=")]
path.write_text("\n".join(updated) + "\n")
PY
}

sync_remote_release_image() {
  local local_image_ref="$1"
  local remote_image_ref="$2"

  local local_digest
  local remote_digest
  local_digest="$(inspect_repo_digest "${local_image_ref}")"

  log "Pulling remote release image: ${remote_image_ref}"
  docker pull "${remote_image_ref}"

  remote_digest="$(inspect_repo_digest "${remote_image_ref}")"
  if [[ -z "${remote_digest}" ]]; then
    fail "Unable to resolve pulled remote digest for ${remote_image_ref}."
  fi

  docker tag "${remote_image_ref}" "${local_image_ref}"

  if [[ "${local_digest}" == "${remote_digest}" ]]; then
    log "Remote image matches the current local alias. No container recreation is required."
    return 1
  fi

  log "Updated local alias ${local_image_ref} to remote digest ${remote_digest}."
  return 0
}

cmd="${1:-}"
[[ -n "${cmd}" ]] || { usage; exit 1; }
shift || true

project="${DEFAULT_PROJECT}"
variant="latest"
build_flag=1
pull_remote=0
remove_volumes=0
remove_state=0
extra_args=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--project) project="$2"; shift 2 ;;
    -v|--variant) variant="$2"; shift 2 ;;
    --build-local) build_flag=1; shift ;;
    --no-build) build_flag=0; shift ;;
    --pull-remote) pull_remote=1; build_flag=0; shift ;;
    --volumes) remove_volumes=1; shift ;;
    --delete-state) remove_state=1; shift ;;
    *) extra_args+=("$1"); shift ;;
  esac
done

project="$(normalize_project "${project}")"
env_file="${RUNTIME_DIR}/${project}.env"

case "${cmd}" in
  up)
    image_tag="$(image_tag_for_variant "${variant}")"
    local_image_ref="autobyteus-server:${image_tag}"
    remote_image_ref="$(remote_image_name):${image_tag}"
    force_recreate=0

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

    upsert_env_var "${env_file}" "AUTOBYTEUS_IMAGE_TAG" "${image_tag}"
    remove_env_var "${env_file}" "AUTOBYTEUS_IMAGE_SOURCE"

    if [[ "${pull_remote}" -eq 1 ]]; then
      if sync_remote_release_image "${local_image_ref}" "${remote_image_ref}"; then
        force_recreate=1
      fi
    elif [[ "${build_flag}" -eq 1 ]]; then
      log "Building variant: ${variant}"
      "${SCRIPT_DIR}/build.sh" --variant "${variant}"
      force_recreate=1
    elif ! docker image inspect "${local_image_ref}" >/dev/null 2>&1; then
      fail "Local image ${local_image_ref} is missing. Run with --build-local or --pull-remote."
    fi

    log "Starting instance: ${project} (variant=${variant})"
    compose_args=("-p" "${project}" "-f" "${COMPOSE_FILE}" "--env-file" "${env_file}" "up" "-d" "--remove-orphans")
    if [[ "${force_recreate}" -eq 1 ]]; then
      compose_args+=("--force-recreate")
    fi
    docker compose "${compose_args[@]}"

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
    args=("-p" "${project}" "-f" "${COMPOSE_FILE}" "--env-file" "${env_file}" "${cmd}")
    if ((${#extra_args[@]} > 0)); then
      args+=("${extra_args[@]}")
    fi
    docker compose "${args[@]}"
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
