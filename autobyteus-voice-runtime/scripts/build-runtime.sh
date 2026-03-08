#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$PROJECT_ROOT/dist"
METADATA_PATH="$PROJECT_ROOT/metadata/runtime-assets.json"
WORK_DIR="$PROJECT_ROOT/.work"

PLATFORM="${1:-}"
ARCH="${2:-}"
RUNTIME_VERSION="${AUTOBYTEUS_VOICE_RUNTIME_VERSION:-0.1.1}"

if [[ -z "$PLATFORM" || -z "$ARCH" ]]; then
  echo "Usage: build-runtime.sh <platform> <arch>" >&2
  exit 1
fi

mkdir -p "$DIST_DIR"
mkdir -p "$WORK_DIR"

read_metadata() {
  local field="$1"
  node -e '
    const fs = require("fs");
    const metadata = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const field = process.argv[2];
    if (field === "whisperCppVersion") {
      process.stdout.write(metadata.whisperCppVersion);
      process.exit(0);
    }
    if (field === "fileName") {
      const asset = metadata.assets.find((entry) => entry.platform === process.argv[3] && entry.arch === process.argv[4]);
      if (!asset) {
        process.stderr.write(`No runtime asset metadata for ${process.argv[3]}/${process.argv[4]}\n`);
        process.exit(1);
      }
      process.stdout.write(asset.fileName);
      process.exit(0);
    }
    process.stderr.write(`Unsupported metadata field: ${field}\n`);
    process.exit(1);
  ' "$METADATA_PATH" "$field" "$PLATFORM" "$ARCH"
}

WHISPER_CPP_VERSION="${WHISPER_CPP_VERSION:-$(read_metadata whisperCppVersion)}"
OUTPUT_FILE_NAME="$(read_metadata fileName)"
SOURCE_ROOT="${WHISPER_CPP_SOURCE_DIR:-}"
TARBALL_PATH="$WORK_DIR/whisper.cpp-v${WHISPER_CPP_VERSION}.tar.gz"
EXTRACT_ROOT="$WORK_DIR/whisper.cpp-v${WHISPER_CPP_VERSION}"
SOURCE_DIR="$EXTRACT_ROOT/whisper.cpp-${WHISPER_CPP_VERSION}"
BUILD_DIR="$WORK_DIR/build-${PLATFORM}-${ARCH}"

if [[ -z "$SOURCE_ROOT" ]]; then
  if [[ ! -d "$SOURCE_DIR" ]]; then
    if [[ ! -f "$TARBALL_PATH" ]]; then
      echo "Downloading whisper.cpp v${WHISPER_CPP_VERSION}"
      curl -L --fail --output "$TARBALL_PATH" \
        "https://github.com/ggml-org/whisper.cpp/archive/refs/tags/v${WHISPER_CPP_VERSION}.tar.gz"
    fi

    rm -rf "$EXTRACT_ROOT"
    mkdir -p "$EXTRACT_ROOT"
    tar -xzf "$TARBALL_PATH" -C "$EXTRACT_ROOT"
  fi

  SOURCE_ROOT="$SOURCE_DIR"
fi

rm -rf "$BUILD_DIR"

CMAKE_ARGS=(
  -S "$SOURCE_ROOT"
  -B "$BUILD_DIR"
  -DBUILD_SHARED_LIBS=OFF
  -DGGML_NATIVE=OFF
  -DWHISPER_BUILD_TESTS=OFF
  -DWHISPER_BUILD_SERVER=OFF
  -DWHISPER_BUILD_EXAMPLES=ON
)

case "$PLATFORM" in
  darwin)
    CMAKE_ARGS+=(-DCMAKE_BUILD_TYPE=Release)
    if [[ "$ARCH" == "arm64" ]]; then
      CMAKE_ARGS+=(-DCMAKE_OSX_ARCHITECTURES=arm64)
    elif [[ "$ARCH" == "x64" ]]; then
      CMAKE_ARGS+=(-DCMAKE_OSX_ARCHITECTURES=x86_64)
    else
      echo "Unsupported macOS architecture: $ARCH" >&2
      exit 1
    fi
    ;;
  linux)
    if [[ "$ARCH" != "x64" ]]; then
      echo "Unsupported Linux architecture: $ARCH" >&2
      exit 1
    fi
    CMAKE_ARGS+=(-DCMAKE_BUILD_TYPE=Release)
    ;;
  win32)
    if [[ "$ARCH" != "x64" ]]; then
      echo "Unsupported Windows architecture: $ARCH" >&2
      exit 1
    fi
    CMAKE_ARGS+=(-G "Visual Studio 17 2022" -A x64)
    ;;
  *)
    echo "Unsupported platform: $PLATFORM" >&2
    exit 1
    ;;
esac

echo "Building voice runtime"
echo "Platform: $PLATFORM"
echo "Arch: $ARCH"
echo "Runtime version: $RUNTIME_VERSION"
echo "whisper.cpp version: $WHISPER_CPP_VERSION"
echo "Source root: $SOURCE_ROOT"

cmake "${CMAKE_ARGS[@]}"
cmake --build "$BUILD_DIR" --config Release --target whisper-cli -j 4

RUNTIME_BINARY=""
for candidate in \
  "$BUILD_DIR/bin/whisper-cli" \
  "$BUILD_DIR/bin/whisper-cli.exe" \
  "$BUILD_DIR/bin/Release/whisper-cli.exe"; do
  if [[ -f "$candidate" ]]; then
    RUNTIME_BINARY="$candidate"
    break
  fi
done

if [[ -z "$RUNTIME_BINARY" ]]; then
  echo "Failed to locate built whisper-cli binary in $BUILD_DIR" >&2
  exit 1
fi

cp "$RUNTIME_BINARY" "$DIST_DIR/$OUTPUT_FILE_NAME"

if [[ "$PLATFORM" != "win32" ]]; then
  chmod 755 "$DIST_DIR/$OUTPUT_FILE_NAME"
fi

echo "Runtime binary written to:"
echo "  $DIST_DIR/$OUTPUT_FILE_NAME"
