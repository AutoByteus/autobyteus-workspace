# Round 14 Clarification Note (2026-06-08)

Round 14 supersedes the Round 13 tool-choice-policy proposal. Keep the simplified `delegate_tasks` + ordinary `send_message_to` + `accept_task` lifecycle, but do not implement runtime/provider `tool_choice` dampening in this ticket. `delegate_tasks` and `accept_task` are normal configured tools, and correctness is enforced by task-delegation invariants. See `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/round14-task-tool-configuration-boundary-design.md`.

# Round 8 Clarification Note (2026-06-08)

Round 8 enforces this Round 5 design by requiring runtime adapters/builders to submit an unresolved delivery intent only. `recipient_name` and `target_agent_run_id` resolution must happen exclusively inside `TeamMessageRecipientResolver` / `TeamMemberDeliveryCoordinator`; no pre-resolved `recipient` endpoint may be carried above the mixed delivery boundary. See:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/round8-delivery-intent-boundary-design.md`

---

# Round 5 Design: `send_message_to` Addressing And Roster Cleanup

## Status

Design addendum drafted on 2026-06-08 after the user stopped implementation to correct the architecture before continuing.

This document supersedes the model-facing dynamic task-agent alias direction from `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/round4-simplified-task-agent-communication-design.md` where it proposed `recipient_name="worker/task_0001"` as the main task-agent selector.

The revised direction keeps the simplified task-agent lifecycle, but changes the communication interface to a general exact-run addressing model.

## Decision Summary

`send_message_to` becomes a general team-message delivery tool with exactly one target selector:

```ts
send_message_to({
  recipient_name?: string;       // logical/name mode
  target_agent_run_id?: string;  // exact concrete run mode
  content: string;
  message_type?: string;
  reference_files?: string[];
})
```

Validation rule:

```text
Exactly one of recipient_name or target_agent_run_id must be provided.
```

Meaning:

```text
recipient_name
  -> send to logical/reachable team recipient by roster name

target_agent_run_id
  -> send to an exact active/reachable AgentRun in the team communication boundary
```

This is not task-specific. A task-agent run is only one example of an exact concrete agent run.

## Why This Is Cleaner Than Task-Agent Aliases

The previous simplified task-agent design correctly removed worker result tools, but still made task-agent addressing special by inventing dynamic aliases such as `worker/task_0001`.

The cleaner architecture is to recognize two real business addressing modes:

| Addressing mode | Business meaning | Example |
| --- | --- | --- |
| Logical recipient | “Send to the teammate represented by this name.” | `recipient_name: "worker"` |
| Exact run | “Send to this concrete agent run.” | `target_agent_run_id: "team_x__worker__task_0001"` |

This avoids encoding run identity inside a fake name. It also supports future exact-run communication that is not task-specific.

## Current-State Evidence

Current/partial implementation after Round 4 design work shows why the design must be corrected now:

- `send-message-to-tool-contract.ts` currently describes `recipient_name` as either a team member name or dynamic task-agent alias.
- `send-message-to-parameter-schema.ts` currently makes `recipient_name` required and does not expose `target_agent_run_id`.
- `send-message-to-tool-argument-parser.ts` currently validates that `recipient_name` is non-empty.
- `inter-agent-message-delivery-request-builder.ts` now falls back to a dynamic recipient participant when a name is not in the static roster.
- `TeamMemberDeliveryCoordinator` currently resolves task-agent delivery by `requestedRecipientName` through `TaskAgentDirectory.resolveRecipientName`.
- `TaskAgentDirectory` currently stores both `taskAgentRecipientName` and `taskAgentRunId`; `resolveTaskAgentRunId` already exists, proving exact run resolution is a natural server-side operation.
- `member-team-roster-manifest.ts` still renders instructions as if `recipient_name` is the only allowed selector.

Therefore the Round 5 refactor should remove model-facing dynamic aliases and make exact run ID a first-class target selector.

## Task Design Health Assessment

- Change posture: Refactor / architecture correction before implementation continues.
- Current design issue found: Yes.
- Root cause classification: Shared structure looseness; boundary or ownership issue; duplicated policy/coordination risk; legacy/compatibility pressure if aliases and exact IDs both remain.
- Refactor needed now: Yes.
- Evidence: The partial dynamic-alias design hides exact runtime identity inside `recipient_name`, while the current domain already has concrete `AgentRun` identities and a task-agent directory capable of resolving run ids.
- Design response: introduce an explicit `TeamMessageTargetSelector` shape with XOR name/run-id modes; move all target resolution to a single `TeamMessageRecipientResolver` / `TeamMemberDeliveryCoordinator` path; update roster instructions to teach both modes.

## Round 5 Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| R5-DS-001 | Primary End-to-End | `send_message_to(recipient_name)` | logical member/subteam recipient receives input and committed projection | `TeamMemberDeliveryCoordinator` | Normal team messaging by name remains simple. |
| R5-DS-002 | Primary End-to-End | `send_message_to(target_agent_run_id)` | exact reachable AgentRun receives input and committed projection | `TeamMemberDeliveryCoordinator` + exact-run resolver | Exact run messaging becomes general, not task-specific. |
| R5-DS-003 | Primary End-to-End | invalid/ambiguous/missing target selector | rejected tool result and no committed Team Communication projection | shared parser/validator + delivery coordinator | Preserves truthful delivery semantics. |
| R5-DS-004 | Primary End-to-End | `delegate_tasks` starts task-agent | delegator receives task id and task-agent `target_agent_run_id` | `TaskDelegationService` + `TaskAgentDirectory` | Parent can message any active task-agent by exact run id. |
| R5-DS-005 | Primary End-to-End | task-agent sends report to delegator by target run id or name | delegator receives committed input | `TeamMemberDeliveryCoordinator` | Task reports are ordinary messages using one of the two target modes. |
| R5-DS-006 | Primary End-to-End | parent sends feedback to task-agent `target_agent_run_id` | same concrete task-agent run receives feedback | `TeamMemberDeliveryCoordinator` + `TaskAgentDirectory` | Revision/follow-up no longer needs aliases or special task fields. |
| R5-DS-007 | Return/Event | accepted delivery receipt | websocket/history projection with target selector metadata | `MixedTeamManager` + projection services | UI/history shows whether delivery used name mode or exact-run mode. |
| R5-DS-008 | Bounded Local | member prompt/roster construction | model sees clear address-book instructions | `MemberRunInstructionComposer` + roster manifest builder | Prevents model confusion around when to use name vs run id. |
| R5-DS-009 | Primary End-to-End | same-runtime Codex/Claude exact-run delivery | correct provider session/thread receives input | provider cohort coordinator + delivery coordinator | Exact run addressing must compose with same-runtime provider cohorts. |

## Primary Spines

### R5-DS-001 — logical recipient-name delivery

```text
Agent tool call send_message_to(recipient_name="worker")
  -> runtime adapter
  -> parseSendMessageToToolArguments
  -> TeamMessageTargetSelector(kind="recipient_name")
  -> TeamRun.deliverInterAgentMessage / deliverTeamMessage
  -> TeamMemberDeliveryCoordinator
  -> TeamMessageRecipientResolver.resolveByRecipientName(MemberTeamContext roster)
  -> MixedTeamMemberRegistry.getOrCreate(logical member/subteam)
  -> target AgentRun.postUserMessage
  -> delivery receipt
  -> committed COMMUNICATION + MEMBER_INPUT events
```

Key invariant: `recipient_name` is a logical address from the roster. It does not encode task ids or run ids.

### R5-DS-002 — exact target-agent-run delivery

```text
Agent tool call send_message_to(target_agent_run_id="team_x__worker__task_0001")
  -> runtime adapter
  -> parseSendMessageToToolArguments
  -> TeamMessageTargetSelector(kind="target_agent_run_id")
  -> TeamRun.deliverInterAgentMessage / deliverTeamMessage
  -> TeamMemberDeliveryCoordinator
  -> TeamMessageRecipientResolver.resolveByTargetAgentRunId(current team boundary)
  -> if normal member run: MixedTeamMemberRegistry resolves member handle
  -> if task-agent run: TaskAgentDirectory resolves logical member + task metadata, then registry resolves task-agent handle
  -> exact AgentRun.postUserMessage
  -> delivery receipt
  -> committed COMMUNICATION + MEMBER_INPUT events
```

Key invariant: `target_agent_run_id` may target only active/recoverable runs reachable from the sender's current team communication boundary. It is not a global arbitrary AgentRun escape hatch.

### R5-DS-003 — selector validation / rejection

```text
send_message_to tool args
  -> parser reads recipient_name? and target_agent_run_id?
  -> validator enforces XOR target selector
  -> resolver validates target belongs to current/reachable team boundary
  -> if invalid: rejected tool result
  -> no canonical Team Communication projection
```

Invalid examples:

```json
{ "content": "missing target" }
{ "recipient_name": "worker", "target_agent_run_id": "run_1", "content": "ambiguous" }
{ "target_agent_run_id": "external_run_not_in_team", "content": "not allowed" }
{ "target_agent_run_id": "settled_task_agent_run", "content": "too late" }
```

### R5-DS-004 — task delegation exposes exact run target

```text
delegator delegate_tasks
  -> TaskDelegationService
  -> TaskAgentDirectory.registerStartingTask(taskId, taskAgentRunId)
  -> MixedTeamManager.startTaskAgentInstance
  -> task-agent accepts work packet
  -> TaskAgentDirectory.markActive
  -> delegate_tasks result + TASK_DELEGATION_ACTIVATED event include:
       task_id
       target_agent_run_id = taskAgentRunId
       logical member name/route
```

Key invariant: the parent/delegator can message any active task-agent by `target_agent_run_id` without needing `recipient_name`.

### R5-DS-005 — task-agent reports to delegator

```text
task-agent work packet contains delegator reply address:
  - recipient_name if parent is a logical roster recipient, or
  - target_agent_run_id if parent is itself a concrete task-agent run

task-agent send_message_to(exactly one selector, content=<report>)
  -> normal delivery spine
  -> delegator receives progress/completion/blocker report
```

Key invariant: nested tasks do not need special cases. If the delegator is a task-agent, the child uses the parent task-agent's `target_agent_run_id`.

### R5-DS-006 — parent feedback to task-agent

```text
parent send_message_to(target_agent_run_id=<child task-agent run>, content=<feedback>)
  -> exact-run resolver
  -> TaskAgentDirectory verifies active task-agent run
  -> same concrete task-agent receives feedback
  -> committed projection
```

Key invariant: revision/follow-up is exact-run messaging, not a special task lifecycle state.

### R5-DS-007 — return/event projection

```text
target AgentRun accepts input
  -> delivery receipt includes target selector kind + resolved participant/run
  -> MixedTeamManager publishes COMMUNICATION
  -> MixedTeamManager publishes MEMBER_INPUT
  -> websocket/run-history projection includes sender/receiver run ids, task metadata when present, and selector mode
```

Key invariant: projection remains committed delivery. Selector metadata is descriptive for UI/history; it is not a second routing path.

### R5-DS-008 — roster/address-book prompt construction

```text
MemberTeamContext
  -> MemberRunInstructionComposer
  -> Team message address-book manifest
  -> runtime prompt/tool instruction
```

Prompt shape should say:

```text
When using send_message_to, choose exactly one target selector:
1. recipient_name: use one exact name from the roster when you want the logical teammate and no exact run id is needed.
2. target_agent_run_id: use an exact run id when a task packet, task event, or prior message gives one and you need that concrete agent run.
Do not provide both.
```

Roster still lists recipient names, but no longer implies that `recipient_name` is mandatory for all messages.

## Target Domain / Interface Shapes

### Tool input

```ts
type SendMessageToToolArguments = {
  recipientName: string | null;
  targetAgentRunId: string | null;
  content: string | null;
  messageType: string;
  referenceFiles: string[];
};
```

### Target selector

```ts
type TeamMessageTargetSelector =
  | { kind: "recipient_name"; recipientName: string }
  | { kind: "target_agent_run_id"; targetAgentRunId: string };
```

### Delivery intent

Runtime adapters should build a delivery intent, not a pre-resolved recipient endpoint:

```ts
type TeamMessageDeliveryIntent = {
  teamRunId: string;
  sender: InterAgentMessageParticipant;
  target: TeamMessageTargetSelector;
  content: string;
  messageType?: string | null;
  referenceFiles?: string[] | null;
};
```

Then the server delivery owner resolves the target:

```ts
type ResolvedTeamMessageTarget = {
  teamRunId: string;
  participant: InterAgentMessageParticipant;
  selector: TeamMemberSelector | null;
  targetKind: "logical_member" | "agent_run" | "task_agent_run";
  targetAgentRunId: string;
  logicalMemberRouteKey: string;
  taskId?: string | null;
};
```

## Roster / Address Book Design

The existing roster concept remains useful, but it should be reframed as an address book with two sections.

### Logical recipients section

Lists names that can be used as `recipient_name`:

```text
Recipient names you can use with recipient_name:
- coordinator
- worker
- reviewer
```

### Exact-run rule section

Does not need to list every normal member run id by default. Instead it explains the rule:

```text
If a task packet, task event, or prior message gives you a target_agent_run_id, you may send directly to that exact active run by setting target_agent_run_id instead of recipient_name.
Use target_agent_run_id for concrete task-agent runs or other exact run replies.
```

### Dynamic task/task-agent messages

Task packets and task events must provide exact run ids where needed:

```text
Task ID: task_0001
Task-agent target_agent_run_id: team_x__worker__task_0001
Delegator reply recipient_name: coordinator
```

If the delegator is a task-agent:

```text
Delegator reply target_agent_run_id: team_x__coordinator__task_0000
```

### Why not list all run ids in the static roster?

- For ordinary members, `recipient_name` is shorter and more stable.
- Exact run ids are long and should be used only when exact-run targeting matters.
- Task-agent run ids are created after bootstrap, so they must arrive through task packets/events/messages, not only the initial roster.

## Ownership Map

| Owner | Owns | Must Not Own |
| --- | --- | --- |
| Runtime-specific send-message adapter | Provider/tool-call mechanics and passing parsed args into shared server delivery | Roster resolution, task-agent routing, exact-run reachability policy |
| `parseSendMessageToToolArguments` / validator | Field aliases, content/reference validation, XOR target selector validation | Team membership lookup or run reachability |
| `TeamMessageRecipientResolver` | Resolving `recipient_name` and `target_agent_run_id` inside the sender's reachable team boundary | Publishing projections or provider runtime sessions |
| `TeamMemberDeliveryCoordinator` | Recipient resolution orchestration, target input acceptance, delivery receipt and commit ordering | Provider-specific transport internals; task acceptance rules |
| `TaskAgentDirectory` | Active task-agent run lookup by `target_agent_run_id`, task metadata, active/settled state | Model-facing dynamic recipient aliases; general roster resolution |
| `TaskDelegationService` | `delegate_tasks`, `accept_task`, original-delegator validation, task lifecycle | Team message delivery content or projection |
| `MemberRunInstructionComposer` / roster manifest builder | Model-facing address-book instructions | Runtime routing decisions |
| Provider cohort coordinators | Same-runtime provider session/thread leases and event correlation | Team message target selector parsing |

## File Responsibility Changes

### Add

| Path | Responsibility |
| --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-message-target-selector.ts` | Tight selector union and XOR validation helpers for `recipient_name` / `target_agent_run_id`. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/delivery/team-message-recipient-resolver.ts` | Resolve logical names and exact target run ids inside the reachable team boundary. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/delivery/team-message-delivery-intent.ts` | Intent/receipt types if not colocated with existing delivery models. |

### Modify

| Path | Change |
| --- | --- |
| `send-message-to-tool-contract.ts` | Describe two exactly-one addressing modes; remove dynamic task-agent alias language. |
| `send-message-to-parameter-schema.ts` and Codex/Claude schema builders | Make `recipient_name` optional, add optional `target_agent_run_id`, explain XOR rule in descriptions. |
| `send-message-to-tool-argument-parser.ts` | Parse `target_agent_run_id` / `targetAgentRunId`; validate exactly one target selector. |
| `inter-agent-message-delivery-request-builder.ts` | Stop fabricating dynamic recipient participants from unknown names; build a delivery intent with a target selector. |
| `inter-agent-message-delivery.ts` | Add/adjust delivery request shape to carry `TeamMessageTargetSelector`; keep endpoint shapes for resolved targets. |
| `team-member-delivery-coordinator.ts` | Resolve target by selector using `TeamMessageRecipientResolver`; commit projection only after target accepts input. |
| `task-agent-directory.ts` | Resolve active task-agent by `taskAgentRunId`; remove model-facing `taskAgentRecipientName` requirement. |
| `task-agent-recipient-name.ts` | Remove, or demote to non-model-facing display helper only if still useful internally. Preferred target: remove. |
| `task-delegation-activation-coordinator.ts` / work packet renderer | Include task-agent `target_agent_run_id` and delegator reply selector; do not instruct dynamic alias use. |
| `member-team-roster-manifest.ts` | Render address-book instructions with recipient-name list plus target-agent-run-id rule. |
| `member-run-instruction-composer.ts` | Teach exactly-one target selector and simplified task-agent communication protocol. |
| Tests | Replace dynamic alias assertions with `target_agent_run_id` exact-run addressing assertions. |

### Remove / reject

| Item | Why |
| --- | --- |
| Model-facing `worker/task_0001` dynamic alias protocol | Hides exact run identity inside a fake name; less general than exact-run addressing. |
| Task-specific `task_agent_run_id` field | Replaced by general `target_agent_run_id`. |
| Accepting both `recipient_name` and `target_agent_run_id` | Ambiguous; violates XOR addressing and makes precedence rules unnecessary. |
| Falling back from unknown recipient names to fabricated participants | Lets invalid names travel too far; resolver should return a structured rejection before projection. |

## Dependency Rules

Allowed:

- Runtime adapters -> shared parser/validator -> delivery intent builder.
- `TeamMemberDeliveryCoordinator` -> `TeamMessageRecipientResolver` -> static roster / task-agent directory / member registry reachability.
- `TaskDelegationService` -> `TaskAgentDirectory` for exposing active task-agent `target_agent_run_id`.
- Provider cohorts -> runtime provider sessions/threads for exact resolved agent runs.

Forbidden:

- Runtime adapters directly using `AgentRunManager.getActiveRun(target_agent_run_id)` without team-boundary validation.
- `target_agent_run_id` resolving arbitrary global runs outside the current/reachable team communication boundary.
- `recipient_name` carrying slash-encoded task ids as the main model-facing task-agent selector.
- Having precedence behavior when both selectors are present. Both-present is a validation error.
- Publishing Team Communication before target input acceptance.

## Validation Plan

1. Parser/validator unit tests:
   - accepts `recipient_name` only;
   - accepts `target_agent_run_id` only;
   - rejects neither selector;
   - rejects both selectors;
   - validates content/reference files.
2. Schema tests for AutoByteus/Codex/Claude expose both optional fields and document exactly-one rule.
3. Roster/prompt tests show recipient-name list plus exact-run rule; no mandatory-recipient-only language.
4. Delivery resolver tests:
   - logical name resolves through static roster;
   - normal member exact run id resolves only if reachable;
   - active task-agent exact run id resolves through `TaskAgentDirectory`;
   - settled/unknown/external run id rejects before projection.
5. Task delegation tests:
   - `delegate_tasks` result/work packet exposes task-agent `target_agent_run_id`;
   - task-agent reports via `send_message_to` using parent selector;
   - parent sends feedback via `target_agent_run_id`;
   - `accept_task` settles and later exact-run send rejects.
6. Projection tests prove no canonical Team Communication projection on rejected exact-run target.
7. Same-runtime provider cohort tests prove exact-run delivery reaches the correct Codex/Claude session/thread.
8. Full live matrix with mixed task-agent send-message/acceptance scenario.

## Design Consequence For Round 4 Artifacts

Keep from Round 4:

- native AutoByteus team package removal;
- server-owned prompt/tool construction;
- simplified task-agent lifecycle (`not_started -> active -> accepted`);
- task-agent progress/completion/blocker via `send_message_to`;
- `delegate_tasks` + `accept_task` as only task-specific tools;
- committed-delivery coordinator;
- provider same-runtime cohorts.

Replace from Round 4:

- Replace dynamic task-agent recipient names (`worker/task_0001`) with `target_agent_run_id` exact-run addressing.
- Replace any model-facing `task_agent_run_id` task-specific field with general `target_agent_run_id`.
- Remove any fallback that treats unknown recipient names as possible dynamic aliases.
