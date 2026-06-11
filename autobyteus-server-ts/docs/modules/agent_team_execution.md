# Agent Team Execution

## Scope

Manages running team runs, selecting the authoritative team backend, restoring persisted team activity, and streaming member/team events through one server-owned boundary.

## Backend Selection Model

- `RuntimeKind` is the **member execution runtime** subject.
- `TeamBackendKind` is the **team orchestration** subject. Active server team execution uses `TeamBackendKind.MIXED` for every team composition.
- `TeamRunService` builds a recursive topology plan before launch:
  - every member receives a stable `memberPath` array and slash-delimited `memberRouteKey`
  - launch configs for nested leaf agents are matched by `memberRouteKey` or `memberPath`; no bare member-name fallback is defined for nested launch config matching
  - homogeneous AutoByteus, Codex, Claude, heterogeneous, and nested team definitions all produce `TeamBackendKind.MIXED`
- `AgentTeamRunManager` delegates create/restore work only to `MixedTeamRunBackendFactory`.
- Per-member runtime selection remains below the team boundary: `MixedTeamManager` builds member `AgentRunConfig`s, and `AgentRunManager` selects the AutoByteus, Codex, or Claude AgentRun backend from each member's `runtimeKind`.


## Launch-Time Identity Assignment

`TeamRunService` owns new team-run identity assignment before runtime creation.
New public launches allocate a `<team_definition_name_slug>_<uuid-without-dashes>`
`teamRunId`, then assign identities through `TeamRunLaunchIdentityAssignment`
before calling `AgentTeamRunManager.createTeamRun(config, teamRunId)`. Public
launch input must not provide `memberRunId` or `childTeamRunId`; explicit ids are
stored data only on restore/historical paths.

Concrete agent members receive allocator-backed opaque `memberRunId` values with
the same `<agent_definition_name_slug>_<uuid-without-dashes>` shape as
standalone runs. `agent_team` wrapper members receive their generated child
`teamRunId` as both the wrapper `memberRunId` and `childTeamRunId`. Member route
keys and member paths remain the command/routing identity; `memberRunId` is a
runtime/storage id and must not encode or replace route semantics.

Member memory ownership is root-hierarchical. Direct members write under
`memory/agent_teams/<rootTeamRunId>/<memberRunId>/...`; nested subteam leaf
members append their child team run id path before the leaf run id, for example
`memory/agent_teams/<rootTeamRunId>/<childTeamRunId>/<memberRunId>/...`; deeper
subteams append each nested child team run id. Task-agent runs write under the
logical member's same team memory scope, for example
`memory/agent_teams/<rootTeamRunId>/<...teamRunPath>/<taskAgentRunId>/...`.
`AgentMemoryLocationService` is the shared read/write/projection owner for this
shape, carrying `rootTeamRunId`, `teamRunPath`, member/task run identity,
route/path metadata, and the resolved `memoryDir`.

Route-key suffix selection is intentionally unambiguous. Exact route-key matches
win; otherwise a suffix such as `worker` resolves only when exactly one candidate
exists in the requested team scope. Ambiguous suffixes fail instead of choosing a
first match. Fully-qualified route keys such as `ReviewSquad/worker`, or a child
team run scoped request for `worker`, must be used when duplicate nested leaf
names exist.

## Current Execution Paths

| Path | Authoritative owner | Member execution primitive | Notes |
| --- | --- | --- | --- |
| Any server team run (all-AutoByteus, all-Codex, all-Claude, heterogeneous, or nested) | `MixedTeamManager` | Agent members own one runtime-specific `AgentRun`; subteam members own child `TeamRun`s | `MixedTeamManager` is retained by name and is the single active server team manager. Runtime-specific team managers/backends are not instantiated by server team create/restore. |
| AutoByteus member in a server team | `MixedAgentMemberHandle -> AgentRunManager -> AutoByteusAgentRunBackendFactory` | Standalone AutoByteus `AgentRun` | Server-composed `MemberTeamContext`/`MemberRunInstructionComposer` prompt path provides team instructions, roster, send-message guidance, and task-delegation guidance; native manifest injection is not used for server team members. |
| Codex or Claude member in a server team | `MixedAgentMemberHandle -> AgentRunManager` | Standalone Codex or Claude `AgentRun` | Uses runtime-neutral member bootstrap for teammate instructions, `send_message_to`, and configured task-delegation tools. |
## Nested Member Identity And Commands

- `TeamMemberSelector` is the domain/backend command identity:
  - `{ kind: "path", memberPath: [...] }`
  - `{ kind: "route_key", memberRouteKey: "subteam/leaf" }`
- `memberPath` / `memberRouteKey` are canonical for nested members.
  Transport/GraphQL command inputs must provide explicit path or route-key
  selector fields. Scalar target aliases such as `target_member_name`,
  `target_agent_name`, command-side `agent_name`, command-side `agent_id`, and
  camelCase equivalents are rejected at the edge instead of normalized.
- Top-level executable handles may be derived only from an already accepted
  `memberPath[0]` or first route-key segment. Bare names are never an
  authoritative public command selector.
- Posting a message to a top-level subteam member creates/restores the child
  `TeamRun` and posts to that child team's default/coordinator target. The
  parent runtime does not choose an arbitrary flattened child leaf.
- `TeamRun.postMessage(...)` defaults an omitted target to the configured
  coordinator route key or sole member route key when one exists. A remaining
  `null` target means a true team-level/no-target command and must not be
  converted into a guessed member identity.
- Tool approval targets must resolve to an agent member. A request aimed only
  at a subteam member is rejected; approval clients must use the
  `source_path` / `source_route_key` or member path/route emitted with the
  approval request event. For delegated task-agent tool calls, approval
  clients must preserve the emitted concrete task-agent run identity so the
  approval/denial command routes to the active task-agent runtime rather than
  the logical member template.
- Team events carry canonical `sourcePath`. Any display aliases are derived
  transport metadata only and are not accepted as command target inputs.

## Command-Start Status

Team message commands publish backend-owned `initializing` as soon as a concrete target is resolved and before slow member startup, child-team restore, provider session/thread startup, or first-turn send work is awaited.

- Mixed leaf-agent handles publish member-scoped `AGENT_STATUS` before creating or restoring their child `AgentRun`.
- Mixed subteam handles publish represented-team/source-path `TEAM_STATUS` before creating or restoring their child `TeamRun`; the parent member-row snapshot projects that represented team status for display without inventing a leaf-agent identity.

`TeamCommandStatusOverlayStore` is the shared owner for pending command-start overlays. Each handle owns its own store instance; it is not a global status authority. The store gates `initializing` publication to current effective `offline`/`idle`, stores pending member route-key overlays and team `sourcePath` overlays, applies them to snapshots and aggregate inputs, replaces pending startup with `error` on command failure, clears overlays when matching runtime `AGENT_STATUS` or team `TEAM_STATUS` replacement events arrive, and clears all pending state on termination/disposal. Command owners still own target resolution, lazy runtime creation/restoration, child-team creation, provider send sequencing, and failure handling.

Pending command-start overlays are reflected in member/represented-team status snapshots and aggregate team status while the command is still in startup. Runtime status events, command rejection, thrown failures, termination, or disposal must replace or clear those overlays so clients cannot remain indefinitely in `initializing`.

## Server-Owned Task Delegation Lifecycle

Team task delegation is owned by `TaskDelegationService`, not by runtime-specific
handlers, legacy model-facing task-plan tools, or future MCP transport code. The
model-facing task-delegation protocol is:

- `delegate_tasks`: a coordinator/delegator submits one or more bounded
  ready-to-run tasks in a `tasks` array. Each item contains `member_name`, rich
  `description`, and optional `reference_files`; dependency encoding is not part
  of the task item shape.
- `submit_task_result`: the bound task-agent submits one reviewable result for
  its current task. The tool is selector-free; task identity comes from the
  task-agent context.
- `review_task_result`: the original delegator reviews the latest pending
  submission using `decision="accept"` or `decision="request_revision"`.
  Revision decisions require a non-empty message and are delivered by the system
  to the same task-agent.

`send_message_to` remains ordinary teammate communication only. It is not the
task result, revision, acceptance, or finalization protocol.

Legacy task-plan tool names (`create_task`, `create_tasks`, `assign_task_to`,
`get_my_tasks`, `get_task_plan_status`, and the old local task-plan
`update_task_status`) must not be exposed as a parallel model workflow. Task
state is held internally in a team-run-scoped delegation ledger for correlation,
activation, result/review history, stream projection, and settlement safety.

The happy path is push-based:

1. The runtime projection builds a `TaskDelegationToolContext` from the current
   server-owned `MemberTeamContext` and calls `TaskDelegationToolService`.
2. The service resolves the active `TeamRun`, creates `not_started` ledger
   records, validates exact `member_name` targets against the team roster, and
   treats the submitted tasks as independent ready-to-run work.
3. `TaskDelegationActivationCoordinator` registers the active task-agent run in
   the team-run `TaskAgentDirectory`, binds the ledger record to the concrete
   task-agent runtime identity, and starts one task-agent instance per task
   through `TeamRun.startTaskAgentInstance(...)`. The work packet includes the
   derived task label, rich `description`, optional reference files, the
   task-agent `target_agent_run_id`, original delegator identity, and
   instructions to use `submit_task_result` for reviewable output.
4. Accepted activations mark records `active`, mark the exact run reachable, and
   emit `TASK_DELEGATION_ACTIVATED`; rejected activations unregister the
   starting run, roll records back to `not_started`, and are returned to the
   tool caller in `activationResults`.
5. The task-agent calls `submit_task_result`. The ledger records a distinct
   submission id, moves the task to `awaiting_review`, sets `pendingSubmissionId`,
   emits `TASK_DELEGATION_RESULT_SUBMITTED` and status projection, and the
   notification dispatcher attempts a system notification to the original
   delegator.
6. The original delegator calls `review_task_result`. `request_revision` records
   a review linked to the pending submission id, returns the task to `active`,
   emits review/status events, and attempts a system revision notification to the
   same task-agent. `accept` records a review linked to the pending submission,
   marks the task `accepted`, emits review/status events, and requests safe
   settlement.
7. Notification delivery is non-transactional after valid lifecycle mutation:
   committed state and events remain authoritative even if the system input is
   rejected. Tool results expose `notification_delivered` and deterministic
   `warnings[]` with `TASK_NOTIFICATION_DELIVERY_FAILED` when delivery fails.
8. `TaskDelegationSettlementCoordinator` waits for an idle/offline event from
   the bound task-agent run, verifies `TaskDelegationLedger` has no non-terminal
   assigned work and no non-terminal child delegations where that task-agent run
   is the original delegator, protects the coordinator by default, and calls
   `TeamRun.settleTaskAgentInstance(routeKey, internal task-agent run id,
   reason)`. The internal run identity is a stale-route guard so a later
   replacement instance is not accidentally settled.

`TASK_DELEGATION_*` events use `TeamRunEventSourceType.TASK_DELEGATION` in the
domain stream and are flattened to WebSocket `TASK_DELEGATION_EVENT` messages.
Current event types include `TASK_DELEGATION_ACTIVATED`,
`TASK_DELEGATION_RESULT_SUBMITTED`, `TASK_DELEGATION_RESULT_REVIEWED`, and
`TASK_DELEGATION_STATUS_UPDATED`. Result/review payloads include `submissionId`,
`reviewId`, and `reviewedSubmissionId` so consumers do not infer relationships
from history array order.

### Task Delegation Validation Notes

Durable deterministic coverage lives in the task-delegation integration/unit
suites under `tests/integration/agent-team-execution/` and
`tests/unit/agent-team-execution/`. A gated live mixed-runtime E2E lives at
`tests/e2e/runtime/mixed-task-delegation.e2e.test.ts`; it creates a real
GraphQL/websocket team with an AutoByteus/LMStudio Qwen coordinator and a Codex
`gpt-5.5` worker. The live path is intentionally skipped unless explicit live
flags are set, so local/default validation can run the file and expect a skipped
test while live validation can opt in with:

```bash
RUN_MIXED_TASK_DELEGATION_E2E=1 RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 \
  AUTOBYTEUS_STREAM_PARSER=api_tool_call \
  LMSTUDIO_TARGET_TEXT_MODEL=qwen3.6-35b-a3b \
  CODEX_E2E_TASK_DELEGATION_MODEL=gpt-5.5 \
  pnpm -C autobyteus-server-ts exec vitest run \
    tests/e2e/runtime/mixed-task-delegation.e2e.test.ts \
    -t "AutoByteus coordinator delegates work and reviews a concrete Codex task-agent result/revision cycle" \
    --no-file-parallelism
```

## Mixed-Team Communication Contract

- `MemberTeamContextBuilder` creates the runtime-neutral per-member communication/bootstrap and task-delegation contract:
  - current member identity
  - current member path/route identity
  - teammate list and allowed recipients, including subteam members when they
    are addressable at the current team boundary
  - optional team instruction
  - `send_message_to` delivery handler with optional explicit `reference_files` path references
  - task-delegation identity inputs used by task-delegation tool projections
- `InterAgentMessageRouter` / mixed delivery normalize sender and recipient
  selectors, then deliver through the receiving member handle. Agent recipients
  use the shared `AgentRun.postUserMessage(...)` boundary; subteam recipients
  post into the child `TeamRun` default/coordinator target.
- Communication rosters are scoped to the member boundary. Parent members can
  see a subteam coordinator/representative as an addressable recipient, while a
  represented child coordinator can see local child teammates plus exposed
  immediate parent-boundary members. This is descriptor-owned visibility, not a
  hidden `reply_to_sender` alias or arbitrary cross-level access.
- Representative delivery preserves the actual leaf participant identity. For
  example `program_manager -> review_lead` resolves to parent-root route
  `BuildSquad/review_lead`, enters the top-level `BuildSquad` subteam handle for
  execution, and strips to the child-local selector `review_lead` only after the
  child boundary is reached.
- Upward reporting uses the same parent-root descriptor model in reverse:
  `BuildSquad/review_lead -> program_manager` records the sender as the leaf
  representative and delivers recipient input to the parent member without
  exposing unrelated ancestors or sibling internals.
- Communication projections preserve sender/receiver `memberKind`,
  `memberPath`, `memberRouteKey`, and optional `representedSubTeam` metadata so
  representative messages can display the responsible subteam while retaining
  the actual leaf participant path.
- Leaf member input is emitted as a separate member-input event with stable
  message/dedupe identity. For inter-agent delivery into a child team, this
  event is what lets the child coordinator transcript show the inbound
  "received a message from ..." prompt before the child reply.
- Recipient-visible content still includes generated **Reference files:**
  blocks only from explicit structured `reference_files`.
- Runtime adapters must expose `send_message_to` as one logical team-delivery
  tool invocation with both transcript and lifecycle events. Claude Agent SDK
  members route first-party MCP `send_message_to` through the dedicated team
  communication handler, which emits canonical `send_message_to` start and
  terminal lifecycle events; raw MCP transport chunks such as
  `mcp__autobyteus_team__send_message_to` are duplicate noise and must be
  suppressed before they create extra Activity rows.
- AutoByteus members participating in mixed teams receive primitive server-managed `teamContext` fields through `initialCustomData`, while the bound server-owned `send_message_to` tool carries the delivery handler through `MemberTeamContext` and `TeamRun` / `MixedTeamManager`.
- Mixed AutoByteus standalone members explicitly strip legacy `ToolCategory.TASK_MANAGEMENT` names before exposure, while preserving configured server-owned task-delegation tools (`delegate_tasks`, `submit_task_result`, and `review_task_result`).
- Task-delegation and communication tools are configured agent capabilities, not
  runtime-level provider policy. Runtime adapters must expose `send_message_to`,
  `delegate_tasks`, `submit_task_result`, and `review_task_result` only when the current member/tool
  configuration includes them, and must not add provider `tool_choice` special
  cases, forced-tool dampening, or framework auto-review behavior for
  task results. If a model does not call an available tool despite clear
  instructions, treat that as prompt/model/test configuration until a framework
  invariant above is violated.

## Mixed Member Event Bridge

- `MixedTeamManager` is the only active server team manager; it subscribes to
  child `AgentRun` and child `TeamRun` streams through mixed member handles.
- Runtime AgentRun backends convert provider-native events below the agent-run
  boundary. Mixed member handles then enrich emitted events with
  team/member/task-agent provenance and forward them through the team stream.
- This keeps provider conversion runtime-local while letting the mixed team
  boundary supply the context required by `FILE_CHANGE` derivation and
  `TEAM_COMMUNICATION_MESSAGE` projection.
- Produced `FILE_CHANGE` events remain scoped to the producing member run id and
  persist through the existing run-file-change service/content route. Explicit
  `reference_files` remain child metadata on team-level Team Communication messages.
- Multiple websocket/API subscribers must not create duplicate member runtime
  listeners or duplicate team projection passes for the same child runtime event.

## Restore / Persistence Notes

- Restore uses canonical recursive `TeamRunMetadata.memberTree` plus
  `TeamBackendKind`; it does not collapse mixed or nested teams back to one
  runtime owner.
- `TeamRunConfig.memberTree` is the authoritative topology. The flat
  `memberConfigs` projection is derived leaf-agent data for existing consumers
  and must not be used to infer nested ownership.
- Subteam metadata records the child `teamRunId`, child team definition id,
  coordinator route key, and child member tree. Restore recreates the parent
  mixed runtime with subteam handles that can restore their child `TeamRun`s on
  demand.
- Internal child team runs are implementation detail for the parent nested run.
  They can be restored through their parent subteam handle, but workspace
  history should not list them as independent top-level team rows.
- Historical flat team metadata is not compatibility-read for nested topology;
  unsupported legacy metadata fails instead of guessing a lost tree.
- Every member `AgentRun` receives a resolved `memoryDir` on create and restore through the mixed member-run path. Direct members use `memory/agent_teams/<rootTeamRunId>/<memberRunId>/...`; nested members use the root-hierarchical `memory/agent_teams/<rootTeamRunId>/<...teamRunPath>/<memberRunId>/...` shape.
- Member memory recording is attached at the `AgentRunManager` layer for mixed team members; runtime-specific AgentRun backends keep their own provider-local runtime details below that boundary.
- `TeamRunService.resolveTeamRun(teamRunId)` is the canonical restore-aware lookup boundary for callers that are allowed to resume a stopped persisted team run. It returns the active team runtime when present and otherwise attempts persisted restore before returning `null`.
- Team WebSocket connection and `SEND_MESSAGE` dispatch use `resolveTeamRun(...)`, so a follow-up message to a stopped-but-persisted team can restore the team runtime, rebind stream subscription to the restored `TeamRun`, and post to the requested member route.
- Active-only team controls still use the active lookup path. `INTERRUPT_GENERATION` and tool approval/denial commands must not restore a stopped team run as a side effect.
- Team generation interrupt is intentionally member-scoped. `TeamRun.interruptMember(targetMemberRouteKey, targetMemberRunId?)` is the domain boundary; backend managers resolve the route key as the authoritative target and use the optional run id only as a stale-target guard. A missing target or route-key/run-id mismatch rejects without retargeting or falling back to a team-wide interrupt.
- Persisted member metadata still carries the member runtime kind and platform-native run/thread/session id needed for restore.
- `applicationExecutionContext` stays member-local and flows through create/restore for mixed team members.
- Accepted restored follow-up messages call
  `TeamRunService.recordRunActivity(...)`, refreshing team metadata/history
  activity state while preserving the stable opening/coordinator title for the
  workspace history row.

## TS Source

- `src/agent-team-execution/domain/team-backend-kind.ts`
- `src/agent-team-execution/services/team-run-service.ts`
- `src/agent-team-execution/services/agent-team-run-manager.ts` (`AgentTeamRunManager`)
- `src/agent-team-execution/services/team-definition-topology-planner.ts`
- `src/agent-team-execution/services/member-team-context-builder.ts`
- `src/agent-team-execution/services/member-run-instruction-composer.ts`
- `src/agent-team-execution/services/inter-agent-message-router.ts`
- `src/agent-team-execution/services/team-command-status-overlay-store.ts`
- `src/agent-team-execution/task-delegation/*`
- `src/agent-tools/task-delegation/*`
- `src/agent-execution/backends/codex/task-delegation/*`
- `src/agent-execution/backends/claude/task-delegation/*`
- `src/agent-team-execution/services/team-member-command-start-status-events.ts`
- `src/agent-team-execution/domain/team-run-member-identity.ts`
- `src/agent-team-execution/backends/mixed/mixed-team-manager.ts`
- `src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts`
- `src/agent-team-execution/backends/mixed/members/*`
- `src/agent-team-execution/backends/mixed/events/mixed-team-event-bridge.ts`
- `src/agent-team-execution/backends/mixed/mixed-sub-team-run-factory.ts`
- `src/services/agent-streaming/agent-team-stream-handler.ts`
- `src/api/graphql/types/agent-team-run.ts`
