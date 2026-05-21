# Design Spec

## Current-State Read

The current Android shell already has a coherent native setup/open spine for saved desktop nodes, but the QR scan branch is not app-owned. `ConnectionScreen` exposes **Scan QR**, `MainActivity` routes that click to `AndroidExternalActions.startQrScan()`, and that method starts a third-party ZXing-compatible external intent (`com.google.zxing.client.android.SCAN`). If no installed app handles that exact legacy action, the app shows the user's screenshot text: "No compatible QR scanner app is installed." The Android manifest has no `CAMERA` permission and the APK has no bundled scanner activity, so the installed app cannot scan on its own.

The saved-node open branch reaches the desktop node and serves `/mobile`; ADB reproduced the exact `Error 500: Cannot read properties of undefined (reading 'localeCompare')`. The failure is in the mobile web recent-work catalog, not in native Android. `useMobileWorkCatalog.ts` maps agent runs with `lastActivityAt: run.createdAt`, but maps team runs with `lastActivityAt: run.lastActivityAt` and status from `run.lastKnownStatus`. The active GraphQL query and `TeamRunHistoryItem` type provide `createdAt` and `status`, not `lastActivityAt` or `lastKnownStatus`. Live data from the desktop node has 52 team runs with `createdAt` and no `lastActivityAt`; the catalog sorter then calls `undefined.localeCompare(...)`.

Constraints that the target design must respect:

- Android remains a WebView shell for existing `/mobile`; it must not duplicate pairing/session/run/chat behavior natively.
- The existing `ConnectionInputResolver` / `PairingLinkParser` boundary is the correct owner for turning scanned/pasted/shared text into a node profile and WebView URL.
- `AndroidExternalActions` should remain the owner for true external app/link actions, not in-app camera scanning.
- The mobile web run-history catalog should follow the current query/type contract instead of adding compatibility-only old fields.

## Intended Change

Add a dedicated Android QR scan coordinator that owns camera permission, app-owned scan launch, scan cancellation, and scan result extraction, then feeds decoded text back into the existing input submission path. Remove the external scanner dependency from the **Scan QR** behavior.

Fix the mobile web catalog team-run projection so it uses `run.createdAt` as `MobileWorkContext.lastActivityAt` and derives status label from `run.status`. Add regression coverage using query-shaped team-run data with no `lastActivityAt` / `lastKnownStatus`. The delivered state must rebuild/repackage the desktop-served `/mobile` assets from this corrected source so Android WebView receives the latest mobile web code; the Android APK must also be rebuilt/reinstalled for the scanner change.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change
- Current design issue found (`Yes`/`No`/`Unclear`): Yes, narrow.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`):
  - Android QR: Boundary Or Ownership Issue / File Placement Or Responsibility Drift if camera scanning stays in `AndroidExternalActions`.
  - Mobile web: Local Implementation Defect caused by stale team-run DTO field assumptions.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, narrow Android refactor only.
- Evidence: `AndroidExternalActions.kt` external scan intent lines 15-29; manifest no `CAMERA`; ADB reports no ZXing scan activity; `useMobileWorkCatalog.ts` reads `run.lastActivityAt`; GraphQL query/type expose `createdAt`; live ADB launch reproduced Error 500.
- Design response: Introduce `QrScanCoordinator` as app-owned scanner boundary; keep decoded text flowing to `ConnectionInputResolver`; correct web catalog mapping and tests.
- Refactor rationale: Placing in-app camera scan logic in `AndroidExternalActions` would make that file own both external links and internal camera permission/scanner lifecycle. A dedicated coordinator keeps the first-run QR setup concern explicit and testable.
- Intentional deferrals and residual risk, if any: Broader GraphQL generated-type cleanup is deferred. The in-scope web fix uses the handwritten store/query contract directly; if generated types are stale, that should be handled only if a test/build gate requires it.

## Terminology

- `Android setup shell`: native Android screens and orchestration before/around the WebView.
- `QR scan coordinator`: app-owned Android boundary for camera permission, scan launch, scan result/cancel handling.
- `Connection input resolver`: existing Android policy that turns QR/link/manual text into a `SavedNodeProfile` and WebView URL.
- `Mobile work catalog`: web composable that projects run history, definitions, and workspaces into phone Home/context-switcher list items.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the **Scan QR** button's dependency on the external ZXing scanner intent. Do not keep the old external-scanner path as the steady-state fallback for this in-scope behavior.
- Treat removal as first-class design work: the manifest query for `com.google.zxing.client.android.SCAN` becomes obsolete once app-owned scanning is used and should be removed unless the scanner dependency's own manifest merge requires something different.
- Decision rule: the design does not preserve two scanner paths. Failure to start app-owned scan is a diagnostic, not a fallback to the legacy external scanner lookup.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Android **Scan QR** button | WebView loads parsed `/mobile?pairing=...` or saved `/mobile` URL | Android setup shell, with QR scan coordinator owning scan lifecycle | Replaces broken third-party scanner dependency while preserving existing input policy. |
| DS-002 | Primary End-to-End | Android app launch with saved node | Mobile Home/recent-work catalog renders | Existing saved-node/WebView spine plus mobile work catalog | Covers the Error 500 reported after opening saved node. |
| DS-003 | Return-Event | Camera permission or scan result callback | Connection screen diagnostic or decoded QR submission | QR scan coordinator | Ensures permission denial/cancel/result handling is explicit and testable. |
| DS-004 | Bounded Local | Run-history team-run DTO | Sorted `MobileWorkListItem[]` | Mobile work catalog | Prevents `undefined.localeCompare` from crashing `/mobile`. |

## Primary Execution Spine(s)

- DS-001: `ConnectionScreen.Scan QR -> MainActivity -> QrScanCoordinator -> Bundled scanner activity/camera -> MainActivity result callback -> QrScanCoordinator result extraction -> MainActivity.submitInput -> ConnectionInputResolver/PairingLinkParser -> ConnectionValidator -> AutoByteusWebView`
- DS-002: `MainActivity.onCreate -> SavedNodeStore -> ConnectionValidator(/rest/remote-access/status) -> AutoByteusWebView -> /mobile MobileRemoteAccessShell -> useMobileWorkCatalog -> MobileHome/ContextSwitcher`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The user taps **Scan QR**; Android owns scanner permission and launch; decoded QR text is submitted into the same existing text resolver used by paste/share/manual entry; validation then opens the trusted WebView URL. | Connection screen, MainActivity, QR scan coordinator, connection input resolver, validator, WebView | Android setup shell | Camera permission, scanner dependency, QR cancellation diagnostics |
| DS-002 | On app launch, saved profile validation succeeds; the WebView loads `/mobile`; mobile web builds recent work list from run history without assuming missing fields. | MainActivity, saved-node store, validator, WebView, mobile shell, mobile work catalog | Android shell for native open; mobile work catalog for web projection | Remote status, GraphQL query shape, sort guard |
| DS-003 | Android permission and scanner callbacks return to `MainActivity`, which delegates to the QR coordinator; the coordinator either emits decoded text or an actionable diagnostic. | MainActivity callback, QR scan coordinator, connection screen diagnostic | QR scan coordinator | Runtime permission result, cancelled/empty scan |
| DS-004 | The catalog maps each run-history item to a mobile context with a guaranteed string activity time before sorting. | `TeamRunHistoryItem`, `MobileWorkContext`, sorter | Mobile work catalog | Query-contract alignment, tests using current DTO shape |

## Spine Actors / Main-Line Nodes

- `ConnectionScreen`: native setup UI; exposes scan/paste/manual entry.
- `MainActivity`: native lifecycle and high-level orchestration; wires callbacks and delegates to owners.
- `QrScanCoordinator`: QR scan lifecycle, camera permission, scanner result/cancel diagnostics.
- `ConnectionInputResolver` / `PairingLinkParser`: authoritative Android text-to-profile/WebView URL policy.
- `ConnectionValidator`: reachable/Phone Access check before WebView open.
- `AutoByteusWebView`: trusted WebView containment for saved origin.
- `MobileRemoteAccessShell`: `/mobile` root shell.
- `useMobileWorkCatalog`: mobile web catalog projection owner.

## Ownership Map

- `ConnectionScreen` owns rendering native setup actions and collecting user text/acknowledgement. It does not parse pairing payloads or launch camera directly.
- `MainActivity` owns Android activity lifecycle, callback wiring, saved-node opening, and orchestration between native owners. It should remain thin around scanner details.
- `QrScanCoordinator` owns camera permission request, scanner launch, result/cancel handling, and scanner-specific diagnostics. It must not parse AutoByteus URLs or save profiles.
- `ConnectionInputResolver` / `PairingLinkParser` own input parsing/normalization policy for all text sources.
- `AndroidExternalActions` owns true external actions such as opening Tailscale or opening a URL in another app. It must not own in-app camera scanning.
- `useMobileWorkCatalog` owns projection from stores/query-shaped run history to mobile list items. It must guarantee required `MobileWorkContext` fields are present before sorting.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ConnectionScreen.Callbacks.onScanQr` | `QrScanCoordinator` via `MainActivity` | UI callback from rendered setup screen | Camera permission, QR parsing, node validation |
| `MainActivity.onActivityResult` / `onRequestPermissionsResult` | `QrScanCoordinator` for QR cases; `WebFileChooserCoordinator` for file chooser cases | Android framework callbacks centralize at Activity | Scanner parsing policy beyond delegation |
| `MobileRemoteAccessShell` template | `useMobileWorkCatalog` for catalog data | Renders mobile shell and passes catalog state to children | Run-history field normalization |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| External QR scanner intent launch in `AndroidExternalActions.startQrScan()` | Broken on devices without ZXing-compatible third-party scanner; scan is app-owned setup behavior | `QrScanCoordinator` + bundled scanner dependency | In This Change | Remove method or leave no QR behavior in `AndroidExternalActions`. |
| Manifest `<queries>` entry for `com.google.zxing.client.android.SCAN` | No longer launching external scanner apps | App-owned scanner activity/dependency | In This Change | Keep only if implementation proves the bundled dependency requires it, which is not expected. |
| Tests/mocks that only pass stale `lastActivityAt` / `lastKnownStatus` for mobile team run history | They mask the current query contract and failed to catch the bug | Query-shaped web regression test using `createdAt` / `status` | In This Change | Update existing stale mobile catalog test and/or add focused composable test. |

## Return Or Event Spine(s) (If Applicable)

- DS-003 permission return: `Android permission dialog -> MainActivity.onRequestPermissionsResult -> QrScanCoordinator.handleRequestPermissionsResult -> launch scanner or emit diagnostic -> ConnectionScreen`.
- DS-003 scan return: `Bundled scanner activity -> MainActivity.onActivityResult -> QrScanCoordinator.handleActivityResult -> onQrText(decoded) or diagnostic -> MainActivity.submitInput/showConnection`.

## Bounded Local / Internal Spines (If Applicable)

- `QrScanCoordinator` local spine: `startQrScan -> ensureCameraPermission -> launchScanner -> handleActivityResult/handleRequestPermissionsResult`. This matters because permission/cancel handling is the scanner owner's state machine and must not leak into input parsing.
- `useMobileWorkCatalog` local spine: `store workspaceGroups -> map agent/team run contexts -> normalize activity time -> sort active/recent -> expose recentWorkItems`. This matters because every item must have a stable sort key before calling `localeCompare`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Bundled scanner dependency | DS-001, DS-003 | `QrScanCoordinator` | Provide QR camera UI/decoding inside the APK | Avoid third-party app dependency | If exposed through general external actions, scanner lifecycle and external-link policy mix. |
| Camera permission diagnostic | DS-003 | `QrScanCoordinator` | Explain permission denial and paste/manual fallback | Required Android runtime permission UX | If hidden in `MainActivity`, scanner callback logic becomes fragmented. |
| URL/pairing parsing | DS-001 | `ConnectionInputResolver` | Parse URL/base64/JSON/manual inputs | Existing authoritative input policy | If duplicated in QR coordinator, scan and paste could diverge. |
| Mobile catalog sort guard | DS-004 | `useMobileWorkCatalog` | Ensure string sort keys before `localeCompare` | Prevent runtime crashes from malformed/stale data | If spread to UI components, each component would need defensive sorting. |
| Focused member selection | DS-004 | `useMobileWorkCatalog` | Choose remembered/coordinator/first team member route key | Existing mobile team context behavior | If moved to Home UI, context switching logic fragments. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Decode QR to text | Android shell setup | Extend with new coordinator | Scan lifecycle is native setup behavior | Existing `AndroidExternalActions` is for external apps/links, not camera. |
| Parse QR/link/manual payload | `ConnectionInputResolver` / `PairingLinkParser` | Reuse | Already handles all Phone Access input shapes | N/A |
| Open Tailscale/browser | `AndroidExternalActions` | Reuse unchanged | Still true external actions | N/A |
| Saved-node validation/open | `ConnectionValidator` / `MainActivity` / `AutoByteusWebView` | Reuse | Existing spine is correct and ADB shows status check works | N/A |
| Mobile recent-work projection | `useMobileWorkCatalog` | Extend/fix | It already owns catalog projection | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Android native setup shell (`autobyteus-android/.../shell`) | QR scan lifecycle, external actions, input submission callback wiring | DS-001, DS-003 | MainActivity / ConnectionScreen | Extend | Add `QrScanCoordinator`; keep `AndroidExternalActions` focused. |
| Android connection policy (`autobyteus-android/.../connection`) | URL normalization, pairing parser, diagnostics, saved profiles, validation | DS-001, DS-002 | MainActivity | Reuse | Add diagnostic copy only if needed. |
| Android WebView containment (`autobyteus-android/.../web`, `ui`) | WebView security/file chooser/diagnostic overlay | DS-002 | AutoByteusWebView / WebShellScreen | Reuse | No scanner behavior here. |
| Web mobile catalog (`autobyteus-web/composables/mobile`) | Recent work and context switcher projection | DS-002, DS-004 | MobileRemoteAccessShell | Extend/fix | Correct team-run mapping and guard sort key. |
| Web tests (`autobyteus-web/.../__tests__`) | Mobile catalog regression coverage | DS-004 | Test suite | Extend | Add query-shaped team-run regression. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `QrScanCoordinator.kt` | Android native setup shell | QR scan coordinator | Camera permission, app-owned scanner launch, QR result/cancel handling | One lifecycle owner for scanner callbacks | Uses `ConnectionDiagnosticMapper`; does not parse URLs |
| `AndroidExternalActions.kt` | Android native setup shell | External actions | Tailscale/browser external launch only | Keeps external app actions separate | N/A |
| `MainActivity.kt` | Android native setup shell | Activity orchestration | Instantiate/wire QR coordinator; delegate permission/activity results; submit decoded text | Activity is framework callback boundary | Reuses connection resolver/validator |
| `useMobileWorkCatalog.ts` | Web mobile catalog | Catalog projection | Map current run-history DTO fields into mobile contexts and sort safely | Existing projection owner | Uses `MobileWorkContext` |
| `useMobileWorkCatalog.spec.ts` or existing mobile regression spec | Web tests | Regression coverage | Query-shaped team-run recent list does not throw | Focused coverage prevents recurrence | Uses Pinia stores |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| QR scan request/permission constants | Keep in `QrScanCoordinator.kt` companion | Android native setup shell | Only scanner owner needs them; tests reference through owner | Yes | Yes | Generic request-code constants file |
| Activity-time extraction for mobile contexts | Local helper in `useMobileWorkCatalog.ts` | Web mobile catalog | Only catalog sorting needs it | Yes | Yes | Broad run-history compatibility adapter |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `MobileWorkContext.lastActivityAt` | Yes, string sort/display timestamp for run contexts | Yes | Low after fix | Populate from `createdAt` for current history run/team DTOs. |
| `TeamRunHistoryItem` | Yes in current handwritten type (`createdAt`, `status`) | Yes | Medium due stale test/generated assumptions | Do not read nonexistent `lastActivityAt` / `lastKnownStatus`; update tests. |
| Android QR scan result text | Yes, decoded raw QR payload/link text | Yes | Low | Pass to `ConnectionInputResolver`; do not create separate QR payload DTO. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/shell/QrScanCoordinator.kt` | Android native setup shell | QR scan coordinator | Own camera permission, scanner launch, result/cancel diagnostics, decoded text callback | Scanner lifecycle is a single bounded owner | `ConnectionDiagnosticMapper` |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/shell/AndroidExternalActions.kt` | Android native setup shell | External actions | Open Tailscale and external URLs only | Name and responsibility align | N/A |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/MainActivity.kt` | Android native setup shell | Activity orchestration | Wire QR coordinator and delegate framework callbacks; submit decoded scan text | Activity remains framework boundary | Existing resolver/validator/store |
| `autobyteus-android/app/src/main/AndroidManifest.xml` | Android app package | Permission/activity declarations | Add `CAMERA`; remove external scanner query | Manifest owns Android permissions | N/A |
| `autobyteus-android/app/build.gradle.kts` | Android build | App dependencies | Add bundled QR scanner dependency | Module-level dependency owner | N/A |
| `autobyteus-android/app/src/androidTest/java/org/autobyteus/mobile/AutoByteusMobileShellSmokeTest.kt` | Android validation | Smoke/instrumentation tests | Update QR request-code owner; add coordinator edge checks if feasible | Existing Android smoke suite | QrScanCoordinator constants/API |
| `autobyteus-web/composables/mobile/useMobileWorkCatalog.ts` | Web mobile catalog | Catalog projection | Use `createdAt`/`status` for team runs; safe activity-time sort | Existing projection owner | `MobileWorkContext` |
| `autobyteus-web/composables/mobile/__tests__/useMobileWorkCatalog.spec.ts` | Web validation | Focused composable test | Query-shaped team run without `lastActivityAt` does not throw | Focused regression for source of crash | Pinia stores |
| `autobyteus-web/components/mobile/__tests__/MobileContextSelectionRegression.spec.ts` | Web validation | Existing mobile regression test | Remove stale team-run fields in direct catalog test, or assert createdAt mapping | Prevent old mock shape from masking bug | Pinia stores |

## Ownership Boundaries

Authority changes hands at these points:

- `ConnectionScreen` hands a scan command to `MainActivity`; `MainActivity` delegates scanner details to `QrScanCoordinator`.
- `QrScanCoordinator` hands decoded text back to `MainActivity`; `MainActivity` delegates parsing to `ConnectionInputResolver`.
- `ConnectionInputResolver` hands a parsed profile/WebView URL to `MainActivity`; `MainActivity` delegates reachability to `ConnectionValidator` and web containment to `AutoByteusWebView`.
- The web `/mobile` shell hands run-history store state to `useMobileWorkCatalog`; components receive already-normalized list items and should not normalize run-history DTO fields themselves.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `QrScanCoordinator` | Camera permission, scanner intent/activity launch, result/cancel handling | `MainActivity`, `ConnectionScreen` callback | `AndroidExternalActions` starting camera scan directly; UI launching scanner | Add explicit coordinator methods/callbacks |
| `ConnectionInputResolver` | `PairingLinkParser`, `NodeUrlNormalizer`, HTTP acknowledgement policy | `MainActivity` for scan/paste/share/manual text | QR coordinator parsing pairing payloads itself | Add resolver capability, not duplicate parsing |
| `useMobileWorkCatalog` | Run-history-to-mobile-context mapping, focus fallback, sorting | `MobileRemoteAccessShell`, `MobileRuns`, run setup components | Components reading raw `TeamRunHistoryItem.lastActivityAt` | Strengthen composable helper/test |
| `AndroidExternalActions` | External app/browser intents | `MainActivity` | In-app scanner/camera logic under external action owner | Move to QR coordinator |

## Dependency Rules

- `MainActivity` may depend on `QrScanCoordinator`, `AndroidExternalActions`, `ConnectionInputResolver`, `ConnectionValidator`, and WebView owners.
- `QrScanCoordinator` may depend on Android framework scanner/permission APIs, the bundled scanner library, and `ConnectionDiagnosticMapper`; it must not depend on `SavedNodeStore`, `ConnectionValidator`, WebView, or web/mobile code.
- `ConnectionInputResolver` remains independent of scanner implementation details.
- `AndroidExternalActions` must not depend on scanner/camera APIs after this change.
- `useMobileWorkCatalog` may depend on stores and mobile work types; UI components should not sort raw run-history DTOs.
- Forbidden shortcuts: external scanner fallback for the in-scope Scan QR behavior; QR coordinator parsing AutoByteus pairing payloads; mobile components compensating for raw run-history field mismatches.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `QrScanCoordinator.startQrScan()` | QR scan command | Start permission/scanner flow | None | Emits diagnostics via callback. |
| `QrScanCoordinator.handleActivityResult(requestCode, resultCode, data)` | QR scan result | Consume QR scanner result if request code matches | Android request code + `Intent` | Returns boolean handled; decoded text via callback. |
| `QrScanCoordinator.handleRequestPermissionsResult(requestCode, permissions, grantResults)` | QR camera permission | Consume camera permission result if request code matches | Android request code + permission result arrays | Returns boolean handled. |
| `ConnectionInputResolver.resolve(rawText, httpAcknowledged)` | AutoByteus node/pairing input | Parse and validate text source into profile/WebView URL | Raw QR/link/manual text | Used by scan/paste/share/manual. |
| `ListWorkspaceRunHistory` | Run-history catalog query | Provide current run/team DTOs | Workspace groups; team runs have `createdAt`/`status` | Do not require `lastActivityAt` here. |
| `useMobileWorkCatalog().recentWorkItems` | Mobile catalog projection | Expose sorted mobile list items | Store state | Must not throw on current DTO shape. |

Rule:
- Do not use one generic boundary when the subject or identity meaning differs.
- Split boundaries by subject or require an explicit compound identity shape.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `QrScanCoordinator.startQrScan` | Yes | Yes | Low | New method. |
| `QrScanCoordinator.handleActivityResult` | Yes | Yes | Low | Use scanner-specific request code. |
| `ConnectionInputResolver.resolve` | Yes | Yes | Low | Reuse unchanged. |
| `useMobileWorkCatalog().recentWorkItems` | Yes | Yes | Low after fix | Use explicit team fields. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| QR scan lifecycle | `QrScanCoordinator` | Yes | Low | New file/class. |
| External actions | `AndroidExternalActions` | Yes if QR removed | Medium now | Remove scan responsibility. |
| Mobile catalog projection | `useMobileWorkCatalog` | Yes | Low | Fix internals. |
| Activity timestamp | `lastActivityAt` in `MobileWorkContext` | Yes | Low after fix | Populate from current DTO `createdAt`. |

## Applied Patterns (If Any)

- Coordinator: `QrScanCoordinator` coordinates Android permission/result callback lifecycle inside one owner.
- Adapter/projection: `useMobileWorkCatalog` adapts store/query data into mobile UI list items.
- Existing parser boundary: `ConnectionInputResolver` remains the policy owner for all text input shapes.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/shell/QrScanCoordinator.kt` | File | QR scan coordinator | Camera permission, scan launch, result/cancel diagnostics | Shell package already owns native setup orchestration | URL parsing, profile persistence, WebView behavior |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/shell/AndroidExternalActions.kt` | File | External actions | Tailscale/browser external intents | Existing owner for external interactions | QR/camera scanning |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/MainActivity.kt` | File | Activity orchestration | Instantiate/wire QR coordinator, delegate callbacks | Android framework entrypoint | Scanner implementation details beyond delegation |
| `autobyteus-android/app/src/main/AndroidManifest.xml` | File | Android package | Camera permission, app components, external queries | Android manifest | Obsolete external scanner query |
| `autobyteus-android/app/build.gradle.kts` | File | Android build | Scanner dependency | Module dependency configuration | Business logic |
| `autobyteus-web/composables/mobile/useMobileWorkCatalog.ts` | File | Mobile work catalog | Team/agent/workspace list projection | Existing composable owner | Raw UI rendering, GraphQL query definitions |
| `autobyteus-web/composables/mobile/__tests__/useMobileWorkCatalog.spec.ts` | File | Web validation | Focused catalog regression | Test near composable | Full component navigation tests |
| `autobyteus-web/components/mobile/__tests__/MobileContextSelectionRegression.spec.ts` | File | Web validation | Existing integrated mobile context regression | Already covers remembered team focus | Stale DTO fields that mask bug |

Rules:
- The layout can remain compact; the Android shell already has clear packages (`shell`, `connection`, `web`, `ui`) and this change adds one focused file rather than a new nested module.
- The mobile web fix is local to an existing composable owner; creating a new run-history adapter subsystem would over-split this narrow bug fix.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-android/.../shell` | Main-Line Domain-Control | Yes | Low | Setup shell orchestration and scanner coordinator belong here. |
| `autobyteus-android/.../connection` | Main-Line Domain-Control / validation | Yes | Low | Existing parser/validator remains unchanged. |
| `autobyteus-web/composables/mobile` | Off-Spine Concern serving mobile shell | Yes | Low | Catalog projection is composable-owned. |
| `autobyteus-web/components/mobile/__tests__` | Validation | Yes | Low | Existing integration tests; update stale mock if touched. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| QR scanner ownership | `onScanQr -> qrScanCoordinator.startQrScan(); decoded -> submitInput(decoded, false)` | `AndroidExternalActions.startQrScan()` launching legacy third-party intent and parsing fallback text | Keeps scanner lifecycle app-owned while preserving parser policy. |
| Team-run timestamp mapping | `lastActivityAt: run.createdAt` for `TeamRunHistoryItem` from `ListWorkspaceRunHistory` | `lastActivityAt: run.lastActivityAt` when query/type do not expose it | Prevents `undefined.localeCompare`. |
| Scanner failure | Permission denied -> `ConnectionDiagnosticMapper.invalidUrl("Camera permission is needed...")` and paste remains available | Fall back to external scanner lookup with old "No compatible scanner" warning | The in-scope product behavior is app-owned scanning. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep external ZXing scanner intent as fallback | Existing MVP behavior and docs used it | Rejected | App-owned scanner dependency/coordinator; scanner startup failure becomes diagnostic. |
| Add `lastActivityAt` fallback to query or accept both old/new team-run shapes as authoritative | Could avoid changing mapper assumptions | Rejected for this scope | Use current query/type contract (`createdAt`, `status`) and update stale tests. |
| Native Android pairing protocol duplicate after scan | Could bypass web pairing page | Rejected | Decoded QR text goes into existing `ConnectionInputResolver` and WebView `/mobile?pairing=` path. |

Hard block:
- Any design that depends on backward-compatibility wrappers, dual-path behavior, or retained legacy flow for in-scope replaced behavior fails review.

## Derived Layering (If Useful)

- Android UI layer: `ConnectionScreen`, `WebShellScreen`.
- Android orchestration layer: `MainActivity`, `QrScanCoordinator`, `AndroidExternalActions`.
- Android connection policy layer: `ConnectionInputResolver`, `PairingLinkParser`, `NodeUrlNormalizer`, `ConnectionValidator`, `SavedNodeStore`.
- Web projection layer: `useMobileWorkCatalog`.

Layering is explanatory only; dependency direction follows ownership above.

## Migration / Refactor Sequence

1. Add bundled scanner dependency to `autobyteus-android/app/build.gradle.kts`.
2. Add `android.permission.CAMERA` to the Android manifest; remove obsolete external ZXing scan `<queries>` entry unless implementation proves it is still required.
3. Add `QrScanCoordinator.kt` with request-code constants, permission request handling, scanner launch, cancellation/empty-result diagnostics, and decoded text callback.
4. Update `MainActivity`:
   - instantiate `QrScanCoordinator` with `onQrText = { submitInput(it, false) }` and diagnostic callback;
   - route `onScanQr` to coordinator;
   - delegate `onActivityResult` to file chooser first, then QR coordinator (or preserve the existing file chooser-first rule with distinct request codes);
   - override/delegate `onRequestPermissionsResult` for QR camera permission.
5. Remove QR scan method/constants/imports from `AndroidExternalActions`; keep Tailscale/browser methods.
6. Update Android instrumentation/unit tests for request-code distinctness and coordinator result/cancel/permission behavior. If scanner UI cannot be exercised in instrumentation, test the coordinator's callback handling and leave live camera scan to API/E2E.
7. Fix `useMobileWorkCatalog.ts`:
   - team run `lastActivityAt` should come from `run.createdAt`;
   - team run status label should use `run.status`;
   - sort helper should coerce activity timestamp to `''` defensively before `localeCompare`.
8. Add/update web tests with query-shaped team-run data (`createdAt`/`status`, no `lastActivityAt`/`lastKnownStatus`) and assert `recentWorkItems` does not throw and has expected timestamp/focus.
9. Rebuild the mobile web assets served by the desktop node (for example `pnpm -C autobyteus-web build:mobile-web` or the release packaging path that embeds the same corrected `/mobile` bundle), then restart/reload the desktop node used for Android validation.
10. Run focused web and Android checks.
11. Build/install the updated APK on the connected device, validate **Scan QR** opens camera scan UI, validate saved-node open loads the rebuilt `/mobile` bundle and no longer displays Error 500, and capture ADB evidence.
12. If producing a release artifact rather than only a debug validation build, bump or explicitly record the Android `versionCode`/`versionName` decision in delivery evidence.

## Key Tradeoffs

- Bundled scanner dependency vs. custom Camera2/CameraX implementation: bundled scanner is preferred because this task needs a reliable QR scan path without growing a custom camera subsystem. It is bounded behind `QrScanCoordinator` so the dependency does not leak.
- Defensive sort guard vs. schema fallback: a local string guard is acceptable to prevent UI crashes, but the main fix is to map the correct current field (`createdAt`). Do not treat `lastActivityAt` and `createdAt` as two parallel authoritative team-run fields in this surface.
- Keeping Android framework `onActivityResult` vs. Activity Result API migration: keep the current callback style for this narrow shell unless implementation finds a hard blocker, because file chooser already uses it and the design's focus is ownership, not Android API modernization.

## Risks

- Scanner dependency manifest/permission behavior may differ under targetSdk 35; mitigate by pre-requesting camera permission in `QrScanCoordinator` and testing on the connected device.
- ADB validation can prove saved-node Error 500 resolution; real camera QR scan validation requires the QR visible to the phone camera.
- Updating stale mobile tests may reveal other mocks that used old run-history shapes; keep fixes scoped to tests exercised by the changed composable.

## Guidance For Implementation

- Do not parse pairing URLs inside `QrScanCoordinator`; emit raw decoded text only.
- Keep file chooser result handling first or otherwise explicitly prove file chooser and QR request codes cannot collide.
- Preferred scanner dependency: `implementation("com.journeyapps:zxing-android-embedded:4.3.0")`, based on Maven Central metadata fetched during investigation. If implementation selects another dependency, keep the same coordinator boundary and record rationale.
- Suggested checks:
  - `pnpm -C autobyteus-web exec vitest run composables/mobile/__tests__/useMobileWorkCatalog.spec.ts components/mobile/__tests__/MobileContextSelectionRegression.spec.ts`
  - `pnpm -C autobyteus-web build:mobile-web` or the equivalent desktop release packaging command that serves the corrected `/mobile` bundle
  - `ANDROID_HOME=/Users/normy/Library/Android/sdk gradle -p autobyteus-android :app:testDebugUnitTest :app:assembleDebug :app:compileDebugAndroidTestKotlin`
  - `adb install -r autobyteus-android/app/build/outputs/apk/debug/app-debug.apk`
  - `adb shell am start -n org.autobyteus.mobile/.MainActivity`
  - ADB UI dump/screenshot confirming no `localeCompare` Error 500 after saved-node open.
  - Manual/ADB-assisted camera validation confirming **Scan QR** opens the in-app scanner UI and a valid QR routes to existing pairing input.
