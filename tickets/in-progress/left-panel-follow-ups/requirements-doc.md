# Requirements Document

## Document Status

- Status: `Approved`.
- Current solution revision ID: `SR-001`.
- Request: Project Task `autobyteus-388`, from the user through `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).
- Approved by: the Solution Designer, within the direction (the user informed). The Task allows "done, or the team explains why it is not worth it" per item. Date: 2026-11-06.

## Items And Decisions

| ID | Item | Decision | Reason |
| --- | --- | --- | --- |
| DEC-001 | FU-001 + FU-005: remove GraphQL `createAgentRun`? | **Keep it.** Remove only the web's unused `CreateAgentRun` document and its generated types. The probes keep using `createAgentRun` | It is the documented one-call creation API (E-02), used by 90 server test files and 18 probes (E-01). Moving them to prepare plus a WebSocket first message would make every test more complex for no product gain. The web document is dead code (E-03) |
| DEC-002 | FU-003: rename the run section host | **Do it:** `WorkspaceAgentRunsTreePanel` becomes `RunSectionPanel`. The specs, the localization key namespace and the docs follow. The unused key `this_workspace` is removed | It hosts three views and the history load. A name after one view misleads (E-04) |
| DEC-003 | FU-004: an open Projects view misses another client's new run | **Do it in the web, without a new feed event.** While the Projects view is shown, the run history poll's set of root runs is compared with the previous poll. When it changes (a run added or removed by anyone), every loaded Project is re-read | A server event at `recordStart` would race with the run's own records (E-06), and a correct one needs cross-module plumbing. The run section already polls every 5 s in every view (E-07), so this is exact within one poll, at the cost of one read per loaded Project per change |

## Requirements

| ID | Requirement |
| --- | --- |
| REQ-001 | GraphQL `createAgentRun` stays, with its behavior unchanged. The web has no unused `CreateAgentRun` document or generated types |
| REQ-002 | The run section host is named `RunSectionPanel`, and nothing in product code, tests, localization or docs still uses the old name (except ticket history) |
| REQ-003 | With the Projects view shown, a run started or removed by another client (another window, the phone, an application, the API) appears in or leaves its Project within one poll (about 5 s), without switching views |

## Acceptance Criteria

| AC | Requirement | Expected Outcome |
| --- | --- | --- |
| AC-001 | REQ-001 | `git grep CreateAgentRun` in the web finds no document or generated type (only `CreateAgentRunInput` where still referenced). The server suites that use `createAgentRun` pass |
| AC-002 | REQ-002 | `git grep WorkspaceAgentRunsTreePanel` outside `tickets/` is empty. The web suite, typecheck and the localization guards pass |
| AC-003 | REQ-003 | A run created through the API under a Project appears in an open Projects view within one poll (the PLN-08 case of autobyteus-385, which then failed for 60 s). With the view hidden, no Project reads happen. This window's own actions still re-read as today |
| AC-004 | all | Tests; finalized on `personal`. Release only on the user's word |

## Scope Guardrail

- Out of scope: other run creation APIs; a new `/ws/projects` event; the poll interval.
- Preserved: `createAgentRun`'s behavior; the Projects view's rows and existing re-read triggers; the Workspaces and Runs views.
- Persisted data affected: `No`.
