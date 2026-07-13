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
  local node_name="$1" fallback_image_ref="$2" node_image_ref
  node_known_for_apply "$node_name" || fail "No managed Docker node found for ${node_name}. Run new-container first, or use workspace apply --all for existing managed nodes."
  node_image_ref="$(image_ref_for_node_or_default "$node_name" "$fallback_image_ref")"
  log "Applying shared workspace bind mounts to ${node_name}. Named volumes will be kept."
  start_node "$node_name" "$node_image_ref"
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

strict_destroy_node_name() {
  local raw="$1" normalized
  [[ -n "$raw" ]] || return 1
  normalized="$(printf '%s' "$raw" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-')"
  normalized="${normalized#-}"
  normalized="${normalized%-}"
  [[ -n "$normalized" ]] || return 1
  printf '%s\n' "$normalized"
}

show_urls_for_node() {
  local node_name="$1" file
  file="$(state_path_for "$node_name")"
  [[ -f "$file" ]] || fail "No launcher state found for ${node_name}. Run new-container first."
  load_state "$file"
  print_urls "${NODE_NAME:-$node_name}" "${CONTAINER_NAME:-$node_name}" "${IMAGE_REF:-unknown}"
}

show_urls() {
  local filter_name="$1" show_all="$2" node any=0
  if [[ "$show_all" == "1" || -z "$filter_name" ]]; then
    while IFS= read -r node; do
      [[ -n "$node" ]] || continue
      [[ "$any" == "0" ]] || printf '\n'
      show_urls_for_node "$node"
      any=1
    done < <(managed_node_names)
    [[ "$any" == "1" ]] || log "No managed Docker nodes found."
    return
  fi
  show_urls_for_node "$filter_name"
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
  local cmd="${1:-help}" stop_all=0 name_arg="" name_seen=0 name_option_count=0 tag="$DEFAULT_TAG" image="$DEFAULT_IMAGE" image_ref_override_explicit=0 extra=() destroy_node_name=""
  [[ "$cmd" == "help" || "$cmd" == "--help" || "$cmd" == "-h" ]] && { usage; return; }
  shift || true
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --all) stop_all=1; shift ;;
      --name) [[ $# -gt 1 && "$2" != -* ]] || fail "--name requires a value"; name_arg="$2"; name_seen=1; name_option_count=$((name_option_count + 1)); shift 2 ;;
      --tag) [[ $# -gt 1 ]] || fail "--tag requires a value"; tag="$2"; image_ref_override_explicit=1; shift 2 ;;
      --image) [[ $# -gt 1 ]] || fail "--image requires a value"; image="$2"; image_ref_override_explicit=1; shift 2 ;;
      -h|--help) usage; return ;;
      --) shift; extra+=("$@"); break ;;
      *) if [[ -z "$name_arg" && "$cmd" =~ ^(urls|ports|status|ps|stop|logs)$ ]]; then name_arg="$1"; else extra+=("$1"); fi; shift ;;
    esac
  done

  local node_name image_ref workspace_action

  case "$cmd" in
    new-container|upgrade|destroy|reset|workspace|storage|urls|ports|status|ps|stop|logs) ;;
    *) usage; exit 1 ;;
  esac

  case "$cmd" in
    new-container|upgrade|destroy|reset|storage)
      [[ "${#extra[@]}" -eq 0 ]] || fail "Unknown ${cmd} option(s): ${extra[*]}"
      ;;
  esac

  if [[ "$cmd" == "destroy" ]]; then
    [[ "${#extra[@]}" -eq 0 ]] || fail "Unknown destroy option(s): ${extra[*]}"
    [[ "$name_option_count" -le 1 ]] || fail "destroy accepts only one --name selector."
    if [[ "$stop_all" == "1" && "$name_seen" == "1" ]]; then
      fail "destroy requires exactly one of --all or --name <node>; do not combine them."
    fi
    [[ "$stop_all" == "1" || "$name_seen" == "1" ]] || fail "destroy requires exactly one of --all or --name <node>."
    if [[ "$name_seen" == "1" ]]; then
      destroy_node_name="$(strict_destroy_node_name "$name_arg")" || fail "destroy --name requires a non-empty managed node name."
    fi
  fi

  ensure_state_dir
  assert_docker
  if [[ "$cmd" == "destroy" && "$stop_all" != "1" ]]; then
    node_name="$destroy_node_name"
  else
    node_name="$(resolve_target_name "$name_arg")"
  fi
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
      upgrade_all_nodes "$image_ref" "$image_ref_override_explicit"
      ;;
    destroy)
      if [[ "$stop_all" == "1" ]]; then
        destroy_all_nodes
      else
        destroy_node "$node_name"
      fi
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
        [[ "$stop_all" != "1" || -z "$name_arg" ]] || fail "workspace paths does not accept --all with --name."
        if [[ "$stop_all" == "1" || -z "$name_arg" ]]; then
          show_workspace_paths "" "1"
        else
          show_workspace_paths "$node_name" "0"
        fi
      else
        apply_workspace "$node_name" "$stop_all" "$image_ref"
      fi
      ;;
    storage)
      [[ "${#extra[@]}" -eq 0 ]] || fail "Unknown storage option(s): ${extra[*]}"
      [[ "$stop_all" != "1" || -z "$name_arg" ]] || fail "storage does not accept --all with --name."
      if [[ "$stop_all" == "1" || -z "$name_arg" ]]; then
        show_storage "" "1"
      else
        show_storage "$node_name" "0"
      fi
      ;;
    urls|ports)
      [[ "${#extra[@]}" -eq 0 ]] || fail "Unknown ${cmd} option(s): ${extra[*]}"
      [[ "$stop_all" != "1" || -z "$name_arg" ]] || fail "${cmd} does not accept --all with a node name."
      if [[ "$stop_all" == "1" || -z "$name_arg" ]]; then
        show_urls "" "1"
      else
        show_urls "$node_name" "0"
      fi
      ;;
    status|ps) if [[ -n "$name_arg" ]]; then show_status "$node_name"; else show_status ""; fi ;;
    stop) stop_nodes "$node_name" "$stop_all" ;;
    logs) show_logs "$node_name" "${extra[@]}" ;;
    *) usage; exit 1 ;;
  esac
}
