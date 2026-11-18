# Docs Sync Report

## Scope

- Ticket: `collaboration-tree-open-tasks-only-469` (Project Task `autobyteus-469`); `task_size` `Large`, `architectural_risk` `High`, route `Reviewed` (architecture review, code review CRR-001…CRR-004, API/E2E API-REV-002)
- Trigger: test-code review pass CRR-004 from the code reviewer (2026-11-11)
- Bootstrap base reference: `origin/personal` `bff4faa6f6`
- Integrated base reference used for docs sync: `origin/personal` `bff4faa6f6` (fetched 2026-11-11; the branch was already current, nothing to integrate)
- Post-integration verification reference: no rerun needed (no new base commits); the validated state is API/E2E round 2 at `c7eb0d8626` (product `fa48d74a3e`)

## Why Docs Were Updated

- Summary: the change removes the stored list of local delegated runs from every coordinating run's tree file; the tree is built in memory from open Task records. The implementation and IR-002 updated the Collaboration Model, the streaming protocol, six server module docs and two web docs. Delivery checked each against the final code and corrected one sentence that still described the closed-execution list as unfiltered.
- Why this should live in long-lived project docs: the Collaboration Model (CM-6, CM-8) is the canonical contract `DESIGN.md` points to; the stream and module docs are what later tickets (first `autobyteus-461`) read to change the same code.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules | No change | No rule changed; the ticket follows rules 7, 9, 11 as written |
| `TESTING.md` | Project testing guideline | No change | No command or rule changed; no report recorded a discrepancy. The E2E stand-in (`openEveryOwnFileUnder`) and the released-fixture Task records are test-code facts, documented in the test files |
| `RELEASE.md` | Release guide | No change | Followed as written; its Rollback section already covers a release that cannot be rolled back |
| `autobyteus-server-ts/docs/design/collaboration_model.md` | Canonical contract (REQ-008) | No change by delivery (updated in the change) | CM-6, CM-8 and the status table state the rule. §3 remote-link wording is FU-004 (pre-existing, outside this ticket) |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | `TASK_EXECUTIONS_REOPENED` now carries the record (IR-002) | No change by delivery | Lines 139–151 match `fa48d74a3e` |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | Task closure / reactivation text | Updated | See below |
| `autobyteus-server-ts/docs/modules/{agent_memory,agent_orgs,agent_team_execution,projects,standalone_agent_run_root}.md` | Module docs named in REQ-008 | No change by delivery | Consistent with the final code |
| `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md` | Team view reopened handling, Team-tab names | No change by delivery | Match IR-002 |
| `autobyteus-web/docs/workspace_layout.md` | Mentions `closedTaskExecutionsDigest` | No change | The digest is computed from the Task index, unchanged by this ticket |
| `autobyteus-server-ts/docs/design/data_migration_guideline.md` | Governs the no-migration decision | No change | The ticket applies section 3 as written |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_communication.md` (Task closure) | Correction | `closed_task_executions` is the closed executions the tree still holds; `listClosedTaskExecutions` keeps only references the tree contains; since autobyteus-469 a stopped run of a closed Task is not in it, a run whose stop is unconfirmed is | The text said "the task executions whose current Task is DONE or CANCELLED"; the code filters by tree membership (`src/agent-collaboration/execution/task/task-execution-closure.ts:15`), and with D-4 that filter now drops stopped runs (E2E task-closure asserts the empty list) |
| Server and web docs listed in the Scope | Updated in the change (implementation, IR-002) | The tree is built from open Task records; a stopped closed run leaves it and comes back on continuation; Team `TASK_EXECUTIONS_REOPENED` carries the record | REQ-008 |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Tree source | A coordinating run stores no local delegated run; its tree is composed from Task records with an open entry naming it plus each run's own file; remote links stay stored | `design-spec.md` D-1…D-3 | `collaboration_model.md` CM-8 |
| Loaded tree lifecycle | Drop on confirmed stop after the last open Task closes; add back from own file on continuation or follow-up Task | D-4 | CM-6; `agent_communication.md`; `projects.md` Reactivation |
| Team reopened event | Carries each execution's record; a view without it inserts it | SR-009, D-8 | `agent_websocket_streaming_protocol.md`; web `agent_execution_architecture.md` |
| Old data | Old local entries ignored, dropped at next save; no migration; runs with no Task record are in no tree | D-5, DEC-005, DEC-008 | CM-8 status table, CM-6 exception row |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Stored local `taskExecutions` links / full records in tree files | In-memory composition from Task records (`OpenDelegatedRunSource`) and own files | `collaboration_model.md` CM-8 |
| Team view stream recovery for an unknown reopened reference | Insert from the record the event carries | `agent_websocket_streaming_protocol.md`; web `agent_execution_architecture.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, archive, finalization
- Notes: follow-ups FU-001…FU-004 stand as recorded in `follow-ups.md`; delivery added none.
