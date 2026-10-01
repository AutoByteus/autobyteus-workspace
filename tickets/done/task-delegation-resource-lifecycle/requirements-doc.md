# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-007`
- Package identifier: `task-delegation-resource-lifecycle`
- Request / ticket: Reduce task delegation to sub-agent spawning (`delegate_task` + `send_message_to`) with resource-managed lifecycle; delete the task lifecycle, task records and task UI
- Requirements owner: Solution Designer
- Date: 2026-09-29
- Approval state and reference: Approved.
  - SR-002: user message 2026-09-29, "I agree with your approach. Approved." (confirms DEC-001–DEC-004; DEC-004: leave old task-record files unchanged).
  - SR-007 delta (DEC-008, REQ-013 wording, REQ-014, REQ-018, AC-018, AC-020, AC-021, data continuity): user message 2026-09-29, "Cool, let's update the requirement and the design … I always think there's no need to have this migration on this schema version, the version field itself. In the future, we don't have versions as well … this rule should be applied to other places as well." This approves option A: tolerant tree reading, no migration, optional delegator, and no version field.
- Exact approved requirements baseline / solution revision: SR-007 (this document; SR-002 plus the SR-007 delta)
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: Delegation carries a task lifecycle (`active → awaiting_review → accepted`, submit/review tools, task records, task UI) that agents don't use as designed. Children report with `send_message_to`; parents rarely review. A task execution is torn down only after `accepted` or interruption, so un-reviewed children run forever, block their ancestors' teardown and keep the root reporting open work. A torn-down child can't be contacted again because run-ID messaging only reaches running agents.
- Affected actors or systems: delegating agents, spawned child agents and teams, root Agent Team and Agent Org runs, human operators, run history, AutoByteus/Codex/Claude runtimes.
- Desired outcome: `delegate_task` is a sub-agent spawn. It starts a fresh child agent or team with the given work as its first message and returns the child's run ID. All later communication uses `send_message_to` in both directions. Children are managed as **resources, not tasks**: a quiet child is shut down after a grace period, and a message to its run ID restores and wakes it with its context. The task lifecycle, task records and task UI are deleted.
- Observable definition of success: no task status, result/review tools, task records or task UI remain; quiet children shut down after the grace period; follow-up messages to shut-down children are delivered after restore; the root no longer stays open because of un-reviewed tasks; old runs still open and show their conversations.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | SCN-001, SCN-005 | `delegate_task(recipient_address, description, reference_files)` spawns a fresh child, sends a packet with delegator address + run ID, creates an `active` task, returns `task_id`, `status`, `target_agent_run_id` | Same name and inputs; spawns and delivers the packet; returns `target_agent_run_id` on success or a clear failure; no task created | Tool name and input fields; fresh instance per call; packet content incl. delegator address and run ID; failure reporting when nothing started | Source Log: engine, work packet |
| BEH-002 | Contract | SCN-001 | `submit_task_result` moves task to `awaiting_review` and notifies delegator | Deleted | — | tool manifest |
| BEH-003 | Contract | SCN-002 | `review_task_result` accepts (→ teardown) or requests revision | Deleted | — | tool manifest |
| BEH-004 | System | SCN-001, SCN-003, SCN-006 | Child torn down only after `accepted`/`interrupted`; blocked while it has open child tasks | Child shut down after being quiet for the grace period | Never interrupts running work | engine settlement |
| BEH-005 | Contract | SCN-002, SCN-004, SCN-006 | `send_message_to` with `target_agent_run_id` rejects non-running runs | A shut-down child in the sender's root is restored with its context and receives the message | Delivery to running agents and `recipient_address` delivery unchanged | router, root delivery, contract |
| BEH-006 | Operational | SCN-007 | On root reopen children are marked settled; open tasks become `interrupted`; not recoverable | Children from before the reopen are shut down and wakeable | Reopen itself unchanged | reopen repair |
| BEH-007 | Operational | SCN-008 | Root stop/terminate interrupts and tears down all children | Root stop/terminate shuts down all children | Root stop always stops everything | engine |
| BEH-008 | System | SCN-001 | Root open-work includes non-accepted tasks | Root open-work reflects running work only | Other open-work inputs unchanged | root runs |
| BEH-009 | User | SCN-009 | Collaboration panel has Messages + Delegated Tasks (status badges, assignment/submission/review/interruption timeline, task reference viewer); members tree shows children with lifecycle + execution labels | Collaboration panel shows Messages only. Members tree shows children as ordinary rows with the same status indicator as other members, plus a shut-down state. No task labels. Clicking a child opens its conversation | Members tree, focus/navigation, Messages section | web components |
| BEH-010 | Contract | SCN-009 | Task records persisted per root; exposed via GraphQL; task reference files via REST | Task record store, GraphQL task query, task reference REST route deleted | Old runs load; agent conversations (containing old task packets and notifications) remain viewable | API, stores |
| BEH-011 | Contract | SCN-001 | Agent instructions describe task lifecycle, submit/review and live-only run-ID messaging | Instructions describe: `delegate_task` starts a fresh instance with this work and returns its run ID; afterwards use only `send_message_to`; messages wake shut-down children | Other collaboration guidance | LLM contract |
| BEH-012 | Contract | SCN-001, SCN-002 | Task transitions deliver system notifications into agent conversations (packet to child, "result submitted" to parent, "revision requested" to child) | Only the delegation packet is delivered (first message to child) | Old notifications in saved conversations keep rendering | task-system-input-presentation, web handler |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Delegating agent | Get work done by a child | Spawn, receive replies, follow up anytime | One communication primitive after spawn |
| Child agent / team | Do the work, talk to its spawner | Reach spawner via `send_message_to`; keep context across shutdown | No result/review tools |
| Root Team / Org run | Host executions, manage resources | No leaked children; accurate open-work | Wake only within the root |
| Human operator | Understand what is happening | Clean view of children and their state; history intact | UI as clean as the existing product |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- UC-001: Agent delegates to a mounted Agent or AgentTeam, then communicates only via `send_message_to`.
- UC-002: Quiet children (agents or teams) are shut down after a grace period.
- UC-003: A message from inside the same root to a shut-down child's run ID restores and wakes it.
- UC-004: After root reopen, earlier children are shut down and wakeable.
- UC-005: Operators see children and their state in the members tree; Messages unchanged; old runs viewable.
- UC-006: Deletion of task lifecycle, task records, task APIs and task UI.
- UC-007: Applies to Agent Team and Agent Org roots and to AutoByteus, Codex and Claude runtimes.

### Out Of Scope

- Waking runs outside the sender's root (standalone runs, other roots).
- Notifying the parent when a child goes silent.
- Renaming `delegate_task` or changing its input fields.
- Lifecycle of configured (non-spawned) members.
- Converting old task records into messages.
- Deleting old task-record files from disk.
- Applying tolerant reading / no-version writing to persisted files other than the Team and Org execution trees (communication messages, history indexes, other stores). The user wants this practice project-wide (DEC-008). It is adopted **gradually** through the project guideline rule (convert a format's reader when that format changes). By user decision on 2026-09-29, there is no separate follow-up ticket.

### Non-Goals

- No replacement task status, result tool or reopen semantics.
- No guarantee that a child reports back (unchanged from today).
- No new UI section for children.

### Preserved Behavior Boundary

- BEH-001 preserved column; BEH-005 delivery to running agents and `recipient_address` delivery; BEH-007; BEH-009 members tree, navigation and Messages; BEH-010 old runs load; BEH-012 old notifications render.
- Invariant: a child with running work, including pending tool approval, is never shut down for being quiet.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | `delegate_task` keeps its name and inputs (`recipient_address`, `description`, `reference_files`). It starts a fresh child agent or team and delivers the description and reference files, with the delegator's address and run ID, as the child's first message. On success it returns `target_agent_run_id` (for a team, its coordinator's). If nothing started, it returns a clear failure. It returns no task ID or status. | BEH-001 | Must | Spawn-then-message; inputs mirror `send_message_to` | DEC-005 |
| REQ-002 | `submit_task_result` and `review_task_result` are deleted from every runtime and tool surface, native and MCP. | BEH-002, BEH-003 | Must | Unused lifecycle | DEC-006 |
| REQ-003 | No task status, task record or task-transition notification exists for new delegations. | BEH-004, BEH-008, BEH-012 | Must | Resource, not task, management | DEC-006 |
| REQ-004 | A child that has been quiet for the grace period is shut down. *Quiet* for an agent means not running and no pending input. For a team it means all members and nested children are quiet and no messages are in flight inside it. | BEH-004 | Must | Prevent leaked children | DEC-001 |
| REQ-005 | Any activity during the grace period cancels the shutdown, and the countdown restarts at the next quiet moment. Pending tool approval counts as running work. | BEH-004 | Must | Avoid restore churn; never kill work | DEC-001 |
| REQ-006 | `send_message_to` with `target_agent_run_id` naming a shut-down child in the sender's root restores the child with its prior conversation context and delivers the message. A message that arrives during shutdown is delivered after restore, not lost. For a team, the run ID is the coordinator's and the restored team's coordinator receives the message. | BEH-005 | Must | Follow-ups remain possible | User clarification 3 |
| REQ-007 | If a restore is impossible, the sender gets a clear, specific rejection. | BEH-005 | Must | Truthful failure | — |
| REQ-008 | Senders outside the child's root cannot wake it. | BEH-005 | Must | Security boundary | DEC-002 |
| REQ-009 | After a root Team/Org reopen, its children are shut down and wakeable under REQ-006. | BEH-006 | Must | Consistent lifecycle | User |
| REQ-010 | Root stop/terminate shuts down all children. | BEH-007 | Must | Preserve | — |
| REQ-011 | Root open-work reflects running work only. | BEH-008 | Must | Remove leak | — |
| REQ-012 | Agent instructions and tool descriptions describe the spawn-then-message model and wake-on-message, and contain no task-lifecycle, result/review or live-only wording that applies to children. | BEH-011 | Must | Correct agent behavior | — |
| REQ-013 | The collaboration panel shows only Messages; the Delegated Tasks section, task timeline, task status labels and task reference viewer are removed. The members tree shows each child as an ordinary row under the existing tree with: name, agent-or-team indication, and the same status indicator used for other members extended with a shut-down state. For every child whose saved tree entry records the agent that started it (all children started after this change), it makes clear who started the child. Old children recorded before this change show no starter in the tree; their own conversation still names the delegator (DEC-008). Selecting a child opens its conversation. The result must stay as minimal as the existing product UI and must not add a new section. | BEH-009 | Must | Clean UI consistent with the product | User 2026-09-29 |
| REQ-014 | The task record store, GraphQL task-delegation query and task reference REST route are deleted. Old runs still load **without any data migration**: their execution trees are used as they are, and their task-record files are ignored and left untouched on disk. | BEH-010 | Must | Deletion without data risk | DEC-006, DEC-004, DEC-008 |
| REQ-015 | Old saved conversations that contain task packets or task notifications still render readably. | BEH-012 | Must | History intact | DEC-004 |
| REQ-016 | The grace period defaults to 10 minutes and is adjustable as a server setting. | BEH-004 | Must | Operability | DEC-001 |
| REQ-017 | All requirements apply to Agent Team and Agent Org roots and to AutoByteus, Codex and Claude runtimes. | All | Must | Uniformity | User |
| REQ-018 | Execution-tree files (Team and Org) are **read tolerantly** and **written exactly**. Reading ignores unknown or obsolete fields (for example the old `settledAt`) and requires no schema version, while still rejecting a tree that lacks a required field or breaks an identity invariant. Writing produces the exact current shape with no schema version field and no obsolete fields. A field name is never reused with a different meaning. | BEH-010 | Must | Remove migrations for compatible format changes; user-directed practice | DEC-008 (user constraint) |

## Acceptance Criteria

| AC ID | Related REQ | Related Behavior / Scenario | Preconditions / Trigger | Observable Expected Outcome | Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 / SCN-001 | Agent calls `delegate_task` to a mounted Agent | Fresh child starts; its first message contains description, reference files, delegator address and run ID; result is `target_agent_run_id` only | Invalid recipient or startup failure → clear failure, no child left running | Integration + E2E |
| AC-002 | REQ-002 | SCN-001 | Any runtime lists tools | `submit_task_result`, `review_task_result` absent (native and MCP) | — | Unit + E2E per runtime |
| AC-003 | REQ-003 | SCN-001 | Delegate, converse, go quiet | No task record written; no task notification delivered other than the first message | — | Integration |
| AC-004 | REQ-004, REQ-016 | SCN-001 | Child replies and goes quiet | Shut down after the configured grace period (default 10 min), not before | — | Integration with controllable clock |
| AC-005 | REQ-005 | SCN-003 | Parent messages child within grace | Child handles it without restore; countdown restarts when quiet again | — | Integration |
| AC-006 | REQ-005 | SCN-010 | Child waiting for tool approval beyond grace | Not shut down | — | Integration per runtime |
| AC-007 | REQ-006 | SCN-002 | Parent messages shut-down child by run ID | Restored with prior context, receives message, can reply | Message during shutdown → delivered after restore | Integration + E2E |
| AC-008 | REQ-006 | SCN-004 | Child asks parent; parent answers after either side shut down | Answer delivered; recipient restored if shut down | — | Integration |
| AC-009 | REQ-004, REQ-006 | SCN-005 | Child team quiet for grace | Whole team shut down; message to coordinator run ID restores it; coordinator receives it | Any member active → no shutdown | Integration + E2E |
| AC-010 | REQ-004, REQ-006 | SCN-006 | Child delegated to a grandchild and is waiting | Child may shut down; grandchild's message wakes it | — | Integration |
| AC-011 | REQ-007 | SCN-002 | Saved state unavailable | Specific rejection | — | Integration |
| AC-012 | REQ-008 | SCN-011 | Sender outside the root messages a child's run ID | Rejected; child not restored | — | Integration |
| AC-013 | REQ-009 | SCN-007 | Root reopened | Messaging an earlier child restores it | Unavailable state → AC-011 | E2E |
| AC-014 | REQ-010 | SCN-008 | User stops root | All children shut down | — | Integration |
| AC-015 | REQ-011 | SCN-001 | All executions quiet or shut down | Root reports no open execution work | — | Integration |
| AC-016 | REQ-012 | SCN-001 | Inspect rendered instructions and tool descriptions | Spawn-then-message and wake described; no task-lifecycle/result/review/live-only-for-children wording | — | Unit |
| AC-017 | REQ-013 | SCN-009 | Operator opens a run with children | Collaboration panel shows Messages only; members tree shows children with name, agent/team, status incl. shut down, spawner; clicking opens the child's conversation; no task labels or new section | — | Web unit + browser screenshot review |
| AC-018 | REQ-014, REQ-015, REQ-013 | SCN-009 | Open a pre-change run with task records and old trees | The run loads with no migration and no startup rewrite; conversations render, including old task packets and notifications; old task files and trees are unchanged on disk until the app next saves that tree for another reason; old children show no starter and new children do | — | Loader tests + browser + installed-data copy |
| AC-019 | REQ-014 | — | Inspect API surface | GraphQL task query and task reference REST route absent | — | Unit |
| AC-020 | REQ-018 | SCN-009 | Load trees with an unknown extra field, with obsolete `settledAt`, with a `schemaVersion`, without a `schemaVersion`, and missing a required field | The first four load; the last is rejected (not admitted) | — | Unit + admission tests |
| AC-021 | REQ-018 | SCN-001 | Save a tree after delegation or after loading an old tree | The saved file has the exact current shape: no `schemaVersion`, no `settledAt`, `delegatorAgentRunId` on new children | — | Unit |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator | Goal / Event | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Delegating agent | Get work done by a child | `delegate_task` | Root active | Spawn → child works → child `send_message_to` parent → quiet → grace → shut down | Parent has the answer; child released | Spawn failure reported | Supported Normal | User observation; code | REQ-001–005, 011, 012; AC-001–004, 015, 016 |
| SCN-002 | System | Delegating agent | Follow up with a finished child | `send_message_to` run ID | Child shut down | Restore → deliver → work → reply → quiet → shut down | Follow-up handled with context | Restore impossible → rejection | Supported Normal | User clarification 3 | REQ-006, 007; AC-007, 011 |
| SCN-003 | System | Delegating agent | Quick back-and-forth | `send_message_to` | Child quiet within grace | Deliver directly | No restore | — | Supported Normal | User (grace rationale) | REQ-005; AC-005 |
| SCN-004 | System | Child | Ask the spawner a question | `send_message_to` spawner run ID | Spawner quiet or shut down | Spawner (if a shut-down child itself) restored → answers → child woken if shut down | Q&A across shutdowns | — | Supported Normal | Packet includes delegator run ID | REQ-006; AC-008 |
| SCN-005 | System | Delegating agent | Delegate to a team | `delegate_task` to AgentTeam | Root active | Team spawned → works → quiet → shut down → message to coordinator restores | Team handled as one resource | Active member prevents shutdown | Supported Normal | Contract | REQ-004, 006; AC-009 |
| SCN-006 | System | Child | Nested delegation | `delegate_task` from child | Child active | Child waits → shut down → grandchild replies → child restored | Nesting works | — | Supported Normal | Nested executions in tree | REQ-004, 006; AC-010 |
| SCN-007 | Operational | Operator | Resume a root run | Reopen | Root stopped | Reopen → agent messages earlier child → restore | Children usable | Missing state → rejection | Supported Normal | reopen repair | REQ-009; AC-013 |
| SCN-008 | Operational | Operator | Stop root | Stop/terminate | Root active | All executions shut down | Nothing left running | — | Supported Normal | engine | REQ-010; AC-014 |
| SCN-009 | User | Operator | Inspect children and history | Open run in workspace | New or pre-change run | View members tree, select child, read conversation; read Messages | Clean view; history intact | — | Supported Normal | web UI | REQ-013–015; AC-017–019 |
| SCN-010 | System | Child | Wait for human tool approval | Tool call needing approval | Child running | Waits past grace | Not shut down | — | Supported Normal | status projector | REQ-005; AC-006 |
| SCN-011 | Contract | Agent in another root / standalone | Message a child's run ID from outside its root | `send_message_to` run ID | Child shut down | Rejected | No cross-root wake | — | Supported Explicit Edge (security boundary) | Root boundary in router | REQ-008; AC-012 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX supplement / prototype / Product fields: N/A — not applicable (no Product Design requested)
- Direction (user, 2026-09-29): keep the UI as clean as possible and consistent with the existing product UI.
- Required outcome: see REQ-013. Remove the Delegated Tasks section and task labels; reuse the existing members tree and member status indicator; add only a shut-down state; no new section.
- Explicitly unresolved: exact wording of the shut-down state label and how the spawner is shown (nesting vs. subtle label) — design chooses the minimal option within existing conventions.

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-004, REQ-016, AC-004 | Operability | Shutdown no earlier than the grace period (default 10 min) after the child becomes quiet | All runtimes | Controllable-clock tests |
| QR-002 | REQ-006, AC-007 | Reliability | Zero message loss across shutdown/restore races | All runtimes | Race-focused integration test |
| QR-003 | REQ-008, AC-012 | Security | Wake only within the sender's root | All roots | Negative test |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes`
- Must be preserved: agent conversations (including old task packets and task notifications); inter-agent messages; execution-tree entries needed to identify, restore and display children; old runs load **without a data migration** (DEC-008).
- Acceptable loss: old task statuses and the task timeline view; accept-without-comment reviews (no content). Old task-record files are no longer read but are left untouched on disk. **Starter display for children recorded before this change**: 18 child entries on the inspected install; each child's own conversation still names its delegator (DEC-008).
- Constraints: old runs load without manual action.
- Unknowns: whether children from pre-change runs have enough saved state to restore (if not, REQ-007).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Codex / Claude via MCP tool adapter | Tool removal; session resume on restore | adapter provider; configured-member restore | UNK-001, UNK-002 |
| GraphQL / REST task-delegation API | Deleted | API types | Web is the only known consumer |
| Authored instructions mentioning `delegate_task` | Keep working (name unchanged) | ~24 repo docs; user team instructions | Docs mentioning submit/review need updating |

## Supplemental Artifacts

| Artifact Path | Purpose | Related REQ / AC | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| None | — | — | — | N/A |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Children can be restored with the mechanism used for configured members | REQ-006 | Architecture | Open |
| ASM-002 | Codex/Claude report approval-pending as non-idle, or can be made to | REQ-005 | Architecture | Open |
| ASM-003 | No consumer outside the web app uses the task GraphQL/REST API | REQ-014 | Architecture | Open |

## Open Decisions And Questions

| ID | Question | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Grace period | User: grace period, e.g. 5 or 10 min. Proposed: 10 min default, server setting | User | Approved 2026-09-29 |
| DEC-002 | Who may wake a child | Proposed: same root only | User | Approved 2026-09-29 |
| DEC-003 | Silent-child notification | Proposed: not in this change | User | Approved 2026-09-29 |
| DEC-004 | Old runs | User: task messages not needed, can be deleted. Proposed: no conversion; ignore old task files, leave on disk; conversations keep rendering | User | Approved 2026-09-29 — leave old files unchanged |
| DEC-005 | Tool naming | User argued `delegate_task`'s send-like inputs are meaningful. Keep name and inputs | User | Decided in conversation 2026-09-29 |
| DEC-006 | Delete task lifecycle, records, APIs, UI | User: "can all be deleted" | User | Decided in conversation 2026-09-29 |
| DEC-007 | UI | User: as clean as possible, consistent with product; no new section | User | Decided 2026-09-29 |
| DEC-008 | Persisted tree format change | Option A: tolerant tree reading plus exact writing; no schema version field; no data migration; `delegatorAgentRunId` optional (old children show no starter). Rejected: a migration with version bumps (SR-003 to SR-006 design). The user also wants this practice applied project-wide; other persisted files are a separate follow-up | User | Approved 2026-09-29 |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001, SCN-005 |
| REQ-002 | UC-001, UC-006, UC-007 | BEH-002, BEH-003 | AC-002 | SCN-001 |
| REQ-003 | UC-006 | BEH-004, BEH-008, BEH-012 | AC-003 | SCN-001 |
| REQ-004 | UC-002 | BEH-004 | AC-004, AC-009, AC-010 | SCN-001, SCN-005, SCN-006 |
| REQ-005 | UC-002 | BEH-004 | AC-005, AC-006 | SCN-003, SCN-010 |
| REQ-006 | UC-003 | BEH-005 | AC-007–AC-010 | SCN-002, SCN-004–SCN-006 |
| REQ-007 | UC-003 | BEH-005 | AC-011 | SCN-002, SCN-007 |
| REQ-008 | UC-003 | BEH-005 | AC-012 | SCN-011 |
| REQ-009 | UC-004 | BEH-006 | AC-013 | SCN-007 |
| REQ-010 | UC-002 | BEH-007 | AC-014 | SCN-008 |
| REQ-011 | UC-002 | BEH-008 | AC-015 | SCN-001 |
| REQ-012 | UC-001 | BEH-011 | AC-016 | SCN-001 |
| REQ-013 | UC-005 | BEH-009 | AC-017 | SCN-009 |
| REQ-014 | UC-005, UC-006 | BEH-010 | AC-018, AC-019 | SCN-009 |
| REQ-018 | UC-005 | BEH-010 | AC-020, AC-021 | SCN-001, SCN-009 |
| REQ-015 | UC-005 | BEH-012 | AC-018 | SCN-009 |
| REQ-016 | UC-002 | BEH-004 | AC-004 | SCN-001 |
| REQ-017 | UC-007 | All | AC-002, AC-006, AC-009 | All |

## Architecture Phase Input

- Scenario paths to map: SCN-001 … SCN-011.
- Constraints: root boundary for wake; never shut down running or approval-pending work; no message loss; old runs load; UI minimal.
- Deferred to design: what remains of the lifecycle engine; where grace timers live; team quiet detection; restore per runtime; reopen handling; how the members tree shows the spawner; settings plumbing; removal order.
- Technical facts to verify: UNK-001–UNK-003, ASM-003; validator tolerance when task files are ignored.
- Risks: shutdown/restore race; Codex/Claude session resume; nested team restore.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Prototype and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-09-29)
- Exact requirements and supplement approval basis recorded: `Yes` (SR-002; no supplements)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
