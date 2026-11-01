# Requirements Document — autobyteus-348 (runtime switch for Team members, Org members and delegated copies)

## Document Status

- Status: `Approved` (SR-001) within the direction. The user asked for this directly and as the first priority of the Task (2026-11-01: "an agent team consists of individual agents too; an agent organization consists of teams and individual agents; we can even say it's still like an individual agent… we need to continue to do that now"). Nothing in it needs a further user decision: the behavior is the single-agent behavior of autobyteus-316 applied to more runs.
- Current solution revision ID: `SR-001`
- Package identifier: `runtime-switch-members`
- Request / ticket: Project Task `autobyteus-348` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`); this document covers its first priority, FU-003 of autobyteus-316. The Task's other items (a router or an agent starting a switch, the failed-turn record, the notice order, the offline-host check: FU-004, FU-001, FU-005, FU-008) follow in the same Task after this is delivered and are **not** part of SR-001.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user.
- Requirements owner: Solution Designer. Approval: the user's request (above) and the Solution Designer within the direction.
- Behavior-defining supplements: `switch-member-record-contract.md` (data of a member's switch; approved with the design). Evidence: `investigation-notes.md`.

## Problem And Desired Outcome

- Problem: since autobyteus-316 a stopped standalone Agent run can continue on another agent runtime: the user changes the runtime in its settings and sends a message. Team members, Org members and delegated copies keep their runtime locked, so when one of them hits a usage limit its work cannot move.
- Why the first delivery was a single agent (told to the user): it was the team's recommended smaller first slice, accepted by the user on 2026-10-30. A standalone run keeps its provider binding in its own `run_metadata.json`; a member's binding lives in the saved structure of its Team or Org, and a copy's in its coordinating run's saved structure plus its own file, so the edit, the saving and the activation touch other owners. The idea extends; this document is the extension.
- Desired outcome (the user's goal): when a runtime hits a limit, work continues on another runtime, for any run — a standalone agent, a member of a Team, a member of an Org, or a delegated copy — with the same experience: stop it, choose another agent runtime and model in its settings, send a message; the same member continues, its chat shows the earlier conversation and a marker, and the new agent is told where the earlier journals are.
- Observable success: stop a Team (or Org); in the settings of one member choose another runtime and model; save; message the member (or let a teammate message it); the member answers from the new runtime in the same chat, with the marker and the earlier conversation after a reload; the other members and their runtimes are untouched. The same for a delegated copy that was stopped.

## Relevant Current And Desired Behavior

| ID | Kind | Scenarios | Current | Desired | Preserved |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-002, SCN-004 | The stopped Team/Org settings change a member's model and settings only; the runtime is locked (`runtime-locked` on member rows; `team-run-model-config-mutator.ts`: "cannot change runtime kind") | A configured member's settings also offer another available runtime and a model of it; saving keeps the run, the member's address, run ID, workspace and history | Same-runtime model edits; the Team/Org default-propagation planner |
| BEH-002 | User | SCN-003 | A delegated copy's user choice replaces its model and settings only; started values never change (DEC-005) | The choice may include the runtime, recorded beside the started values | `effectiveCopyAgentLaunch` as the one launch rule; extra and teammate copies start on the started values |
| BEH-003 | System | SCN-001…SCN-004 | A member restores only on its own runtime's session | The member's next input makes the switch real exactly as for a standalone run: fresh session, the earlier records archived behind a marker, the hand-over note, a failed start leaves nothing | Restore on the same runtime; idle shutdown and wake |
| BEH-004 | User | SCN-001…SCN-004 | The member's chat shows its raw traces' active file | Earlier conversation, marker and new records, live and after a reload | History projection for runs that never switched |
| BEH-005 | System | SCN-005 | A member without conversation history starts on whatever its settings say | A runtime change on such a member is a plain configuration edit (no marker, no note) | |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | Switch the runtime of a configured Agent member of a stopped Team run | SCN-001, SCN-004 |
| UC-002 | The same for a direct Org Agent and an Agent of a mounted Team of a stopped Org run | SCN-002, SCN-004 |
| UC-003 | The same for a stopped delegated copy: a task Agent, and a member of a task Team | SCN-003 |
| UC-004 | Rename the Team and Org stopped-run edit chains so their names say they edit the selection | — |

### Out Of Scope

- A switch started by the Model Router or an agent, the failed-turn record, the order with the restart notice, the offline-host check: the Task's later items (FU-004, FU-001, FU-005, FU-008).
- Delegated runs on a peer node (`nodeId` copies; they run on that node), application-owned and system-owned roots (their bindings stay locked).
- Switching a running member (the Team/Org must be stopped; a copy must be stopped, as for its model choice today).
- Changing a member's topology, address, workspace or tool policy.
- A different agent runtime per message, or automatic switching.

### Non-Goals

Carrying running processes, open tool results or the old provider session (as in 316).

### Preserved Behavior Boundary

autobyteus-316's standalone switch; the Team/Org restore and idle-shutdown behavior; the delegated-copy model choice semantics; journals and memory search of runs that never switched.

### Prerequisites

None (autobyteus-316 and 343 are on `origin/personal`).

### Review Authority

Findings must cite a REQ/AC/BEH ID. New behavior is a `Requirement Gap`.

## Requirements

| ID | Requirement | Behaviors | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | The settings save of a stopped Team run offers, for a configured Agent member, the available runtimes and their models; saving validates the pair as a fresh selection of that runtime, keeps everything else of the member, drops the old session binding, and records on the member that a switch is pending (its identity and the previous binding). The same for Org members (direct Agents and Agents of mounted Teams). Selecting the previous runtime again before the member's next input is the undo, with the same rules as for a standalone run. | BEH-001 | Must | User |
| REQ-002 | A stopped delegated copy's user choice (an Agent copy, and a member of a Team copy, directly or through the Team-level choice its followers follow) may include the agent runtime. The choice is recorded beside the started launch, which never changes; the effective launch rule includes the runtime; a pending switch is recorded on every affected started copy member (the activation, not the save, decides whether the member has a conversation to switch: DEC-5). | BEH-002 | Must | User |
| REQ-003 | A member or copy with a pending switch, on its next input from anyone (the user, a teammate, a delegator), starts a fresh session on the new runtime and makes the switch real: the earlier records are archived behind the marker record, the new agent receives the hand-over note, the member's saved binding is committed together with clearing the pending switch before the new run is published, and a failed start writes no marker, archives nothing and leaves nothing behind (autobyteus-316 REQ-010, ARCH-F-007). | BEH-003 | Must | User |
| REQ-004 | The activation is one path for every member kind (the shared configured-agent activation), so the behavior of REQ-003 cannot differ between Team members, Org members and copies. | BEH-003 | Must | DESIGN rule 13 |
| REQ-005 | A member or copy that has no conversation history yet switches without a marker, an archive or a hand-over note: its pending switch is cleared by its first activation, which is a plain start on the chosen runtime. | BEH-005 | Must | Design |
| REQ-006 | The chat of a switched member shows the earlier conversation, the marker and the new agent's records, live and after a reload; its journal files are each read with the runtime that wrote them, including the open file while a switch is pending (one function over the member's effective launch and pending switch, for Team, Org, task Agent and task-Team members); memory search and the memory page follow. The web shows every member's and copy's effective runtime, live and when loaded, which needs the stream contracts to carry a copy's chosen runtime. | BEH-004 | Must | 316 REQ-011/012/014 |
| REQ-007 | The server rejects a switch for a member whose root is application-owned, archived, unadmitted or managed (running), and for a copy that is not stopped; a Team/Org whose bindings are locked stays locked. | BEH-001, 002 | Must | Existing rules |
| REQ-008 | The Team and Org stopped-run edit chains are renamed as a clean cut so that their names say they edit the selection: GraphQL `updateStoppedTeamRunModelConfigs` → `updateStoppedTeamRunSelections` (input and result types alike), the Org patches `modelPatches` → `selectionPatches`, and the matching service, manager, mutator, web client and generated names; the new words are in `GLOSSARY.md`. | UC-004 | Must | 316 FU-007 |
| REQ-009 | A same-runtime model edit, a Team/Org default-propagation, restore without a pending switch, and every run that never switched behave and read exactly as before. | all | Must | Preserved |

## Acceptance Criteria

| ID | Req | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001, 007 | Stopped Team: save a member with another runtime and model | The member's saved record has the new binding, no session ID and a pending switch; other members, the Team default's followers by the planner, ids and addresses unchanged; a running Team, an application-bound or archived one is rejected | Test + built-server case |
| AC-002 | REQ-001 | Same for an Org (direct Agent; Agent of a mounted Team) | As AC-001 | Test + built-server case |
| AC-003 | REQ-001 | Select the previous runtime again; save twice before the first input | Undo restores the previous binding and session ID and clears the pending; a second save keeps the first previous binding and identity | Test |
| AC-004 | REQ-002, 007 | Stopped delegated Agent copy: choose another runtime; a Team copy with a Team-level choice | The choice is recorded beside the started launch; the effective launch has the new runtime; each affected started copy member has a pending switch; the started values are unchanged; a running copy is rejected | Test + built-server case |
| AC-005 | REQ-003, 004 | The next input to a switched Team member, Org member and copy (each runtime pair tried: external↔external, external↔native) | One new session; the earlier records are archived as one segment; the marker is the first record of the active file followed by the new agent's own first records; the pending is cleared in the same durable write as the binding; the note arrives before the message | Built-server cases RS-style, live Claude → Codex for a Team member on isolated data |
| AC-006 | REQ-003 | A start that fails after the new agent wrote its own record; then a retry; then an abandoned attempt | Nothing is left in the previous era's file; the retry succeeds with one marker; an abandoned attempt leaves nothing (autobyteus-316 ARCH-F-007 for members) | Failure-injection tests |
| AC-007 | REQ-005 | A member/copy with no history gets a runtime change and its first input | No marker, no archive, no note; the pending is cleared and the member runs on the new runtime | Test |
| AC-008 | REQ-006 | Reload the chat of a switched member; open its journal and memory search while pending and after | Earlier conversation + marker + new records; each journal file read with its own runtime; the open file uses the previous runtime while pending | Built-server case + browser probe |
| AC-009 | REQ-008 | Source check and clients | No `updateStoppedTeamRunModelConfigs`/`modelPatches` remains outside the migrations and released shapes; the web uses the new names; generated types regenerated | Source check + `codegen:check` |
| AC-010 | REQ-009 | Existing suites; same-runtime edit; restore | Unchanged | Existing suites |

## Relevant Scenarios And Journeys

| ID | Kind | Trigger | Outcome | Validity | Evidence |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | User | A Team member's runtime hits its limit; the user stops the Team, switches that member, messages it | The member continues on the new runtime | Supported Normal Scenario | User request; 316 |
| SCN-002 | User | The same in an Org | Same | Supported Normal Scenario | User request |
| SCN-003 | User | A delegated copy hits a limit; the user stops that copy, switches it | The copy continues | Supported Normal Scenario | User request; model-choice precedent |
| SCN-004 | User | Several members change runtime in one save (default propagation) | Each switches at its own next input | Supported Explicit Edge Scenario | Planner precedent |
| SCN-005 | User | A runtime change on a member that never started | Plain edit | Supported Explicit Edge Scenario | Design |
| SCN-006 | Agent/Router | A router or agent starts a switch | — | Not supported yet (the Task's later item FU-004) | Task |

## Decisions

| ID | Decision | Owner | Reasoning |
| --- | --- | --- | --- |
| DEC-1 | One activation path: the shared `ConfiguredAgentExecutionHandle` activation, not one per root. | Solution Designer | Team, Org and delegated-copy members all use it (investigation F-02); REQ-004. |
| DEC-2 | The pending switch lives on the record that holds the member's binding (member node; copy record), exactly as `pendingRuntimeSwitch` lives in a standalone run's metadata; the member's own launch fields hold the NEW selection (desired state), `from` the previous (last applied). | Solution Designer | Same pattern as 316 (the user: the data model must be clean). |
| DEC-3 | A copy's runtime joins its user choice (`UserLaunchSelection.runtimeKind`); started values never change. | Solution Designer | Keeps DEC-005/AR-005. |
| DEC-4 | The Team stays stopped during a member edit (existing rule); a copy must be stopped (existing rule). | Solution Designer | No new product behavior. |
| DEC-5 | The activation decides marker or no marker from the member's conversation history, not the save. | Solution Designer | One owner of the fact; the save stays a quick edit. |
| DEC-6 | Delivery order inside this ticket: shared core and configured members first, then copies, then the web; all delivered together. | Solution Designer | The user asked for all three; the order limits risk. |

## Assumptions / Unknowns

U-1: how a copy's own file and its coordinating tree record are kept in step for `userLaunchSelection` (14 code sites): settled in the design by extending each. U-2: the web's delegated rows and Team/Org member rows need the runtime control: settled in the design.

## Readiness Check

Requirements are stable, linked and testable. The Task's later items are not in this baseline.
