#!/usr/bin/env bash
set -euo pipefail

LAUNCHER_LABEL_KEY="com.autobyteus.launcher"
LAUNCHER_LABEL_VALUE="server-docker"
NODE_LABEL_KEY="com.autobyteus.nodeName"
CONFIG_LABEL_KEY="com.autobyteus.configHash"
CONFIG_HASH_VERSION="v2"
NODE_NAME_PREFIX="autobyteus-server"
DEFAULT_NODE_NAME="${NODE_NAME_PREFIX}-0"
DEFAULT_IMAGE="autobyteus/autobyteus-server"
DEFAULT_TAG="latest"
MAX_RUN_ATTEMPTS=5
USED_PORTS=""
PUBLIC_BASH_SCRIPT_URL="https://raw.githubusercontent.com/AutoByteus/autobyteus-workspace/personal/scripts/public/docker/autobyteus-docker.sh"
WORKSPACE_CONTAINER_PATH="/home/autobyteus/workspace"
SHARED_CONTAINER_PATH="/home/autobyteus/shared"
TEMP_WORKSPACE_ENV_VALUE="${WORKSPACE_CONTAINER_PATH}"

usage() {
  cat <<USAGE
AutoByteus Docker node launcher

Usage:
  autobyteus-docker <command> [options]
  curl -fsSL <script-url> | bash -s -- install

Commands:
  install            Install or replace the local autobyteus-docker CLI
  new-container      Create a new Docker node with automatic indexed name and ports
  upgrade --all      Upgrade all managed Docker nodes to the latest image
  destroy --all      Remove all managed Docker nodes, keeping named volumes
  reset              Destroy all managed Docker nodes, then create autobyteus-server-0
  workspace paths    Show host/container paths for node and shared workspaces
  workspace apply    Recreate node(s) to apply shared workspace bind mounts safely
  storage            Show named volumes and host bind mounts for node(s)
  urls | ports       Show Backend, GraphQL, noVNC, VNC, and debug URLs
  status | ps        Show managed Docker nodes
  logs               Show Docker logs for a managed node
  stop [--all]       Stop one or all managed Docker nodes
  help               Show this help

Advanced temporary use: curl -fsSL <script-url> | bash -s -- <command> [options]

Options:
  --name <name>      Friendly node name for status/logs/urls/stop (default: ${DEFAULT_NODE_NAME})
  --tag <tag>        Docker image tag (default: ${DEFAULT_TAG})
  --image <image>    Docker image repository or full image ref (default: ${DEFAULT_IMAGE})
  --all              Required for upgrade/destroy; also applies stop/status/workspace/storage to all managed nodes
  -h, --help         Show this help

State:
  Default install path: \$HOME/.local/bin/autobyteus-docker
  Default state directory: \$HOME/.autobyteus/docker-server
  Shared workspace: \$HOME/.autobyteus/docker-server/shared-workspace
  Overrides: AUTOBYTEUS_DOCKER_INSTALL_DIR, AUTOBYTEUS_DOCKER_STATE_DIR, AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR
USAGE
}

log() { printf '[AutoByteus Docker] %s\n' "$*"; }
fail() { printf 'error: %s\n' "$*" >&2; exit 1; }
now_utc() { date -u '+%Y-%m-%dT%H:%M:%SZ'; }

state_root() { printf '%s\n' "${AUTOBYTEUS_DOCKER_STATE_DIR:-${HOME}/.autobyteus/docker-server}"; }
state_dir() { printf '%s/nodes\n' "$(state_root)"; }
ensure_state_dir() { mkdir -p "$(state_dir)"; }

shared_workspace_root() {
  printf '%s\n' "${AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR:-$(state_root)/shared-workspace}"
}

node_workspace_host_path() {
  printf '%s/nodes/%s\n' "$(shared_workspace_root)" "$(normalize_node_name "$1")"
}

shared_workspace_host_path() {
  printf '%s/shared\n' "$(shared_workspace_root)"
}

ensure_shared_workspace_dirs() {
  local node_name="$1"
  mkdir -p "$(node_workspace_host_path "$node_name")" "$(shared_workspace_host_path)"
}

install_source_url() {
  printf '%s\n' "${AUTOBYTEUS_DOCKER_INSTALL_SOURCE_URL:-$PUBLIC_BASH_SCRIPT_URL}"
}

install_dir() {
  printf '%s\n' "${AUTOBYTEUS_DOCKER_INSTALL_DIR:-${HOME}/.local/bin}"
}

path_has_dir() {
  local dir="$1" entry
  IFS=':' read -r -a entries <<< "${PATH:-}"
  for entry in "${entries[@]}"; do
    [[ "$entry" == "$dir" ]] && return 0
  done
  return 1
}

install_launcher() {
  local dir install_path source tmp_path
  command -v curl >/dev/null 2>&1 || fail "curl is required to install the AutoByteus Docker launcher."
  dir="$(install_dir)"
  install_path="${dir}/autobyteus-docker"
  source="$(install_source_url)"
  mkdir -p "$dir"
  tmp_path="$(mktemp "${TMPDIR:-/tmp}/autobyteus-docker.XXXXXX")"
  trap 'rm -f "$tmp_path"' RETURN
  curl -fsSL "$source" -o "$tmp_path"
  chmod +x "$tmp_path"
  mv "$tmp_path" "$install_path"
  trap - RETURN

  log "Installed AutoByteus Docker launcher: ${install_path}"
  printf 'Next commands:\n  autobyteus-docker new-container\n  autobyteus-docker workspace paths\n  autobyteus-docker storage\n  autobyteus-docker urls\n'
  if path_has_dir "$dir"; then
    log "Install directory is already on PATH."
    return
  fi

  printf 'PATH guidance:\n  This shell cannot find autobyteus-docker until %s is on PATH.\n  Use direct path now: "%s" new-container\n  For this shell session: export PATH="%s:%s"\n  To persist, add that export line to your shell profile, then open a new terminal.\n' "$dir" "$install_path" "$dir" "\$PATH"
}

normalize_node_name() {
  local raw="${1:-${DEFAULT_NODE_NAME}}" normalized
  normalized="$(printf '%s' "$raw" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-')"
  normalized="${normalized#-}"
  normalized="${normalized%-}"
  [[ -n "$normalized" ]] || normalized="${DEFAULT_NODE_NAME}"
  printf '%s\n' "$normalized"
}

state_path_for() { printf '%s/%s.env\n' "$(state_dir)" "$(normalize_node_name "$1")"; }

load_state() {
  local file="$1"
  NODE_NAME="" CONTAINER_NAME="" BACKEND_PORT="" VNC_PORT="" NOVNC_PORT="" DEBUG_PORT="" IMAGE_REF="" CREATED_AT=""
  if [[ -f "$file" ]]; then
    # shellcheck disable=SC1090
    source "$file"
  fi
}

write_state() {
  local file="$1" node_name="$2" container_name="$3" backend="$4" vnc="$5" novnc="$6" debug="$7" image_ref="$8" created_at="$9" config_hash="${10}"
  printf 'NODE_NAME=%s\nCONTAINER_NAME=%s\nBACKEND_PORT=%s\nVNC_PORT=%s\nNOVNC_PORT=%s\nDEBUG_PORT=%s\nIMAGE_REF=%s\nCREATED_AT=%s\nCONFIG_HASH=%s\nUPDATED_AT=%s\n' \
    "$node_name" "$container_name" "$backend" "$vnc" "$novnc" "$debug" "$image_ref" "$created_at" "$config_hash" "$(now_utc)" > "$file"
}

assert_docker() {
  command -v docker >/dev/null 2>&1 || fail "Docker CLI was not found. Install Docker Desktop/Engine, then rerun this command."
  docker info >/dev/null 2>&1 || fail "Docker is not reachable. Start Docker Desktop/Engine, then rerun this command."
}

image_ref_for() {
  local image="$1" tag="$2" leaf
  leaf="${image##*/}"
  if [[ "$image" == *@* || "$leaf" == *:* ]]; then
    printf '%s\n' "$image"
  else
    printf '%s:%s\n' "$image" "$tag"
  fi
}

hash_text() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum | awk '{print $1}'; return; fi
  if command -v shasum >/dev/null 2>&1; then shasum -a 256 | awk '{print $1}'; return; fi
  if command -v openssl >/dev/null 2>&1; then openssl dgst -sha256 | awk '{print $NF}'; return; fi
  cksum | awk '{print "cksum-" $1 "-" $2}'
}

desired_config_hash() {
  local node_name="$1" image_ref="$2" volume_prefix workspace_root node_workspace_host shared_host
  volume_prefix="$(volume_prefix_for "$node_name")"
  workspace_root="$(shared_workspace_root)"
  node_workspace_host="$(node_workspace_host_path "$node_name")"
  shared_host="$(shared_workspace_host_path)"
  printf 'version=%s\nnode=%s\nimage=%s\nbackend=%s\nvnc=%s\nnovnc=%s\ndebug=%s\nworkspace_volume=%s-workspace\ndata_volume=%s-data\nroot_volume=%s-root-home\nshared_workspace_root=%s\nnode_workspace_host=%s\nnode_workspace_target=%s\nshared_workspace_host=%s\nshared_workspace_target=%s\ntemp_workspace_env=AUTOBYTEUS_TEMP_WORKSPACE_DIR=%s\nserver_host=http://localhost:%s\nvnc_hosts=localhost:%s\n' \
    "$CONFIG_HASH_VERSION" "$node_name" "$image_ref" "$BACKEND_PORT" "$VNC_PORT" "$NOVNC_PORT" "$DEBUG_PORT" "$volume_prefix" "$volume_prefix" "$volume_prefix" "$workspace_root" "$node_workspace_host" "$WORKSPACE_CONTAINER_PATH" "$shared_host" "$SHARED_CONTAINER_PATH" "$TEMP_WORKSPACE_ENV_VALUE" "$BACKEND_PORT" "$NOVNC_PORT" | hash_text
}

image_id_for() { docker image inspect --format '{{.Id}}' "$1" 2>/dev/null || true; }

container_exists() { docker container inspect "$1" >/dev/null 2>&1; }

container_image_id() { docker inspect --format '{{.Image}}' "$1" 2>/dev/null || true; }

container_config_hash() {
  local value
  value="$(docker inspect --format "{{ index .Config.Labels \"${CONFIG_LABEL_KEY}\" }}" "$1" 2>/dev/null || true)"
  [[ "$value" == "<no value>" ]] && value=""
  printf '%s\n' "$value"
}

container_running() { [[ "$(docker inspect --format '{{.State.Running}}' "$1" 2>/dev/null || true)" == "true" ]]; }

managed_container() {
  local container="$1" value
  value="$(docker inspect --format "{{ index .Config.Labels \"${LAUNCHER_LABEL_KEY}\" }}" "$container" 2>/dev/null || true)"
  [[ "$value" == "$LAUNCHER_LABEL_VALUE" ]]
}

container_for_node() {
  local node_name="$1"
  docker ps -a \
    --filter "label=${LAUNCHER_LABEL_KEY}=${LAUNCHER_LABEL_VALUE}" \
    --filter "label=${NODE_LABEL_KEY}=${node_name}" \
    --format '{{.Names}}' 2>/dev/null | head -n 1
}

managed_node_names() {
  local file name container value
  {
    shopt -s nullglob
    for file in "$(state_dir)"/*.env; do
      load_state "$file"
      name="${NODE_NAME:-$(basename "$file" .env)}"
      [[ -n "$name" ]] && printf '%s\n' "$name"
    done
    shopt -u nullglob

    docker ps -a \
      --filter "label=${LAUNCHER_LABEL_KEY}=${LAUNCHER_LABEL_VALUE}" \
      --format '{{.Names}}' 2>/dev/null | while IFS= read -r container; do
        [[ -n "$container" ]] || continue
        value="$(docker inspect --format "{{ index .Config.Labels \"${NODE_LABEL_KEY}\" }}" "$container" 2>/dev/null || true)"
        [[ -z "$value" || "$value" == "<no value>" ]] && value="$container"
        printf '%s\n' "$value"
      done
  } | awk 'NF && !seen[$0]++'
}

managed_container_names() {
  local file name container
  {
    shopt -s nullglob
    for file in "$(state_dir)"/*.env; do
      load_state "$file"
      name="${CONTAINER_NAME:-${NODE_NAME:-$(basename "$file" .env)}}"
      [[ -n "$name" ]] && printf '%s\n' "$name"
    done
    shopt -u nullglob

    docker ps -a \
      --filter "label=${LAUNCHER_LABEL_KEY}=${LAUNCHER_LABEL_VALUE}" \
      --format '{{.Names}}' 2>/dev/null || true
  } | awk 'NF && !seen[$0]++'
}

reserve_port() {
  local port="${1:-}"
  [[ -n "$port" ]] || return 0
  if [[ " ${USED_PORTS} " != *" ${port} "* ]]; then
    USED_PORTS+=" ${port}"
  fi
}

collect_used_ports() {
  USED_PORTS=""
  local file key value
  shopt -s nullglob
  for file in "$(state_dir)"/*.env; do
    while IFS='=' read -r key value; do
      [[ "$key" == *PORT ]] && reserve_port "$value"
    done < "$file"
  done
  shopt -u nullglob
}

port_is_available() {
  local port="$1"
  if command -v python3 >/dev/null 2>&1; then
    python3 -c $'import socket, sys\ns = socket.socket(socket.AF_INET, socket.SOCK_STREAM)\ntry:\n    s.bind(("127.0.0.1", int(sys.argv[1])))\nexcept OSError:\n    sys.exit(1)\nfinally:\n    s.close()' "$port"
    return $?
  fi
  if command -v nc >/dev/null 2>&1; then
    if nc -z 127.0.0.1 "$port" >/dev/null 2>&1; then
      return 1
    fi
    return 0
  fi
  return 0
}

random_port() {
  if command -v python3 >/dev/null 2>&1; then
    python3 -c 'import socket; s = socket.socket(socket.AF_INET, socket.SOCK_STREAM); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()'
    return
  fi
  printf '%s\n' $((20000 + RANDOM % 40000))
}

pick_port() {
  local preferred="${1:-}" candidate
  if [[ -n "$preferred" && " ${USED_PORTS} " != *" ${preferred} "* ]] && port_is_available "$preferred"; then
    reserve_port "$preferred"
    printf '%s\n' "$preferred"
    return
  fi
  while true; do
    candidate="$(random_port)"
    if [[ " ${USED_PORTS} " != *" ${candidate} "* ]] && port_is_available "$candidate"; then
      reserve_port "$candidate"
      printf '%s\n' "$candidate"
      return
    fi
  done
}

choose_ports() {
  local prefer_defaults="$1"
  collect_used_ports
  if [[ "$prefer_defaults" == "1" ]]; then
    BACKEND_PORT="$(pick_port 8001)"
    VNC_PORT="$(pick_port 5908)"
    NOVNC_PORT="$(pick_port 6080)"
    DEBUG_PORT="$(pick_port 9228)"
  else
    BACKEND_PORT="$(pick_port)"
    VNC_PORT="$(pick_port)"
    NOVNC_PORT="$(pick_port)"
    DEBUG_PORT="$(pick_port)"
  fi
}

node_name_available() {
  local node_name="$1"
  [[ ! -f "$(state_path_for "$node_name")" ]] || return 1
  [[ -z "$(container_for_node "$node_name")" ]] || return 1
  ! container_exists "$node_name"
}

next_node_name() {
  local index candidate
  index=0
  while true; do
    candidate="${NODE_NAME_PREFIX}-${index}"
    if node_name_available "$candidate"; then printf '%s\n' "$candidate"; return; fi
    index=$((index + 1))
  done
}

volume_prefix_for() { printf '%s\n' "$(normalize_node_name "$1")"; }

run_container() {
  local node_name="$1" container_name="$2" image_ref="$3" config_hash="$4" output volume_prefix node_workspace_host shared_host
  volume_prefix="$(volume_prefix_for "$node_name")"
  ensure_shared_workspace_dirs "$node_name"
  node_workspace_host="$(node_workspace_host_path "$node_name")"
  shared_host="$(shared_workspace_host_path)"
  output="$(docker run -d \
    --name "$container_name" \
    --restart unless-stopped \
    --cap-add SYS_ADMIN \
    --security-opt seccomp=unconfined \
    --label "${LAUNCHER_LABEL_KEY}=${LAUNCHER_LABEL_VALUE}" \
    --label "${NODE_LABEL_KEY}=${node_name}" \
    --label "${CONFIG_LABEL_KEY}=${config_hash}" \
    -p "${BACKEND_PORT}:8000" \
    -p "${VNC_PORT}:5900" \
    -p "${NOVNC_PORT}:6080" \
    -p "${DEBUG_PORT}:9223" \
    -e AUTOBYTEUS_WORKSPACE_ROOT=/app \
    -e AUTOBYTEUS_DATA_DIR=/home/autobyteus/data \
    -e AUTOBYTEUS_BIND_HOST=0.0.0.0 \
    -e AUTOBYTEUS_SERVER_PORT=8000 \
    -e "AUTOBYTEUS_SERVER_HOST=http://localhost:${BACKEND_PORT}" \
    -e "AUTOBYTEUS_VNC_SERVER_HOSTS=localhost:${NOVNC_PORT}" \
    -e APP_ENV=production \
    -e DB_TYPE=sqlite \
    -e LOG_LEVEL=INFO \
    -e AUTOBYTEUS_SKIP_SYNC=1 \
    -e "AUTOBYTEUS_TEMP_WORKSPACE_DIR=${TEMP_WORKSPACE_ENV_VALUE}" \
    -v "${volume_prefix}-workspace:/app/autobyteus-server-ts/workspace" \
    -v "${volume_prefix}-data:/home/autobyteus/data" \
    -v "${volume_prefix}-root-home:/root" \
    --mount "type=bind,source=${node_workspace_host},target=${WORKSPACE_CONTAINER_PATH}" \
    --mount "type=bind,source=${shared_host},target=${SHARED_CONTAINER_PATH}" \
    "$image_ref" 2>&1)"
  printf '%s\n' "$output"
}

is_bind_failure() {
  printf '%s' "$1" | grep -Eiq 'port is already allocated|bind: address already in use|Ports are not available|address already in use|Bind for'
}

verify_container_started() {
  local container_name="$1" running status exit_code state_error attempt
  for attempt in 1 2 3 4 5; do
    running="$(docker inspect --format '{{.State.Running}}' "$container_name" 2>&1)" || {
      printf 'docker inspect failed for %s: %s\n' "$container_name" "$running"
      return 1
    }
    status="$(docker inspect --format '{{.State.Status}}' "$container_name" 2>/dev/null || true)"
    exit_code="$(docker inspect --format '{{.State.ExitCode}}' "$container_name" 2>/dev/null || true)"
    state_error="$(docker inspect --format '{{.State.Error}}' "$container_name" 2>/dev/null || true)"

    if [[ "$running" == "true" ]]; then
      return 0
    fi

    if [[ -n "$state_error" || "$status" == "exited" || "$status" == "dead" ]]; then
      break
    fi

    sleep 1
  done

  printf 'container %s did not reach running state (status=%s running=%s exitCode=%s error=%s)\n' \
    "$container_name" "${status:-unknown}" "${running:-unknown}" "${exit_code:-unknown}" "${state_error:-}"
  return 1
}

print_urls() {
  local node_name="$1" container_name="$2" image_ref="$3"
  cat <<URLS
AutoByteus Docker node: ${node_name}
Container: ${container_name}
Image: ${image_ref}
Backend: http://localhost:${BACKEND_PORT}
GraphQL: http://localhost:${BACKEND_PORT}/graphql
noVNC: http://localhost:${NOVNC_PORT}
VNC: localhost:${VNC_PORT}
Chrome debug: localhost:${DEBUG_PORT}
Workspace: ${WORKSPACE_CONTAINER_PATH} -> $(node_workspace_host_path "$node_name")
Shared folder: ${SHARED_CONTAINER_PATH} -> $(shared_workspace_host_path)
Private app data: /home/autobyteus/data -> $(volume_prefix_for "$node_name")-data (Docker named volume)
Next step: paste Backend into Add Remote Node in AutoByteus.
URLS
}

print_workspace_paths_for_node() {
  local node_name="$1"
  cat <<PATHS
AutoByteus Docker workspace paths: ${node_name}
Shared workspace host root: $(shared_workspace_root)
Node workspace host path: $(node_workspace_host_path "$node_name")
Node workspace container path: ${WORKSPACE_CONTAINER_PATH}
Shared folder host path: $(shared_workspace_host_path)
Shared folder container path: ${SHARED_CONTAINER_PATH}
Default temp workspace env: AUTOBYTEUS_TEMP_WORKSPACE_DIR=${TEMP_WORKSPACE_ENV_VALUE}
PATHS
}

print_storage_for_node() {
  local node_name="$1" volume_prefix
  volume_prefix="$(volume_prefix_for "$node_name")"
  cat <<STORAGE
AutoByteus Docker storage: ${node_name}
Private Docker named volumes (kept during recreate/destroy/reset):
  ${volume_prefix}-data -> /home/autobyteus/data (private server app state: DB, logs, memory, media, agents, skills)
  ${volume_prefix}-root-home -> /root (Codex/Claude auth and root home settings)
  ${volume_prefix}-workspace -> /app/autobyteus-server-ts/workspace (existing build/runtime workspace volume)
Host bind mounts (host-visible user files):
  $(node_workspace_host_path "$node_name") -> ${WORKSPACE_CONTAINER_PATH} (this node's user workspace and default temp workspace)
  $(shared_workspace_host_path) -> ${SHARED_CONTAINER_PATH} (shared across launcher-managed Docker nodes)
Launcher state directory: $(state_root)
Note: adding these bind mounts to an existing container requires recreation; workspace apply keeps the named volumes above.
Note: existing /home/autobyteus/data/temp_workspace files remain in the data volume, but the default temp workspace becomes ${WORKSPACE_CONTAINER_PATH} after apply.
STORAGE
}

start_node() {
  local node_name="$1" image_ref="$2" prefer_defaults="$3" state_file container_name created_at attempt output start_check_output
  local desired_image_id current_image_id current_config_hash config_hash start_output
  state_file="$(state_path_for "$node_name")"
  load_state "$state_file"
  container_name="${CONTAINER_NAME:-$node_name}"
  created_at="${CREATED_AT:-$(now_utc)}"

  if container_exists "$container_name" && ! managed_container "$container_name"; then
    fail "Container ${container_name} already exists and is not managed by this launcher. Use --name with another friendly name."
  fi

  log "Checking image ${image_ref}"
  docker pull "$image_ref"
  desired_image_id="$(image_id_for "$image_ref")"
  [[ -n "$desired_image_id" ]] || fail "Could not inspect image ${image_ref} after pull."

  if container_exists "$container_name" \
    && [[ -n "${BACKEND_PORT:-}" && -n "${VNC_PORT:-}" && -n "${NOVNC_PORT:-}" && -n "${DEBUG_PORT:-}" ]]; then
    config_hash="$(desired_config_hash "$node_name" "$image_ref")"
    current_image_id="$(container_image_id "$container_name")"
    current_config_hash="$(container_config_hash "$container_name")"

    if [[ "$current_image_id" == "$desired_image_id" && "$current_config_hash" == "$config_hash" ]]; then
      if container_running "$container_name"; then
        write_state "$state_file" "$node_name" "$container_name" "$BACKEND_PORT" "$VNC_PORT" "$NOVNC_PORT" "$DEBUG_PORT" "$image_ref" "$created_at" "$config_hash"
        log "${node_name} is already running with the current image and launcher config."
        print_urls "$node_name" "$container_name" "$image_ref"
        return
      fi

      if start_output="$(docker start "$container_name" 2>&1)"; then
        if start_check_output="$(verify_container_started "$container_name" 2>&1)"; then
          write_state "$state_file" "$node_name" "$container_name" "$BACKEND_PORT" "$VNC_PORT" "$NOVNC_PORT" "$DEBUG_PORT" "$image_ref" "$created_at" "$config_hash"
          log "Started ${node_name}."
          print_urls "$node_name" "$container_name" "$image_ref"
          return
        fi
        start_output="${start_output}"$'\n'"${start_check_output}"
      fi

      if is_bind_failure "$start_output"; then
        log "Saved ports are unavailable; recreating ${node_name} with fresh ports."
        docker rm -f "$container_name" >/dev/null 2>&1 || true
        BACKEND_PORT="" VNC_PORT="" NOVNC_PORT="" DEBUG_PORT=""
      else
        fail "docker start failed: ${start_output}"
      fi
    elif [[ "$current_image_id" != "$desired_image_id" ]]; then
      log "Image changed for ${node_name}; recreating the managed container while keeping named volumes."
    elif [[ -z "$current_config_hash" ]]; then
      log "Refreshing ${node_name}; existing container predates launcher config tracking."
    else
      log "Launcher config changed for ${node_name}; recreating the managed container while keeping named volumes."
    fi
  fi

  for attempt in $(seq 1 "$MAX_RUN_ATTEMPTS"); do
    if [[ "$attempt" -gt 1 || -z "${BACKEND_PORT:-}" || -z "${VNC_PORT:-}" || -z "${NOVNC_PORT:-}" || -z "${DEBUG_PORT:-}" ]]; then
      choose_ports "$prefer_defaults"
      prefer_defaults=0
    fi
    config_hash="$(desired_config_hash "$node_name" "$image_ref")"

    if container_exists "$container_name"; then
      docker rm -f "$container_name" >/dev/null 2>&1 || true
    fi

    if output="$(run_container "$node_name" "$container_name" "$image_ref" "$config_hash")"; then
      if start_check_output="$(verify_container_started "$container_name" 2>&1)"; then
        write_state "$state_file" "$node_name" "$container_name" "$BACKEND_PORT" "$VNC_PORT" "$NOVNC_PORT" "$DEBUG_PORT" "$image_ref" "$created_at" "$config_hash"
        log "Started ${node_name}."
        print_urls "$node_name" "$container_name" "$image_ref"
        return
      fi
      output="${output}"$'\n'"${start_check_output}"
    fi

    docker rm -f "$container_name" >/dev/null 2>&1 || true
    if is_bind_failure "$output" && [[ "$attempt" -lt "$MAX_RUN_ATTEMPTS" ]]; then
      log "Port bind failed; retrying with fresh ports (attempt $((attempt + 1))/${MAX_RUN_ATTEMPTS})."
      BACKEND_PORT="" VNC_PORT="" NOVNC_PORT="" DEBUG_PORT=""
      continue
    fi
    fail "docker run failed: ${output}"
  done
}

image_id_in_use() {
  local image_id="$1" container current
  [[ -n "$image_id" ]] || return 1
  while IFS= read -r container; do
    [[ -n "$container" ]] || continue
    current="$(container_image_id "$container")"
    [[ "$current" == "$image_id" ]] && return 0
  done < <(docker ps -a --format '{{.Names}}' 2>/dev/null || true)
  return 1
}

remove_unused_image_ids() {
  local image_id seen=" "
  for image_id in "$@"; do
    [[ -n "$image_id" ]] || continue
    [[ "$seen" == *" ${image_id} "* ]] && continue
    seen+=" ${image_id}"
    if image_id_in_use "$image_id"; then
      log "Keeping image ${image_id}; it is still used by a Docker container."
      continue
    fi
    docker image inspect "$image_id" >/dev/null 2>&1 || continue
    if docker image rm "$image_id" >/dev/null 2>&1; then
      log "Removed unused AutoByteus server image ${image_id}."
    fi
  done
}

managed_container_image_ids() {
  local container image_id
  while IFS= read -r container; do
    [[ -n "$container" ]] || continue
    container_exists "$container" || continue
    image_id="$(container_image_id "$container")"
    [[ -n "$image_id" ]] && printf '%s\n' "$image_id"
  done < <(managed_container_names)
}

remove_all_state_files() {
  local file
  shopt -s nullglob
  for file in "$(state_dir)"/*.env; do
    rm -f "$file"
  done
  shopt -u nullglob
}

destroy_all_nodes() {
  local container image_id any=0 image_ids=()
  while IFS= read -r image_id; do
    [[ -n "$image_id" ]] && image_ids+=("$image_id")
  done < <(managed_container_image_ids)

  while IFS= read -r container; do
    [[ -n "$container" ]] || continue
    if container_exists "$container"; then
      docker rm -f "$container" >/dev/null
      log "Removed managed container ${container}. Named volumes were kept."
      any=1
    fi
  done < <(managed_container_names)

  remove_all_state_files

  if [[ "$any" != "1" ]]; then
    log "No managed Docker containers were found."
  fi
  remove_unused_image_ids "${image_ids[@]}"
}

upgrade_all_nodes() {
  local image_ref="$1" node image_id image_ids=() any=0 prefer_defaults
  while IFS= read -r image_id; do
    [[ -n "$image_id" ]] && image_ids+=("$image_id")
  done < <(managed_container_image_ids)

  while IFS= read -r node; do
    [[ -n "$node" ]] || continue
    prefer_defaults=0
    [[ "$node" == "$DEFAULT_NODE_NAME" ]] && prefer_defaults=1
    start_node "$node" "$image_ref" "$prefer_defaults"
    any=1
  done < <(managed_node_names)

  if [[ "$any" != "1" ]]; then
    log "No managed Docker nodes found."
    return
  fi
  remove_unused_image_ids "${image_ids[@]}"
}

create_new_container() {
  local image_ref="$1" node_name prefer_defaults=0
  node_name="$(next_node_name)"
  [[ "$node_name" == "$DEFAULT_NODE_NAME" ]] && prefer_defaults=1
  start_node "$node_name" "$image_ref" "$prefer_defaults"
}

reset_nodes() {
  local image_ref="$1"
  destroy_all_nodes
  start_node "$DEFAULT_NODE_NAME" "$image_ref" "1"
}

image_ref_for_node_or_default() {
  local node_name="$1" fallback_image_ref="$2" file
  file="$(state_path_for "$node_name")"
  if [[ -f "$file" ]]; then
    load_state "$file"
    if [[ -n "${IMAGE_REF:-}" ]]; then
      printf '%s\n' "$IMAGE_REF"
      return
    fi
  fi
  printf '%s\n' "$fallback_image_ref"
}

node_known_for_apply() {
  local node_name="$1"
  [[ -f "$(state_path_for "$node_name")" ]] && return 0
  [[ -n "$(container_for_node "$node_name")" ]] && return 0
  if container_exists "$node_name" && managed_container "$node_name"; then
    return 0
  fi
  return 1
}

show_workspace_paths() {
  local filter_name="$1" show_all="$2" node any=0
  if [[ "$show_all" == "1" ]]; then
    while IFS= read -r node; do
      [[ -n "$node" ]] || continue
      [[ "$any" == "0" ]] || printf '\n'
      print_workspace_paths_for_node "$node"
      any=1
    done < <(managed_node_names)
    [[ "$any" == "1" ]] || log "No managed Docker nodes found."
    return
  fi
  print_workspace_paths_for_node "$filter_name"
}

show_storage() {
  local filter_name="$1" show_all="$2" node any=0
  if [[ "$show_all" == "1" ]]; then
    while IFS= read -r node; do
      [[ -n "$node" ]] || continue
      [[ "$any" == "0" ]] || printf '\n'
      print_storage_for_node "$node"
      any=1
    done < <(managed_node_names)
    [[ "$any" == "1" ]] || log "No managed Docker nodes found."
    return
  fi
  print_storage_for_node "$filter_name"
}

apply_workspace_to_node() {
  local node_name="$1" fallback_image_ref="$2" node_image_ref prefer_defaults=0
  node_known_for_apply "$node_name" || fail "No managed Docker node found for ${node_name}. Run new-container first, or use workspace apply --all for existing managed nodes."
  node_image_ref="$(image_ref_for_node_or_default "$node_name" "$fallback_image_ref")"
  [[ "$node_name" == "$DEFAULT_NODE_NAME" ]] && prefer_defaults=1
  log "Applying shared workspace bind mounts to ${node_name}. Named volumes will be kept."
  start_node "$node_name" "$node_image_ref" "$prefer_defaults"
}

apply_workspace() {
  local filter_name="$1" show_all="$2" fallback_image_ref="$3" node any=0
  if [[ "$show_all" == "1" ]]; then
    while IFS= read -r node; do
      [[ -n "$node" ]] || continue
      apply_workspace_to_node "$node" "$fallback_image_ref"
      any=1
    done < <(managed_node_names)
    [[ "$any" == "1" ]] || log "No managed Docker nodes found."
    return
  fi
  apply_workspace_to_node "$filter_name" "$fallback_image_ref"
}

resolve_target_name() {
  local explicit_name="$1"
  if [[ -n "$explicit_name" ]]; then normalize_node_name "$explicit_name"; return; fi
  printf '%s\n' "$DEFAULT_NODE_NAME"
}

show_urls() {
  local node_name="$1" file
  file="$(state_path_for "$node_name")"
  [[ -f "$file" ]] || fail "No launcher state found for ${node_name}. Run new-container first."
  load_state "$file"
  print_urls "${NODE_NAME:-$node_name}" "${CONTAINER_NAME:-$node_name}" "${IMAGE_REF:-unknown}"
}

show_status() {
  local filter_name="$1" file any=0 status name container image
  printf '%-24s %-24s %-14s %-32s\n' "NODE" "CONTAINER" "STATUS" "BACKEND"
  shopt -s nullglob
  for file in "$(state_dir)"/*.env; do
    load_state "$file"
    name="${NODE_NAME:-$(basename "$file" .env)}"
    [[ -z "$filter_name" || "$name" == "$filter_name" ]] || continue
    container="${CONTAINER_NAME:-$name}"
    image="${IMAGE_REF:-unknown}"
    status="missing"
    if container_exists "$container"; then
      status="$(docker inspect --format '{{.State.Status}}' "$container" 2>/dev/null || printf 'unknown')"
    fi
    printf '%-24s %-24s %-14s http://localhost:%s (%s)\n' "$name" "$container" "$status" "${BACKEND_PORT:-?}" "$image"
    any=1
  done
  shopt -u nullglob
  [[ "$any" == "1" ]] || log "No managed Docker nodes found."
}

stop_nodes() {
  local filter_name="$1" stop_all="$2" file name container any=0
  shopt -s nullglob
  for file in "$(state_dir)"/*.env; do
    load_state "$file"
    name="${NODE_NAME:-$(basename "$file" .env)}"
    [[ "$stop_all" == "1" || "$name" == "$filter_name" ]] || continue
    container="${CONTAINER_NAME:-$name}"
    if container_exists "$container"; then
      docker stop "$container" >/dev/null
      log "Stopped ${name}. Named volumes were kept."
      any=1
    fi
  done
  shopt -u nullglob
  [[ "$any" == "1" ]] || fail "No matching managed Docker node was found."
}

show_logs() {
  local node_name="$1"; shift
  local file container
  file="$(state_path_for "$node_name")"
  [[ -f "$file" ]] || fail "No launcher state found for ${node_name}."
  load_state "$file"
  container="${CONTAINER_NAME:-$node_name}"
  container_exists "$container" || fail "Container ${container} was not found."
  if [[ "$#" -eq 0 ]]; then
    docker logs --tail 100 "$container"
  else
    docker logs "$@" "$container"
  fi
}

main() {
  local cmd="${1:-help}" stop_all=0 name_arg="" tag="$DEFAULT_TAG" image="$DEFAULT_IMAGE" extra=()
  [[ "$cmd" == "help" || "$cmd" == "--help" || "$cmd" == "-h" ]] && { usage; return; }
  shift || true
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --all) stop_all=1; shift ;;
      --name) [[ $# -gt 1 ]] || fail "--name requires a value"; name_arg="$2"; shift 2 ;;
      --tag) [[ $# -gt 1 ]] || fail "--tag requires a value"; tag="$2"; shift 2 ;;
      --image) [[ $# -gt 1 ]] || fail "--image requires a value"; image="$2"; shift 2 ;;
      -h|--help) usage; return ;;
      --) shift; extra+=("$@"); break ;;
      *) if [[ -z "$name_arg" && "$cmd" =~ ^(urls|ports|status|ps|stop|logs)$ ]]; then name_arg="$1"; else extra+=("$1"); fi; shift ;;
    esac
  done

  local node_name image_ref workspace_action

  case "$cmd" in
    install)
      [[ "${#extra[@]}" -eq 0 ]] || fail "Unknown ${cmd} option(s): ${extra[*]}"
      install_launcher
      return
      ;;
  esac

  case "$cmd" in
    new-container|upgrade|destroy|reset|workspace|storage|urls|ports|status|ps|stop|logs) ;;
    *) usage; exit 1 ;;
  esac

  ensure_state_dir
  assert_docker
  node_name="$(resolve_target_name "$name_arg")"
  image_ref="$(image_ref_for "$image" "$tag")"

  case "$cmd" in
    new-container)
      [[ "${#extra[@]}" -eq 0 ]] || fail "Unknown new-container option(s): ${extra[*]}"
      [[ "$stop_all" != "1" ]] || fail "new-container creates one node and does not accept --all."
      [[ -z "$name_arg" ]] || fail "new-container always chooses the next indexed name; do not pass --name."
      create_new_container "$image_ref"
      ;;
    upgrade)
      [[ "${#extra[@]}" -eq 0 ]] || fail "Unknown upgrade option(s): ${extra[*]}"
      [[ "$stop_all" == "1" ]] || fail "upgrade affects every managed node; rerun with --all."
      [[ -z "$name_arg" ]] || fail "upgrade --all does not accept --name."
      upgrade_all_nodes "$image_ref"
      ;;
    destroy)
      [[ "${#extra[@]}" -eq 0 ]] || fail "Unknown destroy option(s): ${extra[*]}"
      [[ "$stop_all" == "1" ]] || fail "destroy affects every managed node; rerun with --all."
      [[ -z "$name_arg" ]] || fail "destroy --all does not accept --name."
      destroy_all_nodes
      ;;
    reset)
      [[ "${#extra[@]}" -eq 0 ]] || fail "Unknown reset option(s): ${extra[*]}"
      [[ "$stop_all" != "1" ]] || fail "reset already applies to all managed nodes and does not accept --all."
      [[ -z "$name_arg" ]] || fail "reset always recreates ${DEFAULT_NODE_NAME}; do not pass --name."
      reset_nodes "$image_ref"
      ;;
    workspace)
      workspace_action="${extra[0]:-paths}"
      if [[ "$workspace_action" != "paths" && "$workspace_action" != "apply" ]]; then
        fail "Unknown workspace subcommand: ${workspace_action}. Use 'workspace paths' or 'workspace apply'."
      fi
      [[ "${#extra[@]}" -le 1 ]] || fail "Unknown workspace option(s): ${extra[*]:1}"
      if [[ "$workspace_action" == "paths" ]]; then
        show_workspace_paths "$node_name" "$stop_all"
      else
        apply_workspace "$node_name" "$stop_all" "$image_ref"
      fi
      ;;
    storage)
      [[ "${#extra[@]}" -eq 0 ]] || fail "Unknown storage option(s): ${extra[*]}"
      show_storage "$node_name" "$stop_all"
      ;;
    urls|ports) show_urls "$node_name" ;;
    status|ps) if [[ -n "$name_arg" ]]; then show_status "$node_name"; else show_status ""; fi ;;
    stop) stop_nodes "$node_name" "$stop_all" ;;
    logs) show_logs "$node_name" "${extra[@]}" ;;
    *) usage; exit 1 ;;
  esac
}

main "$@"
