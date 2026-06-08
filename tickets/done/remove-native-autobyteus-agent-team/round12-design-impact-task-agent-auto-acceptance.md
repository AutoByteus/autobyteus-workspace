# Round 12 Design Impact: Task-Agent Completion Can Trigger Premature `accept_task`

## Context

API/E2E Round 6 for `codex/remove-native-autobyteus-agent-team` reported that the focused mixed task-delegation run passed, but the comprehensive live matrix failed when coordinator revision feedback to a completed-but-not-accepted task-agent exact run was rejected as no longer reachable.

The implementation had already added recoverable exact-run resolution and settled-run tombstones in Round 11. That fix makes pre-`accept_task` recoverable task-agent runs reachable and keeps post-`accept_task` targets rejected.

## Current Judgment

This now appears to be **Design Impact / Requirement Gap**, not a safe local implementation fix.

The likely failure path is not directory/recovery nondeterminism by itself. The full-matrix log indicates the coordinator received the task-agent completion report, then executed a tool in the completion-triggered coordinator turn before the E2E sent the explicit revision instruction. After that, the revision `send_message_to(target_agent_run_id=...)` was rejected because the task-agent run had already become no longer reachable.

Given the current implementation, the only normal path that makes an active task-agent exact run settled/unreachable before team termination is `accept_task` / settlement. Patching exact-run delivery to ignore that settled state would violate the approved design and existing acceptance criteria that settled task-agent run ids reject before projection.

## Evidence

Round 6 full matrix log:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/validation-logs/round6-live-e2e/full-real-runtime-matrix.log`

Key observations:

1. Coordinator prompt included explicit test guardrails:
   - lines around 1985-1987: if asked to call `accept_task`, call it exactly once with exact JSON; do not automatically accept framework task completion notifications.
   - lines around 2023-2026: feedback uses `send_message_to(target_agent_run_id=...)`; after `accept_task`, target is no longer active/reachable.
2. Task-agent was created:
   - line 2089: `Successfully created codex_app_server agent run 'team_mixed-task-delegation-team-8115c7c4-9825_31128e2e__worker__task_0001'.`
3. Task-agent first completion report reached coordinator and committed Team Communication projection:
   - line 2146: projection inserted from task-agent run to coordinator.
4. Immediately after the completion report, the coordinator had a turn and executed one tool before the explicit revision instruction was sent:
   - lines 2148-2181 show `ApiToolCallStreamingResponseHandler finalized 1 tool invocations`, tool execution started, and tool execution succeeded in the completion-triggered coordinator turn.
5. Later, when the E2E sent the explicit revision instruction, the coordinator called a tool again, but the result/assistant response said the task-agent exact run was no longer reachable:
   - lines 2228-2260 show a subsequent tool invocation in the revision turn.
   - failure preview at line 4277 says the target run id was no longer an active message target and revision feedback could not be sent to the completed task-agent run.

Supporting implementation facts:

- `TaskDelegationService.acceptTask(...)` is the owner that marks the ledger accepted and calls `TaskAgentDirectory.markSettledByTaskId(...)`.
- `TaskDelegationSettlementCoordinator` only requests task-agent settlement after `accept_task` has been called.
- `MixedTeamManager.settleTaskAgentInstance(...)` also marks settled after registry settlement, but this is reached through the settlement coordinator after acceptance.
- Team termination cleanup appears after the failed wait, not before the rejection.

## Why This Is Not A Safe Local Fix

The accepted design currently has these two properties in tension:

1. Active task-agents remain exact-run reachable until `accept_task`.
2. The original delegator agent has `accept_task` exposed and, in this E2E, runs with provider-native tool calling / `tool_choice: required` and `autoExecuteTools=true`.

When a task-agent sends a completion report, that inter-agent message starts a coordinator turn. Since `accept_task` is available and the runtime/model may be forced or strongly biased to call a tool, the coordinator can accept the task before any external/user revision decision.

A local patch such as allowing messages after settlement would contradict the settled-run rejection invariant. A local patch such as blocking all inter-agent-origin `accept_task` would likely break nested task-agent delegation, where a task-agent delegator may need to accept child tasks after child reports.

## Design Questions For Solution Designer

Please re-evaluate the data-flow spine for task-agent completion and acceptance, including the model/tool-selection behavior:

- Should top-level `accept_task` require an external/user-originated instruction rather than being callable during an inter-agent completion-report turn?
- If yes, how should nested task-agent delegators accept child tasks without blocking valid autonomous nested workflows?
- Should `accept_task` exposure/tool-choice be dynamically gated by input origin, pending user acceptance state, or task-delegator kind?
- Should task-agent completion reports be delivered as non-tool-turn notifications to the delegator, or should the coordinator turn be constrained to non-terminal communication until an explicit user instruction arrives?
- Should the E2E setup avoid `tool_choice: required` for the coordinator after the initial delegation, or is provider-native required tool choice part of the product invariant that the design must support?
- Is there a desired grace/feedback window after a task-agent completion report, or is acceptance intentionally immediate if the delegator model chooses to call `accept_task`?

## Relevant Artifacts

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/requirements.md`
- Round 4 simplified task-agent design: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/round4-simplified-task-agent-communication-design.md`
- Round 5 send-message addressing design: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/round5-send-message-addressing-design.md`
- Round 8 delivery-intent boundary design: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/round8-delivery-intent-boundary-design.md`
- API/E2E Round 6 report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/api-e2e-validation-report.md`
- Round 6 full matrix log: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/validation-logs/round6-live-e2e/full-real-runtime-matrix.log`
- Round 6 focused pass log: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/validation-logs/round6-focused/mixed-task-delegation-focused-rerun.log`
- E2E: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts`
- Acceptance owner: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts`
- Settlement coordinator: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-settlement-coordinator.ts`
- Directory/reachability owner: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/autobyteus-server-ts/src/agent-team-execution/task-delegation/task-agent-directory.ts`
- Mixed resolver: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/autobyteus-server-ts/src/agent-team-execution/backends/mixed/delivery/team-message-recipient-resolver.ts`
