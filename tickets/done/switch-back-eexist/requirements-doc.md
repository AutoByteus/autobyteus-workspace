# Requirements Document — switch-back-eexist

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `switch-back-eexist`
- Request / ticket: Project Task `autobyteus-440` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`): a Team member (`computer_use_operator`, Marketing Team, node 8001) switched from Antigravity (Gemini) to the native runtime and now cannot be switched back; every message fails with "EEXIST: file already exists, mkdir '…/memory/age…project'". The user (2026-11-09): "I think it needs to be fixed, otherwise I cannot switch runtime now."
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's request
- Requirements owner: Solution Designer
- Date: 2026-11-08
- Approved by and reference: Solution Designer within the direction (the Task and the user's words state the intended behavior: switching back works); the user is informed in the Solution Designer's conversation.
- Exact approved baseline: this document at `SR-001`. Supplements: none.

## Problem And Desired Outcome

- Problem: switching a run or Team/Org member to Antigravity a second time fails at its first message with `EEXIST … mkdir '<member memory folder>/agy-project'`, because the Antigravity runtime creates its project folder ("capsule") with an exclusive `mkdir` and the first Antigravity era left it there (`investigation-notes.md` F-01…F-04). The run stays on its pending switch and cannot start. The same error blocks the retry of an Antigravity start that failed after the capsule was made (F-06).
- Affected: any user who switches a standalone run, Team member, Org member or delegated copy to Antigravity after it has already run on Antigravity once.
- Desired outcome: a run can be switched to Antigravity again; a run stuck in this state continues at its next message after the node is updated, with no manual repair.
- Observable success: Antigravity → native → Antigravity (and native → Antigravity → native) completes on a standalone run and on a Team member; the stuck state of F-04 completes at the next message once the fix is in.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-002 | The second Antigravity era fails with EEXIST; the run keeps its pending switch | The second (and later) Antigravity era starts on a fresh project folder; the switch completes with one marker and one segment as any switch | The switch sequence and records of autobyteus-316/348; a first Antigravity start; Restore of an Antigravity run (same session) reads its own capsule unchanged | F-02…F-04 |
| BEH-002 | System | SCN-003 | An Antigravity start that fails after the capsule was made cannot be retried (EEXIST) | The retry starts on a fresh capsule | A failed attempt writes no marker and leaves the previous era unchanged (RS-05) | F-06 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Outcome | Constraint |
| --- | --- | --- | --- |
| The user | Continue work on another runtime when one has no limit left | Switch back and forth between any two runtimes | His stored runs and memory are not changed by hand or by a migration |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases
| ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | Switch a run to Antigravity when it already has an Antigravity project folder from an earlier era or a failed start | SCN-001…003 |

### Out Of Scope
Other runtimes' switch behavior (Claude/Codex pairs pass today; Grok passed in the sweep F-05); the error wording shown to the user; removing old eras' files from disk; router- or agent-started switches (Task autobyteus-396); a data repair tool; any change to the user's files on node 8001; the release (the user's word).

### Non-Goals
Making the Antigravity runtime restore across eras (a switch starts a fresh conversation by design).

### Preserved Behavior Boundary
BEH-001/BEH-002 preserved columns; the 316/348 acceptance behavior.

### Prerequisites
None.

### Review Authority
As the template.

## Requirements

| ID | Requirement | Behavior | Priority | Rationale | Feasibility | Source |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | Starting the Antigravity runtime for a run (a new start, including the first start of a later era) succeeds when the run's memory folder already holds an Antigravity project folder from an earlier start; it replaces it with a fresh one. | BEH-001, BEH-002 | Blocking the user | F-02…F-06 | Reproduced the failure (F-04); the fix is a bounded change to one owner | The Task; DEC-1 |
| REQ-002 | Replacing the project folder removes only that folder's own content; the skill sources it links to, the workspace and the run's other memory files are untouched. | BEH-001 | High | F-08 | Read | DEC-1 |
| REQ-003 | A run that is stuck in the F-04 state (pending switch, earlier era intact) completes its switch at its next message after the update, without repair. | BEH-001 | High | F-07 | Reproduced state | The Task |
| REQ-004 | The back-and-forth is proven on a standalone run and on a Team member, in both orders (Antigravity → native → Antigravity; native → Antigravity → native), by a regression test that fails on the base. | BEH-001 | High | The Task's done-when | N/A | The Task |

## Acceptance Criteria

| AC | Req | Scenario | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, 004 | SCN-001 | Standalone run: Antigravity → native → Antigravity (messages between) | Every message completes; the third era has one marker (`Antigravity CLI` ← `AutoByteus`), one segment per switch; no EEXIST | Built-server case; fails on the base (F-04) |
| AC-002 | REQ-001, 004 | SCN-002 | Team member: the same sequence | Same | Built-server case with a Team (member harness); first step: reproduce on the base |
| AC-003 | REQ-004 | SCN-001 | Native → Antigravity → native (and a fourth hop back to Antigravity) | Completes; the first-era behavior of RS-01 unchanged | Existing RS-01 stays green; the fourth hop is added |
| AC-004 | REQ-003 | SCN-001 | The F-04 stuck state: pending switch to Antigravity, earlier capsule present | The next message completes the switch | Covered by AC-001 (it is exactly that state before the message) and by a unit test that starts from a leftover capsule |
| AC-005 | REQ-001 | SCN-003 | An Antigravity start fails after the capsule was made, then is retried | The retry completes on a fresh capsule | Unit test of the backend factory/capsule with a failing launch; built-server case if the scripted CLI can fail once |
| AC-006 | REQ-002 | SCN-001 | A leftover capsule with a link to a skill folder | After the replacement the skill folder and its files are intact; the workspace has no change | Unit test |
| AC-007 | REQ-001 | SCN-001 | Restore of an Antigravity run in its own era | Restores from its own capsule as before | Existing capsule/restore tests green |

## Relevant Scenarios And Journeys

| ID | Kind | Initiator | Goal | Trigger | Start | Steps | Outcome | Validity / evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Continue on Antigravity after a stint on another runtime | Settings save of the stopped run, then a message | The run ran on Antigravity before | Save, message | Switch completes | Supported Normal Scenario: the product's own switch feature; reproduced (F-04) |
| SCN-002 | User | User | Same for a Team/Org member | Same | Same | Same | Same | Supported Normal Scenario: the reported case (screenshot); same code path (F-03) |
| SCN-003 | System | Platform | Retry a failed Antigravity start | Next message after a failed start | A capsule exists from the failed start | Message | Fresh start | Supported Normal Scenario (the retry is the product's behavior, RS-05); not yet reproduced (F-06) |

## UI, Interaction, And Experience Requirements
N/A — not applicable.

## Quality And Non-Functional Requirements
None beyond the requirements.

## Data Continuity And Acceptable Loss

- Persisted data affected: the Antigravity project folder `agy-project` in a run's memory folder is derived scaffolding (generated agent text, skill links, MCP config, manifest). Acceptable loss: replacing it at a new start. Must be preserved: everything else in the memory folder (raw traces, journals, metadata). No migration (DESIGN.md rule 7 / data guideline: tolerant behavior at the point of use; absence/leftover is handled where it is read).
- The user's existing run needs no repair (F-07); no stored data of his is changed by this ticket.

## External Contracts And Dependencies

| Contract | Constraint | Authority | Risk |
| --- | --- | --- | --- |
| Antigravity CLI keeps its conversation outside the capsule | A new era is a new conversation, started in the same folder path | `agy-agent-run-backend-factory.ts` (`conversationId` null on create) | Low: RB-01 after the fix shows the scripted CLI only; the real CLI is not run here |

## Supplemental Artifacts
`evidence/repro/switch-back-reproduction.e2e.test.ts` (reproduction, status: for implementation to turn into the regression test).

## Assumptions
| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The real Antigravity CLI accepts a new conversation in a project folder path it served before | Same path for a fresh conversation; the folder content is regenerated | A live check with the real CLI is not possible here (no account); delivery's release smoke covers a fresh Antigravity start, not a switch back | Open; stated as residual risk |

## Decisions
| ID | Question | Options / evidence | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-1 | How does a new Antigravity start deal with an existing project folder? | (a) replace it (remove, then create fresh); (b) reuse it through the restore path; (c) clean up at the end of an era through a hook in every backend; (d) a unique folder per era | (a): the capsule is derived and a new era is a fresh conversation with the current definition, skills and workspace (REQ-001); (b) keeps the old era's frozen agent text and needs a conversation ID the new era does not have; (c) a new interface across six backends for one runtime's file (rule 5); (d) leaves old folders behind and changes the restore lookup. Replace-and-create also fixes the failed-start retry (F-06) with the same code | Solution Designer | Decided |
| DEC-2 | Does the user's stuck run need a repair? | F-07: its state is a pending switch with the earlier era intact; the failing step writes nothing | No repair; update the node, then send the next message. A manual workaround (renaming the `agy-project` folder in that member's memory folder) would change his data: not proposed unless he asks, and only with a backup | Solution Designer | Decided |
| DEC-3 | Release? | RELEASE.md default: none unless asked; the user cannot use the feature until his node has the fix | A beta soon is reasonable | The user | Needs user (asked in the Solution Designer's conversation and to the project task manager; not part of this ticket's approval) |

## Traceability
| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, 002 | AC-001, 002, 005, 007 | SCN-001…003 |
| REQ-002 | UC-001 | BEH-001 | AC-006 | SCN-001 |
| REQ-003 | UC-001 | BEH-001 | AC-004 | SCN-001 |
| REQ-004 | UC-001 | BEH-001 | AC-001…003 | SCN-001, 002 |

## Architecture Phase Input
Preserve the 316/348 switch sequence and Restore of an era's own capsule; verify U-1 (Team member) first; the owner is the capsule creation.

## Readiness Check
Content ready: `Yes` (DEC-3 is not a requirement of this ticket). Approval recorded: `Yes`. Ready for design: `Yes`.
