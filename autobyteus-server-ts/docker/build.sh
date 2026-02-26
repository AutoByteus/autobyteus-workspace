#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="autobyteus-server"
TAG="${AUTOBYTEUS_IMAGE_TAG:-latest}"
CHROME_VNC_TAG="${AUTOBYTEUS_CHROME_VNC_TAG:-zh}"
BUILD_ARGS=()
PLATFORMS="linux/amd64,linux/arm64"
LOAD_DEFAULT=true
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONOREPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DOCKERFILE_PATH="${SCRIPT_DIR}/Dockerfile.monorepo"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)
      TAG="$2"
      shift 2
      ;;
    --chrome-vnc-tag)
      CHROME_VNC_TAG="$2"
      shift 2
      ;;
    --no-cache)
      BUILD_ARGS+=("--no-cache")
      shift
      ;;
    --push)
      BUILD_ARGS+=("--push")
      LOAD_DEFAULT=false
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: ./build.sh [--tag <tag>] [--chrome-vnc-tag <tag>] [--no-cache] [--push]"
      exit 1
      ;;
  esac
done

if [[ "${LOAD_DEFAULT}" == "true" ]]; then
  BUILD_ARGS+=("--load")
  case "$(docker version --format '{{.Server.Arch}}')" in
    x86_64|amd64)
      PLATFORMS="linux/amd64"
      ;;
    aarch64|arm64)
      PLATFORMS="linux/arm64"
      ;;
    *)
      echo "Warning: unknown Docker arch, defaulting local build to linux/amd64."
      PLATFORMS="linux/amd64"
      ;;
  esac
fi

if ! docker buildx version >/dev/null 2>&1; then
  echo "Error: Docker Buildx is required."
  exit 1
fi

docker buildx build "${BUILD_ARGS[@]}" --platform "${PLATFORMS}" --build-arg "CHROME_VNC_TAG=${CHROME_VNC_TAG}" -f "${DOCKERFILE_PATH}" -t "${IMAGE_NAME}:${TAG}" "${MONOREPO_ROOT}"

echo "Built ${IMAGE_NAME}:${TAG} (${PLATFORMS})"
