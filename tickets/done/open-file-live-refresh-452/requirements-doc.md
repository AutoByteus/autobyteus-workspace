# Requirements Document — autobyteus-452

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `open-file-live-refresh-452`
- Request / ticket: Project Task `autobyteus-452` (FU-001 of autobyteus-450); the user approved it on 2026-11-11 (PM message)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user
- Requirements owner: Solution Designer
- Date: 2026-11-11
- Approved by and reference: `Solution Designer within the direction (user informed)`; SR-001 and the Solution Designer's message to the user, 2026-11-11
- Behavior-defining supplements: None

## Problem And Desired Outcome

- Problem: a file viewer left open (desktop or phone) does not refresh when the file changes on disk if the file is in a folder not expanded in the file tree, or if it is an image or PDF. Reproduced: no refresh after 8 s. In a loaded folder, text refreshes in about 0.5 s, including an atomic rewrite.
- Desired outcome: an open viewer shows the new content within a few seconds after any rewrite of a workspace file: text, image or PDF, in any folder, in place or atomic. No reads happen when nothing changed, and unsaved edits are kept.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Current | Desired | Preserved |
| --- | --- | --- | --- | --- |
| BEH-001 | System | Loaded folder, text: refresh ~0.5 s | Unchanged | Yes |
| BEH-002 | System | Atomic rewrite, loaded folder: refresh ~0.5 s | Unchanged; also in unloaded folders | Yes |
| BEH-003 | System | Unexpanded folder: no refresh | Refresh within 3 s | — |
| BEH-004/005 | System | Image/PDF: no refresh | Refresh within 3 s | — |
| BEH-006 | User | Explicit open shows current content (450) | Unchanged | Yes |
| BEH-007 | User | Unsaved edits kept | Unchanged | Yes |
| BEH-008 | System | Files outside the workspace (phone 436, Electron local): no live feed | Unchanged (FU-001) | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenario |
| --- | --- | --- |
| UC-001 | Keep a workspace file open (desktop or phone, text, image or PDF) while the agent rewrites it, and see the new content without acting | SCN-001 |

### Out Of Scope

- Files opened by absolute path outside the workspace (phone 436, Electron local files): FU-001.
- Showing that a file was deleted while open.
- Folder-tree refresh behavior (unchanged).

### Non-Goals

- Sub-second refresh guarantees beyond today's watcher timing (`awaitWriteFinish` 200 ms plus batching).

### Preserved Behavior Boundary

BEH-001, BEH-002, BEH-006, BEH-007; REQ-002.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Behaviors | Priority | Feasibility |
| --- | --- | --- | --- | --- |
| REQ-001 | When a workspace file that is open in a viewer (desktop window or phone; text, image or PDF) changes on disk, in place or by an atomic rename, in any folder whether expanded or not, the viewer shows the new content within 3 s, without the user acting. | BEH-002…005 | High | The node's watcher sees every change (measured: 20/20); loaded-folder text already refreshes in ~0.5 s |
| REQ-002 | Preserved: no content read or folder read happens when no open file changed; a change to a file that is not open causes no read; unsaved edits are kept; the window's own saves do not cause a reload loop (as today); explicit opens (450) and the phone's key-based reads (436) are unchanged. | BEH-001, 006, 007 | High | — |

## Acceptance Criteria

| AC ID | Requirements | Trigger | Expected Outcome | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | Desktop window and phone: open `deep/inner/a.md` (folder never expanded); rewrite it in place, then atomically | Viewer shows the new text within 3 s each time | Probe (repro shape) on the phone bundle and a desktop window |
| AC-002 | REQ-001 | Open `pics/c.png` and `docs/d.pdf` (unexpanded folders) and a root image; rewrite each | The viewer re-reads within 3 s and shows the new image/PDF (an image's new size, a PDF's new text) | Probe |
| AC-003 | REQ-002 | An open text file with an unsaved edit; the file changes on disk | The edit stays | Store unit test + desktop probe |
| AC-004 | REQ-002 | 20 files that are not open are rewritten; the window's own save of an open file | No content or folder reads for the 20; one save, no reload loop | Probe network log + unit test |
| AC-005 | REQ-002 | Existing suites (file explorer, 450 explicit open, phone viewer) | Pass | Existing suites |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Steps | Outcome | Validity | Evidence | REQ/AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | The agent (or anything) rewriting a workspace file while the user watches it | See the agent's latest version | The file changes on disk | Watcher → node → window → viewer reload | New content within 3 s | Supported Normal Scenario | 450 FU-001; repro | REQ-001, 002 / AC-001…005 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (existing viewers). Product Design: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement |
| --- | --- | --- | --- |
| QR-001 | REQ-001 | Performance | ≤ 3 s from the change to the viewer's new content |
| QR-002 | REQ-002 | Performance | 0 content reads for changes to files that are not open; no polling |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`.

## External Contracts And Dependencies

| Contract | Constraint | Risk |
| --- | --- | --- |
| File-explorer stream (`/ws/file-explorer/:workspaceId`) between the node and the web client of the same release | May change as a clean cut (DESIGN.md rule 9); only the node and the web client read `modify` | — |

## Supplemental Artifacts

| Artifact | Purpose | Related AC | Status |
| --- | --- | --- | --- |
| `evidence/repro/open-viewer-refresh-repro.mjs` | Reproduction | AC-001, 002 | Evidence |

## Assumptions

None open.

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Is the atomic rewrite a separate defect? | The Task lists it | Measured: in a loaded folder it refreshes (watcher reports `change`) | Not separate; covered by the unloaded-folder fix; AC-001 still tests it in an unloaded folder | Solution Designer | Decided |
| DEC-002 | Files outside the workspace? | Same symptom on the phone (436) and in Electron | No watcher exists for them; a watcher per open external file is a new mechanism | Out of scope; FU-001 | Solution Designer | Decided |
| DEC-003 | Refresh pace | Constraint: no new reads when nothing changed | Event-driven, no polling | ≤ 3 s, driven by the node's watcher | Solution Designer | Decided |

## Traceability

| Requirement | Use Cases | Behaviors | ACs | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-002…005 | AC-001, 002 | SCN-001 |
| REQ-002 | UC-001 | BEH-001, 006, 007 | AC-003, 004, 005 | SCN-001 |

## Architecture Phase Input

- Reuse the node's watcher, the stream and 450's `_reloadOpenFile`.
- Clean-cut stream change allowed.

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
