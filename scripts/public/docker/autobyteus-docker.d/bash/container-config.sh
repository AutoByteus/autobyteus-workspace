# Launcher desired configuration, exact argument construction and the storage text.
desired_config_hash() {
  local node_name="$1" image_ref="$2" volume_prefix workspace_root node_workspace_host shared_host
  volume_prefix="$(volume_prefix_for "$node_name")"
  workspace_root="$(shared_workspace_root)"
  node_workspace_host="$(node_workspace_host_path "$node_name")"
  shared_host="$(shared_workspace_host_path)"
  { printf 'version=%s\nnode=%s\nimage=%s\nbackend=%s\nvnc=%s\nnovnc=%s\ndebug=%s\nworkspace_volume=%s-workspace\ndata_volume=%s-data\nroot_volume=%s-root-home\nchromium_profile_volume=%s-chromium-profile\nchromium_profile_target=%s\nserver_packages_volume=%s-server-packages\nserver_packages_target=%s\nshared_workspace_root=%s\nnode_workspace_host=%s\nnode_workspace_target=%s\nshared_workspace_host=%s\nshared_workspace_target=%s\ntemp_workspace_env=AUTOBYTEUS_TEMP_WORKSPACE_DIR=%s\nserver_host=http://localhost:%s\nvnc_hosts=localhost:%s\n' \
    "$CONFIG_HASH_VERSION" "$node_name" "$image_ref" "$BACKEND_PORT" "$VNC_PORT" "$NOVNC_PORT" "$DEBUG_PORT" "$volume_prefix" "$volume_prefix" "$volume_prefix" "$volume_prefix" "$CHROMIUM_PROFILE_CONTAINER_PATH" "$volume_prefix" "$SERVER_PACKAGES_CONTAINER_PATH" "$workspace_root" "$node_workspace_host" "$WORKSPACE_CONTAINER_PATH" "$shared_host" "$SHARED_CONTAINER_PATH" "$TEMP_WORKSPACE_ENV_VALUE" "$BACKEND_PORT" "$NOVNC_PORT"
  } | hash_text
}

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
    -e AUTOBYTEUS_DATA_DIR=/home/autobyteus/data \
    -e AUTOBYTEUS_BIND_HOST=0.0.0.0 \
    -e AUTOBYTEUS_SERVER_PORT=8000 \
    -e "AUTOBYTEUS_SERVER_HOST=http://localhost:${BACKEND_PORT}" \
    -e "AUTOBYTEUS_VNC_SERVER_HOSTS=localhost:${NOVNC_PORT}" \
    -e APP_ENV=production \
    -e DB_TYPE=sqlite \
    -e LOG_LEVEL=INFO \
    -e "AUTOBYTEUS_TEMP_WORKSPACE_DIR=${TEMP_WORKSPACE_ENV_VALUE}" \
    -v "${volume_prefix}-workspace:/app/autobyteus-server-ts/workspace" \
    -v "${volume_prefix}-data:/home/autobyteus/data" \
    -v "${volume_prefix}-root-home:/root" \
    -v "${volume_prefix}-chromium-profile:${CHROMIUM_PROFILE_CONTAINER_PATH}" \
    -v "${volume_prefix}-server-packages:${SERVER_PACKAGES_CONTAINER_PATH}" \
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

print_storage_for_node() {
  local node_name="$1" volume_prefix
  volume_prefix="$(volume_prefix_for "$node_name")"
  cat <<STORAGE
AutoByteus Docker storage: ${node_name}
Private Docker named volumes (kept during recreate/destroy/reset):
  ${volume_prefix}-data -> /home/autobyteus/data (private server app state: DB, logs, memory, media, agents, skills)
  ${volume_prefix}-root-home -> /root (Codex/Claude auth and root home settings)
  ${volume_prefix}-chromium-profile -> ${CHROMIUM_PROFILE_CONTAINER_PATH} (private Chromium browser profile state: cookies, local storage, preferences)
  ${volume_prefix}-server-packages -> ${SERVER_PACKAGES_CONTAINER_PATH} (server packages the node installed in place, and the starter's update state)
  ${volume_prefix}-workspace -> /app/autobyteus-server-ts/workspace (existing build/runtime workspace volume)
Host bind mounts (host-visible user files):
  $(node_workspace_host_path "$node_name") -> ${WORKSPACE_CONTAINER_PATH} (this node's user workspace and default temp workspace)
  $(shared_workspace_host_path) -> ${SHARED_CONTAINER_PATH} (shared across launcher-managed Docker nodes)
Launcher state directory: $(state_root)
Note: adding these bind mounts to an existing container requires recreation; workspace apply keeps the named volumes above.
Note: existing /home/autobyteus/data/temp_workspace files remain in the data volume, but the default temp workspace becomes ${WORKSPACE_CONTAINER_PATH} after apply.
STORAGE
}
