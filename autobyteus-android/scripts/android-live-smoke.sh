#!/usr/bin/env bash
set -euo pipefail

APK_PATH="${1:-autobyteus-android/app/build/outputs/apk/debug/app-debug.apk}"
EVIDENCE_DIR="${2:-docs/task-artifacts/android-tailscale-mobile-shell/e2e-evidence}"
PACKAGE_NAME="org.autobyteus.mobile"
ACTIVITY_NAME="org.autobyteus.mobile/.MainActivity"

mkdir -p "$EVIDENCE_DIR"

if ! command -v adb >/dev/null 2>&1; then
  echo "adb is required for live Android validation." >&2
  exit 1
fi

if [ ! -f "$APK_PATH" ]; then
  echo "APK not found: $APK_PATH" >&2
  exit 1
fi

adb devices | tee "$EVIDENCE_DIR/adb-devices.txt"
if ! adb devices | awk 'NR>1 && $2 == "device" { found=1 } END { exit(found ? 0 : 1) }'; then
  echo "No USB-connected Android device in 'device' state." >&2
  exit 1
fi

shasum -a 256 "$APK_PATH" | tee "$EVIDENCE_DIR/apk-sha256.txt"
adb install -r "$APK_PATH" | tee "$EVIDENCE_DIR/adb-install.txt"
adb shell pm clear "$PACKAGE_NAME" | tee "$EVIDENCE_DIR/app-data-clear.txt"
adb shell am start -n "$ACTIVITY_NAME" | tee "$EVIDENCE_DIR/app-launch.txt"
sleep 3
adb exec-out screencap -p > "$EVIDENCE_DIR/first-launch.png"
adb logcat -d -t 400 > "$EVIDENCE_DIR/logcat-initial.txt"

cat > "$EVIDENCE_DIR/next-steps.txt" <<'NEXT'
Manual/API-E2E steps still required:
1. Confirm Android phone is signed into Tailscale and AutoByteus Android is not excluded by split tunneling.
2. Enter or paste the stable AutoByteus Tailscale URL / pairing link.
3. Complete the existing /mobile pairing flow.
4. In Chat, use an attachment/file upload control and confirm Android opens the native picker and returns the selected file to the mobile composer.
5. Force-stop and reopen org.autobyteus.mobile; confirm saved-node restore.
6. Simulate unreachable node or Tailscale-off state; capture native diagnostic screenshot.
7. Record desktop-node mode: development-node or packaged-Electron.
NEXT

echo "Initial evidence written to $EVIDENCE_DIR"
