#!/bin/bash
# Temporary (642): run selectors of a real-node UI test class, recorded. Usage: ios-run.sh <label> <Class> <method>...
cd /Users/normy/autobyteus_org/autobyteus-worktrees/file-viewer-media-642/autobyteus-ios || exit 1
R=$(cd /tmp/api642 && pwd -P); UDID=$(cat $R/ios-udid.txt); L=$1; C=$2; shift 2; mkdir -p $R/ios-results
SEL=(); for m in "$@"; do SEL+=("-only-testing:AutoByteusMobileUITests/$C/$m"); done
rm -rf $R/ios-results/$L.mp4 $R/ios-results/$L.xcresult; xcrun simctl io $UDID recordVideo --codec=h264 --force $R/ios-results/$L.mp4 > /dev/null 2>&1 & REC=$!
sleep 1; node -e 'console.log(Date.now())' > $R/ios-results/$L.since.txt
TEST_RUNNER_AUTOBYTEUS_574_REAL_NODE_INFO=$R/stack-ios/stack-info.json TEST_RUNNER_AUTOBYTEUS_574_REAL_NODE_SECRETS=$R/ios.secrets.json \
xcodebuild -project AutoByteusMobile.xcodeproj -scheme AutoByteusMobile -destination "id=$UDID" -derivedDataPath $R/ios-dd \
  IOS_BUNDLE_ID=org.autobyteus.mobile IOS_SHARE_EXTENSION_BUNDLE_ID=org.autobyteus.mobile.share MARKETING_VERSION=1.5.14 CURRENT_PROJECT_VERSION=1 \
  -resultBundlePath $R/ios-results/$L.xcresult "${SEL[@]}" test-without-building > $R/ios-results/$L.log 2>&1
echo exit=$?; kill -INT $REC; wait $REC 2>/dev/null
grep -E "^MARK|^POSITION|^REQUESTS|^REOPEN|^REFERENCE|Test Case.*(passed|failed)|error:|NO-" $R/ios-results/$L.log | cut -c1-300
