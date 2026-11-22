#!/usr/bin/env bash
# Run an AppImage (or a bare AppImage runtime) inside a clean Ubuntu 24.04 base root
# (zlib1g only: libz.so.1, no libz.so, no libfuse) and print its runtime version.
# Usage (as root, arm64 host): clean-root-runtime-probe.sh UBUNTU_BASE_TARBALL IMAGE [ARGS...]
#   UBUNTU_BASE_TARBALL: https://cdimage.ubuntu.com/ubuntu-base/releases/24.04/release/ubuntu-base-24.04.5-base-arm64.tar.gz
#   (sha256 a91d5a93010193712d346d761372b7c9db6dfcf093893161c64ca107f05914f2)
# Default ARGS: --appimage-version. Exit code is the image's exit code (127 = a shared library is missing).
set -u
base="$1"; image="$2"; shift 2; [ $# -gt 0 ] || set -- --appimage-version
root="$(mktemp -d)"; trap 'umount "$root/proc" 2>/dev/null; rm -rf "$root"' EXIT
tar xzf "$base" -C "$root" --exclude='dev/*'
test ! -e "$root/usr/lib/aarch64-linux-gnu/libz.so" || { echo "precondition failed: libz.so present" >&2; exit 2; }
cp "$image" "$root/image" && chmod +x "$root/image"
mount -t proc proc "$root/proc"
chroot "$root" /image "$@"; code=$?
echo "exit=$code"; exit $code
