# Handoff Summary — ios-demo-mode-279 (autobyteus-279)

## Summary Meta

- Ticket: `ios-demo-mode-279` (Project Task `autobyteus-279`): the iOS app's built-in demo for App Review, the scan-first start screen, share handling, the iPad layout, DC-007, DC-011 and local icons.
- Date: `2026-11-19`
- Classification: `task_size: Large`, `architectural_risk: High`.
- Route: architecture review ARCH-REV-001…004 → implementation IR-001, IR-002 → source review CRR-001 Pass, CRR-002 (Design Impact F-1 → SR-003/SR-004), CRR-003 Pass → API/E2E API-REV-001 Fail F-1, API-REV-002 Pass (91%) → test-code review CRR-004 Pass → delivery DR-001.
- Current Status: `Verified from evidence, base integrated and docs synced locally; NT-01 passed (on the founder's "Ok run it"), the App Reviewer sweep passed; waiting for the founder's word on the merge (REQ-014)`.
- Branch: `codex/ios-demo-mode-279` (local only), base `origin/personal` @ `8430d9ef12`; delivery checkpoint `7a88198a2b`; base refresh `422a2955c5` merged as `0e58926e03`; docs sync `09aabdc4f9`.

## Delivery Summary

- **iOS first screen, as on Android:** Scan, Try demo, Your nodes, Other ways to connect (Type an address, Paste a link); Connecting and Can't reach.
- **The built-in demo:** Try demo, the demo QR code or `autobyteus://demo` opens the real phone screens on a sample node inside the page (`autobyteus-web/demo/`, the `--demo` build bundled as `DemoWeb/`), with no network, no credential and nothing kept; "Demo / Sample data", the welcome card and Leave demo.
- **Share:** the extension keeps the text; the app acts once (pairing link connects, demo link opens the demo, other text pre-fills Type an address).
- **iPad:** cards from 768 px, two panes from 1024 px; native screens centered.
- **Phone shell, all builds:** DC-007 (your own send follows the reply, desktop too), DC-011 (phone Artifacts read only), local icons (no Iconify request).
- **Saved computers from the shipped app:** a one-time migration turns its placeholder name into "no known name"; one name rule as on Android (IR-002).
- **Release workflow:** both macOS jobs of `release-ios.yml` build the demo from `pnpm install`.
- Docs: `autobyteus-web/docs/remote_access.md`, `autobyteus-ios/README.md`, `docs/ios_mobile_access.md` (`docs-sync-report.md`).

## Verification Summary

- Verified from evidence by delivery: every critical acceptance criterion is proven on iOS simulators with a real node, apart from the parts only the founder can check after his word (REQ-014): the real camera scan (AC-002), airplane mode (AC-003), TestFlight on a device (AC-009), the review notes on the build (AC-010).
- Key evidence (`evidence/api-e2e/`): `r2/FS-iOS-smoke-run2.log` (`Executed 8 tests, with 0 failures`, no skips), `r2/FS-iOS-run1-collided.log` (`# fresh: 0 prior build folders`; "The demo answers all 252 compiled operations"; core `Executed 56 tests, with 0 failures`), `r2/API-04a-shipped-app.log` (`'displayName': 'AutoByteus Desktop'` before), `r2/API-04b-update-shots/update-page-names.txt` (`Test Node 279, Connected`) and `update-native-names.txt` (`AutoByteus node, Online, current node`), `r2/FS-DOCKER.log` ("The /mobile build holds no demo code."), round-1 API-01 (phone probe 87 cases), API-02 (share), API-03 (iPad rotation), API-05 (40 MB PDF).
- Integrated state (`evidence/delivery/`): install exit 0; both typechecks PASS at their baselines (server 1006 in 315, web 87 in 37); 103 web test files (the ticket's specs and the base's update-notification specs) `717 passed`, one failure pre-existing on `personal` (FU-006); `prepare-demo-web.sh --build` exit 0, "The demo answers all 252 compiled operations", DemoWeb 13 MB.
- NT-01, the build-only `release-ios.yml` run on the founder's "Ok run it": run 44683214480 success (Xcode 26.3; the demo built from `pnpm install`; core 56/56; smoke 8/8 without skips; both publish jobs skipped) (`evidence/delivery/DEL-05-NT01-build-only-run.txt`).
- The Solution Designer's App Reviewer sweep on the built app: pass (`evidence/build-sweep/verdict.md`); residual R-1 (the kept share at a first launch, 1 of 9 runs) and R-2 (device-only checks).

## Residual Risks For The User

- The kept share at a first launch failed once in 9 simulator runs (sweep R-1); to check on the real iPhone.
- DemoWeb adds 13 MB to the app.
- iOS `saveFile` decodes on the main thread: one ~1.8 s stall measured for a 40 MB PDF under heavy host load.
- An old saved computer reads "AutoByteus node" natively until it is paired again (Android's rule).
- Once on `personal`, the next release tag uploads this iOS build to App Store Connect/TestFlight.
