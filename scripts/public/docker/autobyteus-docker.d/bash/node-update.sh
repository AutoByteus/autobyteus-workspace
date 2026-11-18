# In-place server updates of managed nodes. The launcher talks to each node's starter only through
# its host command (cli.mjs, C2), run inside the node's container; the container's own node reads
# the one JSON line it prints, so the host needs no JSON tool.
# shellcheck disable=SC2154 # the STARTER_<field> variables are set by starter_call through printf -v
STARTER_CLI="/opt/autobyteus/starter/cli.mjs"
UPDATE_POLL_SECONDS=2
UPDATE_WAIT_SECONDS=3600

# Reads the starter's JSON answer on stdin and prints the fields the launcher shows, as key<TAB>value.
# shellcheck disable=SC2016 # JavaScript for the container's node, not for the shell
STARTER_FIELDS_JS='let s="";process.stdin.on("data",d=>{s+=d}).on("end",()=>{let j;try{j=JSON.parse(s)}catch{j={message:s.trim()}}
const u=j.update||{},b=j.updateBlocker||{};const f={accepted:j.accepted,refused:j.refused,message:j.message,version:j.version,
state:j.state,update_state:u.state,update_step:u.step,update_code:u.code,update_message:u.message,update_target:u.targetVersion,
blocker_code:b.code,blocker_message:b.message};for(const[k,v]of Object.entries(f))if(v!==undefined&&v!==null&&v!=="")
process.stdout.write(k+"\t"+String(v).replace(/\s+/g," ")+"\n")})'
STARTER_FIELDS=(accepted refused message version state update_state update_step update_code update_message update_target blocker_code blocker_message)

# Runs `cli.mjs <args>` in a container. Sets STARTER_EXIT (0 ok/accepted, 2 refused, 1 error or no
# starter) and STARTER_<field> for each field of its answer (empty when absent).
starter_call() {
  local container="$1" output key value
  shift
  for key in "${STARTER_FIELDS[@]}"; do printf -v "STARTER_${key}" '%s' ""; done
  # shellcheck disable=SC2016 # expanded by the container's sh
  output="$(docker exec "$container" sh -c 'js="$0"; cli="$1"; shift; answer="$(node "$cli" "$@" 2>/dev/null)"; code=$?
printf "%s" "$answer" | node -e "$js"; exit $code' "$STARTER_FIELDS_JS" "$STARTER_CLI" "$@" 2>/dev/null)" && STARTER_EXIT=0 || STARTER_EXIT=$?
  while IFS=$'\t' read -r key value; do
    if [[ -n "$key" && " ${STARTER_FIELDS[*]} " == *" ${key} "* ]]; then printf -v "STARTER_${key}" '%s' "$value"; fi
  done <<< "$output"
  return 0
}

# The track an update without --version follows, from the node's saved image ref. Prints the track,
# or the reason it has none (and returns 1).
update_track_for_image_ref() {
  local image_ref="$1" repository tag
  if [[ "$image_ref" =~ ^(.+):([^/:]+)$ ]]; then
    repository="${BASH_REMATCH[1]}"
    tag="${BASH_REMATCH[2]}"
  else
    repository="$image_ref"
    tag="latest"
  fi
  repository="${repository#docker.io/}"
  if [[ "$repository" != "$DEFAULT_IMAGE" ]]; then
    printf 'This node uses a custom image (%s); pass --version.\n' "$image_ref"
    return 1
  fi
  case "$tag" in
    latest|latest-zh) printf 'stable\n' ;;
    beta) printf 'beta\n' ;;
    *) printf 'This node is pinned to %s; pass --version.\n' "$tag"; return 1 ;;
  esac
}

# One line under a node in `status`: what its starter runs, or why that is not known.
print_starter_line() {
  local container="$1" docker_status="$2"
  if [[ "$docker_status" != "running" ]]; then
    printf '  server: not available (container %s)\n' "$docker_status"
    return
  fi
  starter_call "$container" status
  if [[ "$STARTER_EXIT" != "0" || -z "$STARTER_state" ]]; then
    printf '  server: not available (no starter answer; images before the starter have none)\n'
  elif [[ "$STARTER_state" == "needsNewImage" ]]; then
    printf '  server: no server runs: %s\n' "$STARTER_message"
  else
    local line="  server: ${STARTER_version}"
    [[ "$STARTER_update_state" != "running" ]] || line+=", updating to ${STARTER_update_target} (${STARTER_update_step})"
    [[ -z "$STARTER_blocker_code" ]] || line+=", in-place update unavailable: ${STARTER_blocker_message}"
    printf '%s\n' "$line"
  fi
}

# Updates one node in place and follows the update to its result.
update_node() {
  local name="$1" version="$2" file container track args=() target last_step="" waited=0
  file="$(state_path_for "$name")"
  [[ -f "$file" ]] || { log "${name}: no launcher state found."; return 1; }
  load_state "$file"
  container="${CONTAINER_NAME:-$name}"
  container_running "$container" || { log "${name}: the container is not running; start it first."; return 1; }
  if [[ -n "$version" ]]; then
    args=(--version "$version")
  else
    track="$(update_track_for_image_ref "${IMAGE_REF:-}")" || { log "${name}: ${track}"; return 1; }
    args=(--track "$track")
  fi
  starter_call "$container" update "${args[@]}"
  case "$STARTER_EXIT" in
    0) target="$STARTER_version" ;;
    2) log "${name}: refused (${STARTER_refused}): ${STARTER_message}"; return 1 ;;
    *) log "${name}: the node's starter did not answer${STARTER_message:+: ${STARTER_message}}. Images before the starter cannot update in place; run: autobyteus-docker upgrade --all"; return 1 ;;
  esac
  log "${name}: updating to ${target}"
  while (( waited < UPDATE_WAIT_SECONDS )); do
    sleep "$UPDATE_POLL_SECONDS"
    waited=$((waited + UPDATE_POLL_SECONDS))
    starter_call "$container" status
    [[ "$STARTER_EXIT" == "0" && "$STARTER_update_target" == "$target" ]] || continue
    case "$STARTER_update_state" in
      running)
        [[ "$STARTER_update_step" == "$last_step" ]] || log "${name}: ${STARTER_update_step}"
        last_step="$STARTER_update_step"
        ;;
      succeeded) log "${name}: ${STARTER_update_message}"; return 0 ;;
      *) log "${name}: ${STARTER_update_state} (${STARTER_update_code}): ${STARTER_update_message}"; return 1 ;;
    esac
  done
  log "${name}: no result after ${UPDATE_WAIT_SECONDS} s; see: autobyteus-docker status --name ${name}"
  return 1
}

# `update [--name <node> | --all] [--version <version>]`: one node, or every managed node in turn.
update_nodes() {
  local node_name="$1" update_all="$2" version="$3" name names failed=0
  if [[ "$update_all" != "1" ]]; then
    update_node "$node_name" "$version"
    return
  fi
  names="$(managed_node_names)"
  [[ -n "$names" ]] || fail "No managed Docker node was found."
  while IFS= read -r name; do
    update_node "$name" "$version" < /dev/null || failed=1
  done <<< "$names"
  return "$failed"
}
