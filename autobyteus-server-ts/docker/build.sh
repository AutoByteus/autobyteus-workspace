#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="autobyteus-server"
TAG="${AUTOBYTEUS_IMAGE_TAG:-latest}"
VARIANT=""
BUILD_ARGS=()
PLATFORMS="linux/amd64,linux/arm64"
LOAD_DEFAULT=true
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONOREPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DOCKERFILE_PATH="${SCRIPT_DIR}/Dockerfile.monorepo"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag) TAG="$2"; shift 2 ;;
    --variant) VARIANT="$2"; shift 2 ;;
    --no-cache) BUILD_ARGS+=("--no-cache"); shift ;;
    --push) BUILD_ARGS+=("--push"); LOAD_DEFAULT=false; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ -n "${VARIANT}" && "${VARIANT}" != "latest" ]]; then
  BUILD_ARGS+=("--build-arg" "BASE_IMAGE_TAG=${VARIANT}")
  if [[ "${TAG}" == "latest" ]]; then
    TAG="latest-${VARIANT}"
  fi
fi

if [[ "${LOAD_DEFAULT}" == "true" ]]; then
  BUILD_ARGS+=("--load")
  case "$(docker version --format '{{.Server.Arch}}')" in
    x86_64|amd64) PLATFORMS="linux/amd64" ;;
    aarch64|arm64) PLATFORMS="linux/arm64" ;;
    *) PLATFORMS="linux/amd64" ;;
  esac
fi

if ! docker buildx version >/dev/null 2>&1; then
  echo "Error: Docker Buildx is required."
  exit 1
fi

tags=("-t" "${IMAGE_NAME}:${TAG}")
if [[ -z "${VARIANT}" && "${TAG}" != "latest" ]]; then
  tags+=("-t" "${IMAGE_NAME}:latest")
fi

docker buildx build "${BUILD_ARGS[@]}" --platform "${PLATFORMS}" -f "${DOCKERFILE_PATH}" "${tags[@]}" "${MONOREPO_ROOT}"

if [[ "${LOAD_DEFAULT}" == "true" ]]; then
  echo "Built locally: ${IMAGE_NAME}:${TAG} (${PLATFORMS})"
else
  echo "Built and pushed: ${IMAGE_NAME}:${TAG} (${PLATFORMS})"
fi
