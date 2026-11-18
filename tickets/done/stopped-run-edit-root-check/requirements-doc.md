# Requirements Document — stopped-run-edit-root-check

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `stopped-run-edit-root-check`
- Request / ticket: Project Task `autobyteus-348` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), item FU-008 of autobyteus-316 (the Task's own scope; the project task manager accepted the split on 2026-11-06). FU-005 is recorded here, not built. FU-004/FU-001 are Task autobyteus-396 (not touched).
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-11-06
- Approved by and reference: Solution Designer within the direction (Task text and the 2026-11-06 plan "go on with FU-008 as the small direct-route round"); the user is informed in the Solution Designer's conversation.
- Exact approved baseline: this document at `SR-001`. Supplements: none.

## Problem And Desired Outcome

- Problem: a stopped standalone Agent run whose root is still registered (the host went down by itself, F-02) can be edited in Settings (F-05). The edit is saved and the host uses it when it resumes (F-04), but the root keeps the launch it captured when it was loaded (F-03). Delegated copies started from that root afterwards inherit the old model, settings or runtime, not what the user saved.
- Desired outcome: a saved selection of such a run is what delegated copies started afterwards inherit, with no extra step for the user.
- Observable success: edit the model of a run whose host is down and whose root lingers, then start a catalog copy from it: the copy's launch equals the saved selection.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | Copies delegated from a lingering root after a stopped-run edit inherit the launch captured at root load | They inherit the saved selection (runtime, model, model settings; and the other launch fields as saved) | The host uses the saved selection at resume (unchanged); a model-only edit writes no marker; a switch is still pending until the host's next input | F-03, F-04 |
| BEH-002 | User | SCN-001 | The edit is allowed while the root lingers and the host is offline | Unchanged: still allowed; still refused while the host is live | The messages of the existing outcomes | F-01, F-05 |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases
| ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | Saving a stopped standalone run's selection keeps the registered root's inherited launch current | SCN-001 |

### Out Of Scope
Team and Org runs (their roots hold the launch in their own tree, edited through it); delegated copies' own edits; the stored-tree edit (`updateStoredTree`); the host-offline detection; FU-004, FU-001 (Task autobyteus-396); FU-005 (covered, F-08); making Stop available for an offline run.

### Non-Goals
Refusing the edit while a root lingers (rejected, DEC-1); ending the root on edit (rejected, DEC-1).

### Preserved Behavior Boundary
BEH-002; the existing result outcomes of the updater; the 348/316 switch semantics (pending switch, marker, hand-over).

### Prerequisites
None.

### Review Authority
As the template; blocking findings cite REQ/AC/BEH IDs.

## Requirements

| ID | Requirement | Behavior | Priority | Rationale | Feasibility | Source |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | After a stopped standalone run's selection edit is saved (UPDATED), a registered root of that run inherits the saved launch for delegated copies started afterwards, whether the root is idle, loading or has an offline host. | BEH-001 | Medium | F-03, F-04 | Reading shows a single captured object; the owner can swap it | FU-008 |
| REQ-002 | The edit stays allowed when a root is registered and the host is offline; it is still refused when the host is live. | BEH-002 | Medium | Not regressing a working edit | N/A | DEC-1 |

## Acceptance Criteria

| AC | Req | Scenario | Trigger | Expected | Alternate / failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | Root registered, host crashed; edit the model; delegate a catalog agent | The copy's launch carries the saved model and settings | A model-only edit or an undo gives the same result | Unit/integration test with the root fixture (host crash) |
| AC-002 | REQ-001 | SCN-001 | The same with a runtime change (pending switch) | The copy inherits the new runtime; the host's marker is still written only at its next input | | Unit/integration test |
| AC-003 | REQ-001 | SCN-001 | Edit while the root is still loading (`pending`) | The root, once loaded, carries the saved launch | | Unit test |
| AC-004 | REQ-002 | SCN-001 | Edit with an offline host and a registered root; and with a live host | Allowed (UPDATED); refused with RUN_ACTIVE | | Unit test |
| AC-005 | REQ-001 | SCN-001 | No root registered | Edit unchanged; a later root loads the saved launch | | Existing tests stay green |

## Relevant Scenarios And Journeys

| ID | Kind | Initiator | Goal | Trigger | Start | Steps | Outcome | Validity / evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Change the model/runtime of a stopped run that works with delegated copies | Settings save of the stopped run | Host down by itself, root and copies alive (or idle) | Save; later a copy is started | Copy inherits the saved launch | Supported Explicit Edge Scenario: the crash-with-live-root state is documented and tested (F-02); the edit is offered (F-05). Reproduction is the first implementation test (U-1). |

## UI, Interaction, And Experience Requirements
N/A — not applicable.

## Quality And Non-Functional Requirements
None beyond the requirements.

## Data Continuity And Acceptable Loss
Persisted data affected: `No` (the root's launch is in memory; the saved metadata is already correct).

## External Contracts And Dependencies
None.

## Supplemental Artifacts
None.

## Assumptions
| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | A copy started while the host is offline is rare, so the staleness is mild | Delegation is mostly by the running host | Not needed for the fix | Noted |

## Decisions
| ID | Question | Options / evidence | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-1 | How should the stale inherited launch be removed? | (a) refuse the edit while a root is registered (as the stored-tree edit does): the edit works today and the host resumes correctly, so this would block a working feature, and Stop is not shown for an offline run; (b) end the lingering root on edit (as history delete does): stops copies that may still be working (F-02, DS-009): destructive for a settings change; (c) keep the root and refresh its inherited launch after the saved edit | (c): the smallest change that matches the guarantee (copies inherit what is saved) and keeps all working behavior (rule 4: preserve guarantees, not machinery) | Solution Designer | Decided |
| DEC-2 | FU-005? | F-08 | Covered by existing behavior; record the evidence, build nothing | Solution Designer, as the project task manager directed | Decided |

## Traceability
| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, 002, 003, 005 | SCN-001 |
| REQ-002 | UC-001 | BEH-002 | AC-004 | SCN-001 |

## Architecture Phase Input
Approved scenario SCN-001; preserve BEH-002 and the switch semantics; defer to design the owner and the port; verify U-1 by a failing test first.

## Readiness Check
Content ready: `Yes`. Approval recorded: `Yes`. Ready for design: `Yes`.
