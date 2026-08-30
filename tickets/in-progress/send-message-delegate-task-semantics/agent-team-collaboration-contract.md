# AgentTeam Collaboration Contract

## Contract Status

- Contract ID: `ATC-001`
- Status: `Approved`
- Requirements revision: `RER-013`
- Owner: Requirements Engineering
- Scope: LLM-facing collaboration semantics, public success/failure identity results, and exact provider-shared collaboration prompt
- Runtime architecture: Not defined by this contract
- Approval reference: Explicitly approved by the user on 2026-08-30 together with the complete requirements package. The approval includes the exact prompt, exact tool and field descriptions, schema/result alignment, flat message receiver identity, and genuinely new clarification through the returned exact active task ingress.

## Purpose

Give every Team-bound LLM one direct and observable mental model:

- `send_message_to` communicates with an already existing AgentRun.
- `delegate_task` spawns a fresh task Agent or task AgentTeam instance with its own execution and lifecycle.
- The operations are not interchangeable, even though both may accept the same logical `recipient_address`.
- One work packet is delivered once. Successful delegation is already the task-creation and task-delivery step.

## Normative Identity And Delivery Matrix

| Operation | Logical Recipient Kind | Execution Effect | Initial Content Receiver | Successful Returned Identity |
| --- | --- | --- | --- | --- |
| `send_message_to(recipient_address)` | Agent | No new execution | Existing mounted Agent execution | That existing AgentRun as `target_agent_run_id` |
| `send_message_to(recipient_address)` | AgentTeam | No new execution | Existing mounted Team's configured coordinator | That existing coordinator AgentRun as `target_agent_run_id` |
| `delegate_task(recipient_address)` | Agent | Spawn one fresh task Agent instance | Newly spawned task Agent | New task AgentRun as `target_agent_run_id` plus `task_id` |
| `delegate_task(recipient_address)` | AgentTeam | Spawn one fresh task AgentTeam instance/subtree | Newly spawned task Team's configured coordinator | New task Team coordinator AgentRun as `target_agent_run_id` plus `task_id` |

The logical address identifies the mounted Agent or AgentTeam placement. The selected operation determines whether the system contacts the existing configured ingress or spawns a fresh task execution from that definition.

## Public Tool Result Contract

### Successful `send_message_to`

The always-null `result` field is replaced by a flat top-level `target_agent_run_id`.

```json
{
  "accepted": true,
  "code": "DELIVERED",
  "message": "Delivered message to /reviewer.",
  "target_agent_run_id": "existing-reviewer-run-123"
}
```

- For logical Agent delivery, the ID is the existing mounted AgentRun that accepted the message.
- For logical AgentTeam delivery, the ID is the existing mounted Team coordinator AgentRun that accepted the message.
- For accepted exact-run delivery, the ID confirms the selected exact active AgentRun.

### Rejected `send_message_to`

```json
{
  "accepted": false,
  "code": "COLLABORATION_TARGET_NOT_FOUND",
  "message": "Target was not found.",
  "target_agent_run_id": null
}
```

A rejected message exposes no successful receiver identity.

### Successful `delegate_task`

```json
{
  "task_id": "task-123",
  "status": "active",
  "target_agent_run_id": "spawned-task-ingress-run-456"
}
```

- For Agent delegation, `target_agent_run_id` is the newly spawned task AgentRun.
- For AgentTeam delegation, `target_agent_run_id` is the coordinator AgentRun of the newly spawned task Team.
- `target_agent_run_id` is not the task TeamRun ID and is not a substitute for `task_id`.

### Delegation Not Started

```json
{
  "task_id": "task-123",
  "status": "not_started",
  "message": "Task activation failed."
}
```

No fresh contactable task execution or `target_agent_run_id` exists when delegation does not start.

## Schema Projection Requirements

- The `send_message_to` public result type/schema must replace `result` with flat `target_agent_run_id: string | null`.
- The `delegate_task` public result type/schema must continue to expose its discriminated outcomes: active results contain `task_id`, `status: "active"`, and `target_agent_run_id`; not-started results contain `task_id`, `status: "not_started"`, and `message` with no successful target identity.
- Native JSON, MCP text content, MCP structured content, public TypeScript types, documentation, and contract tests must project the same field names and null/omission rules.
- The input schemas remain intentionally different and must not be made artificially identical: `send_message_to` accepts exactly one message target selector plus message content; `delegate_task` accepts one logical `recipient_address` plus a complete task description and optional references.
- Agent-facing tool descriptions must state the successful returned identity semantics so the tool metadata does not contradict or underspecify the system prompt.
- The current MCP adapter definition type exposes only `inputSchema`. Downstream architecture must determine the authoritative machine-readable output-schema seam, but the result contract must not remain prose-only.

## Exact Agent-Facing Tool Descriptions

The shared tool descriptions and their native/MCP projections must use the following exact semantic content. Provider formatting may escape characters as required but must not change the meaning.

### `send_message_to`

```text
Send one self-contained ordinary message to an already existing AgentRun. Use
exactly one selector: recipient_address for one canonical absolute non-root
logical Agent-or-AgentTeam address in the same rooted AgentTeam, or
target_agent_run_id for one exact currently active AgentRun. An Agent address
resolves to its mounted Agent execution; an AgentTeam address resolves to its
mounted configured coordinator. This call creates no task or new execution.
On success, it returns the exact existing AgentRun that accepted the message as
flat target_agent_run_id; on rejection, target_agent_run_id is null.
```

Required selector descriptions:

- `recipient_address`: `Canonical absolute non-root logical Agent-or-AgentTeam address beginning with '/'. Messaging an Agent reaches its existing mounted execution; messaging an AgentTeam reaches its existing mounted configured coordinator. This selector creates no new execution. Provide either recipient_address or target_agent_run_id, never both.`
- `target_agent_run_id`: `Exact currently active AgentRun.runId to receive an ordinary message. This selector is live-only: inactive, preallocated, recoverable, lazy-startable, or unknown run IDs are rejected. Provide either target_agent_run_id or recipient_address, never both.`

### `delegate_task`

```text
Spawn one fresh, independently tracked task execution for one mounted Agent or
AgentTeam in the same rooted AgentTeam. recipient_address identifies the
Agent or AgentTeam definition from which the task instance is spawned. An
Agent target spawns one fresh task Agent and delivers the complete task packet
to it. An AgentTeam target spawns one fresh task Team and delivers the complete
task packet to that new Team's configured coordinator. The delegation call is
both the task-creation and assignment step; do not resend the same work through
send_message_to. On success, it returns task_id, status, and the fresh task
ingress as target_agent_run_id.
```

Required task-field descriptions:

- `recipient_address`: `Exact canonical absolute non-root address beginning with '/' for the mounted Agent or AgentTeam definition from which a fresh task instance will be spawned. Agent targets spawn a fresh task Agent. AgentTeam targets spawn a fresh task Team whose configured coordinator receives the task packet.`
- `description`: `Complete ready-to-run task packet: objective, context, scope, constraints, done conditions, expected output, and reference guidance. delegate_task itself delivers this packet to the spawned task execution; do not resend it with send_message_to.`
- `reference_files`: `Optional absolute local file paths the spawned task execution should inspect. Use full filesystem paths; relative paths and URLs are rejected.`

## Exact Provider-Shared Collaboration Prompt

The following block is the proposed exact LLM-facing prompt. Requirements-process IDs and approval annotations must not appear inside the production prompt.

```md
## AgentTeam Collaboration

Choose the collaboration mode based on your primary intent.
`send_message_to` communicates with an already existing execution.
`delegate_task` spawns a fresh task execution that independently owns a unit
of work. These operations are not interchangeable. Never use both to deliver
the same work.

### Ordinary Communication

Use `send_message_to` to communicate with an already existing Agent or
AgentTeam instance.

- When `recipient_address` identifies an Agent, the message is delivered to
  that mounted Agent's existing execution.
- When `recipient_address` identifies an AgentTeam, the message is delivered
  to that mounted Team's existing configured coordinator.
- When an exact active AgentRun ID is known, `target_agent_run_id` may instead
  select that specific execution.

A successful call returns the exact existing AgentRun that accepted the
message as `target_agent_run_id`. For an AgentTeam recipient, this is its
existing coordinator AgentRun.

`send_message_to` does not spawn an Agent or AgentTeam, create or track a task,
submit a task result, review a task result, or change task status.

### Dedicated Task Execution

Use `delegate_task` to assign a new bounded unit of work that requires its own
execution, ownership, and task lifecycle.

The `recipient_address` identifies the mounted Agent or AgentTeam definition
from which the task execution is spawned.

- When `recipient_address` identifies an Agent, the system spawns a fresh task
  Agent instance and delivers the complete task packet to that new Agent.
- When `recipient_address` identifies an AgentTeam, the system spawns a fresh
  task AgentTeam instance and delivers the complete task packet to that new
  Team's configured coordinator. The entire task Team is newly spawned; its
  coordinator is the initial task ingress.

A successful call returns the new task's `task_id`, `status`, and exact spawned
task ingress as `target_agent_run_id`. For a task AgentTeam, this is the newly
spawned Team's coordinator AgentRun.

The delegation call is both the creation and assignment step. Include the
complete task description and reference files in that call. Do not send the
same assignment again through `send_message_to`.

The original logical `recipient_address` continues to identify the mounted
Agent or AgentTeam. It is not an alias for the newly spawned task execution.

If delegation returns `status: "not_started"`, no task execution was
successfully spawned. Do not use an ordinary message as an equivalent task-
creation fallback. Correct the problem and delegate again, or report the
failure.

### Additional Task Clarification

After successful delegation, genuinely new clarification may be sent to the
exact active task ingress using the returned `target_agent_run_id`. Never
repeat the original task packet, and never use the original logical
`recipient_address` as an alias for the spawned task execution.

An additional message communicates with the active task execution; it does not
create another task or change the existing task's lifecycle state.

### Task Lifecycle

The spawned task assignee uses `submit_task_result` to submit its formal result.
The delegator uses `review_task_result` to accept the result or request a
revision.

Message wording such as "finished," "accepted," or "please revise" does not
change task state.

### Rule-Based Handoffs

When you finish your own work or are blocked, call `get_handoff_rules`. Apply
every matching rule and notify each exact returned `recipient_address` using
`send_message_to`. Combine applicable reasons for the same recipient and
follow distinct recipients in their returned order. If no rule applies, finish
normally.

Do not claim that a message, delegation, or handoff succeeded unless the
corresponding tool confirms success.
```

## Contract Invariants

1. `recipient_address` is a logical Agent or AgentTeam placement, not a concrete task-execution alias.
2. `target_agent_run_id` is one exact concrete AgentRun identity.
3. `task_id` selects the formal task lifecycle; it is not a message recipient.
4. A message creates no task execution or lifecycle transition.
5. One successful delegation creates one fresh task execution and already delivers the work packet.
6. AgentTeam delegation spawns the complete fresh task Team instance/subtree; its fresh coordinator receives the initial packet.
7. The same assignment is never dispatched through both collaboration tools.
8. Formal result submission and review use `submit_task_result` and `review_task_result`.
9. Native, MCP, AutoByteus, Codex, and Claude projections expose the same semantics, machine-readable result contract, and identity fields.

## Approval Basis

Approval of this contract approves:

- the exact prompt block above;
- the four-case Agent/AgentTeam identity and delivery matrix;
- flat `send_message_to.target_agent_run_id` replacing the always-null `result` field;
- preservation of `delegate_task.task_id`, `status`, and `target_agent_run_id` semantics;
- authoritative machine-readable result schemas/types and identical native/MCP/tool-description projections while preserving distinct input schemas;
- the exact Agent-facing tool descriptions and field-description semantics above;
- genuinely new exact-run clarification after delegation as written in `Additional Task Clarification`;
- the duplicate-dispatch and formal-lifecycle prohibitions.

It does not approve target architecture, implementation files, migration mechanics, or provider-specific divergence.
