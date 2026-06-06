# Design Spec

## Current-State Read

The repository currently has one native mobile wrapper: `autobyteus-android`. It is a Kotlin/Android WebView shell that loads the existing server-served AutoByteus `/mobile` web shell from a reachable desktop/server node. It does not run AutoByteus locally and does not implement Home, Chat, Runs, Files, Activity, agent/team run setup, pairing exchange, or credential ownership natively.

Current Android execution path:

`Android launch/share intent -> MainActivity -> ConnectionInputResolver -> ConnectionValidator(/rest/remote-access/status) -> SavedNodeStore -> AutoByteusWebView(/mobile or /mobile?pairing=...) -> server-served /mobile shell`

Relevant current ownership boundaries:

- Android native wrapper owns first-run setup, QR scanner/camera permission handling, saved node metadata, reachability checks, native diagnostics, trusted WebView containment, Android file picker bridging, and Android build/signing.
- Existing `/mobile` web shell owns Home, Chat, Runs, Files, Activity, pairing bootstrap, run setup, and WebView-local mobile credential storage.
- Backend Phone Access owns `/rest/remote-access/status`, pairing sessions, mobile credentials, device revocation, and protected route authorization.
- Tailscale/private network tooling owns reachability only; it is not AutoByteus authorization.

There was no existing iOS project or iOS GitHub release workflow before this task. The target design remains additive: create `autobyteus-ios` as a sibling native platform wrapper and add an iOS-specific release workflow without changing Android, backend, mobile-web product ownership, or the existing Android/desktop release owners. Round-4 code review of the implemented release workflow found a DS-IOS-009 contract gap: prerelease tag text was allowed to enter iOS bundle version fields, and bundle IDs could diverge between workflow variables and Xcode target settings. This revision makes release metadata and bundle-ID authority explicit.

## Intended Change

Add a native Swift/iOS wrapper app that mirrors the Android wrapper's product role:

- native connection/setup screen;
- app-owned QR scanner;
- saved node profile metadata;
- `/rest/remote-access/status` validation;
- persistent `WKWebView` containment for the saved AutoByteus `/mobile` origin;
- diagnostics and recovery actions;
- simulator-first E2E, Apple signing-readiness discovery, and GitHub Actions iOS build/publish automation.

Use a small Foundation-only iOS core policy target for shared app/extension/test logic, plus platform-specific app and optional share-extension targets. The iOS app remains a wrapper around the existing `/mobile` shell and must not become a native AutoByteus client/runtime.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature with design-impact rework for release automation
- Current design issue found (`Yes`/`No`/`Unclear`): Yes, limited to DS-IOS-009 release metadata and bundle-ID authority; no runtime wrapper design issue.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, limited to `.github/workflows/release-ios.yml`, `autobyteus-ios/project.yml` build settings, release metadata checks, and release docs/tests.
- Evidence: Android native wrapper boundaries are explicit in `autobyteus-android/README.md`, `MainActivity.kt`, `connection/*.kt`, `web/*.kt`, and `docs/android_mobile_access.md`. The backend/mobile-web boundary is also explicit in remote-access docs and routes. Existing release automation is target-specific (`release-android.yml`, `release-desktop.yml`), so an iOS workflow can be added as a sibling owner rather than by refactoring the whole release system. Round-4 code review showed the release workflow contract was too loose: `v1.2.7-rc1` could become invalid `MARKETING_VERSION=1.2.7-rc1`, and documented bundle-ID variables did not drive target bundle IDs.
- Design response: Preserve the iOS runtime wrapper design. Tighten DS-IOS-009 so the release workflow owns a singular release metadata model (`release_tag`, `semantic_version_core`, `prerelease_label`, `ios_marketing_version`, `artifact_version`, `build_number`) and singular app/share bundle-ID authority (`IOS_BUNDLE_ID`, `IOS_SHARE_EXTENSION_BUNDLE_ID`) consumed by generated Xcode targets, simulator build/test/smoke, archive, profile verification, export mapping, summaries, and docs.
- Refactor rationale: No Android/backend/mobile-web refactor is needed because the existing owners remain correct. No whole release-system refactor is needed because the current repository already uses per-target release workflows. The in-scope release-workflow refactor is needed now because API/E2E would otherwise validate artifacts whose summaries, bundle IDs, and App Store version fields can diverge. Cross-platform duplication of URL/pairing/navigation policy remains acceptable with unit parity tests and docs.
- Intentional deferrals and residual risk, if any: A future shared mobile-wrapper contract/fixture package could reduce drift if more platforms are added or policies change frequently. Physical iPhone camera/file-picker validation, App Store listing/privacy metadata, Apple review approval, and public App Store release are deferred. The CI archive/upload workflow itself is in scope, but a successful upload may be gated by missing GitHub iOS/App Store Connect secrets and must then report the exact missing inputs.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

Read this design from:

1. data-flow spine;
2. subsystem / capability-area allocation;
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities;
4. folder/path mapping.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: no legacy iOS paths exist. Do not introduce compatibility wrappers that keep alternate native credential paths, local runtime paths, or generic browser behavior.
- Removal/decommission: not applicable for existing code; obsolete candidates are rejected before implementation in the backward-compatibility log.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-IOS-001 | Primary End-to-End | iOS launch/manual/paste/share/QR input | `WKWebView` showing `/mobile` or native diagnostic | iOS App Shell Coordinator | Core setup/open path that makes iOS behavior equivalent to Android. |
| DS-IOS-002 | Primary End-to-End | `WKWebView` navigation request | in-WebView allow, external browser/app open, or native block diagnostic | iOS Web Containment owner | Prevents native wrapper from becoming a generic unsafe browser or opening desktop/admin paths in mobile WebView. |
| DS-IOS-003 | Primary End-to-End | User taps Scan QR | decoded QR text enters connection resolver or recoverable QR diagnostic appears | iOS QR Scan Coordinator | Mirrors Android app-owned QR scanning and camera permission behavior. |
| DS-IOS-004 | Primary End-to-End | iOS Simulator/API-E2E command | evidence for build, fake-node open, restore, diagnostics, signing readiness | iOS Validation Scripts | Makes the user's simulator-first and signing-discovery requirements executable. |
| DS-IOS-009 | Primary End-to-End | GitHub release tag/manual dispatch | simulator build artifact or signed `.ipa` uploaded to App Store Connect/TestFlight | iOS Release Workflow | Makes iOS release automation comparable to Android while guarding publishing on complete secrets. |
| DS-IOS-005 | Return-Event | `/rest/remote-access/status` response/error | reachable profile open or connection diagnostic | Connection Validator | Captures the validation return path that gates WebView opening. |
| DS-IOS-006 | Return-Event | `WKNavigationDelegate` failure/HTTP response | Web shell recovery overlay | Web Shell Host | Captures WebView failure diagnostics after the app is already in web mode. |
| DS-IOS-007 | Return-Event | Share extension receives text/URL | pending input consumed on next app activation | Share Intake owner | Provides safe iOS equivalent for Android text share without unsupported extension behavior. |
| DS-IOS-008 | Bounded Local | AVCapture metadata output loop | first QR code string or scanner cancellation | QR Scanner View Controller | Local scanner loop materially shapes QR behavior and simulator/device differences. |

## Primary Execution Spine(s)

- DS-IOS-001: `iOS App Launch/Input Surface -> App Shell Coordinator -> Connection Input Resolver -> Connection Validator -> Saved Node Store -> WKWebView Host -> Existing /mobile Web Shell`
- DS-IOS-002: `WKWebView Navigation Action -> Trusted Navigation Policy -> Web Containment Decision -> WKWebView/System Browser/Diagnostic Overlay`
- DS-IOS-003: `Connection Screen Scan Button -> Camera Permission Gate -> AVFoundation QR Scanner -> Decoded Text -> Connection Input Resolver`
- DS-IOS-004: `Simulator E2E Script -> XcodeGen/xcodebuild/simctl -> Fake AutoByteus Node -> App UI Test -> Evidence + Signing Readiness Report`
- DS-IOS-009: `Release Tag/Workflow Dispatch -> Release Metadata Resolver -> Bundle-ID/Version Build Settings -> Simulator Build/Test -> Secret Completeness Gate -> Archive/Export IPA -> App Store Connect/TestFlight Upload`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-IOS-001 | The app starts on the connection surface or with pending shared/QR text. The app shell resolves the input, validates Phone Access status, persists only the clean node profile, then opens the existing `/mobile` shell in a full-viewport `WKWebView`. | App Launch/Input Surface; App Shell Coordinator; Connection Input Resolver; Connection Validator; Saved Node Store; WKWebView Host; `/mobile` Shell | iOS App Shell Coordinator | URL/pairing parsing, HTTP acknowledgement, status diagnostics, saved profile JSON, pending shared input. |
| DS-IOS-002 | Every WebView navigation request is classified against the saved profile. Same-origin mobile/API/static paths stay in WebView; safe external links open outside; unsafe schemes or same-origin desktop/admin paths are blocked with diagnostics. | WKWebView Navigation Action; Trusted Navigation Policy; Web Containment Decision; WebView/System Browser/Diagnostic | iOS Web Containment owner | URL classification, external opener, overlay rendering, App Store/browser behavior guardrails. |
| DS-IOS-003 | QR scan begins from the connection screen. Camera permission is requested only for scanning. A camera-capable device decodes QR text and returns it to the same input resolver; denial/cancel/unavailable cases return recoverable diagnostics. | Scan Button; Camera Permission Gate; QR Scanner; Decoded Text; Connection Input Resolver | iOS QR Scan Coordinator | `NSCameraUsageDescription`, simulator no-camera behavior, capture-session lifecycle. |
| DS-IOS-004 | Validation scripts generate/build the Xcode project, run unit/UI/simulator checks against a fake node, capture screenshots/logs, and inspect local Apple signing assets without uploading. | Validation Script; Xcode Tooling; Simulator; Fake Node; App UI Test; Signing Readiness Report | iOS Validation Scripts | XcodeGen presence, device selection, evidence paths, certificate/profile parsing, non-secret logging. |
| DS-IOS-009 | GitHub Actions resolves release metadata once, deriving App Store-compatible iOS marketing/build versions separately from artifact/prerelease labels and using one bundle-ID authority for app/share targets. Build-only uploads simulator artifacts built with the same version/build/bundle settings without Apple distribution secrets. Publish-enabled first validates the exact iOS/App Store Connect secret set; if any input is missing it fails before keychain/profile/archive/upload while preserving build-only artifacts; if complete it imports signing material, archives/exports an IPA, and uploads to App Store Connect/TestFlight. | GitHub Workflow; Release Metadata Resolver; Bundle-ID Settings; Secret Gate; Xcode Archive; IPA Export; App Store Connect Upload | iOS Release Workflow | Numeric iOS marketing/build versions, artifact/prerelease labels, exact secret names, bundle-ID authority, extension-profile completeness, temporary keychain import, provisioning profile install/verification, upload auth, non-secret summaries. |
| DS-IOS-005 | Status validation returns success or failure. Success carries server name and Phone Access metadata to the app shell; failure maps to native connection diagnostics before WebView opens. | Status Response/Error; Connection Validator; Diagnostic Mapper; App Shell Coordinator | Connection Validator | URLSession timeout, JSON decoding, HTTP status mapping, TLS/network error mapping. |
| DS-IOS-006 | WebView load/navigation failures after open are mapped to overlay diagnostics with Retry/Edit/Open externally actions rather than leaving a raw browser error page. | WKWebView Failure; Diagnostic Mapper; Web Shell Host; Overlay Actions | Web Shell Host | Main-frame filtering, overlay view, retry target. |
| DS-IOS-007 | Shared text enters through an iOS-safe share intake path. Because share-extension direct app launching can be constrained, the extension stores pending input and clearly instructs the user; the app consumes it on activation. | Share Extension; Pending Input Store; App Activation; Connection Input Resolver | Share Intake owner | App Group entitlement, extension activation rule, extension-safe APIs. |

## Spine Actors / Main-Line Nodes

- iOS App Launch/Input Surface
- iOS App Shell Coordinator
- Connection Input Resolver
- Connection Validator
- Saved Node Store
- WKWebView Host
- Existing `/mobile` Web Shell
- Trusted Navigation Policy
- iOS QR Scan Coordinator
- iOS Validation Scripts
- iOS Release Workflow
- Share Intake owner

## Ownership Map

| Main-Line Node | Owns |
| --- | --- |
| iOS App Launch/Input Surface | App lifecycle entry, scene activation, initial saved/pending input decision, presentation of connection vs web shell. |
| iOS App Shell Coordinator | Sequencing across input resolution, validation, profile selection, WebView opening, and recovery transitions. This is the authoritative app-level owner. |
| Connection Input Resolver | One input contract for manual, paste, QR, and shared text; HTTP acknowledgement gate. |
| Connection Validator | `/rest/remote-access/status` call, timeout, JSON status parse, validation result/diagnostic mapping. |
| Saved Node Store | Native saved-node profile metadata only; selected profile identity; no mobile credentials. |
| WKWebView Host | WebView configuration, load lifecycle, failure callbacks, full-viewport rendering, recovery overlay. |
| Existing `/mobile` Web Shell | Product UI and mobile credential storage in WebView-local web storage. It remains outside native iOS ownership. |
| Trusted Navigation Policy | Pure URL classification for in-WebView vs external vs blocked navigation. |
| iOS QR Scan Coordinator | Camera permission state, capture-session lifecycle, QR decode/cancel/unavailable diagnostics. |
| iOS Validation Scripts | Build/test/simulator orchestration, fake server lifecycle, evidence capture, signing-readiness inspection. |
| iOS Release Workflow | GitHub-hosted build-only and publish paths, release metadata split between App Store-compatible iOS version fields and artifact/prerelease labels, bundle-ID build-setting authority, secret completeness checks, iOS signing import, `.ipa` export, App Store Connect/TestFlight upload when configured. |
| Share Intake owner | Extension-safe extraction and pending handoff of shared text/URL/pairing payload. |

The public app target is a real governing owner for lifecycle and shell sequencing. The Foundation-only core target is not a coordinator; it owns reusable pure policies used by app, tests, and share extension.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AppDelegate` / `SceneDelegate` | `AppShellCoordinator` | UIKit app/scene entrypoints required by iOS. | Input parsing, validation policy, WebView navigation decisions. |
| Share Extension view/controller | Share Intake owner + `PendingSharedInputStore` | iOS share-sheet entrypoint for shared text/URLs. | Direct validation/open sequencing, credential storage, unsupported containing-app launch hacks. |
| Xcode scheme/script entrypoints | iOS Validation Scripts | CLI-accessible build/test/readiness. | App runtime logic or signing secrets. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| No existing iOS legacy path | No iOS code exists. | N/A | N/A | Addition-only. |
| Any proposed native iOS credential bridge | Would duplicate `/mobile` credential ownership and increase mobile secret custody. | Existing `/mobile` web shell `localStorage` MVP ownership. | In This Change | Reject before implementation. |
| Any proposed local AutoByteus runtime inside iOS app | Contradicts Android wrapper product model. | Remote AutoByteus node + `/mobile` shell. | In This Change | Reject before implementation. |
| Generic unrestricted browser behavior | Would bypass trusted mobile-origin containment. | `TrustedNavigationPolicy` + external opener. | In This Change | Reject before implementation. |

## Return Or Event Spine(s) (If Applicable)

- DS-IOS-005: `URLSession status response/error -> ConnectionValidator -> ConnectionDiagnosticMapper -> AppShellCoordinator open profile or render connection diagnostic`
- DS-IOS-006: `WKWebView main-frame load failure/HTTP failure -> WebShellHost -> ConnectionDiagnosticMapper -> Recovery overlay`
- DS-IOS-007: `Share extension input item -> PendingSharedInputStore -> App activation -> AppShellCoordinator -> ConnectionInputResolver`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: iOS QR Scan Coordinator
  - Chain: `AVCaptureSession start -> AVCaptureMetadataOutputObjectsDelegate callback -> first QR payload -> stop session -> dismiss scanner -> onQrText`
  - Why it matters: Scanner lifecycle must stop after a result/cancel and simulator no-camera must return a native diagnostic.
- Parent owner: iOS Validation Scripts
  - Chain: `start fake node -> build/test app -> boot simulator -> run UI test -> collect screenshots/logs -> stop fake node`
  - Why it matters: E2E must be repeatable and leave evidence.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| URL normalization | DS-IOS-001, DS-IOS-005 | Connection Input Resolver / Validator | Convert accepted URL shapes into base/mobile/status URLs. | Same input can arrive through manual, paste, share, QR, or saved profile. | App shell would duplicate URL parsing and drift. |
| Pairing payload parsing | DS-IOS-001, DS-IOS-007 | Connection Input Resolver | Parse URL/query, JSON, and base64url pairing payloads. | QR/share/manual inputs include one-time pairing payloads. | QR/share paths would behave differently. |
| Diagnostic mapping | DS-IOS-001, DS-IOS-003, DS-IOS-005, DS-IOS-006 | App Shell / Web Shell / QR | Produce user-facing recovery copy from failure categories. | Keeps native recovery consistent. | Raw framework errors would leak into UI. |
| Saved-node serialization | DS-IOS-001, DS-IOS-003 | Saved Node Store | Encode/decode profile metadata and selected ID. | Restore is native wrapper responsibility. | Credential/data model looseness or duplicate stores. |
| Pending shared input | DS-IOS-007 | Share Intake / App Shell | Safely bridge share extension text to app activation. | iOS extension rules may prevent direct app open. | Unsupported extension hacks or lost shared payloads. |
| App icon/assets | DS-IOS-001 | iOS app target | Provide launcher/App Store icon set. | App must look native and brand-consistent. | Mixed asset generation inside build scripts. |
| Signing readiness | DS-IOS-004 | Validation Scripts | Inspect local Xcode/certs/profiles/team without secrets and classify development vs App Store archive readiness. | User specifically requested Apple certificate discovery. | App implementation would become blocked on unknown credentials or would conflate local development signing with CI distribution signing. |
| GitHub iOS release automation | DS-IOS-009 | iOS Release Workflow | Resolve release metadata; build/test on macOS runner with resolved iOS marketing/build/bundle settings; conditionally archive/export/upload with iOS secrets. | iOS app should be releasable like Android while satisfying Apple bundle-version constraints. | Manual-only release path, accidental use of macOS desktop signing, invalid prerelease suffix in `CFBundleShortVersionString`, or divergent bundle-ID authorities. |
| Documentation | DS-IOS-004 | Delivery/Users/API-E2E | Build, validation, live-node and review guidance. | Native mobile setup is operationally sensitive. | Future validation would rediscover constraints. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Native mobile wrapper behavior | `autobyteus-android` as behavior reference | Create New sibling | iOS requires Swift/Xcode/iOS APIs; Android code cannot be reused directly. | Android project is Kotlin/Gradle and platform-specific. |
| Product mobile UI | `autobyteus-web` `/mobile` shell | Reuse | Existing shell owns Home/Chat/Runs/Files/Activity. | N/A |
| Phone Access status/pairing | `autobyteus-server-ts` remote access routes/services | Reuse | Backend owns route contract and credentials. | N/A |
| Native wrapper URL/pairing policy | Android `connection/*.kt` examples | Extend by mirrored Swift tests/docs, not code reuse | Cross-language code reuse would over-scope. | N/A |
| Build/release docs | Existing Android docs/release sections | Extend | iOS should be documented beside Android. | N/A |
| E2E validation | Android live-smoke pattern | Extend | iOS needs simulator smoke/readiness scripts. | N/A |
| Release workflow | Existing Android and desktop release workflows | Extend | iOS should have analogous tag/manual-dispatch workflow with build-only and guarded publish paths. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| iOS Core Wrapper Policy | URL normalization, pairing parser, diagnostics, saved profile model/coding, navigation classification, pending input model, validation result types | DS-IOS-001, 002, 005, 007 | App Shell, Web Containment, Share Intake | Create New | Foundation-only and extension-safe where shared with extension. |
| iOS App Shell | UIKit app lifecycle, connection screen, app shell coordinator, WebView screen, QR presentation, external actions | DS-IOS-001, 003, 006 | iOS App Shell Coordinator | Create New | Depends on core; owns platform UI/API integration. |
| iOS Web Containment | `WKWebView` configuration/delegate, load lifecycle, overlay recovery | DS-IOS-002, 006 | WKWebView Host | Create New | Depends on core navigation policy. |
| iOS QR Scanner | Camera permission, AVFoundation scanning, scanner UI, simulator/device diagnostics | DS-IOS-003, 008 | QR Scan Coordinator | Create New | No third-party scanner dependency required. |
| iOS Share Intake | Share extension target, extension activation, pending input handoff | DS-IOS-007 | Share Intake owner | Create New | Use App Group if implemented; avoid unsupported APIs. |
| iOS Validation Tooling | Project generation, build/test, simulator smoke, fake server, signing-readiness script | DS-IOS-004 | Validation Scripts | Create New | Follow Android live-smoke evidence style. |
| iOS Release Automation | GitHub Actions build-only and publish jobs, release metadata model, bundle-ID authority, secret gate, archive/export/upload, artifact naming | DS-IOS-009 | iOS Release Workflow | Create New | Follow Android release workflow shape but use iOS-specific signing/App Store Connect credentials and Apple-compatible numeric bundle versions. |
| Existing Mobile Web Shell | Product UI, pairing bootstrap, credential storage | DS-IOS-001, 002, 006 | `/mobile` Shell | Reuse | No native product UI duplication. |
| Existing Backend Remote Access | Status route, pairing sessions, credentials, revocation | DS-IOS-005 | Connection Validator/Web Shell | Reuse | iOS native calls status only. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `AutoByteusMobileCore/ConnectionDiagnostic.swift` | iOS Core Wrapper Policy | Diagnostic mapper | Failure kind and user-facing recovery copy. | Mirrors one Android concern. | Yes, failure kind enum. |
| `AutoByteusMobileCore/NodeURLNormalizer.swift` | iOS Core Wrapper Policy | URL normalizer | Accepted URL shapes -> normalized URLs. | Pure deterministic parser. | Yes, `NormalizedNodeURL`. |
| `AutoByteusMobileCore/PairingLinkParser.swift` | iOS Core Wrapper Policy | Pairing parser | URL/JSON/base64 payload parsing. | Separate from generic URL normalization. | Yes, `PairingPayload`, `ParsedPairingInput`. |
| `AutoByteusMobileCore/SavedNodeProfile.swift` | iOS Core Wrapper Policy | Saved profile model | Profile identity and origin derivation. | One domain data structure. | Yes. |
| `AutoByteusMobileCore/SavedNodeStore.swift` | iOS Core Wrapper Policy | Saved profile persistence | UserDefaults/App Group JSON store. | Persistence boundary for profile metadata. | Yes. |
| `AutoByteusMobileCore/ConnectionInputResolver.swift` | iOS Core Wrapper Policy | Input resolver | One resolver for manual/paste/QR/share. | Owns sequencing between parser and HTTP ack. | Yes. |
| `AutoByteusMobileCore/ConnectionValidator.swift` | iOS Core Wrapper Policy | Status validator | URLSession status request and response mapping. | Network validation boundary. | Yes, diagnostics/status. |
| `AutoByteusMobileCore/TrustedNavigationPolicy.swift` | iOS Core Wrapper Policy | Navigation classifier | Classifies URLs without WebKit dependency. | Pure policy used by WebView host tests. | Yes. |
| `AutoByteusMobileCore/PendingSharedInputStore.swift` | iOS Core Wrapper Policy | Share handoff store | Store/consume shared text. | Keeps extension/app handoff isolated. | Yes. |
| `AutoByteusMobile/AppShellCoordinator.swift` | iOS App Shell | App shell governing owner | Coordinates launch, input, validation, profile save, WebView open. | One app-level sequencing owner. | Uses core. |
| `AutoByteusMobile/ConnectionViewController.swift` | iOS App Shell | Connection UI | Saved profiles, input, paste, HTTP ack, QR, Tailscale guidance. | One UIKit screen. | Uses core models/diagnostics. |
| `AutoByteusMobile/WebShellViewController.swift` | iOS Web Containment | Web shell UI owner | Hosts WKWebView and overlay. | One screen wrapper. | Uses diagnostics. |
| `AutoByteusMobile/AutoByteusWebViewController.swift` | iOS Web Containment | WebView host | WKWebView config/delegate/load lifecycle. | WebKit-specific owner. | Uses navigation policy. |
| `AutoByteusMobile/QRCodeScannerViewController.swift` | iOS QR Scanner | QR scanner | Camera permission/capture/metadata. | AVFoundation-specific owner. | Uses diagnostics callback. |
| `AutoByteusMobile/ExternalActions.swift` | iOS App Shell | External action adapter | Open Tailscale/App Store/Safari/settings. | Platform action boundary. | No. |
| `AutoByteusMobileShareExtension/ShareViewController.swift` | iOS Share Intake | Share extension UI | Extract shared text, store pending input, guide user. | Extension-specific owner. | Uses core pending store/parser validation only. |
| `scripts/ios-simulator-smoke.sh` | iOS Validation Tooling | Simulator E2E owner | Build/test/fake server/UI smoke/evidence. | Script orchestration. | No. |
| `scripts/ios-signing-readiness.sh` | iOS Validation Tooling | Signing readiness owner | Inspect Xcode/certs/profiles/team/archive. | Separate from smoke script. | No. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Saved node metadata | `SavedNodeProfile.swift` | iOS Core Wrapper Policy | Used by resolver, store, validator, navigation policy, UI. | Yes | Yes | Credential/session model. |
| Normalized URL parts | `NodeURLNormalizer.swift` | iOS Core Wrapper Policy | Used by validator and profile creation. | Yes | Yes | Generic URL helper for unrelated app links. |
| Pairing payload/input | `PairingLinkParser.swift` | iOS Core Wrapper Policy | Used by manual/QR/share. | Yes | Yes | Backend credential exchange owner. |
| Failure kinds/diagnostics | `ConnectionDiagnostic.swift` | iOS Core Wrapper Policy | Used across connection, QR, WebView. | Yes | Yes | Raw error dumping layer. |
| Navigation decision | `TrustedNavigationPolicy.swift` | iOS Core Wrapper Policy | Used by WebView and tests. | Yes | Yes | General browser policy. |
| Pending shared input | `PendingSharedInputStore.swift` | iOS Core Wrapper Policy | Used by app and share extension. | Yes | Yes | Multi-purpose app state store. |
| iOS release metadata | `.github/workflows/release-ios.yml` metadata resolver or dedicated script if extracted | iOS Release Automation | Used by build-only, publish gate, archive, artifact naming, and summaries. | Yes | Yes | One ambiguous `version_name` that mixes artifact, prerelease, and iOS bundle-version meanings. |
| iOS app/share bundle IDs | `autobyteus-ios/project.yml` build settings plus workflow variables | iOS Release Automation / Xcode project definition | Used by generated target identifiers, profile verification, export mapping, build/test/smoke, and archive. | Yes | Yes | Parallel hard-coded bundle IDs in project and workflow. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `SavedNodeProfile` | Yes | Yes | Low | Keep `baseUrl`, `mobileUrl`, `scheme`, `host`, `port`, timestamps, HTTP ack; do not add credentials. |
| `NormalizedNodeURL` | Yes | Yes | Low | Keep derived URLs only; do not include display/session fields. |
| `PairingPayload` | Yes | Yes | Low | Match backend payload fields needed for URL construction; do not include credential. |
| `ConnectionDiagnostic` | Yes | Yes | Low | Keep kind/title/message/recovery action. |
| `NavigationDecision` | Yes | Yes | Low | Keep type/reason; avoid WebKit-specific types in core. |
| `PendingSharedInput` | Yes | Yes | Medium | Store only raw text and timestamp/source; consume once to avoid stale hidden behavior. |
| DS-IOS-009 release metadata fields | Yes | Yes | Medium | Keep `ios_marketing_version` (numeric App Store bundle version), `artifact_version` (may include prerelease suffix), `prerelease_label`, and `build_number` separate; reject ambiguous `version_name`. |
| DS-IOS-009 app/share bundle ID settings | Yes | Yes | Medium | `IOS_BUNDLE_ID` and `IOS_SHARE_EXTENSION_BUNDLE_ID` are the single source for target identifiers, profile checks, export map, and summaries. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ios/project.yml` | iOS Validation Tooling / iOS Release Automation | Xcode project definition | XcodeGen targets, settings, schemes, dependencies, default app/share bundle-ID build settings. | Project generation source of truth and Xcode side of the bundle-ID authority. | N/A |
| `autobyteus-ios/README.md` | Documentation | iOS wrapper guide | Build, test, validation, signing, live-node setup. | Local project doc. | N/A |
| `autobyteus-ios/AutoByteusMobileCore/ConnectionDiagnostic.swift` | iOS Core Wrapper Policy | Diagnostic mapper | Failure enum + diagnostic text factories. | Pure policy. | Yes |
| `autobyteus-ios/AutoByteusMobileCore/NodeURLNormalizer.swift` | iOS Core Wrapper Policy | URL normalizer | Normalize URL input. | Pure policy. | Yes |
| `autobyteus-ios/AutoByteusMobileCore/PairingLinkParser.swift` | iOS Core Wrapper Policy | Pairing parser | Parse pairing URLs/payloads. | Pure policy. | Yes |
| `autobyteus-ios/AutoByteusMobileCore/SavedNodeProfile.swift` | iOS Core Wrapper Policy | Saved profile model | Profile identity/origin. | Domain model. | Yes |
| `autobyteus-ios/AutoByteusMobileCore/SavedNodeStore.swift` | iOS Core Wrapper Policy | Profile persistence | Load/save/select/remove/clear profile metadata. | Persistence boundary. | Yes |
| `autobyteus-ios/AutoByteusMobileCore/ConnectionInputResolver.swift` | iOS Core Wrapper Policy | Input resolver | Parse input + HTTP ack gate. | One sequencing policy. | Yes |
| `autobyteus-ios/AutoByteusMobileCore/ConnectionValidator.swift` | iOS Core Wrapper Policy | Status validator | Async status GET + JSON mapping. | Network validation boundary. | Yes |
| `autobyteus-ios/AutoByteusMobileCore/TrustedNavigationPolicy.swift` | iOS Core Wrapper Policy | Navigation classifier | Allow/external/block decisions. | WebKit-independent policy. | Yes |
| `autobyteus-ios/AutoByteusMobileCore/PendingSharedInputStore.swift` | iOS Core Wrapper Policy | Share handoff store | Store/consume pending share text. | App/extension shared boundary. | Yes |
| `autobyteus-ios/AutoByteusMobile/AppDelegate.swift` | iOS App Shell | Thin UIKit entry | App delegate bootstrap. | Required platform entry. | No |
| `autobyteus-ios/AutoByteusMobile/SceneDelegate.swift` | iOS App Shell | Thin scene entry | Scene root and URL activation forwarding. | Required platform entry. | No |
| `autobyteus-ios/AutoByteusMobile/AppShellCoordinator.swift` | iOS App Shell | Governing owner | Screen transitions and setup/open sequencing. | Single app shell owner. | Yes |
| `autobyteus-ios/AutoByteusMobile/ConnectionViewController.swift` | iOS App Shell | Connection UI | Saved nodes/input/actions/diagnostics. | One screen. | Yes |
| `autobyteus-ios/AutoByteusMobile/WebShellViewController.swift` | iOS Web Containment | Web shell screen | Full-screen WebView + overlay actions. | One screen. | Yes |
| `autobyteus-ios/AutoByteusMobile/AutoByteusWebViewController.swift` | iOS Web Containment | WebView host | WKWebView config/delegate/load callbacks. | WebKit-specific owner. | Yes |
| `autobyteus-ios/AutoByteusMobile/QRCodeScannerViewController.swift` | iOS QR Scanner | QR scanner | Camera permission/capture/QR decode. | AVFoundation-specific owner. | Yes diagnostics callback. |
| `autobyteus-ios/AutoByteusMobile/ExternalActions.swift` | iOS App Shell | External action adapter | Safari, Settings, Tailscale URL/App Store. | Platform-specific boundary. | No |
| `autobyteus-ios/AutoByteusMobile/Info.plist` | iOS App Shell | App metadata/privacy | Bundle, URL scheme, camera/local-network/ATS purpose strings. | App target metadata. | N/A |
| `autobyteus-ios/AutoByteusMobile/AutoByteusMobile.entitlements` | iOS Share Intake/App Shell | App entitlements | App group if share extension is included. | Signing capability boundary. | N/A |
| `autobyteus-ios/AutoByteusMobile/Assets.xcassets/AppIcon.appiconset/*` | iOS App Shell | App icon assets | iOS launcher icon. | Resource boundary. | N/A |
| `autobyteus-ios/AutoByteusMobileShareExtension/ShareViewController.swift` | iOS Share Intake | Share extension | Extract text/URL, store pending input, show guidance. | Extension-specific UI. | Yes |
| `autobyteus-ios/AutoByteusMobileShareExtension/Info.plist` | iOS Share Intake | Extension metadata | Activation rules for text/URL. | Extension metadata. | N/A |
| `autobyteus-ios/AutoByteusMobileShareExtension/AutoByteusMobileShareExtension.entitlements` | iOS Share Intake | Extension entitlements | App group. | Signing capability boundary. | N/A |
| `autobyteus-ios/AutoByteusMobileCoreTests/*.swift` | iOS Validation Tooling | Unit tests | Core policy parity tests. | Test boundary. | Yes |
| `autobyteus-ios/AutoByteusMobileUITests/*.swift` | iOS Validation Tooling | UI tests | Simulator fake-node smoke. | E2E/UI boundary. | Yes via app behavior. |
| `autobyteus-ios/scripts/fake-mobile-server.py` | iOS Validation Tooling | Fake node | Status/mobile HTML fixture for simulator. | Test server. | N/A |
| `autobyteus-ios/scripts/ios-simulator-smoke.sh` | iOS Validation Tooling | Simulator smoke | Generate/build/test/run evidence. | Script owner. | N/A |
| `autobyteus-ios/scripts/ios-signing-readiness.sh` | iOS Validation Tooling | Signing readiness | Inspect Xcode/certs/profiles/archive capability. | Script owner. | N/A |
| `docs/ios_mobile_access.md` | Documentation | iOS mobile access guide | iOS setup/live validation/signing/CI guidance. | Durable docs. | N/A |
| `.github/workflows/release-ios.yml` | iOS Release Automation | GitHub Actions iOS release | Tag/manual build-only workflow plus guarded App Store Connect/TestFlight publish workflow with exact inputs/secrets, numeric iOS version derivation, bundle-ID build settings, temp keychain/profile handling, archive/export/upload, artifacts, and non-secret summaries. | Sibling to Android release workflow. | Secret values, local-only Xcode session assumptions, macOS Developer ID signing reuse, prerelease suffixes in iOS bundle version fields, hard-coded app/share target bundle IDs that diverge from workflow variables, development-profile App Store archives, skipped extension profiles. |

## Ownership Boundaries

- `AutoByteusMobileCore` is the authoritative boundary for pure native-wrapper policies shared by app, tests, and extension. It must remain Foundation-only and must not import `UIKit`, `WebKit`, or `AVFoundation` except in app-only files.
- `AppShellCoordinator` is the authoritative runtime owner for app shell sequencing. UIKit entry delegates must forward to it rather than duplicating validation/open logic.
- `QRCodeScannerViewController` owns camera/capture lifecycle only. It must emit decoded text or diagnostics back to the app shell; it must not save profiles or open WebView itself.
- `AutoByteusWebViewController` owns WebKit integration and must call `TrustedNavigationPolicy` rather than duplicating URL rules.
- `SavedNodeStore` owns native profile metadata only; the `/mobile` shell remains credential owner through WebView storage.
- Share extension owns extraction and pending handoff only. It must not validate/open nodes or use unsupported extension APIs to force-launch the app.
- Validation scripts own local evidence and signing inspection only. They must not embed secrets, upload builds, or mutate Apple Developer portal/App Store Connect state.
- The iOS Release Workflow, not validation scripts or local Xcode sessions, owns CI build-only release evidence and archive/export/upload. It must depend only on GitHub event/input metadata plus explicit iOS/App Store Connect secrets, derive numeric iOS version/build settings before any build path, drive app/share bundle IDs from one authority, and fail before archive/upload if any required publish input is missing.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ConnectionInputResolver` | Pairing parser, URL normalizer, HTTP acknowledgement gate | Connection UI, QR scanner callback, share pending consumer | UI directly parsing URLs and then separately applying HTTP ack | Add an explicit resolver result or parser method. |
| `ConnectionValidator` | URLSession status GET, JSON status decoding, HTTP/error mapping | App Shell Coordinator | App shell directly calling `/status` and mapping HTTP statuses | Add validator methods/result fields. |
| `SavedNodeStore` | UserDefaults/App Group profile JSON and selected ID | App Shell, Connection UI | UI reading raw UserDefaults keys | Add load/save/select/remove APIs. |
| `TrustedNavigationPolicy` | Same-origin/path/scheme classification | WebView delegate | WebView delegate comparing host/path inline | Add policy cases/tests. |
| `QRCodeScannerViewController` | Camera permission and capture-session loop | App Shell / Connection UI | App shell managing AVCaptureSession directly | Add scanner callbacks/config. |
| `PendingSharedInputStore` | Shared input persistence/consume-once | Share extension and app activation | Share extension writing arbitrary app state keys | Add store methods or data shape. |
| `/mobile` Web Shell | Mobile product UI and credential storage | Native iOS wrapper and Android wrapper | Native iOS storing mobile credentials or implementing chat/run APIs | Add mobile-web/backend capabilities instead. |
| iOS Release Workflow | Release metadata resolver (`release_tag`, `semantic_version_core`, `prerelease_label`, `ios_marketing_version`, `artifact_version`, `build_number`), bundle-ID build settings, build-only artifact path, secret completeness gate, temporary keychain, provisioning profile verification, ExportOptions/profile mapping, archive/export, App Store Connect uploader, sanitized summaries | GitHub tag pushes, workflow-dispatch callers, delivery/release docs, generated Xcode project build settings | Workflow callers invoking ad hoc shell uploads, assuming local Xcode account state, reusing macOS `APPLE_*`/Developer ID secrets, passing prerelease text into `MARKETING_VERSION`, reading bundle IDs from both workflow variables and hard-coded project targets, or bypassing extension-profile completeness | Extend the workflow contract with explicit metadata, input/secret/profile, and build-setting fields before adding new release behavior. |

## Dependency Rules

Allowed:

- App target may depend on `AutoByteusMobileCore`, `UIKit`, `WebKit`, `AVFoundation`, and system external-open APIs.
- Share extension may depend on `AutoByteusMobileCore` and extension-safe iOS APIs for extracting shared text and displaying extension UI.
- Unit tests may depend on core.
- UI tests may depend only on app-visible behavior and test server inputs.
- Validation scripts may call XcodeGen, `xcodebuild`, `xcrun simctl`, `security`, `plutil`, `shasum`, and local Python scripts.
- The iOS release workflow may call GitHub Actions primitives, XcodeGen, `xcodebuild`, `xcrun simctl`, `security`, `plutil`/`PlistBuddy`, `shasum`, local metadata/profile verification scripts, and `xcrun altool` for App Store Connect upload. The upload command is `xcrun altool --upload-app --type ios --file <ipa> --apiKey <key-id> --apiIssuer <issuer-id>`. If the runner's Xcode lacks `altool`, the publish job must fail before upload with an explicit `upload_cli_unavailable` diagnostic and require a reviewed workflow update rather than silently switching upload tools.

Forbidden:

- Core target must not depend on app UI, WebKit, QR scanner, validation scripts, backend source files, or Android code.
- App UI must not bypass `ConnectionInputResolver`, `ConnectionValidator`, `SavedNodeStore`, or `TrustedNavigationPolicy`.
- Native iOS code must not call pairing-exchange/protected mobile APIs directly or store `mra_...` credentials.
- WebView delegate must not allow arbitrary same-origin desktop paths like `/workspace` or unsafe schemes.
- Share extension must not use private/unsupported APIs to force-open the containing app.
- Signing-readiness scripts must not print certificate private keys, provisioning secrets, App Store API keys, or Apple account credentials.
- The iOS release workflow must not assume the user's local Xcode login/session on a GitHub-hosted runner.
- The iOS release workflow must not use macOS `Developer ID Application` signing or fall back to existing desktop `APPLE_*` secrets for iOS publish.
- The iOS release workflow must not archive for App Store with an `Apple Development` identity, wildcard development profile, or any profile whose `get-task-allow` entitlement is true.
- The iOS release workflow must not pass semantic prerelease suffixes such as `-rc1` into `MARKETING_VERSION` / `CFBundleShortVersionString`; prerelease text is artifact/TestFlight-note metadata only.
- The iOS release workflow must not keep hard-coded app/share `PRODUCT_BUNDLE_IDENTIFIER` values that diverge from `IOS_BUNDLE_ID` and `IOS_SHARE_EXTENSION_BUNDLE_ID`; profile verification/export and generated target IDs must use one authority.
- The iOS release workflow must not print decoded P12/profile/API-key contents, passwords, private keys, or full provisioning-profile XML.
- The iOS release workflow must not include a Share Extension target in the archive unless a matching App Store provisioning profile secret for that extension is present and verified.
- The iOS release workflow must not submit the build for final App Store review/public release automatically; upload to App Store Connect/TestFlight is the in-scope publish boundary.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `NodeURLNormalizer.normalize(_ rawInput: String)` | Node URL | Derive normalized base/mobile/status URLs. | Raw user/QR/share text containing URL. | Throws/returns typed URL normalization failure. |
| `PairingLinkParser.parse(_ rawText: String)` | Pairing input | Parse URL, JSON, base64url pairing payload. | Raw user/QR/share text. | Returns clean profile and WebView initial URL. |
| `ConnectionInputResolver.resolve(rawText:httpAcknowledged:)` | Connection input | One input path for manual/paste/QR/share. | Raw text + explicit HTTP ack boolean. | Returns success profile/webViewUrl or diagnostic. |
| `ConnectionValidator.validate(profile:)` | Remote access status | Determine reachability/Phone Access state. | `SavedNodeProfile` or base URL. | Native app calls public status only. |
| `SavedNodeStore.loadProfiles/loadSelected/save/remove/select/clear` | Saved node profile metadata | Persist and select profiles. | Profile ID/origin. | No credential fields. |
| `TrustedNavigationPolicy.classify(targetURL:profile:)` | WebView navigation target | Decide allow/external/block. | Absolute URL + saved profile. | WebKit-independent return type. |
| `AppShellCoordinator.submitInput(_:httpAcknowledged:)` | App shell sequencing | Resolve/validate/open or diagnose. | Raw text. | Main app authority. |
| `QRCodeScannerViewController` callbacks | QR scan result | Return decoded text or diagnostic. | Raw decoded QR string. | No direct save/open. |
| `PendingSharedInputStore.store/consume` | Shared input handoff | Persist/consume pending share text. | Raw text + timestamp/source. | Consume once. |
| `ios-simulator-smoke.sh` | Simulator validation | Build/test/fake-node evidence. | Optional simulator name/evidence dir. | Non-publishing. |
| `ios-signing-readiness.sh` | Signing readiness | Inspect Xcode/signing/profile/archive readiness. | Bundle ID, optional team ID. | Non-secret, optional archive; no upload. |
| `.github/workflows/release-ios.yml` inputs/secrets/settings | iOS CI release | Resolve release metadata, iOS marketing/build version fields, build-only behavior, bundle-ID settings, publish request, required secret completeness, signing/profile mapping, and upload auth. | GitHub event (`push` tag `v*` or `workflow_dispatch`), workflow inputs, named GitHub secrets/vars, generated Xcode build settings. | Exact contract defined in DS-IOS-009 section below. |

Rule compliance: interfaces are split by subject. No generic `handleEverything(id:)` or mixed node/session credential method is introduced.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `NodeURLNormalizer.normalize` | Yes | Yes, raw URL text | Low | None. |
| `PairingLinkParser.parse` | Yes | Yes, raw pairing text | Low | None. |
| `ConnectionInputResolver.resolve` | Yes | Yes, raw text + HTTP ack | Low | None. |
| `ConnectionValidator.validate` | Yes | Yes, profile/base URL | Low | None. |
| `SavedNodeStore` methods | Yes | Yes, profile ID/origin | Low | None. |
| `TrustedNavigationPolicy.classify` | Yes | Yes, target URL + profile | Low | None. |
| `PendingSharedInputStore` | Yes | Yes, raw pending input | Medium | Keep consume-once semantics and timestamp. |
| `.github/workflows/release-ios.yml` release contract | Yes | Yes, tag/dispatch inputs, exact secret names, and explicit bundle/version build settings | Medium | Keep build-only, publish-gate, App Store-compatible versioning, and bundle-ID authority semantics explicit; if a new release mode is needed, add a named input/secret/setting instead of implicit shell behavior. |


## iOS Release Workflow Contract (DS-IOS-009)

The iOS workflow is a first-class owner with a strict boundary. It must be implemented as `.github/workflows/release-ios.yml` and must not depend on local developer machine state.

### Trigger And Input Contract

| Trigger / Input | Required? | Meaning / Default | Publish Semantics |
| --- | --- | --- | --- |
| `push` tag `v*` | Yes, workflow trigger | Release tag source; `release_tag = github.ref_name`; `release_ref = github.sha`. | `publish_requested=true`; build-only still runs first, then publish gate decides whether archive/upload can proceed. |
| `workflow_dispatch.publish_app_store_connect` | Required input, default `false` | Manual opt-in for publish. | `false` means build-only only; `true` means run publish gate and fail fast if required inputs/secrets are missing. |
| `workflow_dispatch.release_tag` | Optional normally; required when manual publish is true | Semantic release tag such as `v1.2.3` or `v1.2.3-rc1`; used for release/artifact metadata. | Manual publish without this value must fail before archive/upload. Prerelease suffixes are allowed only outside iOS bundle version fields. |
| `workflow_dispatch.release_ref` | Optional | Git ref/SHA to checkout; defaults to `release_tag` when set, otherwise the workflow branch/ref. | Does not imply publish by itself. |
| `workflow_dispatch.prerelease` | Optional boolean, default `true` for manual publish notes | Controls GitHub summary/TestFlight note wording only. | Must not submit for public App Store review or bypass Apple release gates. |

Release metadata must be resolved once by the workflow before build-only, secret-gate, archive, or upload jobs. The metadata owner must output these separate fields:

| Field | Rule | Example for `v1.2.7-rc1` | Consumers |
| --- | --- | --- | --- |
| `release_tag` | Original tag, including leading `v` and optional prerelease suffix. | `v1.2.7-rc1` | Checkout/ref summaries, release notes. |
| `semantic_version_core` | Numeric semantic core captured from the tag. Must match `^[0-9]+\.[0-9]+\.[0-9]+$`. | `1.2.7` | Source for iOS marketing version. |
| `prerelease_label` | Optional suffix after the first hyphen, without the hyphen. Empty for stable tags. | `rc1` | GitHub summary/TestFlight notes only. |
| `ios_marketing_version` | Exactly `semantic_version_core`; this is the only value allowed for `MARKETING_VERSION` / `CFBundleShortVersionString`. It must be three period-separated integers and must contain only digits and periods. | `1.2.7` | Simulator build/test/smoke, archive, docs, summaries. |
| `artifact_version` | Tag without leading `v`, retaining prerelease suffix when present; for no-tag build-only runs use `ci-${GITHUB_RUN_NUMBER}`. | `1.2.7-rc1` | Artifact names and human summaries; never `MARKETING_VERSION`. |
| `build_number` | `GITHUB_RUN_NUMBER` by default unless a later reviewed numeric source is added. Must match `^[0-9]+$` for this workflow. | `1234` | `CURRENT_PROJECT_VERSION` / `CFBundleVersion` for simulator build/test/smoke and archive. |
| `prerelease` | True when `prerelease_label` is non-empty or manual input requests prerelease notes. | `true` | Summary/TestFlight note wording only. |

Build-only runs without a release tag use `ios_marketing_version=0.1.0` unless a reviewed default marketing-version variable is added. Even for no-tag build-only runs, the built simulator app and tests must receive the resolved `ios_marketing_version` and numeric `build_number`; artifact names may still use `ci-${GITHUB_RUN_NUMBER}`. Summary fields must include `release_tag`, `release_ref`, checked-out commit SHA, `publish_requested`, `ios_marketing_version`, `artifact_version`, `build_number`, bundle IDs, and extension enabled/present flag.

### Required Publish Secrets And Configuration

Publish requires all of the following secrets to be non-empty before any keychain/profile/archive/upload step runs:

| Secret | Required When | Purpose |
| --- | --- | --- |
| `IOS_DISTRIBUTION_CERTIFICATE_P12_BASE64` | Any publish | Base64 P12 containing an Apple/iOS Distribution signing identity. |
| `IOS_DISTRIBUTION_CERTIFICATE_P12_PASSWORD` | Any publish | P12 password. |
| `IOS_APPSTORE_PROVISIONING_PROFILE_BASE64` | Any publish | App Store provisioning profile for the main app bundle ID. |
| `IOS_DEVELOPMENT_TEAM` | Any publish | Apple team ID, expected to match profile `TeamIdentifier` and signing identity team. Current local development evidence points to `7Y86YBQ7B4`, but CI must read the configured secret. |
| `APP_STORE_CONNECT_KEY_ID` | Any publish | App Store Connect API key ID for upload authentication. |
| `APP_STORE_CONNECT_ISSUER_ID` | Any publish | App Store Connect issuer ID. |
| `APP_STORE_CONNECT_API_KEY_P8_BASE64` | Any publish | Base64 `.p8` API private key for non-interactive upload. |
| `IOS_SHARE_EXTENSION_APPSTORE_PROVISIONING_PROFILE_BASE64` | Publish when the Share Extension target exists in the archive | App Store provisioning profile for the extension bundle ID. |

Non-secret configuration may be repository variables or workflow environment defaults, but app/share bundle IDs have exactly one authority:

- `IOS_BUNDLE_ID`, default `org.autobyteus.mobile`, is the main app bundle ID authority. `autobyteus-ios/project.yml` must define this as a build setting default and set the app target `PRODUCT_BUNDLE_IDENTIFIER` to `$(IOS_BUNDLE_ID)` rather than a separate literal.
- `IOS_SHARE_EXTENSION_BUNDLE_ID`, default `org.autobyteus.mobile.share` when the extension target exists, is the share extension bundle ID authority. `project.yml` must define this as a build setting default and set the extension target `PRODUCT_BUNDLE_IDENTIFIER` to `$(IOS_SHARE_EXTENSION_BUNDLE_ID)`.
- The workflow must pass `IOS_BUNDLE_ID`, `IOS_SHARE_EXTENSION_BUNDLE_ID`, `MARKETING_VERSION=${ios_marketing_version}`, and `CURRENT_PROJECT_VERSION=${build_number}` to simulator build, unit/UI tests, smoke scripts, archive, profile verification, and `ExportOptions.plist`.
- Static validation must prove that custom non-default bundle IDs are visible in `xcodebuild -showBuildSettings` for the app/share targets and match profile verifier/export-map inputs.
- `IOS_APP_SCHEME`, default `AutoByteusMobile`.
- Artifact prefix, default `AutoByteus_personal_ios` unless delivery standardizes another prefix.

Existing macOS desktop secrets (`APPLE_CERTIFICATE_P12_BASE64`, `APPLE_CERTIFICATE_P12_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`) are intentionally not part of this iOS contract. A GitHub run with only those secrets configured must report missing `IOS_*`/`APP_STORE_CONNECT_*` inputs instead of trying to adapt them.

### Build-Only Path

Build-only must run on tag/manual triggers even when no Apple distribution secrets exist:

1. Checkout `release_ref` (or event SHA/ref default).
2. Generate/open the iOS project using the documented XcodeGen/project command.
3. Build and run unit/UI/simulator tests for an iOS Simulator destination while passing `IOS_BUNDLE_ID`, `IOS_SHARE_EXTENSION_BUNDLE_ID`, `MARKETING_VERSION=${ios_marketing_version}`, and `CURRENT_PROJECT_VERSION=${build_number}`. The smoke script must either accept/forward these settings or fail with an explicit configuration error.
4. Upload non-secret artifacts:
   - build/test logs;
   - `.xcresult` bundles when produced;
   - simulator build products or zipped simulator `.app` when available, built with the resolved bundle IDs and iOS version/build metadata;
   - signing-readiness or secret-readiness summary that lists missing secret names only, never secret values.
5. Write a GitHub step summary that says whether publish was requested and whether publish can proceed.

Build-only must not require P12, provisioning profiles, App Store Connect API keys, or a local Xcode account.

### Missing-Secret Gate Semantics

When `publish_requested=true`:

1. Compute the required secret set from the app targets actually included in the archive. If the Share Extension target exists, the extension profile secret is required.
2. If any required secret is missing/empty, fail the publish job before creating a keychain, decoding profiles, running archive, exporting IPA, or invoking upload.
3. The failure message must list the exact missing names and provide `gh secret set <NAME>` guidance. It must not print any present secret values or base64 lengths that could leak material.
4. Build-only artifacts from the same workflow run must remain uploaded/available. A publish-gate failure is not a simulator build failure.
5. A tag push with missing iOS secrets is expected to fail at the publish gate; this is the safe signal that release automation exists but repository secrets are not yet configured.

When `publish_requested=false`, the publish gate must be skipped and missing publish secrets must not fail the workflow.

### Temporary Keychain, Profile, Archive, And Export Handling

When all required publish inputs exist:

1. Create a temporary keychain with a random password; unlock it; import `IOS_DISTRIBUTION_CERTIFICATE_P12_BASE64`; configure key partition list for codesigning; delete the keychain in a cleanup step.
2. Decode each provisioning profile to a temporary file, read its UUID/name/team/entitlements using `security cms -D` plus plist tooling, then install it as `~/Library/MobileDevice/Provisioning Profiles/<UUID>.mobileprovision` for the job only.
3. Verify the main profile before archive:
   - platform includes iOS;
   - `TeamIdentifier` contains `IOS_DEVELOPMENT_TEAM`;
   - `Entitlements.application-identifier` matches `${IOS_DEVELOPMENT_TEAM}.${IOS_BUNDLE_ID}` or another explicit reviewed bundle-ID mapping;
   - `Entitlements.get-task-allow` is `false`;
   - expiration is in the future;
   - profile type is not development/ad-hoc when exporting for App Store Connect.
4. Verify the extension profile with the same rules against `IOS_SHARE_EXTENSION_BUNDLE_ID` whenever the extension target exists.
5. Generate `ExportOptions.plist` with `method=app-store-connect`, `signingStyle=manual`, `teamID = IOS_DEVELOPMENT_TEAM`, `signingCertificate=Apple Distribution`, and a `provisioningProfiles` map for every app/extension bundle ID in the archive.
6. Run `xcodebuild archive` for `generic/platform=iOS` with the same `IOS_BUNDLE_ID`, `IOS_SHARE_EXTENSION_BUNDLE_ID`, `MARKETING_VERSION=${ios_marketing_version}`, and `CURRENT_PROJECT_VERSION=${build_number}` used by build-only, then `xcodebuild -exportArchive` to produce `.ipa`.
7. Compute a SHA-256 checksum for the `.ipa`.

### Upload Auth And Publish Outputs

Upload uses App Store Connect API-key authentication only:

1. Decode `APP_STORE_CONNECT_API_KEY_P8_BASE64` to a temporary `AuthKey_<APP_STORE_CONNECT_KEY_ID>.p8` file outside the repo or in a runner temp directory.
2. Invoke `xcrun altool --upload-app --type ios --file <ipa> --apiKey <APP_STORE_CONNECT_KEY_ID> --apiIssuer <APP_STORE_CONNECT_ISSUER_ID>`. If `xcrun -f altool` fails, stop with `upload_cli_unavailable` and do not attempt an undocumented uploader fallback.
3. Delete the `.p8` file in cleanup.
4. Upload/publish non-secret outputs:
   - `.ipa` and `.ipa.sha256` as workflow artifacts;
   - sanitized archive/export/upload logs;
   - App Store Connect upload result/build identifier if the uploader returns one;
   - GitHub step summary with release tag, `ios_marketing_version`, `artifact_version`, numeric build number, bundle IDs, profile names/UUIDs, team ID, checked-out SHA, prerelease label, and upload status.

### Explicitly Forbidden Shortcuts

- Do not use `Developer ID Application` or macOS notarization identities for iOS.
- Do not treat existing desktop `APPLE_*` secrets as iOS defaults.
- Do not assume a local Xcode account, automatic signing session, or provisioning cache exists on GitHub-hosted macOS runners.
- Do not archive for App Store with development/wildcard development profiles or with `get-task-allow=true`.
- Do not pass semantic prerelease suffixes such as `-rc1` into `MARKETING_VERSION` / `CFBundleShortVersionString`; prerelease text is artifact/TestFlight-note metadata only.
- Do not keep hard-coded app/share `PRODUCT_BUNDLE_IDENTIFIER` values that diverge from `IOS_BUNDLE_ID` and `IOS_SHARE_EXTENSION_BUNDLE_ID`; profile verification/export and generated target IDs must use one authority.
- Do not include the Share Extension target in publish unless its App Store profile is present and verified.
- Do not print P12/profile/API-key contents or password values.
- Do not submit for final App Store review/public release from this workflow unless a later reviewed release design explicitly adds that step.

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| App shell coordinator | `AppShellCoordinator` | Yes | Low | None. |
| URL normalizer | `NodeURLNormalizer` | Yes | Low | Use `URL` capitalization consistently in Swift. |
| Pairing parser | `PairingLinkParser` | Yes | Low | None. |
| Saved node model | `SavedNodeProfile` | Yes | Low | Keep aligned with Android naming. |
| WebView host | `AutoByteusWebViewController` | Yes | Low | None. |
| Navigation policy | `TrustedNavigationPolicy` | Yes | Low | Keep WebKit-independent. |
| QR scanner | `QRCodeScannerViewController` | Yes | Low | None. |
| Signing readiness script | `ios-signing-readiness.sh` | Yes | Low | None. |
| iOS release workflow | `.github/workflows/release-ios.yml` | Yes | Medium | Keep name aligned with existing `.github/workflows/release-android.yml`; detail lives in DS-IOS-009 contract. |
| iOS release metadata | `ios_marketing_version`, `artifact_version`, `prerelease_label`, `build_number` | Yes | Low | Do not use ambiguous `version_name` for both artifact and iOS bundle version semantics. |

## Applied Patterns (If Any)

- Adapter: `AutoByteusWebViewController` adapts `WKWebView` delegate callbacks to core `TrustedNavigationPolicy` and app diagnostics.
- Coordinator: `AppShellCoordinator` owns app-level sequencing across input, validation, persistence, and screen transitions.
- Repository-like persistence boundary: `SavedNodeStore` wraps native `UserDefaults` for saved profile metadata only.
- State machine (small local): app shell states mirror Android states: awaiting input, validating, opening WebView, active, recoverable error.
- Extension-safe shared core: Foundation-only core target keeps policy reusable by app, extension, and tests without mixing UI/framework concerns.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ios/` | Folder | iOS wrapper root | All iOS-native project files. | Sibling to `autobyteus-android`. | Android/desktop/backend code. |
| `autobyteus-ios/project.yml` | File | Xcode project definition | Generate `.xcodeproj` targets/schemes and define default `IOS_BUNDLE_ID` / `IOS_SHARE_EXTENSION_BUNDLE_ID` build settings consumed by target `PRODUCT_BUNDLE_IDENTIFIER` values. | Avoid fragile hand-edited project file as primary source and keep bundle-ID authority in build settings. | Runtime logic or divergent hard-coded app/share bundle IDs. |
| `autobyteus-ios/AutoByteusMobileCore/` | Folder | Core wrapper policy | Foundation-only shared Swift policies/models. | Clear app/extension/test reusable owner. | UIKit/WebKit/AVFoundation UI code. |
| `autobyteus-ios/AutoByteusMobile/` | Folder | iOS app target | UIKit app shell, screens, WebView, QR, app metadata/resources. | Platform-specific app owner. | Extension-only or pure test code. |
| `autobyteus-ios/AutoByteusMobile/Assets.xcassets/` | Folder | iOS app resources | App icon/assets. | iOS resource convention. | Generated temporary files unless committed intentionally. |
| `autobyteus-ios/AutoByteusMobileShareExtension/` | Folder | Share intake | iOS share extension source/metadata. | Platform share entrypoint. | App shell validation/open logic. |
| `autobyteus-ios/AutoByteusMobileCoreTests/` | Folder | Core unit tests | Pure policy parity tests. | Keeps tests near iOS project. | Simulator UI steps. |
| `autobyteus-ios/AutoByteusMobileUITests/` | Folder | Simulator UI/E2E tests | Fake-node app behavior validation. | Xcode UI-test convention. | Core parser-only tests. |
| `autobyteus-ios/scripts/` | Folder | Validation tooling | Project generation, smoke, readiness, fake server. | Operational scripts near iOS project. | Product app source. |
| `docs/ios_mobile_access.md` | File | Durable mobile docs | iOS setup, validation, signing/readiness/CI/live-node checklist. | Existing docs folder has Android mobile access. | Low-level design details better kept in ticket/design. |
| `.github/workflows/release-ios.yml` | File | iOS Release Workflow | Build-only and publish-enabled iOS GitHub Actions workflow implementing DS-IOS-009 triggers, release metadata split, bundle-ID build settings, exact secrets, temp keychain/profile handling, archive/export/upload, artifacts, and fail-fast gates. | Existing repo release workflows live here. | Secret values, local-only Xcode assumptions, macOS Developer ID/desktop `APPLE_*` signing reuse, prerelease suffixes in `MARKETING_VERSION`, divergent bundle-ID sources, development-profile App Store archives, skipped extension profiles. |
| `.gitignore` | File | Repo hygiene | Ignore iOS build/DerivedData/generated local artifacts as needed. | Root ignore already owns build artifact rules. | Source/project files that must be committed. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `AutoByteusMobileCore/` | Main-Line Domain-Control + Persistence-Provider for small profile store | Yes | Low | Foundation-only policies are cohesive and small. |
| `AutoByteusMobile/` | Main-Line Domain-Control + Transport/UI integration | Yes | Medium | App target necessarily contains UIKit/WebKit/AVFoundation files; file names keep concerns split. |
| `AutoByteusMobileShareExtension/` | Transport/Off-Spine Concern | Yes | Low | Extension-specific share intake only. |
| `AutoByteusMobileCoreTests/` | Off-Spine Concern | Yes | Low | Unit tests only. |
| `AutoByteusMobileUITests/` | Off-Spine Concern | Yes | Low | Simulator E2E only. |
| `scripts/` | Off-Spine Concern | Yes | Low | Validation/build helpers only. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Connection input | `Scan QR -> decoded "https://desktop.tailnet.ts.net/mobile?pairing=..." -> ConnectionInputResolver -> validate status -> open same URL in WKWebView while saving clean https://desktop.tailnet.ts.net/mobile profile` | QR scanner saves a profile directly and opens WebView without status validation. | Keeps one authoritative input/validation path. |
| HTTP acknowledgement | User enters `http://192.168.1.25:29695/mobile`, checks private-network HTTP acknowledgement, validator calls `http://192.168.1.25:29695/rest/remote-access/status`. | App silently saves HTTP URL or blocks all HTTP regardless of explicit acknowledgement. | Matches Android behavior while surfacing risk. |
| Navigation containment | `https://desktop.tailnet.ts.net/mobile` allowed; `https://desktop.tailnet.ts.net/rest/...` allowed; `https://example.org/mobile` external; `javascript:alert(1)` blocked; `https://desktop.tailnet.ts.net/workspace` blocked. | `WKWebView` loads every same-host path or every clicked link. | Prevents mobile wrapper from becoming an unsafe desktop/admin browser. |
| Share intake | Share extension stores `https://desktop.tailnet.ts.net/mobile?pairing=...` as pending input and app consumes it on next activation. | Extension uses private APIs or unsupported UIApplication access to force-open the app. | Preserves App Store/public API posture. |
| Signing readiness | On the investigated machine, script reports Xcode 26.1.1, iOS simulators, an Apple Development identity, and an iOS wildcard development profile for team `7Y86YBQ7B4` / `YU ZHENG`; it separately reports no detected Apple/iOS Distribution identity and no detected App Store profile. | A single `ready/not ready` flag that hides development-vs-distribution distinction. | User has local Xcode development setup, but App Store/TestFlight readiness still needs distribution assets. |
| Build-only iOS workflow | Manual dispatch with `publish_app_store_connect=false` builds/tests on a macOS runner and uploads simulator logs/`.xcresult`/build products without reading any Apple distribution secrets. | Build-only workflow fails because App Store Connect secrets are absent. | Users and reviewers need CI evidence before publishing is configured. |
| Tag/manual publish with missing secrets | Tag `v1.2.3` or manual publish request runs build-only first, then the publish job fails before keychain/profile/archive/upload with exact missing names such as `IOS_DISTRIBUTION_CERTIFICATE_P12_BASE64` or `APP_STORE_CONNECT_API_KEY_P8_BASE64`. | Workflow tries to adapt `APPLE_CERTIFICATE_P12_BASE64` or a local Xcode session and fails later with opaque signing errors. | Safe automation should make missing setup actionable and avoid accidental secret misuse. |
| Publish with complete iOS secrets | Workflow imports the Apple/iOS Distribution P12 into a temp keychain, installs/verifies main app and extension App Store profiles, exports an `.ipa`, uploads to App Store Connect/TestFlight with API-key auth, and publishes sanitized logs/checksum. | Workflow skips extension profile verification or uploads with development signing. | Archive/upload behavior must be deterministic enough for implementation and review. |
| Prerelease tag versioning | `v1.2.7-rc1` resolves to `ios_marketing_version=1.2.7`, `artifact_version=1.2.7-rc1`, `prerelease_label=rc1`, `build_number=$GITHUB_RUN_NUMBER`; every `xcodebuild` path receives `MARKETING_VERSION=1.2.7 CURRENT_PROJECT_VERSION=$GITHUB_RUN_NUMBER`. | `MARKETING_VERSION=1.2.7-rc1` or `CFBundleShortVersionString=1.2.7-rc1`. | Apple requires numeric period-separated bundle versions; prerelease text belongs in artifact names/summaries/TestFlight notes only. |
| Bundle-ID authority | `IOS_BUNDLE_ID=com.example.autobyteus.mobile` and `IOS_SHARE_EXTENSION_BUNDLE_ID=com.example.autobyteus.mobile.share` make generated app/share target `PRODUCT_BUNDLE_IDENTIFIER` values, profile verifier bundle IDs, `ExportOptions.plist` keys, build logs, and summaries all use those values. | Workflow verifies/export maps `com.example...` while Xcode target still archives `org.autobyteus.mobile`. | Avoids mixed-level dependency on workflow variables plus hard-coded project internals. |
| Build-only release evidence | A tag run without publish secrets still builds/tests/smokes simulator app with resolved `MARKETING_VERSION=1.2.7` and numeric build number, then fails only at publish gate if secrets are missing. | Summary/artifact says `1.2.7-rc1`, but simulator app/test bundle remains `0.1.0 (1)`. | Build-only artifacts are the primary evidence when publishing is not configured. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Native iOS credential bridge for `mra_...` | Could seem more native than WebView localStorage. | Rejected | Existing `/mobile` shell remains credential owner for MVP. |
| Local iOS AutoByteus runtime/server | Could avoid network dependency. | Rejected | Match Android: remote desktop/server node only. |
| React Native/Capacitor wrapper | Could share web shell packaging. | Rejected | Native Swift + WKWebView is smaller and mirrors Android native wrapper role. |
| Unrestricted in-app browser | Simplifies WebView navigation. | Rejected | Use `TrustedNavigationPolicy`; externalize/block non-mobile paths. |
| Unguarded App Store public release / unconditional upload | User wants iOS release automation and may have an Apple Developer membership. | Rejected | Guarded CI archive/export/upload to App Store Connect/TestFlight is in scope when the exact iOS/App Store Connect secrets are complete. Final public App Store availability, submit-for-review automation, privacy questionnaire/listing metadata, and any upload attempt without complete secrets remain out of scope/rejected. |
| Prerelease suffix in iOS bundle short version | Semantic tags like `v1.2.7-rc1` are useful for release candidates. | Rejected | Keep prerelease suffix in `artifact_version`, summaries, and TestFlight notes only; derive `ios_marketing_version=1.2.7` for `MARKETING_VERSION` / `CFBundleShortVersionString`. |
| Dual bundle-ID authority | Current implementation had workflow variables for profile/export but hard-coded target IDs in `project.yml`. | Rejected | Make `IOS_BUNDLE_ID` and `IOS_SHARE_EXTENSION_BUNDLE_ID` the single app/share bundle-ID authority consumed by generated Xcode target IDs, build settings, profile verification, export mapping, and docs. |
| Unsupported share-extension app-launch hack | Would mimic Android immediate share open. | Rejected | Safe pending-input handoff and user guidance. |

## Derived Layering (If Useful)

- Platform entry layer: `AppDelegate`, `SceneDelegate`, share extension entry.
- App shell layer: `AppShellCoordinator`, connection/web/QR view controllers.
- Core policy layer: URL/pairing/input/diagnostic/status/navigation/profile/pending-input policies.
- External dependency layer: backend `/rest/remote-access/status`, existing `/mobile` shell, iOS system frameworks, Xcode/signing tools.

Layering follows ownership: app shell depends on core, not vice versa; WebKit/AVFoundation integration stays behind app-shell owners; backend/mobile-web remain external owners.

## Migration / Refactor Sequence

1. Add `autobyteus-ios` folder and project definition (`project.yml`) with app, core, tests, UI tests, and optional share-extension target.
2. Add core Swift policy files and unit tests mirroring Android cases:
   - URL normalization;
   - pairing parsing;
   - HTTP acknowledgement input resolution;
   - status/diagnostic mapping;
   - saved profile coding;
   - trusted navigation classification.
3. Add app shell files:
   - app/scene delegates;
   - app shell coordinator/state;
   - connection UI;
   - WebView host/screen;
   - QR scanner;
   - external actions.
4. Add Info.plist/privacy/ATS metadata and app icon assets.
5. Add share-intake target only through public extension-safe APIs; wire pending input consumption on app activation.
6. Add validation tooling:
   - project generation/build/test script;
   - fake mobile server;
   - simulator smoke script;
   - signing-readiness script.
7. Add `.github/workflows/release-ios.yml` following the DS-IOS-009 contract:
   - triggers: `push` tags `v*` and `workflow_dispatch`;
   - manual inputs: `publish_app_store_connect` default `false`, `release_tag`, `release_ref`, and `prerelease`;
   - release metadata resolution that splits `release_tag`, `semantic_version_core`, `prerelease_label`, `ios_marketing_version`, `artifact_version`, and numeric `build_number`;
   - single bundle-ID authority through `IOS_BUNDLE_ID` and `IOS_SHARE_EXTENSION_BUNDLE_ID`, with `project.yml` target identifiers referencing those build settings;
   - build-only simulator/test/smoke artifact path that passes resolved bundle IDs plus `MARKETING_VERSION=${ios_marketing_version}` and `CURRENT_PROJECT_VERSION=${build_number}` and does not require Apple secrets;
   - publish-enabled secret completeness gate for `IOS_DISTRIBUTION_CERTIFICATE_P12_BASE64`, `IOS_DISTRIBUTION_CERTIFICATE_P12_PASSWORD`, `IOS_APPSTORE_PROVISIONING_PROFILE_BASE64`, `IOS_DEVELOPMENT_TEAM`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_API_KEY_P8_BASE64`, and `IOS_SHARE_EXTENSION_APPSTORE_PROVISIONING_PROFILE_BASE64` when an extension target exists;
   - fail-fast missing-secret message with exact `gh secret set` guidance before keychain/profile/archive/upload;
   - temporary keychain/certificate import and cleanup;
   - provisioning profile decode/install/verification for main app and extension;
   - manual `ExportOptions.plist` provisioning-profile mapping using the same app/share bundle-ID authority;
   - archive/export `.ipa` using the same bundle IDs and iOS version/build metadata as build-only;
   - App Store Connect/TestFlight upload using API key credentials;
   - explicit sanitized artifacts, checksum, and non-secret summaries.
8. Add/update docs:
   - `autobyteus-ios/README.md`;
   - `docs/ios_mobile_access.md`;
   - root README release/mobile section if needed;
   - `.gitignore` for iOS build/DerivedData artifacts if needed.
9. Run implementation-scoped checks:
   - generated project builds for iOS Simulator;
   - unit tests pass;
   - UI/simulator smoke command path at least compiles/runs where available;
   - static/executable release-metadata checks for stable and prerelease tags;
   - static/executable custom bundle-ID checks proving generated target IDs, profile verifier/export inputs, and summaries align;
   - build-only checks proving simulator build/test/smoke receive resolved iOS marketing/build settings;
   - Android baseline unaffected if Android files touched only docs.
10. API/E2E runs simulator-first validation and signing-readiness, then records whether physical-device/live-node validation is available.

No pre-task iOS legacy path existed. For the round-4 design-impact rework, do not remove the healthy runtime iOS wrapper; update only the release workflow/project/docs/tests needed to eliminate invalid version metadata and dual bundle-ID authority. Do not introduce temporary compatibility paths that must later be removed.

## Key Tradeoffs

- XcodeGen vs committed `.xcodeproj`: XcodeGen provides a readable source-of-truth project definition. Scripts must clearly check/install/fail if `xcodegen` is missing. Implementation may commit the generated `.xcodeproj` too only if the team prefers zero local XcodeGen dependency; `project.yml` remains authoritative if both exist.
- Foundation-only core vs direct app files: A small core target avoids duplicating policies between app, share extension, and tests while keeping platform UI dependencies out of pure logic.
- Share extension vs no share support: Share extension adds signing/entitlement complexity but best approximates Android text-share. Use safe pending handoff to avoid unsupported app-launch behavior.
- Private HTTP parity vs App Store ATS posture: Android supports acknowledged HTTP for private LAN/tailnet. iOS can support it with ATS/local-network configuration, but docs must recommend HTTPS Tailscale Serve and record App Store justification/risk.
- Simulator-first validation vs production proof: Simulator smoke is feasible now, but QR camera and some file-upload behavior require physical-device validation before release readiness claims.
- Automatic signing in local Xcode vs GitHub CI: local Xcode can use the user's logged-in account/team for development, and current local evidence shows development signing for team `7Y86YBQ7B4`. GitHub-hosted runners do not inherit that state. The release workflow therefore uses manual CI signing material and App Store Connect API-key upload secrets; build-only stays independent of those secrets, while publish fails fast until they are configured. Bundle IDs are still controlled by explicit build settings so local/default and CI/custom signing paths do not drift.
- Prerelease tags vs App Store-compatible version fields: Preserve user-friendly semantic tags and artifact names such as `1.2.7-rc1`, but derive `ios_marketing_version=1.2.7` because Apple bundle short versions cannot contain prerelease text. Multiple release-candidate uploads for the same marketing version rely on unique numeric build numbers.

## Risks

- App Store Guideline 4.2 rejection risk if reviewers view this as merely a repackaged website. Mitigation: native QR, saved-node setup, diagnostics, trusted-origin containment, private-node utility, and review notes/demo setup.
- ATS review risk for private HTTP. Mitigation: explicit HTTP acknowledgement, HTTPS recommendation, local-network purpose string, review justification, and potentially release-build policy adjustment in a future task if Apple rejects.
- App Store signing readiness may remain incomplete without distribution certificate/profile/App Store Connect setup. Local development signing appears configured for team `7Y86YBQ7B4` / `YU ZHENG`, while iOS CI distribution/App Store Connect secrets were not detected; readiness and workflow output must distinguish simulator-ready, development-device-ready, build-only CI-ready, and App-Store-upload-ready.
- GitHub iOS publish workflow may be added before secrets are present. Mitigation: build-only path passes without secrets; publish path fails fast with exact missing-secret messages and docs provide `gh secret set` instructions.
- Existing macOS Apple secrets may be mistaken for iOS signing material. Mitigation: use iOS-specific secret names by default and validate identity/profile types before archive/export.
- Prerelease tags may be mistaken for valid iOS bundle short versions. Mitigation: metadata resolver must derive numeric `ios_marketing_version` from the semantic core, keep suffixes only in `artifact_version`/notes, and add static checks for `v1.2.7-rc1`.
- Bundle IDs may drift between workflow variables and Xcode targets. Mitigation: `project.yml` target identifiers must reference `IOS_BUNDLE_ID`/`IOS_SHARE_EXTENSION_BUNDLE_ID`, and implementation checks must assert custom IDs propagate through `xcodebuild -showBuildSettings`, profile verification, export mapping, build-only, and archive.
- Build-only release evidence may drift from archive metadata. Mitigation: build/test/smoke and archive must all receive the same resolved `MARKETING_VERSION`, `CURRENT_PROJECT_VERSION`, and bundle-ID settings.
- Share extension App Group entitlements may require Developer Program/team setup. Mitigation: simulator path can still validate app core; readiness script surfaces profile entitlement gaps.
- Policy drift from Android. Mitigation: mirrored Swift tests and docs; future shared fixture file if needed.
- WKWebView file input differences from Android. Mitigation: API/E2E must validate or record a physical-device/live-node evidence gap.

## Guidance For Implementation

- Keep iOS code dependency-light and native. Do not add React Native, Capacitor, a browser engine entitlement, or a local backend.
- Prefer UIKit programmatic UI to avoid storyboard merge complexity. A SwiftUI implementation is acceptable only if it keeps the same ownership boundaries and testability.
- Use persistent `WKWebsiteDataStore.default()` so the existing `/mobile` localStorage credential model works by origin. Do not extract or mirror credentials natively.
- Use `SFSafariViewController` or `UIApplication.open` for external web links and `mailto`/`tel`/`sms` as appropriate; keep different-origin links out of the AutoByteus WebView.
- Include privacy purpose strings:
  - camera: QR scanning Phone Access codes;
  - local network: connecting to the user's AutoByteus desktop/server node on LAN/tailnet;
  - photo library only if implementation proves WKWebView file input requires it for chosen picker behavior.
- For ATS, prefer the narrowest configuration that preserves simulator/private HTTP parity. If broad web-content HTTP is enabled, document App Store justification.
- GitHub release workflow should mirror Android's release discipline: tag/manual dispatch, build-only artifact path, publish-enabled exact secret validation, signed release/upload path only when complete, and clear artifact naming such as `AutoByteus_personal_ios-X.Y.Z-rc1.ipa`. It must implement the DS-IOS-009 contract rather than relying on local Xcode automatic signing.
- For App Store Connect upload, use App Store Connect API key secrets (`APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_API_KEY_P8_BASE64`) rather than Apple ID/app-specific-password in new iOS CI.
- Implement release metadata with unambiguous names. Do not keep a generic `version_name` field if it can mean either artifact version or iOS bundle version; prefer `ios_marketing_version` for `MARKETING_VERSION`/`CFBundleShortVersionString`, `artifact_version` for filenames, `prerelease_label` for suffix notes, and `build_number` for `CURRENT_PROJECT_VERSION`/`CFBundleVersion`.
- Enforce `ios_marketing_version` with `^[0-9]+\.[0-9]+\.[0-9]+$` and `build_number` with `^[0-9]+$` before any build/archive. Reject invalid values before archive/upload.
- Wire `autobyteus-ios/project.yml` so app/share `PRODUCT_BUNDLE_IDENTIFIER` values are `$(IOS_BUNDLE_ID)` and `$(IOS_SHARE_EXTENSION_BUNDLE_ID)`, with default build-setting values matching current defaults. Pass those same settings to every workflow `xcodebuild` invocation and smoke script.
- Add implementation checks or script tests for: `v1.2.7` metadata, `v1.2.7-rc1` metadata, invalid tag rejection, custom app/share bundle-ID propagation, and build-only version/build propagation.
- Signing-readiness script should classify:
  - Xcode missing/present;
  - simulator missing/present;
  - development identity present/missing;
  - Apple/iOS distribution identity present/missing;
  - matching provisioning profile present/missing and entitlement match;
  - optional archive attempted/skipped/failed;
  - final status: simulator-ready, development-device-ready, App-Store-archive-ready, or not-ready with reasons.
- Evidence from API/E2E should include simulator name/UDID/runtime, app build path, fake server URL, screenshots, test logs, signing readiness output, and any live-node/device limitations.
