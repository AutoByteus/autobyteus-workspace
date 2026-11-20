#!/bin/bash
# ios-demo-mode-279 API/E2E (temporary): runs one of ApiE2E279UITests on my simulator from the fresh-start clone's build
# (`build-for-testing` into /private/tmp/abtest279/dd-new), installing the new app as an update over what is there.
# Fresh pairing links are made just before the run (the node's codes live 5 minutes) and passed as TEST_RUNNER_API279_*; they
# are never written to the log. Usage: run-new.sh <test name> <simulator: iphone|ipad> <case id> [link names…]
set -uo pipefail
TEST=$1; SIM=$2; ID=$3; shift 3
# Round 2: API279_OUT=<evidence dir> and API279_COMMIT=<commit> (defaults: round 1).
E=${API279_OUT:-/Users/normy/autobyteus_org/autobyteus-worktrees/ios-demo-mode-279/tickets/in-progress/ios-demo-mode-279/evidence/api-e2e/ios}
IOS=$HOME/.cache/abtest279/fs-ios/autobyteus-ios
UDID=$(grep -o "$SIM=[^ ]*" /tmp/abtest279-sims.txt | cut -d= -f2)
ST=/tmp/abtest279/node/state.json
export TEST_RUNNER_API279_BASE=$(node -pe "require('$ST').base")
export TEST_RUNNER_API279_PAGE_TEXT=http://127.0.0.1:52790/share2.html TEST_RUNNER_API279_PAGE_PLAIN=http://127.0.0.1:52790/plain.html
for name in "$@"; do
  tag="$name-$(date +%s)"; rm -f /tmp/abtest279/node/link-$tag.txt; touch /tmp/abtest279/node/pair-$tag
  until [ -f /tmp/abtest279/node/link-$tag.txt ]; do sleep 0.3; done
  export "TEST_RUNNER_API279_LINK_$(echo "$name" | tr a-z A-Z)=$(cat /tmp/abtest279/node/link-$tag.txt)"
done
RES="$E/$ID.xcresult"; rm -rf "$RES"
{ echo "# $ID: ApiE2E279UITests/$TEST on apie2e279-$SIM ($UDID); fresh-start clone build (${API279_COMMIT:-429af9bd66} + the temporary test file); $(date -u +%FT%TZ); load $(uptime | sed 's/.*load averages: //')"; echo "# links made just before: $*"; } > "$E/$ID.log"
xcodebuild -project "$IOS/AutoByteusMobile.xcodeproj" -scheme AutoByteusMobile -destination "platform=iOS Simulator,id=$UDID" \
  -derivedDataPath /private/tmp/abtest279/dd-new -resultBundlePath "$RES" -only-testing:"AutoByteusMobileUITests/ApiE2E279UITests/$TEST" \
  IOS_BUNDLE_ID=org.autobyteus.mobile IOS_SHARE_EXTENSION_BUNDLE_ID=org.autobyteus.mobile.share MARKETING_VERSION=1.3.83 CURRENT_PROJECT_VERSION=2 \
  test-without-building 2>&1 | sed -E 's#(pairing=)[^&" ]+#\1…#g' | grep -E "Test Case|error:|Executed|\*\* TEST|API279" >> "$E/$ID.log"
echo "# exit: ${PIPESTATUS[0]}" >> "$E/$ID.log"
mkdir -p "$E/$ID-shots"; xcrun xcresulttool export attachments --path "$RES" --output-path "$E/$ID-shots" >/dev/null 2>&1
python3 - "$E/$ID-shots" <<'PY'
import json, os, sys
d = sys.argv[1]; m = json.load(open(os.path.join(d, 'manifest.json')))
for t in m:
    for a in t.get('attachments', []):
        name, f = a.get('suggestedHumanReadableName', ''), a.get('exportedFileName')
        src = os.path.join(d, f)
        if not os.path.exists(src): continue
        keep = not (name.startswith('Debug description') or name.startswith('Synthesized Event') or name.startswith('UI Snapshot') or name.startswith('App UI hierarchy'))
        if keep and f.endswith(('.png', '.jpeg', '.txt', '.mp4')): os.rename(src, os.path.join(d, name.split('_0_')[0].replace(' ', '-') + os.path.splitext(f)[1]))
        elif os.path.exists(src): os.remove(src)
PY
tail -5 "$E/$ID.log"
