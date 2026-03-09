#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SECRETS_FILE="${1:-${REPO_ROOT}/.local/release-server-dockerhub.env}"

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: required command '$cmd' is not installed." >&2
    exit 1
  fi
}

if [[ ! -f "${SECRETS_FILE}" ]]; then
  echo "Error: secrets file not found: ${SECRETS_FILE}" >&2
  exit 1
fi

require_cmd gh

set -a
source "${SECRETS_FILE}"
set +a

if [[ -z "${DOCKERHUB_USERNAME:-}" ]]; then
  echo "Error: DOCKERHUB_USERNAME is empty in ${SECRETS_FILE}" >&2
  exit 1
fi

if [[ -z "${DOCKERHUB_TOKEN:-}" ]]; then
  echo "Error: DOCKERHUB_TOKEN is empty in ${SECRETS_FILE}" >&2
  exit 1
fi

gh secret set DOCKERHUB_USERNAME --body "${DOCKERHUB_USERNAME}"
gh secret set DOCKERHUB_TOKEN --body "${DOCKERHUB_TOKEN}"

if [[ -n "${DOCKERHUB_IMAGE_NAME:-}" ]]; then
  gh variable set DOCKERHUB_IMAGE_NAME --body "${DOCKERHUB_IMAGE_NAME}"
  echo "Updated GitHub repo variable: DOCKERHUB_IMAGE_NAME"
else
  echo "Skipped GitHub repo variable DOCKERHUB_IMAGE_NAME (empty)."
fi

echo "Updated GitHub repository secrets:"
echo "  - DOCKERHUB_USERNAME"
echo "  - DOCKERHUB_TOKEN"
