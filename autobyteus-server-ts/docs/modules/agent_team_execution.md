# Agent Team Execution

## Scope

Manages running team runs, selecting the authoritative team backend, restoring persisted team activity, and streaming member/team events through one server-owned boundary.

## Backend Selection Model

- `RuntimeKind` is the **member execution runtime** subject.
- `TeamBackendKind` is the **team orchestration** subject.
- `TeamRunService` builds a recursive topology plan before launch:
  - every member receives a stable `memberPath` array and slash-delimited
    `memberRouteKey`
  - launch configs for nested leaf agents are matched by `memberRouteKey`;
    bare member names are accepted only when they are not ambiguous in the
    nested leaf set
  - definitions containing any nested `agent_team` member select `MIXED`, even
    when all leaf agents use the same member runtime
  - non-nested single-runtime teams stay on `AUTOBYTEUS`, `CODEX_APP_SERVER`,
    or `CLAUDE_AGENT_SDK`
  - non-nested multi-runtime teams select `MIXED`
- `AgentTeamRunManager` then delegates create/restore work to the matching backend factory.

## Current Execution Paths

| Path | Authoritative owner | Member execution primitive | Notes |
| --- | --- | --- | --- |
| Single-runtime AutoByteus team | Native AutoByteus team backend | Native team runtime | Preserves existing task-plan-aware team behavior. Native member events are converted/enriched/pipelined once per backend-owned stream bridge before fanout to all server subscribers. |
| Single-runtime Codex team | `CodexTeamManager` | One standalone Codex `AgentRun` per member | Uses runtime-neutral member bootstrap for teammate instructions and `send_message_to`. |
| Single-runtime Claude team | `ClaudeTeamManager` | One standalone Claude `AgentRun` per member | Uses the same runtime-neutral member bootstrap contract as Codex. |
| Mixed or nested-topology team | `MixedTeamManager` | Top-level member handles; agent handles own `AgentRun`s and subteam handles own child `TeamRun`s | Server-owned path for mixed-runtime and nested definitions. A top-level subteam is a first-class member, not a flattened leaf alias. |

## Nested Member Identity And Commands

- `TeamMemberSelector` is the domain/backend command identity:
  - `{ kind: "path", memberPath: [...] }`
  - `{ kind: "route_key", memberRouteKey: "subteam/leaf" }`
  - `{ kind: "top_level_name", memberName: "member" }`
- `memberPath` / `memberRouteKey` are canonical for nested members. Raw
  transport strings such as `target_member_name`, `target_agent_name`, and
  `agent_name` are edge inputs only and are normalized to selectors before
  entering `TeamRun`, `TeamRunBackend`, or a concrete manager.
- Bare-name selectors are valid for top-level members and unambiguous
  non-nested boundaries. If duplicate leaf names exist under different
  subteams, command callers must use `memberPath` or `memberRouteKey`.
- Posting a message to a top-level subteam member creates/restores the child
  `TeamRun` and posts to that child team's default/coordinator target. The
  parent runtime does not choose an arbitrary flattened child leaf.
- Tool approval targets must resolve to an agent member. A request aimed only
  at a subteam member is rejected; approval clients should use the
  `source_path` / `source_route_key` emitted with the approval request event.
- Team events carry canonical `sourcePath`. `subTeamNodeName` is retained only
  as a deprecated one-segment transport/display alias.

## Mixed-Team Communication Contract

- `MemberTeamContextBuilder` creates the runtime-neutral per-member communication/bootstrap contract:
  - current member identity
  - current member path/route identity
  - teammate list and allowed recipients, including subteam members when they
    are addressable at the current team boundary
  - optional team instruction
  - `send_message_to` delivery handler with optional explicit `reference_files` path references
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
- Mixed AutoByteus standalone members explicitly strip `ToolCategory.TASK_MANAGEMENT` tools before exposure; mixed-team v1 is communication-only.

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
- `src/agent-team-execution/services/inter-agent-message-router.ts`
- `src/agent-team-execution/domain/team-run-member-identity.ts`
- `src/agent-team-execution/backends/mixed/mixed-team-manager.ts`
- `src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts`
- `src/agent-team-execution/backends/mixed/members/*`
- `src/agent-team-execution/backends/mixed/events/mixed-team-event-bridge.ts`
- `src/agent-team-execution/backends/mixed/mixed-sub-team-run-factory.ts`
- `src/services/agent-streaming/agent-team-stream-handler.ts`
- `src/api/graphql/types/agent-team-run.ts`
