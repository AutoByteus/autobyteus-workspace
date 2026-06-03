# Agent Team Execution

## Scope

Manages running team runs, selecting the authoritative team backend, restoring persisted team activity, and streaming member/team events through one server-owned boundary.

## Backend Selection Model

- `RuntimeKind` is the **member execution runtime** subject.
- `TeamBackendKind` is the **team orchestration** subject.
- `TeamRunService` builds a recursive topology plan before launch:
  - every member receives a stable `memberPath` array and slash-delimited
    `memberRouteKey`
  - launch configs for nested leaf agents are matched by `memberRouteKey`
    or `memberPath`; no bare member-name fallback is defined for nested
    launch config matching
  - definitions containing any nested `agent_team` member select `MIXED`, even
    when all leaf agents use the same member runtime
  - non-nested single-runtime teams stay on `AUTOBYTEUS`, `CODEX_APP_SERVER`,
    or `CLAUDE_AGENT_SDK`
  - non-nested multi-runtime teams select `MIXED`
- `AgentTeamRunManager` then delegates create/restore work to the matching backend factory.

## Current Execution Paths

| Path | Authoritative owner | Member execution primitive | Notes |
| --- | --- | --- | --- |
| Single-runtime AutoByteus team | Native AutoByteus team backend | Native team runtime | Preserves native task-plan-aware team behavior while server-owned task-delegation wrappers share the canonical explicit task-delegation command boundary. Native member events are converted/enriched/pipelined once per backend-owned stream bridge before fanout to all server subscribers. |
| Single-runtime Codex team | `CodexTeamManager` | One standalone Codex `AgentRun` per member | Uses runtime-neutral member bootstrap for teammate instructions, `send_message_to`, and configured task-delegation dynamic tools. |
| Single-runtime Claude team | `ClaudeTeamManager` | One standalone Claude `AgentRun` per member | Uses the same runtime-neutral member bootstrap contract as Codex, with task-delegation tools projected as first-party team MCP tools when configured. |
| Mixed or nested-topology team | `MixedTeamManager` | Top-level member handles; agent handles own `AgentRun`s and subteam handles own child `TeamRun`s | Server-owned path for mixed-runtime and nested definitions. A top-level subteam is a first-class member, not a flattened leaf alias. |

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
  clients must also preserve the emitted concrete `task_agent_run_id` so the
  approval/denial command routes to the active task-agent runtime rather than
  the logical member template.
- Team events carry canonical `sourcePath`. Any display aliases are derived
  transport metadata only and are not accepted as command target inputs.

## Command-Start Status

Team message commands publish backend-owned `initializing` as soon as a concrete
target is resolved and before slow member startup, child-team restore, provider
session/thread startup, native `team.postMessage(...)`, or first-turn send work
is awaited.

- Codex and Claude single-runtime teams publish member-scoped `AGENT_STATUS`
  through their team managers before lazy member `AgentRun` creation or send.
- Mixed leaf-agent handles publish member-scoped `AGENT_STATUS` before creating
  or restoring their child `AgentRun`.
- Mixed subteam handles publish represented-team/source-path `TEAM_STATUS`
  before creating or restoring their child `TeamRun`; the parent member-row
  snapshot projects that represented team status for display without inventing a
  leaf-agent identity.
- Native AutoByteus teams publish member-scoped `AGENT_STATUS` for explicit or
  default-resolved member targets before native `team.postMessage(...)`.
- True native no-target commands publish root `TEAM_STATUS initializing` only;
  they do not invent a member-scoped event.

`TeamCommandStatusOverlayStore` is the only shared owner for pending
command-start overlays. Each backend/handle owns its own store instance; it is
not a global status authority. The store gates `initializing` publication to
current effective `offline`/`idle`, stores pending member route-key overlays and
team `sourcePath` overlays, applies them to snapshots and aggregate inputs,
replaces pending startup with `error` on command failure, clears overlays when
matching runtime/native `AGENT_STATUS` or team `TEAM_STATUS` replacement events
arrive, and clears all pending state on termination/disposal. Command owners
still own target resolution, lazy runtime creation/restoration, child-team
creation, provider/native send sequencing, and failure handling.

Native AutoByteus member status identity/projection is owned by
`AutoByteusTeamMemberStatusProjector`. The projector canonicalizes configured
member run id, native agent id, member name, route key, member path, and runtime
member context for both backend snapshots and native event processing. This
keeps native status projection from creating duplicate snapshot identities for
one member and keeps `AutoByteusTeamRunBackend` /
`AutoByteusTeamRunEventProcessor` aligned on the same identity policy.

For native AutoByteus steady-state status, explicit runtime `AGENT_STATUS`
payloads are the primary status edge. Mutable native `team.context.agents`
snapshots may enrich identity/can-interrupt or provide fallback status, but a
stale or missing snapshot must not turn a known live member into `offline` while
the backend remains active. The projector keeps the last observed live status
for known active members and skips that observed overlay only for inactive
backend/terminal cleanup. Native fine-grained runtime statuses stay internal to
`autobyteus-ts`; the server projects them to the public coarse status vocabulary
before WebSocket/frontend emission. The old `AGENT_STATUS_UPDATED`/
`agent_status_updated` liveness event name is not part of the canonical runtime
or server status path.

Pending command-start overlays are reflected in member/represented-team status
snapshots and aggregate team status while the command is still in startup.
Runtime/native status events, command rejection, thrown failures, termination,
or disposal must replace or clear those overlays so clients cannot remain
indefinitely in `initializing`.

## Server-Owned Task Delegation Lifecycle

Team task delegation is owned by `TaskDelegationService`, not by runtime-specific
handlers, legacy model-facing task-plan tools, or future MCP transport code. The
only model-facing task-delegation tools are:

- `delegate_tasks`: a coordinator/delegator submits one or more bounded
  ready-to-run tasks in a `tasks` array. Each item contains `member_name`, rich
  `description`, and optional `reference_files`; dependency encoding is not part
  of the task item shape.
- `mark_task_completed`: a task-agent instance reports completed worker output
  for its bound task using only required `message` plus optional
  `reference_files`; the task identity is inferred from task-agent context.
- `mark_task_failed`: a task-agent instance reports failed worker output for
  its bound task using only required `message` plus optional `reference_files`;
  the task identity is inferred from task-agent context.
- `accept_task`: the original delegator accepts completed work with the exact
  framework-generated `task_id` from the completion notification and optional
  `message`.

Legacy task-plan tool names (`create_task`, `create_tasks`, `assign_task_to`,
`get_my_tasks`, `get_task_plan_status`, and the old local task-plan
`update_task_status`) must not be exposed as a parallel model workflow. Task
state is still held internally in a team-run-scoped delegation ledger for
correlation, status messages, reference files, notifications, and settlement
safety.

The happy path is push-based:

1. The runtime projection builds a `TaskDelegationToolContext` from the current
   `MemberTeamContext` / native team context and calls `TaskDelegationToolService`.
2. The service resolves the active `TeamRun`, creates ledger records, validates
   exact `member_name` targets against the team roster, and treats the submitted
   tasks as independent ready-to-run work. Dependent follow-up work is sequenced
   by the coordinator after receiving the framework terminal/completion
   notification, then calling `delegate_tasks` again for the next task.
3. `TaskDelegationActivationCoordinator` marks runnable records `queued` and
   starts one concrete task-agent instance per task through
   `TeamRun.startTaskAgentInstance(...)`. The packet includes a derived task
   label, rich `description`, optional reference files, task-agent instance/run
   identity, and instructions not to call `get_my_tasks` or pass task selectors
   to task-agent result tools.
4. Accepted activations emit `TASK_DELEGATION_ACTIVATED`; rejected activations
   roll the affected records back to `not_started` and are returned to the tool
   caller in `activationResults`.
5. Accepted task-agent result reports emit `TASK_DELEGATION_STATUS_UPDATED`
   before any terminal follow-up handling.
6. `mark_task_completed` updates record message/reference files, marks
   the record `awaiting_acceptance`, emit `TASK_DELEGATION_TERMINAL_STATUS`,
   and post a framework-generated completion notification to the original
   delegator plus the coordinator when different. The completion notification
   includes the exact `task_id` the delegator must use if it accepts the result.
   `mark_task_failed` updates record failure context, emits the same terminal
   event, notifies the delegator/coordinator, and remains a terminal failure path.
7. The original delegator accepts completed work by calling
   `accept_task` with the exact framework-generated `task_id` from the
   completion notification. Accepted updates emit
   `TASK_DELEGATION_STATUS_UPDATED`, record acceptance message/time metadata,
   and then request task-agent settlement.
8. Settlement is requested after delegator acceptance, or after terminal
   failure, only after the current tool call can finish.
   `TaskDelegationSettlementCoordinator` waits for an idle/offline event from
   the bound task-agent run, verifies the task-agent instance still has no
   queued/in-progress delegated work, protects the coordinator by default, and
   calls `TeamRun.settleTaskAgentInstance(routeKey, taskAgentRunId, reason)`.
   The task-agent run id is a stale-route guard so a later replacement instance
   is not accidentally settled.

`TASK_DELEGATION_*` events use `TeamRunEventSourceType.TASK_DELEGATION` in the
domain stream and are flattened to WebSocket `TASK_PLAN_EVENT` messages with
`event_type` set to `TASK_DELEGATION_ACTIVATED`,
`TASK_DELEGATION_STATUS_UPDATED`, or `TASK_DELEGATION_TERMINAL_STATUS`. Event
payloads carry `teamRunId`, internal task identity, member/delegator identity,
task-agent instance identity, status, optional message/reference files, and
accepted-work metadata such as acceptance message/time when present, plus
canonical `source_path` / `source_route_key` metadata from the logical member.
Member-scoped stream/status/tool-approval payloads for task-agent activity also
carry concrete task-agent identity: `task_agent_instance_id`,
`task_agent_run_id`, `task_id`, logical `member_path` / `member_route_key`, and
canonical `source_path` / `source_route_key`. Clients must use that explicit
identity to project transient task-agent UI entities, distinguish parallel
task-agent executions for the same logical member, and route approvals to the
task-scoped runtime instead of inferring task-agent identity from generated run
id formats.

Current settlement support is backend-specific. Codex and Claude team managers
use the server-managed task-agent registry for task-agent instance start/settle
operations; Mixed team managers use the mixed member registry for the same
task-agent lifecycle across Codex, Claude, and AutoByteus member runtimes. The
native AutoByteus pure-team backend still reports `UNSUPPORTED_RUNTIME_COMMAND`
for per-member/task-agent settlement, so native pure-team agent configs gate
task-delegation tool exposure until that native boundary
exists. Mixed AutoByteus task-agent runs are supported because the mixed manager
owns task-agent lifecycle and the AutoByteus adapter preserves
`taskAgentInstanceId`, `taskAgentRunId`, `taskId`, and
`logicalMemberRouteKey` in native custom data.


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
RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 \
  LMSTUDIO_TARGET_TEXT_MODEL=qwen3.5-35b-a3b \
  CODEX_E2E_TASK_DELEGATION_MODEL=gpt-5.5 \
  pnpm -C autobyteus-server-ts exec vitest run \
    tests/e2e/runtime/mixed-task-delegation.e2e.test.ts \
    -t "AutoByteus coordinator delegates work and Codex gpt-5.5 worker reports terminal status" \
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
- AutoByteus standalone members participating in mixed teams receive a compatible `teamContext.communicationContext` payload through `initialCustomData`, so the shared `send_message_to` tool can work without native `AgentTeam` ownership.
- Mixed AutoByteus standalone members explicitly strip legacy `ToolCategory.TASK_MANAGEMENT` names before exposure, while preserving configured server-owned task-delegation tools (`delegate_tasks`, `mark_task_completed`, `mark_task_failed`, and `accept_task`).

## AutoByteus Team Event Bridge

- The native AutoByteus team backend owns a single `AgentTeamEventStream` bridge
  while it has active server subscribers.
- Native agent events are converted through `AutoByteusStreamEventConverter`,
  enriched with team/member provenance by the backend, processed through the
  shared `AgentRunEventPipeline`, and then fanned out to all listeners.
- This keeps the converter boundary conversion-only while letting the backend
  supply team context required by `FILE_CHANGE` derivation and
  `TEAM_COMMUNICATION_MESSAGE` derivation/projection.
- Produced `FILE_CHANGE` events remain scoped to the producing member run id and
  persist through the existing run-file-change service/content route. Explicit
  `reference_files` remain child metadata on team-level Team Communication messages.
- Multiple websocket/API subscribers must not create multiple native stream
  listeners or multiple independent pipeline passes for the same native event.

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
- Every Codex and Claude member receives a member `memoryDir` on create and restore, including single-runtime Claude teams and mixed-runtime members. The storage path is `memory/agent_teams/<teamRunId>/<memberRunId>/...`.
- Non-native member memory is storage-only: `AgentRunManager` attaches the shared recorder to each member `AgentRun`, while native AutoByteus members continue to use native memory ownership.
- `TeamRunService.resolveTeamRun(teamRunId)` is the canonical restore-aware lookup boundary for callers that are allowed to resume a stopped persisted team run. It returns the active team runtime when present and otherwise attempts persisted restore before returning `null`.
- Team WebSocket connection and `SEND_MESSAGE` dispatch use `resolveTeamRun(...)`, so a follow-up message to a stopped-but-persisted team can restore the team runtime, rebind stream subscription to the restored `TeamRun`, and post to the requested member route.
- Active-only team controls still use the active lookup path. `INTERRUPT_GENERATION` and tool approval/denial commands must not restore a stopped team run as a side effect.
- Team generation interrupt is intentionally member-scoped. `TeamRun.interruptMember(targetMemberRouteKey, targetMemberRunId?)` is the domain boundary; backend managers resolve the route key as the authoritative target and use the optional run id only as a stale-target guard. A missing target or route-key/run-id mismatch rejects without retargeting or falling back to a team-wide interrupt.
- Persisted member metadata still carries the member runtime kind and platform-native run/thread/session id needed for restore.
- `applicationExecutionContext` stays member-local and flows through create/restore for both single-runtime and mixed team members.
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
- `src/agent-team-execution/backends/autobyteus/autobyteus-team-member-status-projector.ts`
- `src/agent-team-execution/backends/mixed/mixed-team-manager.ts`
- `src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts`
- `src/agent-team-execution/backends/mixed/members/*`
- `src/agent-team-execution/backends/mixed/events/mixed-team-event-bridge.ts`
- `src/agent-team-execution/backends/mixed/mixed-sub-team-run-factory.ts`
- `src/services/agent-streaming/agent-team-stream-handler.ts`
- `src/api/graphql/types/agent-team-run.ts`
