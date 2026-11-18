# Requirements Document — S3: node desktop on the phone and in a desktop browser

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002` (refined for architecture review ARCH-REV-001: REQ-S3-2, REQ-S3-3, DEC-S3-4, DEC-S3-5; within the direction)
- Package identifier: `node-desktop-on-phone`
- Request / ticket: Project Task `autobyteus-407`, slice S3 of autobyteus-394 (parent IDs kept: REQ-009, REQ-014–016, REQ-019; AC-012, AC-017–019, AC-021; new S3 IDs carry the `S3` prefix)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-11-06
- Approved by and reference: `User` for the parent requirements (autobyteus-394 SR-004, 2026-11-06) and for the placement (comment on the Task, 2026-11-06: "make the phone able to have the VNC as viewer as well, i think currently we have messages, files, artifact, etc. we could have VNC Viewer as well"); details DEC-S3-1 … DEC-S3-8 decided by the Solution Designer within that direction, user informed in the conversation.
- Exact approved baseline: this document at SR-001.
- Prerequisite PRE-001 (autobyteus-415): delivered (merge `9d5da23341`).

## Problem And Desired Outcome

- Problem: since S1 the desktop app shows a Docker node's desktop through the node's server, but the phone (`/mobile`, Android app or a desktop browser) has no desktop view; and the node does not yet bound how many viewers it serves or cut off a revoked phone's open stream.
- Desired outcome: on the phone, a run's ⋮ menu offers **VNC Viewer** next to Artifacts, Files and Messages; it opens a full-screen view of the paired node's desktop, View only by default, fitted, zoomable and pannable, usable in landscape, with a deliberate Control switch and a keyboard for typing; the stream ends when the app goes to the background; the node limits viewers and ends a revoked phone's stream within 30 seconds.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-003 | User | SCN-004, SCN-005 | Phone/`/mobile`: no desktop surface (remote_access.md "Phase One removes … VNC") | VNC Viewer view in the run menu | Other mobile views, pairing, credentials | S3-02, S3-03 |
| BEH-008 | Contract | SCN-007, SCN-009 | Phones checked only at connect | A revoked phone / disabled Phone Access ends the open stream within 30 s | Shared policy for all routes | parent BEH-008 |
| BEH-S3-1 | System | SCN-006 | No limit on concurrent streams | ≤ 4 per node, ≤ 2 per phone; more refused with a reason | — | parent REQ-019 |
| BEH-S3-2 | User | SCN-004 | — | Entry shown only when the paired node has a node desktop and the run is on that node | — | S3-02, DEC-S3-2 |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-002 | View the paired node's desktop from the Android app or a desktop browser (`/mobile`) | SCN-004, SCN-005 |
| UC-003 (phone) | Switch deliberately to Control on the phone and type | SCN-007 |
| UC-006 (phone) | End streams on background, revocation, limits | SCN-009 |

### Out Of Scope

- iOS verification (the iOS app loads the same `/mobile`; not checked in this ticket).
- Node switching on the phone (autobyteus-391). Remote runs' desktops (the entry is hidden for them).
- Origin checks (autobyteus-403); phone deny rules (autobyteus-404) — if 404 lands, `/ws/node-desktop` stays open to phones.
- Restore after Android kills the app (415 FU-001). S2 image hardening.

### Non-Goals

- Free remote resize; IME composition (e.g. Chinese input) in the phone keyboard bridge; bandwidth tuning (the user: not a concern).

### Preserved Behavior Boundary

- Desktop app VNC Viewer (S1) unchanged except the new close-code state for "too many viewers"; other mobile views; pairing; Phone Access semantics.

### Prerequisites

| Prerequisite ID | Finding And Evidence | Blocks | Sent To / Task Key | Status |
| --- | --- | --- | --- | --- |
| PRE-001 | The Android app reloaded on every rotation (investigation S3-06) | REQ-014 landscape, AC-017 | `/project_task_manager`; Task autobyteus-415 | delivered (merge `9d5da23341`, 2026-11-06) |

### Review Authority

- Every blocking finding cites a REQ, AC or preserved-behavior ID here; new behavior is a `Requirement Gap` for the user.

## Requirements

| Requirement ID | Requirement | Behaviors | Priority | Rationale | Feasibility Evidence | Source |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-014 | The `/mobile` shell (Android app and desktop browser) offers the paired node's desktop as **VNC Viewer** in a run's ⋮ menu next to Artifacts, Files and Messages; the view opens full screen, View only, fitted to the screen, in portrait or landscape | BEH-003, BEH-S3-2 | Must | User's placement | S1 viewer pieces (S3-04); rotation kept (415) | parent REQ-014; user comment |
| REQ-015 | On the phone no input reaches the desktop in View only; Control needs a deliberate tap on a Control switch that a pan or pinch cannot trigger | BEH-003 | Must | Accidental taps | Server filter (S1) | parent REQ-015 |
| REQ-016 | The phone view closes its stream when the app goes to the background or the page is hidden, and reconnects in View only with a fresh access check when visible again; connection state is always shown | — | Must | Mobile lifecycle | Unclear for Android background → MP-001 (verify first) | parent REQ-016 |
| REQ-S3-1 | In View only the user can pinch to zoom, drag to pan, and return to fit (double tap or a Fit control); in Control the view is fitted and touches act on the desktop (tap = click, drag = drag, two-finger drag = scroll) | BEH-003 | Must | "zoom and pan" with input that works | Read: noVNC has fit or 1:1 only, its viewport drag works in View only; a page-level zoom of the fitted picture is input-free in View only (DEC-S3-3) | parent REQ-014 |
| REQ-S3-2 | In Control a Keyboard control opens the phone's keyboard; typed characters (Latin and other single characters, including text the keyboard delivers through composition, such as Gboard's word composition), Enter, Backspace and Tab reach the desktop. CJK input methods are not guaranteed | BEH-003 | Must | Finishing a sign-in on the phone | Read: noVNC core exposes `sendKey` and keysym lookup; a hidden input bridges the soft keyboard (DEC-S3-4) | parent SCN-004 |
| REQ-S3-3 | "Full screen" hides the view's bars so the desktop uses the whole screen. In View only, one tap anywhere shows the controls again; in Control (where a tap is a desktop click) a small always-visible handle at the top edge shows them. The system Back key first leaves full screen | BEH-003 | Must | Fullscreen in the Android WebView is not available (S3-05) | Read | parent REQ-014; DEC-S3-5 |
| REQ-S3-4 | The VNC Viewer entry is shown only when the paired node has a node desktop and the open run is on that node | BEH-S3-2 | Must | No dead entry (embedded node, remote run) | `GET /rest/node-desktop` (S1) | DEC-S3-2 |
| REQ-009 | A paired phone's open stream ends within 30 seconds after the phone is revoked or Phone Access is disabled | BEH-008 | Must | Live screen | N/A | parent REQ-009 |
| REQ-019 | The node allows at most 4 concurrent desktop streams and at most 2 per paired phone; a further stream is refused before any upstream connection with a "too many viewers" reason, which the desktop app and the phone show | BEH-S3-1 | Must | Resource bound | N/A | parent REQ-019 |
| REQ-S3-5 | The docs (`autobyteus-web/docs/remote_access.md`) describe the phone desktop view and replace the Phase One statement that mobile has no VNC | — | Must | Operability | N/A | parent REQ-018 |

## Acceptance Criteria

| AC ID | REQ | Scenario | Trigger | Expected Outcome | Alternate / Failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-017 | REQ-014, 015, S3-1, S3-3 | SCN-004 | Android emulator app paired (over HTTPS/`wss`, or trusted HTTP) with an isolated test node | ⋮ → VNC Viewer shows the desktop fitted, View only; rotate → landscape, still connected; pinch/pan/double-tap; Full screen hides bars; no input reaches the desktop until Control is tapped | Physical phone: optional, by the user | Emulator (adb) + node-side input check |
| AC-018 | REQ-014 | SCN-005 | Desktop browser opens the paired `/mobile` | Same with mouse; trackpad pinch / Ctrl+wheel zooms in View only | — | Browser probe |
| AC-019 | REQ-016 | SCN-009 | App backgrounded, then foregrounded | Stream closed while in background (node log/socket count); reconnects in View only on return | Revoked meanwhile → refused | Emulator; MP-001 first |
| AC-012 | REQ-009 | SCN-009 | Phone streaming; owner revokes it (or disables Phone Access) | Stream ends ≤ 30 s with a "not allowed" state; reconnect refused | — | Server test + emulator |
| AC-021 | REQ-019 | SCN-006 | 5th node-wide stream, or 3rd from one phone | Refused with "too many viewers" before any upstream connection; desktop app and phone show it | — | Server test + UI tests |
| AC-S3-1 | REQ-S3-2 | SCN-004 | Control → Keyboard → type `abc`, Backspace, Enter | Characters and keys arrive at the desktop (test node text field) | — | Emulator + node-side check |
| AC-S3-2 | REQ-S3-4 | SCN-004 | Phone paired with a node without a node desktop; a remote run | No VNC Viewer entry | — | UI tests |
| AC-S3-3 | REQ-S3-5 | — | Docs | remote_access.md updated | — | Review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Steps | Expected Outcome | Alternate | Validity |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-004 | User | User, Android phone | Check the agent's screen; finish a sign-in | Run → ⋮ → VNC Viewer | View only → zoom/pan → optional Control → Keyboard | Desktop on the phone | Revoked/disabled → refused; too many viewers → refused | Supported Normal |
| SCN-005 | User | User, desktop browser | Same from a browser | Paired `/mobile` | Same | Same | Same | Supported Normal |
| SCN-006 | System | Node | Bounded viewers | 5th / 3rd-per-phone stream | — | Refused | — | Supported Normal |
| SCN-007 | User / Contract | User; policy | Control deliberately | Control switch | — | Input only in Control | — | Supported Normal |
| SCN-009 | System | Node, app lifecycle | No orphaned or unauthorized streams | Background, revoke, disable | — | Stream ends | Reconnect with fresh check | Supported Normal |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`. Product design: N/A — not applicable; the placement is the user's (a menu entry in the existing pattern) and the view follows the existing mobile view pattern (screen bar with ←, title, actions). The user may still ask for the Product Team.
- States: connecting, connected (View only / Control), not allowed, no shared desktop, too many viewers, desktop disconnected (Reconnect), cannot reach node (Reconnect).

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement |
| --- | --- | --- | --- |
| QR-S3-1 | REQ-009; AC-012 | Security | Revoked phone stream ends ≤ 30 s |
| QR-S3-2 | REQ-019; AC-021 | Reliability | ≤ 4 streams per node, ≤ 2 per phone; refusal before any upstream connection |
| QR-S3-3 | all | Privacy | No screenshots of real desktops in tests; test nodes only; no credential in logs |

## Data Continuity And Acceptable Loss

- Persisted data affected: `No`.

## External Contracts And Dependencies

| Dependency | Constraint | Evidence |
| --- | --- | --- |
| noVNC 1.7.0 | Touch gestures, `dragViewport`, `scaleViewport`, `sendKey`, keysyms | S3-07 |
| Android WebView (shell, targetSdk 35) | Page visibility when backgrounded (MP-001); no HTML fullscreen (S3-05) | S3-05, S3-08 |

## Assumptions

| ID | Assumption | Status |
| --- | --- | --- |
| MP-001 | Backgrounding the Android app makes the page hidden (`visibilitychange`) although `MainActivity` does not call `WebView.onPause()` | Unclear — verified first in implementation; if false, back to the Solution Designer (prerequisite) |

## Decisions

| Decision ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-S3-1 | Placement; Product Team? | The user named it ("we could have VNC Viewer as well" next to Messages, Files, Artifacts); the redesigned shell already has that menu and a full-screen view pattern. **A menu entry and a view in the existing pattern; no Product Team unless the user asks** | Solution Designer | Decided (user informed) |
| DEC-S3-2 | Entry on nodes without a desktop and for remote runs | The phone's paired node is the only desktop the phone can reach; an embedded node has none; a remote run's screen is on another node. **Hide the entry in both cases** | Solution Designer | Decided |
| DEC-S3-3 | Zoom model | noVNC offers fit or 1:1 only; a page-level zoom of the fitted picture is safe in View only (no input) but would misplace Control taps. **View only: pinch zoom, drag pan, double-tap/Fit to reset; Control: fitted, touches to the desktop** | Solution Designer | Decided |
| DEC-S3-4 | Typing on the phone | Sign-in needs typing; the soft keyboard does not open on a canvas. **A Keyboard control in Control mode opening a hidden input; text (incl. Latin text arriving through composition), Enter, Backspace, Tab; CJK input methods not guaranteed** (refined SR-002) | Solution Designer | Decided |
| DEC-S3-5 | Full screen | HTML fullscreen is unavailable in the Android WebView. **In-page full screen: bars hidden; View only: tap to show; Control: a small handle at the top edge (a tap there is not sent to the desktop); Back leaves full screen first** (refined SR-002) | Solution Designer | Decided |
| DEC-S3-6 | Limits and refusal | 4 per node, 2 per phone (parent DEC-010). **Close 4429 `NODE_DESKTOP_TOO_MANY_VIEWERS`, a new viewer state "too many viewers" in both clients** | Solution Designer | Decided |
| DEC-S3-7 | How a revoked phone's open stream ends | **The node re-checks each open phone stream's credential every 30 s with the shared auth service and closes it with the shared policy's code (4401/4403)** | Solution Designer | Decided |
| DEC-S3-8 | autobyteus-404 overlap | S3 offers the desktop on the phone, so `/ws/node-desktop` and `/rest/node-desktop` must stay open to phones. **Recorded for 404** | Solution Designer | Decided |

## Traceability

| REQ | ACs | Scenarios |
| --- | --- | --- |
| REQ-014 | AC-017, AC-018 | SCN-004, 005 |
| REQ-015 | AC-017 | SCN-004, 007 |
| REQ-016 | AC-019 | SCN-009 |
| REQ-S3-1 | AC-017, AC-018 | SCN-004, 005 |
| REQ-S3-2 | AC-S3-1 | SCN-004 |
| REQ-S3-3 | AC-017 | SCN-004 |
| REQ-S3-4 | AC-S3-2 | SCN-004 |
| REQ-009 | AC-012 | SCN-009 |
| REQ-019 | AC-021 | SCN-006 |
| REQ-S3-5 | AC-S3-3 | — |

## Readiness Check

- Content ready: `Yes`. Approval: `Yes` (user for parent requirements and placement; details within the direction, user informed). MP-001 is a verification step, not an open decision. Ready for design: `Yes`.
