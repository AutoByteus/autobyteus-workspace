# Requirements Document — atomic-agent-run-creation (autobyteus-349)

## Document Status
- Status: **Approved** (SR-002, 2026-10-31; AC-004 narrowed in SR-005 by the user's DEC-003). Current solution revision ID: `SR-005`.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), Task
  `autobyteus-349`, 2026-10-31, at the user's word; brief: 339 FU-004, FU-003. Requirements owner: Solution Designer.
- Approved by: **the user**, 2026-10-31.
  - He was shown the read-only count: 6 truly empty never-started runs and 11 May runs with real conversations but no
    start date.
  - He was shown the revised proposal: undo a failed start at once; at startup remove only never-started runs with no
    content at all; do not use the 24 h rule.
  - He answered: "Yeah, go ahead, thanks for your recommendation."
- Supplements: none.
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
| REQ-002 | **Empty never-started runs are cleaned at startup** (DEC-001 = A, revised): before the server accepts requests, a run is removed only when its record is readable, has `preparedAt` and no `startedAt`, **and its folder holds no file besides the record** (no conversation, no journal, no attachments). Each removal is logged with the run ID and title. A run with any content is kept, whatever its record says; unreadable run data is skipped and logged, never deleted (DESIGN rule 7). The 24 h expiry rule is not used | BEH-002 | Must | N/A (`cleanupStalePreparedRuns` exists, F-05) | FU-003; DEC-001 |
| REQ-003 | Two-step creation and started runs unchanged | BEH-003 | Must | — | — |

## Acceptance Criteria
| ID | REQ | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | `createAgentRun` whose activation fails (for example, activation admission closed, a runtime that cannot start) | No history row and no run directory remain; the caller gets the activation error | Unit/integration |
| AC-002 | REQ-001 | Activation fails after `startedAt` was committed | The run is not removed; the refusal is logged | Unit |
| AC-003 | REQ-002 | Startup on a temporary data root with: an empty never-started run; a never-started run with a conversation log (the May shape: `activationState`, no `startedAt`); one with only a context file; a started run; an unreadable record | Only the empty never-started run is removed (row and folder) and logged; all others untouched | Integration on a temporary data root |
| AC-004 | REQ-001, REQ-002 | 339's API-02 shape: a create still running when the server **stops normally** (SIGTERM: quit, Restart server, update restart, `docker stop` within its grace), then relaunch | No empty run in history after the relaunch. A **hard kill** (SIGKILL) during activation may leave an empty entry: accepted residual (DEC-003, FU-005) | Server-level probe |
| AC-005 | REQ-003 | The web first message; remote delegation | Unchanged | Existing tests |

## Data Continuity And Acceptable Loss
- Persisted data affected: **Yes**. Startup removes never-started runs, including, at first start after the update,
  those already in history.
- Acceptable loss (DEC-001): only never-started runs with no file besides the record (on the user's data today: 6). A run with a title but no files is removed together with its title; a run with attachments or any log is kept.

## Decisions
| ID | Question | Options / evidence | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | At startup, which never-started runs are removed? (revised after the read-only count) | **A** every never-started run (a restart ends every preparation still in progress); **B** only those past their 24 h expiry (the existing rule); **C** none removed: hide never-started runs from the history list instead | **A.** After a restart nothing can still start such a run, except a peer whose work packet was in flight in the seconds around the restart, or a web send cut by the restart; both then report a failure the user sees. A meets "an interrupted start leaves no empty run". B leaves interrupted runs visible for up to a day, or longer on a node that rarely restarts. C keeps hidden debris and changes what history means | User (it deletes stored runs) | **Decided: A with the content check** (the user, 2026-10-31). The count showed 11 May runs marked never-started that hold real conversations, so "never started" alone is unsafe; only runs with no content are removed |
| DEC-003 | (SR-005, CRR-002 F-API-001) After a hard kill in the few hundred ms of an activation, the leftover holds the system-instruction trace (`raw_traces_active.jsonl`, ~2 KB) and sometimes a stale `run_metadata.json.*.tmp`, so the strict content check keeps it | (a) treat those files as non-content (the delete rule then parses trace contents); (b) write the system-instruction trace only after `startedAt` is committed (root fix in runtime activation, outside this ticket); (c) accept it as a residual and record a follow-up | **(c).** Rare (a hard kill in a sub-second window), cosmetic (one empty entry, as on the base build), while (a) makes a data-deleting rule depend on parsing file contents and (b) changes every runtime's activation for it. A normal stop, including update restarts, already leaves nothing (API/E2E). (b) is the follow-up's fix | The user (2026-10-31: asked for the recommendation and left it to it, "I think you have good reasoning skill"; told the choice is C) | **Decided: C** |
| DEC-002 | Also remove never-started runs periodically while the server runs? | A long-running node (Docker) rarely restarts; a web client that crashes between prepare and send leaves one | **No, not now:** the one-call path is atomic (REQ-001), and the web client cancels its own; a timer is machinery without a measured need (DESIGN rule 1). Follow-up | Solution Designer | Decided |
