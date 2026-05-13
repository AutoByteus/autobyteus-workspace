#!/usr/bin/env bash
set -euo pipefail

LAUNCHER_LABEL_KEY="com.autobyteus.launcher"
LAUNCHER_LABEL_VALUE="server-docker"
NODE_LABEL_KEY="com.autobyteus.nodeName"
CONFIG_LABEL_KEY="com.autobyteus.configHash"
CONFIG_HASH_VERSION="v1"
DEFAULT_NODE_NAME="autobyteus-server"
DEFAULT_IMAGE="autobyteus/autobyteus-server"
DEFAULT_TAG="latest"
MAX_RUN_ATTEMPTS=5
USED_PORTS=""
PUBLIC_BASH_SCRIPT_URL="https://raw.githubusercontent.com/AutoByteus/autobyteus-workspace/personal/scripts/public/docker/autobyteus-docker.sh"

usage() {
  cat <<USAGE
AutoByteus Docker node launcher

Usage:
  autobyteus-docker <command> [options]
  curl -fsSL <script-url> | bash -s -- install

Commands:
  install            Install or update the local autobyteus-docker CLI
  update             Alias for install
  start              Check image updates and start the default Docker node
  start --new        Start a new Docker node with automatic name and ports
  urls | ports       Show Backend, GraphQL, noVNC, VNC, and debug URLs
  status | ps        Show managed Docker nodes
  logs               Show Docker logs for a managed node
  stop [--all]       Stop one or all managed Docker nodes
  help               Show this help

Advanced temporary use: curl -fsSL <script-url> | bash -s -- <command> [options]

Options:
  --name <name>      Friendly node name (default: ${DEFAULT_NODE_NAME})
  --tag <tag>        Docker image tag (default: ${DEFAULT_TAG})
  --image <image>    Docker image repository or full image ref (default: ${DEFAULT_IMAGE})
  --new              Create the next available friendly node name
  --all              Apply stop/status to all managed nodes
  -h, --help         Show this help

State:
  Default install path: \$HOME/.local/bin/autobyteus-docker
  Default state directory: \$HOME/.autobyteus/docker-server
  Overrides: AUTOBYTEUS_DOCKER_INSTALL_DIR, AUTOBYTEUS_DOCKER_STATE_DIR
USAGE
}

log() { printf '[AutoByteus Docker] %s\n' "$*"; }
fail() { printf 'error: %s\n' "$*" >&2; exit 1; }
now_utc() { date -u '+%Y-%m-%dT%H:%M:%SZ'; }

state_root() { printf '%s\n' "${AUTOBYTEUS_DOCKER_STATE_DIR:-${HOME}/.autobyteus/docker-server}"; }
state_dir() { printf '%s/nodes\n' "$(state_root)"; }
ensure_state_dir() { mkdir -p "$(state_dir)"; }

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
  printf 'Next commands:\n  autobyteus-docker start\n  autobyteus-docker start --new\n  autobyteus-docker urls\n'
  if path_has_dir "$dir"; then
    log "Install directory is already on PATH."
    return
  fi

  printf 'PATH guidance:\n  This shell cannot find autobyteus-docker until %s is on PATH.\n  Use direct path now: "%s" start\n  For this shell session: export PATH="%s:%s"\n  To persist, add that export line to your shell profile, then open a new terminal.\n' "$dir" "$install_path" "$dir" "\$PATH"
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
  local node_name="$1" image_ref="$2" volume_prefix
  volume_prefix="$(volume_prefix_for "$node_name")"
  printf 'version=%s\nnode=%s\nimage=%s\nbackend=%s\nvnc=%s\nnovnc=%s\ndebug=%s\nworkspace_volume=%s-workspace\ndata_volume=%s-data\nroot_volume=%s-root-home\nserver_host=http://localhost:%s\nvnc_hosts=localhost:%s\n' \
    "$CONFIG_HASH_VERSION" "$node_name" "$image_ref" "$BACKEND_PORT" "$VNC_PORT" "$NOVNC_PORT" "$DEBUG_PORT" "$volume_prefix" "$volume_prefix" "$volume_prefix" "$BACKEND_PORT" "$NOVNC_PORT" | hash_text
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
  local base="$DEFAULT_NODE_NAME" index candidate
  if node_name_available "$base"; then printf '%s\n' "$base"; return; fi
  index=2
  while true; do
    candidate="${base}-${index}"
    if node_name_available "$candidate"; then printf '%s\n' "$candidate"; return; fi
    index=$((index + 1))
  done
}

volume_prefix_for() { printf '%s\n' "$(normalize_node_name "$1")"; }

run_container() {
  local node_name="$1" container_name="$2" image_ref="$3" config_hash="$4" output volume_prefix
  volume_prefix="$(volume_prefix_for "$node_name")"
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
    -v "${volume_prefix}-workspace:/app/autobyteus-server-ts/workspace" \
    -v "${volume_prefix}-data:/home/autobyteus/data" \
    -v "${volume_prefix}-root-home:/root" \
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
Next step: paste Backend into Add Remote Node in AutoByteus.
URLS
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

resolve_target_name() {
  local explicit_name="$1" create_new="$2"
  if [[ -n "$explicit_name" ]]; then normalize_node_name "$explicit_name"; return; fi
  if [[ "$create_new" == "1" ]]; then next_node_name; return; fi
  printf '%s\n' "$DEFAULT_NODE_NAME"
}

show_urls() {
  local node_name="$1" file
  file="$(state_path_for "$node_name")"
  [[ -f "$file" ]] || fail "No launcher state found for ${node_name}. Run start first."
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
  local cmd="${1:-help}" create_new=0 stop_all=0 name_arg="" tag="$DEFAULT_TAG" image="$DEFAULT_IMAGE" extra=()
  [[ "$cmd" == "help" || "$cmd" == "--help" || "$cmd" == "-h" ]] && { usage; return; }
  shift || true
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --new) create_new=1; shift ;;
      --all) stop_all=1; shift ;;
      --name) [[ $# -gt 1 ]] || fail "--name requires a value"; name_arg="$2"; shift 2 ;;
      --tag) [[ $# -gt 1 ]] || fail "--tag requires a value"; tag="$2"; shift 2 ;;
      --image) [[ $# -gt 1 ]] || fail "--image requires a value"; image="$2"; shift 2 ;;
      -h|--help) usage; return ;;
      --) shift; extra+=("$@"); break ;;
      *) if [[ -z "$name_arg" && "$cmd" =~ ^(urls|ports|status|ps|stop|logs)$ ]]; then name_arg="$1"; else extra+=("$1"); fi; shift ;;
    esac
  done

  local node_name image_ref prefer_defaults

  case "$cmd" in
    install|update)
      [[ "${#extra[@]}" -eq 0 ]] || fail "Unknown ${cmd} option(s): ${extra[*]}"
      install_launcher
      return
      ;;
  esac

  ensure_state_dir
  assert_docker
  node_name="$(resolve_target_name "$name_arg" "$create_new")"
  image_ref="$(image_ref_for "$image" "$tag")"

  case "$cmd" in
    start)
      [[ "${#extra[@]}" -eq 0 ]] || fail "Unknown start option(s): ${extra[*]}"
      prefer_defaults=0
      [[ "$node_name" == "$DEFAULT_NODE_NAME" && "$create_new" == "0" && -z "$name_arg" ]] && prefer_defaults=1
      start_node "$node_name" "$image_ref" "$prefer_defaults"
      ;;
    urls|ports) show_urls "$node_name" ;;
    status|ps) if [[ -n "$name_arg" ]]; then show_status "$node_name"; else show_status ""; fi ;;
    stop) stop_nodes "$node_name" "$stop_all" ;;
    logs) show_logs "$node_name" "${extra[@]}" ;;
    *) usage; exit 1 ;;
  esac
}

main "$@"
