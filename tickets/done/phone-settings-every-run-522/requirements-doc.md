# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `phone-settings-every-run-522`
- Request / ticket: autobyteus-522 in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), carrying the founder's report and words
- Requirements owner: Solution Designer
- Date: 2026-11-17
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: my message to the founder in this conversation, 2026-11-17 (the decisions below). The Task's comment carries the founder's own direction: Settings the same for every run; decide by what the run can do, not by its kind; a kind that truly cannot be changed says why in the phone's words instead of hiding the entry.
- Exact approved requirements baseline: this document at SR-001
- Behavior-defining supplements: the approved 458 phone design (Product's UI/UX specification of autobyteus-506/458, `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/phone-conversation-readability-506/ui-ux-spec.md`, UIS-003 Settings); unchanged except DEC-003's one sentence

## Problem And Desired Outcome

- Problem: the phone offers Settings (runtime and model, 458) only for a standalone agent, a standalone Team's member, an Org's own agent and an Org Team's member. A task agent and a member of a task team (runs brought in by delegation, such as the software engineering team the Project Task Manager delegated) have no Settings, running or stopped; a run on another node has none and no explanation. The founder sees all of them as runs and expects the same Settings.
- Affected actors: the founder on the phone (Android app or `/mobile`), his node.
- Desired outcome: every run the phone opens has the same Settings entry and screen. For a run of this node it changes the opened agent's own runtime and model (stopped), with the one-tap stop for a live run and the node's plain refusal, exactly as for 458's kinds. For a run on another node the screen says in one sentence why it cannot be changed here.
- Observable definition of success: on an isolated node the founder's case (a member of the PTM's delegated team) is changed from the phone and continues on the new model; the same holds for a task agent, a Team member's task agent and an Org's task runs; a peer's run explains itself.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario | Current (evidence) | Desired | Preserved |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-005 | Settings for a standalone agent, a standalone Team member, an Org's own agent, an Org Team member (R1) | Unchanged | 458 REQ-005…011 for these runs |
| BEH-002 | User | SCN-001, SCN-002 | No Settings on a task agent or a task team's member of a standalone agent (R1, the founder's screenshot) | Settings, as for any run (REQ-001…003) | — |
| BEH-003 | User | SCN-003 | No Settings on an Org's task agent or task team's member (code; R2) | Settings, as for any run | — |
| BEH-004 | User | SCN-006 | No Settings on a run on another node, no reason (R1) | Settings entry; the screen says the run can be changed only on its node (REQ-004) | Remote runs stay unchangeable from this node |
| BEH-005 | User | SCN-004 | A task agent that a standalone Team's member delegated, opened in the Team's tree, shows Settings under its own name, but the rows and Save are the Team member's (R1, R2) | The task agent's own settings (REQ-005) | — |
| BEH-006 | System | all | The node serves a delegated run's reads, stop and stopped-run save by its own id like any run (R1) | Unchanged; no node change | Node contracts |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| The founder | Change the model of any agent he is looking at on the phone | The same Settings everywhere | Phone design unchanged |
| His node | Change only stopped runs | `RUN_ACTIVE` refusal kept; stop first | No server change |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Change the runtime and model of a delegated run's agent (task agent, task team member) from the phone | SCN-001…004 |
| UC-002 | Stop a live delegated run from Settings, then change it | SCN-001, SCN-002 |
| UC-003 | Learn from Settings why a run on another node cannot be changed here | SCN-006 |

### Out Of Scope

- Changing a run on another node from this node (no node-to-node operation exists; a new peer contract, a separate request if wanted).
- The desktop's Settings (desktop delegated rows are 348/461's), New run, Text size, the conversation.
- The node (server) and the phone-key rule (441).
- Archived or not-found runs (not opened from the phone's list; the node's existing refusal stays).

### Non-Goals

- A per-kind explanation or design for delegated runs: delegated runs use the approved screen as it is.

### Preserved Behavior Boundary

- 458 REQ-005…REQ-011, AC-004…AC-009 for the four kinds that have Settings today; 458 DEC-001 (the phone key may stop and change), DEC-003 (one tap), DEC-004 (stop icon for any live run).
- The desktop unchanged.

### Prerequisites

None (the node already serves every delegated run, R1).

| Prerequisite ID | Finding And Evidence | Blocks | Sent To / Task Key | Status |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | Every run the phone opens has the ⋮ menu entry "Settings" in the same place (after Activity), whatever its kind: a standalone agent, a standalone Team's member, an Org's own agent or Org Team member, a task agent or a task team's member (under a standalone agent, a Team or an Org), and a run on another node. The decision does not depend on the kind of run. | BEH-001…005 | Must | The founder's direction | R1 (all kinds open; their owning run is known) | Task comment; DEC-001 |
| REQ-002 | For a run of this node, Settings shows and changes the opened agent's own runtime and model in the run that holds it: an agent run (standalone or a task agent) its own; a member of a Team run (a standalone Team or a task team, also under an Org) that member's own in that Team run; an Org's own agent or Org Team member its own in the Org run. Loading, the rows, Save (returns to the conversation), the reopened values and the node's refusal behave as 458 REQ-005…007. | BEH-002, 003, 005 | Must | Same Settings for every run | R1: reads and saves `UPDATED` on every delegated kind | DEC-001, DEC-002 |
| REQ-003 | For a live run of this node the stop icon behaves as 458 REQ-008 and stops the run that holds the agent: the task agent's own run, the task team's run, the Org run, or the standalone Team run. It never stops the run that delegated it. Then the rows open. | BEH-002, 003 | Must | The node changes only stopped runs (`RUN_ACTIVE`, R1) | R1: `terminate*` on each delegated run succeeded, then editable | DEC-002 |
| REQ-004 | For a run on another node, Settings shows the run's status dot, name and status line and, under them, one sentence naming the node: "This run is on {node}. Its runtime and model can be changed only on that node." No rows, no Save. | BEH-004 | Must | Not by hiding the entry; why, in the phone's words | Peer protocol has no such change (investigation) | DEC-003 |
| REQ-005 | A task agent opened under a standalone Team member's row shows and saves its own settings; the Team member is not changed. | BEH-005 | Must | A Save must change the agent on screen | R2 | DEC-004 |
| REQ-006 | The new text uses translation keys (`mobile.settings.*`) in the English and Chinese catalogs. | BEH-004 | Must | Localization rule (458 REQ-009) | N/A | — |

## Acceptance Criteria

| AC ID | Requirement IDs | Scenario | Trigger | Expected | Alternate / Failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001…003 | SCN-001 | Isolated node, scripted runtimes: the PTM delegates a Team; the phone opens a member of that task team, live | ⋮ shows Settings; the stop icon; one tap stops the task team's run, the PTM run stays as it was; the rows open; Runtime → Grok Build, Model → grok-4.7, Save returns to the conversation; the node holds the member's new launch, the other member unchanged; reopening shows it; a message continues the member on it | A refused Save shows the node's message; nothing changes | Phone probe; Android emulator journey of this case |
| AC-002 | REQ-001…003 | SCN-002 | The PTM's task agent, stopped then live | Stopped: Save changes that agent run only; live: the stop stops that agent run only | — | Phone probe |
| AC-003 | REQ-001, 002, 005 | SCN-004 | A standalone Team's member delegated a task agent; the phone opens it in the Team's tree, stopped | Settings shows the task agent's saved runtime and model; Save changes the task agent run; the Team member's launch unchanged | — | Phone probe (fails before the change) |
| AC-004 | REQ-001…003 | SCN-003 | An Org's agent delegated a task agent and a Team; the phone opens the task agent and a member of the task team | Settings on each; a Save changes that run (that member) only; a live one's stop stops that delegated run, not the Org | — | Phone probe (an Org's task team: investigation U-002) |
| AC-005 | REQ-002 | SCN-005 | An Org Team member (a team inside an org) and a standalone Team member, stopped | Unchanged from 458: Save changes that member in the Org or Team run | — | Phone probe (existing MSP-61, MSP-65 plus one Org Team member Save) |
| AC-006 | REQ-004, 006 | SCN-006 | A peer's task run opened from the PTM | ⋮ shows Settings; the screen shows the run's name and status line and "This run is on beta-node. Its runtime and model can be changed only on that node."; no rows, no Save; back returns to the conversation | — | Phone probe; catalog test |
| AC-007 | Preserved | — | Existing suites | 458's phone cases, the desktop Settings and the existing probes pass unchanged | — | Existing suites |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Founder | Change the model of a member of a team the PTM delegated | Phone: Runs → PTM → the task team → a member → ⋮ → Settings | The member live (Running/Idle) or stopped | Stop if live; choose runtime and model; Save | The member's own launch changed; it continues on it | Node refusal shown | Supported Normal (the founder's report) | Founder's screenshots; R1 | REQ-001…003; AC-001 |
| SCN-002 | User | Founder | Change a task agent's model | Phone: a run's row → its task agent → ⋮ → Settings | live or stopped | as SCN-001 | That agent run changed | as SCN-001 | Supported Normal | R1 | AC-002 |
| SCN-003 | User | Founder | Change an Org's task run | Phone: Org → the delegating agent → its task run | live or stopped | as SCN-001 | That run changed | as SCN-001 | Supported Normal | R1 node; R2 | AC-004 |
| SCN-004 | User | Founder | Change the task agent a Team member delegated | Phone: Team → member → its task agent | stopped | as SCN-001 | The task agent changed, not the member | — | Supported Normal | R1, R2 | AC-003 |
| SCN-005 | User | Founder | Change a member of a Team or of a Team inside an Org | Phone (458) | — | — | Unchanged | — | Supported Normal | 458 | AC-005 |
| SCN-006 | User | Founder | Look for the settings of a run another node runs | Phone: PTM → its peer task run → ⋮ → Settings | — | Open Settings | One sentence names its node | — | Supported Normal | R1 | AC-006 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX supplement: Product's approved 506/458 specification (UIS-003), unchanged for runs of this node.
- Product ticket record: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/phone-conversation-readability-506/` (externally owned)
- UI/UX user-confirmation reference: the founder's approval of 458 (2026-11-17, in 458's requirements)
- Normative details: the 458 screen; REQ-004's sentence (slate text under the name row, the screen's body type), the only addition.
- Product decisions that need the user: none (DEC-003 follows the founder's direction; he may change the wording).

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-001…005 | Security | No new node operation; the phone uses the reads, stop and stopped-run updates 458 uses (allowed to a phone, NA-7) | Design review |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (the node's existing stopped-run updates write the run's own launch, as today).

## External Contracts And Dependencies

| Contract | Constraint | Authority | Risk |
| --- | --- | --- | --- |
| Node Access Model NA-7; 458 REQ-010 | The phone key may stop and change; 441 keeps it | `node_access_model.md` | None now |
| Collaboration Model | A delegated run is a run of its own | `collaboration_model.md` | None |

## Supplemental Artifacts

| Artifact Path | Purpose | Related | Status | Approval |
| --- | --- | --- | --- | --- |
| `investigation-notes.md`, `evidence/investigation/` | Evidence and the reproduction | all | Final | N/A |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The peer protocol stays without a remote change of runtime and model | REQ-004's sentence | `peer-gateway.ts:163-174` | Holds |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | What decides whether Settings is offered and which run it changes? | The founder: not the kind | (a) add the four delegated kinds to the list; (b) decide by the run that holds the opened agent, which every opened run already names (`browse`) | (b): one rule for every kind, today's and future ones; it is what the run can do; it also fixes BEH-005, where the kind names the host Team but the opened agent is a delegated run. (a) keeps a per-kind list and keeps BEH-005 | Solution Designer | Decided |
| DEC-002 | For a task team's member: whose setting, and what does the stop stop? | A Save or stop on the wrong run | The desktop reaches each delegated run as itself (461 rule 2); 458: a member's stop stops its Team/Org | The member's own setting in its task team run; the stop stops the task team's run (or the task agent's run), never the delegator, as the desktop's delegated Stop does | Solution Designer | Decided |
| DEC-003 | A run on another node: hide, or explain? | The founder: say why, not hide | No node-to-node change exists (peer commands: message, interrupt, stop) | Show the entry; the screen shows the run line and "This run is on {node}. Its runtime and model can be changed only on that node."; no rows, no Save. Making it changeable needs a new node-to-node operation: a separate request if wanted | Solution Designer (founder may change the wording) | Decided |
| DEC-004 | BEH-005 (a Team member's task agent edits the member): this ticket? | A Save changes the wrong run | It is the Settings decision this ticket replaces | This ticket: DEC-001 fixes it | Solution Designer | Decided |

## Traceability

| Requirement ID | Use Cases | Behavior | AC | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-003 | BEH-001…005 | AC-001…006 | SCN-001…006 |
| REQ-002 | UC-001 | BEH-002, 003, 005 | AC-001…005 | SCN-001…005 |
| REQ-003 | UC-002 | BEH-002, 003 | AC-001, 002, 004 | SCN-001…003 |
| REQ-004 | UC-003 | BEH-004 | AC-006 | SCN-006 |
| REQ-005 | UC-001 | BEH-005 | AC-003 | SCN-004 |
| REQ-006 | UC-003 | BEH-004 | AC-006 | SCN-006 |

## Architecture Phase Input

- Scenarios: SCN-001…006.
- Constraints: no server change; the 458 screen and store; stop and save through the existing calls.
- Technical facts to verify: done (investigation R1, R2).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `Yes`
- Applicable UI/UX approval and final visual-reference basis are recorded: `Yes`
- Material assumptions and decisions are visible: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes` (within the direction; founder informed)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
