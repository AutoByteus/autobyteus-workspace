# Requirements Document — autobyteus-450

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003` (requirements revised in SR-003: REQ-001/002 cover the composer's draft attachments; DEC-005, DEC-006)
- Package identifier: `conversation-file-open-450`
- Request / ticket: Project Task `autobyteus-450` (two bugs in one, at the user's word, 2026-11-09)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user
- Requirements owner: Solution Designer
- Date: 2026-11-09
- Approved by and reference: `Solution Designer within the direction (user informed)`; SR-001 and SR-003, with the Solution Designer's messages to the user, 2026-11-09
- Behavior-defining supplements: None

## Problem And Desired Outcome

- Problem 1 (phone, regression since autobyteus-437, in v1.5.12): an attached file in a conversation cannot be opened on the phone. Its thumbnail does not load, and a tap sends the app to a wrong "Pair this phone again" screen. Cause: the page loads the node's file URL without the phone's key (an image tag, then a page navigation). The node refuses it (401), and the Android app treats any page-load 401 as a rejected credential.
- Problem 2 (general, desktop and phone, long-standing): opening a file again (its link in a conversation, or the Files tab) after the agent rewrote it shows the first-loaded content until the page reloads. Cause: an already-open file is reused without reloading.
- Desired outcome: attached files show and open on the phone in the phone's own viewer, with no wrong pairing screen. Every explicit open of a file shows its current content, on the desktop and the phone.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Phone: attached image shows as a name chip | Shows as a thumbnail, as on the desktop | — | Repro |
| BEH-002 | User | SCN-001 | Phone: tap → "Pair this phone again" | Opens in the phone's viewer (image, PDF, text, other types as the viewer supports) | — | Repro + code |
| BEH-003 | User | — | Desktop attachments work | Unchanged | Yes | Code |
| BEH-004 | User | SCN-002 | Desktop: re-open shows old content until reload | Each explicit open shows current content | — | Repro |
| BEH-005 | User | SCN-002 | Phone: same until reload | Same as desktop desired | — | Repro |
| BEH-006 | User | — | Phone: files outside the workspace open current | Unchanged | Yes | Code |
| BEH-007 | System | SCN-003 | A real credential rejection lands on pairing (in the page) | Unchanged | Yes | Code |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | See and open a file attached to a conversation message on the phone | SCN-001 |
| UC-002 | Open a file (link in a conversation, Files tab, attachment) after it changed, on the desktop and the phone | SCN-002 |
| UC-003 | The Android app never shows a pairing screen for a failed load of a node file | SCN-001, SCN-003 |

### Out Of Scope

- Changing the node's key rules or file routes (no credentials in URLs, no cookies, no query tokens).
- Live refresh of a viewer that stays open while the file changes on disk without the user opening it again (FU-001).
- Attachments' handling on the desktop (works).
- Downloading files to the phone.

### Non-Goals

- Showing file versions or history ("version at 10:12"): the viewer shows the current file on every open.

### Preserved Behavior Boundary

BEH-003, BEH-006, BEH-007; REQ-005.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | On the phone, an image attached to a conversation message, or to the message being written (a draft attachment in the composer), shows as a thumbnail, loaded with the phone's key; the composer's full-screen image view loads it the same way. | BEH-001 | Medium | Parity with the desktop; the visible part of bug 1 | The phone already loads node images with its key elsewhere (`useAuthorizedObjectUrl`) | DEC-001 |
| REQ-002 | On the phone, tapping an attached file (uploaded, a draft attachment in the composer, a workspace path, or a path elsewhere on the node) opens it in the phone's own file viewer (or the composer's existing full-screen image view for a draft image), loaded with the phone's key, and Back returns to the conversation. The page never navigates itself to a node file URL. | BEH-002 | High | Bug 1 | 427/436 viewer path exists | Task |
| REQ-003 | Every explicit open of a file (a link in a conversation, a Files-tab click, an attachment tap) shows the file's current content on the desktop and the phone, including when the same file is already open. Unsaved edits in an open editor are kept, as today. | BEH-004, BEH-005 | High | Bug 2 | The text read is `network-only`; only the reuse is wrong | Task |
| REQ-004 | The Android app shows no pairing or error screen for a page-initiated navigation to a node route outside the phone page (`/rest/…`, `/graphql`). The page stays as it is. Its error screens for loading the phone page itself are unchanged. | BEH-002, BEH-007 | High | The second defect of bug 1; defense if any page code navigates to a node URL | Read: no legitimate main-frame `/rest/` load exists | Task |
| REQ-005 | Preserved: desktop attachments (BEH-003); files outside the workspace on the phone (BEH-006); a real credential rejection still lands on pairing (BEH-007); key rules unchanged; no new Android permission; subframe previews (426 blob frames) unchanged. | BEH-003, 006, 007 | High | Preserve | — | Task constraints |

## Acceptance Criteria

| AC ID | Requirements | Behavior / Scenario | Trigger | Expected Outcome | Alternate / Failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | Phone bundle, isolated node: a PNG attached in the composer, then the message sent | The composer chip and the sent message's chip are thumbnails; the composer's full-screen view shows the image; no 401 for either in the network log | Before: name chip, 401s | Phone-bundle probe |
| AC-002 | REQ-002 | SCN-001 | Tap the PNG, a PDF and a text file attached to messages and in the composer (draft); a workspace-path attachment; a path attachment of a run on another node | Each opens in the phone viewer with its content (a draft image: the composer's full-screen view); Back returns to the conversation; no main-frame navigation to `/rest/`; the other node's path shows "This file is available only on the host workspace." as file links do | Before: new document 401 | Probe + Android emulator (the app shows the viewer, never the pairing screen) |
| AC-003 | REQ-003 | SCN-002 | Desktop window: open a file link (VERSION-ONE); the file is rewritten (TWO); click the new link, and the same link again; open via the Files tab | Each open shows TWO; an unsaved edit in an open editor tab survives an open of the same file | Before: ONE until reload | Desktop probe (`nuxt dev` window) + store unit tests |
| AC-004 | REQ-003 | SCN-002 | Phone: the same with links, a workspace file and an image file rewritten | Each tap shows the current content (text and image) | Before: old until reload | Phone-bundle probe |
| AC-005 | REQ-004 | SCN-003 | Android: a main-frame navigation of the page to the node's `/rest/...` or `/graphql`; the phone page itself answering 401/403 | No navigation and no screen for the first; the existing screens for the second | — | `TrustedNavigationPolicyTest` + emulator |
| AC-006 | REQ-005 | — | Existing suites | Desktop attachment open, 436 node files, MSP-13 (rejected credential → pairing), 426 preview frames, route-policy tests pass | — | Existing suites |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Start | Steps | Outcome | Alternate | Validity | Evidence | REQ/AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User on the phone | See what he attached | Tap a chip | Message with attachments | Tap → viewer → Back | File shown | A file the node cannot read: the viewer's error, no pairing screen | Supported Normal Scenario | Screenshots 42, 43; repro | REQ-001, 002, 004 / AC-001, 002, 005 |
| SCN-002 | User | User (desktop or phone) | Read the agent's latest version | Click the new link | File opened before; agent rewrote it | Click → viewer | Current content | Unsaved edits kept | Supported Normal Scenario | Screenshots 44–47; repro | REQ-003 / AC-003, 004 |
| SCN-003 | System | Android app | Show the pairing screen only for a real rejection | Page navigation / page load error | — | — | — | — | Supported Normal Scenario | Code | REQ-004, 005 / AC-005 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`, existing elements only. Thumbnails as on the desktop; the phone's existing file viewer; no new screens or texts beyond the viewer's existing states. Product Design: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Measurable Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002, REQ-004 | Security | No credential in any URL; Android navigation stays as strict or stricter | — | Review + policy tests |
| QR-002 | REQ-003 | Performance | One content read per explicit open of an already-open file; none otherwise | — | Store unit test |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`.

## External Contracts And Dependencies

| Contract | Constraint | Authority | Risk |
| --- | --- | --- | --- |
| Node key rules (437) | Unchanged | Task | — |
| Android WebView, no multiple windows | `window.open` navigates the main frame | `AutoByteusWebView.kt:52` | — |

## Supplemental Artifacts

| Artifact Path | Purpose | Related AC | Status | Approval |
| --- | --- | --- | --- | --- |
| `evidence/repro/file-open-repro.mjs` | Reproduction | AC-001…004 | Current | Evidence |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The app's screen in screenshot 42 comes from the main-frame 401 of `window.open` | Bug 1's Android half | Emulator | Open (Read evidence strong) |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Show thumbnails on the phone? | The chips are only names today | The helper exists; the desktop shows thumbnails | Yes: parity and it is the same key-carrying load | Solution Designer | Decided |
| DEC-002 | What should the app do when the page navigates itself to a node route? | Today it shows a wrong pairing screen | Block with the "This link can't open here" screen; or stay on the page silently | Stay on the page: the user loses nothing, and the page has its own viewer | Solution Designer | Decided |
| DEC-003 | Reload on every explicit open, or show a snapshot with its time? | Bug 2 | The user expects the latest | Reload on every explicit open; no snapshots | Solution Designer | Decided |
| DEC-005 | The composer's draft attachments have the same defect (implementation DI-001): include them? | On an old APK a composer tap still shows the pairing screen; AC-001's network clause cannot pass otherwise | Include (about three files, same helpers) or follow-up | Include: the Task's direction is "tapping an attached image or file on the phone opens it", and the composer is the same capability on the same screen | Solution Designer | Decided (SR-003) |
| DEC-006 | A path attachment the phone cannot open here (a run on another node) | Silent nothing is a dead tap | Silent; or the notice file links show | Show the existing notice of file links ("This file is available only on the host workspace.", `useEventMonitorFilePreview` `file_available_on_host`), as a toast; consistency with links | Solution Designer | Decided (SR-003) |
| DEC-004 | Also refresh a viewer left open while the file changes? | Seen in D3 | Needs the live feed to cover unloaded folders, atomic rewrites and media | Not required by the user's case (he opens the link again); follow-up FU-001 | Solution Designer | Decided |

## Traceability

| Requirement | Use Cases | Behaviors | ACs | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 |
| REQ-002 | UC-001 | BEH-002 | AC-002 | SCN-001 |
| REQ-003 | UC-002 | BEH-004, 005 | AC-003, 004 | SCN-002 |
| REQ-004 | UC-003 | BEH-002, 007 | AC-005 | SCN-003 |
| REQ-005 | — | BEH-003, 006, 007 | AC-006 | — |

## Architecture Phase Input

- Reuse: the phone's Files screen, `authorizedFetch`, `useAuthorizedObjectUrl`, `editorDraft`.
- Constraints: REQ-005, QR-001.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes` (Solution Designer within the direction, user informed)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
