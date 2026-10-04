# iOS publication attempt 1 / retry

Run 37222785591 at unchanged release commit 517409d404a0731675943735c0810348000cb2e0.
Attempt 1 failed exit 65 in `testFakeNodeOpensAndRestoresWithFakeMobileMarker`:
WebView absent at both open/restore checks (line 66), fake marker absent (line 68), four assertions total. Native unreachable-diagnostic UI case and core tests passed. Upload jobs were skipped.

`git diff --stat v1.4.94-beta.3..v1.4.94-beta.4 -- autobyteus-ios .github/workflows/release-ios.yml` is empty. Test uses a local static fake server, not changed GitHub skill UI. Earlier beta.3 also recorded a same-case intermittent failure, but this attempt's absent-WebView symptom is not claimed identical to beta.3's blank existing WebView. Root cause not established from console alone.

Recovery: `gh run rerun 37222785591 --failed --repo AutoByteus/autobyteus-workspace` accepted (exit 0); API confirms attempt 2, same SHA. No source/test changes, assertion bypass, new tag or duplicate release dispatch. Result pending; retain failure log and job JSON regardless of retry outcome.

Artifact inspection narrows the failed boundary: `ios-attempt1-opened.png` shows the native **AutoByteus node is unreachable / request timed out** diagnostic for `http://127.0.0.1:29876/mobile`, not a blank loaded WebView. Fake-server log records `/rest/remote-access/status` followed by BrokenPipeError while writing its response; no `/mobile` request. Restored UI hierarchy stays on the connection form. Thus the marker failure follows a local simulator-to-fake-node preflight timeout, not execution of the changed frontend. Why that request timed out is not established; do not label it the prior beta's WKWebView first-load issue. Retain screenshot/server log/hierarchy; rerun outcome will decide publication recovery.

## Recovery result
Attempt 2 on the exact same SHA succeeded, including implementation checks, publish-secret validation and Archive And Upload To App Store Connect. `ios-final-attempt.json` and `run-37222785591.json` retain the final receipt. Classified as an intermittent CI simulator-to-local-fake-node preflight timeout, recovered by one failed-job rerun; deeper timing cause remains unknown. No test/production change or bypass. First-attempt failure remains recorded, not rewritten as Pass.
