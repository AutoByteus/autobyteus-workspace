# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-004`
- Package identifier: `phone-registered-folders-436`
- Request / ticket: Project Task `autobyteus-436`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-11-09
- Approved by and reference: `User`, 2026-11-09, in the Solution Designer's conversation. Asked "drop the folder list entirely, and let the phone open any file a conversation names, read-only … Shall I go with this simpler version?", he answered: "Yes I also think so let's drop this limitation now just can just open any files now yeah from the phone it's just limited it to read only I guess right" (confirmed: read-only).
- Exact approved requirements baseline: this document, SR-004. It replaces the SR-001…SR-003 baseline (the Settings folder list, design A), which the user dropped; that history is in `solution-revision-record.md`.
- Behavior-defining supplements: `autobyteus-server-ts/docs/design/node_access_model.md` (the project's node access contract; this ticket adds its node-file scenarios, NAS-39 and NAS-40).

## Problem And Desired Outcome

- Problem: on the phone, tapping the path of a file an agent names in a conversation opens it only when it is inside the run's own folder. Files in a team's git worktree (`/Users/normy/autobyteus_org/autobyteus-worktrees/<ticket>/…`), and anywhere else on the computer, show "This file is available only on the host workspace."
- Why it can be simple now: since autobyteus-437 slice 1 (beta v1.5.12-beta.9), only the owner's devices holding a credential reach a node (`node_access_model.md` NA-1, NA-3). A paired phone's credential can already read any folder by starting a run there (investigation "Resumed 2026-11-09"), so a folder list on links alone would add a Settings page without a real limit. The user chose no limit for now; limits on a phone's credential, if any, are decided in autobyteus-441.
- Desired outcome: on the phone, tapping any absolute file path in a conversation opens that file **read-only**, wherever it is on the node's computer (a Docker node: inside its container), with no setup.
- Observable definition of success: tapping the `data-contract.md` path in the `package-personal-settings` worktree opens it on the phone; nothing on the phone can change, rename or delete it.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-002 | Phone link opens only inside the run's folder; otherwise "This file is available only on the host workspace." | Inside the run's folder: as today. Anywhere else: opens read-only by its absolute path | Inside-folder behavior | `useEventMonitorFilePreview.ts:46-63` |
| BEH-002 | Contract | SCN-003 | The node has no route to read a file by absolute path; files are read through registered workspaces | A read-only route returns one file by absolute path to owner and phone credentials | 437 gate, Host and Origin rules, `sendUserFile` | `api/rest/workspaces.ts`; `node-route-permissions.ts` |
| BEH-003 | User | — | Phone's other features (new run in a typed folder, Files tab, node desktop) | Unchanged | All | 437 |
| BEH-004 | User | — | Desktop app opens local files directly | Unchanged | All | `useEventMonitorFilePreview.ts:102-104` |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | The phone opens a file named in a conversation, read-only, wherever it is on the node's computer | SCN-001, SCN-002 |
| UC-002 | The node serves one file by absolute path, read-only, to owner and phone credentials | SCN-003 |

### Out Of Scope

- Any folder list or Settings page (dropped by the user).
- Limits on what a phone's credential may read, key expiry, application-scoped keys: autobyteus-441.
- Writing, renaming, deleting, uploading or listing folders through this route; opening a folder.
- The desktop app's file opening (unchanged), including the desktop's handling of a remote node's paths.
- Relative images inside a Markdown file opened by absolute path (they show as not loaded; files inside the run's folder keep today's behavior).

### Non-Goals

- No protection against the paired phone itself: whoever holds a paired phone can read any file until it is revoked (accepted by the user; see DEC-001).

### Preserved Behavior Boundary

- BEH-001 inside the run's folder, BEH-003, BEH-004; every 437 rule (NA-1…NA-15) and scenario.

### Prerequisites

None (autobyteus-437 slice 1 is delivered).

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| ID | Requirement | Behavior | Priority | Rationale | Feasibility | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | On the phone, tapping an absolute file path in a conversation opens the file read-only on the Files screen (full screen, a history entry; Back closes it). Inside the run's folder it opens as today; anywhere else it opens by its absolute path. | BEH-001 | Must | The user's request | Phone viewer exists (`MobileFileViewer.vue`) | DEC-001 |
| REQ-002 | The node serves one file by absolute path, read-only (GET only), to owner and phone credentials; peers and memory sync sources are refused (403, NA-7). The answer uses the user-file reply (`sendUserFile`: its type, sandbox CSP, `nosniff`). | BEH-002 | Must | One read-only door | 437 gate decides by client kind | DEC-002 |
| REQ-003 | The path must be absolute; the node resolves it (including symbolic links) and serves only a regular file. A relative path is refused (400 `NODE_FILE_PATH_INVALID`), a missing one 404 `NODE_FILE_NOT_FOUND`, a folder 400 `NODE_FILE_IS_FOLDER`. No folder is ever listed. | BEH-002 | Must | Read-only, one file | — | DEC-002 |
| REQ-004 | The phone shows: missing → "This file was not found on the computer."; folder → "This path is a folder, not a file."; other failures → today's "The file preview could not be opened." | BEH-001 | Must | Clear messages | — | DEC-003 |
| REQ-005 | The same file types display as for workspace files (text and code, Markdown, images, PDF, and so on); a large text file shows the existing "too large" state. | BEH-001 | Must | Consistency | Existing viewer and size limit | — |
| REQ-006 | On a Docker node, paths are the container's own (its volumes and host-backed folders). | BEH-002 | Must | Same rule everywhere | — | — |

## Acceptance Criteria

| AC ID | REQ | Scenario | Trigger | Expected | Alternate | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-005 | SCN-001 | Phone shell (isolated node), a conversation naming a Markdown file and an image outside the run's folder | Each opens read-only on the Files screen; Back closes it; no edit, rename or delete control | A path inside the run's folder opens as today | Phone shell probe (MSP) |
| AC-002 | REQ-002, REQ-003 | SCN-003 | Isolated node; phone credential and owner credential; GET the node-file route for a file outside every workspace | 200 with the file's content and the user-file headers | Peer and memory sync credentials: 403; no credential: 401 (NA-1); POST/PUT/DELETE: not served | Server e2e |
| AC-003 | REQ-003 | SCN-003 | Relative path; `..` path; missing file; folder; a symbolic link to a file outside the workspace | 400 / 400 / 404 / 400 / 200 with the target file | — | Server e2e |
| AC-004 | REQ-004 | SCN-002 | Phone taps a missing path and a folder path | The two messages | — | Phone probe or component test |
| AC-005 | REQ-006 | SCN-003 | Test-owned Docker node | A file in `/home/autobyteus/shared` opens on the phone | — | Docker probe or e2e |
| AC-006 | Preserved | — | Existing phone and desktop probes | Pass | — | `test:e2e:mobile-shell`, server suites |

## Relevant Scenarios And Journeys

| ID | Kind | Actor | Goal | Trigger | Steps | Outcome | Validity | Related |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Owner on the phone | Read a file an agent named, anywhere | Tap the path | — | File opens read-only | Supported Normal | REQ-001, REQ-005 |
| SCN-002 | User | Owner on the phone | Same, path missing or a folder | Tap | — | Message | Supported Normal | REQ-004 |
| SCN-003 | Contract | Owner/phone credential; other kinds | Read one file by path | GET the route | — | Served or refused | Supported Explicit Edge (security contract NA-7) | REQ-002, REQ-003, REQ-006 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`, small: the existing phone file viewer opens for a path outside the run's folder; two new messages (REQ-004). No Settings page. Product Design not requested.

## Quality And Non-Functional Requirements

| ID | Related | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-002, REQ-003 | Security | Read-only; one file; resolved real path; no folder listing; no path in a log beyond the existing access log policy | e2e, review |
| QR-002 | REQ-002 | Performance | The file is streamed (no whole-file buffering on the node) | Review |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`.

## Decisions

| ID | Question | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Folder list, node-enforced limit, or no limit? | (1) Folder list for links; (2) also node-enforced now; (S) no limit: open any file read-only | After 437 only the owner's devices reach the node, and the phone credential already reaches every folder; a list on links alone adds a page without a real limit. **Recommended S**; limits on the phone credential belong to autobyteus-441 | User | Decided by the user: **S, read-only** (2026-11-09) |
| DEC-002 | Which clients may use the node-file route? | Owner + phone (the route table's default) | Peers and memory sync sources have no use for it (NA-7) | Solution Designer | Decided |
| DEC-003 | Messages | — | Say what happened and where | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 |
| REQ-002 | UC-002 | BEH-002 | AC-002 | SCN-003 |
| REQ-003 | UC-002 | BEH-002 | AC-003 | SCN-003 |
| REQ-004 | UC-001 | BEH-001 | AC-004 | SCN-002 |
| REQ-005 | UC-001 | BEH-001 | AC-001 | SCN-001 |
| REQ-006 | UC-002 | BEH-002 | AC-005 | SCN-003 |

## Readiness Check

- Content ready for approval: `Yes`
- Approval recorded: `Yes` (user, 2026-11-09)
- Approved requirements package ready for architecture design: `Yes`
