# Round 14 Correction: Task Tools Are Configured Capability, Not Runtime Tool-Choice Policy

## Context

This correction supersedes the Round 13 non-forcible-tool-choice proposal. The user explicitly clarified the architectural boundary: `delegate_tasks`, `accept_task`, and `send_message_to` are configured agent tools. Whether a model chooses to call a configured tool is primarily a prompt/model/test configuration issue, not a reason to add low-level runtime policy for this ticket.

## Corrected Judgment

The ticket should keep the task architecture correct and simple:

```text
delegate_tasks
  -> active task-agent run
  -> ordinary send_message_to progress/completion/revision messages
  -> original delegator calls accept_task when satisfied
  -> task-agent run settles and later exact-run messages reject
```

Do **not** add runtime code that special-cases provider `tool_choice` for `accept_task` in this ticket. Do **not** treat `autoExecuteTools=true` as a design problem. E2E tests should configure the tools needed by the agent and should rely on clear instructions/model capability or test-specific prompt shaping; if a weak model or bad prompt fails to call the desired tool, that is not an architectural defect in the task-delegation layer.

## Authoritative Invariants

1. `delegate_tasks` and `accept_task` are normal configured tools, just like `send_message_to`.
2. `delegate_tasks` returns generated `task_id` values and concrete `target_agent_run_id` values for activated task-agent runs.
3. `accept_task` accepts a `task_id`, not a run id.
4. Only the original delegator may accept a task. For nested tasks, a task-agent delegator may accept the child task it delegated.
5. A task-agent run remains addressable through `send_message_to(target_agent_run_id=...)` while its task is active.
6. A valid `accept_task` call transitions the task to `accepted`, tombstones the task-agent run id, and schedules settlement.
7. After acceptance/settlement, exact-run messages to that task-agent run reject before Team Communication projection.
8. Reports/completion messages from task agents are communication only; they do not mutate the task ledger by themselves.

## What Is Not In Scope

- Changing `tool_choice` behavior.
- Dampening provider-native forced tool calls.
- Adding runtime policy that treats `accept_task` differently from other configured tools at LLM request time.
- Compensating in framework code for low-performing models, weak prompts, or tests that configure provider behavior in a way that forces undesired tool calls.
- Reintroducing `mark_task_completed`, `mark_task_failed`, awaiting/revision ledger states, or a framework completion-result tool.

## Use Cases And Data-Flow Spines

| Spine ID | Use Case | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| R14-DS-001 | Configure task tools for an agent | Agent definition/member config lists `delegate_tasks`/`accept_task` | Runtime exposes configured tools | Runtime adapter / AutoByteus tool resolver | Tool availability is configuration, not hidden framework behavior. |
| R14-DS-002 | Delegate task | Original delegator calls `delegate_tasks` | Active task-agent run id returned | `TaskDelegationService` + activation coordinator | Creates task ledger record and concrete run identity. |
| R14-DS-003 | Task-agent reports completion/progress/blocker | Task-agent calls `send_message_to` | Delegator receives committed Team Communication input | `TeamMemberDeliveryCoordinator` | Communication is separate from terminal task state. |
| R14-DS-004 | Delegator sends revision | Delegator calls `send_message_to(target_agent_run_id)` | Same active task-agent receives feedback | `TeamMessageRecipientResolver` + `TaskAgentDirectory` | Active task-agent remains reachable until accepted. |
| R14-DS-005 | Delegator accepts task | Original delegator calls `accept_task(task_id)` | Task accepted, task-agent tombstoned/settlement requested | `TaskDelegationService` | Terminal mutation remains centralized. |
| R14-DS-006 | Nested task-agent acceptance | Parent task-agent calls `accept_task(child_task_id)` | Child task accepted/settled | `TaskDelegationService` delegator identity validation | Preserves nested delegation. |
| R14-DS-007 | Post-accept exact-run send | Sender calls `send_message_to(target_agent_run_id=<settled>)` | Rejected before projection | `TeamMessageRecipientResolver` | Keeps exact-run safety truthful. |

## Main Data-Flow Spines

### R14-DS-002 — delegation

```text
configured agent tool call delegate_tasks
  -> TaskDelegationToolService resolves TeamRun
  -> TaskDelegationService.delegateTasks
  -> TaskDelegationLedger creates task_0001
  -> TaskDelegationActivationCoordinator builds taskAgentRunId
  -> TaskAgentDirectory records starting/active entry
  -> MixedTeamManager starts task-agent AgentRun
  -> delegate_tasks result returns { task_id, target_agent_run_id }
```

### R14-DS-003 / R14-DS-004 — report and revision via send_message_to

```text
task-agent send_message_to(recipient_name=<delegator> or target_agent_run_id=<parent task-agent>)
  -> shared parser/validator
  -> unresolved delivery intent
  -> MixedTeamManager / TeamMemberDeliveryCoordinator
  -> TeamMessageRecipientResolver
  -> target AgentRun.postUserMessage
  -> committed Team Communication/member input projection

parent revision send_message_to(target_agent_run_id=<active task-agent>)
  -> TeamMessageRecipientResolver.resolveByTargetAgentRunId
  -> TaskAgentDirectory returns active task-agent entry
  -> concrete task-agent AgentRun.postUserMessage
  -> committed projection
```

### R14-DS-005 — acceptance

```text
original delegator accept_task(task_id="task_0001")
  -> TaskDelegationService.assertOriginalDelegator
  -> TaskDelegationLedger.acceptTask(status=accepted)
  -> TaskAgentDirectory.markSettledByTaskId
  -> TaskDelegationEventPublisher publishes accepted status
  -> TaskDelegationSettlementCoordinator.requestSettlement
```

## Tool Description / Prompt Requirements

Tool descriptions and member instructions should be clear because models use them to decide when to call tools:

- `delegate_tasks`: explain that it delegates one or more tasks, returns one `task_id` per task, and returns the task-agent `target_agent_run_id` for exact feedback.
- `accept_task`: explain that the original delegator calls it with the returned `task_id` only when that specific task is satisfactory/done.
- Task-agent work packets: include task id, own target agent run id, and the delegator reply selector.
- Roster/member prompt: explain that normal teammate communication uses `recipient_name`; exact task-agent feedback uses `target_agent_run_id` when supplied.

These are prompt/tool contract requirements. They are not a reason to add provider-level `tool_choice` policy.

## Validation Guidance

- E2E tests should configure required tools on the agents and use `autoExecuteTools=true` when validating automatic execution.
- E2E tests should not require framework code to compensate for a bad prompt/model/tool-choice setup.
- If a model fails to call a configured tool despite clear instructions, classify as prompt/model/test instability unless a framework invariant is violated.
- Framework defects remain in scope when:
  - `accept_task` succeeds for a non-original delegator;
  - task-agent run becomes unreachable before any valid `accept_task` or team termination;
  - `send_message_to(target_agent_run_id)` cannot reach an active task-agent run;
  - Team Communication projection is inserted for rejected delivery;
  - result/revision tools reappear.

## Supersedes

This correction supersedes the Round 13 proposal to add `AgentTurnInputContext` and managed tool-choice dampening for `accept_task`. Those runtime/tool-choice changes are out of scope for this ticket.
