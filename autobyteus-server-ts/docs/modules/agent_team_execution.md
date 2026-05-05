# Agent Team Execution

## Scope

Manages running team runs, selecting the authoritative team backend, restoring persisted team activity, and streaming member/team events through one server-owned boundary.

## Backend Selection Model

- `RuntimeKind` is the **member execution runtime** subject.
- `TeamBackendKind` is the **team orchestration** subject.
- `TeamRunService` resolves `TeamBackendKind` from the requested or persisted member runtime mix:
  - single-runtime teams stay on `AUTOBYTEUS`, `CODEX_APP_SERVER`, or `CLAUDE_AGENT_SDK`
  - multi-runtime teams select `MIXED`
- `AgentTeamRunManager` then delegates create/restore work to the matching backend factory.

## Current Execution Paths

| Path | Authoritative owner | Member execution primitive | Notes |
| --- | --- | --- | --- |
| Single-runtime AutoByteus team | Native AutoByteus team backend | Native team runtime | Preserves existing task-plan-aware team behavior. Native member events are converted/enriched/pipelined once per backend-owned stream bridge before fanout to all server subscribers. |
| Single-runtime Codex team | `CodexTeamManager` | One standalone Codex `AgentRun` per member | Uses runtime-neutral member bootstrap for teammate instructions and `send_message_to`. |
| Single-runtime Claude team | `ClaudeTeamManager` | One standalone Claude `AgentRun` per member | Uses the same runtime-neutral member bootstrap contract as Codex. |
| Mixed-runtime team | `MixedTeamManager` | `AgentRunManager` over per-member `AgentRun`s | Server-owned communication-only v1 path; does not delegate through legacy runtime-specific team managers. |

## Mixed-Team Communication Contract

- `MemberTeamContextBuilder` creates the runtime-neutral per-member communication/bootstrap contract:
  - current member identity
  - teammate list and allowed recipients
  - optional team instruction
  - `send_message_to` delivery handler with optional explicit `reference_files` path references
- `InterAgentMessageRouter` is the canonical mixed-team inter-agent delivery owner. It delivers through the shared `AgentRun.postUserMessage(...)` boundary while preserving sender identity and generated **Reference files:** blocks in recipient-visible content.
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
  supply team context required by `FILE_CHANGE` derivation and Team Communication message/reference projection.
- Produced `FILE_CHANGE` events remain scoped to the producing member run id and
  persist through the existing run-file-change service/content route. Explicit
  `reference_files` remain child metadata on team-level Team Communication messages.
- Multiple websocket/API subscribers must not create multiple native stream
  listeners or multiple independent pipeline passes for the same native event.

## Restore / Persistence Notes

- Restore uses persisted per-member runtime metadata plus `TeamBackendKind`; it does not collapse mixed teams back to one runtime owner.
- Every Codex and Claude member receives a member `memoryDir` on create and restore, including single-runtime Claude teams and mixed-runtime members. The storage path is `memory/agent_teams/<teamRunId>/<memberRunId>/...`.
- Non-native member memory is storage-only: `AgentRunManager` attaches the shared recorder to each member `AgentRun`, while native AutoByteus members continue to use native memory ownership.
- `TeamRunService.resolveTeamRun(teamRunId)` is the canonical restore-aware lookup boundary for callers that are allowed to resume a stopped persisted team run. It returns the active team runtime when present and otherwise attempts persisted restore before returning `null`.
- Team WebSocket connection and `SEND_MESSAGE` dispatch use `resolveTeamRun(...)`, so a follow-up message to a stopped-but-persisted team can restore the team runtime, rebind stream subscription to the restored `TeamRun`, and post to the requested member route.
- Active-only team controls still use the active lookup path. `STOP_GENERATION` and tool approval/denial commands must not restore a stopped team run as a side effect.
- Persisted member metadata still carries the member runtime kind and platform-native run/thread/session id needed for restore.
- `applicationExecutionContext` stays member-local and flows through create/restore for both single-runtime and mixed team members.
- Accepted restored follow-up messages call `TeamRunService.recordRunActivity(...)`, refreshing team metadata/history with an active status and the latest activity summary.

## TS Source

- `src/agent-team-execution/domain/team-backend-kind.ts`
- `src/agent-team-execution/services/team-run-service.ts`
- `src/agent-team-execution/services/agent-team-run-manager.ts` (`AgentTeamRunManager`)
- `src/agent-team-execution/services/member-team-context-builder.ts`
- `src/agent-team-execution/services/inter-agent-message-router.ts`
- `src/agent-team-execution/backends/mixed/mixed-team-manager.ts`
- `src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts`
- `src/services/agent-streaming/agent-team-stream-handler.ts`
- `src/api/graphql/types/agent-team-run.ts`
