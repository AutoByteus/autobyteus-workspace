# Optional root-owned reference, published only by a consented successful NFS apply.
# This module never mounts storage, sources privileged config, or repairs missing identity.
resolve_nfs_attachment() {
  local node="$1" ref helper output container label
  NFS_STORAGE_ID="" NFS_MOUNT_ROOT="" NFS_VOLUME="" NFS_DESCRIPTOR_DIR=""
  ref="/etc/autobyteus-nfs/nodes/${node}.json"
  if [[ ! -e "$ref" ]]; then
    container="$(container_for_node "$node")"
    if [[ -n "$container" ]]; then
      label="$(docker inspect --format '{{ index .Config.Labels "com.autobyteus.nfs.storageId" }}' "$container" 2>/dev/null || true)"
      [[ -z "$label" || "$label" == '<no value>' ]] || fail "Node ${node} has a shared attachment but its owned reference is missing. Repair it with AutoByteus NFS; no local replacement will be made."
    fi
    return 0
  fi
  helper="${HOME}/.local/bin/autobyteus-nfs"
  [[ -x "$helper" ]] || fail "Node ${node} is opted into AutoByteus NFS but its CLI is unavailable. Run the NFS installer before upgrading this node."
  output="$("$helper" launcher-attachment --nodes "$node")" || fail "Cannot validate the selected NFS attachment; node unchanged."
  local fields=() line
  while IFS= read -r line; do fields+=("$line"); done <<< "$output"
  [[ "${#fields[@]}" == 7 ]] || fail "Malformed NFS attachment response."
  NFS_STORAGE_ID="${fields[0]}" NFS_MOUNT_ROOT="${fields[1]}" NFS_VOLUME="${fields[2]}" NFS_DESCRIPTOR_DIR="${fields[3]}"
  [[ "$NFS_STORAGE_ID" =~ ^[a-f0-9-]{36}$ && "$NFS_VOLUME" == "autobyteus-nfs-${NFS_STORAGE_ID}" && "$NFS_DESCRIPTOR_DIR" == /etc/autobyteus-nfs && "$NFS_MOUNT_ROOT" == /* && "$NFS_MOUNT_ROOT" != / && "$NFS_MOUNT_ROOT" != *,* ]] || fail "Invalid NFS attachment response."
  [[ "$(docker info --format '{{.ID}}')" == "${fields[4]}" ]] || fail "Current Docker context is not the selected NFS daemon; node unchanged."
  local volume_fields
  volume_fields="$(docker volume inspect --format '{{.Driver}}|{{index .Labels "com.autobyteus.nfs.storageId"}}|{{index .Options "type"}}|{{index .Options "device"}}|{{index .Options "o"}}' "$NFS_VOLUME")" || fail "Owned NFS volume is missing; reconnect with AutoByteus NFS before recreating this node."
  [[ "$volume_fields" == "local|${NFS_STORAGE_ID}|nfs|${fields[5]}|${fields[6]}" ]] || fail "NFS volume driver/options/identity changed; no local replacement will be made."
}

append_nfs_run_args() {
  [[ -n "$NFS_STORAGE_ID" ]] || return 0
  run_args+=(
    --label "com.autobyteus.nfs.storageId=${NFS_STORAGE_ID}"
    --mount "type=volume,source=${NFS_VOLUME},target=${NFS_MOUNT_ROOT},volume-nocopy"
    --mount "type=bind,source=${NFS_DESCRIPTOR_DIR},target=/etc/autobyteus-nfs,readonly"
  )
}
