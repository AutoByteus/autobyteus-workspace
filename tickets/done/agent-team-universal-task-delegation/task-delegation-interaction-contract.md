# Task Delegation Interaction Contract

## Status

Refined — User-Approved Interaction Model; SR-009 Reversible Settlement Reconciled

## Purpose

Define the Agent-facing relationship between task creation, ordinary execution-to-execution communication, result submission, and review. This contract deliberately separates task lifecycle from messaging while making the two systems directly composable.

This artifact defines intended behavior. It does not assign source files or implementation sequencing. Concrete placement follows the exact target-parent TeamRun policy in `universal-task-delegation-behavior-contract.md`.

## Terms

- **Task delegator:** the exact Agent execution that calls `delegate_task`.
- **Task assignee:** the fresh dedicated Agent or AgentTeam execution created to perform one delegated task.
- **Task ID:** the root-scoped lifecycle identifier used by the delegator to review the task. It is not an Agent communication address.
- **Canonical Agent address:** the mounted absolute logical address of an Agent, such as `/engineering/developer`.
- **AgentRun ID:** the identifier of one exact active Agent execution. It is the unambiguous selector for ordinary communication with a persistent Agent, task Agent, or Agent inside a task Team.
- **Task Team coordinator:** the configured coordinator Agent in the fresh task Team execution. This Agent is the task Team's communication and formal result ingress.

Do not use **parent Agent** or **task review owner** as Agent-facing terms. Task relationships may cross execution scopes, so **task delegator** is both more accurate and more natural.

## Governing Separation

The three identifiers have different jobs:

```text
recipient_address     selects the logical Agent or AgentTeam for new task creation
target_agent_run_id   contacts one exact active Agent execution
task_id               selects one formal delegated-task lifecycle for review
```

The tools are composable, not interchangeable:

| Intent | Required Tool | Lifecycle Effect |
| --- | --- | --- |
| Create dedicated work | `delegate_task` | Allocates a task and activates one fresh task Agent or task Team. |
| Ask a question, clarify requirements, or provide progress | `send_message_to` | Delivers ordinary communication; does not change task status. |
| Submit the task result | `submit_task_result` | Changes the bound task from `active` to `awaiting_review`. |
| Accept or request revision | `review_task_result` | Changes the selected task to `accepted` or back to `active`. |

A message that says “finished,” “accepted,” or “please revise” has no task-lifecycle effect. Formal state changes occur only through the task tools.

## Selector Lifecycle

`delegate_task` accepts only `recipient_address`. It does not accept `target_agent_run_id` because its purpose is to create a new dedicated execution from a logical topology placement; before activation, that new AgentRun does not exist and therefore has no run ID.

`send_message_to` accepts exactly one of two selectors:

- `recipient_address` when addressing a canonical logical Agent or AgentTeam placement;
- `target_agent_run_id` when addressing one exact currently active Agent execution whose ID is known.

The resulting lifecycle is:

```text
canonical recipient_address
  -> delegate_task
  -> create and activate dedicated task execution
  -> return target_agent_run_id
  -> send_message_to(target_agent_run_id) for exact ordinary communication
  -> task acceptance and safe settlement
  -> old target_agent_run_id becomes invalid
```

| Moment | Known Selector | Valid Operation | Meaning |
| --- | --- | --- | --- |
| Before task creation | Canonical `recipient_address` | `delegate_task` | Select the logical Agent or AgentTeam from which a fresh assignee will be created. |
| After successful activation | Returned `target_agent_run_id` | `send_message_to` | Contact that exact task Agent or the exact coordinator inside that task Team. |
| While no exact run ID is known | Canonical `recipient_address` | `send_message_to` | Contact the normal logical destination; this is not an alias for an unknown task execution. |
| After task execution settlement | Old `target_agent_run_id` | None | Exact-run delivery rejects it; no logical-address fallback occurs. |

For an AgentTeam task, activation creates multiple AgentRuns. The one returned communication selector is the fresh configured coordinator AgentRun ID.

## Task Creation Contract

Every successful `delegate_task` call creates exactly one new dedicated execution:

- Agent target -> one fresh task AgentRun;
- AgentTeam target -> one fresh task TeamRun whose configured coordinator receives the work packet;
- repeated calls to the same logical recipient -> distinct task IDs and distinct concrete executions.

`delegate_task` never redirects the work packet to the recipient's persistent AgentRun.

Its creation input remains minimal and address-only:

```json
{
  "recipient_address": "/engineering/tester",
  "description": "Verify the rollout plan.",
  "reference_files": ["/workspace/rollout-plan.md"]
}
```

`target_agent_run_id` is not a valid `delegate_task` input. If an exact active run already exists and the intent is merely to communicate with it, the caller uses `send_message_to` instead of creating another task.

### Minimal successful result

For an Agent target:

```json
{
  "task_id": "task-42",
  "status": "active",
  "target_agent_run_id": "task-agent-run-71"
}
```

For an AgentTeam target, `target_agent_run_id` is the exact AgentRun ID of the fresh task Team's configured coordinator:

```json
{
  "task_id": "task-43",
  "status": "active",
  "target_agent_run_id": "task-team-coordinator-run-82"
}
```

The field intentionally matches `send_message_to.target_agent_run_id`, allowing the delegator to copy it directly. The task TeamRun ID remains concrete execution identity for runtime/frontend ownership; it is not an Agent message endpoint and is not added to the minimal LLM-facing result.

### Activation failure

Any failure before the exact durable activation commit point—preparation, registration reservation, event sealing/validation, tree write, or task write—has no contactable assignee execution:

```json
{
  "task_id": "task-44",
  "status": "not_started",
  "message": "Task activation failed."
}
```

`target_agent_run_id` must not be returned for `not_started`. After the durable task-file commit point, only synchronous no-throw memory/registration/event-enqueue/work-gate transitions remain; subscriber exceptions are isolated and provider failure after release is an active task runtime outcome, not `not_started`.

## Assignee Work Packet

The work packet provides the task description, reference files, and the exact task delegator contact:

```text
Task delegator address: /engineering/developer
Task delegator AgentRun ID: developer-run-19

Description:
Verify the production rollout plan.

Reference files:
- /workspace/rollout-plan.md
```

The assignee-facing work packet does not display the task ID. The dedicated execution is already internally bound to exactly one task, and `submit_task_result` does not accept a task selector.

The two delegator fields are not duplicates:

- the canonical address explains the delegator's logical role;
- the AgentRun ID identifies the exact execution to contact, including when the delegator is a task Agent or an Agent inside a task Team.

## Bidirectional Ordinary Communication

### Delegator to assignee

After successful activation, the delegator may contact the exact task assignee ingress:

```json
{
  "target_agent_run_id": "task-agent-run-71",
  "content": "Please also verify the rollback section."
}
```

For a task Team, the returned ID contacts its coordinator.

### Assignee to delegator

The assignee may use the delegator AgentRun ID from the work packet:

```json
{
  "target_agent_run_id": "developer-run-19",
  "content": "Should the verification include historical incidents?"
}
```

The exact-run selector is required for this reply path because a canonical logical address alone might select a different active/persistent execution of the same logical Agent.

### Ordinary received-message identity

The recipient-visible ordinary message identifies both dimensions:

```text
You received a message from:
- sender address: /engineering/developer
- sender AgentRun ID: developer-run-19

Message:
Please also verify the rollback section.
```

This lets the recipient understand the sender's logical role and reply to the exact concrete execution. When both endpoints belong to the same root TeamRun, exact-run delivery re-enters the same root communication boundary used by address-selected delivery. The receiver AgentRun synchronously reserves the input in its existing FIFO without provider release; without awaiting, the communication owner submits one sealed row/reservation/event append plan. Under the root mutation lock, that plan revalidates current references, derives from the latest committed message state, durably appends the exact row, then commits/releases the same reservation. Conflict or file failure cancels it and dispatches nothing. Concurrent accepted calls therefore each retain a row. This is one message model, not an outbox, persisted revision, retry, alternate queue, or alternate history path.

## Formal Result And Review Flow

```text
task assignee
  -> submit_task_result(message, reference_files?)
  -> task becomes awaiting_review
  -> exact task delegator receives result notification containing task_id

task delegator
  -> review_task_result(task_id, accept)
     OR
  -> review_task_result(task_id, request_revision, comment)

revision request
  -> exact assignee execution
  -> task becomes active
  -> assignee continues and submits again
```

The delegator still receives and uses `task_id` because it may own multiple delegated tasks simultaneously. The assignee does not need to provide or choose that ID.

## Lifetime Invariants

- `target_agent_run_id` is returned only after the execution is active and exact-run messaging can resolve it.
- A task assignee execution remains alive while its own result/review lifecycle or any task it delegated remains open.
- Acceptance triggers settlement only after the established idle/open-work safety gates.
- Once settled, an old AgentRun ID is not recoverable through `send_message_to`; no fallback to a logical address is attempted.
- Ordinary communication failure does not rewrite task state.
- Task notification failure is reported as a warning without pretending the lifecycle transition failed when its durable transition already succeeded.

## Complete Interaction Scenario Catalog

These scenarios define Agent-facing interaction and lifecycle behavior. The assignee's concrete parent is selected independently by the exact target-parent TeamRun policy; the exact delegator/assignee task relationship remains in task facts.

| Scenario ID | Trigger | Required Interaction Outcome | Required Lifecycle Outcome |
| --- | --- | --- | --- |
| INT-001 | Persistent Agent delegates to an Agent. | Return the fresh task AgentRun ID; give the task Agent the persistent delegator address/run ID. | One new task becomes `active`. |
| INT-002 | Persistent Agent delegates to an AgentTeam. | Return the fresh task Team coordinator AgentRun ID; give the coordinator the delegator address/run ID. | One new Team task becomes `active`; only its configured coordinator is formal result ingress. |
| INT-003 | Task Agent delegates to an Agent. | Return the child task AgentRun ID; give the child the exact delegator task AgentRun ID, not an address-equivalent persistent run. | Child task is independently reviewable; delegator task Agent remains alive while child work is open. |
| INT-004 | Agent inside a task Team delegates to an Agent. | Return the child task AgentRun ID; give the child the exact task-Team member AgentRun ID. | Child task records the exact delegator execution regardless of final execution host. |
| INT-005 | Task Agent or task-Team Agent delegates to an AgentTeam. | Return the new task Team coordinator AgentRun ID; its packet contains the exact task-scoped delegator contact. | New Team task has its own task ID and lifecycle. |
| INT-006 | Same delegator delegates twice to the same logical address. | Return a different active `target_agent_run_id` for each call. | Allocate two distinct task IDs and independent lifecycles. |
| INT-007 | Delegator sends clarification after activation. | Use the returned `target_agent_run_id`; deliver to the exact task Agent or task Team coordinator. | Task remains `active`; no submission/review transition occurs. |
| INT-008 | Assignee asks the delegator a question. | Use the task delegator AgentRun ID from the packet; deliver to the exact delegator execution. | Task status is unchanged. |
| INT-009 | Assignee completes initial work. | Call `submit_task_result`; do not encode completion in `send_message_to`. The root task-command queue revalidates the exact assignee/current source state at its head. | Task becomes `awaiting_review`; exact delegator receives a notification containing task ID. |
| INT-010 | Delegator accepts submitted work. | Call `review_task_result(task_id, accept)`; the root task-command queue first commits `accepted`, then later prepares reversible quiescence and a tree-only settlement. | Task becomes `accepted`; `settledAt` changes only after open-work/input-reservation gates and durable tree commit. |
| INT-011 | Delegator requests revision. | Call `review_task_result(task_id, request_revision, comment)`; the root task-command queue commits the transition before framework notification. | Task becomes `active`; later revised work uses `submit_task_result` again. |
| INT-012 | An ordinary message says “finished,” “accept,” or “revise.” | Deliver it as ordinary content only. | Task status is unchanged. |
| INT-013 | Task activation is rejected or its writer reports `not_renamed`. | Return `not_started` without `target_agent_run_id`; no contactable task execution exists. | No active task binding or execution remains; a committed tree-only orphan is removed on reload. |
| INT-014 | Exact-run ordinary delivery is rejected or its writer reports `not_renamed`. | Return the existing message-delivery rejection; do not retry by logical address. | Task state is unchanged and the reserved input is canceled before dispatch. |
| INT-015 | A durable submit/review transition succeeds but its system notification fails. | Surface the task notification warning through the task result. | Do not reverse or duplicate the durable lifecycle transition. |
| INT-016 | Caller messages a settled assignee AgentRun ID. | Reject as inactive/unknown; do not route to the persistent Agent at the same address. | Settled task remains settled. |
| INT-017 | Caller uses the original logical `recipient_address` after task activation. | Resolve according to normal logical-address messaging, not as an alias for the task execution. Exact task contact requires the returned run ID. | Task state is unchanged. |
| INT-018 | A task Team member other than its coordinator attempts `submit_task_result`. | Ordinary messaging remains available, but formal Team result submission is rejected for that member. | Task remains active until the exact coordinator ingress submits. |
| INT-019 | A task assignee delegates child work and then submits its own result. | Child communication uses its own returned run ID; task participants remain independently addressable. | Parent task cannot safely settle while owned child work remains open. |
| INT-020 | Two same-root Agents send overlapping ordinary messages to the same or different receivers. | Each call reserves then immediately submits one root-locked append plan; no caller derives a complete snapshot. | Every accepted call retains one durable row; same-receiver input order is not overtaken. |
| INT-021 | Delegator owns several tasks awaiting review while independent task commands overlap. | Each command enters the one root task-command queue; at queue head it reloads the latest task state, identifies its exact task ID, and derives cumulatively. | `review_task_result` changes only the selected task; no independently committed submit/review transition is overwritten. |

`renamed_finalization_indeterminate` is intentionally not another ordinary interaction outcome. For either task or message persistence, the affected rooted execution surface fail-stops, publishes/releases no new work or message input, and emits no normal tool result. Strict root reload decides which final pathname survived, repairs task truth, and never replays message history. This avoids telling an Agent that an operation cleanly failed when the final file may already contain it.

## Main Interaction Spines

### INT-001 — Persistent Agent to task Agent

```text
/engineering/developer (developer-run-19)
  -> delegate_task(/engineering/tester)
  -> allocate task-42
  -> activate /engineering/tester (task-agent-run-71)
  -> return {task_id:"task-42",status:"active",target_agent_run_id:"task-agent-run-71"}
  -> deliver packet with delegator /engineering/developer + developer-run-19
```

Either side may then use exact-run `send_message_to`. Completion still follows:

```text
task-agent-run-71 -> submit_task_result
developer-run-19 -> review_task_result(task-42, ...)
```

### INT-002 — Persistent Agent to task AgentTeam

```text
/operations/operator (operator-run-20)
  -> delegate_task(/engineering)
  -> allocate task-43 + fresh Engineering task Team
  -> activate fresh coordinator engineering-lead-task-run-82
  -> return {task_id:"task-43",status:"active",target_agent_run_id:"engineering-lead-task-run-82"}
  -> deliver packet with delegator /operations/operator + operator-run-20
```

`engineering-lead-task-run-82` is the communication and result ingress. The task TeamRun ID remains internal concrete execution identity and is not substituted into `send_message_to`.

### INT-003/INT-004 — Task-scoped delegator

```text
exact delegator execution
  -> delegate_task(canonical target address)
  -> fresh child task execution
  -> child packet receives exact delegator address + AgentRun ID
  -> delegate result returns exact child ingress AgentRun ID
```

The canonical delegator address explains its role, while the AgentRun ID prevents an ordinary reply from reaching an address-equivalent persistent Agent or another task execution.

### INT-009 through INT-011 — Submit and review

```text
active
  -> submit_task_result
awaiting_review
  -> review_task_result(request_revision)
active
  -> submit_task_result
awaiting_review
  -> review_task_result(accept)
accepted
  -> safe settlement gates
settled execution
```

Acceptance is not destructive settlement. The accepted task record may coexist with `settledAt: null`. The later settlement command first closes new input and waits already-submitted message reservations/dispatch. A pre-rename execution-tree write failure cancels that quiescence and leaves the exact execution contactable; durable success makes it non-routable before local provider/handle teardown. Formal task status is never inferred from an ordinary message or from local handle deletion.

Ordinary messages may occur between any of these steps but do not create a state transition.

### INT-013 — Activation failure

```text
delegate_task
  -> allocation/preparation/start attempt
  -> failure before sealed preparation + durable task-file commit
  -> cleanup prepared execution/binding
  -> {task_id, status:"not_started", message}
```

No `target_agent_run_id` is returned because no active exact-run communication endpoint exists.

## Invalid Conflations

- Do not treat `send_message_to` as result submission, revision, acceptance, or finalization.
- Do not infer task status from message content.
- Do not route an exact-run message to a persistent Agent merely because it has the same canonical address.
- Do not expose a task TeamRun ID as though it were an AgentRun communication selector.
- Do not require the assignee to echo a task ID already bound to its dedicated execution.
- Do not call the task delegator a parent execution when the task may run in another branch or execution scope.

## Confirmed Decisions

Confirmed in requirements discussion:

1. Messaging and tasking compose: both sides may use `send_message_to` for ordinary communication after delegation.
2. Formal task transitions remain exclusive to `submit_task_result` and `review_task_result`.
3. Successful `delegate_task` returns `task_id`, `status`, and the exact assignee ingress as `target_agent_run_id`.
4. For a task Team, that communication handle is the configured coordinator AgentRun ID.
5. The assignee work packet uses **task delegator address** and **task delegator AgentRun ID**, not **task review owner**.
6. The assignee work packet omits task ID; the delegator retains task ID for review.
7. `delegate_task` selects only by canonical `recipient_address`; after successful activation, its returned `target_agent_run_id` becomes usable by `send_message_to` for exact ordinary communication.

8. The assignee is hosted at the target's required parent TeamRun inside the caller's nearest enclosing concrete Team subtree that contains that logical parent. Resolution selects that ancestor by segment-aware address containment and then follows configured Team-member edges only; structural root naturally selects the persistent branch for cross-branch work.
9. Immediate and ancestor AgentTeam targets are valid and create fresh independent task Team executions.
10. The user will review the complete solution package before any architecture-review handoff.
