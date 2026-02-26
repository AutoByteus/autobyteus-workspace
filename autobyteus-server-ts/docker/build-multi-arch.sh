#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONOREPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DOCKERFILE_PATH="${MONOREPO_ROOT}/autobyteus-server-ts/docker/Dockerfile.monorepo"

IMAGE_NAME="${IMAGE_NAME:-autobyteus/autobyteus-server}"
BUILDER_NAME="${BUILDER_NAME:-multi-platform-builder}"
PLATFORMS="linux/amd64,linux/arm64"
MODE="load"
EXTRA_ARGS=()

if command -v jq >/dev/null 2>&1; then
  VERSION_DEFAULT="$(jq -r '.version' "${MONOREPO_ROOT}/autobyteus-server-ts/package.json")"
else
  VERSION_DEFAULT="$(node -p "require('${MONOREPO_ROOT}/autobyteus-server-ts/package.json').version")"
fi
VERSION="${VERSION:-${VERSION_DEFAULT}}"
CHROME_VNC_TAG="${CHROME_VNC_TAG:-zh}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --push)
      MODE="push"
      shift
      ;;
    --load)
      MODE="load"
      shift
      ;;
    --version)
      VERSION="$2"
      shift 2
      ;;
    --image-name)
      IMAGE_NAME="$2"
      shift 2
      ;;
    --chrome-vnc-tag)
      CHROME_VNC_TAG="$2"
      shift 2
      ;;
    --no-cache)
      EXTRA_ARGS+=("--no-cache")
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: ./build-multi-arch.sh [--push|--load] [--version <version>] [--image-name <name>] [--chrome-vnc-tag <tag>] [--no-cache]"
      exit 1
      ;;
  esac
done

if ! docker buildx version >/dev/null 2>&1; then
  echo "Error: Docker Buildx is required."
  exit 1
fi

if ! docker buildx inspect "${BUILDER_NAME}" >/dev/null 2>&1; then
  echo "Creating buildx builder: ${BUILDER_NAME}"
  docker buildx create --name "${BUILDER_NAME}" --use >/dev/null
else
  docker buildx use "${BUILDER_NAME}" >/dev/null
fi

docker buildx inspect --bootstrap >/dev/null

BUILD_OUTPUT_ARGS=()
if [[ "${MODE}" == "push" ]]; then
  BUILD_OUTPUT_ARGS+=("--push")
else
  HOST_ARCH="$(docker version --format '{{.Server.Arch}}')"
  case "${HOST_ARCH}" in
    amd64|x86_64)
      PLATFORMS="linux/amd64"
      ;;
    arm64|aarch64)
      PLATFORMS="linux/arm64"
      ;;
    *)
      echo "Unsupported Docker host architecture: ${HOST_ARCH}"
      exit 1
      ;;
  esac
  BUILD_OUTPUT_ARGS+=("--load")
fi

echo "Building image: ${IMAGE_NAME}"
echo "Version tag: ${VERSION}"
echo "Also tagging: latest"
echo "Chrome VNC base tag: ${CHROME_VNC_TAG}"
echo "Platforms: ${PLATFORMS}"
echo "Mode: ${MODE}"

build_cmd=(
  docker buildx build
  "${MONOREPO_ROOT}"
  -f "${DOCKERFILE_PATH}"
  --platform "${PLATFORMS}"
  --tag "${IMAGE_NAME}:${VERSION}"
  --tag "${IMAGE_NAME}:latest"
  --build-arg "CHROME_VNC_TAG=${CHROME_VNC_TAG}"
  --provenance=false
  --sbom=false
)

if ((${#EXTRA_ARGS[@]})); then
  build_cmd+=("${EXTRA_ARGS[@]}")
fi
build_cmd+=("${BUILD_OUTPUT_ARGS[@]}")

"${build_cmd[@]}"

if [[ "${MODE}" == "push" ]]; then
  echo "Pushed: ${IMAGE_NAME}:${VERSION}, ${IMAGE_NAME}:latest"
else
  echo "Loaded locally: ${IMAGE_NAME}:${VERSION}, ${IMAGE_NAME}:latest"
fi
