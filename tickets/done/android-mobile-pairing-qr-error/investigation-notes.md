# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; dedicated git worktree/branch created; draft artifacts initialized before deep investigation.
- Current Status: Deep investigation complete; root causes identified; requirements refined; design produced.
- Investigation Goal: Determine whether Android QR scanning is implemented, identify why Android cannot scan without a third-party scanner, and root-cause the `/mobile` `localeCompare` Error 500 seen after opening a saved node.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Crosses Android native shell, desktop Phone Access pairing entry, mobile web recent-work catalog, web tests, Android tests, and ADB device validation.
- Scope Summary: Replace external-only Android QR scanning with app-owned scanning and fix mobile web team-run catalog mapping to stop `localeCompare` crashes.
- Primary Questions Resolved:
  - Is **Scan QR** implemented? Yes, but only as an external ZXing-compatible scanner intent; no in-app scanner/camera permission exists.
  - Why does it fail on the user's phone? ADB reports no activity resolves `com.google.zxing.client.android.SCAN` on the connected Xiaomi device.
  - What throws `localeCompare`? `autobyteus-web/composables/mobile/useMobileWorkCatalog.ts` maps team runs from nonexistent `run.lastActivityAt`, then sorts with `bTime.localeCompare(aTime)`.
  - Can ADB reproduce? Yes; ADB launch reproduced the exact Error 500 text.

## Request Context

User reported on 2026-05-21 that the previously built/installed Android app cannot scan QR from **SCAN QR** and that opening a saved node on Android shows `Error 500: Cannot read properties of undefined (reading 'localeCompare')`. User supplied three screenshots: Android pairing shell with scanner warning, Android `/mobile` Error 500 page, and desktop Phone Access QR generation UI.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-mobile-pairing-qr-error`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/android-mobile-pairing-qr-error`
- Current Branch: `codex/android-mobile-pairing-qr-error`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-mobile-pairing-qr-error`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-05-21.
- Task Branch: `codex/android-mobile-pairing-qr-error`, tracking `origin/personal`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Work must continue in the dedicated worktree, not the shared superrepo checkout.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-21 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch --show-current && git symbolic-ref refs/remotes/origin/HEAD` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Bootstrap repository context | Main checkout on `personal`, tracking `origin/personal`; repo remote is `git@github.com-ryan:AutoByteus/autobyteus-workspace.git`; remote HEAD `origin/personal`. | No |
| 2026-05-21 | Command | `git fetch origin --prune` | Refresh tracked remote before task worktree creation | Completed successfully. | No |
| 2026-05-21 | Command | `git worktree list --porcelain` | Check existing worktrees and avoid branch collision | No existing worktree for this exact task; many existing Codex worktrees present. | No |
| 2026-05-21 | Command | `git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/android-mobile-pairing-qr-error -b codex/android-mobile-pairing-qr-error origin/personal` | Create mandatory dedicated task worktree/branch | Worktree created at `80298db5 chore(ticket): record android tailscale release completion`. | No |
| 2026-05-21 | Code | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Required shared design read | Design must be spine-first, ownership-boundary based, no compatibility wrappers. | No |
| 2026-05-21 | Code | `autobyteus-android/app/src/main/java/org/autobyteus/mobile/shell/AndroidExternalActions.kt` lines 15-29 | Inspect QR scan implementation | `startQrScan()` sends external `Intent("com.google.zxing.client.android.SCAN")` and catches `ActivityNotFoundException` to show exactly the user's warning text. | Design app-owned scanner |
| 2026-05-21 | Code | `autobyteus-android/app/src/main/AndroidManifest.xml` lines 3-19 | Inspect Android permissions/queries | App requests `INTERNET` and `ACCESS_NETWORK_STATE`, not `CAMERA`; manifest only queries the ZXing scan intent. | Add camera permission and remove external scanner reliance |
| 2026-05-21 | Code | `autobyteus-android/app/src/main/java/org/autobyteus/mobile/MainActivity.kt` | Inspect QR result flow and open flow | `onActivityResult()` accepts `SCAN_RESULT` for `AndroidExternalActions.QR_SCAN_REQUEST` and calls `submitInput`; `submitInput` already routes through existing parser/validation/open flow. | Reuse `submitInput` for app-owned scanner result |
| 2026-05-21 | Code | `autobyteus-android/app/src/main/java/org/autobyteus/mobile/connection/PairingLinkParser.kt` | Check pairing QR/link parsing | Supports `/mobile?pairing=...`, raw base64url payload, JSON payload, and plain node URLs; saves clean stable `mobileUrl`. | Preserve this boundary |
| 2026-05-21 | Doc | `autobyteus-android/README.md`; `docs/android_mobile_access.md` | Check documented behavior | Documentation currently says to scan with a compatible QR scanner app, share/paste, or manually enter URL. This confirms external-scanner dependence was intentional in MVP but fails current product expectation. | Update docs later if delivery docs sync decides impact |
| 2026-05-21 | Command | `adb devices -l`; `adb shell pm path org.autobyteus.mobile`; `adb shell dumpsys package org.autobyteus.mobile` | Verify connected device and installed package | Device `dfd6c5c0`, model `2109119DG`, Android package installed as debug app, version `0.1.0`; requested permissions exclude camera. | Use for validation baseline |
| 2026-05-21 | Command | `adb shell cmd package resolve-activity --brief -a com.google.zxing.client.android.SCAN` | Verify external scanner intent availability | Output: `No activity found`. Device has camera/scanner packages but none handle ZXing's scan action. | Confirms root cause for Scan QR failure |
| 2026-05-21 | Command | `adb shell am start -n org.autobyteus.mobile/.MainActivity`; `adb shell uiautomator dump`; `adb exec-out screencap` | Reproduce Android saved-node open behavior | ADB-visible text after launch: `Error 500`, `Cannot read properties of undefined (reading 'localeCompare')`, `Go back home`. Evidence stored under `tickets/done/android-mobile-pairing-qr-error/adb-evidence/`. | Fix mobile web mapping and revalidate |
| 2026-05-21 | Log | `adb logcat -d -t 1200 | rg -i ...` | Capture Android/WebView launch context | Logcat shows `org.autobyteus.mobile` launched and WebView loading `http://normys-macbook-pro.tail0347f8.ts.net:29695/mobile/...`; no native Android crash. | Error is web app render/runtime, not native app crash |
| 2026-05-21 | Code | `autobyteus-web/composables/mobile/useMobileWorkCatalog.ts` lines 80-145 | Locate likely `localeCompare` source | Agent run contexts set `lastActivityAt: run.createdAt`; team run contexts set `lastActivityAt: run.lastActivityAt` and `statusLabel: toStatusLabel(run.lastKnownStatus, ...)`; sorter calls `bTime.localeCompare(aTime)`. | Replace team fields with current contract |
| 2026-05-21 | Code | `autobyteus-web/graphql/queries/runHistoryQueries.ts` lines 3-51 | Verify query fields | `ListWorkspaceRunHistory` selects `createdAt` for agent and team runs; it does not select `lastActivityAt` or `lastKnownStatus` for team runs. | Align mapper/tests with query |
| 2026-05-21 | Code | `autobyteus-web/stores/runHistoryTypes.ts` lines 86-100 | Verify store type fields | `TeamRunHistoryItem` has `createdAt` and `status`; no `lastActivityAt` or `lastKnownStatus`. | Confirms mapper is stale/wrong |
| 2026-05-21 | Command/Data | Live GraphQL query to `http://127.0.0.1:29695/graphql`; summarized in `adb-evidence/live-run-history-shape-summary.txt` | Verify live desktop data shape | 52 team runs returned, 1 active; sample team runs have `createdAt` and no `lastActivityAt`. | Add regression test |
| 2026-05-21 | Script | `node` reproduction stored at `adb-evidence/mobile-catalog-localecompare-repro.txt` | Prove field mismatch produces exact error shape | Query-shaped team run yields `contextLastActivityAt: undefined`; current sort code throws `TypeError: Cannot read properties of undefined (reading 'localeCompare')`. | Fix mapping/sort guard |
| 2026-05-21 | External | Maven metadata `https://repo1.maven.org/maven2/com/journeyapps/zxing-android-embedded/maven-metadata.xml` via Python urllib | Check bundled scanner dependency availability | Latest/release for `com.journeyapps:zxing-android-embedded` is `4.3.0`. | Use unless implementation finds incompatibility |

## Current Behavior / Current Flow

- Current Android scan entrypoint: `ConnectionScreen` button -> `MainActivity.showConnection()` callback -> `AndroidExternalActions.startQrScan()` -> external ZXing intent -> `ActivityNotFoundException` diagnostic on this device.
- Current QR result flow when an external scanner exists: `MainActivity.onActivityResult()` -> read `SCAN_RESULT` -> `submitInput(scanText, false)` -> `ConnectionInputResolver` -> `PairingLinkParser`/`NodeUrlNormalizer` -> `validateAndOpen()` -> `AutoByteusWebView`.
- Current saved-node open flow: `MainActivity.onCreate()` -> `SavedNodeStore.loadSelectedProfile()` -> `ConnectionValidator.validate()` against `/rest/remote-access/status` -> `AutoByteusWebView.create(initialUrl)` -> server-served `/mobile` app.
- Current web mobile failure flow: `/mobile` route renders `MobileRemoteAccessShell` -> `useMobileWorkCatalog().recentWorkItems` maps run-history team runs with `run.lastActivityAt` -> `undefined.localeCompare(...)` in sort -> Nuxt error page.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Android QR has a boundary/file-responsibility issue if kept under external actions; mobile web crash is a local implementation defect/stale DTO assumption.
- Refactor posture evidence summary: Narrow refactor needed now: separate app-owned QR scan coordination from `AndroidExternalActions`, which should remain external app/link actions.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `AndroidExternalActions.kt` | QR launch is an external third-party scan intent | Android shell does not own a core first-run setup action | Add `QrScanCoordinator` and scanner dependency |
| Android manifest / package dump | No camera permission, no scanner activity, only query to external ZXing action | The APK cannot scan on its own | Add `CAMERA` permission and owned scanner launch/permission handling |
| ADB intent resolution | `No activity found` for ZXing scan action | User warning is expected on this device | Remove reliance on external action |
| `useMobileWorkCatalog.ts` + GraphQL query/type | Mapper reads fields not present in the current team-run contract | Local mapping defect causing `undefined.localeCompare` | Map `createdAt`/`status`, update tests |
| ADB launch UI dump | Exact Error 500 reproduced on device | Failure is live and blocks saved-node open | Revalidate after web fix |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/shell/AndroidExternalActions.kt` | External Android actions (currently also QR scan) | Mixes Tailscale/browser external opening with QR scan entry | Remove QR scan from this file; keep true external actions here |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/MainActivity.kt` | Activity lifecycle, native shell orchestration, result callbacks | Already owns `onActivityResult`, save/open, and submit input flow | Wire QR coordinator here; do not duplicate parsing |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/connection/ConnectionInputResolver.kt` | Resolve QR/link/manual text into profile + WebView URL | Correct shared policy for scan/paste/share/manual input | Reuse unchanged for decoded QR text |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/connection/PairingLinkParser.kt` | Parse Phone Access pairing input | Supports URL, base64url, JSON, plain node URLs | Preserve as authoritative input parser |
| `autobyteus-android/app/src/main/AndroidManifest.xml` | Permissions, app/activity declarations, package queries | Missing `CAMERA`; contains external scanner query | Add camera permission; remove obsolete ZXing scan query if no longer needed |
| `autobyteus-android/app/build.gradle.kts` | Android app dependencies/build config | No scanner dependency | Add bundled scanner dependency under app module |
| `autobyteus-android/app/src/androidTest/java/org/autobyteus/mobile/AutoByteusMobileShellSmokeTest.kt` | Android instrumentation smoke tests | QR/file chooser request-code test references `AndroidExternalActions.QR_SCAN_REQUEST` | Update to QR coordinator and add permission/result coverage where feasible |
| `autobyteus-web/composables/mobile/useMobileWorkCatalog.ts` | Mobile Home/context-switcher catalog projection | Team-run mapper uses stale fields; sorter is not runtime-safe | Map current fields and guard sort extraction |
| `autobyteus-web/graphql/queries/runHistoryQueries.ts` | Run-history query contract used by store | Selects `createdAt`/`status`, not `lastActivityAt`/`lastKnownStatus` | Mapper/tests should follow this contract |
| `autobyteus-web/components/mobile/__tests__/MobileContextSelectionRegression.spec.ts` | Mobile context/catalog regression tests | Existing test uses stale `lastActivityAt`/`lastKnownStatus` fields in team-run mock | Convert to query-shaped mock and assert no throw |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-21 | Probe | `adb devices -l` | Device `dfd6c5c0`, model `2109119DG`, connected as `device`. | ADB validation possible. |
| 2026-05-21 | Probe | `adb shell dumpsys package org.autobyteus.mobile` | Installed debug app `versionName=0.1.0`; requested permissions are internet/network state only. | Installed app lacks camera scan capability. |
| 2026-05-21 | Probe | `adb shell cmd package resolve-activity --brief -a com.google.zxing.client.android.SCAN` | `No activity found`. | Current scan button cannot work on this phone. |
| 2026-05-21 | Repro | `adb shell am start -n org.autobyteus.mobile/.MainActivity` then UIAutomator dump | Visible text: `Error 500`, `Cannot read properties of undefined (reading 'localeCompare')`, `Go back home`. | Saved-node open failure reproduced. |
| 2026-05-21 | Trace | Filtered `adb logcat -d -t 1200` | App launches and WebView loads `/mobile` bundle; no native crash. | Web runtime failure, not Android Activity crash. |
| 2026-05-21 | Probe | `curl http://127.0.0.1:29695/rest/remote-access/status` | Phone Access enabled and pairing available on current desktop node. | Saved-node validation succeeds; failure occurs after WebView load. |
| 2026-05-21 | Data | Live GraphQL run-history shape summary | 52 team runs, all samples have `createdAt`, no `lastActivityAt`. | Current catalog mapping is incompatible with live data. |
| 2026-05-21 | Script | Node reproduction of current mapper/sort logic | Throws `TypeError: Cannot read properties of undefined (reading 'localeCompare')`. | Exact source-level failure confirmed. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: Maven Central metadata for `com.journeyapps:zxing-android-embedded`.
- Version / tag / commit / freshness: Metadata fetched 2026-05-21; latest/release `4.3.0`.
- Relevant contract, behavior, or constraint learned: A bundled scanner dependency is available from Maven Central and can be resolved by the existing Android repository configuration (`google()` + `mavenCentral()`).
- Why it matters: Allows app-owned QR scanning without requiring a third-party scanner app installed on the user's phone.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Already-running AutoByteus desktop/server on port `29695`; connected Android phone via USB; ADB available.
- Required config, feature flags, env vars, or accounts: Phone Access enabled on desktop node; Android saved node already present.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation; ADB launch; no app data was cleared during investigation.
- Cleanup notes for temporary investigation-only setup: Evidence files are under `tickets/done/android-mobile-pairing-qr-error/adb-evidence/`; no device data was intentionally modified except bringing the app to foreground.

## Findings From Code / Docs / Data / Logs

- The user's **SCAN QR** warning is exactly the diagnostic emitted by `AndroidExternalActions.startQrScan()` when no external ZXing scan activity is installed.
- The Android app currently documents external QR scanner dependency; the user now expects built-in app behavior.
- The Android package is debuggable and installed, but no camera permission is declared/requested.
- The mobile web crash is independent of Android QR scanning. It is triggered by the run-history catalog data loaded after saved-node open.
- Live data includes active and historical team runs, making the team-run branch in `useMobileWorkCatalog` unavoidable on the user's node.

## Constraints / Dependencies / Compatibility Facts

- Existing Phone Access pairing, mobile credential storage, GraphQL/REST/WebSocket auth, and WebView containment are out of scope for redesign.
- The QR scan fix should feed decoded text into existing parser/validator/save-open path to avoid duplicating policy.
- Legacy external scanner fallback should not remain the in-scope steady state; the app must own scan behavior.
- The mobile web fix should follow the current query/type contract rather than reintroducing `lastActivityAt` through compatibility-only shape widening.
- User clarified after initial design handoff that stale status/timestamp attributes should be removed rather than preserved, and that the Android/mobile delivered build should reflect the latest corrected code. This reinforces the clean-cut mapping fix plus a rebuild/reinstall/restart validation requirement.

## Open Unknowns / Risks

- Implementation should confirm whether the selected scanner dependency requires a custom capture activity class or manifest merge adjustment under targetSdk 35.
- Full real QR camera validation requires an on-screen QR or another device/display; ADB launch/open validation is already possible.
- If web build/typecheck surfaces stale generated GraphQL type issues, implementation may need a narrow codegen/test adjustment, but broad generated schema cleanup is not part of this design.

## Notes For Architect Reviewer

Review focus:

- The Android QR scan owner should be a dedicated coordinator under `org.autobyteus.mobile.shell`, not hidden inside `AndroidExternalActions`.
- The decoded QR text should cross into the existing `ConnectionInputResolver` boundary; no native pairing protocol clone should be introduced.
- The mobile web catalog fix should be a local mapping correction from `TeamRunHistoryItem.createdAt/status` to `MobileWorkContext`, with runtime-safe sorting only as a guard, not a new run-history schema layer.
- Reject keeping external QR scanner intent as a compatibility fallback for the in-scope Scan QR button behavior.
