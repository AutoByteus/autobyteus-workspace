# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download/tickets/in-progress/android-apk-build-and-download/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download/tickets/in-progress/android-apk-build-and-download/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download/tickets/in-progress/android-apk-build-and-download/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download/tickets/in-progress/android-apk-build-and-download/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download/tickets/in-progress/android-apk-build-and-download/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download/tickets/in-progress/android-apk-build-and-download/review-report.md`
- Current Validation Round: `1`
- Trigger: Code-review pass from `code_reviewer` after CR-001 re-review.
- Prior Round Reviewed: N/A
- Latest Authoritative Round: `1`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code-review pass after CR-001 re-review | N/A | None | Pass | Yes | Executed workflow-step, APK build/signing, backend API, frontend build/static, and browser-level validation. |

## Validation Basis

Validation coverage was derived from the approved requirements, reviewed design, implementation handoff, code review report, and observed implementation behavior in:

- Main workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download`
- Website workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download`

The implementation handoff's `Legacy / Compatibility Removal Check` was read before finalizing coverage. It reports no compatibility mechanisms, no retained legacy old behavior, replacement of Android-as-Linux fallback with explicit Android detection, and rejection of public debug APK publishing. Validation found no mismatch with that statement.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Validation Surfaces / Modes

- GitHub Actions workflow syntax and exact shell-step execution extracted from `.github/workflows/release-android.yml`.
- Android Gradle wrapper, debug APK build, release signing, APK signature verification, and manifest/badging inspection.
- Publish-artifact shape gate from the exact workflow shell step.
- Website backend pytest E2E/integration suite.
- Temporary realistic FastAPI/TestClient validation with a fake GitHub Releases payload at the `requests.get` boundary.
- Frontend static wiring validation and production build.
- Browser-level validation using local Nuxt dev server, fake REST API, headless Google Chrome CDP, Android user-agent emulation, and desktop manual picker interaction.

Note: the Codex in-app Browser surface was attempted first for browser validation, but `iab` was unavailable in this environment. Browser-level coverage therefore used a local headless Chrome/CDP fallback.

## Platform / Runtime Targets

- macOS host: current validation machine.
- Android SDK: `$HOME/Library/Android/sdk`, build-tools `35.0.0`.
- Gradle wrapper: `autobyteus-android/gradlew`, Gradle `8.13`.
- Java: local `keytool` from OpenJDK 21; Gradle build compatible with the configured Android project.
- Backend: Python via `uv run --extra dev`, pytest on the website backend venv.
- Frontend: Node/Yarn/Nuxt 3.15.4.
- Browser: Google Chrome headless through CDP; Android UA `Mozilla/5.0 (Linux; Android 14; Pixel 7) ... Mobile Safari/537.36` and desktop macOS UA.

## Lifecycle / Upgrade / Restart / Migration Checks

No database migration, application restart, native app update, or Android install/update lifecycle was introduced in scope. APK lifecycle-adjacent checks performed:

- Signed release APK was built with a generated validation keystore.
- `apksigner verify --verbose --print-certs` verified the release APK using APK Signature Scheme v2 with one RSA signer.
- `aapt dump badging` verified package `org.autobyteus.mobile`, `versionCode='10032599'`, `versionName='1.3.25'`, `compileSdkVersion='35'`, `sdkVersion='26'`, and `targetSdkVersion='35'`.

Physical device sideload/install was not executed; the task requirements do not change Android app runtime behavior beyond distributable APK packaging.

## Coverage Matrix

| Scenario ID | Requirement / Acceptance Basis | Validation Mode | Result | Evidence |
| --- | --- | --- | --- | --- |
| VAL-001 | R-001, R-004, R-005 / AC-004, AC-005 | `actionlint` plus exact workflow metadata step extraction | Pass | `actionlint .github/workflows/release-android.yml` passed. Stable tag `v1.3.25` produced `version_name=1.3.25`, `version_code=10032599`, `publish_release=true`; prerelease `v1.3.25-rc1` produced `version_code=10032501`, `prerelease=true`; build-only dispatch produced `0.1.0-ci.456`, `version_code=456`; invalid/missing inputs failed clearly. |
| VAL-002 | R-002, R-003 / AC-003 | Exact workflow Build APK shell step guard cases | Pass | Publish-enabled run with no signing secrets failed with `Signed release APK publishing requires ... Debug APKs are not published to GitHub Releases.` Incomplete secrets failed with `Incomplete Android signing secrets...`. |
| VAL-003 | R-001, R-006 / AC-001, AC-006 | Exact workflow Build APK shell step, no signing, publish disabled | Pass | Built `AutoByteus_personal_android-0.1.0-ci.456-debug.apk` plus `.sha256`; Gradle `:app:assembleDebug` succeeded. |
| VAL-004 | R-002, R-004 / AC-002, AC-004 | Exact workflow Build APK shell step with generated validation keystore | Pass | Built `AutoByteus_personal_android-1.3.25-release.apk` plus `.sha256`; checksum verified; `apksigner` verified v2 signature; `aapt` showed `versionCode=10032599`, `versionName=1.3.25`. |
| VAL-005 | R-003, R-005 / AC-005 | Exact publish artifact validation shell step | Pass | One `*-release.apk` passed; debug-present and no-release fixtures failed with clear `::error::` messages. |
| VAL-006 | R-008, R-009, R-012 / AC-008, AC-009, AC-012 | Website backend E2E/integration pytest suite | Pass | `31 passed, 2 warnings` for `tests/e2e/test_downloads.py`, `tests/e2e/test_download_tracking.py`, `tests/integration_tests/services/download/test_github_release_service.py`, `tests/integration_tests/services/download/test_executable_type_service.py`. |
| VAL-007 | R-009 / AC-009 | Temporary FastAPI/TestClient validation with fake GitHub Releases payload at HTTP boundary | Pass | `/rest/downloads?platform=android` returned exactly the release APK, rejected Android `.zip`, debug APK, and `.apk.sha256`; `/rest/download/autobyteus/android/latest` returned `307` to the release APK and incremented unique download count from `0` to `1`. |
| VAL-008 | R-010, R-011, R-012 / AC-010, AC-011, AC-012 | Frontend static validation and Nuxt production build | Pass | `yarn validate:android-download`, `yarn validate:download-count`, and `yarn build` passed; build emitted existing Browserslist/caniuse-lite staleness warning only. |
| VAL-009 | R-010, R-011 / AC-010, AC-011 | Browser-level local Nuxt + fake REST + Chrome CDP | Pass | Android UA auto-selected `Android APK`, button showed `Download v1.3.25`, and click retrieved fake APK payload. Desktop menu options included `Android APK`; selecting it and clicking retrieved the same APK payload. |
| VAL-010 | R-003, R-011 and no-legacy rule | Inspection plus regression coverage | Pass | No public debug APK compatibility path; Android UA no longer falls through to Linux; Android resolver requires `.apk` and excludes debug APKs. |

## Test Scope

In scope for this round:

- Workflow metadata and shell guard behavior for tag, prerelease, manual build-only, manual publish, invalid prerelease, missing signing, and incomplete signing cases.
- Local safe equivalent of signing-secret success path using a generated keystore.
- Debug build-only workflow artifact behavior without public publishing.
- Release APK artifact naming, checksum generation, signature, and manifest version propagation.
- Publish-artifact shape validation before GitHub Release upload.
- Website backend platform model, asset resolution, listing, redirect, non-APK rejection, debug APK rejection, and unique-download counting.
- Frontend Android detection order, hero picker wiring, Android direct-download path, and production build.
- Browser-level Android and desktop manual picker flows against a local fake REST API.

## Validation Setup / Environment

- Main workspace command root: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download`.
- Android command root: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download/autobyteus-android`.
- Website backend command root: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download/backend`.
- Website frontend command root: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download/frontend`.
- Temporary validation scripts and generated keystore were created under `/tmp` and removed after validation.
- Temporary fake REST API served local download metadata on `127.0.0.1:8000`; Nuxt dev server served `127.0.0.1:3040`; both were stopped and removed after browser validation.

## Tests Implemented Or Updated

No repository-resident tests were added or updated during this API/E2E round. Existing review-passed durable validation in the implementation was executed.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `No`
- Paths added or updated: N/A
- If `Yes`, returned through `code_reviewer` before delivery: N/A
- Post-validation code review artifact: N/A

## Other Validation Artifacts

- Canonical report: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download/tickets/in-progress/android-apk-build-and-download/api-e2e-validation-report.md`
- Temporary scripts used during validation were removed and are not durable artifacts.

## Temporary Validation Methods / Scaffolding

Temporary-only scaffolding used and removed:

- Extracted workflow shell steps for metadata, build, and publish-artifact validation.
- Generated validation keystore for signed APK build.
- Fake GitHub Releases / REST payloads for backend and browser validation.
- Headless Chrome CDP script for Android UA and desktop picker browser checks.

## Dependencies Mocked Or Emulated

- GitHub Actions hosted runner was emulated by executing exact workflow shell steps locally with explicit `GITHUB_*`, `RUNNER_TEMP`, `GITHUB_OUTPUT`, and `GITHUB_STEP_SUMMARY` environment variables.
- Android signing secrets were emulated with a generated local JKS keystore and base64-encoded secret payload.
- GitHub Releases API was emulated with realistic release asset payloads including Android `.zip`, debug `.apk`, release `.apk`, and `.apk.sha256` assets.
- Website REST API was emulated for browser-level frontend validation.
- Android device browser was emulated with headless Chrome and Android user-agent string.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First API/E2E round. |

## Scenarios Checked

See coverage matrix VAL-001 through VAL-010.

## Passed

All executed validation scenarios passed.

Command/evidence summary:

- `actionlint .github/workflows/release-android.yml` — passed.
- Exact metadata step cases:
  - `v1.3.25` => `version_name=1.3.25`, `version_code=10032599`, `publish_release=true`.
  - `v1.3.25-rc1` => `version_name=1.3.25-rc1`, `version_code=10032501`, `prerelease=true`.
  - Manual build-only run number `456` => `version_name=0.1.0-ci.456`, `version_code=456`, `publish_release=false`.
  - Manual publish with missing tag failed clearly.
  - Prerelease without numeric sequence failed clearly.
- Exact Build APK guard cases:
  - Publish with no signing secrets failed before Gradle with the expected debug-not-published error.
  - Incomplete signing secrets failed before Gradle with the expected incomplete-secrets error.
- Exact Build APK build-only case:
  - Built `AutoByteus_personal_android-0.1.0-ci.456-debug.apk` and `.sha256`.
- Exact Build APK signed release case:
  - Built `AutoByteus_personal_android-1.3.25-release.apk` and `.sha256`.
  - `sha256sum -c` passed.
  - `apksigner verify --verbose --print-certs` passed with v2 scheme.
  - `aapt dump badging` showed `versionCode='10032599'` and `versionName='1.3.25'`.
- Exact publish validation step:
  - One release APK passed.
  - Debug-present and no-release fixtures failed clearly.
- Backend suite:
  - `uv run --extra dev pytest tests/e2e/test_downloads.py tests/e2e/test_download_tracking.py tests/integration_tests/services/download/test_github_release_service.py tests/integration_tests/services/download/test_executable_type_service.py -q` — `31 passed, 2 warnings`.
- Temporary realistic API validation:
  - `PYTHONPATH=. uv run --extra dev python /tmp/validate_android_api_realistic_release.py` — passed.
- Frontend:
  - `yarn validate:android-download` — passed.
  - `yarn validate:download-count` — passed.
  - `yarn build` — passed with existing Browserslist/caniuse-lite warning.
- Browser/CDP:
  - Android UA selected `Android APK`, displayed `Download v1.3.25`, and retrieved `application/vnd.android.package-archive` payload.
  - Desktop menu included `Android APK`; selecting it and clicking retrieved the same APK payload.

## Failed

None.

## Not Tested / Out Of Scope

- A live GitHub-hosted Actions run was not triggered against the real repository. The validation instead executed exact workflow shell steps locally and verified static workflow syntax. Triggering a tag/manual workflow and uploading to a live GitHub Release would require maintainer approval, repository permissions, and real signing secrets.
- Real repository Android signing secrets were not read or used. A generated local keystore proved the same Gradle/workflow signing path safely.
- Public GitHub Release asset upload through `softprops/action-gh-release@v2` was not executed. The workflow configuration and pre-upload artifact validation were checked; real upload remains an operational release-run concern.
- Physical Android device sideload/install was not executed. Browser UX and APK package/signature/version correctness were validated, but no handset install evidence was collected.
- Production website deployment was not exercised; validation used local Nuxt/dev and fake API payloads.

## Blocked

None. Areas not executed were intentionally avoided because they require live repository side effects, real secrets, or physical device access; safe equivalent validation was performed where practical.

## Cleanup Performed

- Stopped temporary fake REST API and Nuxt dev server.
- Removed temporary `/tmp` scripts and generated validation keystore material.
- Removed ignored Android build outputs and frontend build outputs created during validation.
- No repository-resident validation code or implementation files were changed by this round.

## Classification

No failure classification applies; latest result is `Pass`.

## Recommended Recipient

`delivery_engineer`

Rationale: API/E2E validation passed and no repository-resident durable validation was added or updated during this round, so the package does not need a validation-code re-review before delivery.

## Evidence / Notes

- Existing third-party warnings observed but non-blocking:
  - Backend: urllib3 `NotOpenSSLWarning` for LibreSSL and Strawberry/FastAPI deprecation warning for `lia` rename.
  - Frontend: Browserslist/caniuse-lite data staleness warning.
- Main workspace branch remains reported by Git as behind `origin/personal` by two commits from the prior code review context. Delivery owns the required final branch refresh against latest tracked remote state before finalization.
- Website workspace tracked base was cleanly represented by the current worktree state; delivery still owns final refresh/integrated-state checks.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: Android APK release workflow behavior, APK signing/build outputs, backend download API behavior, unique-download counting, frontend Android picker/detection wiring, and browser-level Android/default/manual picker flows were validated. No API/E2E reroute is required.
