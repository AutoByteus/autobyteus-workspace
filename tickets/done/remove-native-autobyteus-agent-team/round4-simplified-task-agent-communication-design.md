# Round 14 Clarification Note (2026-06-08)

Round 14 supersedes the Round 13 tool-choice-policy proposal. Keep the simplified `delegate_tasks` + ordinary `send_message_to` + `accept_task` lifecycle, but do not implement runtime/provider `tool_choice` dampening in this ticket. `delegate_tasks` and `accept_task` are normal configured tools, and correctness is enforced by task-delegation invariants. See `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/round14-task-tool-configuration-boundary-design.md`.

# Round 5 Supersession Note (2026-06-08)

Round 5 supersedes the model-facing dynamic task-agent alias parts of this document. Keep the simplified lifecycle/tool decisions (`delegate_tasks`, ordinary `send_message_to` reports/feedback, parent `accept_task`, no result tools), but replace `recipient_name="worker/task_0001"` dynamic alias addressing with the general `target_agent_run_id` exact-run selector described in:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/round5-send-message-addressing-design.md`

---

# Round 4 Simplified Task-Agent Communication Design

## Status

Design-impact addendum drafted on 2026-06-08 after API/E2E Round 4 and the user-approved simplification discussion.

This document **supersedes the task-agent revision portions** of `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/round4-design-impact-rework.md` and the previous Round 4 addendum that introduced `TaskAgentRevisionCoordinator`, `mark_task_completed`, `mark_task_failed`, `awaiting_acceptance`, and `revision_requested` as required concepts.

The earlier native AutoByteus cleanup design remains valid. The earlier committed-delivery and provider same-runtime cohort design remains valid, with the task-agent branch simplified as described here.

## Decision Summary

The task-agent protocol becomes:

```text
delegate_tasks
  -> task-agent works and communicates with send_message_to
  -> delegator reviews normal Team Communication messages
  -> delegator sends feedback/revision with send_message_to when needed
  -> delegator calls accept_task when satisfied
```

Task-agent workers no longer call task-specific result tools. Progress, blocker, completion, and revision reports are ordinary `send_message_to` messages.

Target task-specific tool surface:

```text
delegate_tasks
accept_task
```

General communication remains:

```text
send_message_to
```

Removed task-agent result concepts:

```text
mark_task_completed
mark_task_failed
awaiting_acceptance
revision_requested
TaskAgentRevisionCoordinator
worker-owned failed terminal state
task_agent_id / task_agent_instance_id model-facing selector
task_agent_run_id model-facing send_message_to selector
```

## Current-State Evidence

Current task delegation still carries a result-tool/revision design:

- `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-contract.ts` includes `mark_task_completed` and `mark_task_failed` in `TASK_DELEGATION_TOOL_NAME_LIST`.
- `task-delegation-tool-manifest.ts`, `task-delegation-tool-parameter-schemas.ts`, and `task-delegation-tool-input-parsers.ts` define worker result tools and their schemas/parsers.
- `task-delegation-service.ts` has `markTaskCompleted`, `markTaskFailed`, and `reportTaskAgentResult` methods.
- `task-delegation-ledger.ts` has statuses `queued`, `awaiting_acceptance`, and `failed`; `acceptTask` currently requires `awaiting_acceptance`.
- `task-delegation-completion-notifier.ts` posts a system completion notification telling the delegator to use `send_message_to` with `task_agent_id` and `task_agent_run_id` for revisions.
- `task-delegation-work-packet-renderer.ts` tells task-agents to call `mark_task_completed` or `mark_task_failed`.
- `member-run-instruction-composer.ts` advertises result-tool and revision-field protocol lines.
- `send_message_to` schemas/parsers include `task_agent_run_id` and `task_agent_id` as model-facing fields.
- `TaskAgentInstanceIdentity` currently has both `taskAgentInstanceId = task_agent_task_0001` and `taskAgentRunId = <teamRunId>__worker__task_0001`; for this architecture the former is redundant as a routing identity.

Round 4 API/E2E evidence showed the result-tool/revision path is brittle: a revision message could be projected to a concrete task-agent receiver, but the task-agent did not produce revised completion. The simpler design removes that whole special revision state machine.

## Task Design Health Assessment

- Change posture: Refactor / cleanup / behavior simplification after failed live E2E.
- Current design issue found: Yes.
- Root cause classification: Duplicated policy or coordination; shared-structure looseness; legacy/compatibility pressure; boundary/ownership issue.
- Refactor needed now: Yes.
- Evidence: Task-agent progress/completion/failure is split between worker-owned result tools, a ledger awaiting-acceptance status, a completion notifier, special send-message task-agent fields, a recovery cache, and proposed revision coordination. This creates several owners for what is fundamentally a communication loop plus parent acceptance.
- Design response: Collapse task-agent communication onto the already required `send_message_to` team communication spine, keep `delegate_tasks` for creation and `accept_task` for parent terminal acceptance, and remove result-tool/revision states.

## Target Concepts

### Task identity

Use two meaningful identities only:

| Identity | Meaning | Visibility |
| --- | --- | --- |
| `taskId`, e.g. `task_0001` | Ledger/business task identity inside a team run | Model-visible in work packet, reports, and `accept_task` |
| `taskAgentRunId`, e.g. `<teamRunId>__worker__task_0001` | Concrete runtime run identity owned by server/AgentRunManager | Server-internal routing/status identity; may appear in debug/status payloads, not as a normal tool selector |

The previous `taskAgentInstanceId`, e.g. `task_agent_task_0001`, is not a separate business or runtime identity. Remove it from model-facing prompts, tool fields, and routing. If implementation temporarily retains it for internal event compatibility, it must be a derived alias, not an authoritative selector.

### Dynamic task-agent recipient name

A task-agent is addressable by a server-issued dynamic recipient name while active, for example:

```text
worker/task_0001
```

This is the agent-facing address for follow-up or revision messages. It keeps `send_message_to` general: callers still pass only `recipient_name`, `content`, optional `message_type`, and optional `reference_files`.

The dynamic recipient name is issued by `TaskAgentDirectory` during activation and is included in:

- the `delegate_tasks` tool result,
- `TASK_DELEGATION_ACTIVATED` event payload,
- task-agent work packet,
- task-agent-originated Team Communication sender metadata / reply hints.

### Task ledger lifecycle

Target ledger states:

```text
not_started -> active -> accepted
```

- `not_started`: record created but no task-agent has accepted the work packet yet.
- `active`: task-agent run accepted start; all progress/completion/blocker/revision messages are ordinary communication while the task remains active.
- `accepted`: original delegator accepted/closed the task; settlement begins.

No worker-owned `completed`, `failed`, `awaiting_acceptance`, or `revision_requested` ledger states.

If a task-agent reports that it is blocked or unable to continue, that is a `send_message_to` message to the delegator. The delegator can send feedback, delegate new work, or accept/close the task. A future parent-side cancel/fail-close tool could be added later only if the product needs it; it is intentionally out of scope for this cleanup.

## In-Scope Use Cases And Data-Flow Spine Inventory

| Use Case ID | Use Case | Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- | --- |
| UC-TASK-001 | Delegator starts a task-agent | TA-DS-001 | Primary End-to-End | Delegator calls `delegate_tasks` | Concrete task-agent AgentRun accepts work packet and task is active | `TaskDelegationService` + `TaskAgentDirectory` | Creates the active worker without result-tool assumptions. |
| UC-TASK-002 | Task-agent reports progress/completion/blocker | TA-DS-002 | Primary End-to-End | Task-agent calls `send_message_to` to delegator | Delegator AgentRun receives committed Team Communication input | `TeamMemberDeliveryCoordinator` | Uses one communication spine for all task updates. |
| UC-TASK-003 | Delegator sends feedback/revision to active task-agent | TA-DS-003 | Primary End-to-End | Delegator calls `send_message_to(recipient_name="worker/task_0001")` | Same concrete task-agent AgentRun receives feedback | `TeamMemberDeliveryCoordinator` + `TaskAgentDirectory` | Removes special revision state/tool fields while preserving targeted follow-up. |
| UC-TASK-004 | Delegator accepts/closes task | TA-DS-004 | Primary End-to-End | Original delegator calls `accept_task(task_id)` | Task ledger accepted and task-agent settlement requested | `TaskDelegationService` + `TaskDelegationSettlementCoordinator` | Parent acceptance is the only task-specific terminal transition. |
| UC-TASK-005 | Task-agent delegates nested child task | TA-DS-005 | Primary End-to-End | Active task-agent calls `delegate_tasks` | Child task-agent communicates back to parent task-agent and parent task-agent accepts child | `TaskDelegationService` + `TaskAgentDirectory` | Preserves nested decomposition without native agent-team ownership or result tools. |
| UC-TASK-006 | Invalid or settled task-agent recipient | TA-DS-006 | Primary End-to-End | Any member calls `send_message_to` with unknown/settled dynamic recipient | Tool returns rejected result and no canonical Team Communication projection | `TeamMemberDeliveryCoordinator` | Prevents false-success projections. |
| UC-TASK-007 | Team termination with active task-agents | TA-DS-007 | Primary End-to-End | Team termination starts | Active task-agent runs terminate and directory clears | `MixedTeamManager` + `TaskAgentDirectory` | Prevents dangling task-agent handles/runs. |
| UC-TASK-008 | Task communication projection and UI/history | TA-DS-008 | Return/Event | Accepted send_message delivery receipt | Team Communication / websocket / history shows message with task metadata | `MixedTeamManager` + team communication projection services | Keeps user-visible communication coherent. |
| UC-TASK-009 | Task-agent activation failure | TA-DS-009 | Primary End-to-End | `startTaskAgentInstance` rejects | `delegate_tasks` returns activation failure and record is not active | `TaskDelegationActivationCoordinator` | Avoids active records with no concrete run. |

## Primary Spines

### TA-DS-001 — Delegate and activate task-agent

```text
User / parent agent instruction
  -> delegator AgentRun tool call `delegate_tasks`
  -> runtime task-delegation adapter
  -> TaskDelegationService.delegateTasks
  -> TaskDelegationLedger.createRecord(status=not_started, taskId)
  -> TaskAgentDirectory.registerStartingTask(build taskAgentRunId + taskAgentRecipientName)
  -> TaskDelegationActivationCoordinator.buildWorkPacket
  -> TeamRun.startTaskAgentInstance
  -> MixedTeamManager.startTaskAgentInstance
  -> MixedTeamMemberRegistry.startTaskAgentInstance
  -> AgentRunManager.createAgentRun(runtimeKind of logical worker)
  -> task-agent AgentRun.postUserMessage(work packet)
  -> TaskDelegationLedger.markActive(taskId)
  -> TaskAgentDirectory.markActive(taskAgentRunId)
  -> TASK_DELEGATION_ACTIVATED event + delegate_tasks result
```

Key invariants:

- A task is not `active` until the concrete task-agent run accepts the initial work packet.
- The work packet contains the task id, delegator reply recipient, task-agent's own dynamic recipient name, task description, references, and lifecycle instructions based on `send_message_to` + `accept_task`.
- `delegate_tasks` result/event exposes the dynamic recipient name. Raw `task_agent_run_id` may remain event/debug metadata but is not the model-facing follow-up selector.

### TA-DS-002 — Task-agent reports progress/completion/blocker with send_message_to

```text
task-agent AgentRun
  -> send_message_to(recipient_name=<delegator reply recipient>, content=<progress/completion/blocker report>)
  -> runtime send-message adapter
  -> shared send_message_to parser/validator
  -> delivery intent/request builder
  -> TeamRun.deliverInterAgentMessage
  -> MixedTeamManager
  -> TeamMemberDeliveryCoordinator.resolveRecipient(static roster or dynamic task-agent alias)
  -> target delegator member/task-agent handle accepts input
  -> committed COMMUNICATION + MEMBER_INPUT events
  -> sender tool result: Delivered message
```

Key invariants:

- Completion is a report, not a ledger terminal transition.
- Blocker/failure is a report, not a worker-owned failed terminal transition.
- The report content should include `Task ID: task_0001` and reference files when useful.
- If recipient delivery fails, no successful Team Communication projection is inserted.

### TA-DS-003 — Delegator sends feedback/revision to active task-agent

```text
delegator AgentRun
  -> send_message_to(recipient_name="worker/task_0001", content=<feedback>)
  -> runtime send-message adapter
  -> shared parser/validator
  -> TeamRun.deliverInterAgentMessage
  -> TeamMemberDeliveryCoordinator
  -> TaskAgentDirectory.resolveRecipientName("worker/task_0001")
  -> MixedTeamMemberRegistry.postMessageToTaskAgent(taskAgentRunId)
  -> same concrete task-agent AgentRun.postUserMessage(feedback)
  -> committed COMMUNICATION + MEMBER_INPUT events
```

Key invariants:

- Feedback uses the same `send_message_to` tool as every other team message.
- The target is the active dynamic recipient alias, not `recipient_name="worker"` plus raw task-agent fields.
- No `TaskAgentRevisionCoordinator` is needed; the directory only resolves active task-agent recipients and rejects inactive/settled ones.

### TA-DS-004 — Delegator accepts/closes task

```text
delegator AgentRun
  -> accept_task(task_id="task_0001")
  -> runtime task-delegation adapter
  -> TaskDelegationService.acceptTask
  -> TaskDelegationLedger.assertOriginalDelegator
  -> TaskDelegationLedger.acceptActiveTask(status active -> accepted)
  -> TaskDelegationEventPublisher.publishStatusUpdated(status=accepted)
  -> TaskDelegationSettlementCoordinator.requestSettlement(taskAgentRunId)
  -> wait for task-agent idle/offline gate
  -> MixedTeamManager.settleTaskAgentInstance
  -> MixedTeamMemberRegistry.terminate/remove task-agent handle
  -> TaskAgentDirectory.markSettled/remove dynamic recipient
```

Key invariants:

- `accept_task` can accept an `active` task; it no longer requires `awaiting_acceptance`.
- Only the original delegator for that task may accept. If the original delegator is itself a task-agent, its task-agent run identity must match.
- After settlement, `worker/task_0001` is invalid and `send_message_to` to that alias is rejected with no successful projection.

### TA-DS-005 — Nested task-agent delegation

```text
parent task-agent AgentRun (for task_0001)
  -> delegate_tasks(child task to reviewer)
  -> TaskDelegationService records parent delegator as dynamic task-agent identity
  -> TaskAgentDirectory starts child dynamic recipient reviewer/task_0002
  -> child task-agent sends send_message_to(recipient_name=<parent task-agent alias>)
  -> TeamMemberDeliveryCoordinator resolves parent alias through TaskAgentDirectory
  -> parent task-agent receives child report
  -> parent task-agent calls accept_task(task_id="task_0002") for child task
  -> child task-agent settles
  -> parent task-agent continues original task and reports to its own delegator with send_message_to
```

Key invariants:

- A task-agent may be an original delegator for child tasks.
- The child work packet must include the parent task-agent's reply recipient alias, not only the logical member name.
- Dynamic recipient resolution handles both static-member delegators and task-agent delegators.

### TA-DS-006 — Invalid or settled task-agent recipient rejection

```text
member AgentRun
  -> send_message_to(recipient_name="worker/task_0001")
  -> TeamMemberDeliveryCoordinator
  -> TaskAgentDirectory.resolveRecipientName returns missing/settled
  -> rejected AgentOperationResult
  -> tool error result
  -> no canonical COMMUNICATION projection
  -> optional diagnostic runtime/team event if needed
```

Key invariant: Team Communication projection represents committed delivery, not attempted delivery.

### TA-DS-007 — Team termination cleanup

```text
GraphQL / service termination request
  -> AgentTeamRunManager / TeamRun.terminate
  -> MixedTeamManager.terminate
  -> TaskAgentDirectory.listActiveTaskAgentRuns
  -> MixedTeamMemberRegistry.terminateTaskAgentInstances
  -> AgentRunManager terminates active task-agent runs
  -> TaskAgentDirectory.clearTeam
  -> normal member handle termination
```

Key invariant: dynamic task-agent aliases and recovery entries are removed when the team terminates.

### TA-DS-008 — Return/event spine for task communication projection

```text
recipient input accepted
  -> TeamMemberDeliveryCoordinator creates delivery receipt
  -> MixedTeamManager publishes TeamRunEventSourceType.COMMUNICATION
  -> MixedTeamManager publishes TeamRunEventSourceType.MEMBER_INPUT
  -> websocket mapper / run-history projection
  -> UI Team Communication message with sender, receiver, task metadata, reference files
```

Key invariant: task-agent-originated messages should carry task metadata (`taskId`, dynamic sender recipient name, logical member route) for display/search, but this metadata is descriptive; routing remains through `recipient_name` and the server directory.

### TA-DS-009 — Activation failure

```text
delegate_tasks
  -> TaskDelegationLedger.createRecord(not_started)
  -> TaskAgentDirectory.registerStartingTask
  -> TeamRun.startTaskAgentInstance rejects
  -> TaskAgentDirectory.unregisterStartingTask
  -> TaskDelegationLedger.markNotStarted or remove activation attempt
  -> delegate_tasks activationResults include rejected result
  -> no dynamic recipient remains addressable
```

Key invariant: there is no active task without a concrete accepted task-agent run.

## Overall Team Communication Spines After Simplification

| Case | Data-flow spine |
| --- | --- |
| AutoByteus member -> logical teammate | `AutoByteus tool call -> server-owned AutoByteus send_message_to BaseTool -> shared parser -> TeamRun.deliverInterAgentMessage -> TeamMemberDeliveryCoordinator -> logical member handle -> AgentRun.postUserMessage -> committed projection` |
| Codex member -> logical teammate | `Codex dynamic tool call -> shared parser -> TeamRun.deliverInterAgentMessage -> TeamMemberDeliveryCoordinator -> logical member handle -> AgentRun.postUserMessage -> committed projection` |
| Claude member -> logical teammate | `Claude MCP/tool call handler -> shared parser -> TeamRun.deliverInterAgentMessage -> TeamMemberDeliveryCoordinator -> logical member handle -> AgentRun.postUserMessage -> committed projection` |
| Member -> active task-agent | `send_message_to(recipient_name="member/task_000N") -> TeamMemberDeliveryCoordinator -> TaskAgentDirectory -> task-agent handle -> concrete AgentRun.postUserMessage -> committed projection` |
| Task-agent -> member | `task-agent send_message_to(recipient_name="coordinator") -> TeamMemberDeliveryCoordinator -> static roster recipient -> delegator AgentRun.postUserMessage -> committed projection` |
| Task-agent -> parent task-agent | `task-agent send_message_to(recipient_name="worker/task_0001") -> TeamMemberDeliveryCoordinator -> TaskAgentDirectory -> parent task-agent AgentRun.postUserMessage -> committed projection` |
| Nested subteam boundary | `child/representative send_message_to -> TeamRun.deliverInterAgentMessage -> parent boundary delivery -> parent TeamMemberDeliveryCoordinator -> target member/subteam handle -> committed projection` |
| Same-runtime Codex team | `TeamRun member start -> Codex team-thread cohort lease -> member Codex thread/session -> provider events -> cohort router correlation -> normalized AgentRun events -> TeamRun event multiplexing` |
| Same-runtime Claude team | `TeamRun member start -> Claude team-session cohort lease -> member Claude session/active query -> provider events/cleanup -> cohort owner -> normalized AgentRun events -> TeamRun event multiplexing` |

## Ownership Map

| Owner | Owns | Must Not Own |
| --- | --- | --- |
| `TaskDelegationService` | `delegate_tasks` and `accept_task` use cases, original-delegator validation, ledger transitions | Worker progress/completion/failure content interpretation; Team Communication delivery |
| `TaskDelegationLedger` | Tight task records and lifecycle `not_started -> active -> accepted` | Runtime handle lookup, dynamic recipient resolution, revision states |
| `TaskAgentDirectory` | Team-run-scoped active task-agent identities, dynamic recipient names, active/settled lookup, task-agent run handle metadata | Task business acceptance rules; provider transport/session details |
| `TaskDelegationActivationCoordinator` | Start runnable task-agent runs and publish activation after accepted start | Completion notifications or revision routing |
| `TaskDelegationWorkPacketRenderer` | Server-authored work packet instructions for task-agent communication | Task-agent result-tool instructions |
| `TeamMemberDeliveryCoordinator` | Recipient resolution, task-agent alias lookup, recipient input acceptance, committed projection ordering | Provider-specific session/client internals; task ledger mutation |
| `MixedTeamManager` | Team-run command boundary, event publication, delegation to delivery/lifecycle sub-owners | Low-level projection-before-acceptance logic; task-agent state machine internals |
| Provider cohort coordinators | Same-runtime Codex/Claude client/session/thread/query coordination | Generic task-delegation ledger behavior |

## Target File Responsibility Mapping

### Add

| Path | Owner | Responsibility |
| --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-agent-directory.ts` | `TaskAgentDirectory` | Team-run-scoped active task-agent registry, dynamic recipient aliases, resolve/reject active task-agent recipients, clear/settle entries. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-agent-recipient-name.ts` | recipient-name utility | Build/parse dynamic task-agent recipient names such as `worker/task_0001`; ensure no conflict with static member names. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/delivery/team-member-delivery-coordinator.ts` | committed delivery owner | Resolve static/dynamic recipients, call target handle, create receipt, publish only after target acceptance. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/delivery/team-member-delivery-receipt.ts` | delivery model | Tight accepted/rejected receipt shape for communication/member-input commit ordering. |
| `autobyteus-server-ts/src/agent-execution/domain/team-runtime-cohort-identity.ts` | shared provider cohort identity | Team-run/member/workspace identity for same-runtime provider cohort leases. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-team-thread-cohort-coordinator.ts` | Codex cohort owner | Team-run-scoped Codex client/thread lease and event correlation policy. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-team-session-cohort-coordinator.ts` | Claude cohort owner | Team-run-scoped Claude session/query cleanup and bounded close policy. |

### Modify

| Path | Change |
| --- | --- |
| `task-delegation-tool-contract.ts` | Remove `MARK_TASK_COMPLETED_TOOL_NAME`, `MARK_TASK_FAILED_TOOL_NAME`, and result-tool types from the canonical task tool list. |
| `task-delegation-tool-manifest.ts` | Keep only `delegate_tasks` and `accept_task`; update descriptions to tell agents to use `send_message_to` for progress/completion/blocker reports. |
| `task-delegation-tool-parameter-schemas.ts` / `task-delegation-tool-input-parsers.ts` | Remove result-tool schemas/parsers. Update `delegate_tasks` descriptions to remove framework completion-notification language. |
| `register-task-delegation-tools.ts` | Register/unregister only `delegate_tasks` and `accept_task`. |
| `task-delegation-record.ts` | Replace statuses with `not_started`, `active`, `accepted`; remove `TaskDelegationReportedTerminalStatus`, `MarkTaskCompletedInput`, `MarkTaskFailedInput`, status result payload fields, and redundant task-agent instance id. |
| `task-delegation-ledger.ts` | Add `markActive`; update `acceptTask` to accept only active tasks by original delegator; remove `updateStatus(completed/failed)`, `awaiting_acceptance`, `failed`, and result-message fields. |
| `task-delegation-service.ts` | Remove `markTaskCompleted`, `markTaskFailed`, `reportTaskAgentResult`, and `TaskDelegationCompletionNotifier`; keep `delegateTasks` and `acceptTask`. |
| `task-delegation-activation-coordinator.ts` | Register starting/active task-agent entries with `TaskAgentDirectory`; build work packet with dynamic recipient names and send-message instructions. |
| `task-delegation-work-packet-renderer.ts` | Replace result-tool instructions with `send_message_to` reporting instructions and acceptance/settlement expectations. |
| `task-delegation-settlement-coordinator.ts` | Request settlement only after `accept_task`/team termination; remove failure-result settlement path. |
| `member-run-instruction-composer.ts` | Remove result-tool/revision-field protocol lines. Add simplified task delegation protocol: `delegate_tasks`, communicate via `send_message_to`, original delegator uses `accept_task`. |
| `send-message-to-tool-contract.ts`, `send-message-to-parameter-schema.ts`, Codex/Claude send-message schema builders | Remove task-agent raw selector fields from model-facing schemas/descriptions; dynamic recipient names are the selector. |
| `send-message-to-tool-argument-parser.ts` | Stop accepting `task_agent_run_id`, `task_agent_id`, and aliases for normal model-facing tool calls. If a temporary internal compatibility read is needed during implementation, it must be removed before handoff. |
| `inter-agent-message-delivery-request-builder.ts` / delivery request shape | Let delivery resolve dynamic task-agent recipient names through the coordinator/directory instead of requiring static roster-only recipient descriptors. |
| `mixed-team-manager.ts` | Delegate committed delivery to `TeamMemberDeliveryCoordinator`; stop publishing Team Communication before recipient input acceptance. |
| `mixed-team-member-registry.ts` | Integrate task-agent handle start/settle with `TaskAgentDirectory`; keep handle lookup internal. |
| `mixed-task-agent-handle-recovery-cache.ts` | Demote/remove as authoritative lifecycle owner; if recovery remains needed, `TaskAgentDirectory` owns the active/settled state and the cache is only a recovery implementation detail. |
| `mixed-task-delegation.e2e.test.ts` and task-delegation unit/integration tests | Rewrite around task-agent `send_message_to` reports and parent `accept_task`; remove `mark_task_completed` expectations. |

### Remove

| Path / Concept | Why removed |
| --- | --- |
| `autobyteus-server-ts/src/agent-tools/task-delegation/mark-task-completed.ts` | Worker result tool is obsolete. |
| `autobyteus-server-ts/src/agent-tools/task-delegation/mark-task-failed.ts` | Worker result tool is obsolete. |
| `TaskDelegationCompletionNotifier` | Task-agent reports are direct `send_message_to` messages; no framework completion notification is needed. |
| `TaskAgentRevisionCoordinator` proposal | Revision is ordinary `send_message_to` to an active task-agent alias. |
| `task_agent_id` / `task_agent_instance_id` / `task_agent_run_id` model-facing send-message fields | Dynamic recipient name is the selector; raw runtime ids are internal/debug metadata. |

## Dependency Rules

Allowed:

- Runtime send-message adapters -> shared parser/validator -> delivery intent/request builder.
- `MixedTeamManager` -> `TeamMemberDeliveryCoordinator` -> `TaskAgentDirectory` for dynamic recipient resolution.
- `TaskDelegationService` -> `TaskAgentDirectory` for task-agent creation/settlement metadata.
- `TaskDelegationSettlementCoordinator` -> `MixedTeamManager.settleTaskAgentInstance` after original-delegator acceptance.
- Provider backends -> provider-specific team runtime cohort coordinators.

Forbidden:

- Runtime adapters directly posting to member handles or task-agent handles.
- Models selecting task-agent targets by raw `task_agent_run_id` or `task_agent_id` fields in `send_message_to`.
- Worker result tools changing task lifecycle state.
- Team Communication projection before recipient input acceptance.
- `AgentRunManager` inferring same-runtime team cohort policy.
- `MixedTaskAgentHandleRecoveryCache` acting as the authoritative task-agent lifecycle owner.

## Prompt / Work-Packet Protocol

Member run instruction composer should advertise:

```text
Task delegation protocol
- Use delegate_tasks to assign bounded work to exact logical team members.
- Use send_message_to for all progress, blocker, completion, and follow-up communication.
- Active task-agent recipient names, such as worker/task_0001, are valid send_message_to recipient_name values when issued by task delegation messages.
- Original-delegator acceptance uses accept_task with task_id.
- Do not use mark_task_completed, mark_task_failed, create_task, create_tasks, get_my_tasks, get_task_plan_status, or assign_task_to.
```

Task-agent work packet should say:

```text
You are active task-agent worker/task_0001 for task task_0001.
Delegator reply recipient: coordinator
Use send_message_to to report progress, blockers, and completion to the delegator.
If the delegator sends feedback, continue work and report again with send_message_to.
Do not call mark_task_completed or mark_task_failed; these tools are not part of this workflow.
The original delegator will call accept_task when satisfied; after acceptance the server will settle this task-agent.
```

If the delegator is itself a task-agent, `Delegator reply recipient` must be the parent task-agent dynamic alias.

## Validation Plan

1. Contract/unit tests: task delegation tool manifest/list contains only `delegate_tasks` and `accept_task`; result tool files are absent or unregistered.
2. Prompt tests: `MemberRunInstructionComposer` and task work packet renderer contain `send_message_to` reporting instructions and no `mark_task_completed` / `mark_task_failed` / `awaiting_acceptance` language.
3. Ledger tests: `not_started -> active -> accepted`; `accept_task` rejects non-original delegator; no completed/failed/awaiting transitions exist.
4. Directory/resolver tests: dynamic aliases resolve only while active; unknown/settled aliases reject; no canonical Team Communication projection on rejection.
5. Delivery commit tests: static and dynamic recipients publish communication/member-input events only after target input acceptance.
6. Nested task-agent tests: child task-agent can send a report to a parent task-agent alias; parent task-agent can `accept_task` for the child task.
7. Provider cohort tests: synthetic Codex two-thread routing and Claude bounded cleanup before live runtime matrix.
8. Live E2E matrix: all-AutoByteus, all-Codex, all-Claude, mixed AutoByteus+Codex, nested AutoByteus+Codex+Claude, and mixed task-agent send-message/acceptance.

## Why This Is Cleaner

- One communication channel (`send_message_to`) handles all task-agent progress, completion, blockers, and revision feedback.
- Only the delegator decides terminal task acceptance through `accept_task`.
- Task-agent lifecycle is small and easy to draw: `not_started -> active -> accepted/settled`.
- Dynamic task-agent recipient names keep the public tool shape simple instead of adding task-specific selector fields to `send_message_to`.
- Raw runtime identity stays server-internal; model-facing identity is `task_id` plus recipient alias.
- The design removes entire legacy/result-tool branches instead of adding a more complex revision coordinator around them.
