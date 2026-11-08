# Requirements Document — phone VNC Viewer: full screen in landscape, as large as possible

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003` (SR-002 AC-002 extended; SR-003 REQ-005 states the Control strip; behavior within the direction)
- Package identifier: `phone-viewer-landscape-fullscreen`
- Request / ticket: Project Task `autobyteus-432`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-11-08
- Approved by and reference: `Solution Designer within the direction (user informed)` — the user asked for "full screen … automatically switches the phone to landscape on Android" and dispatched the Task; the details (rotation-lock choice, immersive mode, fill, browser fallback) are decided within that direction (DEC-001…DEC-006) and reported to him.

## Problem And Desired Outcome

- Problem: in portrait the agent's 16:9 desktop is small with large bars (investigation L-01); turning the phone helps, but the user must do it himself, and even in landscape Android's status and gesture bars take space.
- Desired outcome: tapping full screen in the phone's VNC Viewer turns the phone to landscape by itself (like a game) and hides Android's bars, so the desktop is as large as the screen allows without distortion; leaving full screen gives back the previous orientation and bars. The agent's desktop size never changes.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Full screen hides the app's bars only; orientation follows the phone | Full screen also requests landscape and hides Android's bars | Route `full=1`, Back leaves full screen first | L-02, L-03, L-05 |
| BEH-002 | User | Leaving full screen: app bars back | Also previous orientation and Android's bars back | — | L-03 |
| BEH-003 | User | View only zoom: pinch, pan, double tap = fit | Double tap toggles Fit ↔ Fill (cover, pan to see the rest) | Pinch, pan; Control at fit; desktop never resized | L-04 |
| BEH-004 | User | View only full screen: exit by a tap; Control: top handle | A visible exit control in both modes; tap in View only and Back still exit | — | L-02 |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case |
| --- | --- |
| UC-001 | Enter and leave the phone viewer's full screen in the Android app |
| UC-002 | Same in a phone or desktop browser (`/mobile` without the app) |
| UC-003 | Fit or fill the picture in View only without distortion |

### Out Of Scope

- iOS (paused, autobyteus-279). Resizing the agent's desktop. Control-mode zoom. What a phone may read or open (autobyteus-403). Product Team design (not requested).

### Non-Goals

- Landscape outside full screen; forcing landscape when merely opening the viewer.

### Preserved Behavior Boundary

- 415 (page kept on rotation), 277 insets (bars respected when shown), keyboard bridge and Clipboard sheet in Control, S3 View only/Control rules, route `full=1` and Back order.

### Prerequisites

None.

### Review Authority

- Every blocking finding cites a REQ, AC or preserved-behavior ID here.

## Requirements

| Requirement ID | Requirement | Behaviors | Priority | Feasibility Evidence | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | In the Android app, entering the viewer's full screen turns the phone to landscape (either side, by the phone's sensor) even when the phone's auto-rotate is locked, and hides Android's status and navigation bars (a swipe from the edge shows them for a moment) | BEH-001 | Must | L-07, L-08 (no permission) | User |
| REQ-002 | Leaving full screen (exit control, tap in View only, Back), leaving the viewer, the page reloading or the app opening another node gives the orientation back to the phone's own setting and shows Android's bars | BEH-002 | Must | L-08 | User |
| REQ-003 | In full screen the desktop fills the screen as far as its shape allows, without distortion; the agent's desktop size is never changed | BEH-001 | Must | L-01 | User |
| REQ-004 | In View only, double tap toggles between Fit (whole desktop visible) and Fill (the picture covers the screen; drag to see the cropped part); pinch zoom stays; Control stays at Fit | BEH-003 | Must | L-04 | User ("fit without distortion") |
| REQ-005 | Full screen shows a small visible exit control in both modes; in Control the same strip also offers Keyboard and Clipboard, so typing and pasting work in full screen; in View only a single tap also exits; Back exits full screen first | BEH-004 | Must | L-02 | Task |
| REQ-006 | Without the Android app (a phone or desktop browser), full screen uses the browser's own full screen where available and asks for landscape where the browser allows it; otherwise the current in-page full screen | — | Should | L-09 | DEC-005 |
| REQ-007 | No new Android permission | — | Must | L-08 | Task constraint |

## Acceptance Criteria

| AC ID | REQ | Trigger | Expected Outcome | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001, 003 | Emulator app (auto-rotate off), isolated node, VNC Viewer in portrait → full screen | Screen turns to landscape; status and gesture bars hidden; picture larger than in portrait and undistorted (aspect = desktop's) | Emulator, test node |
| AC-002 | REQ-002, 005 | Exit by the control, by a tap (View only), by Back; also leave the viewer while in full screen, open the app's node list (Switch node) and reach any other app screen | Previous orientation (portrait) and bars return each time | Emulator |
| AC-003 | REQ-004 | View only, full screen: double tap; drag; double tap | Fill covers the screen, drag reveals the cropped part, double tap returns to Fit; node pointer unchanged (no input) | Emulator + node-side check |
| AC-004 | REQ-002 | App sent to background and back while in full screen; app reopened after Android ended it (426 D-03) | Full screen state and landscape consistent with the page (`full=1` → landscape; otherwise the phone's setting) | Emulator |
| AC-005 | REQ-001 | Control in full screen: Keyboard and Clipboard | Keyboard opens above the hidden bars' area without covering the input; Clipboard works | Emulator |
| AC-006 | REQ-006 | Desktop browser `/mobile`, full screen | Browser full screen; Esc leaves full screen and the route follows | Browser probe |
| AC-007 | REQ-007 | Build | Permissions unchanged | Build check |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (behavior of existing controls; a small exit control in View only full screen like the existing Control handle). Product design: N/A — not requested.

## Data Continuity And Acceptable Loss

- Persisted data affected: `No`.

## Decisions

| Decision ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | When to turn to landscape | The user asked for it on full screen; turning on merely opening the viewer would surprise someone who wants the toolbar. **On entering full screen only** | Solution Designer | Decided |
| DEC-002 | The phone's rotation lock | The user compared it with games, which override the lock. **Override while in full screen (sensor landscape); on leaving, hand control back to the phone's setting** — a locked phone returns to portrait | Solution Designer | Decided (user informed) |
| DEC-003 | Android's bars | Landscape alone still loses height to them (L-01). **Hide them in full screen (swipe shows them briefly), show them on leaving** | Solution Designer | Decided |
| DEC-004 | Fit choices | Stretching distorts; resizing the desktop is excluded. **Fit and Fill (cover) by double tap in View only; pinch for any zoom; Control at Fit** | Solution Designer | Decided |
| DEC-005 | Browsers without the app | **Browser full screen and orientation lock where allowed; else today's in-page full screen** | Solution Designer | Decided |
| DEC-006 | Exit control in View only | A tap works but is invisible. **Show the same small handle as in Control** | Solution Designer | Decided |

## Traceability

| REQ | ACs |
| --- | --- |
| REQ-001 | AC-001, AC-005 |
| REQ-002 | AC-002, AC-004 |
| REQ-003 | AC-001 |
| REQ-004 | AC-003 |
| REQ-005 | AC-002 |
| REQ-006 | AC-006 |
| REQ-007 | AC-007 |

## Readiness Check

- Content ready: `Yes`. Approval: within the direction, user informed. Ready for design: `Yes`.
