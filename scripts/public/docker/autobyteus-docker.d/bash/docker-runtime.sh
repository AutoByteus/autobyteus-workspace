desired_config_hash() {
  local node_name="$1" image_ref="$2" volume_prefix workspace_root node_workspace_host shared_host
  volume_prefix="$(volume_prefix_for "$node_name")"
  workspace_root="$(shared_workspace_root)"
  node_workspace_host="$(node_workspace_host_path "$node_name")"
  shared_host="$(shared_workspace_host_path)"
  printf 'version=%s\nnode=%s\nimage=%s\nbackend=%s\nvnc=%s\nnovnc=%s\ndebug=%s\nworkspace_volume=%s-workspace\ndata_volume=%s-data\nroot_volume=%s-root-home\nchromium_profile_volume=%s-chromium-profile\nchromium_profile_target=%s\nshared_workspace_root=%s\nnode_workspace_host=%s\nnode_workspace_target=%s\nshared_workspace_host=%s\nshared_workspace_target=%s\ntemp_workspace_env=AUTOBYTEUS_TEMP_WORKSPACE_DIR=%s\nserver_host=http://localhost:%s\nvnc_hosts=localhost:%s\n' \
    "$CONFIG_HASH_VERSION" "$node_name" "$image_ref" "$BACKEND_PORT" "$VNC_PORT" "$NOVNC_PORT" "$DEBUG_PORT" "$volume_prefix" "$volume_prefix" "$volume_prefix" "$volume_prefix" "$CHROMIUM_PROFILE_CONTAINER_PATH" "$workspace_root" "$node_workspace_host" "$WORKSPACE_CONTAINER_PATH" "$shared_host" "$SHARED_CONTAINER_PATH" "$TEMP_WORKSPACE_ENV_VALUE" "$BACKEND_PORT" "$NOVNC_PORT" | hash_text
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

node_index_for_friendly_ports() {
  local node_name="$1" suffix
  case "$node_name" in
    ${NODE_NAME_PREFIX}-*)
      suffix="${node_name#${NODE_NAME_PREFIX}-}"
      [[ "$suffix" =~ ^[0-9]+$ ]] || return 1
      printf '%s\n' "$suffix"
      return 0
      ;;
  esac
  return 1
}

preferred_port_for_node() {
  local node_name="$1" base="$2" index
  if index="$(node_index_for_friendly_ports "$node_name")"; then
    printf '%s\n' $((base + index))
    return 0
  fi
  return 1
}

choose_ports_for_node() {
  local node_name="$1" allow_friendly_preferences="$2"
  local preferred_backend="" preferred_vnc="" preferred_novnc="" preferred_debug=""
  collect_used_ports
  if [[ "$allow_friendly_preferences" == "1" ]]; then
    preferred_backend="$(preferred_port_for_node "$node_name" 8001 || true)"
    preferred_vnc="$(preferred_port_for_node "$node_name" 5908 || true)"
    preferred_novnc="$(preferred_port_for_node "$node_name" 6080 || true)"
    preferred_debug="$(preferred_port_for_node "$node_name" 9228 || true)"
  fi
  BACKEND_PORT="$(pick_port "$preferred_backend")"
  VNC_PORT="$(pick_port "$preferred_vnc")"
  NOVNC_PORT="$(pick_port "$preferred_novnc")"
  DEBUG_PORT="$(pick_port "$preferred_debug")"
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
  local run_args=(
    --name "$container_name" \
    --restart unless-stopped \
    --label "${LAUNCHER_LABEL_KEY}=${LAUNCHER_LABEL_VALUE}" \
    --label "${NODE_LABEL_KEY}=${node_name}" \
    --label "${CONFIG_LABEL_KEY}=${config_hash}" \
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
    -v "${volume_prefix}-chromium-profile:${CHROMIUM_PROFILE_CONTAINER_PATH}" \
    --cap-add SYS_ADMIN \
    --security-opt seccomp=unconfined \
    -p "${BACKEND_PORT}:8000" \
    -p "${VNC_PORT}:5900" \
    -p "${NOVNC_PORT}:6080" \
    -p "${DEBUG_PORT}:9223" \
    --mount "type=bind,source=${node_workspace_host},target=${WORKSPACE_CONTAINER_PATH}" \
    --mount "type=bind,source=${shared_host},target=${SHARED_CONTAINER_PATH}"
  )

  output="$(docker run -d "${run_args[@]}" "$image_ref" 2>&1)"
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
Next step: paste Backend into Add Remote Node in AutoByteus. Then open that node over your trusted private network.
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
  ${volume_prefix}-chromium-profile -> ${CHROMIUM_PROFILE_CONTAINER_PATH} (private Chromium browser profile state: cookies, local storage, preferences)
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
  local node_name="$1" image_ref="$2" state_file container_name created_at attempt output start_check_output
  local desired_image_id current_image_id current_config_hash config_hash start_output
  local allow_friendly_preferences=1
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
        allow_friendly_preferences=0
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
      choose_ports_for_node "$node_name" "$allow_friendly_preferences"
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
      allow_friendly_preferences=0
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
  local image_ref="$1" node image_id image_ids=() any=0
  while IFS= read -r image_id; do
    [[ -n "$image_id" ]] && image_ids+=("$image_id")
  done < <(managed_container_image_ids)

  while IFS= read -r node; do
    [[ -n "$node" ]] || continue
    start_node "$node" "$image_ref"
    any=1
  done < <(managed_node_names)

  if [[ "$any" != "1" ]]; then
    log "No managed Docker nodes found."
    return
  fi
  remove_unused_image_ids "${image_ids[@]}"
}

create_new_container() {
  local image_ref="$1" node_name
  node_name="$(next_node_name)"
  start_node "$node_name" "$image_ref"
}

reset_nodes() {
  local image_ref="$1"
  destroy_all_nodes
  start_node "$DEFAULT_NODE_NAME" "$image_ref"
}
