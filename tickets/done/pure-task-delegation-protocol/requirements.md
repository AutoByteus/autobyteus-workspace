# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready. User approved the requirement direction in chat on 2026-06-10 after reviewing the current branch task model, `origin/personal` task-agent model, and the proposed clean model: `delegate_tasks`, `submit_task_result`, and `review_task_result` with system-mediated notifications. Round 1 architecture review on 2026-06-10 approved the product direction and requested targeted requirement/design tightening for child-delegation settlement guards, notification warning results, and explicit review-to-submission linkage.

## Goal / Problem Statement

Refactor team task delegation into a pure, system-mediated subagent/task lifecycle protocol instead of mixing task lifecycle with generic `send_message_to` communication.

The current branch model exposes `delegate_tasks`, generic `send_message_to`, and `accept_task`. In practice, delegator agents confuse the responsibilities: they sometimes use `send_message_to` to say a task is finished rather than calling `accept_task`, and the same generic communication tool can appear capable of task assignment, revision, result reporting, and acceptance. This creates avoidable cognitive load and unreliable task-agent lifecycle behavior.

The target model should feel like explicit subagent task execution:

```text
delegate_tasks
  -> system starts task-agent and sends work packet
submit_task_result
  -> task-agent submits reviewable result to the system
  -> system notifies original delegator
review_task_result(decision = request_revision)
  -> system notifies the same task-agent with revision instructions
submit_task_result again
review_task_result(decision = accept)
  -> system accepts the result and settles the task-agent after safe idle gates
```

The implementation should learn from `origin/personal`: there the system, not the model, sent structured completion notifications to the delegator after worker result tools. However, improve that older model by replacing `mark_task_completed` / `mark_task_failed` and `accept_task` with clearer intent names and by making revision review part of the task protocol instead of `send_message_to`.

## Investigation Findings

- Current branch `codex/auto-approve-external-git-ops-regression` has already removed `mark_task_completed`, `mark_task_failed`, `TaskDelegationCompletionNotifier`, `awaiting_acceptance`, and `failed` task states. Current `TaskDelegationService` exposes `delegateTasks(...)` and `acceptTask(...)`; task-agent reports/revisions are instructed to use `send_message_to`.
- `origin/personal` at `36b2dbd6d5bfba4634db19d7fbb7e60df27487ec` still has a more task-pure mechanism: `delegate_tasks`, `mark_task_completed`, `mark_task_failed`, `accept_task`, ledger statuses `not_started`, `queued`, `awaiting_acceptance`, `accepted`, `failed`, and `TaskDelegationCompletionNotifier` posting system notifications to the original delegator.
- Historical ticket `tickets/done/runtime-tool-mcp-unification-analysis` explicitly designed the server-owned task delegation boundary and concluded that worker result tools should be selector-free, bound to task-agent context, and system notifications should deliver generated task IDs to delegators.
- Historical ticket `tickets/done/remove-native-autobyteus-agent-team` later simplified the model to `delegate_tasks` + ordinary `send_message_to` + `accept_task`, intentionally removing worker result tools. That simplification fixed brittleness in the old result-tool/revision path but overcorrected by making task result/revision lifecycle depend on generic communication again.
- User-observed current failure: the delegator can call `send_message_to` with content such as "the task is finally finished" instead of calling `accept_task`, proving the model-facing surface is ambiguous.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior change + refactor / task model redesign.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue + Duplicated Policy Or Coordination + Shared Structure Looseness.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed now.
- Evidence basis:
  - The current task lifecycle is split between task-specific `delegate_tasks`/`accept_task` and generic `send_message_to`, so lifecycle intent is not uniquely represented by the tool surface.
  - `origin/personal` proves the system notification pattern already existed and should be reused conceptually.
  - Historical design documents show both the old explicit tool model and the later simplification; the current user-observed behavior exposes the simplification's cognitive-load cost.
- Requirement or scope impact:
  - Replace current `accept_task` with `review_task_result`.
  - Add `submit_task_result` as the only task-agent result submission path.
  - Keep `delegate_tasks`, but update tool result, work packet, prompt, ledger, event, and settlement behavior to the new protocol.
  - Keep `send_message_to` as general teammate communication, not as the task lifecycle protocol.

## Recommendations

1. Use `origin/personal` as the implementation reference for system-mediated task notifications and safe settlement after delegator acceptance.
2. Do not resurrect the old tool names or old half-pure revision path. Replace them with clearer task-intent tools:
   - `delegate_tasks`
   - `submit_task_result`
   - `review_task_result`
3. Treat task lifecycle as an authoritative `TaskDelegationService` state machine with system notifications as event/return spines.
4. Remove the model-facing `accept_task` tool in this change rather than keeping a compatibility alias.
5. Do not use `send_message_to` for task result submission, task review, revision request, or task acceptance. Any task-protocol notification to the delegator/task-agent should be system-generated.

## Scope Classification (`Small`/`Medium`/`Large`)

Large. The target touches model-facing tool contracts, task ledger states, task-agent work packets, runtime tool exposure for Codex/Claude/AutoByteus, system notification routing, events, settlement, tests, and docs.

## In-Scope Use Cases

- UC-001: An authorized active team member delegates ready-to-run bounded work with `delegate_tasks`.
- UC-002: A task-agent receives a system work packet and later submits a reviewable result using `submit_task_result` without passing a task selector.
- UC-003: The system records the result and notifies the original delegator with task ID, result message, references, and review instructions.
- UC-004: The original delegator accepts the submitted result using `review_task_result(decision="accept")`, causing safe task-agent settlement after idle gates.
- UC-005: The original delegator requests revision using `review_task_result(decision="request_revision")`, causing the system to notify the same task-agent and return the task to active work.
- UC-006: A task-agent can submit a revised result after a revision request, and the delegator can then accept it.
- UC-007: A task-agent that delegates child work can receive the child result notification and review the child task using the same task protocol.
- UC-008: Generic `send_message_to` remains available for non-lifecycle teammate communication but is no longer advertised or needed for task result/review/acceptance flows.
- UC-009: Settled task-agent runs are no longer active review/revision targets, and stale task review/revision attempts fail clearly.
- UC-010: Runtime prompts, docs, and tests consistently teach the new pure task protocol and do not mention old task result/acceptance tools.

## Out of Scope

- General first-party MCP server exposure beyond current runtime tool projection mechanisms.
- Persistent task ledger storage beyond current in-memory/team-run-scoped behavior unless implementation discovers it is already required by existing owners.
- Frontend redesign beyond preserving/adjusting existing task-agent status/projection payloads needed by the protocol.
- Removing `send_message_to` for ordinary teammate communication.
- Adding model-facing dependency graphs, task names/titles, completion criteria fields, or expected-deliverables fields to `delegate_tasks`.
- Broad redesign of team communication recipient resolution except where task lifecycle should stop depending on it.

## Functional Requirements

- REQ-001: The model-facing task tool list MUST be exactly `delegate_tasks`, `submit_task_result`, and `review_task_result` for the new task lifecycle.
- REQ-002: `delegate_tasks` MUST keep the existing minimal task-item shape: `member_name`, required rich `description`, and optional `reference_files`; it MUST reject stale task-name/dependency/completion-criteria fields.
- REQ-003: `submit_task_result` MUST be task-agent-only and MUST infer the task from the caller's bound task-agent context; it MUST NOT accept `task_id`, `task_name`, `member_name`, or any explicit task selector.
- REQ-004: `submit_task_result` MUST require a non-empty result `message` and MAY accept `reference_files`.
- REQ-005: When `submit_task_result` succeeds, the system MUST record a distinct result submission, move the task to `awaiting_review`, publish a task-delegation result event, and attempt a system notification to the original delegator. Notification delivery failure MUST NOT roll back the valid lifecycle mutation; it MUST produce a deterministic warning in the service/tool result.
- REQ-006: `review_task_result` MUST be original-delegator-only and MUST accept the generated `task_id`, a `decision` of `accept` or `request_revision`, optional `message`, and optional `reference_files`.
- REQ-007: `review_task_result(decision="request_revision")` MUST require a non-empty revision message, record the review against the reviewed submission, move the task back to active, and attempt a system revision notification to the same task-agent run. Notification delivery failure MUST NOT roll back the valid lifecycle mutation; it MUST produce a deterministic warning in the service/tool result.
- REQ-008: `review_task_result(decision="accept")` MUST record acceptance against the reviewed submission, mark the task terminal accepted, invalidate the task-agent as a pending review/revision target, publish a task-delegation status/review event, and request safe task-agent settlement after idle/no-open-work gates.
- REQ-009: `accept_task`, `mark_task_completed`, and `mark_task_failed` MUST be removed from task-delegation manifests, schemas, parsers, runtime exposure, prompts, docs, and tests in this target branch; no compatibility aliases may remain for in-scope behavior.
- REQ-010: Task-agent work packets MUST instruct task-agents to use `submit_task_result` for reviewable output and must not instruct result reporting through `send_message_to`.
- REQ-011: Delegator runtime instructions MUST instruct delegators to use `review_task_result` for acceptance or revision and must not instruct task lifecycle completion through `send_message_to`.
- REQ-012: The system notification owner MUST route result notifications to the exact original delegator identity, including when that delegator is itself a task-agent, with coordinator/team-visible event history where existing behavior supports it.
- REQ-013: Revision notifications MUST be system-generated task inputs to the bound task-agent, not model-authored `send_message_to` messages.
- REQ-014: `send_message_to` MUST remain available only for ordinary teammate communication and handoffs; prompts/docs MUST explicitly say it is not the task result/review/acceptance protocol.
- REQ-015: The task ledger MUST support multiple result/review cycles for one task: active -> awaiting_review -> active -> awaiting_review -> accepted.
- REQ-016: The task ledger MUST preserve result/review history with explicit review-to-submission linkage: each result submission has a stable submission ID, each review records the reviewed submission ID, and the record tracks the latest pending submission while status is `awaiting_review`.
- REQ-017: Settlement MUST only occur after accepted review, safe tool-result delivery, task-agent idle/offline observation, no remaining non-terminal work assigned to that task-agent instance, and no remaining non-terminal child task for which that same task-agent run is the original delegator/reviewer.
- REQ-018: Invalid calls MUST fail clearly without mutating task state: unbound task-agent submission, submission from the wrong task-agent, review by a non-original delegator, review of a non-awaiting-review task, missing revision message, unknown task ID, stale accepted task, and stale/settled task-agent run.
- REQ-019: Existing Codex, Claude, and AutoByteus team runtime projections MUST expose only configured new task tools and must call the shared task-delegation manifest/service boundary.
- REQ-020: Tests and docs MUST encode the approved system-mediated task protocol and not normalize the current branch's ambiguous `send_message_to` lifecycle behavior.

## Acceptance Criteria

- AC-001: A tool-contract test proves `TASK_DELEGATION_TOOL_NAME_LIST` is exactly `["delegate_tasks", "submit_task_result", "review_task_result"]`.
- AC-002: Parser/schema tests prove `submit_task_result` accepts only `message` and optional `reference_files`, rejecting task selectors and generic status fields.
- AC-003: Parser/schema tests prove `review_task_result` accepts `task_id`, `decision`, optional `message`, optional `reference_files`, and requires `message` for `request_revision`.
- AC-004: Unit tests prove `delegate_tasks` activates task-agent work packets that instruct `submit_task_result`, not `send_message_to`, `mark_task_completed`, or `accept_task`.
- AC-005: Unit/integration tests prove task-agent `submit_task_result` moves an active task to `awaiting_review`, records result message/files, publishes events, and attempts a system result notification to the original delegator with deterministic warning behavior on delivery failure.
- AC-006: Unit/integration tests prove `review_task_result(request_revision)` by the original delegator records the review, moves the task back to active, and attempts a system revision notification to the same task-agent with deterministic warning behavior on delivery failure.
- AC-007: Unit/integration tests prove `review_task_result(accept)` by the original delegator marks the task accepted and requests settlement only after safe gates.
- AC-008: Tests prove non-original delegators cannot review, and task-agents cannot submit results for tasks they are not bound to.
- AC-009: Tests prove a task-agent delegator for nested child work receives the child result notification and can review the child task.
- AC-010: Source scans or focused tests prove `accept_task`, `mark_task_completed`, and `mark_task_failed` are absent from active task tool exposure, prompts, and docs except in historical ticket artifacts.
- AC-011: Runtime projection tests for Codex/Claude/AutoByteus prove configured task tools expose the new names and call the shared manifest/service.
- AC-012: Existing team communication tests still pass, with `send_message_to` preserved for general communication but not required for task lifecycle.
- AC-013: Docs under `autobyteus-server-ts/docs` and `autobyteus-ts/docs` describe the pure task protocol and system notification flow.
- AC-014: At least one live or harnessed mixed-runtime validation proves `delegate_tasks -> submit_task_result -> review_task_result(request_revision) -> submit_task_result -> review_task_result(accept) -> task-agent settlement`.
- AC-015: Unit/integration tests prove result and revision notification delivery failures leave the valid lifecycle mutation committed, publish the lifecycle event, log a structured warning, and return a deterministic warning payload.
- AC-016: Unit/integration tests prove `review_task_result` reviews only the latest pending submission and records `reviewedSubmissionId`/equivalent event payload linkage.
- AC-017: Unit/integration tests prove a task-agent with open child delegations is not settled after its parent task is accepted until those child tasks are terminal.

## Constraints / Dependencies

- Authoritative task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/pure-task-delegation-protocol`.
- Task branch: `codex/pure-task-delegation-protocol`.
- Bootstrap base branch: `origin/codex/auto-approve-external-git-ops-regression` at `188a5f0305f3aed4877fcff70942975077455725`.
- Comparison reference: `origin/personal` at `36b2dbd6d5bfba4634db19d7fbb7e60df27487ec`.
- Current historical context artifacts:
  - `tickets/done/runtime-tool-mcp-unification-analysis/`
  - `tickets/done/remove-native-autobyteus-agent-team/`
- No compatibility wrappers or aliases for removed task tools are allowed in the target design.

## Assumptions

- The user-approved product direction is to make task lifecycle feel like explicit subagent execution rather than peer chat.
- Existing task-agent exact run identity and settlement mechanisms remain reusable, but their model-facing lifecycle role should move behind task protocol tools and system notifications.
- The in-memory/team-run-scoped ledger remains acceptable for this refactor unless implementation discovers an existing persistence requirement.

## Risks / Open Questions

- Some live E2E prompts may currently rely on `accept_task` or `send_message_to` task lifecycle wording and will need careful updates.
- Runtime-specific tool projection paths may have stale test expectations from both the old `origin/personal` result-tool model and the current simplified send-message model.
- The exact event names for result submission/review should be finalized in design to avoid confusing old `TASK_DELEGATION_STATUS_UPDATED` consumers.
- Frontend task-agent UI may need validation if event payload shape changes.

## Requirement-To-Use-Case Coverage

| Requirement | Use Case(s) |
| --- | --- |
| REQ-001 | UC-001, UC-002, UC-004, UC-005 |
| REQ-002 | UC-001 |
| REQ-003, REQ-004 | UC-002 |
| REQ-005, REQ-012 | UC-003, UC-007 |
| REQ-006, REQ-007 | UC-004, UC-005, UC-006 |
| REQ-008, REQ-017 | UC-004, UC-007, UC-009 |
| REQ-009, REQ-020 | UC-010 |
| REQ-010, REQ-011, REQ-014 | UC-008, UC-010 |
| REQ-013 | UC-005, UC-006 |
| REQ-015, REQ-016 | UC-006 |
| REQ-018 | UC-002, UC-004, UC-005, UC-009 |
| REQ-019 | UC-001, UC-002, UC-004 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Proves the new model-facing tool surface is clean and unambiguous. |
| AC-002, AC-003 | Proves new tool schemas reject stale ambiguous lifecycle shapes. |
| AC-004 | Proves task-agent work packet teaches the correct result protocol. |
| AC-005 | Proves task-agent result submission is system-mediated. |
| AC-006 | Proves revision is system-mediated, not generic messaging. |
| AC-007 | Proves acceptance/finalization uses review tool and safe settlement. |
| AC-008 | Proves task identity and authorization invariants. |
| AC-009 | Proves nested task-agent delegation remains supported. |
| AC-010 | Proves clean-cut removal of obsolete tool names. |
| AC-011 | Proves runtime projections use the shared new contract. |
| AC-012 | Proves general communication remains intact without owning task lifecycle. |
| AC-013 | Proves durable docs align with new model. |
| AC-014 | Proves integrated runtime behavior across the whole protocol. |
| AC-015 | Proves deterministic notification-warning semantics without lifecycle rollback. |
| AC-016 | Proves review-to-submission history linkage across cycles. |
| AC-017 | Proves child-delegation settlement guard for nested task-agent delegators. |

## Approval Status

User approved the requirement direction in chat on 2026-06-10, specifically agreeing with `delegate_tasks`, `submit_task_result`, `review_task_result`, and with learning from `origin/personal` that the system should send result/revision notifications.
