# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-tailscale-mobile-shell/docs/task-artifacts/android-tailscale-mobile-shell/design-spec.md`
- Current Review Round: 1
- Trigger: Solution-designer handoff on 2026-05-21 requesting architecture review for Android/Tailscale mobile shell ticket.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: Round 1
- Current-State Evidence Basis:
  - Read the architecture-reviewer shared `design-principles.md` and the common design examples.
  - Read the upstream requirements, investigation notes, and design spec.
  - Verified task worktree state: `codex/android-tailscale-mobile-shell` at `9a27e3d2`, matching `origin/personal`; only `docs/task-artifacts/` is untracked before this report.
  - Sampled current code paths named by the design: `PhoneAccessCard.vue`, `phoneAccessStore.ts`, `remote-access.ts`, `remote-access-pairing-service.ts`, `MobileRemoteAccessShell.vue`, `mobileNodeSessionStore.ts`, `mobileCredentialStorage.ts`, `nodeEndpoints.ts`, and `remote_access.md`.
  - Confirmed no existing Android Gradle/manifest project was found by local `find` for `settings.gradle*`, `build.gradle*`, `gradlew`, or `AndroidManifest.xml`.
  - Spot-checked current primary external docs for Tailscale MagicDNS/Serve/split tunneling and Android WebView URI/native-bridge guidance against the design assumptions.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial handoff from solution_designer | N/A | No | Pass | Yes | Design is ready for implementation with residual implementation risks called out below. |

## Reviewed Design Spec

The reviewed design adds a new `autobyteus-android/` native Android WebView shell around the existing `/mobile` web shell, plus narrow PWA metadata and documentation updates. The design preserves existing ownership: Desktop Phone Access creates QR/link sessions, Remote Access owns pairing and credentials, `/mobile` owns product behavior and session restore, and Android owns only saved-node setup, WebView containment, diagnostics, and build/package concerns.

The design is concrete enough for implementation: it inventories the setup, saved-launch, manual URL, failure diagnostic, PWA, build, real-device E2E, app state, and navigation-policy spines; maps owners and file responsibilities; defines allowed/forbidden dependencies; rejects duplicated native run/chat/pairing behavior; and gives a realistic migration and validation sequence.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design classifies the task as a feature/app-shell packaging and connection journey. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Design states `No Design Issue Found` for existing Phone Access/mobile core and identifies boundary/ownership duplication as the implementation risk to avoid. Code sampling confirms existing pairing/status/mobile shell paths exist. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design says no core refactor needed now; Android shell and small web/docs seams are additive. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | File map, dependency rules, removal plan, and rejection log all keep backend/runtime/mobile product behavior out of Android. Native secure credential storage is explicitly deferred/optional with a separate origin-restricted bridge requirement. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First review round. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-ANDROID-001 | First-time QR/link pairing | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-ANDROID-002 | Returning saved-node launch | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-ANDROID-003 | Manual URL validation/setup | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-ANDROID-004 | Failure-to-recovery return path | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-PWA-005 | Browser PWA install metadata | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-BUILD-006 | Android build/package path | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-E2E-009 | Real-device validation path | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-ANDROID-007 | Bounded local app state machine | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-ANDROID-008 | Bounded local navigation-policy flow | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Android App Shell | Pass | Pass | Pass | Pass | Correctly created as a new bounded package for native setup/state/WebView/security/diagnostics. |
| Existing Mobile Web Shell | Pass | Pass | Pass | Pass | Correctly reused for AutoByteus product behavior and extended only for manifest/head metadata unless implementation discovers a WebView compatibility issue. |
| Existing Remote Access Backend | Pass | Pass | Pass | Pass | Correctly reused for status, pairing, credential creation, revocation. No new backend endpoint is required by this design. |
| Desktop Phone Access Surface | Pass | Pass | Pass | Pass | Correctly extended for stable Tailscale URL guidance/copy while retaining QR/link ownership. |
| Documentation | Pass | Pass | Pass | Pass | Android/Tailscale build/setup docs are explicitly in scope and owned outside core runtime. |
| External Tailscale capability | Pass | Pass | Pass | Pass | Correctly treated as network reachability outside AutoByteus authority; no VPN/device-list ownership leak. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Saved node profile fields | Pass | Pass | Pass | Pass | `SavedNodeProfile.kt` is the right Android-local identity shape and is not a credential/session authority. |
| URL normalization across QR/manual/status/WebView | Pass | Pass | Pass | Pass | `NodeUrlNormalizer.kt` is justified; design correctly warns not to make it arbitrary web browsing policy. |
| Diagnostics across status/WebView/network | Pass | Pass | Pass | Pass | `ConnectionDiagnostic.kt` plus mapper gives one shell-level recovery language. |
| Trusted navigation decisions | Pass | Pass | Pass | Pass | `TrustedNavigationPolicy.kt` centralizes a security-critical decision. |
| QR/pairing link parsing | Pass | Pass | Pass | Pass | `PairingLinkParser.kt` is scoped to input parsing and explicitly does not exchange codes. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `SavedNodeProfile` | Pass | Pass | Pass | Pass | Pass | Medium drift risk is identified and controlled by deriving `mobileUrl` from `baseUrl` unless semantics are explicit. Implementation should persist a clean mobile URL without the one-time `pairing` query. |
| `ConnectionDiagnostic` | Pass | Pass | Pass | N/A | Pass | Shell-level recovery model is distinct from backend error schema. |
| `TrustedOrigin` / parsed profile origin | Pass | Pass | Pass | N/A | Pass | Design requires derivation from parsed URL, not free-form host allowlists or string matching. |
| Existing `MobileNodeSession` | Pass | Pass | Pass | N/A | Pass | Remains web-owned/localStorage-backed in MVP, avoiding a second credential model. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Prototype Android-native run/chat/team/files UI | Pass | Pass | Pass | Pass | Must be removed if created; existing `/mobile` remains authority. |
| Android-side duplicate pairing exchange | Pass | Pass | Pass | Pass | Rejected for MVP unless separately designed as an origin-restricted secure bridge. |
| Arbitrary-origin WebView fallback | Pass | Pass | Pass | Pass | Replaced by `TrustedNavigationPolicy`; external links open in browser. |
| Offline/service-worker authenticated content cache | Pass | Pass | Pass | Pass | Manifest-only PWA; cache design deferred to separate review. |
| Trusted Web Activity/public-domain packaging assumption | Pass | Pass | Pass | Pass | Replaced by native WebView shell because URLs are user-selected/private. |
| Existing Android implementation | Pass | N/A | Pass | Pass | No existing Android implementation exists to remove. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-android/settings.gradle.kts` | Pass | Pass | N/A | Pass | Gradle project/module declaration only. |
| `autobyteus-android/build.gradle.kts` | Pass | Pass | N/A | Pass | Build root plugin/repository versions only. |
| `autobyteus-android/app/build.gradle.kts` | Pass | Pass | N/A | Pass | Android app module build concern. |
| `autobyteus-android/app/src/main/AndroidManifest.xml` | Pass | Pass | N/A | Pass | Manifest permissions/activity/network hooks only. |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/MainActivity.kt` | Pass | Pass | Pass | Pass | Thin lifecycle/root composition facade. |
| `.../shell/AndroidAppShellViewModel.kt` | Pass | Pass | Pass | Pass | Governing state machine/profile selection/retry/reset/opening owner. |
| `.../connection/SavedNodeProfile.kt` | Pass | Pass | Pass | Pass | Tight Android-local profile identity. |
| `.../connection/SavedNodeStore.kt` | Pass | Pass | Pass | Pass | Typed profile persistence boundary. |
| `.../connection/NodeUrlNormalizer.kt` | Pass | Pass | Pass | Pass | Single URL normalization policy. |
| `.../connection/ConnectionValidator.kt` | Pass | Pass | Pass | Pass | Status endpoint reachability validation only. |
| `.../connection/ConnectionDiagnostic.kt` | Pass | Pass | Pass | Pass | Diagnostic model only. |
| `.../connection/ConnectionDiagnosticMapper.kt` | Pass | Pass | Pass | Pass | Network/status/WebView error-to-recovery mapping only. |
| `.../connection/PairingLinkParser.kt` | Pass | Pass | Pass | Pass | QR/link input parser only; not a pairing exchange owner. |
| `.../web/AutoByteusWebView.kt` | Pass | Pass | Pass | Pass | WebView settings/load/lifecycle/back/error callbacks. |
| `.../web/TrustedNavigationPolicy.kt` | Pass | Pass | Pass | Pass | Security-critical allow/external/block policy. |
| `.../ui/ConnectionScreen.kt` | Pass | Pass | Pass | Pass | Native setup/recovery UI; state stays in ViewModel. |
| `.../ui/WebShellScreen.kt` | Pass | Pass | Pass | Pass | Compose wrapper/recovery overlay; WebView details stay in web owner. |
| `autobyteus-android/app/src/test/...` | Pass | Pass | N/A | Pass | Unit checks for parser/normalizer/policy/diagnostics. |
| `autobyteus-android/app/src/androidTest/...` | Pass | Pass | N/A | Pass | Device/WebView smoke checks. |
| `autobyteus-web/public/mobile.webmanifest` | Pass | Pass | N/A | Pass | PWA metadata only. |
| `autobyteus-web/pages/mobile.vue` | Pass | Pass | N/A | Pass | Mobile route head metadata only. |
| `autobyteus-web/docs/remote_access.md` | Pass | Pass | N/A | Pass | Product remote-access/Tailscale guidance. |
| `autobyteus-android/README.md` or `docs/android_mobile_access.md` | Pass | Pass | N/A | Pass | Android build/setup/smoke docs. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Android Connection Screen | Pass | Pass | Pass | Pass | Can use parser, normalizer, validator, store, WebView host; cannot own credential exchange. |
| Android Connection Validator | Pass | Pass | Pass | Pass | Only calls public `/rest/remote-access/status`; no direct product APIs. |
| Android WebView Host | Pass | Pass | Pass | Pass | Loads only policy-approved saved `/mobile` origin and same-origin AutoByteus paths. |
| Existing Mobile Web Shell | Pass | Pass | Pass | Pass | Continues using existing REST/GraphQL/WebSocket clients and credential storage. |
| Remote Access Pairing Service | Pass | Pass | Pass | Pass | Pairing and credentials remain server/web-owned; Android does not become a second authority. |
| Tailscale | Pass | Pass | Pass | Pass | App diagnoses/guides; does not implement/manage VPN or read private device lists. |
| PWA support | Pass | Pass | Pass | Pass | Manifest/head metadata only; no offline auth cache. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Existing `/mobile` Mobile Web Shell | Pass | Pass | Pass | Pass | Android depends on `/mobile`, not its internal run/chat stores/components. |
| Remote Access Pairing Service | Pass | Pass | Pass | Pass | Existing `/mobile?pairing=` and `/rest/remote-access/pairing-exchanges` remain authority. |
| Android Trusted Navigation Policy | Pass | Pass | Pass | Pass | Design forbids UI/parser direct arbitrary `loadUrl` bypass. |
| SavedNodeStore | Pass | Pass | Pass | Pass | UI writes through typed store, not raw preferences. |
| Desktop Phone Access | Pass | Pass | Pass | Pass | Desktop/user intent creates pairing sessions; Android does not generate desktop sessions. |
| Android secure storage bridge, if later implemented | Pass | Pass | Pass | Pass | Optional and constrained: exact-origin gating and separate tests/review expectations. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `SavedNodeStore.loadProfiles()` | Pass | Pass | Pass | Low | Pass |
| `SavedNodeStore.saveProfile(profile)` | Pass | Pass | Pass | Low | Pass |
| `NodeUrlNormalizer.normalize(input)` | Pass | Pass | Pass | Medium | Pass |
| `ConnectionValidator.validate(profileOrUrl)` | Pass | Pass | Pass | Low | Pass |
| `PairingLinkParser.parse(qrText)` | Pass | Pass | Pass | Low | Pass |
| `TrustedNavigationPolicy.classify(url, profile)` | Pass | Pass | Pass | Medium | Pass |
| `WebViewHost.open(profileOrUrl)` | Pass | Pass | Pass | Low | Pass |
| Existing `GET /rest/remote-access/status` | Pass | Pass | Pass | Low | Pass |
| Existing `/mobile?pairing=<payload>` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-android/` | Pass | Pass | Low | Pass | Isolated native Android package avoids web/server core blending. |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/shell/` | Pass | Pass | Low | Pass | App-shell state owner. |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/connection/` | Pass | Pass | Low | Pass | Off-spine connection/profile concerns serving shell. |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/web/` | Pass | Pass | Low | Pass | WebView/security adapter boundary. |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/ui/` | Pass | Pass | Medium | Pass | UI folder is acceptable with explicit instruction to keep logic in ViewModel/connection/web owners. |
| `autobyteus-web/public/mobile.webmanifest` | Pass | Pass | Low | Pass | Existing web public asset location. |
| `autobyteus-web/pages/mobile.vue` | Pass | Pass | Low | Pass | Existing mobile route owns head metadata. |
| `autobyteus-web/docs/remote_access.md` | Pass | Pass | Low | Pass | Existing remote-access docs owner. |
| `autobyteus-android/README.md` / `docs/android_mobile_access.md` | Pass | Pass | Low | Pass | Android docs path is intentionally flexible but responsibility is clear. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Remote access pairing/auth | Pass | Pass | N/A | Pass | Reuses current server/web pairing flow. |
| Mobile UI/run/chat/files/tools | Pass | Pass | N/A | Pass | Reuses existing `/mobile` shell. |
| Desktop URL/QR creation | Pass | Pass | N/A | Pass | Existing Phone Access surface remains pairing session source. |
| Native saved node profile | Pass | Pass | Pass | Pass | New support is justified because Android needs native launch state before origin-specific WebView localStorage is available. |
| WebView host/navigation security | Pass | Pass | Pass | Pass | New support is Android platform-specific. |
| PWA metadata | Pass | Pass | N/A | Pass | Belongs in existing mobile web public/head locations. |
| Tailscale connectivity | Pass | Pass | N/A | Pass | External capability; design only diagnoses/guides. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Android-native product UI fork | No | Pass | Pass | Explicitly rejected. |
| Android duplicate pairing/credential flow | No | Pass | Pass | Explicitly rejected for MVP; bridge requires separate constrained design. |
| Arbitrary-origin WebView fallback | No | Pass | Pass | Explicitly replaced by trusted navigation policy. |
| TWA/public verified domain packaging | No | Pass | Pass | Explicitly rejected for private/user-selected tailnet URLs. |
| HTTP as default path | No | Pass | Pass | HTTPS Tailscale Serve is preferred; HTTP requires acknowledgement. |
| Offline PWA/service-worker cache | No | Pass | Pass | Explicitly rejected for this ticket. |
| Automatic Tailscale discovery/API integration | No | Pass | Pass | Explicitly out of MVP. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Android project bootstrap | Pass | Pass | Pass | Pass |
| Connection profile/parser/validator implementation | Pass | Pass | Pass | Pass |
| WebView host and navigation policy | Pass | Pass | Pass | Pass |
| Diagnostics/recovery surface | Pass | Pass | Pass | Pass |
| Unit/instrumentation/live E2E validation | Pass | Pass | Pass | Pass |
| PWA metadata and docs | Pass | Pass | Pass | Pass |
| Core backend/run/chat non-change | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Stable travel URL/origin-scoped credentials | Yes | Pass | Pass | Pass | Good and bad examples make the origin risk clear. |
| Android shell scope vs native core clone | Yes | Pass | Pass | Pass | Clear avoided shape prevents boundary bypass. |
| QR handling | Yes | Pass | Pass | Pass | Good example limits Android to parse/save/load. |
| Navigation policy | Yes | Pass | Pass | Pass | Exact parsed URI validation vs string matching is explicit. |
| PWA metadata | Yes | Pass | Pass | Pass | Manifest-only vs service-worker cache distinction is clear. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Exact Android stack/library versions | Build choices affect implementation maintenance, but not architecture ownership. | Implementation engineer may choose minimal Kotlin/Compose/WebView/QR stack and record versions in handoff/docs. | Non-blocking. |
| Native secure credential storage bridge | Could improve credential storage, but can create a second authority or bridge risk. | Keep out of MVP or implement only with exact-origin restriction and tests; escalate design impact if scope expands beyond current constraints. | Non-blocking residual risk. |
| Play Store/release signing | Delivery packaging may need additional release decisions. | Keep initial debug/internal APK sufficient unless delivery/user expands release scope. | Non-blocking. |
| Real physical device/Tailscale availability during API/E2E | Live validation depends on environment. | API/E2E should execute when device/tailnet/server are available and otherwise document environmental block with deterministic checks completed. | Non-blocking for design. |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

N/A for passing review. No `Design Impact`, `Requirement Gap`, or `Unclear` findings are open.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Persist the saved node profile as a stable origin/mobile URL, not as the consumed one-time pairing URL. Pairing links should be loaded for first-time exchange, but subsequent launches should use the clean saved `/mobile` URL.
- Keep native credential storage out of MVP unless the implementation adds exact-origin bridge gating and tests. Broad `addJavascriptInterface` or message-channel exposure would be a design-impact issue.
- Navigation policy must use parsed URI scheme/host/origin checks, not substring matching. This is security-critical for WebView containment.
- HTTP tailnet/LAN support must remain explicit/acknowledged; Tailscale Serve HTTPS should be the recommended path.
- UI folder logic drift is a watch item: connection validation, diagnostics, and navigation decisions should remain in their named owners, not move into Compose screens.
- API/E2E should record whether development-node mode or packaged-Electron mode was used; packaged Electron smoke is required only when release readiness claims packaged desktop + Android behavior.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Design is implementation-ready. It respects the authoritative boundaries for `/mobile`, Remote Access, Android shell state, and Tailscale network reachability; no upstream design rework is required before implementation begins.

## External Reference Spot Check Links

- Tailscale MagicDNS: https://tailscale.com/docs/features/magicdns
- Tailscale Serve: https://tailscale.com/docs/features/tailscale-serve
- Tailscale Android app-based split tunneling: https://tailscale.com/docs/features/client/android-app-split-tunneling
- Android WebView unsafe URI loading guidance: https://developer.android.com/privacy-and-security/risks/unsafe-uri-loading
- Android WebView native bridge guidance: https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges
