# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation/design rework complete for code-review round-4 DS-IOS-009 versioning and bundle-ID authority findings; ready for architecture review.
- Investigation Goal: Identify the current Android wrapper behavior and repository structure, then refine requirements and design a matching iOS wrapper app with simulator-first validation, signing/publishing readiness checks, and guarded GitHub Actions App Store Connect/TestFlight upload automation.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Adds a new native platform application while preserving behavior parity with an existing wrapper; isolated from backend/mobile-web behavior but spans iOS project structure, WebView containment, camera/QR, simulator validation, Apple signing readiness, and iOS GitHub Actions build/release automation.
- Scope Summary: Create an iOS counterpart for the Android wrapper app.
- Primary Questions To Resolve:
  - What exactly does the Android wrapper own? Resolved.
  - Does the repository already contain iOS scaffolding? Resolved: no.
  - Which files/folder ownership should the iOS wrapper use? Resolved in design.
  - Which simulator-first E2E checks are feasible? Resolved in requirements/design.
  - How should validation discover Xcode/simulator/signing assets? Resolved in requirements/design.
  - What exact GitHub Actions signing/upload contract should iOS use? Resolved in revised requirements/design: build-only always runs; publish is gated on explicit iOS/App Store Connect secrets and fails fast when they are missing.
  - How should App Store-compatible iOS version metadata and bundle-ID authority work? Resolved by round-4 rework: split release tag/artifact/prerelease metadata from numeric iOS marketing/build versions, and make workflow bundle-ID variables drive generated Xcode target identifiers, profile verification, export mapping, and all build/test/archive paths.

## Request Context

User asked: "currently we have one android wrapper application, please create one ios version. just the same fucntionality as the android version. i believe the requirement is very clear. for testing you can first use the ios emulator testing in e2e, and i also think i have apple some kinda certificate for publishing in ios app store. you can writ ein teh requirement in e2e it should try to find out whether i have it or not. because i have 199 developer membership for apple."

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app/tickets/ios-wrapper-app`
- Current Branch: `codex/ios-wrapper-app`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-06-06 before worktree creation; a later pre-handoff refresh also succeeded and the task branch fast-forwarded to current `origin/personal`.
- Task Branch: `codex/ios-wrapper-app`
- Expected Base Branch (if known): `personal` / `origin/personal`
- Expected Finalization Target (if known): `personal` unless downstream delivery records a different integration target.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: User's original checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` had pre-existing uncommitted changes (`index.html`, `test.txt`) and must not be used as the authoritative task workspace. Work for this task must use the dedicated worktree above.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-06 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Bootstrap repository context | Repo root is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; current branch was `personal`; pre-existing modified/untracked files present. | No |
| 2026-06-06 | Command | `git remote -v`, `git remote show origin`, `git symbolic-ref refs/remotes/origin/HEAD`, `git worktree list --porcelain` | Resolve base branch and existing worktrees | Remote `origin` points to `git@github.com-ryan:AutoByteus/autobyteus-workspace.git`; remote HEAD/default resolved to `personal`; no exact iOS-wrapper worktree existed. | No |
| 2026-06-06 | Command | `git fetch origin --prune` | Refresh tracked remote refs before task branch/worktree creation | Fetch succeeded. | No |
| 2026-06-06 | Command | `git worktree add -b codex/ios-wrapper-app /Users/normy/autobyteus_org/autobyteus-worktrees/ios-wrapper-app origin/personal` | Create mandatory dedicated task worktree/branch | Dedicated branch/worktree created at `00631e7a091f3202eb31fd7b03161a24b8730ccd`; branch tracks `origin/personal`. | No |
| 2026-06-06 | Command | `git fetch origin --prune && git merge --ff-only origin/personal` | Refresh dedicated worktree before handoff after `origin/personal` advanced | Fast-forwarded task branch from `00631e7a` to `c62a78d6`; no conflicts with task artifacts. | No |
| 2026-06-06 | Command | `find . -maxdepth 3 ... Android/iOS candidates`; `find autobyteus-android -maxdepth 3 -type f`; `rg -n "android|ios|mobile|wrapper|webview|..." ...` | Locate existing Android and any iOS scaffolding | Found `autobyteus-android` Gradle app only; no iOS project/workspace/Podfile/Package.swift. Docs identify Android wrapper and `/mobile` model. | No |
| 2026-06-06 | Code/Doc | `autobyteus-android/README.md` | Understand Android wrapper product scope | Android app is WebView shell for existing `/mobile`; does not run backend or implement chat/run natively; owns first-run setup, QR scanning, saved profile, reachability checks, WebView containment, diagnostics. | Mirror in iOS design. |
| 2026-06-06 | Code | `autobyteus-android/app/src/main/java/org/autobyteus/mobile/MainActivity.kt` | Identify Android execution entrypoint | `MainActivity` wires saved-node store, validator, connection screen, QR coordinator, file chooser, WebView, shared text input, back behavior. | Use as iOS app spine reference. |
| 2026-06-06 | Code | `autobyteus-android/app/src/main/java/org/autobyteus/mobile/connection/*.kt` | Inspect URL parsing, pairing, validation, diagnostics, saved profile | Normalizes bare host to HTTPS, derives base/mobile/status URLs, parses pairing URL/raw JSON/base64 payloads, validates `/rest/remote-access/status`, stores profile metadata only. | Port equivalent policies and tests to Swift. |
| 2026-06-06 | Code | `autobyteus-android/app/src/main/java/org/autobyteus/mobile/web/*.kt` | Inspect WebView containment and file chooser behavior | WebView enables JS/DOM storage, disables file path access, allows content URIs; same-origin allowlist; externalizes different origins and `mailto`/`tel`/`sms`; blocks unsafe schemes; Android bridges file picker. | Implement WKWebView containment; rely on iOS pickers/file input. |
| 2026-06-06 | Code | `autobyteus-android/app/src/main/java/org/autobyteus/mobile/shell/QrScanCoordinator.kt` | Inspect QR/camera flow | App owns camera permission, bundled QR scan activity, cancel/denial/unavailable diagnostics. | Implement AVFoundation QR scanner and simulator-unavailable recovery. |
| 2026-06-06 | Code | `autobyteus-android/app/src/test/java/...`; `autobyteus-android/app/src/androidTest/...` | Inventory Android test coverage | Unit tests cover URL, pairing, file chooser policy, navigation policy. Instrumented tests cover package installability, QR result/permission, WebView settings, full-viewport/overlay behavior. | Mirror equivalent iOS tests and simulator smoke. |
| 2026-06-06 | Doc | `docs/android_mobile_access.md` | Understand live validation expectations | Documents Phone Access boundaries, Tailscale URL expectations, Android setup, `/mobile` stale bundle risk, API/E2E real-device checklist. | Add equivalent iOS docs/checklist. |
| 2026-06-06 | Code | `.github/workflows/release-android.yml`; `autobyteus-android/app/build.gradle.kts` | Understand Android signing/release model | Android release uses env/secrets; debug artifacts allowed only build-only; signed release required for publish. | iOS release workflow should mirror this build-only vs publish-enabled split. |
| 2026-06-06 | Code | `.github/workflows/release-desktop.yml`; `autobyteus-web/build/scripts/build.ts`; `autobyteus-web/build/scripts/afterPack.ts` | Understand existing Apple GitHub signing usage | Current Apple secrets are imported for macOS Electron desktop signing/notarization. The workflow uses `APPLE_CERTIFICATE_P12_BASE64`, `APPLE_CERTIFICATE_P12_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID`; this does not prove iOS App Store distribution signing. | iOS workflow must use iOS-specific `IOS_*` and `APP_STORE_CONNECT_*` secrets by default; macOS Developer ID signing must not be reused for iOS. |
| 2026-06-06 | Command | `gh secret list --app actions`; `gh variable list`; `rg -n "APPLE|IOS|MAC|CERT|PROVISION|PROFILE|ASC|APP_STORE|TEAM|..." .github/workflows scripts autobyteus-web/...` | Inspect repository-level CI signing configuration requested by user | GitHub repository has Android signing secrets and macOS Apple desktop signing/notarization secrets; no iOS-specific distribution/profile/App Store Connect API key secrets were found. | Add iOS workflow with build-only path and guarded publish path; document required secrets. |
| 2026-06-06 | Command/Test | `ANDROID_HOME="$HOME/Library/Android/sdk" ./gradlew :app:testDebugUnitTest --no-daemon` in `autobyteus-android` | Baseline Android unit health before design | Passed in 14s. | No |
| 2026-06-06 | Command/Test | `ANDROID_HOME="$HOME/Library/Android/sdk" ./gradlew :app:assembleDebug :app:compileDebugAndroidTestKotlin --no-daemon` in `autobyteus-android` | Baseline Android build/instrumented compile health | Passed in 16s; generated ignored `.gradle/` and `app/build/`. | No |
| 2026-06-06 | Command | `xcode-select -p`; `xcodebuild -version`; `xcrun simctl list devices available`; `security find-identity -v -p codesigning`; `ls ~/Library/MobileDevice/Provisioning Profiles`; `ls ~/Library/Preferences/com.apple.dt.Xcode.plist` | Discover local iOS/Xcode/signing environment | Xcode path `/Applications/Xcode.app/Contents/Developer`; Xcode `26.1.1` build `17B100`; many iOS 26.1 simulators; keychain has Developer ID Application and Apple Development identities; legacy `~/Library/MobileDevice/Provisioning Profiles` path absent; Xcode preferences file exists. | API/E2E signing readiness should repeat and record current state. |
| 2026-06-06 | Command | `defaults read com.apple.dt.Xcode ...`; `find ~/Library/Developer/Xcode/UserData/Provisioning Profiles ...`; Python `security cms -D` provisioning profile decode | Clarify whether prior Xcode signing setup exists | Xcode account list has an Apple ID identifier; local Xcode profiles include `iOS Team Provisioning Profile: *` for team `7Y86YBQ7B4` / `YU ZHENG`, platform `iOS/xrOS/visionOS`, valid until 2027-01-30, provisioned devices present, `application-identifier=7Y86YBQ7B4.*`, `get-task-allow=true`. Also found macOS development profiles. | Design evidence corrected: local iOS development signing appears prepared; App Store distribution signing still not detected. |
| 2026-06-06 | Command | `command -v xcodegen`; `xcodegen --version`; `swift --version` | Check project-generation/build tooling | XcodeGen installed at `/opt/homebrew/bin/xcodegen`, version `2.44.1`; Swift `6.2.1`. | Design can use XcodeGen if scripts document/install/check it. |
| 2026-06-06 | Command | `xcrun -f altool`; `xcrun altool --help`; `xcrun -f iTMSTransporter`; `xcodebuild -help` export-options excerpt | Verify current local Xcode upload/export tooling for CI design | Xcode 26.1.1 includes `altool` at `/Applications/Xcode.app/Contents/Developer/usr/bin/altool`; help shows `--upload-app` with API-key auth. `xcodebuild -help` lists `method=app-store-connect`, `signingStyle`, `signingCertificate`, `provisioningProfiles`, and `teamID` export options. | Revised iOS workflow contract can name `xcrun altool` upload and `method=app-store-connect` export options explicitly. |
| 2026-06-06 | Review | `tickets/ios-wrapper-app/code-review-report.md` round 4; `.github/workflows/release-ios.yml`; `autobyteus-ios/project.yml`; `verify-appstore-profile.py` | Investigate code-review design-impact finding CVR-003 and related CVR-004/CVR-005 follow-ups | Code review found prerelease tags such as `v1.2.7-rc1` can flow into `MARKETING_VERSION`/`CFBundleShortVersionString`; workflow bundle-ID variables verify/export one ID while `project.yml` hard-codes another; build-only simulator paths ignore release version/build metadata. | Revise DS-IOS-009 to define numeric iOS marketing/build metadata, one bundle-ID authority, and consistent build-only/archive metadata consumption. |
| 2026-06-06 | Web | `https://developer.apple.com/documentation/bundleresources/information-property-list/cfbundleshortversionstring`; `https://developer.apple.com/documentation/bundleresources/information-property-list/cfbundleversion` | Verify Apple bundle version constraints from primary source | Apple documents `CFBundleShortVersionString` as three period-separated integers with numeric characters/periods only; `CFBundleVersion` is one to three period-separated integers with numeric characters/periods only and is required by the App Store. | Release metadata must never put prerelease suffix text into iOS bundle version fields. |
| 2026-06-06 | Code | `autobyteus-server-ts/src/api/rest/remote-access.ts`; `src/remote-access/services/remote-access-pairing-service.ts`; `domain/models.ts`; `src/api/static/mobile-web.ts` | Verify backend Phone Access contracts | Status route returns phone access metadata plus server instance ID; pairing requires HTTPS and emits `/mobile?pairing=` payload; static mobile routes serve `/mobile` and `/mobile/*`. | iOS validator should tolerate extra status fields and use backend status contract. |
| 2026-06-06 | Web | `https://developer.apple.com/documentation/webkit/wkwebview`; search query `site:developer.apple.com/documentation/webkit/wkwebview WKWebView navigation delegate...` | Confirm iOS WebView API and navigation delegate role | Apple docs define `WKWebView` as native view for web content and note navigation delegate controls navigation behavior. | Use WKWebView + WKNavigationDelegate. |
| 2026-06-06 | Web | `https://developer.apple.com/documentation/bundleresources/information-property-list/nscamerausagedescription`; query `site:developer.apple.com NSCameraUsageDescription...` | Confirm camera privacy key | `NSCameraUsageDescription` is required when app uses camera APIs. | Include Info.plist purpose string. |
| 2026-06-06 | Web | `https://developer.apple.com/documentation/bundleresources/information-property-list/nslocalnetworkusagedescription`; query `site:developer.apple.com NSLocalNetworkUsageDescription...` | Confirm local network privacy key | Apps using local network directly/indirectly should include a usage description. | Include Info.plist purpose string for LAN/tailnet node checks. |
| 2026-06-06 | Web | `https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity/nsallowsarbitraryloadsinwebcontent`; `https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity/nsallowslocalnetworking` | Confirm ATS exception behavior | Web-content arbitrary loads disable ATS restrictions for web views and require App Store justification; local networking key covers local resources/IPs. | Design must document ATS risk and justification for acknowledged private HTTP. |
| 2026-06-06 | Web | `https://developer.apple.com/help/account/certificates/certificates-overview`; `https://developer.apple.com/help/account/provisioning-profiles/create-an-app-store-provisioning-profile/`; `https://developer.apple.com/help/account/membership/programs-overview/` | Confirm signing/provisioning requirements | Distribution requires appropriate certificates/profiles; Developer Program provides App Store Connect/TestFlight; Xcode automatic signing can manage profiles. | Readiness script should inspect identities/profiles and optionally attempt archive when team is configured. |
| 2026-06-06 | Web | `https://developer.apple.com/app-store/review/guidelines/`; query `site:developer.apple.com/app-store/review/guidelines web view app minimum functionality 4.2` | App Store review risk for WebView wrapper | Guideline 4.2 says apps should include features/content/UI beyond repackaged websites; review docs require fully functional URLs/demo access. | Docs/review notes should emphasize native utility beyond generic WebView. |
| 2026-06-06 | Web | `https://developer.apple.com/documentation/foundation/nsextensioncontext`; query `site:developer.apple.com NSExtensionContext openURL Share Extension...` | Evaluate iOS share-extension handoff risk | `NSExtensionContext` handles extension input items and URL opening support varies by extension point. | iOS share handoff must avoid unsupported APIs; pending-input handoff is acceptable. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Android `MainActivity` or Android share intent launches `org.autobyteus.mobile`.
- Current execution flow:
  1. `MainActivity` creates native stores/coordinators/screens.
  2. If Android `ACTION_SEND text/plain` is present, it resolves that text immediately.
  3. Else it loads selected saved profile or renders the connection screen.
  4. Input comes from manual entry, paste, share, or QR scan.
  5. `ConnectionInputResolver` parses/normalizes and requires HTTP acknowledgement when needed.
  6. `ConnectionValidator` calls `/rest/remote-access/status`.
  7. Reachable + Phone Access enabled saves/selects profile and opens `AutoByteusWebView` at `/mobile` or `/mobile?pairing=`.
  8. `TrustedNavigationPolicy` governs WebView navigation.
  9. Web failures map to native diagnostic overlay; healthy WebView fills viewport.
- Ownership or boundary observations:
  - Native wrapper owns only setup, saved node metadata, diagnostics, QR/picker/native shell, validation, and containment.
  - `/mobile` owns mobile product UI and credential storage.
  - Backend owns pairing, authorization, revocation, and route behavior.
  - Tailscale is only private-network reachability, not AutoByteus authorization.
- Current behavior summary: Android wrapper is a native shell around a remote AutoByteus `/mobile` web app, not a native AutoByteus client/runtime.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found
- Refactor posture evidence summary: The existing Android/native-wrapper and backend/mobile-web boundaries are explicit and healthy for adding a sibling iOS wrapper. Cross-platform policy duplication risk exists but can be contained with mirrored tests and durable docs rather than a broader shared-library refactor now. Round-4 code review exposed a release-workflow contract gap, not a runtime-wrapper refactor need: DS-IOS-009 must own App Store-compatible version metadata and bundle-ID authority explicitly.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `autobyteus-android/README.md` | Android explicitly does not run backend or implement product behavior natively. | iOS should preserve same ownership boundary. | No |
| `MainActivity.kt` | Native shell is one platform entrypoint coordinating setup/validation/WebView. | iOS can implement equivalent app-shell owner without refactoring backend/web. | No |
| `connection/*.kt` | URL, pairing, validation, profile persistence are platform-wrapper policies. | Swift equivalents should be tested against Android examples to avoid drift. | Yes, implementation tests. |
| `docs/android_mobile_access.md` | Existing docs already split Android app, `/mobile`, backend, Docker launcher, and Tailscale responsibilities. | Add iOS docs using same boundary model. | Yes, docs. |
| Local Xcode/signing probe | Xcode/simulators exist; Apple Development identity and iOS wildcard development profile exist for team `7Y86YBQ7B4`; distribution identity/App Store profiles are not detected locally, and iOS CI publish secrets are not detected. | Simulator E2E and likely local development signing are feasible; GitHub App Store/TestFlight upload must be secret-gated and cannot assume local Xcode state. | Yes, signing-readiness script and CI secret gate. |
| Round-4 code review release metadata probe | Existing workflow accepts prerelease tags, hard-codes Xcode target bundle IDs, and applies version/build only to archive. | DS-IOS-009 needs one release metadata owner whose outputs feed build-only, archive, profile verification, and export consistently. | Yes, design rework and implementation reroute. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-android/README.md` | Android wrapper guide | Clearly defines native shell ownership and live validation checklist. | iOS README/docs should mirror this structure. |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/MainActivity.kt` | Android app entrypoint/coordinator | Coordinates saved node, input, QR, validation, WebView, diagnostics. | iOS `AppShell`/root controller should govern equivalent spine. |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/connection/NodeUrlNormalizer.kt` | URL normalization | Defaults bare host to HTTPS, accepts known AutoByteus paths, derives base/mobile/status. | Port to Swift and test equivalent cases. |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/connection/PairingLinkParser.kt` | Pairing input parser | Handles URL, JSON, base64url payloads and saves clean stable profile. | Port to Swift; preserve no native credential ownership. |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/connection/ConnectionValidator.kt` | Status reachability check | GET status, checks `phoneAccessEnabled`, maps HTTP/errors. | iOS `URLSession` equivalent. |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/connection/SavedNodeStore.kt` | Native saved profile store | Stores profile JSON in SharedPreferences. | iOS `UserDefaults` JSON store. |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/web/TrustedNavigationPolicy.kt` | WebView navigation allowlist | Allows same-origin `/mobile`, `/rest`, `/graphql`, assets/manifests/icons; externalizes different origins and phone/mail/sms; blocks unsafe/same-origin desktop paths. | iOS `TrustedNavigationPolicy` for `WKNavigationDelegate`. |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/web/AutoByteusWebView.kt` | Android WebView host | JS/DOM storage enabled, file access disabled, content access enabled, full viewport, diagnostics. | iOS `WKWebView` configuration and diagnostics. |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/shell/QrScanCoordinator.kt` | QR/camera orchestration | App-owned scanner/permission/cancel diagnostics. | iOS `QrScanCoordinator` + `AVFoundation` scanner. |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/web/WebFileChooserCoordinator.kt` | Android file picker bridge | Handles WebView file input via Android picker. | iOS should rely on WKWebView/system picker or only add a native bridge if required by API reality. |
| `docs/android_mobile_access.md` | Mobile access and validation docs | Includes ownership boundaries and stale bundle warning. | Add iOS-specific doc and cross-reference. |
| `autobyteus-server-ts/src/api/rest/remote-access.ts` | Backend status/pairing routes | Status route contract. | iOS validator target. |
| `autobyteus-server-ts/src/api/static/mobile-web.ts` | `/mobile` static serving | Serves public mobile shell. | iOS WebView target. |
| `.github/workflows/release-android.yml` | Android release build/signing workflow | Signed release publish requires complete secrets, while non-publish paths can still produce build artifacts. | iOS release workflow should mirror the build-only vs guarded-publish split and add App Store Connect/TestFlight upload when required iOS secrets are present. |
| `.github/workflows/release-ios.yml` | Implemented iOS release workflow | Current round-4 implementation resolves `version_name` from tag including prerelease suffix and passes it to archive `MARKETING_VERSION`; it also uses `IOS_BUNDLE_ID`/`IOS_SHARE_EXTENSION_BUNDLE_ID` for profile/export but not target identifiers. | DS-IOS-009 must require `ios_marketing_version` numeric core, `artifact_version` with suffix, numeric build number, and one bundle-ID authority across workflow and project. |
| `autobyteus-ios/project.yml` | XcodeGen project definition | Current target `PRODUCT_BUNDLE_IDENTIFIER` values are hard-coded defaults, so documented workflow variables do not drive generated app/share target IDs. | Project settings should define default build variables and set target identifiers from those variables; workflow must pass them consistently. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-06 | Test | `ANDROID_HOME="$HOME/Library/Android/sdk" ./gradlew :app:testDebugUnitTest --no-daemon` | Android unit tests passed in 14s. | Android baseline healthy. |
| 2026-06-06 | Test | `ANDROID_HOME="$HOME/Library/Android/sdk" ./gradlew :app:assembleDebug :app:compileDebugAndroidTestKotlin --no-daemon` | Android debug APK and instrumented test Kotlin compile passed in 16s. | Existing Android wrapper build remains healthy before iOS work. |
| 2026-06-06 | Probe | `xcode-select -p` | `/Applications/Xcode.app/Contents/Developer` | Xcode command-line tools point to full Xcode. |
| 2026-06-06 | Probe | `xcodebuild -version` | `Xcode 26.1.1`, build `17B100` | iOS build environment exists. |
| 2026-06-06 | Probe | `xcrun simctl list devices available` | iOS 26.1 simulators available including iPhone 17/17 Pro/16e and iPads. | Simulator-first E2E is feasible. |
| 2026-06-06 | Probe | `security find-identity -v -p codesigning` | Valid identities: `Developer ID Application: YU ZHENG (7Y86YBQ7B4)` and `Apple Development: YU ZHENG (WB8QCBB75J)`. | Development signing likely available; App Store distribution identity not detected locally. |
| 2026-06-06 | Probe | `ls -la "$HOME/Library/MobileDevice/Provisioning Profiles"` | Legacy directory not found. | Not the active Xcode profile location on this machine. |
| 2026-06-06 | Probe | `find "$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles" ...` plus `security cms -D` decode | Found one iOS wildcard development provisioning profile (`7Y86YBQ7B4.*`) and three macOS development profiles. | Local development signing is substantially configured; App Store distribution profile not detected. |
| 2026-06-06 | Probe | `ls -la "$HOME/Library/Preferences/com.apple.dt.Xcode.plist"` | Xcode plist exists. | Xcode account/settings may exist; readiness script must not infer membership only from local identities. |
| 2026-06-06 | Probe | `xcodegen --version` | XcodeGen `2.44.1` installed. | XcodeGen is viable locally; scripts should check/install/document. |
| 2026-06-06 | Probe | `xcrun -f altool`; `xcrun altool --help`; `xcodebuild -help` | `altool` exists in Xcode 26.1.1 and supports `--upload-app` with API key/issuer. `xcodebuild -help` lists `app-store-connect` export method and manual signing/profile mapping keys. | Release workflow can use exact upload/export commands and fail clearly if GitHub runner lacks them. |

## External / Public Source Findings

- Apple `WKWebView` docs: `https://developer.apple.com/documentation/webkit/wkwebview`
  - Freshness: crawled recently by search; Apple docs.
  - Relevant contract: `WKWebView` displays web content and navigation delegates manage/restrict navigation.
  - Why it matters: iOS wrapper should use `WKWebView` and a navigation delegate for trusted-origin containment.
- Apple `WKNavigationDelegate` policy docs: `https://developer.apple.com/documentation/webkit/wknavigationdelegate/3223382-webview`
  - Relevant contract: delegate must decide whether to allow/cancel navigation.
  - Why it matters: maps Android `TrustedNavigationPolicy` to iOS.
- Apple `NSCameraUsageDescription`: `https://developer.apple.com/documentation/bundleresources/information-property-list/nscamerausagedescription`
  - Relevant contract: required when camera APIs are used.
  - Why it matters: QR scanning requires this Info.plist key.
- Apple `NSLocalNetworkUsageDescription`: `https://developer.apple.com/documentation/bundleresources/information-property-list/nslocalnetworkusagedescription`
  - Relevant contract: apps using local network directly/indirectly should include a usage string.
  - Why it matters: AutoByteus connects to LAN/tailnet nodes.
- Apple ATS `NSAllowsArbitraryLoadsInWebContent`: `https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity/nsallowsarbitraryloadsinwebcontent`
  - Relevant contract: disabling ATS for web-view loads is possible but requires App Store justification.
  - Why it matters: Android supports acknowledged private HTTP; iOS needs a documented ATS posture.
- Apple ATS `NSAllowsLocalNetworking`: `https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity/nsallowslocalnetworking`
  - Relevant contract: controls ATS treatment for unqualified domains, `.local`, and IP addresses.
  - Why it matters: simulator/LAN HTTP paths and private nodes may use IP/local endpoints.
- Apple certificate overview: `https://developer.apple.com/help/account/certificates/certificates-overview`
  - Relevant contract: development certificates run/test; distribution certificates upload/distribute.
  - Why it matters: local Apple Development identity is not the same as App Store distribution readiness.
- Apple App Store provisioning profile help: `https://developer.apple.com/help/account/provisioning-profiles/create-an-app-store-provisioning-profile/`
  - Relevant contract: App Store Connect upload requires App ID and distribution profile; Xcode automatic signing can manage profiles.
  - Why it matters: readiness check should inspect profiles and optional Xcode-managed signing.
- Apple Developer Program overview: `https://developer.apple.com/help/account/membership/programs-overview/`
  - Relevant contract: membership gives access to TestFlight and App Store Connect.
  - Why it matters: user's membership claim should be distinguished from local signing assets.
- Apple App Review Guidelines: `https://developer.apple.com/app-store/review/guidelines/`
  - Relevant contract: apps should include features/UI/utility beyond a repackaged website; review needs functional URLs/demo access.
  - Why it matters: iOS wrapper docs/review notes must explain native utility and provide review setup.
- Apple `NSExtensionContext`: `https://developer.apple.com/documentation/foundation/nsextensioncontext`
  - Relevant contract: extension input items and URL opening support are extension-point dependent.
  - Why it matters: iOS shared-text parity must avoid unsupported extension APIs.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: iOS Simulator; local fake status/mobile server for simulator E2E; optional reachable real AutoByteus node for live validation.
- Required config, feature flags, env vars, or accounts: Xcode for local simulator validation; optional `IOS_DEVELOPMENT_TEAM`/bundle ID signing settings for local archive-readiness probing; GitHub publish requires iOS-specific repository secrets `IOS_DISTRIBUTION_CERTIFICATE_P12_BASE64`, `IOS_DISTRIBUTION_CERTIFICATE_P12_PASSWORD`, `IOS_APPSTORE_PROVISIONING_PROFILE_BASE64`, `IOS_DEVELOPMENT_TEAM`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_API_KEY_P8_BASE64`, plus `IOS_SHARE_EXTENSION_APPSTORE_PROVISIONING_PROFILE_BASE64` if the share extension target exists. These iOS CI distribution/App Store Connect secrets were not detected during investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation; Android Gradle checks produced ignored build outputs.
- Cleanup notes for temporary investigation-only setup: Ignored `autobyteus-android/.gradle/` and `autobyteus-android/app/build/` were generated by baseline checks and should not be committed.

## Findings From Code / Docs / Data / Logs

- Android-native wrapper is deliberately thin around server-owned `/mobile` and backend-owned Phone Access.
- At initial investigation the repository had no iOS project, so the target design was additive. Round-4 implementation now contains an iOS project and release workflow; the current rework affects only DS-IOS-009 release metadata/bundle-ID authority and does not invalidate the runtime wrapper shape.
- Simulator-first validation is feasible on the current machine.
- Local Apple signing state is partial: Apple Development identity and iOS wildcard development provisioning profile exist for team `7Y86YBQ7B4` / `YU ZHENG`; Apple/iOS Distribution identity and App Store provisioning profile are not detected. This aligns with the user's memory of prior Xcode setup while still requiring E2E to discover App Store readiness rather than assume.
- Existing GitHub Apple secrets are wired for macOS Electron Developer ID signing/notarization. They should not be assumed to sign iOS apps; iOS CI must use iOS-specific secrets and validate identity/profile types. A macOS `Developer ID Application` identity is not valid for iOS App Store distribution.
- App Store review posture needs explicit documentation because the app is WebView-based, but native setup/QR/diagnostics/containment provide meaningful platform utility beyond a generic website clip.
- Round-4 code review found DS-IOS-009 versioning/configuration gaps: App Store-compatible `CFBundleShortVersionString` must be numeric `MAJOR.MINOR.PATCH`, prerelease suffixes must stay out of iOS bundle version fields, bundle IDs need one authority across project/workflow/profile/export, and build-only release artifacts should consume the same resolved iOS version/build metadata as archive artifacts.

## Constraints / Dependencies / Compatibility Facts

- iOS must use public Apple APIs.
- `WKWebView` credential/localStorage is origin-scoped like Android WebView localStorage; stable final HTTPS origin matters.
- New Phone Access pairing QR creation requires HTTPS server base; Android/iOS app may still support explicitly acknowledged private HTTP for development/private LAN opening.
- ATS behavior and App Store review may constrain cleartext HTTP support.
- iOS Simulator cannot prove physical camera QR scanning; device validation is required before release readiness.
- Share extension direct app opening is platform-constrained; use safe pending-input handoff if necessary.
- GitHub-hosted macOS runners do not inherit the user's local Xcode login/session; CI publishing requires repository secrets or App Store Connect API credentials even when local Xcode automatic signing works.
- iOS release metadata must split `release_tag`/`artifact_version`/prerelease labels from bundle version fields: `CFBundleShortVersionString` is three numeric period-separated integers, and `CFBundleVersion` is numeric period-separated build metadata.
- `IOS_BUNDLE_ID` and `IOS_SHARE_EXTENSION_BUNDLE_ID` must drive generated Xcode target identifiers, profile verification, export mapping, and all release build paths from one authority.

## Open Unknowns / Risks

- The local detected Apple Developer team ID is `7Y86YBQ7B4` (`YU ZHENG`), but implementation should still keep it configurable for CI/future team changes.
- Whether App Store Connect has an app record and bundle ID registered is unknown.
- Whether Xcode can auto-manage distribution signing for this bundle ID is unknown locally, and GitHub-hosted runners will require explicit repository secrets/API credentials even when local Xcode automatic signing works.
- iOS distribution/App Store Connect GitHub secrets are not currently present under iOS-specific names; implementation must still add the upload-capable workflow, make build-only pass without those secrets, and make publish fail fast with exact missing-secret instructions until they are configured.
- Whether Apple review accepts the private HTTP ATS exception depends on final metadata/justification and reviewer judgment.
- Whether iOS WebView file upload fully satisfies the mobile attachment path must be validated on simulator/live node and ideally physical device.
- Implementation must add/adjust static or executable checks so prerelease version derivation, custom bundle-ID authority, and build-only version/build metadata are validated before API/E2E starts.

## Notes For Architect Reviewer

- Design should be judged as a new sibling native platform surface, not a backend/mobile-web refactor.
- The main architectural risk is policy drift between Android Kotlin and iOS Swift; the design mitigates with mirrored file responsibilities and tests rather than cross-language shared-library extraction.
- Local signing readiness is explicitly a validation/discovery requirement, not a promise that App Store publishing is currently configured. The design must still include upload-capable CI; current evidence says local development signing exists for team `7Y86YBQ7B4`, but iOS CI distribution/App Store Connect secrets are not detected, so publish must fail fast with exact missing inputs until configured.
- Round-4 design rework should be judged on the corrected DS-IOS-009 contract: `v1.2.7-rc1` may be accepted as release/artifact metadata, but iOS `MARKETING_VERSION` must become `1.2.7`, `CURRENT_PROJECT_VERSION` must remain numeric, workflow bundle-ID variables must drive Xcode target IDs and profile/export checks, and build-only evidence must use the same metadata.
