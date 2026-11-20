#!/bin/bash
# ios-xcode27-sdk-571 API/E2E PR-01 (temporary probe): select-release-xcode.sh's decision table against stand-in Apple tools.
# A temp folder holds fake `xcodebuild` and `xcrun` (first on PATH; they print FAKE_XCODE_OUT / FAKE_SDK, or fail when
# FAKE_FAIL names them) and empty Xcode_*.app/Contents/Developer folders. Each case: IOS_XCODE_APP_PATH and GITHUB_ENV set as
# the workflow sets them; the exit code, the script's output and what reached GITHUB_ENV.
# Usage: pr-01-standins.sh <clone root> <work dir>
set -uo pipefail
ROOT=$1; WORK=$2
rm -rf "$WORK"; mkdir -p "$WORK/bin"
cat > "$WORK/bin/xcodebuild" <<'EOF'
#!/bin/bash
[[ "${FAKE_FAIL:-}" == xcodebuild ]] && { echo "xcode-select: error: tool 'xcodebuild' requires Xcode" >&2; exit 1; }
[[ "$1" == -version ]] && printf '%b\n' "$FAKE_XCODE_OUT"
EOF
cat > "$WORK/bin/xcrun" <<'EOF'
#!/bin/bash
[[ "${FAKE_FAIL:-}" == xcrun ]] && { echo "xcrun: error: SDK \"iphoneos\" cannot be located" >&2; exit 1; }
[[ "$*" == "--sdk iphoneos --show-sdk-version" ]] && printf '%s\n' "$FAKE_SDK"
EOF
chmod +x "$WORK/bin/xcodebuild" "$WORK/bin/xcrun"
run() { # name, app folder, xcodebuild -version output, SDK, [FAKE_FAIL]
  local name=$1 app="$WORK/$2" out=$3 sdk=$4 failing=${5:-}
  mkdir -p "$app/Contents/Developer"; local env_file="$WORK/github_env"; : > "$env_file"
  echo "== $name (app $2; xcodebuild -version: $(printf '%b' "$out" | head -1); SDK '${sdk}'${failing:+; $failing fails})"
  PATH="$WORK/bin:$PATH" FAKE_XCODE_OUT="$out" FAKE_SDK="$sdk" FAKE_FAIL="$failing" IOS_XCODE_APP_PATH="$app" GITHUB_ENV="$env_file" \
    "$ROOT/autobyteus-ios/scripts/select-release-xcode.sh" 2>&1 | sed "s#$WORK#<temp>#g"
  echo "exit=${PIPESTATUS[0]}; GITHUB_ENV: $(sed "s#$WORK#<temp>#g" "$env_file" | tr '\n' ' ')"
}
run "27.2 / SDK 27.2 (the pinned release)" Xcode_27.2.app 'Xcode 27.2\nBuild version 27B52' 27.2
run "27.0 / SDK 27.0 (the image's oldest 27)" Xcode_27.0.app 'Xcode 27.0\nBuild version 27A1' 27.0
run "28.0 / SDK 28.0 (a later Xcode)" Xcode_28.0.app 'Xcode 28.0\nBuild version 28A1' 28.0
run "27.2 with an iPhoneOS 26.2 SDK" Xcode_27.2.app 'Xcode 27.2\nBuild version 27B52' 26.2
run "26.3 / SDK 26.2 (the beta.3 toolchain)" Xcode_26.3.app 'Xcode 26.3\nBuild version 17C1' 26.2
run "unparsable xcodebuild -version" Xcode_27.2.app 'Something else\nBuild version ?' 27.2
run "empty SDK version" Xcode_27.2.app 'Xcode 27.2\nBuild version 27B52' ''
run "xcodebuild fails" Xcode_27.2.app 'Xcode 27.2' 27.2 xcodebuild
run "xcrun cannot find the iphoneos SDK" Xcode_27.2.app 'Xcode 27.2\nBuild version 27B52' 27.2 xcrun
rm -rf "$WORK"
