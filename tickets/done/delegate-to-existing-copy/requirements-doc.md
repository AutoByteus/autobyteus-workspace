# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-006` (approved REQ-003 text restored in SR-006; AC-018 verifies the A → B → A case that REQ-004 already allows; intended behavior unchanged — SR-003 approval applies)
- Package identifier: `delegate-to-existing-copy`
- Request / ticket: Delegate follow-up work to an existing copy (user, 2026-10-09, via Project Task Manager run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-10-09
- Approval state and reference: **Approved** by the user 2026-10-09 (SR-003): "Yeah, basically the naming should reflect the reality … I think it's a proof [approve] … we can even go for refactoring … Let's go." This followed the Solution Designer's recommendations for DEC-002, DEC-005, DEC-006 (separate ticket) and DEC-008 (clean break), which the user accepted. Earlier decisions (conversation 2026-10-09):
  - "the manager actually do not reopen, why reopen? … it's a different task … they proposed a new task … it makes sense they're able to send to the same team" → DEC-001.
  - "target run ID should be the team's ID … you can dedicate to a team. You can also dedicate to an individual agent" → DEC-003.
  - "target team run ID, target team coordinator agent run ID … if we do not make it clear, then the agent itself got confused semantically" → DEC-003 naming.
  - "send message to … has a basically meaning that you're sending to a specific … agent" → DEC-004 (no team run ID in `send_message_to`).
- Exact approved requirements baseline / solution revision: SR-003 (BEH-001..009, REQ-001..014, AC-001..017, SCN-001..008, DEC-001..008)
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: A follow-up Task is best done by the copy that did the earlier work: it knows the code, what it tried and why it proposed the follow-up (e.g. a code reviewer in a team proposes a cleanup ticket). Today:
  - `delegate_task` only takes `recipient_address` and always spawns a new copy.
  - A copy belongs to exactly one Task forever. The only way back to it is to reopen that *finished* Task and message the copy, which misstates the board (A looks unfinished, B is assigned to nobody, closing B stops nothing, closing A stops B's worker).
  - A Team copy's result exposes only one ID, named `target_agent_run_id`, which actually means the coordinator; the team run ID is hidden. Agents cannot tell "the team" from "its coordinator".
- Affected actors or systems: Project Task Manager and other delegating agents; delegated Agent/Team copies; the user (Projects board, run tree).
- Desired outcome: A stays DONE. The Manager creates a new Task B and delegates it to the **same** copy by that copy's own ID (team run ID for a team, agent run ID for an agent). The copy resumes with its conversation and receives B. The board shows A DONE and B assigned to that copy. Closing A (again) never stops the copy while it works on B. Every ID the tools return or accept is named for exactly what it is.
- Observable definition of success: `delegate_task(recipient_address=/team, task_id=A)` → `{target_kind: "team", target_team_run_id, target_team_coordinator_agent_run_id}` → A DONE → `delegate_task(target_team_run_id=<same>, task_id=B)` accepted → the coordinator answers B with knowledge of its earlier conversation → B's board root is that team copy → repeating DONE on A does not stop it.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | SCN-001, SCN-002 | `delegate_task` success returns `target_agent_run_id` (the coordinator for a Team), `target_kind`, `task_id?` | Agent copy: `target_kind: agent`, `target_agent_run_id`. Team copy: `target_kind: team`, `target_team_run_id`, `target_team_coordinator_agent_run_id`; no plain `target_agent_run_id` (subject to DEC-008) | `task_id` for a created Task; failure means nothing started, with a reason | root-task-dispatch.ts l.70-72 |
| BEH-002 | Contract | SCN-001, SCN-003 | Every `delegate_task` spawns a new copy from an address | `delegate_task` can instead name an existing copy by `target_team_run_id` or `target_agent_run_id`, with `task_id`; the copy is assigned that Task and woken with its conversation | Address-based delegation still spawns a new copy | task-delegation-tool-input-parsers.ts |
| BEH-003 | Contract | SCN-001, SCN-004 | A copy belongs to one Task forever; continuing requires reopening that Task | A copy has one **current** Task; once that Task is DONE/CANCELLED it can be assigned a new Task. The old Task is never reopened | Closed work stays closed; history kept; reopen + message still works for continuing the *same* Task | task-agent-resource-service.ts l.207-211; reactivate-done-task-runs |
| BEH-004 | Contract | SCN-001 | DONE/CANCELLED (also repeated) stops every closed run of the Task | DONE/CANCELLED of a Task never stops or hides a copy whose current Task is another Task | DONE still stops the Task's own current copies and their sub-work | project-task-service.ts l.303-315 |
| BEH-005 | Contract | SCN-005 | `send_message_to(target_agent_run_id)` takes agent run IDs | Unchanged: messages go to agents (for a Team, its coordinator). A team run ID is refused with a message naming the coordinator ID to use | All messaging and reactivation rules | global-agent-run-message-router.ts |
| BEH-006 | Contract | SCN-006 | `list_project_tasks` lists open assignments only, each with `targetAgentRunId` (coordinator for a Team) | Assignment IDs use the same explicit names (`agentRunId`, or `teamRunId` + `teamCoordinatorAgentRunId`); closed assignments are listed separately so the copy can be found after its Task closed | `assignments` = open assignments; `assignmentsUnavailable` | task-agent-resources.ts l.108-114 |
| BEH-007 | Contract | SCN-007 | A worker's description-only delegation is sub-work with no `task_id`; closes only with the parent Task | Per DEC-006 | Parent DONE/CANCELLED still stops all its sub-work | root-task-execution-lifecycle.ts l.119-122 |
| BEH-008 | User | SCN-001 | Board root of a Task = its latest assignment | B's root is the reused copy with its live status; A stays DONE with its root shown closed | Board shape unchanged | task-root-view-builder.ts |
| BEH-009 | Contract | SCN-008 | Descriptions say `delegate_task` "always spawns a new copy"; one ID for a team | Descriptions explain the explicit IDs, delegating to an existing copy, the one-current-Task rule, and which ID each tool takes | — | agent-team-collaboration-llm-contract.ts |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| Delegator (e.g. Project Task Manager) | Give a follow-up Task to the copy that knows the context | Accepted assignment; copy resumes with its conversation | Only the copy's most recent assigner; copy's current Task must be closed |
| Delegated copy (Agent or Team) | Continue with a new Task | Receives Task B in its existing conversation | One current Task at a time |
| User | See who works on what | A stays DONE; B shows the reused copy | No silent Task status changes |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Delegator receives explicitly named IDs for Agent and Team copies | SCN-002 |
| UC-002 | Delegator assigns a new Task to an existing copy whose current Task is closed | SCN-001, SCN-003 |
| UC-003 | Assignment to an existing copy refused with a clear reason | SCN-004 |
| UC-004 | Closing the earlier Task never stops a copy working on its new Task | SCN-001 |
| UC-005 | `send_message_to` keeps agent-only targets, with a helpful refusal for a team run ID | SCN-005 |
| UC-006 | Finding the copies a Task used, including after it closed | SCN-006 |
| UC-007 | Worker sub-work per DEC-006 | SCN-007 |
| UC-008 | Agents learn the contract from tool descriptions, prompt text and the Project Task Manager skill | SCN-008 |

### Out Of Scope

- Reopening the earlier Task as part of this flow (it stays DONE).
- Assigning from the UI (no user-facing delegation exists).
- Description-only delegation to an existing copy (existing-copy targets require `task_id`).
- Assigning to a sub-work/helper copy or a Team member.
- Cross-root assignment (the copy must be hosted by the delegator's root).
- `send_message_to` by team run ID.
- A copy with several open Tasks at once.

### Non-Goals

- No guarantee that a copy whose saved conversation is missing can be resumed; it fails clearly.
- Not a queue: a busy copy is refused, not queued.

### Preserved Behavior Boundary

- Preserved columns of BEH-001..BEH-009.
- Invariants: a run never receives input while it has no open Task entry; only explicit agent actions change Task status; nothing is deleted; existing persisted files stay readable; address-based delegation, reopen + message reactivation of the same Task, and the worker `task_id` ban (`TASK_AGENT_RESOURCE_OWNED_SENDER`) behave as today.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | A successful `delegate_task` returns, for an Agent copy, `target_kind: "agent"` and `target_agent_run_id`; for a Team copy, `target_kind: "team"`, `target_team_run_id` and `target_team_coordinator_agent_run_id`. `task_id` is unchanged. A failure starts nothing and carries a reason and no copy ID. Legacy `target_agent_run_id` on Team results per DEC-008 | BEH-001 | High | Semantic clarity | DEC-003, DEC-008 |
| REQ-002 | `delegate_task` accepts, instead of `recipient_address`, exactly one of `target_team_run_id` or `target_agent_run_id`, together with `task_id` and nothing else. The ID must be an existing copy hosted in the delegator's root: a Team copy's team run ID, or an Agent copy's agent run ID | BEH-002 | High | Request item 2 | DEC-003 |
| REQ-003 | On acceptance, Task B gets a new `assigned` entry for that copy (assigner = the delegator); the copy is woken or restored with its existing conversation (a Team: same team run and members); its ingress (the Agent, or the Team's coordinator) receives Task B's saved description and context files as a work message from the delegator. The result has the REQ-001 shape for that copy. Task A is not changed | BEH-002, BEH-003 | High | Request item 2; no reopen | DEC-001 |
| REQ-004 | Assignment to an existing copy is allowed only when the sender is the run that made the copy's most recent assignment, and the copy's current Task is DONE or CANCELLED (no open Task entry) | BEH-003 | High | Ownership | DEC-001, DEC-002 |
| REQ-005 | It is refused with a clear reason, starting nothing and changing nothing, when: the copy's current Task is still open (message names that Task and says to mark it DONE/CANCELLED first or delegate to a new copy); the sender is not the copy's most recent assigner; the ID is unknown, outside the sender's root, a sub-work/helper copy, a Team member, or a Team coordinator passed as `target_agent_run_id` (message names the `target_team_run_id` to use); the ID field does not match the copy kind; Task B is unknown, ambiguous, DONE or CANCELLED; the copy's most recent assignment is already Task B (use reopen + message); the copy never started; its saved conversation is unavailable; its Task data is unreadable | BEH-003 | High | Clear failures | — |
| REQ-006 | DONE or CANCELLED of a Task (first or repeated) closes, stops and hides only copies whose current Task it is; it never stops or hides a copy that now works on another Task | BEH-004 | High | Done-when | — |
| REQ-007 | Reopen + message reactivation applies only to the copy's most recent assignment; a message that would reopen an older Task's entry is refused with a hint naming the copy's current Task | BEH-003 | High | Consistency | — |
| REQ-008 | The board shows Task B's root as the reused copy with its live status; Task A stays DONE with that copy shown closed. A copy hidden from the run tree after A closed reappears when assigned B, live and after reload/restart, in standalone, Team and Org roots | BEH-008 | High | Done-when | — |
| REQ-009 | `send_message_to` keeps taking agent run IDs only. A team run ID is refused with a message naming that team's coordinator agent run ID | BEH-005 | Medium | Request item 4 | DEC-004 |
| REQ-010 | `list_project_tasks` assignments use explicit IDs: Agent `{kind: agent, agentRunId, …}`, Team `{kind: team, teamRunId, teamCoordinatorAgentRunId, …}` (`assignedBy`, `outcome` unchanged). Each Task also lists `closedAssignments` with the same shape. `assignments` stays the open ones | BEH-006 | Medium | Find the copy after its Task closed | DEC-005, DEC-008 |
| REQ-011 | Worker sub-work per DEC-006: the `delegate_task` description and docs state that a worker's description-only delegation is sub-work of its Task, returns no `task_id`, and closes only with that Task | BEH-007 | High | Request item 5 | DEC-006 |
| REQ-012 | Agent-facing texts — `delegate_task`, `send_message_to`, `list_project_tasks`, `create_or_update_task` descriptions, the collaboration prompt text, and the Project Task Manager skill — describe REQ-001..011 and say which ID each tool takes. "Always spawns a new copy" becomes "with an address, spawns a new copy" | BEH-009 | High | Request item 6 | — |
| REQ-013 | Existing persisted Task data stays readable and keeps its meaning without manual steps | BEH-003 | High | Data continuity | — |
| REQ-014 | Internal code names (types, fields, functions, persisted-view fields) for these identities say what they are: a Team copy's team run ID vs its coordinator agent run ID vs an Agent copy's agent run ID; misleading names in the touched delegation/assignment paths are refactored. Persisted file field names change only with an explicit data-continuity plan | BEH-001, BEH-006 | High | Naming reflects reality | DEC-009 |

## Acceptance Criteria

| AC ID | Related REQ | Related BEH / SCN | Preconditions / Trigger | Observable Expected Outcome | Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 / SCN-002 | `delegate_task` to a Team address and to an Agent address | Team: `target_kind: team`, `target_team_run_id`, `target_team_coordinator_agent_run_id`; Agent: `target_kind: agent`, `target_agent_run_id` | Failure: reason, no IDs, nothing started | API + contract |
| AC-002 | REQ-002, 003, 006, 008 | SCN-001 | PTM delegates Project Task A to a Team; sets A DONE; delegates Task B with `target_team_run_id` | Accepted; same IDs returned; coordinator answers B referencing its earlier conversation; A still DONE; B's board root is that copy with live status; copy visible in the run tree | — | API/E2E with real runtime |
| AC-003 | REQ-002 | SCN-001 | Same with an Agent copy and `target_agent_run_id` | Same outcome | — | API |
| AC-004 | REQ-006 | SCN-001 | After AC-002, PTM sets A DONE again (or CANCELLED) | Copy keeps running B; not stopped, not hidden | — | API |
| AC-005 | REQ-006 | SCN-001 | After AC-002, PTM sets B DONE | Copy stops and hides as for any DONE | — | API |
| AC-006 | REQ-004, 005 | SCN-004 | Copy's Task A still TODO/IN_PROGRESS; PTM delegates B to it | Refused; names Task A; says close it first or delegate to a new copy; nothing changes | — | API |
| AC-007 | REQ-005 | SCN-004 | Another agent (not the most recent assigner) delegates B to the copy | Refused with assigner-only guidance; nothing changes | — | API |
| AC-008 | REQ-005 | SCN-004 | Coordinator ID passed as `target_agent_run_id`; Team member; helper; unknown ID; run in another root; team run ID passed as `target_agent_run_id` | Refused with the specific reason (coordinator case names the `target_team_run_id`); nothing changes | — | API |
| AC-009 | REQ-005 | SCN-004 | Task B DONE/CANCELLED/unknown; copy whose start failed; copy with missing conversation; copy's latest assignment already B | Refused with the specific reason; nothing changes | — | API |
| AC-010 | REQ-007 | SCN-004 | After AC-002 and B DONE, PTM reopens A and messages the coordinator | Refused; hint names B as the copy's current Task | — | API |
| AC-011 | REQ-003, 008 | SCN-003 | Server restarted after A DONE; PTM delegates B to the copy; restart again | Same as AC-002; B's assignment and the copy's visibility persist | — | API/E2E with restart |
| AC-012 | REQ-009 | SCN-005 | `send_message_to(target_agent_run_id=<team run ID>)` | Refused; message names the coordinator agent run ID; coordinator ID messaging unchanged | — | API |
| AC-013 | REQ-010 | SCN-006 | `list_project_tasks` with an open Team assignment, an open Agent assignment and a DONE Task | Explicit ID names; DONE Task lists its copy under `closedAssignments`; damaged Task still `assignmentsUnavailable` | — | API |
| AC-014 | REQ-011 | SCN-007 | Tool definition (and, if DEC-006 B, worker flow) | Matches the approved DEC-006 option | — | Contract test (+ API if B) |
| AC-015 | REQ-012 | SCN-008 | Tool definitions, prompt text, PTM skill | Describe explicit IDs, existing-copy delegation, one-current-Task rule, which ID each tool takes; no "always spawns" | — | Contract test + review |
| AC-017 | REQ-014 | BEH-001, 006 | Code review of touched paths | No identifier names a coordinator as a generic "target"/"agent run" of a Team copy; names match DEC-003 vocabulary | — | Code review |
| AC-018 | REQ-003, 004, 007 | BEH-003 / SCN-001, SCN-004 | After AC-010 (B DONE, A reopened, message refused with the hint), PTM calls `delegate_task(target_team_run_id, task_id=A)` | Accepted; copy resumes with its conversation and receives Task A's work; A's board root is the copy; the copy's current Task is A; B stays DONE | — | API |
| AC-016 | REQ-013 + preserved | all | Existing data and flows: address delegation, `task_id` delegation, same-Task reactivation, worker `task_id` ban, DONE of a Task's own copies | Behave as before; existing files load unchanged | — | Existing suites + API |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Contract | Project Task Manager | Give follow-up Task B (e.g. a reviewer-proposed cleanup) to the team copy that did A | `delegate_task(target_team_run_id \| target_agent_run_id, task_id=B)` | A delegated and DONE | Delegate A → A DONE → create B → delegate B to the same copy → copy resumes → B DONE later | A stays DONE; B done by the same copy; A's closure never stops it | SCN-004 | Supported Normal Scenario | User 2026-10-09 | REQ-002..008; AC-002..005, 011 |
| SCN-002 | Contract | Delegator | Know exactly which ID is which | `delegate_task` | — | Delegate → result | Explicitly named IDs | — | Supported Normal Scenario | User 2026-10-09 (naming) | REQ-001; AC-001 |
| SCN-003 | Contract | Delegator | Resume a stopped copy for new work | As SCN-001 after idle stop or restart | Copy stopped | Assign → restore → deliver | Copy continues | Conversation missing → refused | Supported Normal Scenario | Request item 2 | REQ-003; AC-011 |
| SCN-004 | Contract | Delegator / other agent | — | Assignment that breaks a rule | — | Refused | Clear reason; nothing changes | — | Supported Explicit Edge Scenario (ownership and authorization contract) | Request item 3 | REQ-005, 007; AC-006..010 |
| SCN-005 | Contract | Any agent | Message a team copy | `send_message_to` | — | Uses coordinator ID | Delivered; team run ID refused with hint | — | Supported Normal Scenario | User 2026-10-09 | REQ-009; AC-012 |
| SCN-006 | Contract | Delegator in a new chat | Find the copy that did a closed Task | `list_project_tasks` | Task DONE | List | Copy IDs visible | — | Supported Normal Scenario | Cross-chat continuity purpose (projects.md) | REQ-010; AC-013 |
| SCN-007 | Contract | Worker | Understand / close its sub-work | Description-only `delegate_task` from Task work | Worker owns a Task | Per DEC-006 | Per DEC-006 | — | Supported Normal Scenario | User "option 2" | REQ-011; AC-014 |
| SCN-008 | Contract | Any agent | Use the tools correctly | Tool definitions | — | Read | Correct usage | — | Supported Normal Scenario | Request item 6 | REQ-012; AC-015 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` new UI. The existing board root and run tree must reflect REQ-008.
- Product design fields: N/A — not applicable.

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-004..006 | Reliability | A copy never has two open Task entries; concurrent DONE of its old Task and assignment of a new one never leave it stopped while assigned to B or open in two Tasks | Concurrent calls | Unit/integration |
| QR-002 | REQ-004 | Security | Only the copy's most recent assigner can assign it a new Task | All roots | API |
| QR-003 | REQ-001, 010, 012 | Compatibility | Renamed result fields (DEC-008) are updated in every agent-facing text and the PTM skill in the same change | Tools | Contract tests + review |

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes` — a copy may appear in several Tasks' agent run resource files (closed in older ones).
- Must preserve: all existing Task and entry data and meaning; closed work stays closed; history.
- Acceptable loss: none.
- Constraints: existing files load without a manual step.
- Unknowns for design: whether any change needs a migration (expected none).

## External Contracts And Dependencies

| Contract | Required Behavior | Evidence | Risk |
| --- | --- | --- | --- |
| Agent tool contracts | Explicit ID names; existing-copy input | Tool manifests | Agents mid-conversation that learned the old Team result shape (DEC-008) |
| Project Task Manager skill (agent repository) | Uses the new names and flow | `project-task-management` skill | Skill lives outside this repo if not vendored — design to locate |

## Supplemental Artifacts

| Artifact Path | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- |
| None | — | — | — | — |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | A copy is always hosted by its delegator's root | Lookup by ID within the root | Design verification | Open |
| ASM-002 | The copy receives Task B as a new message in its existing conversation | "resumes with its conversation" | — | Open |

## Open Decisions And Questions

| ID | Question | Options / Evidence | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Ownership rule | One current Task per copy; new Task only after the current one is DONE/CANCELLED; earlier Task is never reopened | User | **Decided** 2026-10-09 ("why reopen? … it's a different task") |
| DEC-002 | Who may assign to an existing copy | Only the run that made the copy's most recent assignment | User | **Decided** (SR-003 approval) |
| DEC-003 | IDs and naming | Delegate to a team by `target_team_run_id`, to an agent by `target_agent_run_id`; Team result `target_team_run_id` + `target_team_coordinator_agent_run_id` | User | **Decided** 2026-10-09 |
| DEC-004 | `send_message_to` with team run ID | No; messaging targets agents only | User | **Decided** 2026-10-09 |
| DEC-005 | `list_project_tasks` | Explicit ID names + `closedAssignments` | User | **Decided** (SR-003 approval) |
| DEC-006 | Worker sub-work | Description-only note here; child Tasks as a separate ticket (design keeps room for them) | User | **Decided** (SR-003 approval) |
| DEC-008 | Old `target_agent_run_id` on Team results (and `targetAgentRunId` in assignments) | Clean break, no alias; every agent-facing text, the PTM skill and any web consumer change in the same change | User | **Decided** (SR-003 approval) |
| DEC-009 | Internal naming | Code names for these IDs must reflect what they are; refactor misleading internal names in the touched paths | User | **Decided** 2026-10-09 ("we can even go for refactoring") |

(DEC-007 from SR-001 is withdrawn: it applied only to child Tasks in this ticket.)

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-002 |
| REQ-002 | UC-002 | BEH-002 | AC-002, 003 | SCN-001 |
| REQ-003 | UC-002 | BEH-002, 003 | AC-002, 011, 018 | SCN-001, 003 |
| REQ-004 | UC-002, 003 | BEH-003 | AC-006, 007 | SCN-004 |
| REQ-005 | UC-003 | BEH-003 | AC-006..009 | SCN-004 |
| REQ-006 | UC-004 | BEH-004 | AC-004, 005 | SCN-001 |
| REQ-007 | UC-003 | BEH-003 | AC-010 | SCN-004 |
| REQ-008 | UC-002 | BEH-008 | AC-002, 011 | SCN-001 |
| REQ-009 | UC-005 | BEH-005 | AC-012 | SCN-005 |
| REQ-010 | UC-006 | BEH-006 | AC-013 | SCN-006 |
| REQ-011 | UC-007 | BEH-007 | AC-014 | SCN-007 |
| REQ-012 | UC-008 | BEH-009 | AC-015 | SCN-008 |
| REQ-013 | all | BEH-003 | AC-016 | all |
| REQ-014 | UC-001, 006 | BEH-001, 006 | AC-017 | SCN-002, 006 |

## Architecture Phase Input

- Approved scenario IDs: SCN-001..008 (SR-003).
- Constraints to preserve: assigner-only reactivation; link-before-resources; DONE serialization per Task; status owned by agents; three root kinds.
- Deferred to design: derivation of a run's current Task; serialization of the new link against DONE of the old and new Task; reuse of the reactivation runtime step to wake the copy; lookup by team run ID; exact failure-result shape.
- Technical facts to verify: no migration needed; location of the PTM skill.
- Known risks: concurrency between A's DONE and B's link (QR-001).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-10-09, SR-003)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
