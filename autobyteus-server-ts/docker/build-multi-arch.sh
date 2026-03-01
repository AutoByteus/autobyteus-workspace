#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONOREPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DOCKERFILE_PATH="${MONOREPO_ROOT}/autobyteus-server-ts/docker/Dockerfile.monorepo"

IMAGE_NAME="${IMAGE_NAME:-autobyteus/autobyteus-server}"
BUILDER_NAME="${BUILDER_NAME:-multi-platform-builder}"
PLATFORMS="linux/amd64,linux/arm64"
MODE="load"
VARIANT=""
EXTRA_ARGS=()

if command -v jq >/dev/null 2>&1; then
  VERSION_DEFAULT="$(jq -r '.version' "${MONOREPO_ROOT}/autobyteus-server-ts/package.json")"
else
  VERSION_DEFAULT="$(node -p "require('${MONOREPO_ROOT}/autobyteus-server-ts/package.json').version")"
fi
VERSION="${VERSION:-${VERSION_DEFAULT}}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --push) MODE="push"; shift ;;
    --load) MODE="load"; shift ;;
    --variant) VARIANT="$2"; shift 2 ;;
    --version) VERSION="$2"; shift 2 ;;
    --image-name) IMAGE_NAME="$2"; shift 2 ;;
    --no-cache) EXTRA_ARGS+=("--no-cache"); shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ -n "${VARIANT}" ]]; then
  EXTRA_ARGS+=("--build-arg" "BASE_IMAGE_TAG=${VARIANT}")
  VERSION="${VERSION}-${VARIANT}"
  TAG_LATEST="latest-${VARIANT}"
else
  TAG_LATEST="latest"
fi

if ! docker buildx version >/dev/null 2>&1; then
  echo "Error: Docker Buildx is required."
  exit 1
fi

if ! docker buildx inspect "${BUILDER_NAME}" >/dev/null 2>&1; then
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
    amd64|x86_64) PLATFORMS="linux/amd64" ;;
    arm64|aarch64) PLATFORMS="linux/arm64" ;;
    *) echo "Unsupported arch: ${HOST_ARCH}"; exit 1 ;;
  esac
  BUILD_OUTPUT_ARGS+=("--load")
fi

echo "Building image: ${IMAGE_NAME} (variant: ${VARIANT:-default}, mode: ${MODE})"

build_cmd=(
  docker buildx build
  "${MONOREPO_ROOT}"
  -f "${DOCKERFILE_PATH}"
  --platform "${PLATFORMS}"
  --tag "${IMAGE_NAME}:${VERSION}"
  --tag "${IMAGE_NAME}:${TAG_LATEST}"
  --provenance=false
  --sbom=false
)

if ((${#EXTRA_ARGS[@]})); then
  build_cmd+=("${EXTRA_ARGS[@]}")
fi
build_cmd+=("${BUILD_OUTPUT_ARGS[@]}")

"${build_cmd[@]}"
echo "Built and ${MODE}ed: ${IMAGE_NAME}:${VERSION}, ${IMAGE_NAME}:${TAG_LATEST}"
