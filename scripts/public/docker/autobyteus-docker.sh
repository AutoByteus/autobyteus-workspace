#!/usr/bin/env bash
set -euo pipefail

AUTOBYTEUS_DOCKER_BASH_MODULES=(core.sh docker-runtime.sh commands.sh)
AUTOBYTEUS_DOCKER_PUBLIC_SOURCE_BASE_DEFAULT="https://raw.githubusercontent.com/AutoByteus/autobyteus-workspace/personal/scripts/public/docker"
AUTOBYTEUS_DOCKER_BASH_ENTRY_NAME="autobyteus-docker.sh"
AUTOBYTEUS_DOCKER_BASH_INSTALL_NAME="autobyteus-docker"
AUTOBYTEUS_DOCKER_PATH_BEGIN_MARKER="# >>> autobyteus-docker PATH >>>"
AUTOBYTEUS_DOCKER_PATH_END_MARKER="# <<< autobyteus-docker PATH <<<"

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
  local dir="${AUTOBYTEUS_DOCKER_INSTALL_DIR:-${HOME}/.local/bin}"
  case "$dir" in
    /*) printf '%s\n' "$dir" ;;
    *) printf '%s/%s\n' "$(pwd -P)" "$dir" ;;
  esac
}

entry_path_has_dir() {
  local dir="$1" entry
  IFS=':' read -r -a entries <<< "${PATH:-}"
  for entry in "${entries[@]}"; do
    [[ "$entry" == "$dir" ]] && return 0
  done
  return 1
}

entry_shell_quote() {
  local value="$1"
  printf "'%s'" "${value//\'/\'\\\'\'}"
}

entry_profile_path() {
  local shell_path="${SHELL:-}" shell_name
  shell_name="${shell_path##*/}"
  case "$shell_name" in
    bash) printf '%s/.bashrc\n' "$HOME" ;;
    zsh) printf '%s/.zshrc\n' "$HOME" ;;
    *) printf '%s/.profile\n' "$HOME" ;;
  esac
}

entry_profile_assignment_value() {
  local dir="$1"
  if [[ "$dir" == "${HOME}/.local/bin" ]]; then
    printf '"$HOME/.local/bin"\n'
    return
  fi
  entry_shell_quote "$dir"
  printf '\n'
}

entry_path_export_line() {
  local dir="$1"
  printf 'export PATH=%s:"$PATH"\n' "$(entry_shell_quote "$dir")"
}

entry_profile_has_managed_block() {
  local profile="$1"
  [[ -f "$profile" ]] || return 1
  grep -Fq "$AUTOBYTEUS_DOCKER_PATH_BEGIN_MARKER" "$profile"
}

entry_profile_has_path_entry() {
  local profile="$1" dir="$2"
  [[ -f "$profile" ]] || return 1
  grep -Fq "$dir" "$profile" && return 0
  if [[ "$dir" == "${HOME}/.local/bin" ]]; then
    grep -Fq '$HOME/.local/bin' "$profile" && return 0
    grep -Fq '${HOME}/.local/bin' "$profile" && return 0
  fi
  return 1
}

entry_append_profile_path_block() {
  local profile="$1" dir="$2" assignment
  assignment="$(entry_profile_assignment_value "$dir")"
  mkdir -p "$(dirname -- "$profile")" || return 1
  {
    printf '\n%s\n' "$AUTOBYTEUS_DOCKER_PATH_BEGIN_MARKER"
    printf 'autobyteus_docker_bin=%s\n' "$assignment"
    printf 'if [ -d "$autobyteus_docker_bin" ]; then\n'
    printf '  case ":$PATH:" in\n'
    printf '    *":$autobyteus_docker_bin:"*) ;;\n'
    printf '    *) export PATH="$autobyteus_docker_bin:$PATH" ;;\n'
    printf '  esac\n'
    printf 'fi\n'
    printf 'unset autobyteus_docker_bin\n'
    printf '%s\n' "$AUTOBYTEUS_DOCKER_PATH_END_MARKER"
  } >> "$profile"
}

entry_update_profile_path() {
  local dir="$1" skip_update="$2" profile
  if [[ "$skip_update" == "1" || "${AUTOBYTEUS_DOCKER_INSTALL_SKIP_PATH_UPDATE:-}" == "1" ]]; then
    entry_log "Persistent PATH update skipped by request; add the export command below to your shell profile if you want persistence."
    return 1
  fi
  profile="$(entry_profile_path)"
  if entry_profile_has_path_entry "$profile" "$dir"; then
    entry_log "Persistent PATH already appears configured in ${profile}."
    return
  fi
  if entry_profile_has_managed_block "$profile"; then
    entry_log "Persistent PATH already has an AutoByteus-managed block in ${profile}; not adding a duplicate. Use the copy/paste commands below if this install dir differs."
    return 1
  fi
  if entry_append_profile_path_block "$profile" "$dir"; then
    entry_log "Updated shell profile with an AutoByteus PATH block: ${profile}"
    return
  fi
  entry_log "Could not update shell profile ${profile}; add the export command below manually if you want persistence."
  return 1
}

entry_print_persistent_path_commands() {
  local dir="$1" profile="$2" export_line quoted_profile quoted_line
  export_line="$(entry_path_export_line "$dir")"
  quoted_profile="$(entry_shell_quote "$profile")"
  quoted_line="$(entry_shell_quote "$export_line")"
  printf 'Persistent PATH setup (copy/paste for future shells):\n'
  printf '  autobyteus_docker_profile=%s\n' "$quoted_profile"
  printf '  autobyteus_docker_path_line=%s\n' "$quoted_line"
  cat <<'PATH_COMMANDS'
  touch "$autobyteus_docker_profile"
  grep -qxF "$autobyteus_docker_path_line" "$autobyteus_docker_profile" || printf '%s\n' "$autobyteus_docker_path_line" >> "$autobyteus_docker_profile"
  source "$autobyteus_docker_profile"
  unset autobyteus_docker_profile autobyteus_docker_path_line
PATH_COMMANDS
}

entry_download_file() {
  local url="$1" path="$2"
  command -v curl >/dev/null 2>&1 || entry_fail "curl is required to fetch AutoByteus Docker launcher files."
  if ! curl -fsSL "$url" -o "$path"; then
    entry_fail "failed to download ${url}. Check AUTOBYTEUS_DOCKER_INSTALL_SOURCE_URL or AUTOBYTEUS_DOCKER_MODULE_SOURCE_BASE."
  fi
}

install_launcher() {
  local skip_update_path="${1:-0}" dir install_path module_dir source_url module_base tmp_path tmp_module module
  local quoted_install_path print_persistent_commands=0 profile
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
  quoted_install_path="$(entry_shell_quote "$install_path")"
  if entry_path_has_dir "$dir"; then
    entry_log "Install directory is already on PATH."
    printf 'Next commands:\n  autobyteus-docker new-container\n  autobyteus-docker workspace paths\n  autobyteus-docker storage\n  autobyteus-docker urls\n'
    return
  fi
  entry_log "Install directory is not on this shell's PATH: ${dir}"
  profile="$(entry_profile_path)"
  if ! entry_update_profile_path "$dir" "$skip_update_path"; then
    print_persistent_commands=1
  fi
  printf 'Run now:\n  Direct path: %s new-container\n  Or update this shell first: %s\n' "$quoted_install_path" "$(entry_path_export_line "$dir")"
  printf 'Current-shell note: this installer process cannot change the PATH of the terminal that launched it.\n'
  if [[ "$print_persistent_commands" == "1" ]]; then
    entry_print_persistent_path_commands "$dir" "$profile"
  fi
  printf 'After applying the export above, or after opening a new terminal if the persistent profile update above succeeded, you can run:\n  autobyteus-docker new-container\n  autobyteus-docker workspace paths\n  autobyteus-docker storage\n  autobyteus-docker urls\n'
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
    local skip_update_path=0
    shift || true
    while [[ "$#" -gt 0 ]]; do
      case "$1" in
        --no-update-path|--skip-path-update) skip_update_path=1; shift ;;
        *) entry_fail "Unknown install option(s): $*" ;;
      esac
    done
    install_launcher "$skip_update_path"
    return
  fi
  entry_load_modules
  main "$@"
}

entry_main "$@"
