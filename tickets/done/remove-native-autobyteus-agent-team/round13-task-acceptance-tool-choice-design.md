# Superseded by Round 14

This Round 13 proposal is superseded by `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/round14-task-tool-configuration-boundary-design.md`. Do not implement the runtime `tool_choice` dampening direction in this ticket.

# Round 13 Design-Impact Rework: Non-Forcible Task Acceptance

## Context

This addendum responds to the Round 12 design-impact note:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/round12-design-impact-task-agent-auto-acceptance.md`

API/E2E Round 6 showed that the focused mixed task-delegation scenario passed, but the full live matrix failed after a task-agent completion report reached the coordinator. The coordinator then executed one tool during that inter-agent completion-report turn before the E2E sent the explicit revision instruction. Later, `send_message_to(target_agent_run_id=...)` failed because the task-agent exact run was already no longer reachable. Given current code, the normal route to that state is `accept_task` settling the task.

This is a design-impact issue because it crosses these concerns:

- task-agent reachability until terminal acceptance;
- `accept_task` as the only terminal task transition;
- runtime/model tool selection;
- provider-native `tool_choice: required` configured for an AutoByteus member;
- `autoExecuteTools=true`, which executes tool calls once the model/runtime has selected them.

## Current Implementation Findings

| Source | Finding | Design implication |
| --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | `acceptTask(...)` validates active team/context and original delegator, then calls `ledger.acceptTask(...)`, `taskAgentDirectory.markSettledByTaskId(...)`, publishes status, and requests settlement. | `TaskDelegationService` is the correct terminal mutation owner. Settled-run rejection should not be bypassed to mask premature acceptance. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-agent-directory.ts` | Active task-agent run ids resolve only while an active directory entry exists and the run id is not in the settled tombstone set. | Exact-run reachability invariant is already the right shape: reachable until valid acceptance/settlement, rejected after settlement. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-settlement-coordinator.ts` | Settlement is requested after acceptance and idle/offline gates. | Settlement is not the root design problem; premature acceptance is. |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-manifest.ts` | `accept_task` is exposed as the original-delegator terminal action. | The tool remains in the simplified lifecycle; do not reintroduce result/revision tools. |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Coordinator uses AutoByteus runtime with `autoExecuteTools=true` and `llmConfig.tool_choice="required"`. Test prompt says not to auto-accept completion reports and to wait for explicit user JSON. | The framework must not let provider-native required tool choice force a terminal task acceptance on an inter-agent report turn. |
| `autobyteus-ts/src/llm/api/openai-compatible-request-builder.ts` | `config.extraParams` are copied into provider params before `kwargs.tool_choice` can override them. | The AutoByteus LLM phase can override `tool_choice: required` by explicitly passing a safer `kwargs.tool_choice`, but currently no turn policy does so. |
| `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts` | The pipeline returns `sourceEvent`, but no durable current-turn input origin is stored for later LLM/tool policy. | Add a first-class current-turn input context so tool-choice policy can distinguish external user turns from inter-agent report turns. |
| Codex/Claude task-delegation tool builders | Handlers call the shared manifest/service with a static `TaskDelegationToolContext`; they do not currently use turn input origin. | Runtime-specific exposure can stay thin; correctness stays in the shared task service plus runtime tool-choice policy where provider forcing exists. |

## Design Health Assessment

- Change posture: Design-impact bug fix inside the larger refactor/cleanup ticket.
- Root cause classification: Missing invariant + runtime/tool-selection coordination issue.
- Refactor needed now: Yes, but keep it narrow and spine-led.
- Why not local-only: Allowing settled task-agent run ids to accept messages would break the Round 5/Round 8 exact-run reachability contract. Blocking every inter-agent-origin `accept_task` would break legitimate autonomous parent review and nested task-agent delegation. The correct design is to make terminal acceptance non-forcible while preserving valid original-delegator acceptance.

## Authoritative Decisions

1. **Keep the simplified task lifecycle.** The lifecycle remains `not_started -> active -> accepted`; do not reintroduce `awaiting_acceptance`, `revision_requested`, `mark_task_completed`, or `mark_task_failed`.
2. **Keep `accept_task` as the only terminal task action.** It remains owned by `TaskDelegationService` and remains callable only by the original delegator for an active task, including a task-agent delegator for nested tasks.
3. **Do not add a blanket input-origin hard block.** A parent/delegator agent may legitimately accept after reviewing a task-agent report. Blocking all inter-agent-origin acceptance would make autonomous top-level delegation and nested task-agent delegation inconsistent with the simplified model.
4. **Make `accept_task` terminal and non-forcible.** Provider-native forced tool-choice settings such as `tool_choice: "required"` must not force `accept_task` on inter-agent/system/unknown turns. `accept_task` may still be voluntarily chosen by the original delegator when the model decides the report is satisfactory.
5. **`autoExecuteTools` is not acceptance intent.** `autoExecuteTools=true` only executes a chosen tool without human approval. It must not be treated as permission to make provider-native tool-choice forcing terminal.
6. **No grace window.** A task-agent remains exact-run reachable until a valid `accept_task` is executed or the team terminates. After valid acceptance, exact-run feedback must reject. There is no timer-based or revision-state-based feedback window.
7. **If a model deliberately accepts, that is terminal.** If the original delegator voluntarily calls `accept_task` despite a prompt asking it not to, the framework should settle the task; later feedback to that run id correctly rejects. The framework bug is forced/accidental terminal acceptance caused by runtime tool-choice policy, not the settled-run rejection itself.

## Use Cases And Data-Flow Spine Inventory

| Spine ID | Use Case | Spine Type | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| R13-DS-001 | Delegate a task and start a task-agent | Primary End-to-End | Original delegator calls `delegate_tasks` | Active task-agent run id is returned and directory entry is active | `TaskDelegationService` + `TaskDelegationActivationCoordinator` | Establishes the concrete exact-run subject that can receive feedback. |
| R13-DS-002 | Task-agent sends progress/completion/blocker report | Primary End-to-End | Task-agent calls `send_message_to` | Delegator receives committed Team Communication/member input | `TeamMemberDeliveryCoordinator` | Reports remain ordinary team communication, not task lifecycle transitions. |
| R13-DS-003 | Completion report triggers delegator turn without explicit acceptance | Primary End-to-End | Inter-agent delivery input enters delegator runtime | No provider-forced `accept_task`; task-agent remains active unless model voluntarily accepts | `AgentTurnInputContext` + runtime managed tool-choice policy | Prevents required tool choice from causing terminal settlement. |
| R13-DS-004 | Delegator sends revision feedback to active task-agent | Primary End-to-End | `send_message_to(target_agent_run_id=<task-agent>)` | Same concrete task-agent receives input and projection commits | `TeamMessageRecipientResolver` + `TaskAgentDirectory` | Proves completed-but-unaccepted task-agent run ids remain feedback-addressable. |
| R13-DS-005 | Original delegator accepts after satisfactory report | Primary End-to-End | Original delegator calls `accept_task(task_id)` | Ledger accepted, directory tombstoned, settlement requested | `TaskDelegationService` | The only terminal state mutation remains centralized. |
| R13-DS-006 | Nested task-agent delegates and accepts child task | Primary End-to-End | Parent task-agent calls `delegate_tasks` for child | Child task-agent can report back and parent task-agent can accept | `TaskDelegationService` + task-agent identity validation | Avoids breaking nested autonomous task decomposition. |
| R13-DS-007 | Provider-native `tool_choice: required` on non-external turn | Bounded Runtime Policy | LLM request assembly sees current turn origin + exposed non-forcible tool | Provider request uses `tool_choice: auto`/omits required forcing | AutoByteus `LlmPhase` managed tool policy | Stops forced terminal tool calls while preserving ordinary tool availability. |
| R13-DS-008 | Settled or unknown exact-run feedback | Primary End-to-End | `send_message_to(target_agent_run_id=...)` after acceptance or outside boundary | Rejected tool result, no committed projection | `TeamMessageRecipientResolver` | Maintains Round 5/Round 8 exact-run safety. |

## Data-Flow Spines

### R13-DS-001 — delegation and task-agent activation

```text
external/user or agent turn
  -> delegate_tasks(tasks=[...])
  -> TaskDelegationToolService resolves TeamRun
  -> TaskDelegationService.delegateTasks
  -> TaskDelegationLedger creates not_started record
  -> TaskDelegationActivationCoordinator builds taskAgentRunId
  -> TaskAgentDirectory.registerStartingTask
  -> TeamRun.startTaskAgentInstance
  -> MixedTeamManager.startTaskAgentInstance
  -> MixedTeamMemberRegistry starts concrete task-agent AgentRun
  -> TaskDelegationLedger.markActive + TaskAgentDirectory.markActive
  -> delegate_tasks result exposes task_id + target_agent_run_id
```

Key invariant: the task-agent exact run is reachable only after successful start/active marking.

### R13-DS-002 — task-agent report through ordinary communication

```text
task-agent AgentRun
  -> send_message_to(recipient_name=<delegator> OR target_agent_run_id=<parent task-agent>)
  -> shared parser/validator
  -> unresolved delivery intent
  -> TeamRun.deliverInterAgentMessage
  -> MixedTeamManager / TeamMemberDeliveryCoordinator
  -> TeamMessageRecipientResolver resolves logical or exact reachable target
  -> delegator AgentRun.postUserMessage(buildInterAgentDeliveryInputMessage)
  -> committed COMMUNICATION + MEMBER_INPUT projection
```

Key invariant: reports do not mutate the task ledger. They are communication only.

### R13-DS-003 — completion report should not force terminal acceptance

```text
committed task-agent completion report
  -> delegator AgentInputUserMessage(senderType=AGENT, metadata.input_origin=inter_agent_delivery)
  -> AgentTurnInputContext(origin=inter_agent_delivery) is attached to the active turn
  -> LlmPhase resolves exposed tools including accept_task
  -> ManagedTurnToolPolicy sees accept_task as terminal/non-forcible
  -> if provider config says tool_choice=required, LlmPhase overrides to auto/omits required for this non-external turn
  -> model may produce text, call send_message_to, or voluntarily call accept_task
  -> absent a valid accept_task execution, TaskAgentDirectory remains active
```

This is the core Round 13 correction. Input origin is used to control runtime forcing, not to prohibit all parent acceptance.

### R13-DS-004 — revision feedback to the same concrete task-agent

```text
external/user instruction or delegator model decision
  -> send_message_to(target_agent_run_id=<active task-agent run id>)
  -> parser validates exact-one target selector
  -> unresolved delivery intent enters TeamRun boundary
  -> TeamMessageRecipientResolver.resolveByTargetAgentRunId
  -> TaskAgentDirectory.resolveTaskAgentRunId returns active entry
  -> MixedTeamMemberRegistry.deliverInterAgentMessageToTaskAgent
  -> concrete task-agent AgentRun.postUserMessage
  -> committed Team Communication/member input projection
```

Key invariant: a completion report does not remove the directory entry. Only valid acceptance/team termination does.

### R13-DS-005 — valid acceptance and settlement

```text
original delegator AgentRun
  -> accept_task(task_id)
  -> TaskDelegationToolService resolves TeamRun
  -> TaskDelegationService.acceptTask
  -> assertOriginalDelegator + assert active ledger record
  -> TaskDelegationLedger.acceptTask(status=accepted)
  -> TaskAgentDirectory.markSettledByTaskId(tombstone target_agent_run_id)
  -> TaskDelegationEventPublisher publishes accepted status
  -> TaskDelegationSettlementCoordinator.requestSettlement
  -> MixedTeamManager.settleTaskAgentInstance after idle/offline gates
```

Key invariant: after this spine completes, future `send_message_to(target_agent_run_id=<settled run>)` rejects before projection.

### R13-DS-006 — nested task-agent acceptance remains valid

```text
parent task-agent AgentRun
  -> delegate_tasks(child work)
  -> child task-agent starts with delegator identity containing parent taskAgentRunId
  -> child reports via send_message_to(target_agent_run_id=<parent task-agent run id>)
  -> parent task-agent receives inter-agent delivery turn
  -> provider required tool choice is still not forced, but accept_task remains exposed/available
  -> parent task-agent voluntarily calls accept_task(child_task_id)
  -> TaskDelegationService.assertTaskAgentDelegatorIdentity validates exact parent task-agent identity
  -> child task ledger accepted and child task-agent settles
```

The design intentionally avoids an origin-only `accept_task` denial because this nested path is a valid in-scope behavior.

### R13-DS-007 — provider-native required tool-choice policy

```text
AgentInputUserMessage for a new turn
  -> AgentTurnInputContextExtractor derives origin
  -> active AgentTurn stores first-input context; tool continuations inherit it
  -> LlmPhase builds tool schemas
  -> ManagedTurnToolPolicy receives {origin, toolNames, nonForcibleToolNames, configured tool_choice}
  -> if origin is not external_user and a non-forcible terminal tool is exposed, required forcing is downgraded to auto/omitted
  -> OpenAICompatibleRequestBuilder applies kwargs.tool_choice after config.extraParams, so policy override wins
```

For external/user-origin turns, forced tool choice may remain useful, e.g. tests or product flows that explicitly ask for `delegate_tasks`, `send_message_to`, or `accept_task` with exact JSON.

## Target Data Structures

### Generic turn input context

Place in the runtime package because it is a generic agent-runtime concern, not a team-specific concern.

```ts
type AgentTurnInputOrigin =
  | "external_user"
  | "inter_agent_delivery"
  | "system"
  | "unknown";

type AgentTurnInputContext = {
  origin: AgentTurnInputOrigin;
  senderType: SenderType;
  messageId: string | null;
  teamRunId: string | null;
  senderAgentRunId: string | null;
  senderAgentName: string | null;
  parentCommunicationMessageId: string | null;
  metadata: Record<string, unknown>;
};
```

Derivation rules:

- `metadata.input_origin === "inter_agent_delivery"` or `senderType === SenderType.AGENT` => `inter_agent_delivery`.
- `senderType === SenderType.USER` => `external_user`.
- `senderType === SenderType.SYSTEM` => `system`.
- Missing or unrecognized data => `unknown`.
- Tool continuations do not replace this context; they inherit the first input context for the active turn.

### Managed tool-choice policy

The runtime package should keep this generic. Server-owned team tools provide policy data through `AgentConfig.initialCustomData` / runtime context rather than making `autobyteus-ts` import server tool constants.

Example shape:

```ts
type ManagedTurnToolPolicy = {
  nonForcibleToolNames: string[]; // server sets ["accept_task"] for managed team runs when configured
};
```

Policy rule:

```text
If configured tool_choice is "required", current turn origin is not external_user, and any exposed tool name is in nonForcibleToolNames, override provider tool_choice to "auto" or omit required forcing.
```

Conservative fallback: if the origin is `unknown` and a non-forcible terminal tool is exposed, do not preserve `tool_choice: "required"`.

## Ownership And Boundary Model

| Node / Owner | Owns | Must Not Own |
| --- | --- | --- |
| `AgentTurnInputContextExtractor` / `AgentTurn` | Current turn input origin and source metadata for runtime policy | Team routing, task ledger transitions |
| Runtime managed tool-choice policy | Provider request forcing semantics for non-forcible tools | Task acceptance authorization or ledger mutation |
| Server AutoByteus backend factory | Declares `accept_task` as non-forcible in managed team runs; does not hard-code provider params in task service | LLM stream internals |
| `TaskDelegationService` | Original-delegator authorization, active-task validation, terminal ledger/directory mutation | Provider-native tool selection, prompt compliance judgment |
| `TaskAgentDirectory` | Active/recoverable vs settled exact-run reachability | Acceptance decision, report content interpretation |
| `TeamMemberDeliveryCoordinator` | Committed delivery and target resolution | Task terminal state mutation |
| Runtime adapters (Codex/Claude/AutoByteus tools) | Schema/handler exposure and shared parser/service invocation | Independent task acceptance policy or direct directory mutation |

## File Responsibility Changes

| Path | Target responsibility |
| --- | --- |
| `autobyteus-ts/src/agent/turn-input-context.ts` (new) | Define `AgentTurnInputContext`, `AgentTurnInputOrigin`, and extraction from `AgentInputUserMessage`. |
| `autobyteus-ts/src/agent/agent-turn.ts` | Store immutable first-input context for the active turn. |
| `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts` | Populate first-input context on new turns; preserve it across tool continuations. |
| `autobyteus-ts/src/agent/loop/llm-phase-tool-policy.ts` (new) | Generic non-forcible tool-choice override/dampening before provider request assembly. |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | Apply the managed tool-choice policy when building `streamKwargs`; ensure `kwargs.tool_choice` can override `LLMConfig.extraParams.tool_choice`. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Add managed team tool policy metadata, marking `accept_task` as non-forcible when server-owned task-delegation tools are exposed. |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-service.ts` | Continue routing to `TaskDelegationService`; optionally pass/log turn input context if available, but do not move terminal policy out of `TaskDelegationService`. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Keep original-delegator and active-task validation as the authoritative terminal mutation guard. Do not add an origin-only hard denial. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-context.ts` and `.../claude/...` | Mirror current-turn input context if future provider-specific forcing/availability policy needs it; maintain thin runtime adapters. |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Assert completion report does not settle before explicit accept; revision exact-run feedback succeeds before accept and rejects after accept. |

## Dependency Rules

Allowed:

- Runtime package derives generic turn input origin from `AgentInputUserMessage`.
- Runtime package reads generic managed tool policy metadata from agent config/custom data.
- Server-owned backend factory declares server-owned `accept_task` as non-forcible for managed team AutoByteus runs.
- `TaskDelegationService` remains the only owner that transitions task records to `accepted` and tombstones task-agent run ids.

Forbidden:

- Allowing settled task-agent run ids to receive feedback to hide premature acceptance.
- Adding `awaiting_acceptance` or revision states back into the ledger.
- Blocking all inter-agent-origin `accept_task` calls.
- Letting runtime adapters mutate task settlement directly.
- Letting `autoExecuteTools` or provider `tool_choice: required` bypass task acceptance identity/lifecycle validation.
- Making `autobyteus-ts` import server task-delegation constants just to identify `accept_task`; use generic policy metadata from server instead.

## Validation Plan

1. Unit tests for turn input context extraction:
   - external user message => `external_user`;
   - server-delivered team message metadata => `inter_agent_delivery`;
   - system task packet => `system`;
   - tool continuations inherit the original turn context.
2. AutoByteus LLM request/tool-policy tests:
   - external user turn with `tool_choice: required` preserves required forcing;
   - inter-agent/system/unknown turn with `accept_task` marked non-forcible downgrades/omits required forcing;
   - `kwargs.tool_choice` policy override wins over `LLMConfig.extraParams.tool_choice`.
3. Task delegation service tests:
   - top-level original delegator can accept active task;
   - non-original caller rejects;
   - task-agent delegator can accept its child task;
   - acceptance tombstones the task-agent run id.
4. Mixed task delegation E2E:
   - after task-agent completion report, no premature task settlement occurs before explicit accept;
   - revision feedback to `target_agent_run_id` commits while task is active;
   - explicit `accept_task` settles the task;
   - post-accept exact-run feedback rejects before projection.
5. Regression/source checks:
   - no result tools (`mark_task_completed`, `mark_task_failed`) are reintroduced;
   - no delivery code bypasses `TeamMessageRecipientResolver`;
   - no task acceptance code bypasses `TaskDelegationService`.

## Expected Outcome

The architecture stays simpler than the rejected revision-state design:

```text
delegate_tasks
  -> active task-agent
  -> ordinary send_message_to reports/feedback
  -> original-delegator accept_task
  -> settlement
```

The new design adds only one missing runtime invariant: terminal task acceptance is non-forcible. That fixes the Round 12 failure class without weakening exact-run settled-state rejection and without breaking nested task-agent acceptance.
