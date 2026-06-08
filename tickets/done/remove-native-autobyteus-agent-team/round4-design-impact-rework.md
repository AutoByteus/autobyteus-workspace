# Supersession Note (2026-06-08)

The task-agent revision-state portions of this Round 4 rework are superseded by `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/round4-simplified-task-agent-communication-design.md`. Do not implement `TaskAgentRevisionCoordinator`, worker result-tool revision states, `mark_task_completed`, `mark_task_failed`, `awaiting_acceptance`, or `revision_requested` as the current target design.

The committed-delivery and provider same-runtime cohort analysis in this file remains useful background and is restated in the updated `design-spec.md`.

---

# Round 4 Design-Impact Rework: Team Delivery, Task-Agent Revision, And Same-Runtime Coordination

## Status

Design addendum drafted after API/E2E Round 4 failed with repeated live-runtime coordination symptoms.

This addendum supersedes the earlier assumption that the remaining failures are local adapter fixes. The original cleanup design is still correct for removing native `autobyteus-ts` team ownership, but the live matrix shows that the server-owned mixed-team path needs additional explicit owners for:

1. recipient delivery commit semantics,
2. concrete task-agent revision lifecycle, and
3. same-runtime provider transport/session coordination.

## Round 4 Evidence Summary

Authoritative evidence:

- API/E2E report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/api-e2e-validation-report.md`
- Full live matrix log: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/validation-logs/round4-live-e2e/full-real-runtime-matrix.log`
- Current delivery code: `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts`
- Current member registry / task-agent handle code: `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-team-member-registry.ts`
- Current Codex same-runtime transport code: `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts`, `codex-client-thread-router.ts`, `codex-app-server-client-manager.ts`
- Current Claude same-runtime session code: `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-manager.ts`, `claude-session.ts`

Observed Round 4 facts:

- All-AutoByteus, mixed AutoByteus+Codex, and nested mixed AutoByteus+Codex+Claude passed, so the server-owned prompt/tool cleanup is broadly viable.
- Mixed task-agent revision still failed: Team Communication projection was inserted for the concrete task-agent receiver, but no revised task-agent completion arrived.
- All-Codex same-runtime still failed 3/5. The `Reconnecting... 5/5` signature disappeared after using a shared team-member client policy, but Codex still failed to produce required teammate responses.
- All-Claude same-runtime regressed with long runtime timeouts and cleanup-hook timeout behavior.

## Updated Design Health Assessment

- Change posture: refactor / cleanup with downstream design-impact bug pressure.
- Current design issue found: yes.
- Root cause classification: `Missing Invariant`; `Boundary Or Ownership Issue`; `Duplicated Policy Or Coordination`; provider lifecycle coordination gap.
- Refactor needed now: yes.

The native AutoByteus deletion remains correct. The missing architecture is not native-team compatibility. The missing architecture is a clean runtime coordination layer under the server-owned mixed team spine.

The current design has these unhealthy pressure points:

1. `MixedTeamManager.deliverInterAgentMessage` builds and publishes Team Communication projection before recipient delivery is proven. A projection can therefore look successful even when the concrete target cannot resume or cannot make progress.
2. `MixedTeamMemberRegistry` owns normal member handles, task-agent handles, task-agent recovery, and concrete task-agent lifecycle as a map/cache concern. Awaiting-acceptance and revision are business lifecycle states, not merely handle recovery states.
3. Same-runtime Codex coordination is hidden behind `threadClientScopeKey(runContext) => null` for team members. That hides an important team-runtime policy inside one backend helper and leaves event correlation and client leasing implicit.
4. Same-runtime Claude coordination is hidden in a global session manager/SDK-client path without a team-run cohort owner that can bound active-query cleanup for all members in one team run.

## Target Architecture Summary

Keep the high-level spine:

```text
TeamRun -> MixedTeamManager -> AgentRunManager -> runtime AgentRun backend
```

But make three currently implicit sub-spines explicit:

```text
MixedTeamManager
  -> TeamMemberDeliveryCoordinator
  -> TaskAgentInstanceDirectory / TaskAgentRevisionCoordinator
  -> provider-specific TeamRuntimeCohortCoordinator
```

These are not replacement team managers. They are owned sub-concerns under the mixed-team architecture:

- `TeamMemberDeliveryCoordinator` owns delivery commit semantics.
- `TaskAgentInstanceDirectory` owns concrete task-agent identity/lifecycle and revision reachability.
- provider-specific runtime cohort coordinators own same-runtime transport/session leasing and event correlation.

## Revised Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| R4-DS-001 | Primary End-to-End | runtime `send_message_to` call | committed recipient input + Team Communication projection | `TeamMemberDeliveryCoordinator` under `MixedTeamManager` | Prevents projection/tool success from outrunning recipient acceptance. |
| R4-DS-002 | Primary End-to-End | task-agent work packet | awaiting-acceptance concrete task-agent state | `TaskAgentInstanceDirectory` + task-delegation ledger | Makes task-agent run identity durable while a completion awaits accept/revision. |
| R4-DS-003 | Primary End-to-End | revision `send_message_to(task_agent_run_id)` | same task-agent run receives revision and can report revised completion | `TaskAgentRevisionCoordinator` | Makes revision a lifecycle transition, not a best-effort map lookup. |
| R4-DS-004 | Bounded Local | team member AgentRun creation | provider-specific thread/session lease | provider-specific team runtime cohort coordinator | Makes all-Codex/all-Claude same-runtime execution deterministic and inspectable. |
| R4-DS-005 | Return/Event | provider events | normalized team member events/status/projection | provider event router within runtime cohort | Prevents live transport timeouts from being silent routing/cleanup gaps. |

## Revised Primary Spines

### R4-DS-001 — Committed inter-agent delivery

```text
runtime send_message_to adapter
  -> shared parser / delivery request builder
  -> MemberTeamContext.deliverInterAgentMessage
  -> TeamRun.deliverInterAgentMessage
  -> MixedTeamManager
  -> TeamMemberDeliveryCoordinator.resolveDeliveryTarget
  -> target member handle accepts AgentRun.postUserMessage
  -> delivery receipt
  -> committed COMMUNICATION + MEMBER_INPUT events
```

Key invariant: Team Communication projection is a committed delivery record, not an attempted-delivery record. If the target handle cannot be resolved, activated, restored, or made to accept input, return a rejected `AgentOperationResult` and do not insert the canonical Team Communication projection. If attempted-delivery visibility is desired later, add a separate attempted-delivery event type; do not reuse successful Team Communication projection for failure.

### R4-DS-002 — Task-agent concrete lifecycle

```text
delegate_tasks
  -> TaskDelegationService
  -> TaskDelegationLedger creates task record
  -> TaskAgentInstanceDirectory.reserve(taskId, logicalMember)
  -> MixedTeamManager.startTaskAgentInstance
  -> MixedAgentMemberHandle creates concrete AgentRun
  -> TaskAgentInstanceDirectory records active concrete run
  -> task-agent mark_task_completed
  -> ledger status awaiting_acceptance
  -> directory state awaiting_acceptance, run remains revision-addressable
```

Key invariant: a completed-but-not-accepted task-agent is not settled and not forgotten. It is a live revision target until `accept_task`, failure settlement, explicit team termination, or a bounded unrecoverable runtime failure.

### R4-DS-003 — Task-agent revision delivery

```text
send_message_to(recipient_name=logical member, task_agent_run_id=concrete id)
  -> TeamMemberDeliveryCoordinator detects task-agent target
  -> TaskAgentRevisionCoordinator validates task-agent identity against directory + ledger
  -> directory state awaiting_acceptance -> revision_requested
  -> same concrete task-agent handle accepts AgentRun.postUserMessage
  -> committed communication/member-input receipt
  -> task-agent mark_task_completed again
  -> ledger returns to awaiting_acceptance with revised message
```

Key invariant: revision delivery does not go through the normal logical member handle unless it has first resolved a concrete task-agent instance. The identity shape is explicit: `(teamRunId, logicalMemberRouteKey, taskAgentRunId, optional taskAgentInstanceId, taskId if known)`.

### R4-DS-004 — Same-runtime provider cohort

```text
MixedAgentMemberHandle.ensureReady
  -> AgentRunManager.createAgentRun(config.memberTeamContext)
  -> provider backend factory
  -> provider TeamRuntimeCohortCoordinator.acquire(member run lease)
  -> provider thread/session/client
  -> AgentRunBackend
```

Provider-specific requirements:

- Codex: replace the implicit `memberTeamContext ? null : agent-run:<runId>` scope policy with an explicit Codex team-thread cohort owner. It owns shared app-server client leasing, thread registration, turn-start correlation, notification routing, and release/cleanup for the team run. Team-thread routing must not silently drop uncorrelated provider events when multiple team members are active; it must correlate by thread id, turn id, request/turn owner, or emit a diagnostic runtime error instead of hanging.
- Claude: introduce a Claude team-session cohort owner around sessions/active queries for a team run. It owns session creation/restore/termination, active-query abort, pending tool approval cleanup, and bounded close so `terminateAgentTeamRun` cannot hang an afterEach hook.

## Ownership Map

| Owner | Owns | Must Not Own |
| --- | --- | --- |
| `MixedTeamManager` | Team-run command boundary, team status, delegation to delivery/lifecycle sub-owners | Provider transport details; task-agent business lifecycle internals; direct projection-before-delivery logic |
| `TeamMemberDeliveryCoordinator` | Delivery target resolution, recipient activation/acceptance, delivery receipt, communication/member-input commit ordering | Provider client/session implementation; task-delegation ledger mutation beyond invoking task-agent revision validation |
| `TaskAgentInstanceDirectory` | Concrete task-agent identity, handle binding, active/awaiting/revision/settled state, recovery by explicit identity | Generic member roster resolution; provider transport |
| `TaskAgentRevisionCoordinator` | Validation and state transition for revision messages to awaiting task-agent instances | General teammate messages; provider sessions |
| `MixedTeamMemberRegistry` | Logical member handle lookup and creation only | Business lifecycle of task-agent awaiting acceptance/revision; global recovery policy |
| `CodexTeamThreadCohortCoordinator` | Codex app-server client lease, thread/turn routing, team-run-scoped cleanup for Codex members | Team recipient resolution; generic task delegation |
| `ClaudeTeamSessionCohortCoordinator` | Claude SDK query/session lifecycle and bounded cleanup for Claude team members | Team recipient resolution; generic task delegation |
| `AgentRunManager` | Individual agent run creation/restore/active-run registry | Cross-member same-runtime cohort policy |

## Concrete File Responsibility Direction

### Add / create

| Path | Owner | Responsibility |
| --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/delivery/team-member-delivery-coordinator.ts` | `TeamMemberDeliveryCoordinator` | Orchestrate inter-agent delivery, recipient acceptance, receipt creation, and event commit ordering. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/delivery/team-member-delivery-receipt.ts` | delivery model | Tight receipt type containing delivery id, communication message id, recipient input id, target identity, accepted/rejected result. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-agent-instance-directory.ts` | `TaskAgentInstanceDirectory` | Team-run-scoped concrete task-agent directory and lifecycle state machine. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-agent-revision-coordinator.ts` | `TaskAgentRevisionCoordinator` | Validate revision target and transition awaiting-acceptance task-agent into revision-requested delivery. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-team-thread-cohort-coordinator.ts` | Codex team runtime cohort | Explicit team-run-scoped client/thread lease and event correlation policy. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-lease.ts` | Codex lease model | Tight lease returned to `CodexThreadManager` instead of implicit client scope. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-team-session-cohort-coordinator.ts` | Claude team runtime cohort | Explicit team-run-scoped session/query cleanup and bounded close policy. |
| `autobyteus-server-ts/src/agent-execution/domain/team-runtime-cohort-identity.ts` | shared identity | Tight identity shape derived from `MemberTeamContext`: teamRunId, runtimeKind, memberRunId, memberRouteKey, workspace key. |

### Modify

| Path | Required Change |
| --- | --- |
| `mixed-team-manager.ts` | Delegate delivery to `TeamMemberDeliveryCoordinator`; remove projection-before-delivery logic from the manager body. |
| `mixed-team-member-registry.ts` | Reduce task-agent ownership to handle lookup/creation hooks called by the task-agent directory; remove global recoverable cache as the authoritative business lifecycle. |
| `mixed-agent-member-handle.ts` | Separate direct user input publishing from inter-agent delivery receipt; expose a method that can accept a traced delivery without committing communication projection itself. |
| `task-delegation-service.ts` | On completed report, tell `TaskAgentInstanceDirectory` the task-agent is awaiting acceptance; on accept/failure settlement, request directory settlement. |
| `task-delegation-ledger.ts` | Add a clear revision-related transition or revision marker if needed; keep statuses semantically tight (`awaiting_acceptance` remains the acceptance state; `revision_requested` may be directory-only if ledger status should not change). |
| `inter-agent-message-delivery-request-builder.ts` | Preserve explicit task-agent identity fields and avoid treating `recipient_name + task_agent_run_id` as a normal logical-member message. |
| `codex-thread-manager.ts` | Replace `threadClientScopeKey` null behavior with explicit lease acquisition from Codex cohort owner. |
| `codex-client-thread-router.ts` | Route by explicit lease/correlation; do not silently drop ambiguous team-cohort events. Emit diagnosable errors when provider data is insufficient. |
| `codex-app-server-client-manager.ts` | Keep process lifecycle/refcount concerns, but make caller-provided scope keys explicit and never infer team policy from `null`. |
| `claude-session-manager.ts` / `claude-session.ts` | Move team-run multi-session cleanup responsibility into Claude cohort owner; make termination bounded and observable. |

### Remove / decommission from current local-fix direction

| Item | Reason |
| --- | --- |
| `MixedTaskAgentHandleRecoveryCache` as authoritative lifecycle cache | A global cache of handles is not a durable business owner for awaiting-acceptance/revision. Replace with team-run-scoped directory state. |
| `threadClientScopeKey(memberTeamContext ? null : agent-run)` policy | Hidden policy; explicit cohort lease identity is required. |
| COMMUNICATION projection before recipient acceptance | Creates false-success observability and misleads model/user/tests. |

## Dependency Rules

Allowed:

- `MixedTeamManager -> TeamMemberDeliveryCoordinator -> MixedTeamMemberRegistry`.
- `TeamMemberDeliveryCoordinator -> TaskAgentRevisionCoordinator` only when `task_agent_run_id` is present.
- `TaskAgentRevisionCoordinator -> TaskAgentInstanceDirectory + TaskDelegationLedger` for validation/state transition.
- Provider backend factories/managers -> provider-specific team runtime cohort coordinators.
- Provider-specific cohort coordinators -> provider clients/sessions/routers.

Forbidden:

- Runtime adapters must not publish Team Communication projection directly.
- `MixedTeamManager` must not reach into Codex/Claude client/session internals.
- `AgentRunManager` must not infer same-runtime team sharing policy.
- `MixedTeamMemberRegistry` must not be the business owner of awaiting-acceptance/revision lifecycle.
- A successful `send_message_to` tool result must not be returned if recipient command acceptance failed.
- A canonical Team Communication projection must not be inserted for a delivery that was rejected before recipient input acceptance.

## Interface Boundary Mapping

| Interface | Subject Owned | Identity Shape | Notes |
| --- | --- | --- | --- |
| `TeamMemberDeliveryCoordinator.deliver(request)` | inter-agent delivery | full `InterAgentMessageDeliveryRequest` | Returns receipt/result; owns commit ordering. |
| `TaskAgentInstanceDirectory.registerStarted(identity, handle)` | task-agent instance | `TaskAgentInstanceIdentity` | Called when task-agent starts successfully. |
| `TaskAgentInstanceDirectory.markAwaitingAcceptance(taskAgentRunId, taskId)` | task-agent lifecycle | `teamRunId + taskAgentRunId + taskId` | Called after completed report. |
| `TaskAgentRevisionCoordinator.prepareRevisionDelivery(input)` | task-agent revision | `teamRunId + logicalMemberRouteKey + taskAgentRunId + optional taskAgentInstanceId` | Rejects before projection if invalid. |
| `CodexTeamThreadCohortCoordinator.acquireThreadLease(identity, config)` | Codex team runtime lease | `RuntimeCohortIdentity + runId + thread config` | Replaces implicit null scope. |
| `ClaudeTeamSessionCohortCoordinator.acquireSession(identity, config)` | Claude team runtime lease | `RuntimeCohortIdentity + runId + session config` | Bounded cleanup. |

## Concrete Example

Good shape for task-agent revision:

```text
coordinator tool call send_message_to(worker, task_agent_run_id=worker__task_0001)
  -> delivery coordinator sees concrete task-agent target
  -> revision coordinator verifies worker__task_0001 is awaiting acceptance
  -> directory returns bound task-agent handle
  -> handle posts revision to same AgentRun
  -> delivery coordinator commits communication/member-input receipt
```

Avoided shape:

```text
MixedTeamManager publishes communication
  -> registry map lookup maybe finds handle
  -> if post fails, model sees error but UI already shows message
```

The avoided shape is the current false-success risk surfaced by Round 4.

## Validation Design Implications

Implementation should add focused executable validation before re-running the long live matrix:

1. Unit/contract tests for delivery commit ordering: failed recipient resolution or failed task-agent target must not emit canonical Team Communication projection.
2. Unit/integration tests for task-agent directory states: active -> awaiting_acceptance -> revision_requested -> awaiting_acceptance -> accepted/settled.
3. Synthetic Codex router/cohort tests with two team member threads on one cohort: events with thread id, turn id, request/turn ownership, and ambiguous events must route deterministically or fail diagnostically.
4. Synthetic Claude cohort cleanup tests: active query termination must settle within a bounded timeout and not hang test hooks.
5. Then live E2E matrix: all-AutoByteus, all-Codex, all-Claude, mixed AutoByteus+Codex, nested AutoByteus+Codex+Claude, mixed task-agent revision.

## Architecture Reviewer Focus

Please review whether this addendum correctly separates:

- team communication commit ownership from mixed-team high-level orchestration,
- task-agent lifecycle ownership from registry/cache mechanics,
- provider-specific same-runtime transport/session coordination from generic AgentRun creation,
- successful Team Communication projection from attempted but rejected delivery.
