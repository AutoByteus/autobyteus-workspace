#!/usr/bin/env bash
# The iOS release toolchain rule (autobyteus-571): the Xcode at IOS_XCODE_APP_PATH, and its iPhoneOS SDK, must be major
# version MINIMUM_MAJOR or newer, because App Store Connect refuses apps built with an older SDK (ITMS-90725). Used by
# both macOS jobs of .github/workflows/release-ios.yml, which owns the default path (env IOS_XCODE_APP_PATH).
#
# On success: DEVELOPER_DIR is appended to $GITHUB_ENV, and the selected app, the full `xcodebuild -version` output and
# the iPhoneOS SDK are logged. On failure: exit 1 with an ::error:: naming what was found and where.
set -euo pipefail

MINIMUM_MAJOR=27

fail() {
  echo "::error::$1"
  exit 1
}

selected_xcode="${IOS_XCODE_APP_PATH:-}"
[[ -n "$selected_xcode" ]] || fail "IOS_XCODE_APP_PATH is not set; the workflow's env gives the Xcode app to use."
[[ -n "${GITHUB_ENV:-}" ]] || fail "GITHUB_ENV is not set; it receives DEVELOPER_DIR for the later steps."

developer_dir="${selected_xcode}/Contents/Developer"
if [[ ! -d "$developer_dir" ]]; then
  echo "Installed Xcode apps:"
  ls -1d /Applications/Xcode*.app 2>/dev/null || true
  fail "Configured Xcode ${MINIMUM_MAJOR}+ app path is unavailable: $selected_xcode"
fi
export DEVELOPER_DIR="$developer_dir"

# The full output first, then the parse: a pipe into `head` could end xcodebuild early (SIGPIPE under pipefail).
xcode_version_output="$(xcodebuild -version)"
xcode_version=""
while IFS= read -r line; do
  if [[ "$line" == Xcode\ * ]]; then
    xcode_version="${line#Xcode }"
    break
  fi
done <<< "$xcode_version_output"
xcode_major="${xcode_version%%.*}"
if ! [[ "$xcode_major" =~ ^[0-9]+$ ]] || (( xcode_major < MINIMUM_MAJOR )); then
  printf '%s\n' "$xcode_version_output"
  fail "Selected Xcode must be ${MINIMUM_MAJOR} or newer; found '${xcode_version:-unknown}' at $selected_xcode."
fi

sdk_version="$(xcrun --sdk iphoneos --show-sdk-version)"
sdk_major="${sdk_version%%.*}"
if ! [[ "$sdk_major" =~ ^[0-9]+$ ]] || (( sdk_major < MINIMUM_MAJOR )); then
  fail "Selected iPhoneOS SDK must be ${MINIMUM_MAJOR} or newer; found '${sdk_version:-unknown}' (Xcode at $selected_xcode)."
fi

echo "DEVELOPER_DIR=$DEVELOPER_DIR" >> "$GITHUB_ENV"
echo "Selected Xcode app: $selected_xcode"
printf '%s\n' "$xcode_version_output"
echo "Selected iPhoneOS SDK: $sdk_version"
