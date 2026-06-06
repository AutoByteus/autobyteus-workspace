# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Create a native iOS wrapper application that provides the same product role as the existing `autobyteus-android` wrapper: a lightweight, native phone shell that connects to a reachable AutoByteus desktop/server node, validates Phone Access, and hosts the existing server-served `/mobile` web shell. The iOS app must not implement AutoByteus chat/run/files behavior natively and must not run an AutoByteus backend locally on iOS.

The first validation path must be iOS Simulator E2E. The repository must also gain an iOS GitHub Actions release workflow analogous to the existing Android release workflow: it should always support build/test artifacts, and it should automatically archive and upload the iOS app to App Store Connect/TestFlight when the required Apple signing and App Store Connect secrets are present. Public App Store availability still depends on Apple App Review and any release gates configured in App Store Connect; CI must not pretend it can bypass review.

## Investigation Findings

- The Android wrapper lives under `autobyteus-android` and is a native Kotlin/Android WebView shell for the existing AutoByteus `/mobile` experience.
- Android-owned responsibilities are setup input, QR scanning, saved node profiles, `/rest/remote-access/status` reachability validation, WebView containment, diagnostics, Tailscale guidance, file-picker bridging, build/package, and Android-specific release signing.
- The existing `/mobile` web shell owns Home, Chat, Runs, Files, Activity, run setup, pairing bootstrap, mobile credential storage in WebView-local storage, and mobile session restore.
- Backend Phone Access owns pairing sessions, mobile credentials, revocation, and the public `/rest/remote-access/status` route.
- There is no existing iOS project, `.xcodeproj`, `.xcworkspace`, `Podfile`, or Swift package in the repository.
- Local environment on 2026-06-06 has Xcode installed (`Xcode 26.1.1`, build `17B100`) and iOS 26.1 simulators available. The keychain contains an `Apple Development: YU ZHENG (WB8QCBB75J)` identity and a `Developer ID Application` macOS identity. Xcode local provisioning data includes an iOS wildcard development provisioning profile for team `7Y86YBQ7B4` / `YU ZHENG`, valid until 2027-01-30, with `get-task-allow=true` and provisioned devices. No `Apple Distribution`/`iOS Distribution` identity or App Store provisioning profile was detected locally. This means local iOS development signing appears prepared, while TestFlight/App Store distribution readiness is not yet detected. The GitHub repository already has macOS Apple signing secrets used by `.github/workflows/release-desktop.yml`, but those secrets are not currently wired for iOS, are not part of the required iOS CI signing contract, and are not sufficient to prove iOS App Store/TestFlight readiness. iOS CI distribution/App Store Connect secrets were not detected.
- Code review round 4 found that iOS release metadata must not pass prerelease suffixes such as `-rc1` into `CFBundleShortVersionString`/`MARKETING_VERSION`; Apple requires the short version string to be three numeric period-separated integers. The iOS release contract must therefore split release tag/artifact/prerelease metadata from App Store-compatible iOS marketing/build versions.
- Code review round 4 also found that the documented `IOS_BUNDLE_ID` and `IOS_SHARE_EXTENSION_BUNDLE_ID` release variables must be the same authority used by generated Xcode target bundle identifiers, profile verification, and export mapping; build-only artifacts must consume the same resolved iOS marketing version/build number as archive artifacts.
- Relevant Apple docs confirm:
  - `WKWebView` is the native iOS web-content host and delegates control navigation behavior.
  - `NSCameraUsageDescription` is required when the app uses the camera for QR scanning.
  - local network access should include `NSLocalNetworkUsageDescription`.
  - ATS exceptions such as `NSAllowsArbitraryLoadsInWebContent` require App Store review justification.
  - App Store Review Guideline 4.2 requires a wrapper app to provide utility beyond merely repackaging a website. Native QR setup, saved node management, reachability diagnostics, trusted-origin containment, and Tailscale recovery guidance are therefore important App Store-readiness evidence.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature
- Initial design issue signal (`Yes`/`No`/`Unclear`): No for runtime-wrapper scope; Yes for round-4 release-workflow metadata/bundle-ID contract rework.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found for native runtime wrapper; Boundary Or Ownership Issue for DS-IOS-009 release automation.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Runtime wrapper refactor not needed; release workflow/project build-setting rework needed now.
- Evidence basis: The existing Android app has clear platform-wrapper ownership boundaries and already delegates product behavior to `/mobile` and backend Phone Access. Existing release automation is already split by target (`release-android.yml` and `release-desktop.yml`), so adding iOS as a sibling native app plus a sibling iOS release workflow does not require an Android/backend/mobile-web or cross-target release-system refactor. Round-4 code review showed the iOS release workflow itself needs tighter ownership for App Store-compatible version metadata and app/share bundle IDs.
- Requirement or scope impact: Implementation should add/maintain an `autobyteus-ios` sibling project with Swift/iOS-native equivalents for the Android-owned wrapper responsibilities and add/fix `.github/workflows/release-ios.yml` with a build-only path plus a guarded App Store Connect/TestFlight upload path. To reduce cross-platform policy drift, iOS must include unit tests that mirror Android URL parsing, pairing parsing, diagnostics, and navigation-policy examples. To reduce release-policy drift, iOS release metadata and bundle IDs must be resolved once and consumed consistently by build-only and publish paths.

## Recommendations

- Implement `autobyteus-ios` as a native Swift/UIKit + `WKWebView` app generated/buildable through Xcode/XcodeGen and `xcodebuild`.
- Keep the iOS wrapper dependency-light: use system frameworks (`UIKit`, `WebKit`, `AVFoundation`, `SafariServices`/`UIApplication`) instead of adding React Native/Capacitor or a local runtime.
- Use the same app-facing name, product role, and saved-node behavior as Android. Recommended default bundle ID: `org.autobyteus.mobile`, configurable through build settings for signing if Apple Developer account setup requires a different registered ID.
- Implement simulator-first E2E against a local fake AutoByteus status/mobile server reachable from the iOS Simulator, then leave a live-node checklist for API/E2E when a real Phone Access node/device is available.
- Add a signing-readiness script that inspects Xcode, simulator runtimes, code-signing identities, provisioning profiles, bundle ID/team configuration, and optional archive capability without uploading to App Store Connect.
- Add/fix `.github/workflows/release-ios.yml` in this task. The workflow should run simulator build/tests without Apple secrets and should conditionally run signed archive + App Store Connect/TestFlight upload only when iOS-specific signing/API secrets are configured. Release metadata must split numeric iOS bundle versions from prerelease artifact labels, and bundle-ID settings must have one authority across Xcode project and workflow.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-IOS-001: First-run iOS user enters or pastes a stable AutoByteus `/mobile` URL or pairing link and opens the existing mobile shell.
- UC-IOS-002: iOS user scans an AutoByteus Phone Access QR with the in-app scanner on a camera-capable device; simulator gracefully reports camera/scanner unavailability where real scanning is not possible.
- UC-IOS-003: iOS app restores the last selected saved node after force-stop/relaunch without requiring another QR scan.
- UC-IOS-004: iOS user stays inside a trusted same-origin `WKWebView` for `/mobile`, REST, GraphQL, and static assets while external or unsafe navigation is opened outside or blocked.
- UC-IOS-005: iOS user can use the mobile web shell’s existing Home/Chat/Runs/Files/Activity/run setup behavior after pairing.
- UC-IOS-006: iOS user can share or hand off a text URL/pairing payload to AutoByteus using the safest iOS platform-supported equivalent; if iOS extension rules prevent immediate app launch, the app must persist pending shared input and pick it up on next activation with clear user guidance.
- UC-IOS-007: API/E2E validates the iOS app first in an iOS Simulator.
- UC-IOS-008: API/E2E records whether local Apple signing assets appear sufficient for development and later App Store archive/export work.
- UC-IOS-009: Release automation builds the iOS app in GitHub Actions and, when configured with required Apple secrets, uploads a signed archive to App Store Connect/TestFlight from release tags or manual dispatch.

## Out of Scope

- Native iOS implementation of AutoByteus Home, Chat, Runs, Files, Activity, agent/team setup, tool approval, or credential exchange behavior already owned by `/mobile` and backend Phone Access.
- Running AutoByteus backend/server locally on iOS.
- Replacing or refactoring the Android wrapper.
- Replacing the server-served `/mobile` web shell or changing mobile-web behavior, except for docs/checklist updates needed to describe iOS wrapper validation.
- Phase Two mobile backend authorization hardening from `docs/future-tickets/mobile-backend-authorization-hardening.md`.
- Tailscale account management, Tailscale SDK/VPN integration, or automatic Tailscale Serve configuration.
- Privacy questionnaire completion, App Store listing metadata, final Apple review approval, and guaranteed public App Store availability. CI upload to App Store Connect/TestFlight is in scope when secrets are configured, but Apple review/release decisions remain external.
- Physical iPhone camera validation as a hard minimum for this task when simulator-first validation is available; physical-device QR scanning remains required before claiming production release readiness.

## Functional Requirements

- R-IOS-001: Add a native iOS wrapper project under `autobyteus-ios` that can be built from a clean checkout with documented commands and does not require a JavaScript mobile runtime bundled inside the app.
- R-IOS-002: The iOS app must present a first-run connection screen with saved nodes, manual URL/pairing input, paste support, an explicit HTTP-private-network acknowledgement, a QR scan action, and Tailscale-oriented guidance/recovery actions.
- R-IOS-003: The iOS input resolver must parse the same accepted input classes as Android: bare host, base URL, `/mobile` URL, `/rest/remote-access/status` URL, `/mobile?pairing=<base64url>` URL, raw JSON pairing payload, and raw base64url pairing payload.
- R-IOS-004: The iOS URL normalizer must default bare hosts to `https://`, accept only `http` and `https`, derive clean `baseUrl`, `mobileUrl`, and `statusUrl`, reject unsupported schemes/paths, and preserve explicit private HTTP ports.
- R-IOS-005: The iOS app must require explicit user acknowledgement before saving/opening an `http://` profile. HTTPS must not require that acknowledgement.
- R-IOS-006: The iOS app must validate a node by sending `GET <baseUrl>/rest/remote-access/status`, parsing `phoneAccessEnabled`, `pairingAvailable`, `compatibilityVersion`, `serverName`, and tolerating additional fields such as `serverInstanceId`.
- R-IOS-007: The iOS app must map validation failures into recoverable diagnostics equivalent to Android: invalid URL, HTTP acknowledgement required, network unreachable/TLS failure, Phone Access disabled, auth required, device revoked, incompatible server, unsafe navigation blocked, WebView load failure, camera permission denied, QR cancelled/unavailable.
- R-IOS-008: The iOS app must persist only native saved-node profile metadata (`id`, display name, base/mobile URLs, scheme, host, port, HTTP acknowledgement, timestamps, selected profile). It must not store Phone Access credentials natively for this MVP; the existing `/mobile` web shell remains credential owner through `WKWebView` web storage.
- R-IOS-009: The iOS app must load the selected node’s `/mobile` shell in a persistent `WKWebView` with JavaScript and DOM/web storage enabled, file path access disabled, and full-viewport rendering when healthy.
- R-IOS-010: The iOS navigation policy must allow same-origin AutoByteus mobile paths in the `WKWebView`, open allowed non-web or different-origin links externally, and block unsafe schemes or same-origin desktop/admin paths.
- R-IOS-011: The iOS WebView recovery overlay must expose Retry, Edit Node, and Open in Browser actions without permanently covering healthy WebView content.
- R-IOS-012: The iOS QR scanner must be app-owned, request camera permission with an appropriate `NSCameraUsageDescription`, decode QR text to the same connection input resolver, and return recoverable diagnostics for denial, cancellation, empty results, or unavailable camera hardware/simulator.
- R-IOS-013: The iOS wrapper must support web-shell attachment upload/file input through `WKWebView`/system pickers and must not introduce a native file-upload API or credential bridge.
- R-IOS-014: The iOS app must provide a safe iOS equivalent for Android text sharing: accept shared text/URL/pairing payload through an iOS-supported extension/deep-link path where feasible, or store a pending shared input and preload it on next app activation with clear instructions if immediate extension-to-app launch is not supported.
- R-IOS-015: The iOS project must include unit tests for URL normalization, pairing parsing, connection input resolution, diagnostics/status mapping, saved-node serialization, and navigation policy using Android-equivalent examples.
- R-IOS-016: The iOS project must include a simulator-first smoke/E2E script or documented command path that builds/tests the app, boots/selects an iOS simulator, runs a local fake AutoByteus status/mobile server, opens the app, enters a test URL with HTTP acknowledgement when needed, verifies `/mobile` WebView rendering, verifies saved-node restore, and captures evidence.
- R-IOS-017: API/E2E must include a signing-readiness discovery step that records Xcode path/version, available simulator runtimes/devices, code-signing identities, provisioning profiles matching the bundle ID, configured development team when provided, and whether an unsigned simulator build and optional signed archive are possible.
- R-IOS-018: The signing-readiness step and GitHub workflow must never expose private keys, P12 passwords, provisioning profile contents, App Store Connect API keys, or Apple account secrets in logs.
- R-IOS-019: Documentation must be added/updated for iOS build, simulator validation, live-node validation, QR/camera behavior, HTTP/ATS justification, App Store review notes, signing-readiness output, GitHub Actions release setup, TestFlight/App Store Connect upload behavior, and stale `/mobile` bundle risk.
- R-IOS-020: The iOS app icon/metadata must use AutoByteus branding consistently with Android/mobile web assets and keep App Store/simulator launcher requirements in mind.
- R-IOS-021: Add a GitHub Actions workflow `.github/workflows/release-ios.yml` that is triggered by release tags `v*` and `workflow_dispatch`, with inputs comparable to Android (`publish_app_store_connect`, `release_tag`, `release_ref`, and prerelease/test controls as appropriate). The workflow may accept semantic release tags with prerelease suffixes such as `v1.2.7-rc1`, but it must not pass prerelease suffixes into iOS bundle version fields.
- R-IOS-022: The iOS workflow must always support a build-only path that checks out the selected ref, builds/tests the iOS app for an iOS Simulator on a macOS runner, and uploads private workflow artifacts/logs without requiring Apple distribution secrets.
- R-IOS-023: The iOS workflow must support a publish path that imports iOS distribution signing material, archives the app with the configured team/bundle ID, exports an `.ipa`, verifies the archive/export result, and uploads the build to App Store Connect/TestFlight when all required iOS publishing secrets are present.
- R-IOS-024: The iOS workflow must fail fast with a clear missing-secret message if publish is requested but any required iOS signing/App Store Connect secret is absent or incomplete. Build-only workflow-dispatch runs must not fail solely because publishing secrets are absent.
- R-IOS-025: The iOS workflow must use iOS-specific secret names rather than reusing the current macOS desktop Apple secret names by default. Required publish secrets are `IOS_DISTRIBUTION_CERTIFICATE_P12_BASE64`, `IOS_DISTRIBUTION_CERTIFICATE_P12_PASSWORD`, `IOS_APPSTORE_PROVISIONING_PROFILE_BASE64`, `IOS_DEVELOPMENT_TEAM`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, and `APP_STORE_CONNECT_API_KEY_P8_BASE64`. If a Share Extension target is implemented, `IOS_SHARE_EXTENSION_APPSTORE_PROVISIONING_PROFILE_BASE64` is also required. Existing `APPLE_*` macOS desktop secrets must not be used for iOS publish in this task; a macOS `Developer ID Application` identity is never valid for iOS App Store signing.
- R-IOS-026: The iOS release workflow must split release-tag metadata from App Store-compatible bundle metadata. For a tag `vMAJOR.MINOR.PATCH[-PRERELEASE]`, `ios_marketing_version` / `MARKETING_VERSION` / `CFBundleShortVersionString` must be exactly `MAJOR.MINOR.PATCH` as three numeric period-separated integers; `artifact_version` may retain the prerelease suffix for artifact names and summaries; `prerelease_label` or equivalent may carry the suffix for TestFlight notes. `CURRENT_PROJECT_VERSION` / `CFBundleVersion` must be a non-empty numeric build number, defaulting to `GITHUB_RUN_NUMBER`, and must not contain prerelease text.
- R-IOS-027: `IOS_BUNDLE_ID` and `IOS_SHARE_EXTENSION_BUNDLE_ID` must be a single bundle-ID authority for release automation. The generated Xcode target `PRODUCT_BUNDLE_IDENTIFIER` values, build/test/smoke/archive `xcodebuild` settings, App Store profile verification, `ExportOptions.plist` provisioning-profile map, artifact summaries, and docs must all consume the same values. Hard-coded project target IDs must not diverge from documented workflow variables.

## Acceptance Criteria

- AC-IOS-001: From a clean checkout on macOS with Xcode installed, the documented project-generation/build command succeeds for an iOS Simulator destination.
- AC-IOS-002: The iOS unit-test suite passes and covers URL normalization, pairing parsing, input resolution, diagnostics/status mapping, saved-node persistence encoding/decoding, and trusted navigation policy.
- AC-IOS-003: A simulator smoke/E2E run starts a local fake AutoByteus node, enters/pastes an HTTP loopback `/mobile` URL with explicit acknowledgement, validates `/rest/remote-access/status`, opens the `WKWebView`, and observes a visible fake `/mobile` marker inside the WebView.
- AC-IOS-004: The simulator smoke/E2E run force-stops/relaunches the app and confirms the saved node is restored without another QR scan.
- AC-IOS-005: The simulator smoke/E2E run exercises an unreachable node or disabled Phone Access response and captures a native recoverable diagnostic rather than a raw WebView error page.
- AC-IOS-006: QR scanner behavior is validated at least by simulator graceful-unavailable/cancel diagnostics plus unit-level decode/permission-state coverage; physical-device QR scan is listed as required evidence before any production release readiness claim.
- AC-IOS-007: Navigation-policy tests prove same-origin `/mobile`, `/rest`, `/graphql`, Nuxt/static asset paths, manifest/icon/favicon paths are allowed; different origins and `mailto`/`tel`/`sms` are opened externally; unsupported schemes and same-origin desktop/admin paths are blocked.
- AC-IOS-008: The healthy WebView screen renders without a permanent native toolbar; recovery controls appear only in the diagnostic overlay.
- AC-IOS-009: File upload/attachment behavior is either validated in a simulator/live-node WebView flow or explicitly recorded as requiring physical-device/live-node validation if iOS Simulator limitations prevent complete proof.
- AC-IOS-010: The signing-readiness discovery output is captured in API/E2E evidence. On the investigated machine as of 2026-06-06 it should report Xcode 26.1.1, available iOS 26.1 simulators, one Apple Development identity, an iOS wildcard development provisioning profile for team `7Y86YBQ7B4` / `YU ZHENG`, no detected Apple/iOS Distribution identity, and no detected App Store provisioning profile unless the environment changes before validation.
- AC-IOS-011: If `IOS_DEVELOPMENT_TEAM` or an equivalent team setting is provided, validation attempts an archive/signing dry run or records why it could not safely attempt one. If no team/signing inputs are present, the result is `Not ready for App Store archive` rather than a failing app implementation.
- AC-IOS-012: No native iOS code stores `mra_...` mobile credentials, owner tokens, API keys, or backend admin credentials outside the existing `WKWebView` web storage model.
- AC-IOS-013: Documentation includes iOS setup/build/test commands, signing-readiness interpretation, GitHub Actions iOS release workflow setup, required iOS secrets, live-node validation checklist, and App Store review risks/notes for WebView utility and ATS exceptions.
- AC-IOS-014: Existing Android unit/build checks remain passing or are not touched; any Android changes must be documentation-only unless explicitly justified.
- AC-IOS-015: The iOS GitHub Actions workflow has a passing build-only path in dry-run/local validation or is syntactically validated and documented if full GitHub execution is deferred.
- AC-IOS-016: Publish-enabled iOS workflow logic validates required iOS secrets and refuses to publish if they are missing/incomplete, while preserving build-only artifacts.
- AC-IOS-017: When iOS publishing secrets are supplied, the workflow can import signing material, archive/export an `.ipa`, and upload to App Store Connect/TestFlight; if secrets are not supplied during this task, implementation must provide exact `gh secret set` instructions and record the missing items.
- AC-IOS-018: The workflow does not reuse macOS desktop `Developer ID Application` signing or fall back to existing `APPLE_*` desktop secrets for iOS distribution; a publish request with only those macOS secrets configured must fail fast with the exact missing `IOS_*`/`APP_STORE_CONNECT_*` inputs.
- AC-IOS-019: Release metadata validation proves that `v1.2.7` resolves to `ios_marketing_version=1.2.7`, `artifact_version=1.2.7`, and a numeric build number, while `v1.2.7-rc1` resolves to `ios_marketing_version=1.2.7`, `artifact_version=1.2.7-rc1`, prerelease=true/`rc1`, and the same numeric-only build-number rule. Invalid iOS marketing/build versions are rejected before archive/upload.
- AC-IOS-020: A static or executable workflow/project check with non-default `IOS_BUNDLE_ID` and `IOS_SHARE_EXTENSION_BUNDLE_ID` proves that generated Xcode target `PRODUCT_BUNDLE_IDENTIFIER` values, simulator build/test/smoke settings, archive settings, App Store profile verifier arguments, and `ExportOptions.plist` bundle keys all use the same configured IDs. Build-only tag/manual artifacts must be built/tested with the same resolved iOS marketing version and build number that archive would use.

## Constraints / Dependencies

- The project must use Apple public APIs only.
- Xcode is required for local iOS build/test. XcodeGen may be used if documented and invoked by scripts before `xcodebuild`.
- iOS Simulator E2E can validate manual input, HTTP acknowledgement, fake-server loading, restore, and diagnostics, but cannot prove real camera QR capture or all physical-device file picker behavior.
- App Store distribution depends on Apple Developer Program membership, an App Store Connect app record whose version number matches the numeric iOS marketing version, a bundle ID/App ID, signing certificate, provisioning profile, App Store Connect upload credentials, review metadata, privacy disclosures, and Apple review. The current task must add the CI/release workflow and readiness checks, but publish/upload can only pass when the required secrets/assets exist.
- App Transport Security exceptions for private HTTP must be justified. HTTPS Tailscale Serve remains recommended for travel and App Store review posture.
- The app must preserve the trusted-private-network product model: do not expose the full backend to the public internet and do not add native owner-management authorization to mobile.

## Assumptions

- The Android wrapper is the authoritative behavior reference for native-wrapper parity.
- The iOS implementation can use Swift/UIKit + `WKWebView` without adding a cross-platform app framework.
- Simulator-first validation is acceptable for initial implementation, with physical-device validation required before release claims.
- The user's Apple Developer Program membership may be accessible through Xcode, but local signing assets still need to be discovered at validation time.
- If App Store submission later requires a different bundle ID, downstream agents may configure `IOS_BUNDLE_ID` / `IOS_SHARE_EXTENSION_BUNDLE_ID`; those values must drive generated Xcode target identifiers and release verification/export from one authority without changing product behavior.
- GitHub-hosted macOS runners will not have access to the user's local Xcode login/session; CI publishing requires repository secrets or App Store Connect API credentials.

## Risks / Open Questions

- Apple App Review may scrutinize a WebView-based wrapper under Guideline 4.2; native setup, diagnostics, QR scanning, trusted-origin containment, and private-node utility must be documented as the app-specific value beyond a generic website wrapper.
- Broad ATS exceptions for acknowledged private HTTP may require App Store review justification or may need to be restricted if Apple rejects them. HTTPS Tailscale Serve should be the recommended production path.
- iOS share extensions have platform constraints around opening the containing app directly. The implementation must avoid unsupported extension APIs and may need a pending-input handoff flow.
- Current local signing assets appear sufficient for simulator and likely local physical-device development through Xcode automatic signing for team `7Y86YBQ7B4`, but iOS CI distribution/App Store Connect readiness is not currently detected. GitHub publish will not be sufficient until an Apple/iOS Distribution identity, matching App Store provisioning profile(s) for the app and any extension, `IOS_DEVELOPMENT_TEAM`, and App Store Connect API-key upload credentials are configured as repository secrets; until then build-only must pass and publish must fail fast with exact missing inputs. Prerelease tags must be represented as TestFlight/artifact metadata only, not as invalid iOS bundle short versions.
- iOS file upload from `WKWebView` may require live-node/device validation to prove all picker/camera-library combinations.

## Requirement-To-Use-Case Coverage

| Use Case | Requirements |
| --- | --- |
| UC-IOS-001 | R-IOS-001, R-IOS-002, R-IOS-003, R-IOS-004, R-IOS-005, R-IOS-006, R-IOS-007 |
| UC-IOS-002 | R-IOS-012, R-IOS-003, R-IOS-007 |
| UC-IOS-003 | R-IOS-008, R-IOS-016 |
| UC-IOS-004 | R-IOS-009, R-IOS-010, R-IOS-011, R-IOS-013 |
| UC-IOS-005 | R-IOS-009, R-IOS-012, R-IOS-013, R-IOS-019 |
| UC-IOS-006 | R-IOS-014, R-IOS-003, R-IOS-008 |
| UC-IOS-007 | R-IOS-015, R-IOS-016 |
| UC-IOS-008 | R-IOS-017, R-IOS-018, R-IOS-019 |
| UC-IOS-009 | R-IOS-021, R-IOS-022, R-IOS-023, R-IOS-024, R-IOS-025, R-IOS-026, R-IOS-027 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-IOS-001 | Proves the new project is buildable in the intended local iOS environment. |
| AC-IOS-002 | Proves native wrapper policy parity is covered at unit level. |
| AC-IOS-003 | Proves simulator-first manual/HTTP/fake-node WebView open path. |
| AC-IOS-004 | Proves saved-node restore. |
| AC-IOS-005 | Proves native diagnostics instead of raw WebView failure. |
| AC-IOS-006 | Proves QR behavior within simulator/device constraints. |
| AC-IOS-007 | Proves trusted-origin containment. |
| AC-IOS-008 | Proves healthy WebView full-viewport behavior and overlay-only recovery controls. |
| AC-IOS-009 | Proves or records evidence gap for file upload. |
| AC-IOS-010 | Proves signing-readiness discovery and current-machine Apple asset detection. |
| AC-IOS-011 | Proves archive/signing dry-run behavior is conditional and non-destructive. |
| AC-IOS-012 | Proves native app does not expand credential ownership. |
| AC-IOS-013 | Proves durable docs are updated for future users/release. |
| AC-IOS-014 | Proves Android parity was not regressed. |
| AC-IOS-015 | Proves iOS CI build-only path exists and is valid. |
| AC-IOS-016 | Proves publish path is guarded by complete iOS secrets. |
| AC-IOS-017 | Proves configured CI can archive/export/upload, or records exact missing inputs. |
| AC-IOS-018 | Proves macOS desktop signing material is not accidentally treated as iOS distribution signing. |
| AC-IOS-019 | Proves prerelease tags do not create invalid iOS `CFBundleShortVersionString` or build-version metadata. |
| AC-IOS-020 | Proves bundle IDs and build/version settings have one release-workflow authority across build-only and publish paths. |

## Approval Status

Approved for design handoff based on the user's explicit request to proceed and statement that the requirement is clear. No additional user clarification is required before architecture review.
