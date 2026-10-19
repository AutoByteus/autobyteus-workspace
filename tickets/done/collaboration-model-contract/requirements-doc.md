# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003`
- Package identifier: `collaboration-model-contract`
- Request / ticket: Project Task `project_task_259ddae7-36ec-4c26-81f4-40c08ee1b601` "Make collaboration follow one simple model (delegate outside, message inside)"
- Requested by: `/project_task_manager` (AgentRun `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's direction of 2026-10-15
- Requirements owner: `/software_engineering_team/solution_designer`
- Date: 2026-10-15
- Approved by and reference: `User`; reference: the user's answer in the Solution Designer conversation on 2026-10-15: "I completely agree. Turn each one into a normal dedicated copy … Your recommendation is good." (accepting the recommendations for DEC-005 and DEC-006 and the presented requirements)
- Exact approved requirements baseline / solution revision: this document at `SR-003` (SR-001 approved by the user; SR-003 corrections — inventory evidence, DEC-008 own-Team depth, AC-007 extension, AC-011 — approved by the Solution Designer within the direction, user informed)
- Behavior-defining supplements and their approved versions: `collaboration_model.draft.md` (to be revised into the published document; approval applies to the rules stated in this requirements doc, not to the draft's wording)

## Problem And Desired Outcome

- Problem: There is no single written collaboration contract, and the runtime allows more ways to involve agents than the user's model: a member can delegate to its own teammate (an extra "teammate copy"), and `send_message_to` to an address not in the run creates a run (a collaborator, or a Task helper copy). The model is spread over five module docs, one of which documents teammate copies as normal.
- Affected actors or systems: the user; every collaborating agent; Team, Org and standalone Agent runs; Project Task ownership; module docs and `DESIGN.md`.
- Desired outcome: one model, written once and enforced: inside your run you message; outside your run you delegate first and then message the copy by its run ID; messaging never creates a run.
- Observable definition of success: delegating to yourself, a teammate or your own Team is refused with guidance; messaging an address not in the run is "not found — use `delegate_task`"; no collaborator or helper copy is created any more; existing runs open as decided; the model document exists and the docs point to it.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | `delegate_task` to own address refused | Unchanged, same guidance as BEH-002 | refusal code | inv. BEH-001 |
| BEH-002 | System | SCN-001 | `delegate_task` to a teammate starts a teammate copy | Refused; message says to use `send_message_to` with that address | — | inv. BEH-002 |
| BEH-003 | System | SCN-001 | `delegate_task` to your own Team instance's address starts a copy of your own Team | Refused, same guidance | — | inv. BEH-003 |
| BEH-004 | System | SCN-002 | `delegate_task` to an independent unit starts a copy | Unchanged | Org siblings, catalog units, in-run placements outside your own Team | inv. BEH-004 |
| BEH-005 | System | SCN-003 | `send_message_to(address)` reaches the standing instance | Unchanged for addresses in the run | own-instance-first resolution, no fall-through | inv. BEH-005 |
| BEH-006 | System | SCN-004 | message to a catalog address not in the run brings in a collaborator | Not found; guidance names `delegate_task`; nothing created | — | inv. BEH-006 |
| BEH-007 | System | SCN-004 | message to a catalog address from a Task-owned sender starts a helper copy | Same as BEH-006 | — | inv. BEH-007 |
| BEH-008 | System | SCN-005 | `send_message_to(run ID)` reaches existing runs | Unchanged | wake rules | docs |
| BEH-009 | User | SCN-006 | `@X` steers to `delegate_task`; note lists in-run entries incl. collaborators | Unchanged except there are no collaborator entries | note wording owner | inv. BEH-009 |
| BEH-010 | User | SCN-007 | stored runs show and restore collaborators | As decided in DEC-005 | conversations kept | inv. BEH-010 |
| BEH-011 | Agent | SCN-001..SCN-004 | prompts/tool texts allow teammate delegation and promise bring-in | Texts state the model | identical texts across runtimes | inv. BEH-011 |
| BEH-012 | Contract | SCN-008 | model spread over five docs | One canonical document; `DESIGN.md` requires it; module docs keep mechanics and link to it | — | inv. Source Log |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| User | predictable collaboration | one model, nothing created implicitly | no data loss |
| Agents | work together | clear rule and guidance on refusal | tool contracts otherwise unchanged |
| Project Task Manager | delegate Project Tasks to Org/catalog units | unchanged | — |
| Future work (memory refactor 8641c0ac, temp Task removal ee74d72b) | build on the model | contract document and fewer run kinds | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | An agent tries to delegate to itself, a teammate or its own Team and is told to message instead | SCN-001 |
| UC-002 | An agent delegates to an independent unit (unchanged) | SCN-002 |
| UC-003 | An agent messages a standing instance (unchanged) | SCN-003 |
| UC-004 | An agent messages an address not in its run and is told to delegate | SCN-004 |
| UC-005 | Stored runs with collaborators or teammate copies open as decided | SCN-007 |
| UC-006 | Designers and reviewers find the model in one document | SCN-008 |

### Out Of Scope

- Temp Tasks stay as they are (user, 2026-10-15). The task-tool split (`create_task`/`update_task`, no automatic exposure) already landed with Task `ee74d72b` (base `8878625d94`); the model document records it as holding.
- Where delegated runs and messages are stored (paused Task 8641c0ac).
- Making delegated runs independent runtimes; cross-node messaging.
- `list_available_agents` (stays, as discovery for delegation); catalog address allocation for delegation.
- Delegation from a copy to the coordinating run's own standing instances (unchanged; the standalone host stays non-delegable as today).

### Non-Goals

- Renaming code that serves catalog delegation even if it is called "collaborator" today, unless the design finds it misleading enough to fix within touched files.

### Preserved Behavior Boundary

- BEH-004, BEH-005, BEH-008, BEH-009 preserved columns.
- Saved-ID delegation, sub-work, Task DONE/reopen/reactivation, idle shutdown and wake-up, status colours, Settings (delegated launch selection), Token Meter, Task locator.
- Every conversation, memory file, message and Task record is preserved.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | `delegate_task` by address is refused when the target is the delegator itself, or lies inside the delegator's own Team: any address inside a Team instance that contains the delegator, at any depth (exactly the addresses `send_message_to` resolves within that instance), including the instance's own address; for a configured member of a Team run's root Team, any configured placement of that root Team, at any depth (DEC-008). The refusal starts nothing and tells the agent to use `send_message_to` with that address. Applies in Team, Org and standalone Agent runs and inside delegated copies. | BEH-001..BEH-003 | Must | "you already have one instance … why delegate to your teammates" | User; DEC-001, DEC-002 |
| REQ-002 | Delegation to independent units keeps working unchanged: Org siblings (direct agents, mounted Teams), catalog units, and in-run placements outside the delegator's own Team. | BEH-004 | Must | Org is a container of independent units | User; DEC-003 |
| REQ-003 | `send_message_to(recipient_address)` never creates a run. An address that is not a standing instance of the sender's run (after own-instance resolution) fails as not found with guidance to use `delegate_task` for an outside Agent or Team. No collaborator and no Task helper copy is ever created. | BEH-006, BEH-007 | Must | "messaging never creates anything" | User; DEC-001 |
| REQ-004 | Collaborators no longer exist as a runtime concept for new work: nothing adds, hosts or lists a collaborator for new runs; UI, events and APIs no longer offer collaborator-specific behaviour, except what DEC-005 keeps for stored runs. | BEH-006, BEH-010 | Must | one way to involve outside units | User |
| REQ-005 | Stored runs keep working without data loss: existing collaborators are handled per DEC-005, existing teammate copies per DEC-006, existing helper-copy Task records per DEC-007. | BEH-010 | Must | No data loss | Task constraint |
| REQ-006 | Agent-facing texts (shared prompt sections, standalone collaboration instruction, `send_message_to` and `delegate_task` tool descriptions, `@` mention note) state the model: message inside your run; delegate outside, then message by run ID; never delegate to yourself, a teammate or your own Team; messaging does not bring anyone in. Identical on every runtime. | BEH-011 | Must | agents follow their texts | User |
| REQ-007 | A canonical document `autobyteus-server-ts/docs/design/collaboration_model.md` defines the model (vocabulary, two relationships, rules with reasons, run storage shape, cross-node direction, current-versus-target status); `DESIGN.md` lists it as a required design document; module docs keep mechanics, link to it, and no longer describe teammate copies or collaborators as current behaviour after this ticket. | BEH-012 | Must | one place governs orchestration | User |

## Acceptance Criteria

| AC ID | Requirement IDs | Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | Member of a Team run delegates to a root-level teammate address | Refused with guidance to `send_message_to`; no copy, no Task link | — | integration, Team root |
| AC-002 | REQ-001 | SCN-001 | Member of a delegated Team copy delegates to a teammate address, and to the copy's own address | Both refused with guidance | — | integration, copy in Agent root |
| AC-003 | REQ-001 | SCN-001 | Member of an Org's mounted Team delegates to a teammate and to its own mounted Team | Both refused | — | integration, Org root |
| AC-004 | REQ-002 | SCN-002 | Org direct agent delegates to an Org mounted Team; Team member delegates to a catalog Team; standalone host delegates to a catalog Agent | Each starts a copy as today | — | integration regression |
| AC-005 | REQ-003, REQ-004 | SCN-004 | Unowned and Task-owned senders message a catalog address not in the run | Not found with `delegate_task` guidance; tree, Task records and UI unchanged | — | integration, all roots |
| AC-006 | REQ-003 | SCN-003 | Messages to teammates, own coordinator, Org siblings' standing instances, run IDs | Delivered as today | — | regression |
| AC-007 | REQ-005 | SCN-007 | Startup with the user's data (9 collaborators in 7 trees: 2 Team collaborators in Agent runs; 4 Agent and 3 Team collaborators at the root of 5 Team runs; 4 teammate copies; 2 helper records) | Outcome per DEC-005..DEC-007: every collaborator of both families appears as a delegated run of its run with the same memory folder; conversations open; runs reopen; messages and context files still resolve | a collaborator Team that never started (no memory folder, 1 locally) converts too; having no conversation, waking it by run ID reports `TASK_EXECUTION_CONTEXT_UNAVAILABLE` like any copy without saved conversation (nothing is lost) | migration tests per family (incl. memory-folder equality) + real-data copy |
| AC-008 | REQ-006 | SCN-001..SCN-004 | Inspect rendered prompts and tool schemas for AutoByteus, Codex, Claude | Texts state the model; no "brought in on first use" | — | unit snapshot tests |
| AC-009 | REQ-007 | SCN-008 | Read docs | Model document present and listed in `DESIGN.md`; module docs link to it; no module doc presents teammate copies or collaborators as current | — | doc review |
| AC-011 | REQ-005 | SCN-007 | A stored copy without a recorded `source` whose address is a collaborator's address (or a collaborator-Team member's address), as released versions recorded when delegating to a collaborator | after startup the copy has a `source` stamped from that collaborator's snapshot and still restores and locates; copies without `source` at configured addresses are unchanged | — | migration fixture |
| AC-010 | REQ-004 | SCN-006 | `@X` where X was previously only reachable as a collaborator | Note steers to `delegate_task`; no "already in this run" for collaborators | — | unit |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | team member agent | get a teammate to do work | `delegate_task(teammate address)` | run active | refused → agent messages teammate | teammate works in the same Team run | — | Supported Normal Scenario (agents attempt it: 4 teammate copies in data) | user; data | REQ-001; AC-001..AC-003 |
| SCN-002 | System | any agent | hand work to an independent unit | `delegate_task(address)` | — | copy started | copy works | — | Supported Normal Scenario | 75 copies | REQ-002; AC-004 |
| SCN-003 | System | any agent | talk inside the run | `send_message_to(address/run ID)` | — | delivered | — | — | Supported Normal Scenario | docs | REQ-003; AC-006 |
| SCN-004 | System | any agent | reach an outside unit | `send_message_to(catalog address)` | address not in run | not found + guidance → agent delegates | copy started by delegation | — | Supported Normal Scenario | 2 collaborators, 2 helpers in data | REQ-003, REQ-004; AC-005 |
| SCN-005 | System | delegator/copy | follow up | `send_message_to(run ID)` | copy exists | delivered/woken | — | — | Supported Normal Scenario | docs | AC-006 |
| SCN-006 | User | user | ask the focused agent to involve X | `@X` | — | note steers to `delegate_task` | copy | — | Supported Normal Scenario | docs | AC-010 |
| SCN-007 | Operational | app startup / user | open old runs | upgrade, open run | collaborators/teammate copies stored | per decisions | runs open, history kept | — | Supported Normal Scenario | data | REQ-005; AC-007 |
| SCN-008 | Contract | designers/reviewers | apply the model | read `DESIGN.md` | — | follow link | one document | — | Supported Normal Scenario | user | REQ-007; AC-009 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` new UI. Collaborator-specific UI (rows, added notifications, Settings entries for collaborators) goes away per REQ-004/DEC-005.
- Product Design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-005; AC-007 | Reliability | zero loss of conversations, memory files, messages, Task records | all stored runs | migration tests + real-data proof |
| QR-002 | REQ-006; AC-008 | Compatibility | identical agent texts on AutoByteus, Codex, Claude | — | snapshot tests |

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes` (trees with `collaborators[]`; teammate copies; Task records with `broughtIn`).
- Must be preserved: every member/copy conversation and memory file, communication messages, Task records.
- Acceptable: none lost; representation may change per DEC-005..DEC-007.
- Volume: 2 collaborators (≈3.7 MB), 4 teammate copies, 2 helper records on the user's machine.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior | Authority | Risk |
| --- | --- | --- | --- |
| `delegate_task`, `send_message_to` schemas | arguments and result shapes unchanged; new refusal/not-found messages | agent tools | agents relying on bring-in get guidance |
| Collaboration stream / GraphQL | collaborator fields/events removed (frontend updated together) | server + web | — |
| Task ee74d72b, 17bfe0fe | same files | PM | rebase order |

## Supplemental Artifacts

| Artifact Path | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- |
| `collaboration_model.draft.md` | draft of the canonical document | REQ-007 | Draft (predates REQ-003 and clarifications) | rules approved via this doc |
| `doc-consolidation.draft.patch` | draft doc pointers | REQ-007 | Draft | — |
| `new-task-proposal.md` | Task origin | all | Final | N/A |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Task ee74d72b (tool split, temp Tasks kept) landed before this ticket's implementation (`origin/personal` `8878625d94`) | the model document states it as holding | delivery receipt 2026-10-15 | Confirmed |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | The model | everything | user statements 2026-10-15 | Inside your run you message; outside you delegate first, then message by run ID; messaging never creates runs | User | Decided |
| DEC-002 | Does "own Team" include delegating to your own Team as a whole (your instance's address, or the catalog address of the Team you are in)? | REQ-001 boundary | a copy of your own Team duplicates the run you are in | Same reason as teammates: you already have that Team. Recommend refuse. (A root Team's own definition is already not offered as a delegation target today.) | Solution Designer | Decided |
| DEC-003 | Org siblings | REQ-002 | user: Org = container | Allowed | User | Decided |
| DEC-004 | Refusal and not-found wording | REQ-001, REQ-003 | — | Refusal: "`<address>` is in your own team; use send_message_to with recipient_address `<address>`." Not found: "`<address>` is not in this run. To give work to an outside Agent or Team, use delegate_task, then send_message_to its run ID." Final wording in design. | Solution Designer | Decided |
| DEC-005 | Existing collaborators (corrected SR-003: 9 on your machine in 7 trees — 2 Teams in Agent runs; 4 Agents and 3 Teams at the root of 5 Team runs; SR-001 said 2) | data; hard to undo | (a) convert each into a delegated copy of its host run (delegator = the agent that added it, started at its added time, its definition snapshot as the copy's source): stays visible under the host, conversation kept, reachable and wakeable by run ID, no longer by address; its memory already sits where a copy's memory sits today, so only the tree record changes. (b) keep as read-only history: visible but never runnable again; needs a permanent old-shape reader (against the repo's no-legacy rule). (c) drop from the run's views; files stay on disk but are invisible | Recommend (a): nothing is lost, it matches the new model exactly, and it is a small tree-only conversion. **User chose (a).** | User | Decided |
| DEC-008 | How deep does "your own Team" reach for REQ-001? (ARCH-F-003) | nested sub-team members | (a) direct members only; (b) any depth inside your own Team instance | (b): the refusal matches exactly what `send_message_to` reaches inside your own instance (any depth), so "message inside, delegate outside" has one boundary. Example: Team T with members /a and sub-team /s containing /s/x — /a delegating /s/x: refused; /s/x delegating /a: refused; in an Org, a member of /team_a delegating /team_b/n: allowed (sibling unit). | Solution Designer (user informed) | Decided (SR-003) |
| DEC-006 | Existing teammate copies (4: 2 at the root of Team runs, 2 inside mounted Teams of an archived Org run and an old test Org) | data | (a) keep them as they are: ordinary copies that still open, show and wake; only new ones are refused. (b) convert/move them | Recommend (a): they are valid copies; the 2 inside Org Teams keep their recorded place, so the code that restores a copy inside a Team instance stays for them. **User chose (a).** | User | Decided |
| DEC-007 | Existing helper-copy Task records (2, both closed) | data | keep records readable; they stay ordinary copies of their Task | No visible change (both closed); the design decides whether the stored role value is kept or normalized | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs | Supplements |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001..003 | AC-001..003 | SCN-001 | draft doc CM-1 |
| REQ-002 | UC-002 | BEH-004 | AC-004 | SCN-002 | CM-2, CM-3 |
| REQ-003 | UC-003, UC-004 | BEH-005..007 | AC-005, AC-006 | SCN-003, SCN-004 | CM-4 |
| REQ-004 | UC-004, UC-005 | BEH-006, BEH-010 | AC-005, AC-010 | SCN-004, SCN-006 | — |
| REQ-005 | UC-005 | BEH-010 | AC-007, AC-011 | SCN-007 | — |
| REQ-006 | UC-001, UC-004 | BEH-011 | AC-008 | SCN-001..004 | — |
| REQ-007 | UC-006 | BEH-012 | AC-009 | SCN-008 | draft doc |

## Architecture Phase Input

- Scenarios to map: SCN-001..SCN-008.
- Constraints: tool argument/result shapes; no data loss; no temp-Task changes; no storage-location changes.
- Deferred to design: where the refusal lives; keep/remove split of collaborator code; conversion mechanics per DEC-005; role handling per DEC-007; stream/GraphQL/web removals.
- Facts to verify: every collaborator touchpoint server and web; `@` presence logic; Settings delegated launch selection for collaborator entries.

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

- Approval recorded: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
