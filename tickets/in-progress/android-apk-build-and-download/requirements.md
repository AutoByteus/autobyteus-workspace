# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

AutoByteus has an Android WebView shell application under `autobyteus-android`, but the current project release pipeline does not build or publish an Android APK. Add Android APK build support to the AutoByteus release pipeline and extend the AutoByteus website download flow so users can discover, download, and install the Android app from the website.

The implementation should use the Android APK GitHub Actions pattern from `/Users/normy/autobyteus_org/phone-av-bridge` as a reference, but adapt it to the AutoByteus workspace release architecture and the website's existing GitHub Releases-backed download model.

## Investigation Findings

- The main AutoByteus workspace has a current Android app project at `autobyteus-android` with Gradle/Kotlin Android configuration and app source.
- `autobyteus-android` currently has no checked-in Gradle wrapper. Local probing succeeded only because `/opt/homebrew/bin/gradle` is installed on this machine.
- Local probe confirmed the Android app can build today with the local environment:
  - `gradle -p autobyteus-android tasks --no-daemon` succeeded.
  - `gradle -p autobyteus-android :app:assembleDebug :app:assembleRelease --no-daemon` succeeded.
  - Outputs included `app/build/outputs/apk/debug/app-debug.apk` and `app/build/outputs/apk/release/app-release-unsigned.apk`.
- The Android app's Gradle config currently hardcodes `versionCode = 1` and `versionName = "0.1.0"` and has no release signing configuration.
- The AutoByteus release architecture currently has separate tag-triggered workflows for desktop assets, messaging gateway release assets, and server Docker images. Release tag pushes are prepared by `scripts/desktop-release.sh` / `pnpm release` and use tag pattern `v*`.
- `phone-av-bridge` has a `.github/workflows/release.yml` Android job that sets up Java 17, decodes optional signing secrets, builds `assembleRelease` when signing secrets exist, falls back to `assembleDebug` otherwise, renames the APK, uploads an artifact, and publishes release assets.
- The website backend already sources AutoByteus client downloads from GitHub Releases (`AutoByteus/autobyteus-workspace`) and redirects `/rest/download/autobyteus/{platform}/{version}` to matching release assets.
- The website backend platform model currently supports Windows, macOS Intel/Silicon, and Linux variants, but not Android and not `.apk` installer assets.
- The website frontend's hero download panel renders a manual platform picker for Windows, macOS, and Linux only. Android user-agent detection currently falls through to Linux because Android user agents include `Linux`.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / release-pipeline and website-distribution capability.
- Initial design issue signal (`Yes`/`No`/`Unclear`): No major design issue found; the existing release and download owners can absorb the change with targeted extensions.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found, with two missing local capabilities: Android release signing/build workflow and Android platform classification in the website download model.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed.
- Evidence basis: Existing tag-triggered release workflows already publish multiple independent artifacts to the same GitHub Release; website backend already centralizes GitHub Release asset resolution; frontend download panel already centralizes platform selection through `downloadStore` and `HeroDownloadPanel.vue`.
- Requirement or scope impact: Implementation should extend existing owners instead of creating a new artifact host, a separate website download path, or a duplicate platform selection mechanism.

## Recommendations

- Add a dedicated `.github/workflows/release-android.yml` in the main AutoByteus workspace rather than folding Android into `release-desktop.yml`. This matches the existing multi-workflow release architecture and keeps Android build/signing concerns owned by an Android workflow.
- Add a Gradle wrapper under `autobyteus-android` so CI does not depend on preinstalled runner Gradle.
- Add release signing support to `autobyteus-android/app/build.gradle.kts` using the same secret shape as the reference workflow:
  - `ANDROID_KEYSTORE_B64`
  - `ANDROID_KEYSTORE_PASSWORD`
  - `ANDROID_KEY_ALIAS`
  - `ANDROID_KEY_PASSWORD`
- Require signed release APKs for public GitHub Release publishing. Debug APK fallback may be allowed for manual build-only validation, but it must not be exposed as the website/public release artifact.
- Name the public APK consistently with existing release asset naming, e.g. `AutoByteus_personal_android-<version>-release.apk`.
- Extend the website backend's platform and GitHub release asset resolver to treat Android as a first-class platform and `.apk` as an installer asset.
- Extend the website frontend platform detection and hero platform picker so Android devices default to Android and desktop users can also manually choose Android.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

Rationale: The change is conceptually straightforward but spans two repositories and four ownership areas: Android Gradle build/signing, GitHub Actions release publishing, website backend download asset classification, and website frontend platform selection.

## In-Scope Use Cases

- UC-001: Maintainer pushes a normal AutoByteus release tag (`vX.Y.Z` or prerelease tag) and the pipeline builds an Android APK from the tagged source.
- UC-002: Maintainer manually triggers Android build-only validation from GitHub Actions without publishing to a GitHub Release.
- UC-003: The Android APK is published to the same AutoByteus GitHub Release as existing desktop/messaging assets when public publishing is in scope.
- UC-004: Website backend lists Android as an available AutoByteus client platform when the latest release includes a matching APK asset.
- UC-005: Website backend redirects Android download requests to the selected GitHub Release APK asset and records the AutoByteus download through the existing unique-download counter.
- UC-006: Website visitor on Android sees/selects the Android app download path and downloads the APK.
- UC-007: Website visitor on desktop can manually choose Android APK from the platform picker.

## Out of Scope

- Publishing to Google Play or another app store.
- Implementing Android in-app update checks.
- Building Android App Bundles (`.aab`) unless later requested.
- Changing the Android app's product behavior, pairing flow, WebView/mobile-shell behavior, icon artwork, or runtime permissions outside what is needed for release versioning/signing.
- Replacing the website's existing GitHub Releases-backed download architecture.
- Changing the website download analytics data model beyond counting Android downloads through the existing AutoByteus counter.

## Functional Requirements

| requirement_id | Description | Expected Outcome |
| --- | --- | --- |
| R-001 | The main AutoByteus workspace must have a reproducible Android APK build path in CI. | GitHub Actions can build `autobyteus-android` without relying on a runner-preinstalled Gradle executable. |
| R-002 | The Android app must support CI-controlled release signing. | When Android signing secrets are configured, CI builds a signed release APK. |
| R-003 | The public Android release artifact must be a signed release APK, not a debug APK. | Tag-triggered or publish-enabled workflow runs fail clearly if signing secrets are missing instead of publishing a debug APK. |
| R-004 | The Android APK release version must align with the AutoByteus release tag. | APK filename and Android manifest `versionName` use the release version derived from `vX.Y.Z`; `versionCode` is deterministic and positive. |
| R-005 | Android APK publishing must integrate with the existing AutoByteus GitHub Release artifact flow. | Release tag `v*` triggers an Android workflow that uploads the APK to the same GitHub Release used by desktop/messaging artifacts. |
| R-006 | Android build-only validation must be available without publishing. | Maintainer can manually run the Android workflow with publish disabled; if signing secrets are absent this may build/upload a debug workflow artifact only. |
| R-007 | Project documentation must describe Android release workflow, artifact, and required secrets. | `README.md` and Android project docs explain how Android APK release builds work and how to validate locally/manually. |
| R-008 | Website backend must model Android as a supported platform. | `Platform.from_string("android")`, platform display names, and filename/extension detection recognize Android APKs. |
| R-009 | Website backend must resolve Android APK assets from AutoByteus GitHub Releases. | `/rest/downloads?platform=android` lists Android when an `.apk` asset exists; `/rest/download/autobyteus/android/latest` redirects to the APK. |
| R-010 | Website frontend must expose Android in the download UI. | Hero download platform picker includes Android and can initiate the existing download flow for `platform.id == "android"`. |
| R-011 | Website frontend must detect Android before generic Linux. | Android user agents select `android`, not `linux-amd64`, as the default download platform. |
| R-012 | Existing desktop, Linux, macOS, and Windows download behavior must continue to work. | Existing platform detection/listing/redirect tests continue to pass. |

## Acceptance Criteria

| acceptance_criteria_id | Requirement ID | Measurable Expected Outcome |
| --- | --- | --- |
| AC-001 | R-001 | A clean checkout can run the checked-in Android Gradle wrapper in CI for `:app:assembleDebug` without a system `gradle` prerequisite. |
| AC-002 | R-002 | With `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD` set, `:app:assembleRelease` produces `app/build/outputs/apk/release/app-release.apk`. |
| AC-003 | R-003 | A publish-enabled Android workflow run exits with a clear error if any required Android signing secret is empty. |
| AC-004 | R-004 | For release tag `v1.3.25`, Android CI exports `ANDROID_VERSION_NAME=1.3.25`, computes a positive integer `ANDROID_VERSION_CODE`, and names the public asset `AutoByteus_personal_android-1.3.25-release.apk` (or an explicitly documented equivalent). |
| AC-005 | R-005 | Pushing a `v*` tag starts `.github/workflows/release-android.yml` and its publish job uploads the signed release APK to that GitHub Release. |
| AC-006 | R-006 | Manual workflow dispatch with publish disabled uploads an `android-apk` workflow artifact and does not create/update a GitHub Release. |
| AC-007 | R-007 | Repository docs list `.github/workflows/release-android.yml`, Android APK artifact naming, and the required signing secrets. |
| AC-008 | R-008 | Backend unit/integration tests prove `Platform.ANDROID` exists, `.apk` maps to Android, and Android display/generation logic is stable. |
| AC-009 | R-009 | Backend tests using mocked GitHub Release assets prove Android appears in `/rest/downloads` and `/rest/downloads?platform=android`, and `/rest/download/autobyteus/android/latest` returns `307` to the APK URL. |
| AC-010 | R-010 | Frontend validation proves the hero platform picker includes an Android option and uses the existing `triggerDirectPlatformDownload('android')` flow. |
| AC-011 | R-011 | Frontend validation proves an Android user agent resolves to `detectedOperatingSystem == 'android'` / `detectedPlatform == 'android'`, not Linux. |
| AC-012 | R-012 | Existing download-related backend tests and frontend download validation continue to pass after Android support is added. |

## Constraints / Dependencies

- Main workspace branch/base: `origin/personal`; website branch/base: `origin/main`.
- Android CI requires JDK 17 and Android SDK/platform support compatible with compileSdk 35.
- Android release signing requires repository secrets. The public website-installable APK must not depend on debug signing.
- Website backend currently uses GitHub API release metadata from `AutoByteus/autobyteus-workspace`; Android APK must be uploaded there or the backend repository config must be changed consistently.
- Website frontend consumes the existing `/rest/downloads` schema; the schema should remain unchanged.

## Assumptions

- The desired public distribution host is the existing AutoByteus GitHub Release, reached through the website backend redirect flow.
- The AutoByteus Android APK is for sideload installation; Google Play distribution is not required for this task.
- A repository maintainer can provide Android release signing secrets before expecting public tag releases to publish Android APKs.
- `AutoByteus_personal` remains the correct artifact flavor for releases from the `personal` branch.

## Risks / Open Questions

- Android signing secrets may not yet exist in the AutoByteus GitHub repository; the first public Android release will fail until they are configured.
- If prerelease APKs use the same computed `versionCode` as their later stable version, Android update behavior may require an explicit follow-up policy if in-app updates become in scope.
- The website uses GitHub's latest non-prerelease release endpoint; prerelease APKs will not appear as the default website download unless the website model is intentionally changed later.
- Multiple independent release workflows can race while updating the same GitHub Release body/assets; this already exists for desktop/messaging and is not introduced by Android, but Android publishing should avoid owning release-note content beyond asset upload.

## Requirement-To-Use-Case Coverage

| Use Case | Covered Requirements |
| --- | --- |
| UC-001 | R-001, R-002, R-003, R-004, R-005 |
| UC-002 | R-001, R-006 |
| UC-003 | R-003, R-005, R-007 |
| UC-004 | R-008, R-009 |
| UC-005 | R-008, R-009, R-012 |
| UC-006 | R-010, R-011 |
| UC-007 | R-010 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001 | CI reproducibility independent of host Gradle installation. |
| AC-002 | Android Gradle signing path works with CI-provided secrets. |
| AC-003 | Prevent accidental public debug APK distribution. |
| AC-004 | Release artifact identity and Android manifest version match the workspace release. |
| AC-005 | Normal tag release publishes Android APK to GitHub Releases. |
| AC-006 | Maintainers can validate Android builds manually without public publishing. |
| AC-007 | Release operators know required workflow/secrets. |
| AC-008 | Android platform is represented in backend domain model. |
| AC-009 | Android GitHub Release assets are discoverable/downloadable through existing REST endpoints. |
| AC-010 | Android is visible and clickable in the website hero download UI. |
| AC-011 | Android devices default to the Android APK instead of Linux. |
| AC-012 | Regression coverage protects existing desktop download behavior. |

## Approval Status

Design-ready requirements basis. The user explicitly requested Android APK pipeline support plus website download/install support; no blocking clarification is required. The design assumes public website distribution must use a signed release APK, with debug APKs restricted to private build-only validation.
