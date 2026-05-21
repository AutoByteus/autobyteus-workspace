# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/review-report.md`
- Current Validation Round: `2`
- Trigger: Code-review round 3 passed the implementation-owned local fix for `VAL-ANDROID-006` and requested live device revalidation of native picker selected-count logging plus visible composer attachment state.
- Prior Round Reviewed: `1`
- Latest Authoritative Round: `2`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Post-code-review API/E2E validation | N/A | `VAL-ANDROID-006` | Fail | No | Real-device Android/Tailscale pairing and restore passed, but selecting an image through the native Android picker returned to Chat with `Context Files (0)` and no uploaded attachment. |
| 2 | Code-review round 3 accepted the implementation local fix | `VAL-ANDROID-006` | None in product behavior | Pass; route to code review | Yes | Live device revalidation selected the first visible real image from DocumentsUI. Logcat shows `AutoByteusFileChooser` returned one selected item and the composer shows `Context Files (1)`. API/E2E updated one repository-resident Android instrumentation test to make the durable settings check independent of `MainActivity` launch-idle state, so delivery must wait for code-review re-review of that validation-code change. |

## Validation Basis

Coverage was derived from the requirements, reviewed design, implementation handoff, and code-review reports. Round 2 specifically rechecked the previous local-fix failure and reran the broader executable checks after a focused validation-code adjustment.

The implementation handoff's `Legacy / Compatibility Removal Check` remains clean. Source/code-review evidence plus API/E2E observation found no Android `addJavascriptInterface`, WebMessage/native credential bridge, duplicated pairing exchange, native run/chat client clone, backend run/chat/runtime change, or service-worker/offline authenticated cache addition.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

## Validation Surfaces / Modes

- Android Gradle unit/build/instrumentation checks.
- USB-connected physical Android device with `adb`.
- Tailscale Android app and macOS Tailscale peer status.
- AutoByteus desktop/server node reachable on the tailnet.
- Existing `/mobile` web shell loaded inside Android WebView.
- Android native file picker (`ACTION_OPEN_DOCUMENT`) and existing mobile Chat context-file composer.
- Backend public Phone Access status and local pairing flow.
- Mobile web/PWA build and source validation.
- Source scans and code-review reports for forbidden bridge/core-client/offline-cache scope.

## Platform / Runtime Targets

- Host: macOS `Darwin MacBookPro 25.2.0`, arm64, Europe/Berlin timezone.
- Java: OpenJDK `21.0.10`.
- Gradle: `9.3.1`.
- Android SDK: `/Users/normy/Library/Android/sdk`.
- adb: `/opt/homebrew/bin/adb`, Android Debug Bridge `36.0.2-14143358`.
- Physical Android device: Xiaomi `2109119DG`, Android `12`, SDK `31`, serial `dfd6c5c0`.
- Tailscale macOS self: `100.127.30.107`, MagicDNS `normys-macbook-pro.tail0347f8.ts.net`.
- Tailscale Android peer: `100.75.247.102` after reconnect in round 1.
- Desktop-node mode used: already-running AutoByteus desktop/server process on port `29695` serving `/mobile` and `/rest/remote-access/*`.
- Packaged-Electron mode: not run; no packaged desktop artifact was provided for this API/E2E round.

## Lifecycle / Upgrade / Restart / Migration Checks

- Android app data reset and first launch were executed in round 1 through the live smoke helper.
- App force-stop/reopen restore was executed after successful pairing in round 1.
- Round 2 reinstalled the latest debug APK, cleared app data during instrumentation rechecks, recreated pairing, and reran the live selected-image scenario.
- No upgrade/migration check was in scope because this is a new Android package and no prior Android app version exists.

## Coverage Matrix

| Scenario ID | Requirement / Acceptance Coverage | Mode | Result | Evidence |
| --- | --- | --- | --- | --- |
| `VAL-ANDROID-001` | Build APK, compile Android tests, run Android unit/instrumentation tests | Gradle + physical device | Pass | `e2e-evidence/revalidation-round3/23-gradle-full-after-revalidation-test-fix.log` |
| `VAL-ANDROID-002` | USB device and Tailscale environment readiness | adb + Tailscale CLI/app | Pass | Round-1 `android-device-probe.txt`, `mac-tailscale-status-after-connect-tap2.txt`, `android-curl-status-after-tailnet-connected.txt` |
| `VAL-ANDROID-003` | Install, clear data, launch first-run screen | `android-live-smoke.sh` + adb | Pass after rerun | Round-1 `android-live-smoke-rerun.log`, `live-smoke-rerun/*`; round-2 reinstall evidence `revalidation-round3/02-adb-install.log` |
| `VAL-ANDROID-004` | Pair through existing `/mobile?pairing=` flow using stable tailnet URL shape | Android WebView + desktop dev node | Pass | Round-1 pairing evidence plus round-2 `revalidation-round3/08-pairing-session-redacted.json`, `10-after-pairing-open.png`, `11-after-pair-this-phone.png`, `12-mobile-home-after-pair.png` |
| `VAL-ANDROID-005` | Force-stop/reopen saved-node/session restore | adb + Android WebView | Pass | Round-1 `restore-force-stop.txt`, `restore-start.txt`, `restore-after-force-stop.png`, `restore-after-force-stop-texts.txt` |
| `VAL-ANDROID-006` | Chat attachment upload via Android native picker | Android WebView + system DocumentsUI | Pass in round 2 | `revalidation-round3/14-picker-open-structural-summary.txt`, `15-after-select-first-visible-item.png`, `15-after-select-first-visible-item-texts.txt`, `16-after-select-wait8.png`, `16-after-select-wait8-texts.txt`, `18-logcat-filechooser-relevant.txt` |
| `VAL-ANDROID-007` | Android/Tailscale unreachable diagnostic | adb/Tailscale probes | Partial | Tailscale disconnected state was observed and then connected in round 1; native saved-node unreachable diagnostic was not exhaustively repeated after `VAL-ANDROID-006` resolution. |
| `VAL-WEB-008` | PWA manifest metadata and no offline authenticated cache | source/build scan | Pass with installability follow-up note | Source manifest and `pages/mobile.vue` head exist; no service-worker/offline cache found. Raw generated `200.html` under `ssr:false` does not contain the manifest link before hydration, so browser install prompt behavior remains a delivery/browser follow-up if needed. Evidence: round-1 `pwa-manifest-validation.log`, round-2 `28-mobile-web-build.log`. |
| `VAL-NOREG-009` | Existing web/localization/build checks | pnpm + git diff | Pass | `revalidation-round3/24-git-diff-check.log`, `30-git-diff-check-final.log`, `25-web-boundary.log`, `26-localization-boundary.log`, `27-localization-literals.log`, `28-mobile-web-build.log` |
| `VAL-SCOPE-010` | No native credential bridge, JS bridge, Android product-client clone, or offline service-worker cache | source scan + code-review reports | Pass | Round-1 `source-scope-scan.log`; code-review round 3 report |

## Test Scope

Tested across rounds:

- Android unit tests and connected instrumentation tests on the physical device.
- Android debug APK assemble/install/launch.
- Tailscale Android connection recovery and Android-to-desktop tailnet HTTP reachability.
- Pairing through the existing mobile pairing page and backend pairing exchange.
- Mobile home load with existing paired credential.
- Saved-node restore after app force-stop.
- Native Android file picker launch from the mobile Chat upload control.
- Real selected-image return path from DocumentsUI into existing mobile context-file composer.
- Web/mobile guard/build checks and static source scans.

Not fully tested:

- sending a Chat message with the attached image after the composer accepted it;
- exhaustive unreachable saved-node diagnostic after the round-2 re-pair;
- packaged-Electron desktop-node smoke;
- full browser PWA install prompt behavior after hydration.

## Validation Setup / Environment

- APK path: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/build/outputs/apk/debug/app-debug.apk`.
- AutoByteus desktop/server status from host and Android returned HTTP 200 with Phone Access enabled.
- Tailscale Serve HTTPS was not configured (`tailscale serve status`: `No serve config`), so validation used MagicDNS/tailnet HTTP `http://normys-macbook-pro.tail0347f8.ts.net:29695/mobile` with the Android app's explicit HTTP acknowledgement. This is the documented private-development/tailnet fallback path, not the preferred final travel URL.
- Round-2 pairing-link screenshots/XML containing a one-time `pairing=` value were removed or redacted. A post-cleanup scan found no retained unredacted pairing token or `content://` URI values in the round-2 evidence directory.

## Tests Implemented Or Updated

API/E2E updated one repository-resident Android instrumentation test after code-review round 3:

- Path: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/src/androidTest/java/org/autobyteus/mobile/AutoByteusMobileShellSmokeTest.kt`
- Reason: the implementation-added WebView settings test used `Instrumentation.startActivitySync(MainActivity)`, which repeatedly failed on the live device with a launch-idle timeout even after clearing app data. That made the durable validation state-dependent and blocked API/E2E despite the product live scenario passing.
- Change: the test now constructs `AutoByteusWebView` directly on the instrumentation main thread with application context and a no-op `WebFileChooserCoordinator(Activity())`, then verifies `settings.allowContentAccess == true` and `settings.allowFileAccess == false`. This keeps the test focused on the WebView settings contract and avoids depending on `MainActivity` startup/network/UI idleness.
- Evidence of pre-fix validation-test failure: `revalidation-round3/01-gradle-revalidation.log`, `01b-connected-retry.log`, `20-connected-after-clear.log`.
- Evidence after validation-test update: `revalidation-round3/22-connected-after-validation-test-fix.log`, `23-gradle-full-after-revalidation-test-fix.log`, `29-connected-after-test-comment.log`.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `Yes`
- Paths added or updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/autobyteus-android/app/src/androidTest/java/org/autobyteus/mobile/AutoByteusMobileShellSmokeTest.kt`
- If `Yes`, returned through `code_reviewer` before delivery: `Required now`
- Post-validation code review artifact: `Pending code-review re-review of API/E2E validation-code update`

## Other Validation Artifacts

- Validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/api-e2e-report.md`
- Evidence directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/e2e-evidence`
- Round-2 key evidence:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/e2e-evidence/revalidation-round3/14-picker-open-structural-summary.txt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/e2e-evidence/revalidation-round3/15-after-select-first-visible-item.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/e2e-evidence/revalidation-round3/15-after-select-first-visible-item-texts.txt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/e2e-evidence/revalidation-round3/16-after-select-wait8.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/e2e-evidence/revalidation-round3/16-after-select-wait8-texts.txt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/e2e-evidence/revalidation-round3/18-logcat-filechooser-relevant.txt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/e2e-evidence/revalidation-round3/23-gradle-full-after-revalidation-test-fix.log`

## Temporary Validation Methods / Scaffolding

- Temporary local pairing session was created through the desktop node local-only pairing session endpoint.
- `adb` commands were used for install, launch, force-stop, screenshots, uiautomator dumps, logcat, Android shell connectivity probes, picker interaction, and app-data resets.
- Round 2 selected the first visible real item in Android DocumentsUI rather than the earlier synthetic `/sdcard/Download` fixture path.
- No temporary runtime scaffolding was left outside the evidence directory.

## Dependencies Mocked Or Emulated

- No core backend/mobile behavior was mocked.
- Desktop-node mode used an already-running development AutoByteus desktop/server node rather than a packaged Electron app.
- Tailscale Serve HTTPS was not configured; MagicDNS/tailnet HTTP was used as the private-network fallback.

## Prior Failure Resolution Check

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `VAL-ANDROID-006` | `Local Fix` | Resolved | `18-logcat-filechooser-relevant.txt` shows picker open and `File picker returned one selected item`; `15/16-after-select*` evidence shows `CONTEXT · 1 FILE` and `Context Files (1)` after selecting the first visible real image from DocumentsUI. | The earlier synthetic file-fixture attempt was not representative; round 2 used the real visible image picker path requested by the user. |

## Scenarios Checked

### `VAL-ANDROID-001` — Android build/tests/instrumentation

Final command after API/E2E validation-test update:

```bash
ANDROID_HOME=/Users/normy/Library/Android/sdk gradle -p autobyteus-android :app:testDebugUnitTest :app:assembleDebug :app:compileDebugAndroidTestKotlin :app:connectedDebugAndroidTest
```

Result: Pass. The connected instrumentation task ran `3` tests on `2109119DG - 12`. Gradle deprecation warnings remain.

### `VAL-ANDROID-006` — Chat attachment upload via native picker

Round-2 steps/evidence:

1. Reinstalled the latest debug APK after code-review round 3.
2. Re-paired the app through the existing `/mobile?pairing=<redacted>` WebView path using the stable tailnet HTTP URL and explicit HTTP acknowledgement.
3. Opened the existing mobile Chat composer.
4. Cleared logcat.
5. Tapped the existing `Upload files` control.
6. Android DocumentsUI opened via `ACTION_OPEN_DOCUMENT`.
7. Selected the first visible real image/document row from the Android picker.
8. App returned to `org.autobyteus.mobile/.MainActivity`.
9. Logcat showed:
   - `AutoByteusFileChooser: Opening Android file picker; allowMultiple=true; mime=*/*`
   - `AutoByteusFileChooser: File picker returned one selected item.`
10. The existing mobile composer showed `CONTEXT · 1 FILE` and `Context Files (1)` immediately and after an additional wait.

Result: Pass / prior failure resolved.

### `VAL-NOREG-009` — no-regression checks

Commands passed:

```bash
git diff --check
pnpm -C autobyteus-web guard:web-boundary
pnpm -C autobyteus-web guard:localization-boundary
pnpm -C autobyteus-web audit:localization-literals
pnpm -C autobyteus-web build:mobile-web
```

Known warnings remain: existing Node module-type warning in localization audit and existing Vite dynamic-import/chunk-size warnings during mobile web build.

## Passed

- `VAL-ANDROID-001`: Android build/unit/instrumentation, including connected instrumentation tests, passed after the API/E2E validation-test update.
- `VAL-ANDROID-002`: Physical Android device, Tailscale app, and Android-to-desktop tailnet reachability passed.
- `VAL-ANDROID-003`: APK install/clear/launch passed after device install approval path was cleared.
- `VAL-ANDROID-004`: Existing `/mobile?pairing=` flow paired successfully through Android WebView.
- `VAL-ANDROID-005`: Saved-node/session restore after force-stop passed in round 1.
- `VAL-ANDROID-006`: Native picker selected-image upload now reaches the existing mobile composer and increments to `Context Files (1)`.
- `VAL-NOREG-009`: web boundary/localization/build checks and `git diff --check` passed.
- `VAL-SCOPE-010`: no forbidden bridge/core-client/offline-cache scope observed.

## Failed

No product/API/E2E scenario remains failed in the latest authoritative round.

Validation-code note: the implementation-added connected instrumentation settings test failed before API/E2E adjusted it to avoid `MainActivity` launch-idle dependence. Because this is a repository-resident durable validation update after code review, the next route is `code_reviewer`, not `delivery_engineer`.

## Not Tested / Out Of Scope

- Packaged-Electron desktop smoke: not run because this round used development-node mode and no packaged desktop artifact was provided.
- Camera QR scan: not run; pasted/shared pairing link path was used for deterministic validation.
- Final message send with uploaded attachment: not run after composer accepted the selected image.
- Full PWA install prompt/browser installability: source/build checked; runtime installability can be rechecked later if delivery requires it.
- Tailscale Serve HTTPS: not configured locally; MagicDNS/tailnet HTTP with explicit app acknowledgement was used.

## Failure Classification

- Latest result: `Pass with repository-resident durable validation update`
- Required next route: `code_reviewer`
- Reason: API/E2E updated `autobyteus-android/app/src/androidTest/java/org/autobyteus/mobile/AutoByteusMobileShellSmokeTest.kt` after the previous code review. Per team workflow, repository-resident durable validation changes added/updated during API/E2E must be reviewed before delivery.

## Handoff Recommendation

Send the cumulative package to `code_reviewer` for narrow re-review of:

1. the API/E2E validation-code update in `AutoByteusMobileShellSmokeTest.kt`;
2. the evidence that `VAL-ANDROID-006` is resolved on the physical Android device;
3. the updated validation report.

After code-review pass, delivery can resume.
