# Investigation Notes

## Investigation Status

- Bootstrap Status: Completed
- Current Status: Deep investigation completed; requirements refined; design ready.
- Investigation Goal: Determine how to add AutoByteus Android APK build support to the project pipeline, using `phone-av-bridge` as a reference, and how to expose the resulting APK from the website for end-user download/install.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The implementation crosses the main AutoByteus workspace CI/release pipeline and a separate website repository, plus Android build/signing constraints.
- Scope Summary: Add an Android APK release artifact producer in the main workspace and extend the website's existing GitHub Releases-backed download model/UI to include Android.
- Primary Questions To Resolve:
  - Does `autobyteus-android` currently build an APK locally or in CI? Answer: locally yes with installed Gradle; CI support missing because no workflow/wrapper/signing path exists.
  - What Android APK workflow does `phone-av-bridge` use, and which parts are reusable? Answer: Java 17 setup, Gradle wrapper, optional signing secret decode, APK rename/upload/publish are reusable; debug fallback should be restricted for public AutoByteus website distribution.
  - How do existing AutoByteus release workflows publish artifacts? Answer: independent tag-triggered workflows publish desktop/messaging/server assets from tag `v*` to GitHub Releases/Docker Hub.
  - What is the website's current download model and where should Android be added? Answer: backend `GitHubReleaseService` resolves assets from `AutoByteus/autobyteus-workspace`; add Android to platform enum/asset detection and frontend platform picker/detection.
  - What signing, artifact naming, hosting, and versioning policy should the design require? Answer: signed release APK required for public GitHub Release/website; filename aligned with `AutoByteus_personal_*`; version derived from release tag.

## Request Context

User request on 2026-05-22: AutoByteus already has Android application support; check whether the pipeline can also support building an Android APK. The user believes `/Users/normy/autobyteus_org/phone-av-bridge` has an Android APK GitHub workflow that can serve as reference. Desired outcome: support Android build and let users download the Android app from `../autobyteus-com-workspace` website and install it on phones.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git; multi-repository task.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download/tickets/in-progress/android-apk-build-and-download`
- Current Branch: main user checkout was `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` on `personal` tracking `origin/personal`; it had an unrelated untracked file `autobyteus-server-ts/tmp-repro-chokidar-spawn-ebadf.mjs`.
- Current Worktree / Working Directory: initial user CWD `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; authoritative task worktree created at `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download`.
- Bootstrap Base Branch: main workspace `origin/personal`; website workspace `origin/main`.
- Remote Refresh Result: `git fetch --prune origin` succeeded for `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`, `/Users/normy/autobyteus_org/phone-av-bridge`, and `/Users/normy/autobyteus_org/autobyteus-com-workspace` on 2026-05-22. `phone-av-bridge` local `main` was behind after fetch; reference reads used `origin/main` to avoid stale local state.
- Task Branch: main workspace `codex/android-apk-build-and-download`; website workspace `codex/android-apk-build-and-download`.
- Expected Base Branch (if known): main workspace `origin/personal`; website `origin/main`.
- Expected Finalization Target (if known): main workspace likely `personal`; website likely `main`.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Work must not modify the user's original shared checkouts. Main workspace changes belong in `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download`; website changes belong in `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download`.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-22 | Command | `pwd`; `git rev-parse --show-toplevel`; `git status --short --branch`; `git remote -v` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Bootstrap current task environment | Initial repo root was `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; branch `personal` tracking `origin/personal`; unrelated untracked file in `autobyteus-server-ts`. | No |
| 2026-05-22 | Command | `git fetch --prune origin` in main workspace, `phone-av-bridge`, and `autobyteus-com-workspace` | Refresh tracked remotes before creating task worktrees and inspecting reference state | Fetch succeeded. `phone-av-bridge` `origin/main` advanced from `c94e194` to `7f4c124`; original local main remains behind. | No |
| 2026-05-22 | Setup | `git worktree add -b codex/android-apk-build-and-download /Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download origin/personal` | Create dedicated main workspace task worktree | Worktree created at `a7a3b367ab53a0bbddb63aacde628c88214af76b`. | No |
| 2026-05-22 | Setup | `git worktree add -b codex/android-apk-build-and-download /Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download origin/main` | Create dedicated website task worktree | Worktree created at `751fa4fb9e926ae934c2e3c47485775ff8a49940`. | No |
| 2026-05-22 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download/.github/workflows/release-desktop.yml` | Understand current release workflow shape | Desktop release is tag/manual triggered, resolves release metadata, validates versions, builds macOS/Linux/Windows, uploads artifacts, and publishes to GitHub Release. | Extend release architecture with separate Android workflow, not desktop workflow internals. |
| 2026-05-22 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download/.github/workflows/release-messaging-gateway.yml` | Check multi-workflow release precedent | Messaging gateway has its own tag/manual workflow and publishes additional assets to the same GitHub Release. | Reuse independent workflow pattern. |
| 2026-05-22 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download/.github/workflows/release-server-docker.yml` | Check release orchestration expectations | Server Docker release is another independent tag/manual workflow. | README release workflow list must be updated. |
| 2026-05-22 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download/scripts/desktop-release.sh` | Understand release helper and tag creation | `pnpm release` updates package versions, curated release notes, managed messaging manifest, commits, tags, and pushes `v*`; tag push starts release workflows. | Update docs/help text if adding Android workflow; no need to rename release helper in this task. |
| 2026-05-22 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download/README.md` lines 266-327 | Understand documented release workflow | Docs list only desktop/messaging/server workflows and artifacts; no Android release APK. | Update docs. |
| 2026-05-22 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download/autobyteus-android/README.md` | Understand Android app ownership/build docs | Android app is WebView shell for `/mobile`; docs mention local debug build via system `gradle`, debug APK output, adb install, and real-device validation handoff. | Add CI release/signing documentation. |
| 2026-05-22 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download/autobyteus-android/app/build.gradle.kts` | Inspect Android build config | `applicationId`/namespace `org.autobyteus.mobile`, compile/target 35, `versionCode = 1`, `versionName = "0.1.0"`, release build has no signing config. | Add CI version/signing config. |
| 2026-05-22 | Command | `find autobyteus-android -maxdepth 8 -type f`; `find . -maxdepth 4 -name gradlew -o -path '*/gradle/wrapper/gradle-wrapper.properties'` | Check source files and wrapper | Android app has source/tests/resources but no Gradle wrapper. | Add wrapper or otherwise install Gradle in CI; wrapper recommended. |
| 2026-05-22 | Probe | `ANDROID_HOME="$HOME/Library/Android/sdk" gradle -p autobyteus-android tasks --no-daemon` | Confirm project configures locally | Build tasks listed successfully under local Gradle 9.3.1/JDK 21; compile/test tasks available. | CI should use JDK 17 and wrapper for reproducibility. |
| 2026-05-22 | Probe | `ANDROID_HOME="$HOME/Library/Android/sdk" gradle -p autobyteus-android :app:assembleDebug :app:assembleRelease --no-daemon` | Confirm current APK build capability | Build succeeded in 38s. Outputs: `app-debug.apk` and `app-release-unsigned.apk`. | Public release needs signing config; generated build dirs are ignored. |
| 2026-05-22 | Code | `git -C /Users/normy/autobyteus_org/phone-av-bridge show origin/main:.github/workflows/release.yml` | Inspect reference Android APK workflow | Reference uses Java 17, Gradle wrapper, optional signing secrets, `assembleRelease` if secrets present else `assembleDebug`, renames APK, uploads artifact, and publishes to GitHub Release with checksums. | Adapt pattern; do not publish debug APK to public AutoByteus website. |
| 2026-05-22 | Code | `git -C /Users/normy/autobyteus_org/phone-av-bridge show origin/main:android-phone-av-bridge/app/build.gradle.kts` | Inspect reference signing config | Reference Gradle file creates `ciRelease` signingConfig when all env vars are present and assigns it to release build. | Reuse this signing shape for `autobyteus-android`. |
| 2026-05-22 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download/backend/autobyteus_com_server/services/download/types.py` | Inspect website platform model | Platforms include Windows, macOS Intel/Silicon, Linux variants; `.apk` and Android absent. | Add `Platform.ANDROID`, display, extension detection. |
| 2026-05-22 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download/backend/autobyteus_com_server/services/download/github_release_service.py` | Inspect GitHub Release asset resolver | Supports repository `AutoByteus/autobyteus-workspace`; filters installer extensions but excludes `.apk`; detects Windows/macOS/Linux only. | Add `.apk` support and Android platform detection/scoring. |
| 2026-05-22 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download/backend/autobyteus_com_server/services/download/executable_type_service.py` | Inspect executable type patterns | `autobyteus` patterns cover Windows/macOS/Linux only. | Add Android APK pattern and generated filename support. |
| 2026-05-22 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download/backend/autobyteus_com_server/rest/downloads.py` | Inspect listing/download endpoints | `/rest/downloads` lists GitHub-backed AutoByteus assets; `/rest/download/autobyteus/{platform}/{version}` redirects to GitHub asset and records unique download. Query descriptions omit Android. | Extend descriptions; existing response schema can remain unchanged. |
| 2026-05-22 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download/frontend/stores/downloadStore.ts` | Inspect frontend download owner | Store detects Windows/macOS/Linux; Android UAs currently match Linux because `detectOperatingSystem()` checks Linux but not Android. Smart download explicitly blocks all mobile. | Add Android OS/platform detection before Linux; allow Android smart/direct download. |
| 2026-05-22 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download/frontend/components/landing/HeroDownloadPanel.vue` | Inspect UI platform picker | Manual options include Windows, macOS Apple Silicon, macOS Intel, Linux x64, Linux ARM64. | Add Android option. |
| 2026-05-22 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download/backend/tests/e2e/test_downloads.py`; `backend/tests/e2e/test_download_tracking.py`; `backend/tests/integration_tests/services/download/test_github_release_service.py`; `backend/tests/integration_tests/services/download/test_executable_type_service.py` | Inspect validation coverage | Existing tests cover GitHub release-backed listing/redirect and Linux canonicalization. | Add Android cases to existing tests. |
| 2026-05-22 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download/frontend/scripts/validate-download-count-wiring.mjs`; `frontend/package.json` | Inspect frontend validation hooks | Current static validation covers unique-count/download presentation wiring only. | Add/update validation for Android platform option/detection, likely with a new script or expanded validation script. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - Main workspace release: `scripts/desktop-release.sh release <version>` creates/pushes tag `v<version>`, which triggers `.github/workflows/release-desktop.yml`, `.github/workflows/release-messaging-gateway.yml`, and `.github/workflows/release-server-docker.yml`.
  - Website download listing: frontend `HeroDownloadPanel.vue` calls `downloadStore.initialize()`, which fetches `/rest/downloads?distribution_channel=frontend` from the backend.
  - Website download initiation: `downloadStore.triggerDirectPlatformDownload(platformId)` calls `downloadVersion()`, which navigates to `/rest/download/autobyteus/{platform}/{version}`.
- Current execution flow:
  - Release tag -> independent GitHub Actions workflows -> build artifacts -> `softprops/action-gh-release` publishes assets to GitHub Release.
  - Website `/rest/downloads` -> `rest/downloads.py` -> `GitHubReleaseService.get_latest_downloads_for_platforms()` -> GitHub Releases API -> `LatestDownloadItem[]` response.
  - Website `/rest/download/autobyteus/...` -> `GitHubReleaseService.get_download_for_version()` -> record unique download -> `RedirectResponse` to GitHub Release asset URL.
- Ownership or boundary observations:
  - Release workflow files own CI artifact production/publishing; Android build concerns should live in a separate Android workflow and Android Gradle files.
  - `autobyteus-android` owns Android app build/version/signing config.
  - Website backend download services own platform/asset classification and release asset resolution.
  - Website frontend download store owns browser/platform detection and download navigation; hero panel owns platform presentation.
- Current behavior summary:
  - Android APK can be built locally as debug and unsigned release with installed Gradle, but no reproducible GitHub Actions build/publish path exists.
  - Website cannot list or download Android because Android is not a known platform and `.apk` is not a supported installer asset.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / release-pipeline capability.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found.
- Refactor posture evidence summary: Existing owners are clear. Required changes are additive extensions to release workflow, Android Gradle config, website platform model, and frontend platform picker/detection.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Existing release workflows | Desktop, messaging gateway, and server Docker are already separate workflows triggered by release tags. | Android can be another workflow owner without refactoring desktop workflow. | Add `release-android.yml` and docs. |
| Android Gradle config | App builds locally but lacks wrapper, CI signing, and release-version override. | Missing CI capability, not an architectural boundary problem. | Add wrapper and Gradle env-backed signing/versioning. |
| Website backend download services | GitHub Release asset resolution is centralized in `GitHubReleaseService`; platform enum is centralized in `types.py`. | Android should be a first-class platform there, not special-cased in frontend only. | Extend backend model/resolver/tests. |
| Website frontend | `downloadStore` already owns platform detection and navigation; `HeroDownloadPanel` already owns options. | Add Android under existing owners; no new download UI subsystem needed. | Extend store/panel/static validation. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download/autobyteus-android` | Android WebView shell source/build | Builds debug and unsigned release locally; no wrapper/signing/version override. | Android project owns Gradle wrapper, version, signing config. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download/.github/workflows` | CI/release workflow definitions | Existing releases are independent workflows. | Add `.github/workflows/release-android.yml`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download/scripts/desktop-release.sh` | Release helper/tag creation | Tag push starts workflows; script docs omit Android. | Update help/docs if necessary; no deep refactor required. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/android-apk-build-and-download/README.md` | Main project documentation | Release section omits Android. | Update release workflow/artifact/secrets documentation. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download/backend/autobyteus_com_server/services/download/types.py` | Download platform/executable data model | No Android enum; `.apk` unsupported. | Add Android platform. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download/backend/autobyteus_com_server/services/download/github_release_service.py` | GitHub Release asset resolver | No Android or `.apk` detection. | Add `.apk` installer and Android scoring. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download/backend/autobyteus_com_server/services/download/executable_type_service.py` | Download filename pattern/generation owner | `autobyteus` client patterns omit Android. | Add Android pattern/generation. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download/backend/autobyteus_com_server/rest/downloads.py` | REST listing/download boundary | Schema can remain unchanged; descriptions omit Android. | Extend query descriptions and rely on service changes. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download/frontend/stores/downloadStore.ts` | Frontend download state, detection, navigation | Android currently falls through to Linux; mobile smart download blocks all mobile. | Add Android detection and asset fallback. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-com-android-apk-download/frontend/components/landing/HeroDownloadPanel.vue` | Hero platform picker/presentation | No Android option. | Add Android option. |
| `/Users/normy/autobyteus_org/phone-av-bridge` | Reference Android workflow repository | Has reusable Android build/signing/publish pattern on `origin/main`. | Reference only; no target changes. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-22 | Probe | `ANDROID_HOME="$HOME/Library/Android/sdk" gradle -p autobyteus-android tasks --no-daemon` | Success; tasks include `assembleDebug`, `assembleRelease`, `testDebugUnitTest`, `compileDebugAndroidTestKotlin`. | Android project is structurally buildable; CI workflow can target existing tasks. |
| 2026-05-22 | Probe | `ANDROID_HOME="$HOME/Library/Android/sdk" gradle -p autobyteus-android :app:assembleDebug :app:assembleRelease --no-daemon` | Success in 38s; outputs include `app-debug.apk` and `app-release-unsigned.apk`. | Public pipeline must add signing before release APK is website-installable as a production artifact. |
| 2026-05-22 | Probe | `git status --short --ignored` in task worktree | Only ticket artifacts are untracked; Android `.gradle` and `build/` outputs are ignored. | Local build outputs did not pollute tracked source. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None. Investigation used local repositories and refreshed Git remote refs only.
- Version / tag / commit / freshness:
  - Main workspace task worktree: `a7a3b367ab53a0bbddb63aacde628c88214af76b` from `origin/personal` after fetch on 2026-05-22.
  - Website task worktree: `751fa4fb9e926ae934c2e3c47485775ff8a49940` from `origin/main` after fetch on 2026-05-22.
  - Phone reference reads: `phone-av-bridge` `origin/main` after fetch on 2026-05-22.
- Relevant contract, behavior, or constraint learned: N/A beyond local source.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: No emulator/device required for build investigation. Real-device install validation remains API/E2E responsibility after implementation.
- Required config, feature flags, env vars, or accounts:
  - Local build probe used `ANDROID_HOME="$HOME/Library/Android/sdk"`.
  - Public CI release will require Android signing secrets: `ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
  - Website backend can use existing `GITHUB_TOKEN` if configured; unauthenticated GitHub API still works but with lower rate limits.
- External repos, samples, or artifacts cloned/downloaded for investigation: Existing local `phone-av-bridge` reference repository; no new clone.
- Setup commands that materially affected the investigation: Remote fetches, dedicated worktree creation, local Gradle build probes recorded above.
- Cleanup notes for temporary investigation-only setup: Generated Android `.gradle/` and `build/` directories remain ignored in the task worktree; they can be removed by implementation/validation agents if desired.

## Findings From Code / Docs / Data / Logs

- The Android app's README states the app is a WebView shell for existing `/mobile`; this task should not change app behavior.
- Local unsigned release output path was `autobyteus-android/app/build/outputs/apk/release/app-release-unsigned.apk`; signed release output after adding signing config is expected to be `app-release.apk`.
- Website backend's existing `GitHubReleaseDownload` dataclass is already sufficient for Android metadata once platform/asset detection supports APK.
- Website REST schema does not need a new field for Android; platform ID `android` fits existing `PlatformInfo` shape.

## Constraints / Dependencies / Compatibility Facts

- Public Android APK distribution requires signing. Debug APK fallback is acceptable only as a non-public build artifact.
- Android UAs include `Linux`; detection must check Android before Linux.
- GitHub `/releases/latest` returns latest non-prerelease release; prerelease APKs will not appear by default on website unless explicitly requested by version/platform path.
- Existing website download model expects AutoByteus client release assets in `AutoByteus/autobyteus-workspace`; APK publishing should use the same GitHub Release.
- Existing release helper/version validation expects tags like `vX.Y.Z` or `vX.Y.Z-rc1`, not `+targets=android` selector tags. The `phone-av-bridge` target-selector tag pattern should not be copied into this workspace.

## Open Unknowns / Risks

- Whether Android signing secrets are already configured in the target GitHub repository.
- Whether maintainers want to expose Android in the website hero picker before the first signed APK is published. Backend-driven version display means the option can exist but be unavailable until the asset appears; design should avoid broken downloads.
- Whether Android `versionCode` should eventually account for prerelease order more precisely if app update semantics become important.

## Notes For Architect Reviewer

- The proposed design should preserve existing authoritative boundaries:
  - Android workflow/Gradle files own APK production.
  - GitHub Releases remain the artifact host.
  - Website backend download services own platform and asset resolution.
  - Website frontend download store/panel own presentation and client detection.
- No broad refactor is recommended. The missing pieces are additive, but public debug APK publication must be explicitly rejected.
