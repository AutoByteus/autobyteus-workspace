#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '[%s] %s\n' "$(date --iso-8601=seconds)" "$*"
}

WORKSPACE_ROOT="${AUTOBYTEUS_WORKSPACE_ROOT:-/home/autobyteus/workspace}"
SRC_ROOT="${WORKSPACE_ROOT}/src"
GIT_AUTH_MODE="${AUTOBYTEUS_GIT_AUTH_MODE:-pat}"
SKIP_SYNC="${AUTOBYTEUS_SKIP_SYNC:-0}"

mkdir -p "${WORKSPACE_ROOT}" "${SRC_ROOT}"

setup_git_auth() {
  git config --global user.name "${GITHUB_USERNAME:-autobyteus-bot}"
  git config --global user.email "${GITHUB_EMAIL:-autobyteus-bot@autobyteus.dev}"

  if [[ "${GIT_AUTH_MODE}" == "ssh" ]]; then
    log "Using SSH mode for Git authentication."
    return
  fi

  if [[ -z "${GITHUB_PAT:-}" ]]; then
    log "error: AUTOBYTEUS_GIT_AUTH_MODE=pat requires GITHUB_PAT."
    exit 1
  fi

  log "Using PAT mode for Git authentication."
  local askpass_script
  askpass_script="$(mktemp)"
  cat <<'ASKPASS' > "${askpass_script}"
#!/usr/bin/env bash
case "$1" in
  Username*) printf '%s' "${GITHUB_USERNAME:-x-access-token}" ;;
  Password*) printf '%s' "${GITHUB_PAT}" ;;
  *) exit 0 ;;
esac
ASKPASS
  chmod 700 "${askpass_script}"
  export GIT_ASKPASS="${askpass_script}"
  export GIT_TERMINAL_PROMPT=0
  trap '[[ -f "${askpass_script}" ]] && rm -f "${askpass_script}"' EXIT
}

resolve_ref() {
  local repo="$1"
  case "${repo}" in
    autobyteus-server-ts)
      printf '%s' "${AUTOBYTEUS_SERVER_REF:-${AUTOBYTEUS_REF:-main}}"
      ;;
    autobyteus-ts)
      printf '%s' "${AUTOBYTEUS_TS_REF:-${AUTOBYTEUS_REF:-main}}"
      ;;
    repository_prisma)
      printf '%s' "${AUTOBYTEUS_REPOSITORY_PRISMA_REF:-${AUTOBYTEUS_REF:-main}}"
      ;;
    *)
      printf '%s' "main"
      ;;
  esac
}

resolve_repo_url() {
  local repo="$1"

  case "${repo}" in
    autobyteus-server-ts)
      if [[ -n "${AUTOBYTEUS_SERVER_TS_REPO_URL:-}" ]]; then
        printf '%s' "${AUTOBYTEUS_SERVER_TS_REPO_URL}"
        return
      fi
      ;;
    autobyteus-ts)
      if [[ -n "${AUTOBYTEUS_TS_REPO_URL:-}" ]]; then
        printf '%s' "${AUTOBYTEUS_TS_REPO_URL}"
        return
      fi
      ;;
    repository_prisma)
      if [[ -n "${AUTOBYTEUS_REPOSITORY_PRISMA_REPO_URL:-}" ]]; then
        printf '%s' "${AUTOBYTEUS_REPOSITORY_PRISMA_REPO_URL}"
        return
      fi
      ;;
  esac

  local org="${AUTOBYTEUS_GITHUB_ORG:-AutoByteus}"
  if [[ "${GIT_AUTH_MODE}" == "ssh" ]]; then
    printf 'git@github.com:%s/%s.git' "${org}" "${repo}"
  else
    printf 'https://github.com/%s/%s.git' "${org}" "${repo}"
  fi
}

sync_repo() {
  local repo="$1"
  local ref="$2"
  local dest="${SRC_ROOT}/${repo}"
  local origin_url
  origin_url="$(resolve_repo_url "${repo}")"

  if [[ ! -d "${dest}/.git" ]]; then
    log "Cloning ${repo}@${ref}"
    git clone --branch "${ref}" "${origin_url}" "${dest}"
    git config --global --add safe.directory "${dest}" >/dev/null 2>&1 || true
    return
  fi

  git config --global --add safe.directory "${dest}" >/dev/null 2>&1 || true

  if [[ "${SKIP_SYNC}" == "1" ]]; then
    log "AUTOBYTEUS_SKIP_SYNC=1; leaving ${repo} unchanged"
    return
  fi

  log "Updating ${repo}@${ref}"
  git -C "${dest}" remote set-url origin "${origin_url}"
  git -C "${dest}" config remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'
  git -C "${dest}" fetch --prune origin
  git -C "${dest}" checkout "${ref}"
  git -C "${dest}" reset --hard "origin/${ref}"
}

write_workspace_file() {
  cat > "${WORKSPACE_ROOT}/pnpm-workspace.yaml" <<'WORKSPACE'
packages:
  - "src/autobyteus-server-ts"
  - "src/autobyteus-ts"
  - "src/repository_prisma"
WORKSPACE
}

install_and_build() {
  log "Installing Node.js dependencies"
  (
    cd "${WORKSPACE_ROOT}"
    pnpm install
    log "Generating Prisma client for Linux runtime"
    pnpm -C src/autobyteus-server-ts exec prisma generate --schema prisma/schema.prisma
    pnpm -C src/autobyteus-server-ts build
  )
}

main() {
  setup_git_auth

  sync_repo "autobyteus-server-ts" "$(resolve_ref autobyteus-server-ts)"
  sync_repo "autobyteus-ts" "$(resolve_ref autobyteus-ts)"
  sync_repo "repository_prisma" "$(resolve_ref repository_prisma)"

  write_workspace_file
  install_and_build

  log "Bootstrap completed."
}

main "$@"
