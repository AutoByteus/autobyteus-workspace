# Code Review Report — phone VNC Viewer: full screen in landscape, as large as possible (autobyteus-432)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-003, Approved within the direction)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (L-01 … L-12), as cited by the design
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-003, Ready)
- Supplemental Task Artifacts Reviewed As Context: none behavior-defining; evidence read as cited by the handoff
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-003, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001, ARCH-REV-002, ARCH-REV-003
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Trigger: Implementation Engineer handoff IR-002 (Medium/High, Code Review route)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: `1`
- Failure-origin and delivery fields: N/A

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-viewer-landscape-fullscreen`, branch `codex/phone-viewer-landscape-fullscreen`, base `origin/personal` @ `eebbc2b8ee`, reviewed at `d76be54fb0` (source at `6b05106fb0`).

## Routing Classification Review

- Task size: `Medium`; Architectural risk: `High`; route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. The change adds a message to the page↔app contract and new Android window and orientation lifecycle behavior. The size is two web composables, one view, one Android controller, a bridge message and a reset rule.

## Review Scope

- Changed implementation and behavior reviewed: the full source diff `origin/personal...HEAD`, excluding `tickets/`.
- Files / areas reviewed:
  - Android: `ui/DesktopFullScreenController.kt`, `web/ShellBridge.kt`, `MainActivity.kt` (every `setContentView`, host destroy and `showPage` caller: lines 140, 200, 251, 256).
  - Web: `utils/remoteAccess/shellBridge.ts`, `composables/mobile/{useDesktopFullScreenDisplay,useNodeDesktopZoom}.ts`, `components/mobile/views/MobileNodeDesktop.vue`.
  - Tests: controller, bridge and manifest JVM tests (names); `useDesktopFullScreenDisplay`, zoom and view specs (names and key cases).
- Explicit exclusions: I reran no checks; all were recorded on the commits that contain the code they exercise. For docs (`remote_access.md`, `android_mobile_access.md`, the Android README, GLOSSARY, `design-cases.md` Case 18) I checked only that the diffs exist.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: `Yes`
- Design-spec behavior map verified against the implementation: `Yes`
- Design review report and round confirmed: ARCH-REV-003 Pass
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None
- Remaining material ambiguity: None

| Behavior ID | Status | Current Implementation Path And Lifecycle Evidence |
| --- | --- | --- |
| BEH-001 (REQ-001, 003) | Confirmed | Full screen button → `full=1` → `watch(fullScreen, apply, { immediate: true })` → `useDesktopFullScreenDisplay.apply(true)`. The app branch sends `getShellBridge().desktopFullScreen(true)`; `ShellBridgeMessages.read` accepts it only if `on` is a JSON boolean, under the existing main-frame/origin rule; then `Actions.onDesktopFullScreen` → `setOn(true)`: `SENSOR_LANDSCAPE`, bars hidden by transient swipe, root darkened. |
| BEH-002 (REQ-002) | Confirmed | Exits remove `full`, and the watcher sends `apply(false)`. D-2 is one owner: `showScreen(view)` (reset, then `setContentView`) on every non-page screen; `destroyWebHost()` (reset, then destroy) in `onDestroy`/`openPage`/`closePage`; `onPageStarted` reset. `showPage` is the only direct `setContentView`, and its callers come only from non-page screens, which already reset, or from the "connected" screen. |
| REQ-002 / AC-004 | Confirmed | `isOn` is read from `requestedOrientation`, so a recreated activity that inherited `SENSOR_LANDSCAPE` is handed back by the first reset (`openPage` → `showScreen` or `onPageStarted`). The JVM test covers this ("aNewControllerOnAWindowLeftInLandscapeHandsItBackOnReset"). |
| BEH-003 (REQ-004) | Confirmed | Double tap → `toggleFill`. At fit, cover = max(layer/box) per axis, centred; otherwise back to Fit. `offset()` keeps the picture covering the layer along an axis where it is larger and centres it where it is smaller. At scale 1 both offsets come out as 0, so S3's pinch and pan are unchanged. |
| BEH-004 (REQ-005) | Confirmed | Strip `v-if="fullScreen"` in both modes with Show controls; in Control while connected it also has Keyboard (`openKeyboard`, focus inside the tap) and Clipboard (existing sheet). The View only tap exit is kept. |
| REQ-006 | Confirmed | Browser branch: `requestFullscreen()` then `orientation.lock('landscape')`, both rejections caught. A grant that arrives after `wanted=false` is left at once. `fullscreenchange` to none → `onBrowserExit` → `navigation.back()`. On unmount the listener is removed before `apply(false)`, so leaving the view does not navigate back. |
| REQ-007 | Confirmed | No manifest or Gradle change; manifest test |
| Preserved (415, 277, keyboard and Clipboard, S3 rules, `full=1` and Back order) | Confirmed | `SystemBarInsets` and the route code are untouched; Control stays at fit (no gesture layer, transform `none`) |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related | Kind | Actor | Goal / Event | Entry Surface | Shape | Forward Path | Expected Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | REQ-001…005 | User | User, Android app | See the desktop as large as possible; leave full screen again | Viewer full screen button; exits | Normal | DS-001 app branch | Landscape and no bars while on; portrait and bars after | AC-001/002/005 evidence | Supported Normal Scenario | Use |
| SCN-002 | REQ-002 | System | Android lifecycle | Background / process death while on | Home; Android ends the app | Normal | Controller reads the window; D-2 resets | Consistent with the page | AC-004 evidence; JVM test | Supported Normal Scenario | Use |
| SCN-003 | REQ-004 | User | User, View only | See more of the picture | Double tap | Normal | DS-002 | Fill covers, pan, Fit | AC-003 | Supported Normal Scenario | Use |
| SCN-004 | REQ-006 | User | User, browser | Same without the app | `/mobile` full screen | Normal | browser branch | Browser full screen; the route follows its exit | AC-006 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation | Scenario / Contract | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason / Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CR-C-01 | `pageShown()` saves the current root colour as "before". If the root were already dark, it would save dark and give dark back. | D-2 / AR-432-005 | `showPage` while on with the page root already darkened | `showPage` is called only after a non-page screen (which already reset, so it is off) or after the "connected" screen (a different root, its own colour). The page root is never darkened twice. | `MainActivity.kt:140,200,251,256` and `showScreen` | Reject | — | Not reachable. |
| CR-C-02 | No guard on `setOn(true)` while a non-page screen shows. The page, kept alive behind the node list, could ask for full screen. | REQ-002 | The page changes its route to `full=1` while hidden | The route changes only through a user action inside the visible page. The restored-page case is intended (AC-004, handoff "No guard"). | Code read; handoff | Reject | — | Contrived; the guard would break AC-004's restore. |
| CR-C-03 | After a D-2 reset that does not restart the page (the diagnostic screen over the page), `full=1` can remain with the phone in portrait. | D-2 (`:329` in the design list) | Diagnostic shown during full screen | The page still shows its in-page full screen; Show controls or Back leaves it. | Design D-2; handoff Known Risks | Reject | — | This is the reset the design decided; no product consequence beyond in-page full screen. |
| CR-C-04 | On a browser Esc exit, `leaveBrowserFullScreen` returns early (`inBrowserFullScreen` already false), so `orientation.unlock()` is not called. | REQ-006 | Esc / system Back in a browser | Leaving the fullscreen document releases the orientation lock (Screen Orientation spec), so nothing stays locked. | Spec behavior; AC-006 | Reject | — | No consequence. |
| CR-C-05 | Fill box from noVNC's canvas size (`width`/`height` = the desktop's pixels) rather than the on-screen box. | DS-002 | Double tap / pan | noVNC fits and centres the canvas; the emulator numbers agree (Fill 1.178 = 863/733, vertical crop −73.4) | `ac003.txt`; zoom spec | Reject (no defect) | — | The settled decision is sound. |
| CR-C-06 | "Copy from the desktop" was empty after `xclip` on the node. | 426's Clipboard sheet (preserved) | — | Path untouched by this ticket; it also happens outside full screen; cause not established | handoff Known Risks | Hold for Evidence | — | Not a finding. API/E2E should retry with a copy inside an app on the node; if it fails, classify it then. |
| CR-C-07 | The Control strip covers about 260×28 CSS px of the desktop's top edge. | SR-003 (option A) | — | Decided by the designer and the architecture reviewer | design-review-report | Reject | — | Approved trade-off. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment preserved | Pass | One web owner with explicit branches; the existing bridge reused (no second shell object) | None |
| Matches approved behavior-defining artifacts | Pass | DS-001, DS-002, D-2 and SR-003 match the code as traced above | None |
| Data-flow spine clarity | Pass | Route → watcher → display → bridge → controller, one owner per node | None |
| Ownership boundary preservation | Pass | The controller is the only owner of orientation, bars and the root background; the `Display` port keeps Android types in an adapter. `useDesktopFullScreenDisplay` is the only sender. D-2 is in one method. | None |
| Off-spine concern clarity | Pass | Insets owner untouched | None |
| Existing capability reuse | Pass | ShellBridge, route state, keyboard bridge, Clipboard sheet | None |
| Reusable owned structures | Pass | `STAGE_COLOR` tied to the stage colour with a comment | None |
| Shared-structure tightness | Pass | `ShellBridgeAction.DesktopFullScreen(on)`; `Display` has three members | None |
| Repeated coordination ownership | Pass | Reset rule centralized (`showScreen` / `destroyWebHost`) | None |
| Empty indirection | Pass | `reset()` = `setOn(false)` is named for D-2's meaning | None |
| SoC / file responsibility | Pass | — | None |
| Dependency direction | Pass | The page knows only the message; the app knows only the action | None |
| Authoritative Boundary Rule | Pass | No direct `requestedOrientation` or bar calls outside the controller | None |
| File placement | Pass | `ui/` for the controller, `composables/mobile/` for the display | None |
| Flat-vs-over-split | Pass | — | None |
| Interface clarity | Pass | `{ type: 'desktopFullScreen', on: boolean }`; a non-boolean `on` is ignored | None |
| Naming / one vocabulary | Pass | "Desktop full screen" added to GLOSSARY under Node desktop | None |
| No unjustified duplication | Pass | — | None |
| Patch-on-patch control | Pass | `9d8552563e` replaced "remember the orientation" with "read from the window", not layered on top | None |
| Dead code removed in touched files | Pass | Old Control-only handle replaced by the strip | None |
| Test scenarios/assertions requirement-aligned | Pass | Bridge rules (main frame, origin, malformed), controller (idempotence, window state, root colour), display branches including the late grant and listener removal, Fill math, the strip in both modes | None |
| Test fixtures coherent | Pass | Fake `Display` | None |
| No stale/duplicate/compat-only tests | Pass | — | None |
| API/E2E readiness | Pass | Remaining coverage is named: API 34, a copy inside an app on the node for the Clipboard, the fresh-start build | None |

## Source File Size And Structure Audit (If Applicable)

| Source File | Before | After (non-empty) | `>500` | `>220` Delta | SoC | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `android MainActivity.kt` | 321 | 341 | Pass | Pass | Pass | Pass | — | None |
| `android ui/DesktopFullScreenController.kt` | 0 | 85 | Pass | Pass | Pass | Pass | — | None |
| `android web/ShellBridge.kt` | 88 | 92 | Pass | Pass | Pass | Pass | — | None |
| `web components/mobile/views/MobileNodeDesktop.vue` | 225 | 241 | Pass | Pass | Pass | Pass | — | None |
| `web composables/mobile/useNodeDesktopZoom.ts` | 167 | 204 | Pass | Pass | Pass | Pass | — | None |
| `web composables/mobile/useDesktopFullScreenDisplay.ts` | 0 | 61 | Pass | Pass | Pass | Pass | — | None |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | No old-app detection (DESIGN.md rule 9); an older app ignores the unknown message |
| No legacy retention | Pass | — |
| Dead code removed in touched files | Pass | — |
| Persisted-data decision followed | Pass | `Not Affected` |
| No dual reads/writes | Pass | — |
| Transition mechanics | Pass | N/A |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None.

## Docs-Impact Verdict

- Docs impact: `Yes`. Already updated: `autobyteus-web/docs/remote_access.md`, `docs/android_mobile_access.md`, `autobyteus-android/README.md`, `GLOSSARY.md`, `docs/design-cases.md` Case 18. Delivery verifies them in docs sync.

## Additional Material Premise Validation (When Required)

None new. The design's escalation triggers were checked against the evidence: the back gesture is usable (two swipes, Android's standard immersive behavior); there is no activity recreation on the orientation request (same pid); other frames are refused (JVM tests).

## Review Scorecard (Mandatory)

- Overall score: `9.4 / 10` (simple average)

| Priority | Category | Score | Why | What Is Weak | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | The route is the single source; the display follows it | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | One owner per platform concern; D-2 in one place; the `Display` port | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | One strictly typed message under the existing rule | — | — |
| 4 | Separation of Concerns and File Placement | 9.4 | — | `useNodeDesktopZoom` grows to 204 lines; still one concern | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | Small action and port | — | — |
| 6 | Naming Quality and Local Readability | 9.4 | Comments state the why (window state, canvas size) | The doc comment in `useNodeDesktopZoom` has one overlong line | — |
| 7 | API/E2E Readiness | 9.3 | Every AC checked on the emulator or in a browser | API 34, the Clipboard "copy from desktop" retry and the fresh-start build are still open | Cover them in API/E2E |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | Process death, late browser grant, listener ordering on unmount and the Fill math are all correct | The restored-page re-entry after process death is spec-only (drafts do not survive) | Optional device check |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | — | — | — |
| 10 | Cleanup Completeness | 9.4 | Old Control handle replaced by the strip | — | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None. FU-001 (drawing under the display cutout) already exists from the Solution Designer.

## Classification

N/A — Pass.

## Recommended Recipient

- `/software_engineering_team/api_e2e_engineer` (implementation review pass). Implementation Engineer gets an informational notice.

## Residual Risks

- "Copy from the desktop" was empty after `xclip` (CR-C-06, held): retry with a copy inside an app on the node.
- API 34 not run; the restored page re-entering full screen after process death is covered by a spec only.
- Android's first-time "Viewing full screen" hint appears once.
- Housekeeping: the Solution Designer's and architecture reviewer's ticket documents (`requirements-doc.md`, `design-spec.md`, `design-review-report.md`, `investigation-notes.md`, `solution-revision-record.md`, `architecture-review-revision-record.md`, `follow-ups.md`, `handoff-architecture-design-complete.md`) are untracked in the worktree.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4 / 10; every category ≥ 9.3
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: No findings. The settled implementation decisions (window-read state, canvas-size Fill box, no guard on `on`, no bar re-apply on resume, root colour through `Display`, strip at the top) are sound and within the approved design.
