#!/usr/bin/env bash
set -euo pipefail

AUTOBYTEUS_DOCKER_BASH_MODULES=(core.sh docker-runtime.sh commands.sh)
AUTOBYTEUS_DOCKER_PUBLIC_SOURCE_BASE_DEFAULT="https://raw.githubusercontent.com/AutoByteus/autobyteus-workspace/personal/scripts/public/docker"
AUTOBYTEUS_DOCKER_BASH_ENTRY_NAME="autobyteus-docker.sh"
AUTOBYTEUS_DOCKER_BASH_INSTALL_NAME="autobyteus-docker"

entry_fail() { printf 'error: %s\n' "$*" >&2; exit 1; }
entry_log() { printf '[AutoByteus Docker] %s\n' "$*"; }

entry_source_base() {
  local base="${AUTOBYTEUS_DOCKER_PUBLIC_SOURCE_BASE:-$AUTOBYTEUS_DOCKER_PUBLIC_SOURCE_BASE_DEFAULT}"
  printf '%s\n' "${base%/}"
}

entry_source_url() {
  printf '%s\n' "${AUTOBYTEUS_DOCKER_INSTALL_SOURCE_URL:-$(entry_source_base)/${AUTOBYTEUS_DOCKER_BASH_ENTRY_NAME}}"
}

entry_module_source_base() {
  local source_url
  if [[ -n "${AUTOBYTEUS_DOCKER_MODULE_SOURCE_BASE:-}" ]]; then
    printf '%s\n' "${AUTOBYTEUS_DOCKER_MODULE_SOURCE_BASE%/}"
    return
  fi
  source_url="$(entry_source_url)"
  printf '%s/autobyteus-docker.d/bash\n' "${source_url%/*}"
}

entry_install_dir() {
  printf '%s\n' "${AUTOBYTEUS_DOCKER_INSTALL_DIR:-${HOME}/.local/bin}"
}

entry_path_has_dir() {
  local dir="$1" entry
  IFS=':' read -r -a entries <<< "${PATH:-}"
  for entry in "${entries[@]}"; do
    [[ "$entry" == "$dir" ]] && return 0
  done
  return 1
}

entry_download_file() {
  local url="$1" path="$2"
  command -v curl >/dev/null 2>&1 || entry_fail "curl is required to fetch AutoByteus Docker launcher files."
  if ! curl -fsSL "$url" -o "$path"; then
    entry_fail "failed to download ${url}. Check AUTOBYTEUS_DOCKER_INSTALL_SOURCE_URL or AUTOBYTEUS_DOCKER_MODULE_SOURCE_BASE."
  fi
}

install_launcher() {
  local dir install_path module_dir source_url module_base tmp_path tmp_module module
  dir="$(entry_install_dir)"
  install_path="${dir}/${AUTOBYTEUS_DOCKER_BASH_INSTALL_NAME}"
  module_dir="${dir}/autobyteus-docker.d/bash"
  source_url="$(entry_source_url)"
  module_base="$(entry_module_source_base)"
  mkdir -p "$dir" "$module_dir"

  tmp_path="$(mktemp "${TMPDIR:-/tmp}/autobyteus-docker.XXXXXX")"
  entry_download_file "$source_url" "$tmp_path"
  chmod +x "$tmp_path"

  for module in "${AUTOBYTEUS_DOCKER_BASH_MODULES[@]}"; do
    tmp_module="$(mktemp "${TMPDIR:-/tmp}/autobyteus-docker-module.XXXXXX")"
    entry_download_file "${module_base}/${module}" "$tmp_module"
    mv "$tmp_module" "${module_dir}/${module}"
  done

  mv "$tmp_path" "$install_path"
  entry_log "Installed AutoByteus Docker launcher: ${install_path}"
  printf 'Next commands:\n  autobyteus-docker new-container\n  autobyteus-docker workspace paths\n  autobyteus-docker storage\n  autobyteus-docker urls\n'
  if entry_path_has_dir "$dir"; then
    entry_log "Install directory is already on PATH."
    return
  fi
  printf 'PATH guidance:\n  This shell cannot find autobyteus-docker until %s is on PATH.\n  Use direct path now: "%s" new-container\n  For this shell session: export PATH="%s:%s"\n  To persist, add that export line to your shell profile, then open a new terminal.\n' "$dir" "$install_path" "$dir" "\$PATH"
}

entry_script_dir() {
  local source_path="${BASH_SOURCE[0]:-}"
  [[ -n "$source_path" && -f "$source_path" ]] || return 1
  cd -- "$(dirname -- "$source_path")" && pwd
}

entry_load_local_modules() {
  local dir="$1" module path
  for module in "${AUTOBYTEUS_DOCKER_BASH_MODULES[@]}"; do
    path="${dir}/${module}"
    [[ -r "$path" ]] || entry_fail "launcher module missing: ${path}. Rerun 'autobyteus-docker install' or set AUTOBYTEUS_DOCKER_MODULE_SOURCE_BASE for temporary execution."
  done
  for module in "${AUTOBYTEUS_DOCKER_BASH_MODULES[@]}"; do
    # shellcheck disable=SC1090
    source "${dir}/${module}"
  done
}

entry_load_remote_modules() {
  local module_base module tmp_dir path
  module_base="$(entry_module_source_base)"
  command -v curl >/dev/null 2>&1 || entry_fail "curl is required to load launcher modules from ${module_base}."
  tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/autobyteus-docker-modules.XXXXXX")"
  trap 'rm -rf "${tmp_dir:-}"' EXIT
  for module in "${AUTOBYTEUS_DOCKER_BASH_MODULES[@]}"; do
    path="${tmp_dir}/${module}"
    entry_download_file "${module_base}/${module}" "$path"
    # shellcheck disable=SC1090
    source "$path"
  done
}

entry_load_modules() {
  local script_dir module_dir
  if script_dir="$(entry_script_dir)"; then
    module_dir="${script_dir}/autobyteus-docker.d/bash"
    entry_load_local_modules "$module_dir"
    return
  fi
  entry_load_remote_modules
}

entry_main() {
  local cmd="${1:-help}"
  if [[ "$cmd" == "install" ]]; then
    shift || true
    [[ "$#" -eq 0 ]] || entry_fail "Unknown install option(s): $*"
    install_launcher
    return
  fi
  entry_load_modules
  main "$@"
}

entry_main "$@"
