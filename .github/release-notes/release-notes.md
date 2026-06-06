# Release Notes — iOS Wrapper App and Mobile Release Workflow

## New iOS App Shell

- Added the first native AutoByteus iOS wrapper project with a `WKWebView` shell for the server-served `/mobile` experience.
- Added first-run node connection, saved-node restore, QR scanner entry, paste/share handoff, trusted navigation boundaries, and native diagnostics for unreachable nodes.
- Added a share extension handoff path while keeping mobile access credentials inside web storage rather than persisting `mra_...` secrets natively.

## Build, Signing, and Release Automation

- Added XcodeGen project generation, core unit tests, simulator smoke tests, fake-node smoke support, and signing-readiness checks under `autobyteus-ios`.
- Added `.github/workflows/release-ios.yml` with build-only validation and guarded App Store Connect/TestFlight archive/upload support.
- Added release metadata and contract checks for numeric iOS marketing/build versions, prerelease artifact metadata, app/share bundle IDs, required iOS secrets, and App Store provisioning profile validation.

## Documentation and Validation

- Documented iOS setup, simulator validation, signing readiness, GitHub Actions release paths, TestFlight/App Store limits, and Phone Access mobile-wrapper ownership.
- Validated locally and on GitHub-hosted macOS: core tests passed 21/0 and simulator UI smoke passed 2/0 without skips.
- This release includes the workflow and build-only proof. Physical iPhone QR/file-upload/live-node evidence and a real TestFlight/App Store upload remain separate release-readiness gates.
