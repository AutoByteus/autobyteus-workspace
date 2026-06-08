# Round 15 Implementation Investigation: Round 7 Mixed Task Delegation Failure Classification

## Scope

This note records implementation-side investigation of API/E2E Round 7 for stacked ticket `codex/remove-native-autobyteus-agent-team`.

Round 7 failed the focused real mixed task-delegation E2E and classified it as `Local Fix Required`, claiming the task-agent exact run became unreachable before valid `accept_task` or team termination.

## Authoritative Design Basis

Round 14 is authoritative:

- `delegate_tasks`, `accept_task`, and `send_message_to` are normal configured tools.
- Do not add `AgentTurnInputContext`, provider `tool_choice` dampening, or task-specific LLM request policy.
- Task-agent reports/completion messages are communication only.
- A task-agent exact run remains reachable until valid `accept_task` or team termination.
- Valid `accept_task(task_id)` by the original delegator tombstones the task-agent run id and schedules settlement.
- Settled exact-run sends reject before Team Communication projection.
- Live E2E model/tool-choice failures should be classified as prompt/model/test instability unless framework evidence shows an invariant violation.

## Investigation Method

I temporarily instrumented local source while reproducing the Round 7 focused E2E path, then restored the source files before finishing this investigation. The temporary debug markers were removed; `rg -n "R7_DEBUG" autobyteus-server-ts/src` returns no matches.

Temporary instrumentation was added only to observe lifecycle state transitions:

- `TaskDelegationService.acceptTask(...)`
- `TaskAgentDirectory.registerStartingTask(...)`
- `TaskAgentDirectory.markActive(...)`
- `TaskAgentDirectory.markSettledByTaskId(...)`
- `TaskAgentDirectory.markSettledByTaskAgentRunId(...)`
- `TaskAgentDirectory.resolveTaskAgentRunId(...)`

The focused command reproduced the failure path with real LM Studio + real Codex:

```bash
RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 RUN_MIXED_TASK_DELEGATION_E2E=1 \
LMSTUDIO_TARGET_TEXT_MODEL=qwen3.6-35b-a3b \
AUTOBYTEUS_STREAM_PARSER=api_tool_call \
CODEX_APP_SERVER_APPROVAL_POLICY=untrusted \
pnpm -C autobyteus-server-ts exec vitest run \
  tests/e2e/runtime/mixed-task-delegation.e2e.test.ts \
  --pool=forks --fileParallelism=false
```

## Evidence Observed

The debug reproduction showed the expected activation path first:

```text
[R7_DEBUG] directory registerStarting teamRunId=team_mixed-task-delegation-team-dfd2b4d1-ce33_0c87ba52 taskId=task_0001 runId=team_mixed-task-delegation-team-dfd2b4d1-ce33_0c87ba52__worker__task_0001
[R7_DEBUG] directory markActive teamRunId=team_mixed-task-delegation-team-dfd2b4d1-ce33_0c87ba52 taskId=task_0001 runId=team_mixed-task-delegation-team-dfd2b4d1-ce33_0c87ba52__worker__task_0001
```

After the worker's first completion report was delivered to the coordinator, the coordinator's automatic turn executed `accept_task` before the test sent its explicit revision instruction:

```text
[R7_DEBUG] acceptTask called teamRunId=team_mixed-task-delegation-team-dfd2b4d1-ce33_0c87ba52 caller=coordinator/coordinator_00350054df93c61a taskId=task_0001
[R7_DEBUG] acceptTask accepted taskId=task_0001 target=team_mixed-task-delegation-team-dfd2b4d1-ce33_0c87ba52__worker__task_0001
[R7_DEBUG] directory markSettledByTaskId teamRunId=team_mixed-task-delegation-team-dfd2b4d1-ce33_0c87ba52 taskId=task_0001 runId=team_mixed-task-delegation-team-dfd2b4d1-ce33_0c87ba52__worker__task_0001
```

A later settlement call saw the directory entry already removed and retained the settled tombstone:

```text
[R7_DEBUG] directory markSettledByRunId missingEntry teamRunId=team_mixed-task-delegation-team-dfd2b4d1-ce33_0c87ba52 runId=team_mixed-task-delegation-team-dfd2b4d1-ce33_0c87ba52__worker__task_0001
```

When the test then sent the explicit revision instruction, exact-run resolution rejected because the run id had already been validly tombstoned by `accept_task`:

```text
[R7_DEBUG] directory resolve settled teamRunId=team_mixed-task-delegation-team-dfd2b4d1-ce33_0c87ba52 runId=team_mixed-task-delegation-team-dfd2b4d1-ce33_0c87ba52__worker__task_0001
```

## Classification

I do **not** classify Round 7 as a local implementation defect.

The task-agent run was not forgotten or tombstoned before valid acceptance. It was tombstoned after a valid `accept_task` call by the original delegator (`coordinator`) in the automatic coordinator turn triggered by the task-agent's completion report.

That behavior matches the Round 14 lifecycle invariant:

```text
valid accept_task(task_id) -> accepted task -> task-agent run id tombstoned -> later exact-run sends reject before projection
```

The remaining failure is caused by live model/tool-choice behavior in the E2E setup:

- The coordinator member is configured with `autoExecuteTools: true`.
- The coordinator LLM config includes `tool_choice: "required"`.
- After receiving the task-agent completion message, the coordinator has a normal automatic turn and the provider/model selected `accept_task` despite the E2E prompt instruction to wait for explicit user instruction.

Under Round 14, this is prompt/model/test instability or validation setup behavior unless a framework invariant is violated. The observed framework behavior is the expected post-acceptance rejection path.

## Design Impact Assessment

No new Design Impact was found.

Round 14 already considered and rejected framework/provider `tool_choice` dampening or task-specific runtime request shaping for this ticket. If the product now wants to prevent `accept_task` during inter-agent-origin coordinator turns, that would be a new design change because it would alter the Round 14 configured-tool boundary and nested task-agent acceptance semantics.

## Implementation State

No source changes were retained from this investigation.

The local source remains aligned with Round 14:

- no `AgentTurnInputContext`;
- no provider `tool_choice` dampening;
- no task-specific LLM request policy;
- `accept_task` remains a configured tool and valid original-delegator calls tombstone/schedule settlement;
- post-accept exact-run sends reject before Team Communication projection.

## Recommended Next Owner

API/E2E should reclassify this Round 7 result and adjust validation setup/prompting if the intended test path requires revision feedback before acceptance. A full matrix should not be blocked on a claimed framework invariant failure unless evidence shows the target became unreachable without a valid `accept_task` or team termination.
