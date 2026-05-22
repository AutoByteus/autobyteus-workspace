# Design Spec

## Current-State Read

The requested Android APK support spans two repositories but follows existing ownership boundaries.

In the main AutoByteus workspace, release publication is currently tag-driven. `scripts/desktop-release.sh release <version>` prepares package versions and curated release notes, creates tag `v<version>`, and pushes the branch/tag. The tag triggers independent GitHub Actions workflows under `.github/workflows/`: desktop, messaging gateway, and server Docker. Those workflows already publish different artifact types without one monolithic release coordinator.

The Android app source exists under `autobyteus-android`. It builds locally today when a system Gradle install is available, but it has no checked-in Gradle wrapper, no GitHub Actions workflow, no CI release signing path, and no release-version override. `autobyteus-android/app/build.gradle.kts` currently hardcodes `versionCode = 1` and `versionName = "0.1.0"`; `release` has no signing config, so local `assembleRelease` produces `app-release-unsigned.apk`.

The website repository already exposes AutoByteus client downloads through the backend REST download boundary. For `executable_type == "autobyteus"`, `backend/autobyteus_com_server/rest/downloads.py` delegates to `GitHubReleaseService`, which reads `AutoByteus/autobyteus-workspace` GitHub Releases and redirects download requests to matched release assets. This is the correct authoritative boundary for public download metadata and redirect behavior. However, the website platform model only knows Windows, macOS Intel/Silicon, and Linux variants; `.apk` and `android` are currently not supported.

The website frontend already centralizes download behavior in `frontend/stores/downloadStore.ts` and renders the homepage download selector in `frontend/components/landing/HeroDownloadPanel.vue`. Android user agents currently fall through to Linux because Android UAs contain `Linux`, and the manual platform list omits Android.

Constraints the target design must respect:
- Public APK distribution must use a signed release APK, not debug signing.
- Existing website REST response schema should remain unchanged.
- Existing desktop, macOS, Linux, Windows, messaging-gateway, and Docker release flows must not be regressed.
- The Android app remains a WebView shell for `/mobile`; this task does not change runtime app behavior.

## Intended Change

Add Android APK release support in the main workspace and Android download support in the website:

1. Make `autobyteus-android` CI-reproducible with a checked-in Gradle wrapper.
2. Add CI-controlled Android version/signing support in the Android Gradle config.
3. Add `.github/workflows/release-android.yml` as the Android release-artifact owner.
4. Publish signed APK assets to the existing AutoByteus GitHub Release on tag releases.
5. Extend website backend platform/asset classification so Android APKs are listed and downloadable through the existing `/rest/downloads` and `/rest/download/autobyteus/android/...` endpoints.
6. Extend website frontend detection and platform picker so Android users can download the APK and desktop users can manually choose Android.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / release-pipeline and public-distribution capability.
- Current design issue found (`Yes`/`No`/`Unclear`): No.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No.
- Evidence: Existing release workflows already own independent artifact production; website backend already owns GitHub Release asset resolution; website frontend already owns platform detection and download initiation. Android is missing from those local capability sets, but no caller is bypassing a boundary or duplicating a second download architecture.
- Design response: Extend the existing owners in place: Android Gradle project, Android workflow, website download services, and frontend download store/panel.
- Refactor rationale: No refactor is needed because the current owner, boundary, API shape, file placement, and data structures remain coherent when Android is added as one more platform and one more release artifact type.
- Intentional deferrals and residual risk, if any: Google Play publishing and Android in-app updates are deferred. Prerelease/stable Android `versionCode` ordering is handled with a simple deterministic formula for this task; more advanced app-update policy can be revisited if in-app updates or app-store distribution become in scope.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

1. Release artifact data-flow spine.
2. Website listing/download data-flow spine.
3. Existing subsystem extensions.
4. File responsibility mapping across the main workspace and website worktree.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: no existing Android public-release path exists, so there is no legacy Android publishing code to remove.
- Public debug APK distribution is explicitly rejected. Debug APK fallback may exist only as a private manual build-only workflow artifact and must not be published to GitHub Releases or surfaced on the website.
- Existing desktop/platform aliases in the website platform model are outside this task and are not being expanded into a new compatibility layer.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Maintainer pushes `v*` release tag | Signed Android APK attached to AutoByteus GitHub Release | Android Release Workflow | Produces the artifact that users will install. |
| DS-002 | Primary End-to-End | Website loads latest downloads | Android row appears in hero platform options when release asset exists | Website Download Backend | Makes Android discoverable through the existing public download API. |
| DS-003 | Primary End-to-End | User clicks Android download | Browser redirects to GitHub Release APK URL | Website Download Backend | Initiates real user APK download and records the existing unique-download metric. |
| DS-004 | Primary End-to-End | Android visitor opens website | Android platform is selected by default | Frontend Download Store | Prevents Android devices from being misclassified as Linux. |
| DS-005 | Bounded Local | Android workflow resolves build mode | Signed release or private debug artifact selected | Android Release Workflow | Separates public publish rules from build-only validation rules. |
| DS-006 | Bounded Local | GitHubReleaseService scans release assets | Best Android APK candidate chosen | Website GitHub Release Service | Ensures Android asset detection is owned centrally, not duplicated in UI. |

## Primary Execution Spine(s)

- DS-001: `Release tag -> Android Release Workflow -> Android Gradle Project -> Signed APK Artifact -> GitHub Release`
- DS-002: `Homepage -> Download Store -> Website REST /downloads -> GitHubReleaseService -> GitHub Releases API -> LatestDownloadItem(android)`
- DS-003: `Hero Android Button -> Download Store -> Website REST /download/autobyteus/android/{version} -> GitHubReleaseService -> RedirectResponse(APK URL)`
- DS-004: `Android Browser UA -> Download Store Detection -> Hero Platform Picker -> Android Download Action`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A release tag starts the Android workflow. The workflow resolves version metadata, enforces signing for public publication, runs the Android Gradle wrapper, renames the APK, and attaches it to the GitHub Release. | Release tag, Android workflow, Gradle app project, GitHub Release | `.github/workflows/release-android.yml` | Java/Gradle setup, secret decoding, version-code calculation, SHA256 generation. |
| DS-002 | The homepage asks the backend for latest downloads. Backend asks GitHubReleaseService for available AutoByteus platforms. Android is returned only if the latest release contains a matching `.apk`. | Homepage, download store, REST downloads route, GitHubReleaseService, GitHub Release assets | Website download backend | GitHub API cache, platform enum, response DTOs. |
| DS-003 | The selected Android platform/version is sent to the REST download endpoint. Backend resolves the APK asset, records unique AutoByteus download, and redirects to GitHub. | Hero button, download store, REST download route, GitHub asset redirect | Website download backend | Rate limiting, unique-download counter, channel filtering. |
| DS-004 | Frontend detection classifies Android before Linux, then the hero picker selects Android if available. | Browser user agent, download store, hero picker | Frontend download store | Manual fallback options, UI width calculation, unavailable-asset alert. |
| DS-005 | Inside the Android workflow, publishing mode requires signing secrets and release APK output; build-only mode may fall back to debug when signing is absent. | Workflow metadata, signing-secret check, Gradle task selection | Android release workflow | Secret validation, artifact-channel naming. |
| DS-006 | The GitHub release resolver filters installer assets, detects `.apk` as Android, scores candidates, and returns a `GitHubReleaseDownload`. | Release asset list, platform detector, candidate scorer, download DTO | GitHubReleaseService | Extension priority and filename matching. |

## Spine Actors / Main-Line Nodes

- Release tag / manual workflow dispatch.
- Android Release Workflow.
- Android Gradle Project.
- GitHub Release.
- Website REST Download Boundary.
- GitHubReleaseService.
- Frontend Download Store.
- Hero Download Panel.

## Ownership Map

| Node | Owns |
| --- | --- |
| Release tag / release helper | Release version identity and the normal release trigger. It does not own Android build mechanics. |
| Android Release Workflow | CI orchestration, signing-secret enforcement, Gradle task selection, artifact naming, workflow artifact upload, GitHub Release APK upload. |
| Android Gradle Project | App version fields, signing config, application ID, build outputs. |
| GitHub Release | Published artifact hosting for website-downloadable assets. |
| Website REST Download Boundary | Public schema, platform validation, rate limiting, unique-download recording, redirect response. |
| GitHubReleaseService | GitHub API access, cache, asset filtering, platform detection, candidate selection. |
| Frontend Download Store | Browser platform detection, download metadata state, direct download navigation. |
| Hero Download Panel | Presentation of selectable platforms and invoking the store-owned download action. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `/rest/downloads` and `/rest/download/...` FastAPI routes | Website download backend services, especially `GitHubReleaseService` for AutoByteus client assets | Public HTTP boundary for website and clients | GitHub asset detection rules that belong in the service. |
| `HeroDownloadPanel.vue` | `downloadStore` | Homepage presentation and user selection | Browser detection, URL construction, backend fallback logic. |
| `scripts/desktop-release.sh` | Release workflows triggered by tags | Release-helper convenience for version bump/tag push | Android build/signing orchestration. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Public debug APK publishing path | Debug signing is not acceptable for website-installable public releases. | Signed release APK path in `release-android.yml` and `app/build.gradle.kts`. | In This Change | Do not publish `app-debug.apk` to GitHub Releases. |
| Reliance on system `gradle` for CI Android builds | CI must be reproducible from checkout. | `autobyteus-android/gradlew` and wrapper files. | In This Change | Local README can still mention wrapper-first commands. |
| Android-as-Linux frontend fallback | Android UAs contain Linux and would select the wrong installer. | Explicit `android` detection before Linux in `downloadStore.ts`. | In This Change | This is a behavior correction for new Android platform support. |

## Return Or Event Spine(s) (If Applicable)

- GitHub Actions return/event spine: `Gradle build result -> upload-artifact result -> release upload result -> workflow summary/status`.
- Website download return spine: `GitHubReleaseService match -> REST 307 redirect headers -> browser follows GitHub asset URL`.

## Bounded Local / Internal Spines (If Applicable)

- DS-005 inside `release-android.yml`:
  - `resolve metadata -> validate signing policy -> choose assembleRelease/assembleDebug -> copy named APK -> upload/publish`.
  - Matters because public releases must fail without signing while build-only validation remains possible.
- DS-006 inside `GitHubReleaseService`:
  - `release assets -> supported installer filter -> platform detection -> candidate score -> GitHubReleaseDownload`.
  - Matters because Android must be handled in one backend owner rather than by frontend-specific filename guessing.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Android signing secret decoding | DS-001, DS-005 | Android Release Workflow | Decode base64 keystore into runner temp and expose Gradle signing env vars. | Keeps secrets out of source and Gradle file. | Gradle config would become CI-specific and harder to test. |
| Android version-code calculation | DS-001, DS-005 | Android Release Workflow / Gradle Project | Convert release tag into `ANDROID_VERSION_NAME` and positive `ANDROID_VERSION_CODE`. | Keeps release identity consistent and explicit. | Hardcoded Gradle versions would drift from release tags. |
| SHA256 sidecar generation | DS-001 | Android Release Workflow | Produce integrity metadata for published APK. | Release consumers/operators can verify artifact. | Website resolver might mistake checksum as installer unless filter rules stay central. |
| GitHub API cache | DS-002, DS-003, DS-006 | GitHubReleaseService | Avoid repeated GitHub API calls. | Existing backend performance/rate-limit concern. | UI would duplicate API fetching and bypass backend analytics. |
| Unique download counting | DS-003 | REST Download Boundary | Record public AutoByteus download identity on successful initiation. | Existing website metric should include Android. | Counting in frontend would be unreliable and bypass trusted client-IP logic. |
| Hero picker width calculation | DS-004 | Hero Download Panel | Presentation sizing only. | Android label may affect width. | Store would mix UI layout with platform policy. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Android APK artifact build | Main workspace release workflows + Android project | Extend | Existing release architecture already uses independent workflows per artifact type. | N/A |
| Android app version/signing | `autobyteus-android` Gradle project | Extend | Gradle app module is the authoritative owner for Android package metadata. | N/A |
| Public artifact hosting | AutoByteus GitHub Releases | Reuse | Website already resolves AutoByteus assets from this release host. | N/A |
| Download metadata/redirect | Website backend download services | Extend | Existing REST schema and GitHubReleaseService are designed for platform artifacts. | N/A |
| Platform picker/detection | Website frontend download store + hero panel | Extend | Existing UI already centralizes platform options and download action. | N/A |
| Google Play distribution | None | Deferred | Out of scope and not needed for direct APK download. | Future app-store distribution would need new release/store subsystem. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Main Release Automation | Android release workflow, artifact upload, release docs | DS-001, DS-005 | Android Release Workflow | Extend | Add `release-android.yml`. |
| Android App Build | Gradle wrapper, version/signing config | DS-001, DS-005 | Android Gradle Project | Extend | No app behavior changes. |
| Website Download Backend | Android platform enum, APK asset detection, REST docs/tests | DS-002, DS-003, DS-006 | REST Download Boundary / GitHubReleaseService | Extend | Schema remains unchanged. |
| Website Download Frontend | Android detection and platform option | DS-004 | Download Store / Hero Panel | Extend | Android detection must precede Linux. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `.github/workflows/release-android.yml` | Main Release Automation | Android Release Workflow | Android CI build, signing enforcement, artifact upload, GitHub Release publishing | Workflow-level orchestration belongs in one YAML file like other release workflows. | Uses Android Gradle project. |
| `autobyteus-android/app/build.gradle.kts` | Android App Build | Android Gradle Project | Env-backed version and signing config | Existing app module owns package metadata and build types. | Uses workflow env variables. |
| `autobyteus-android/gradle/wrapper/*`, `gradlew`, `gradlew.bat` | Android App Build | Gradle wrapper | Reproducible Gradle version | Standard Gradle wrapper file set. | N/A |
| `backend/.../services/download/types.py` | Website Download Backend | Platform model | Add Android platform and APK file-extension mapping | Existing platform enum owner. | Used by service/routes/tests. |
| `backend/.../services/download/github_release_service.py` | Website Download Backend | GitHubReleaseService | Add APK support and Android candidate selection | Existing GitHub asset resolver owner. | Uses `Platform`. |
| `backend/.../services/download/executable_type_service.py` | Website Download Backend | ExecutableTypeService | Add Android filename pattern/generation | Existing executable naming owner. | Uses `Platform`. |
| `frontend/stores/downloadStore.ts` | Website Download Frontend | Download Store | Add Android detection/navigation fallback | Existing platform detection and download action owner. | Uses REST metadata. |
| `frontend/components/landing/HeroDownloadPanel.vue` | Website Download Frontend | Hero panel | Add Android option | Existing platform presentation owner. | Uses `downloadStore`. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Android release metadata calculation | Keep inside `release-android.yml` shell step initially, or extract only if reused later | Main Release Automation | Currently used by one workflow only; no need for premature script extraction | Yes | Yes | A generic release coordinator duplicating `desktop-release.sh`. |
| Platform IDs and display names | Existing backend `types.py`; frontend string union mirrored locally | Website Download Backend / Frontend Store | Backend owns API platform model; frontend owns UI typing. | Yes | Yes | A second backend platform registry. |
| APK filename matching | `GitHubReleaseService` plus `ExecutableTypeService` patterns | Website Download Backend | GitHub asset resolution and resource-scanned file naming are separate existing owners. | Yes | Yes | Frontend filename matcher as authoritative source. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Backend `Platform.ANDROID` | Yes | Yes | Low | Add as one platform ID `android`, not aliases like `mobile` or `apk`. |
| `GitHubReleaseDownload` | Yes | Yes | Low | No schema change needed; Android uses existing fields. |
| Frontend `DetectedOperatingSystem` / `DetectedPlatformId` | Yes | Yes | Medium | Explicitly add `android`; do not represent Android as Linux or generic mobile. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download/.github/workflows/release-android.yml` | Main Release Automation | Android Release Workflow | Resolve release/manual metadata, setup Java/Gradle, enforce signing for publish, build APK, upload artifacts, publish signed APK to GitHub Release | Matches existing one-workflow-per-release-artifact pattern | Uses Gradle project and GitHub Release. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download/autobyteus-android/app/build.gradle.kts` | Android App Build | Android Gradle Project | Env-backed `versionName`/`versionCode`, CI signing config, release signing assignment | Existing app module build owner | Uses workflow env vars. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download/autobyteus-android/gradlew` | Android App Build | Gradle wrapper | Unix wrapper entrypoint | Standard Gradle wrapper | Wrapper properties. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download/autobyteus-android/gradlew.bat` | Android App Build | Gradle wrapper | Windows wrapper entrypoint | Standard Gradle wrapper | Wrapper properties. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download/autobyteus-android/gradle/wrapper/gradle-wrapper.properties` | Android App Build | Gradle wrapper | Pin Gradle distribution, recommended `8.13` to match reference project | Standard Gradle wrapper | N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download/autobyteus-android/gradle/wrapper/gradle-wrapper.jar` | Android App Build | Gradle wrapper | Wrapper bootstrap jar | Standard Gradle wrapper | N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download/README.md` | Main Release Documentation | Release docs | Add Android workflow/artifact/secrets to release section | Existing release workflow docs owner | N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download/autobyteus-android/README.md` | Android App Documentation | Android build docs | Wrapper-first local build and CI release signing docs | Existing Android build docs owner | N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download/backend/autobyteus_com_server/services/download/types.py` | Website Download Backend | Platform model | Add `ANDROID`, display name, `from_string`, `from_file_extension`, optional helper semantics | Existing platform owner | Used by routes/services/tests. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download/backend/autobyteus_com_server/services/download/github_release_service.py` | Website Download Backend | GitHubReleaseService | Allow `.apk`, detect Android assets, prefer APK extension | Existing GitHub asset resolver | Uses `Platform`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download/backend/autobyteus_com_server/services/download/executable_type_service.py` | Website Download Backend | ExecutableTypeService | Add Android pattern and generated filename | Existing executable-type owner | Uses `Platform`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download/backend/autobyteus_com_server/rest/downloads.py` | Website Download Backend | REST boundary | Include Android in route docs/validation descriptions; no schema change | Public route owner | Uses service changes. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download/backend/tests/e2e/test_downloads.py` | Website Backend Tests | REST behavior validation | Add Android listing/redirect cases | Existing GitHub-backed download E2E file | Uses mocked `GitHubReleaseDownload`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download/backend/tests/e2e/test_download_tracking.py` | Website Backend Tests | Download tracking validation | Ensure Android AutoByteus redirect records unique downloader like desktop | Existing tracking E2E file | Uses existing counter fixtures. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download/backend/tests/integration_tests/services/download/test_github_release_service.py` | Website Backend Tests | GitHub asset resolver validation | Add APK detection/candidate test | Existing resolver test owner | N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download/backend/tests/integration_tests/services/download/test_executable_type_service.py` | Website Backend Tests | Executable pattern/filename validation | Add Android pattern/generation test | Existing executable type test owner | N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download/frontend/stores/downloadStore.ts` | Website Download Frontend | Download Store | Add Android OS/platform typing, detection before Linux, Android GitHub fallback, Android smart-download behavior | Existing frontend download policy owner | REST metadata. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download/frontend/components/landing/HeroDownloadPanel.vue` | Website Download Frontend | Hero panel | Add Android platform option and version display | Existing platform presentation owner | Store data. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download/frontend/scripts/validate-android-download-wiring.mjs` | Website Frontend Tests | Static wiring validation | Assert Android option/detection/download flow exist | Small durable validation for UI wiring | Reads frontend files. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download/frontend/package.json` | Website Frontend Tooling | Frontend scripts | Add `validate:android-download` script | Existing script registry | N/A |

## Ownership Boundaries

- Android APK production boundary: `.github/workflows/release-android.yml` is the CI owner. It may call Gradle and GitHub release actions, but callers should not embed Android build decisions in desktop or website code.
- Android package metadata boundary: `autobyteus-android/app/build.gradle.kts` owns Android version/signing behavior. The workflow supplies env inputs; Gradle applies them.
- Website backend download boundary: REST routes are public entrypoints; platform detection and asset scoring must stay in services, especially `GitHubReleaseService`.
- Website frontend download boundary: `downloadStore` owns detection/download navigation; `HeroDownloadPanel.vue` owns display only.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Android Release Workflow | Secret validation, Gradle task choice, artifact naming | Release tag/manual dispatch | Desktop workflow directly running Android Gradle or website linking to debug artifacts | Extend workflow inputs/outputs. |
| Android Gradle App Module | Signing config, `versionName`, `versionCode` | Android workflow, local developers | Workflow editing source files to bump Android version before build | Add env-backed Gradle properties. |
| Website REST Download Boundary | Rate limit, unique counting, GitHub redirect | Frontend download store | Frontend linking directly to GitHub asset as the primary path | Add backend platform support. |
| GitHubReleaseService | GitHub API, cache, platform/extension selection | REST downloads route | REST route manually parsing APK filenames | Add service detector/scorer support. |
| Download Store | Browser detection, URL construction, download navigation | Hero panel and future buttons | Hero panel constructing REST URLs or GitHub URLs directly | Add store method/type support. |

## Dependency Rules

Allowed:
- `release-android.yml` may call `autobyteus-android/gradlew` and GitHub Actions release/upload actions.
- `app/build.gradle.kts` may read environment variables supplied by CI/local shell.
- Website REST routes may depend on `Platform`, `ExecutableTypeService`, `GitHubReleaseService`, and analytics/rate-limit services.
- Website frontend hero panel may depend on `downloadStore` state/actions.

Forbidden:
- Do not publish `app-debug.apk` to GitHub Releases.
- Do not make the website frontend scrape GitHub Releases as the authoritative Android path when backend metadata is available.
- Do not add a second Android-only REST endpoint when the existing `/download/autobyteus/{platform}/{version}` endpoint can express Android.
- Do not represent Android as `linux`, `mobile`, or an ambiguous alias in persisted/API platform IDs.
- Do not make desktop release workflow own Android build steps.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `.github/workflows/release-android.yml` `workflow_dispatch` | Android release build | Build-only validation or publish-enabled release | `publish_release`, optional `release_tag`, optional `release_ref`, optional `prerelease` | Tag push publishes by default. Manual publish requires release tag. |
| Gradle env vars | Android package metadata/signing | Configure version and signing without source mutation | `ANDROID_VERSION_NAME`, `ANDROID_VERSION_CODE`, `ANDROID_KEYSTORE_PATH`, passwords/alias | Secrets are CI-only. |
| `/rest/downloads?platform=android` | Download listing | Return latest Android AutoByteus item if available | platform ID `android` | Response schema unchanged. |
| `/rest/download/autobyteus/android/{version}` | Download initiation | Redirect to Android APK release asset | executable type `autobyteus`, platform `android`, version or `latest` | Records unique download. |
| `downloadStore.triggerDirectPlatformDownload('android')` | Frontend download action | Use backend metadata to start Android download | platform ID `android` | Hero panel should call this, not build URL itself. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `release-android.yml` | Yes | Yes | Low | Keep Android-only. |
| Gradle env vars | Yes | Yes | Low | Validate numeric versionCode. |
| `/rest/downloads` | Yes | Yes | Low | Add Android to existing platform enum. |
| `/rest/download/autobyteus/android/{version}` | Yes | Yes | Low | Use explicit platform ID. |
| `downloadStore.triggerDirectPlatformDownload` | Yes | Yes | Low | Add typed Android platform option. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Android release workflow | `release-android.yml` | Yes | Low | Use exact artifact domain name. |
| Android platform ID | `android` | Yes | Low | Avoid `mobile` because iOS is not supported. |
| Android APK asset | `AutoByteus_personal_android-<version>-release.apk` | Yes | Low | Keep release/debug channel in filename. |
| Backend platform enum | `Platform.ANDROID` | Yes | Low | Add display name `Android`. |

## Applied Patterns (If Any)

- Adapter-like boundary: `GitHubReleaseService` adapts GitHub Release asset metadata into internal `GitHubReleaseDownload` objects. Android extends this adapter.
- Workflow orchestration: `release-android.yml` is a CI workflow owner, not a runtime service. It owns sequencing and policy for Android build/publish.
- Existing frontend store pattern: `downloadStore` remains the single frontend owner for detection and download navigation.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `.github/workflows/release-android.yml` | File | Android Release Workflow | Android release/build-only workflow | Existing workflow folder owns CI release definitions | Desktop build steps or website deploy logic. |
| `autobyteus-android/gradle/wrapper/` | Folder | Gradle wrapper | Pin and bootstrap Gradle | Standard Android project build tooling location | Build outputs. |
| `autobyteus-android/app/build.gradle.kts` | File | Android Gradle Project | Android build config/version/signing | Existing app module build file | GitHub release upload logic. |
| `backend/autobyteus_com_server/services/download/` | Folder | Website Download Backend | Platform and release-asset services | Existing download service capability area | Frontend UI logic. |
| `backend/autobyteus_com_server/rest/downloads.py` | File | REST Download Boundary | Public listing/download endpoints | Existing route file | Asset filename scoring. |
| `frontend/stores/downloadStore.ts` | File | Frontend Download Store | Detection/download state/actions | Existing frontend download owner | Hero layout details. |
| `frontend/components/landing/HeroDownloadPanel.vue` | File | Hero Download Panel | Platform picker presentation | Existing homepage download component | REST URL construction. |
| `frontend/scripts/validate-android-download-wiring.mjs` | File | Frontend validation | Durable static validation for Android wiring | Existing scripts pattern for download wiring checks | Backend tests. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `.github/workflows` | Main-Line Domain-Control for CI | Yes | Low | Existing release workflow grouping. |
| `autobyteus-android` | Android app/build subsystem | Yes | Low | Android-specific build/source location. |
| `backend/.../services/download` | Main-Line Domain-Control / adapter | Yes | Low | Existing download domain services. |
| `frontend/stores` | Frontend state/control | Yes | Low | Existing store pattern. |
| `frontend/components/landing` | Presentation | Yes | Low | Hero UI components live here. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Public Android publishing | `release-android.yml` fails publish when signing secrets are missing. | Publish `app-debug.apk` with a warning. | Users will install this APK; debug signing is not acceptable public release policy. |
| Android platform identity | `/rest/download/autobyteus/android/latest` | `/rest/download/autobyteus/linux/latest` for Android or `/rest/download/android-app/latest` | Keeps platform identity explicit and schema-compatible. |
| Frontend ownership | `HeroDownloadPanel` calls `downloadStore.triggerDirectPlatformDownload('android')`. | Hero panel builds `https://github.com/...apk` URL itself. | Preserves backend analytics and asset resolver boundary. |
| Version override | Workflow exports `ANDROID_VERSION_NAME=1.3.25` and `ANDROID_VERSION_CODE=10032599`; Gradle reads env. | Workflow edits `build.gradle.kts` before build. | Avoids source mutation and keeps Gradle config reusable. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Treat Android as Linux because Android UAs contain Linux | Existing detection would do this accidentally | Rejected | Add explicit Android detection before Linux. |
| Publish debug APK if release signing secrets are missing | Reference workflow allows debug fallback | Rejected for public release | Fail publish-enabled runs without signing; allow debug only for build-only workflow artifact. |
| Add `mobile` platform alias | Could sound user-friendly | Rejected | Use explicit `android`; iOS/mobile web are different subjects. |
| Website static direct GitHub APK link | Quick frontend-only implementation | Rejected | Use existing backend REST download boundary for listing, redirect, and analytics. |

## Derived Layering (If Useful)

- CI/release layer: GitHub Actions workflow and Gradle wrapper.
- Build configuration layer: Android Gradle app module.
- Download service layer: website backend platform model and GitHub release adapter.
- Presentation/action layer: frontend store and hero panel.

Layering is explanatory only; ownership boundaries above are authoritative.

## Migration / Refactor Sequence

1. Main workspace Android build tooling:
   - Generate and commit Gradle wrapper under `autobyteus-android`, preferably Gradle `8.13` to match the reference Android project using Android Gradle Plugin `8.13.2`.
   - Update Android README build commands to prefer `./gradlew`.
2. Main workspace Android Gradle config:
   - Add env-backed version config:
     - `ANDROID_VERSION_NAME` overrides `versionName` when set.
     - `ANDROID_VERSION_CODE` overrides `versionCode` when set and valid.
   - Add CI release signing config using `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
   - Assign signing config to `release` only when all signing env vars are present.
3. Main workspace release workflow:
   - Add `release-android.yml` with tag and manual dispatch triggers.
   - Resolve release tag/ref/version/prerelease/publish mode.
   - Compute Android version code. Recommended formula:
     - Parse `major.minor.patch` from tag version.
     - `base = major * 10000000 + minor * 10000 + patch * 100`.
     - Stable release code: `base + 99`.
     - Prerelease code: `base + prerelease_number`, clamped to `1..98` where possible.
   - For tag or `publish_release=true`, require complete signing secrets and build `assembleRelease`.
   - For manual build-only with missing signing, build `assembleDebug` and upload only a workflow artifact.
   - Publish only signed release APK and optional `.sha256` to GitHub Releases.
4. Main workspace docs:
   - Update release workflow list/artifacts/secrets in `README.md`.
   - Update `autobyteus-android/README.md` with wrapper, signed release, and CI artifact naming.
5. Website backend platform extension:
   - Add `Platform.ANDROID = "android"` with display name `Android`.
   - Map `.apk` and Android filename markers to `Platform.ANDROID`.
   - Add Android pattern for AutoByteus client filenames.
   - Add `.apk` to supported installer assets and Android extension priority.
   - Update REST query descriptions to include Android.
6. Website backend tests:
   - Add Android cases to GitHub release service tests, executable type tests, and E2E listing/redirect/tracking tests.
7. Website frontend extension:
   - Add Android to platform/OS typings.
   - Detect Android before Linux.
   - Allow Android smart/download behavior instead of mobile-blocking it.
   - Add Android option to hero picker.
   - Add validation script/package command for Android download wiring.
8. Verification:
   - Run Android wrapper tasks/builds.
   - Run targeted website backend tests.
   - Run frontend validation/build checks.

## Key Tradeoffs

- Separate Android workflow vs. modifying desktop workflow: separate workflow preserves the established release architecture and keeps Android build concerns isolated. It does mean another workflow may race to update release assets, but that is already the pattern for messaging and desktop assets.
- Signed-only public APK vs. debug fallback: signed-only public publishing protects users and avoids hard-to-upgrade debug installs. Manual debug artifacts preserve developer validation convenience.
- Backend-driven website downloads vs. direct GitHub links: backend preserves analytics, rate limiting, and platform schema consistency. Direct links would be simpler but bypass existing owners.

## Risks

- Android signing secrets may not be configured yet; first public release will fail until maintainers add them.
- GitHub Release publish ordering between desktop/messaging/Android workflows may be nondeterministic. Android should avoid Android-specific body text and should use the common curated notes if it needs to create the release first.
- Android `versionCode` formula must stay within Android integer limits. The proposed formula is safe for normal semantic versions but should validate and fail clearly for unusually large version components.
- The website lists latest non-prerelease by default through GitHub's latest-release endpoint. Prerelease APKs will not become the homepage default unless the backend release policy changes later.

## Guidance For Implementation

- Main workspace changes must be made in `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download`.
- Website changes must be made in `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download`.
- Do not edit the user's original shared checkouts.
- Do not commit generated Android build outputs under `.gradle/` or `app/build/`.
- Use `phone-av-bridge` only as a reference, not as a source of direct repository coupling.
- Public release artifact target: signed APK named like `AutoByteus_personal_android-<version>-release.apk`.
- Private manual validation artifact target: `AutoByteus_personal_android-<version>-debug.apk` is acceptable only as a workflow artifact when `publish_release=false`.
- Suggested Android local checks after implementation:
  - `cd autobyteus-android && ./gradlew --no-daemon tasks`
  - `cd autobyteus-android && ./gradlew --no-daemon :app:testDebugUnitTest :app:assembleDebug`
- Suggested website backend checks:
  - `cd backend && uv run pytest tests/e2e/test_downloads.py tests/e2e/test_download_tracking.py tests/integration_tests/services/download/test_github_release_service.py tests/integration_tests/services/download/test_executable_type_service.py -q`
- Suggested website frontend checks:
  - `cd frontend && yarn validate:download-count`
  - `cd frontend && yarn validate:android-download`
  - `cd frontend && yarn build` when dependencies/environment allow.
