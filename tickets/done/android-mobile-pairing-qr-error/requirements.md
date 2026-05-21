# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined / Design-ready.

## Goal / Problem Statement

Fix the Android-installed AutoByteus mobile pairing/opening failures reported on 2026-05-21:

1. Tapping **Scan QR** in the Android shell currently fails with "No compatible QR scanner app is installed" on the connected Xiaomi Android phone.
2. Opening the saved AutoByteus Desktop node in Android currently reaches the desktop `/mobile` shell but renders `Error 500: Cannot read properties of undefined (reading 'localeCompare')`.

The target behavior is an app-owned Android QR scan path plus a stable mobile web Home/catalog render path for the existing trusted private-network/Tailscale Phone Access workflow.

## Investigation Findings

- Android QR scanning is implemented only as a third-party ZXing-compatible external intent, not as an app-owned scanner. `AndroidExternalActions.startQrScan()` sends `Intent("com.google.zxing.client.android.SCAN")`; the Android manifest only queries that action and does not request `CAMERA`.
- ADB confirmed the connected device is visible as `dfd6c5c0` (`2109119DG`, Android 12 / SDK 31) and has the debug `org.autobyteus.mobile` app installed.
- ADB confirmed `cmd package resolve-activity -a com.google.zxing.client.android.SCAN` returns `No activity found` even though the phone has Xiaomi camera/scanner packages. Therefore the current button can only work on devices that install a compatible ZXing-intent scanner app.
- ADB launch reproduced the exact `/mobile` `Error 500` from the user screenshot. The visible UI text after launch was `Error 500`, `Cannot read properties of undefined (reading 'localeCompare')`, `Go back home`.
- Live GraphQL query to the desktop node confirmed `listWorkspaceRunHistory` returns team runs with `createdAt` but no `lastActivityAt`. The current mobile catalog mapper writes `lastActivityAt: run.lastActivityAt` for team runs, producing `undefined`; the sorter then calls `bTime.localeCompare(aTime)` and throws when `bTime` is `undefined`.
- The same team-run mapper also reads `run.lastKnownStatus`, but the current GraphQL query/type shape exposes `status`, not `lastKnownStatus`.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes, narrow local boundary/file responsibility issue in Android scan ownership; local mobile catalog mapping defect in web.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`):
  - Android QR: Boundary Or Ownership Issue / File Placement Or Responsibility Drift if fixed inside `AndroidExternalActions`, because QR scan is app-owned setup, not an external action.
  - `/mobile` Error 500: Local Implementation Defect with a stale DTO-field assumption (`lastActivityAt`/`lastKnownStatus` vs current `createdAt`/`status`).
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, but narrow: extract or add a dedicated Android QR scan coordinator instead of putting camera-scan ownership into `AndroidExternalActions`.
- Evidence basis: Android source inspection, ADB package/intent probes, ADB launch/UI dump, live GraphQL shape summary, and direct JavaScript reproduction of the `localeCompare` failure.
- Requirement or scope impact: The fix must remove dependence on third-party QR scanner apps and must align mobile catalog mapping/tests to the current run-history query shape.

## Recommendations

- Replace the external scanner-intent implementation with an app-owned Android QR scan coordinator using a bundled scanner dependency and explicit camera-permission handling.
- Keep decoded QR text flowing into the existing `ConnectionInputResolver` / `PairingLinkParser` path so QR, paste, share, and manual entry use one node URL/pairing policy.
- Fix `useMobileWorkCatalog` to map team-run `createdAt` into `MobileWorkContext.lastActivityAt` and derive status labels from `run.status`.
- Update stale mobile tests/mocks so team-run recent catalog coverage uses the current GraphQL/store shape (`createdAt`, `status`) and fails if `lastActivityAt` is accidentally read again.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

The code change is not large, but it crosses Android native scanning/permissions, Android tests, web mobile catalog mapping, web tests, and real-device ADB validation.

## In-Scope Use Cases

- UC-001: Android user scans the desktop Phone Access QR from inside the AutoByteus Android shell without installing a separate QR scanner app.
- UC-002: Android user cancels scanning or denies camera permission and receives recoverable guidance while paste/manual entry remain usable.
- UC-003: Android user scans or shares a valid Phone Access pairing QR/link and the existing save/open/pairing path opens `/mobile?pairing=...`.
- UC-004: Android user opens a saved paired node and the `/mobile` Home/recent-work catalog renders even when run history contains team runs shaped with `createdAt` but no `lastActivityAt`.
- UC-005: Developers can validate the fix with focused web tests, Android Gradle checks, and ADB real-device evidence.

## Out of Scope

- Public Internet exposure, Tailscale Funnel, or changing the trusted private-network/Tailscale guidance.
- Replacing the existing Phone Access pairing protocol, credential storage, or `/mobile` web shell ownership.
- Native Android implementation of chat/runs/files/tools beyond the existing WebView shell.
- Store/release signing or distribution finalization unless later delivery explicitly includes it.
- Broad run-history schema redesign; this task only corrects the mobile catalog mapping to the current query/type contract.

## Functional Requirements

- REQ-001: The Android shell MUST provide an app-owned QR scan flow for Phone Access pairing; it MUST NOT require a separately installed generic QR scanner app.
- REQ-002: The Android shell MUST request and handle camera permission explicitly enough to show a recoverable diagnostic when permission is denied.
- REQ-003: QR scan cancellation MUST return the user to the connection screen without a crash and with clear retry/paste guidance.
- REQ-004: A successful scan MUST pass the decoded QR text into the existing pairing URL/payload input resolver so scan, paste, share, and manual entry preserve one validation policy.
- REQ-005: Manual entry, paste, Android text-share intake, saved-node open, Tailscale open, HTTP acknowledgement, and trusted WebView navigation policy MUST keep their existing behavior unless directly required by the scanner fix.
- REQ-006: The mobile web recent-work catalog MUST map team-run activity time from the current run-history contract and MUST NOT call `localeCompare` on `undefined`.
- REQ-007: The mobile web recent-work catalog MUST derive team-run status labels from the current run-history contract.
- REQ-008: Automated or executable checks MUST cover the Android QR request-code/permission/result path and the mobile catalog team-run shape that previously crashed.
- REQ-009: Real-device validation MUST include ADB evidence for launching the updated app and opening the saved node without the `localeCompare` Error 500; if full camera scanning cannot be exercised, the limitation must be recorded explicitly.
- REQ-010: The delivered Android/mobile pairing package MUST be built from the corrected source state: the Android APK must include the QR scanner change, and the desktop-served `/mobile` assets must be rebuilt/repackaged so Android WebView loads the latest mobile web code instead of a stale bundle.

## Acceptance Criteria

- AC-001: On the connected Android device after installing the updated app, tapping **Scan QR** opens an app-owned scan/camera flow rather than showing "No compatible QR scanner app is installed".
- AC-002: If Android camera permission is denied, the app shows a diagnostic explaining that camera permission is needed for QR scanning and that paste/manual entry remain available.
- AC-003: If the scan is cancelled or returns an empty result, the app remains on the connection screen and provides retry/paste guidance; no crash or stale busy state occurs.
- AC-004: Scanning a valid Phone Access QR opens the same URL/pairing path as pasting that QR/link text.
- AC-005: Android unit/instrumentation coverage confirms the QR scan request code remains distinct from file chooser request code and that the scan coordinator handles permission/result edge cases.
- AC-006: Web unit coverage constructs a team run with `createdAt`/`status` and no `lastActivityAt`/`lastKnownStatus`; `useMobileWorkCatalog().recentWorkItems` does not throw and produces a team-run context whose `lastActivityAt` equals `createdAt`.
- AC-007: Opening the saved node from Android no longer displays `Error 500: Cannot read properties of undefined (reading 'localeCompare')`.
- AC-008: Implementation handoff includes commands/results for focused web tests, Android Gradle tests/build, and ADB device validation.
- AC-009: Delivery/validation evidence records the Android APK build installed for testing and the mobile web build/restart or packaging step that makes the corrected `/mobile` bundle available to the phone. If release metadata is produced, Android `versionCode`/`versionName` changes or an explicit no-release-version rationale are recorded.

## Constraints / Dependencies

- Work must continue in dedicated branch/worktree `codex/android-mobile-pairing-qr-error` at `/Users/normy/autobyteus_org/autobyteus-worktrees/android-mobile-pairing-qr-error`.
- Base branch is `origin/personal`; expected finalization target is `personal`.
- Android minSdk is 26, targetSdk/compileSdk 35, Kotlin Android plugin 2.0.21, Android Gradle plugin 8.13.2.
- The Android app already uses deprecated `startActivityForResult`/`onActivityResult` for a dependency-light shell and file chooser compatibility; scanner integration may reuse that pattern if bounded and tested.
- Maven Central reports `com.journeyapps:zxing-android-embedded` latest/release `4.3.0`; this is an acceptable bundled scanner dependency for this targeted fix unless implementation finds a concrete incompatibility.
- The `/mobile` runtime shown inside Android is served by the desktop AutoByteus node, not bundled as product UI in the APK. Therefore fixing the Error 500 requires rebuilding/repackaging the desktop-served mobile web assets from the corrected code, in addition to installing the updated APK for scanner behavior.
- The desktop `/mobile` shell remains server-served and WebView-owned; Android must not duplicate its product behavior.

## Assumptions

- The installed Android app corresponds to the current `origin/personal` Android shell closely enough for ADB findings to be valid.
- The current desktop node on port `29695` is representative for the saved-node Error 500; ADB reproduced the same error against it.
- `listWorkspaceRunHistory` intentionally exposes `createdAt` for recent-list ordering in this surface; the mobile catalog should not require `lastActivityAt` for team history items unless the query/type contract is deliberately changed in a separate task.

## Risks / Open Questions

- The bundled scanner dependency may require minor manifest/activity customization during implementation; keep it under the QR scan coordinator boundary.
- Real camera scanning validation depends on physical access and QR availability. ADB can validate launch/open behavior; API/E2E should capture camera-scan evidence if practical.
- Existing generated GraphQL types may be stale compared with handwritten `runHistoryTypes.ts`; implementation should avoid widening this task into generated-code cleanup unless required by tests/build.

## Requirement-To-Use-Case Coverage

- REQ-001 -> UC-001
- REQ-002 -> UC-002
- REQ-003 -> UC-002
- REQ-004 -> UC-003
- REQ-005 -> UC-003, UC-005
- REQ-006 -> UC-004
- REQ-007 -> UC-004
- REQ-008 -> UC-005
- REQ-009 -> UC-001, UC-004, UC-005
- REQ-010 -> UC-001, UC-004, UC-005

## Acceptance-Criteria-To-Scenario Intent

- AC-001 -> QR scan button launches working app-owned scan flow.
- AC-002 -> Permission denial is actionable.
- AC-003 -> Cancellation/empty scan is recoverable.
- AC-004 -> Valid QR payload reuses existing pairing parser/save/open path.
- AC-005 -> Android regression coverage for QR/file chooser boundaries.
- AC-006 -> Web regression coverage for current team-run history shape.
- AC-007 -> Real Android saved-node open no longer crashes mobile web.
- AC-008 -> Handoff evidence is sufficient for review and API/E2E.
- AC-009 -> Built artifacts and served mobile bundle reflect the corrected code state.

## Approval Status

Refined by solution designer from the user's explicit analyze/implement request and concrete ADB/code evidence. No open product clarification blocks design; downstream review should treat this as design-ready scope for this bug-fix task.
