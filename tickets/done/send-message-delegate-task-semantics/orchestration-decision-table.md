# AgentTeam Orchestration Decision Table

## Status

Approved behavior-defining supplement. This table clarifies intent selection and must be read with contract `ATC-001`, which preserves the current tool inputs and task lifecycle while approving the narrow `send_message_to` output replacement of `result` with flat `target_agent_run_id`.

## Core Distinction

- `send_message_to` communicates with an **already existing execution**. It does not create or track a task.
- `delegate_task` creates **one new, independently tracked task execution** and delivers the complete work packet to it.
- These operations may be composed for genuine later conversation, but they are not interchangeable and must not both be used to dispatch the same work.

## Decision Table

| Intent / Situation | Required Operation | Selector | Resulting Meaning | Must Not Happen |
| --- | --- | --- | --- | --- |
| Tell an existing teammate a fact, question, status, or handoff | `send_message_to` | `recipient_address` for the normal mounted destination, or an exact known active `target_agent_run_id` | One ordinary message is delivered to an existing execution; no task is created | Do not create a task merely to send a message |
| Assign one bounded, independently owned piece of work with its own result/review lifecycle | `delegate_task` | `recipient_address` | One fresh task Agent or task AgentTeam execution is created and receives the complete task description/reference packet | Do not send the same work packet again through `send_message_to` |
| Assign two independent work items | Two `delegate_task` calls | Relevant `recipient_address` per task | Two distinct tasks and fresh executions | Do not combine task creation with ordinary messages as an informal substitute for task records |
| Clarify or add context after successful delegation | `send_message_to` only when the clarification is genuinely additional | Returned `target_agent_run_id` | The clarification reaches the exact fresh task Agent or task Team coordinator | Do not use the original logical `recipient_address` as an alias for the fresh task execution; do not repeat the original task packet |
| Delegated assignee submits reviewable output | `submit_task_result` | Bound task context; no task selector | Task becomes `awaiting_review` | Do not use a “finished” message as task submission |
| Delegator accepts output or requests revision | `review_task_result` | `task_id` | Task becomes `accepted` or returns to `active` | Do not use “accepted” or “please revise” message wording as a lifecycle transition |
| Delegation fails before activation | Handle the `not_started` result; correct and retry `delegate_task` if the intent remains task assignment | New/corrected delegation call | No contactable task execution exists until delegation succeeds | Do not silently fall back to `send_message_to` and pretend a tracked task was created |
| New sequential work after an earlier task is accepted | New `delegate_task` call | Relevant `recipient_address` | A new task and new execution are created | Do not reuse the settled execution or treat an ordinary message as the new task |
| Address an AgentTeam for ordinary communication | `send_message_to` | AgentTeam `recipient_address` | Message goes through that mounted AgentTeam's configured coordinator ingress | Do not assume a new Team execution was created |
| Delegate work to an AgentTeam | `delegate_task` | AgentTeam `recipient_address` | A fresh task Team execution is created; its configured coordinator receives the work packet | Do not repeat the packet to the mounted AgentTeam coordinator through logical-address messaging |

## Canonical Examples

### Ordinary communication only

```json
{
  "recipient_address": "/reviewer",
  "content": "The approved requirements package is ready at /workspace/requirements-doc.md. Please inspect it before the next stage."
}
```

Expected: one message to the mounted `/reviewer` execution; no task record or task execution.

### Dedicated work only

```json
{
  "recipient_address": "/reviewer",
  "description": "Review /workspace/requirements-doc.md for contradictions. Return a concise finding with supporting paths.",
  "reference_files": ["/workspace/requirements-doc.md"]
}
```

Expected: one fresh task execution receives this complete packet. The delegator does **not** then call `send_message_to({recipient_address:"/reviewer", ...same work...})`.

### Genuine follow-up to the exact delegated execution

If successful delegation returned `target_agent_run_id: "task-reviewer-run-42"`:

```json
{
  "target_agent_run_id": "task-reviewer-run-42",
  "content": "Additional clarification: focus only on requirements semantics; architecture is out of scope."
}
```

Expected: the additional clarification reaches that exact live task execution. This is ordinary conversation and does not replace `submit_task_result` or `review_task_result`.

## Terminology Guardrail

Do not characterize `send_message_to` as “synchronous” unless discussing a precisely defined API timing guarantee. The product distinction is **existing-execution communication** versus **fresh task-execution creation and lifecycle**, not blocking versus non-blocking transport timing.
