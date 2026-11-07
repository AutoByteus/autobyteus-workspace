# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `phone-message-file-reference-open` (Project Task `autobyteus-427`)
- Request / ticket: autobyteus-427, "Phone: a file named in a message (for example draft-v3.txt) opens on the desktop but not on the phone (find out whether it is on purpose or a bug)"
- Requested by (the user, or the delegating agent's address): `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-11-07
- Approved by and reference: `Solution Designer within the direction (user informed)`. Reference: the Solution Designer's conversation message of 2026-11-07, which tells the user the finding and this decision. The Task's own direction says: "or a bug (then fix it so the file opens on the phone as it does on the desktop, in the phone's own viewer)". No `Needs user` decision remains.
- Exact approved requirements baseline / solution revision: this document at SR-001
- Behavior-defining supplements and their approved versions: none. The governing phone design is autobyteus-277 DS-008, already approved and delivered (see External Contracts).

## Problem And Desired Outcome

- Problem: on the phone (`/mobile`, the Android app's WebView), tapping a file path in an agent's message does nothing visible. On the desktop, the same tap opens the file in the Files tab. The phone's intended behavior, from the phone design autobyteus-277 DS-008, is that the file opens full screen on the phone's Files screen. The phone's code path for this exists, but fails on every tap: the opener asks the router for the current route outside a component's setup, Vue returns nothing, and the open throws (Reproduced: investigation notes, Runtime findings).
- Answer to the user's question: **a bug, not on purpose.**
- Affected actors or systems: the user on the phone app (any paired node, any run whose conversation shows a clickable file path); the shared conversation view `AgentEventMonitor` used by both desktop and phone.
- Desired outcome: tapping a file path in a message on the phone opens that file in the phone's own file viewer (the Files screen, full screen; Back returns to the conversation), as DS-008 specifies.
- Observable definition of success: on an isolated node, a phone tapping a file path in a Team member's message sees the file's text in the phone's file viewer, and Back returns to the conversation.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Phone: a file path in a message is rendered as a clickable link (same renderer as the desktop). A tap runs the opener, which throws `TypeError: Cannot read properties of undefined (reading 'query')` after Vue warns `inject() can only be used inside setup()`. The result is `failed`, and the Files screen never opens. | The tap opens the Files screen with that file (`screen=files&workspace=<id>&file=<relative path>`), as a history entry, so Back returns to the conversation. | Which paths are clickable (absolute paths in Markdown links, inline code, prose and fenced code); the link's look and label. | Investigation notes: Source Log S-03 to S-07, Runtime R-01 |
| BEH-002 | User | SCN-002 | On the phone, nothing can open today, so this limit is never reached. By design (DS-008, autobyteus-403), the phone opens only a file inside the open run's workspace folder on this node. | Unchanged limit: a path outside the open run's workspace, or a run on another node, is not opened. The phone shows the existing status line ("This file is available only on the host workspace." / the remote-run wording) above the composer. | The phone reads no file beyond what it already may (the Files screen's workspace scope; autobyteus-403). | Notes S-05, S-06; existing spec `useEventMonitorFilePreview.mobileBoundary.spec.ts` |
| BEH-003 | User | SCN-003 | Desktop: a tap opens the file in the right panel's Files tab (embedded window: any absolute path; browser: inside the workspace). | Unchanged. | All of the desktop's open behavior. | Notes S-04, S-05 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User on the phone | Read a file an agent names in its message | The tap opens the file in the phone's viewer | Only files the phone may already read |
| User on the desktop | Same, on the desktop | Unchanged | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | On the phone, tap a file path in a run's conversation and read the file in the phone's file viewer | SCN-001, SCN-002 |

### Out Of Scope

- What files the phone may read: no widening (the Task's constraint; autobyteus-403). A file outside the run's workspace stays unopenable on the phone.
- Making relative file names (a bare `draft-v3.txt` without a path) clickable. Neither desktop nor phone does this today, and the desktop click the user saw is on an absolute-path reference (see ASM-001).
- Opening files of a run on another node from the phone (autobyteus-278 wording stays).
- The status line hidden on read-only conversations (FU-001).
- The desktop's open behavior.

### Non-Goals

- No new phone screen, viewer or wording; the existing Files screen and its viewer are reused.

### Preserved Behavior Boundary

- BEH-002 (phone read scope and its existing status texts), BEH-003 (desktop), the link rendering in BEH-001, and the existing `mobile-shell-probe` cases (MSP-08 Files and Messages references).

### Prerequisites

None.

| Prerequisite ID | Finding And Evidence | Blocks (REQ / AC IDs) | Sent To (agent) / Task Key | Status (written down / sent / delivered) |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite (Prerequisites above).
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | On the phone, tapping a clickable file path in a run's conversation (agent message, Team/Org member message, inter-agent message, think segment, task notification: every place the shared conversation view renders one) opens that file on the phone's Files screen, full screen, as a new history entry, when the path is inside the open run's workspace on this node. | BEH-001 | Must | The approved phone design (277 DS-008) says so; today it never works | N/A (Control run R-02 shows the open succeeds once the route is available) | autobyteus-277 DS-008; Task direction |
| REQ-002 | When the path is outside the open run's workspace, or the run is on another node, the phone opens nothing and shows the existing status line, as today. | BEH-002 | Must | Task constraint: no change to what files the phone may read | N/A | autobyteus-403; Task constraints |
| REQ-003 | The desktop's file-open behavior is unchanged. | BEH-003 | Must | Shared component | N/A | — |
| REQ-004 | An automated test proves the phone open through the real router (not a doubled navigation), and the phone browser probe covers a tap on a file path in a conversation on an isolated node. | BEH-001 | Must | The existing tests doubled the navigation, so the bug passed them | N/A | Task: "with a test"; TESTING.md |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-004 | BEH-001 / SCN-001 | Phone paired to an isolated node; a Team member's message names a file inside its workspace by absolute path; tap the link | The phone's file viewer shows the file's text; the URL has `screen=files`, the workspace id and the relative path; Back returns to the conversation | — | Browser probe on the phone bundle against a probe-owned node (extend `mobile-shell-probe`), screenshot |
| AC-002 | REQ-001, REQ-004 | BEH-001 | Component-level test: the conversation view mounted with a real router in the phone runtime; a click on a rendered file link | The route becomes the Files screen with the file; no `inject()` warning; result `opened` | — | Vitest without doubling `useMobileNavigation` / vue-router; it starts from the handed-over failing probe |
| AC-003 | REQ-002 | BEH-002 / SCN-002 | Phone; tap a path outside the run's workspace | No navigation; the status line "This file is available only on the host workspace." shows (writable conversation) | A remote run: the remote-run status | Existing boundary specs keep passing; one browser check |
| AC-004 | REQ-003 | BEH-003 / SCN-003 | Desktop; tap a file path | Opens in the right panel's Files tab, as before | — | Existing desktop specs (`useEventMonitorFilePreview.spec.ts`, `WorkspaceToolShell.spec.ts`, `RightSideTabs.workspaceTarget.spec.ts`) and `event-monitor-file-preview-probe` stay green |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User on the phone | Read a file an agent produced | Run screen, conversation; tap the file link | Phone paired; run of this node with a workspace; message names a file in it | Open run → tap file link → file viewer → Back | The file's text, full screen; Back to the conversation | File removed since: the viewer's own error state | Supported Normal Scenario | 277 DS-008; the user's report | REQ-001, REQ-004; AC-001, AC-002 |
| SCN-002 | User | User on the phone | Same, for a file the phone may not read | Same | Path outside the workspace, or remote run | Tap | Nothing opens; status line | — | Supported Explicit Edge Scenario | autobyteus-403; 277 DS-008 | REQ-002; AC-003 |
| SCN-003 | User | User on the desktop | Read the file | Desktop conversation | — | Click | Files tab opens it | — | Supported Normal Scenario | User's screenshot | REQ-003; AC-004 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`, for existing behavior only. No new UI. The approved phone design autobyteus-277 (DS-004 navigation, DS-008 file open) governs.
- Linked UI/UX or interaction supplement: N/A — not applicable (no new design)
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable
- Product ticket record and folder (externally owned): N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable (277 approved earlier)
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details, including the approved final references: the existing phone Files viewer
- Explicitly illustrative fixture content or permitted implementation variation: N/A
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: tap → Files viewer entry; Back returns
- Product decisions that need the user: none

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002, AC-003 | Security | The phone reads no file beyond the open run's workspace on this node (unchanged server-side checks, unchanged client mapping) | Phone runtime | Boundary specs; no server change |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`
- Data or state that must be preserved: N/A
- Loss, reset, rebuild, or regeneration that is acceptable: N/A
- Retention, privacy, compliance, volume, downtime, or operational constraints: tests use no private data
- Unknowns requiring downstream investigation: none

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| autobyteus-277 phone design, DS-008 (and DS-004 navigation) | A conversation file opens full screen on the Files screen, in the open agent's folder | Code comments in `useEventMonitorFilePreview.ts`, `useMobileNavigation.ts`; 277 delivery | None |
| autobyteus-403 phone route guard | Phone credentials read only the phone's routes | Task constraint | None; no server change |
| Vue `inject` / vue-router `useRoute`, `useRouter` | Return the router only in a setup or app injection context | Reproduced R-01, control R-02 | None |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `probes/probe427.mobileFileOpen.spec.ts` | Reproduction (fails today) and control | REQ-001, AC-002 | Current | Evidence; not behavior-defining |
| `user-desktop-screenshot.png` | The user's desktop screenshot | — | Current | Evidence |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The `draft-v3.txt` in the user's message is a link to the file's absolute path, shown as inline code. The desktop and phone renderers make only absolute paths clickable, and the screenshot shows it underlined (a link) and opened on the desktop. | Shows that the user's tap reached the broken opener, not a "not clickable" case | The run is on a node and its raw message is not on this machine. The fix holds whatever the path; if the path is outside the workspace, the user will see the status line (REQ-002). Not asking the user: the answer does not change the fix | Accepted |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | On purpose or a bug? | The Task's main question | 277 DS-008 says the phone opens the file; code tries and throws (R-01) | A bug: the intended behavior is specified and implemented, and fails only through a missing injection context | Solution Designer | Decided |
| DEC-002 | Ask the user which node/run? | Task allowed it | The failure happens on every phone tap, any run (R-01) | Not needed; reproduce on an isolated node | Solution Designer | Decided |
| DEC-003 | Also fix the read-only hidden status line? | Read-only conversations still show nothing when a file cannot open | Old behavior, desktop too; not the cause | Follow-up FU-001, keep the ticket small | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002 | SCN-001 | 277 DS-008; probe |
| REQ-002 | UC-001 | BEH-002 | AC-003 | SCN-002 | 403 |
| REQ-003 | — | BEH-003 | AC-004 | SCN-003 | — |
| REQ-004 | UC-001 | BEH-001 | AC-001, AC-002 | SCN-001 | probe |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001, SCN-002, SCN-003
- Product and system constraints architecture must preserve: phone read scope; desktop behavior; the lazy loading of the opener (`AgentEventMonitor` imports it only on a user tap)
- Decisions intentionally deferred to architecture design: how the phone's navigation reaches the lazily created opener
- Technical facts architecture should verify: no other lazily created caller of `useMobileNavigation`; the probe's path to an end-to-end case
- Known feasibility or integration risks: none

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
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded (the user's, or yours within the direction with the user informed): `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
