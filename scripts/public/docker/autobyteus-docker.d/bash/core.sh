
LAUNCHER_LABEL_KEY="com.autobyteus.launcher"
LAUNCHER_LABEL_VALUE="server-docker"
NODE_LABEL_KEY="com.autobyteus.nodeName"
CONFIG_LABEL_KEY="com.autobyteus.configHash"
CONFIG_HASH_VERSION="v6"
NODE_NAME_PREFIX="autobyteus-server"
DEFAULT_NODE_NAME="${NODE_NAME_PREFIX}-0"
DEFAULT_IMAGE="autobyteus/autobyteus-server"
DEFAULT_TAG="latest"
MAX_RUN_ATTEMPTS=5
USED_PORTS=""
WORKSPACE_CONTAINER_PATH="/home/autobyteus/workspace"
SHARED_CONTAINER_PATH="/home/autobyteus/shared"
TEMP_WORKSPACE_ENV_VALUE="${WORKSPACE_CONTAINER_PATH}"
CHROMIUM_PROFILE_CONTAINER_PATH="/home/vncuser/.config/chromium"

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
  workspace paths    Show host/container paths for all nodes by default
  workspace apply    Recreate node(s) to apply shared workspace bind mounts safely
  storage            Show named volumes and host bind mounts for all nodes by default
  urls | ports       Show Backend, GraphQL, noVNC, VNC, and debug URLs for all nodes by default
  status | ps        Show managed Docker nodes
  logs               Show Docker logs for a managed node
  stop [--all]       Stop one or all managed Docker nodes
  help               Show this help

Advanced temporary use: curl -fsSL <script-url> | bash -s -- <command> [options]

Options:
  --name <name>      Select one node for single-node commands/output (default where applicable: ${DEFAULT_NODE_NAME})
  --tag <tag>        Docker image tag (default: ${DEFAULT_TAG})
  --image <image>    Docker image repository or full image ref (default: ${DEFAULT_IMAGE})
  --all              Required for upgrade/destroy; optional for all-node read-only output; applies to stop/workspace apply as documented
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
  NODE_NAME="" CONTAINER_NAME="" BACKEND_PORT="" VNC_PORT="" NOVNC_PORT="" DEBUG_PORT="" IMAGE_REF="" CREATED_AT="" CONFIG_HASH=""
  unset PROFILE
  if [[ -f "$file" ]]; then
    # shellcheck disable=SC1090
    source "$file"
  fi
  unset PROFILE
}

write_state() {
  local file="$1" node_name="$2" container_name="$3" backend="$4" vnc="$5" novnc="$6" debug="$7" image_ref="$8" created_at="$9" config_hash="${10}"
  {
    printf 'NODE_NAME=%s\nCONTAINER_NAME=%s\nBACKEND_PORT=%s\nVNC_PORT=%s\nNOVNC_PORT=%s\nDEBUG_PORT=%s\nIMAGE_REF=%s\nCREATED_AT=%s\nCONFIG_HASH=%s\nUPDATED_AT=%s\n' \
      "$node_name" "$container_name" "$backend" "$vnc" "$novnc" "$debug" "$image_ref" "$created_at" "$config_hash" "$(now_utc)"
  } > "$file"
  chmod 600 "$file" 2>/dev/null || true
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
