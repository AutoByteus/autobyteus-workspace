# GitHub iOS Build-Only Workflow Run Result

Date: 2026-06-06T15:54Z UTC

- Run ID: `27066610907`
- URL: https://github.com/AutoByteus/autobyteus-workspace/actions/runs/27066610907
- Trigger: temporary branch-push trigger on `codex/ios-wrapper-app`
- Head SHA tested: `c32f20f3a10274307efc92cdd35675f1ccfc98b9`
- Result: `success`
- Jobs:
  - `Resolve iOS Release Metadata`: success
  - `Build And Test iOS App`: success
  - `Validate iOS Publish Secrets`: skipped because branch-push build-only resolved `publish_requested=false`
  - `Archive And Upload To App Store Connect`: skipped because branch-push build-only resolved `publish_requested=false`

This proves the iOS GitHub-hosted macOS build-only path can resolve metadata, generate/build/test/smoke the iOS app, write publish-secret readiness, and upload build/test artifacts. It intentionally does not prove App Store Connect/TestFlight upload.

Annotation observed: GitHub warns that Node.js 20 actions are deprecated for `actions/checkout@v4` / `actions/upload-artifact@v4` before future Node 24 enforcement.
