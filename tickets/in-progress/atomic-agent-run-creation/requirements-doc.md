# Requirements Document — atomic-agent-run-creation (autobyteus-349)

## Document Status
- Status: **Ready for Approval** (DEC-001 needs the user). Current solution revision ID: `SR-001`.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), Task
  `autobyteus-349`, 2026-10-31, at the user's word; brief: 339 FU-004, FU-003. Requirements owner: Solution Designer.
- Approved by: pending. Supplements: none.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/atomic-agent-run-creation`, branch
  `codex/atomic-agent-run-creation`, base `origin/personal` @ `e87e6bb2b1`, target `personal`.

## Problem And Desired Outcome
- **Problem:** creating an agent run in one call (`createAgentRun`) stores a prepared run first and then starts it.
  If the start fails, the stored run stays; if the server stops during the start, it stays too. Each appears in history
  as an empty offline run. The rule that should remove old never-started runs (24 h) is never run.
- **Desired outcome:** a failed start leaves nothing behind. Never-started runs left by an interrupted start, or by an
  abandoned two-step start, are removed at startup (DEC-001).
- **Success:**
  - after a failed or interrupted one-call creation, no empty run is in history;
  - the startup removal follows DEC-001, with each removal logged;
  - tests cover both.

## Relevant Current And Desired Behavior
| ID | Kind | Current (evidence) | Desired | Preserved |
| --- | --- | --- | --- | --- |
| BEH-001 | Contract | A failed start in `createAgentRun` leaves a never-started run (F-01) | The never-started run is removed, and the caller gets the original error | A run that already started is never removed (F-03, F-04) |
| BEH-002 | Operational | Never-started runs are never removed (F-05) | Removed at startup per DEC-001, each logged | Started runs, and runs being used, are never touched |
| BEH-003 | User / contract | Two-step creation: the web app's first message and remote delegation prepare, then activate (F-06, F-07) | Unchanged while the server runs | **Preserved** |

## Scope Guardrail
- In scope: UC-001 the one-call creation `createAgentRun` (GraphQL, applications, Model Routing); UC-002 server startup.
- Out of scope:
  - Team and Org creation (no such path, F-09);
  - a periodic removal while the server runs;
  - the web app's own cancel (it stays);
  - hiding runs in history.
- Preserved: BEH-003; started runs; run restore.
- Prerequisites: none.

## Requirements
| ID | Requirement | BEH | Priority | Feasibility | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | **One-call creation is all or nothing.** When starting the run fails, `createAgentRun` removes the run it prepared and returns the start's error. If the removal itself is refused (the run started, or is in use), the run stays and the refusal is logged | BEH-001 | Must | N/A (our own code; `cancelPreparedAgentRun` exists, F-03) | FU-004 |
| REQ-002 | **Never-started runs are cleaned at startup** per DEC-001, before the server accepts requests; each removal is logged with the run ID and title; unreadable run data is skipped and logged, never deleted (DESIGN rule 7) | BEH-002 | Must | N/A (`cleanupStalePreparedRuns` exists, F-05) | FU-003; DEC-001 |
| REQ-003 | Two-step creation and started runs unchanged | BEH-003 | Must | — | — |

## Acceptance Criteria
| ID | REQ | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | `createAgentRun` whose activation fails (for example, activation admission closed, a runtime that cannot start) | No history row and no run directory remain; the caller gets the activation error | Unit/integration |
| AC-002 | REQ-001 | Activation fails after `startedAt` was committed | The run is not removed; the refusal is logged | Unit |
| AC-003 | REQ-002 | Startup with never-started runs per DEC-001, plus started runs and an unreadable run | The DEC-001 set is removed and logged; started and unreadable runs untouched | Integration on a temporary data root |
| AC-004 | REQ-001, REQ-002 | 339's API-02 shape: a create still running when the server process ends, then relaunch | No empty run in history after the relaunch | Server-level probe |
| AC-005 | REQ-003 | The web first message; remote delegation | Unchanged | Existing tests |

## Data Continuity And Acceptable Loss
- Persisted data affected: **Yes**. Startup removes never-started runs, including, at first start after the update,
  those already in history.
- Acceptable loss (DEC-001): a never-started run is empty: no messages and no memory. It may carry a title (the user's
  first-message text in the web flow) and copies of attachments. It is restorable today (F-08).

## Decisions
| ID | Question | Options / evidence | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | At startup, which never-started runs are removed? | **A** every never-started run (a restart ends every preparation still in progress); **B** only those past their 24 h expiry (the existing rule); **C** none removed: hide never-started runs from the history list instead | **A.** After a restart nothing can still start such a run, except a peer whose work packet was in flight in the seconds around the restart, or a web send cut by the restart; both then report a failure the user sees. A meets "an interrupted start leaves no empty run". B leaves interrupted runs visible for up to a day, or longer on a node that rarely restarts. C keeps hidden debris and changes what history means | User (it deletes stored runs) | **Needs user** |
| DEC-002 | Also remove never-started runs periodically while the server runs? | A long-running node (Docker) rarely restarts; a web client that crashes between prepare and send leaves one | **No, not now:** the one-call path is atomic (REQ-001), and the web client cancels its own; a timer is machinery without a measured need (DESIGN rule 1). Follow-up | Solution Designer | Decided |
