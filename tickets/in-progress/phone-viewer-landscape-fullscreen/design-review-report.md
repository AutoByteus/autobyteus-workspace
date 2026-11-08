# Design Review Report — phone VNC Viewer: full screen in landscape (autobyteus-432)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-viewer-landscape-fullscreen/tickets/in-progress/phone-viewer-landscape-fullscreen/requirements-doc.md` (SR-001, `Approved` within the direction, user informed)
- Upstream Investigation Notes: `.../phone-viewer-landscape-fullscreen/investigation-notes.md` (L-01 … L-12; L-05/L-06 corrected in SR-002)
- Upstream Solution Revision Record: `.../phone-viewer-landscape-fullscreen/solution-revision-record.md` (SR-001 … SR-003)
- Reviewed Design Spec: `.../phone-viewer-landscape-fullscreen/design-spec.md` (SR-003, `Ready`; design approval `Not required`)
- Supplemental Task Artifacts Reviewed: Task context `28.jpg`, `29.jpg` (listed only; the user's own node, not opened)
- Relevant Solution Revision IDs: `SR-001`, `SR-002`, `SR-003`
- Architecture Review Revision Record: `.../phone-viewer-landscape-fullscreen/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: `3`
- Trigger: SR-003, prompted by implementation Design Impact IMP-DI-001 (IR-001; commits `9372cdb96b`, `9d8552563e`, evidence `09b1246987`)
- Prior Review Round Reviewed: `2` (ARCH-REV-002, `Pass`)
- Latest Authoritative Round: `3`
- Supplemental evidence reviewed in round 3: `evidence/ac005.txt` (15a-15d), `evidence/ac004.txt` (13a-14e), `follow-ups.md` FU-001, implemented `DesktopFullScreenController.kt` @ `9d8552563e`
- Current-State Evidence Basis (round 3 addition: `autobyteus-android/.../ui/DesktopFullScreenController.kt:1-58` @ `9d8552563e`. Round 2 addition: `MainActivity.kt` grep of every `setContentView`, `destroy()` and `onPageStarted` line; `app/src/test/java/org/autobyteus/mobile/web/ShellBridgeMessagesTest.kt` exists; `docs/design-cases.md:243,253`). Round 1: worktree `codex/phone-viewer-landscape-fullscreen` @ `eebbc2b8ee`. Read on 2026-11-08:
  - Android: `autobyteus-android/app/src/main/java/org/autobyteus/mobile/web/ShellBridge.kt:1-100`, `web/AutoByteusWebView.kt:22-140`, `MainActivity.kt:105-125,170-235`; `app/build.gradle.kts:45,93` (minSdk 26, `androidx.webkit:webkit:1.12.1`).
  - Web: `autobyteus-web/utils/remoteAccess/shellBridge.ts:1-75`; the bridge's readers, `components/mobile/MobilePairingBootstrap.vue` and `components/mobile/connection/MobileConnectionSheet.vue`, located by grep.

## Routing Classification Review

- Task size: `Medium`. Architectural risk: `High` (a page↔app contract, and Android window and orientation lifecycle).
- Independent Architecture Review required by the classification: `Yes`. No correction needed.

## Upstream Behavior And Production-Path Basis Confirmation

> Reading note (round 2): the verdict tables from here to "Round 2 Recheck" record the round 1 result. Every `Fail` / `Needs Correction` row in them is rechecked and resolved in the "Round 2 Recheck" section, which is authoritative together with "Latest Authoritative Result". `Pass` rows stand unchanged.

- Overall Basis Status: `Confirmed`. The requirements are clear and approved within the direction, and the current web behavior (L-02 … L-04) is consistent.
- Statements about existing code the design relies on, opened at their cited lines:
  - **L-05 is false.** It says there is "no bridge from the page to the app".
    - The app already gives the page a bridge, `window.AutoByteusShell`. It is an androidx.webkit web-message object registered through `WebViewCompat.addWebMessageListener`, allowed only for the node entry's origin, and messages from subframes or other origins are ignored (`ShellBridge.kt:14-46,80-81`).
    - `AutoByteusWebView` registers it before the first page loads (`AutoByteusWebView.kt:26-27,61`), and `MainActivity.openPage` creates it for every page (`MainActivity.kt:179-192`).
    - On the web, `utils/remoteAccess/shellBridge.ts` is its single owner (`getShellBridge()`; hello / paired / showNodeList / startScan).
    - The investigation's grep pattern (`addJavascriptInterface|requestedOrientation|WindowInsetsControllerCompat`) could not find it.
  - **L-06 is false.** It says "a JavaScript interface would be added here; it is visible to every frame". The existing bridge's documented rule is the opposite: autobyteus-417 made it main-frame and same-origin only, "so a sandboxed HTML preview inside the page cannot act as the app" (`ShellBridge.kt:17-18`).
  - The design's `MainActivity` hooks `openWebShell` and `showConnection` do not exist. The real places are `openPage` (`:179`), `closePage`, `renderList`/`showStart`/`showList`, `CantReachScreen`, `showUpdateWebView`, and the `onPageStarted = {}` hook (`:192`). See AR-432-002.
  - L-07 (415 `configChanges`; insets follow hidden bars) and L-08/L-09 (platform behavior) hold as written.

| Behavior ID | Kind | Design Alignment | Trigger / Current-State Evidence | Target Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 (enter: landscape + hidden bars) | User | Pass | Fail (L-05/L-06) | Fail | Needs Correction | AR-432-001 |
| BEH-002 (leave / reset restores) | User | Pass | Fail (hook names) | Fail | Needs Correction | AR-432-001, AR-432-002 |
| BEH-003 (Fit ↔ Fill) | User | Pass | Pass | Pass | Confirmed | — |
| BEH-004 (exit handle in both modes) | User | Pass | Pass | Pass | Confirmed | — |
| REQ-006 (browser branch) | User | Pass | Pass | Pass | Confirmed | Note below |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope | Linked | Internally Complete | Consistent | Status / Approval | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Task context `28.jpg`, `29.jpg` | Pass | Pass (L-01) | Pass | Pass | Pass (evidence; not copied) | None |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present | Pass | Design spec | — |
| Root-cause classification explicit and evidence-backed | Fail | "Design issue: No" and "Capability-area reuse … route state `full=1` is the single source" both rest on L-05. The existing page↔app capability (`ShellBridge`) was not found, so the decision to create a new channel is not evidence-backed. | AR-432-001 |
| Refactor decision explicit | Pass | `No` | — |
| Decision reflected in concrete sections | Fail | As above | AR-432-001 |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative | Facade vs Owner | Naming | One Owner / Call Order | Off-Spine Off Main Line | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary (enter/leave) | Pass | Pass | Pass | Fail (`AutoByteusShell` already names another object) | Fail (a second page→app channel next to the existing owner) | Pass | Fail (AR-432-001, 002) |
| DS-002 | Bounded local (Fill) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

Review point 2 passes: one web owner follows the route state with explicit branches. With AR-432-001, its app branch is chosen by `getShellBridge() !== null`. That is the existing capability check, which still keeps the decision an explicit one rather than inferring it from a failed call.

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Page → app (`ShellBridge` / `shellBridge.ts`) | Fail | Fail | Fail | Fail | The design bypasses the existing authoritative page→app boundary with a parallel `@JavascriptInterface` (AR-432-001) |
| `DesktopFullScreenController` | Pass | Pass | Pass | Pass | Correct single owner of orientation and bars |
| `useDesktopFullScreenDisplay` | Pass | Pass | Pass | Pass | The only web caller |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Web view → `useDesktopFullScreenDisplay` → bridge | Pass | Pass ("never call the interface from anything else") | Fail | Fail | Must go through `shellBridge.ts` (AR-432-001) |
| Bridge → `MainActivity` actions → controller | Pass | Pass | Pass | Pass | Matches `ShellBridge.Actions` |

## Interface Boundary Verdict

| Interface | Subject Clear | Singular | Identity Explicit | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `window.AutoByteusShell.setDesktopFullScreen(on)` (new `@JavascriptInterface`) | Pass | Pass | Pass | High (name collision; every frame) | Fail (AR-432-001) |
| `useDesktopFullScreenDisplay().apply(on)` | Pass | Pass | Pass | Low | Pass |
| `DesktopFullScreenController.setOn(Boolean)` / `reset()` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Page → app message | Fail | Fail | Fail | Fail | AR-432-001: `ShellBridge` / `shellBridge.ts` exist |
| Route state `full=1`, insets, zoom | Pass | Pass | N/A | Pass | — |
| Orientation and bars | Pass | Pass | Pass | Pass | No existing owner (L-05's orientation and bars part holds) |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear | Decision Sound | Supports Spine Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-android/.../ui/DesktopFullScreenController.kt` | Pass | Pass | Pass | Pass | — |
| `.../web/AutoByteusWebView.kt` (register a new interface) | Pass | Fail | Fail | Fail | `ShellBridge.kt` gains the message instead (AR-432-001) |
| `autobyteus-web/types/autobyteus-shell.d.ts` (new global type) | Pass | Fail | Fail | Fail | The type belongs in `shellBridge.ts` (AR-432-001) |
| Web composable, view, zoom | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Evaluated | Shared File Sound | Ownership Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Page→app message rules (origin/main frame) | Fail | Fail | Fail | Fail | Belongs in `ShellBridgeMessages.read` (AR-432-001) |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | Redundant Removed | Overlap Controlled | Core vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `window.AutoByteusShell` | Fail | N/A | Fail | N/A | Fail | One name would denote two objects of different shape and policy (AR-432-001) |

- Derived consumers of a changed structure listed with a decision for each: `Fail`. The spec says "Derived consumers: none (new optional global)". But `window.AutoByteusShell` is not new: its readers are `shellBridge.ts:29-35` (`readShellObject` requires `postMessage` and `addEventListener`), `MobilePairingBootstrap.vue` and `MobileConnectionSheet.vue`.
- One vocabulary: `Fail` (same finding). "Desktop full screen" itself is fine.

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-Tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `DesktopFullScreenController.kt` | Pass | Pass | N/A | Pass | — |
| `AutoByteusWebView.kt` (new interface) | Pass | Fail | N/A | Fail | AR-432-001 |
| `MainActivity.kt` (resets) | Pass | Pass | N/A | Fail | AR-432-002 (hook names) |
| `useDesktopFullScreenDisplay.ts`, `MobileNodeDesktop.vue`, `useNodeDesktopZoom.ts` | Pass | Pass | N/A | Pass | — |
| `types/autobyteus-shell.d.ts` | Pass | Fail | N/A | Fail | AR-432-001 |

## Subsystem / Folder / File Placement Verdict

Pass, except the two rows named under AR-432-001.

## Removal / Decommission Completeness Verdict

`None` is correct for this feature. No dead code is introduced, provided AR-432-001 is fixed by extending `ShellBridge` rather than adding a parallel channel.

## Legacy / Backward-Compatibility Verdict

Pass. DESIGN.md rule 9 applies, and the page uses the bridge only when the app gives it.

## Persisted-Data Transition Verdict

`Not Affected`. Pass.

## Change / Refactor Safety Verdict

| Area | Sequence Realistic | Temporary Seams | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Android → web → view/zoom → docs → validation | Pass | Pass | Pass | Pass, once AR-432-001 changes the Android and web bridge steps |

## Example Adequacy Verdict

| Topic | Needed | Present | Bad Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Page→app message | Yes | Fail | N/A | Fail | AR-432-001 |
| Fill math, branches | Yes | Pass | N/A | Pass | — |

## Material Premise Validation

### MP-432-1 — A second `window.AutoByteusShell` collides with the existing bridge

- Related requirement: REQ-001, REQ-002 (they need a working page→app channel), and the existing one-step pairing contract (autobyteus-395; `ShellBridge.kt`, `shellBridge.ts`).
- Initiating basis kind: `User`. The user opens a paired node in the Android app (`MainActivity.openPage` creates `ShellBridge` and registers it, `:179-192`), opens the VNC Viewer and taps full screen.
- Forward path: the design registers a `@JavascriptInterface` under the name `AutoByteusShell` in `AutoByteusWebView.create`. The existing `ShellBridge.register` injects `AutoByteusShell` through `addWebMessageListener` (`ShellBridge.kt:36`, `JS_OBJECT_NAME = "AutoByteusShell"`). Both inject the same global into the page, so only one object can be `window.AutoByteusShell`.
  - If the web-message object wins, `typeof window.AutoByteusShell?.setDesktopFullScreen === 'function'` is false. The app branch never runs and REQ-001 fails.
  - If the Java interface object wins, `readShellObject` (`shellBridge.ts:29-35`) finds no `postMessage`, so `getShellBridge()` returns `null` and pairing, hello, node list and scan break.
- Reachability: `Reachable` (normal product path).
- Review consequence: AR-432-001.

### MP-432-2 — A sandboxed preview frame could act as the app

- Initiating basis kind: `User`. The user opens an HTML artifact preview on the phone (426 D-07 blob: preview frame; the sandboxed previews named by autobyteus-417).
- Forward path: a `@JavascriptInterface` is injected into every frame (the design's own L-06 and Ownership Map: "Any frame can call it"). A preview's script can call `setDesktopFullScreen(true)` outside the viewer. The design's resets (page start, or leaving the viewer) do not fire while the user stays in the Artifacts view, so the phone stays in landscape with hidden bars.
- Consequence: it contradicts DEC-001 and the non-goal "landscape outside full screen", and it reverses the rule autobyteus-417 established for the same object name. The design lists exactly this as an escalation trigger ("a frame other than the node page able to …").
- Reachability: `Reachable`, provided the preview runs scripts. The requirement does not depend on this: AR-432-001 removes the exposure regardless.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Investigation L-05 / L-06 | They state the opposite of the current code | Correct them with `ShellBridge.kt` / `shellBridge.ts` evidence | Open (AR-432-001) |

## Round 2 Recheck (SR-002)

| Finding | Status | Verification |
| --- | --- | --- |
| AR-432-001 | Resolved | The display request is now a message on the existing bridge: `{type:'desktopFullScreen', on}` in `ShellBridgeMessages.read`, under the same main-frame and origin rule (`ShellBridge.kt:80-81`), routed `ShellBridgeAction.DesktopFullScreen(on)` → `Actions.onDesktopFullScreen(on)` → `DesktopFullScreenController.setOn`. A malformed `on` is ignored. On the web, `shellBridge.ts` gains `desktopFullScreen(on)`, and the app branch is chosen by `getShellBridge() !== null`. The `@JavascriptInterface`, the `AutoByteusWebView` registration and `types/autobyteus-shell.d.ts` are dropped and recorded in the rejection log. `ShellBridgeMessagesTest.kt` exists and gains the main-frame (accepted), subframe, other-origin and malformed cases. L-05/L-06 are corrected and L-11 documents the bridge. Pairing callers are unchanged (derived consumers listed). Review point 1 is now moot: only the node's main frame can ask. |
| AR-432-002 | Resolved | D-2 has one owner, `MainActivity`, and one private method resets the controller on: every main-frame page start (`onPageStarted`, `:192`); every non-page `setContentView` (`:159, 171, 186, 241` incl. the in-page node list, `:285, 329, 346`), with only `:309` the plain page; and every host destroy (`:150, 184, 320`). All lines verified. AC-002 is extended. |
| Round 1 notes | Taken | The `requestFullscreen`/`orientation.lock` rejection is caught and the view stays in the in-page full screen. The bars are re-applied on resume only if AC-004 shows they return. |

Implementation note: after a reset by D-2, returning to the page while the route still has `full=1` does not re-send the request, because the watcher sees no change. Every reachable non-page screen is entered from outside the viewer's full screen: the node list comes from the connection sheet, which full screen hides; a diagnostic or a reload starts the page again. No added machinery is needed. If implementation finds such a path, re-applying from the page's `visibilitychange`/resume is the place.

### AR-432-003 — Duplicate design case number (non-blocking)

- Type: `Design Impact`. Severity: Low (documentation).
- Evidence: `docs/design-cases.md` has `### Case 17` twice: autobyteus-277 at `:243`, and the new autobyteus-432 case at `:253`.
- Required update: renumber the new case to 18, and update any reference to it. This can be done by the Solution Designer or in implementation's commit; no design round is needed.
- Recipient: Solution Designer (informational); implementation engineer.

## Round 3 Recheck (SR-003)

The requirements wording is within the direction. REQ-002 now says "gives the orientation back to the phone's own setting", which is what DEC-002 always said ("hand control back to the phone's setting"). REQ-005 adds Keyboard and Clipboard to the Control strip, which the approved AC-005 needs. Neither is a change in intended behavior.

| Point | Result | Verification |
| --- | --- | --- |
| 1. Control full-screen strip (Keyboard, Clipboard, Show controls) | Pass | AC-005 was unreachable: `ac005.txt` 15c-15d show that entering full screen dropped the keyboard focus and that full screen offered neither Keyboard nor Clipboard. Option A reuses the existing actions in the handle's style, outside noVNC's canvas, so a tap on the strip is never a desktop click (REQ-S3-1/3 preserved). Option B was rightly rejected (AC-005 is approved). Show controls keeps the exit control REQ-005 requires. See AR-432-004 for the mounting detail. |
| 2. Off = `UNSPECIFIED`; "on" read from the window | Pass | The implemented controller derives `isOn` from `requestedOrientation == SENSOR_LANDSCAPE` (`DesktopFullScreenController.kt:27`), so idempotence works after Android ends the app with the orientation request kept (`:16-18`). The single-owner premise holds because the activity declares no orientation, pinned by a manifest test. After recreation, the bars are visible while the orientation request is still landscape, but the main-frame page start (D-2) resets to off before the page's watcher applies on, so the bars are hidden again. `ac004.txt` 13a-13c show background and return keeping landscape and hidden bars; 14a-14e show that after process death the phone gets its own setting back. |
| 3. Dark shell-root background while on; FU-001 | Pass | It is a display concern of desktop full screen with one owner (the controller), restored on off. The insets owner (277) is unchanged. Drawing under the cutout is recorded as FU-001 (non-urgent, with evidence and a suggested Task); this is proportionate. |

### AR-432-004 — Keep the keyboard input and the Clipboard sheet mounted in full screen (non-blocking; required in implementation)

- Type: `Design Impact`. Severity: Low.
- Protects: AC-005, REQ-005.
- Evidence: `ac005.txt` 15c-15d. Entering full screen with the keyboard open hid the bar and the keyboard closed (`mInputShown=false`, focus `null`). The hidden textarea and the buttons went with the bar.
- Required update, in implementation: the hidden keyboard textarea and the Clipboard sheet must live outside the bar that full screen hides, so the strip's Keyboard can focus the textarea inside its tap handler and the Clipboard sheet can render in full screen. Add a check to the AC-005 emulator run: Keyboard from the strip gives `mInputShown=true` and typed text reaches the node; Clipboard opens and pastes in landscape full screen.
- Recipient: implementation engineer.

### AR-432-005 — Small spec and implementation notes (non-blocking)

- Validation Plan line 111: corrected by the Solution Designer. It now says off = `UNSPECIFIED`, the root background is restored, and on is read from the window state. Resolved.
- When the controller sets the dark root background, it should restore the root's own background (read before the change, or taken from the theme) rather than a hard-coded colour. Add it to the controller's `Display` interface so the JVM tests cover it.
- Recommendation, not required: in Control the picture is at Fit, and on a ~20:9 phone Fit leaves side margins (`ac005.txt` 15c: canvas `[65,0,733,412]` in an 863 px viewport). Putting the strip in a side margin, rather than over the top edge of the picture, would keep the agent desktop's top area (tab strip, address bar) clickable. The design's top-edge placement is acceptable and already established by S3.

## Review Decision

- `Pass` (round 3): SR-003's three points are sound, and the requirements wording stays within the direction. AR-432-004 and AR-432-005 are non-blocking. Round 2 still holds: AR-432-001 and AR-432-002 are resolved.

## Findings

AR-432-001 and AR-432-002 are resolved (ARCH-REV-002). AR-432-003 is resolved: the new case is `### Case 18` at `docs/design-cases.md:253`, committed in `9372cdb96b`; `:243` remains autobyteus-277's Case 17. Correction: ARCH-REV-003 had carried it forward as open without rechecking. AR-432-004 and AR-432-005 are non-blocking (round 3).

## Classification

N/A — `Pass`.

## Recommended Recipient

Implementation engineer (`/software_engineering_team/implementation_engineer`), with an informational notice to the Solution Designer.

## Residual Risks

- The back gesture in immersive mode, and the keyboard and Clipboard in landscape: emulator checks (AC-005).
- Cutout area unused in full screen (FU-001, non-urgent).
- iOS is out of scope.

## Latest Authoritative Result

- Review Decision: `Pass` (ARCH-REV-003)
- Material-Premise Gate: `Pass`
- Notes: classification Medium/High is unchanged.
