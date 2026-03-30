# Proposed Design Document

## Design Version

- Current Version: `v1`
- Status: `Draft`
- Updated On: `2026-03-19`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Defined Claude session versus team-context ownership split and future-state data-flow spines. | 1 |

## Summary

Refactor the Claude runtime so session execution stays individual-runtime-owned while team communication state moves under `agent-team-execution`.

The target model follows the local `autobyteus-ts` pattern:
- individual session context remains individual
- team context is separate and injected only for team-member runs
- `send_message_to` and teammate instruction composition consume team-owned context explicitly

## Goals

- Keep `ClaudeSessionContext` session-owned and small.
- Move Claude team runtime types/builders under `agent-team-execution/backends/claude`.
- Stop using `ClaudeSessionContext` as the carrier for teammate-routing data.
- Keep `send_message_to` tooling team-owned.
- Keep derived values derived:
  - `teamInstruction`
  - `allowedRecipientNames`
  - teammate manifest display rows
- Keep single-agent Claude runs free of team concerns.

## Non-Goals

- No generic `AgentRunManager` redesign in this ticket unless strictly required by the final implementation.
- No user-facing runtime behavior changes.
- No redesign of Codex or AutoByteus context models in this pass.

## Codebase Understanding Snapshot

| Area | Findings | Evidence | Design Consequence |
| --- | --- | --- | --- |
| `autobyteus-ts` agent context | Individual context does not structurally own team fields. | [agent-context.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent/context/agent-context.ts) | Claude session context should not own team fields. |
| `autobyteus-ts` team capability injection | `send_message_to` reads `customData.teamContext.teamManager`. | [send-message-to.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent/message/send-message-to.ts) | Team capability should be injected separately, not embedded into session context. |
| Current Claude session context | Session context still carries team ids, member identity, teammate manifest, and recipient names. | [claude-session-context.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-context.ts) | Current ownership is mixed and should be split. |
| Current Claude turn input | Team runtime instruction is assembled from fields living on `sessionContext`. | [claude-turn-input-builder.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-turn-input-builder.ts) | Turn input builder should accept team context explicitly. |
| Current Claude team messaging | Team relay tooling reads team data from `state.sessionContext`. | [claude-send-message-tooling.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-send-message-tooling.ts) | `send_message_to` should consume team context, not session context. |
| Current team source of truth | Team-member manager already derives team runtime data and teammate manifest. | [team-member-manager.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/team-member-manager.ts) | Team runtime context should be built in team layer. |

## Current State (As-Is)

### Claude session layer currently owns three different concern sets

1. Session-owned Claude runtime data
- model
- working directory
- permission mode
- agent instruction
- configured skills

2. Team-owned member runtime data
- `teamRunId`
- `teamDefinitionId`
- `memberName`
- `memberRouteKey`
- `sendMessageToEnabled`
- `teamManifestMembers`
- `allowedRecipientNames`

3. Derived prompt-composition data
- `teamInstruction`
- teammate display lines
- recipient allowlist

These are currently collapsed into one `ClaudeSessionContext`, which makes the session layer impure and makes team tooling depend on the wrong state carrier.

## Target State (To-Be)

### 1. Split Claude runtime context into two explicit carriers

#### Session-owned context

Path:
- `src/agent-execution/backends/claude/session/claude-session-context.ts`

Target responsibility:
- Claude session identity and execution defaults only

Proposed shape:

```ts
export type ClaudeSessionContext = {
  sessionConfig: ClaudeSessionConfig;
  agentInstruction: string | null;
  configuredSkills: Skill[];
  skillAccessMode: SkillAccessMode | null;
};
```

Notes:
- `resolvedClaudeSessionConfig` should be shortened to `sessionConfig`.
- `teamInstruction` moves out.
- all team/member fields move out.

#### Team-owned context

Path:
- `src/agent-team-execution/backends/claude/claude-session-team-context.ts`

Target responsibility:
- Claude team-member runtime identity and teammate-routing information

Proposed shape:

```ts
export type ClaudeSessionTeamContext = {
  teamRunId: string;
  teamDefinitionId: string;
  memberName: string;
  memberRouteKey: string;
  teamInstruction: string | null;
  sendMessageToEnabled: boolean;
  teamManifestMembers: TeamManifestMetadataMember[];
  allowedRecipientNames: string[];
};
```

Notes:
- `allowedRecipientNames` remains derived from `teamManifestMembers`.
- `teamInstruction` belongs here because it is team-definition-derived.

### 2. Make team context optional at the session runtime boundary

`ClaudeSession` and `ClaudeRunSessionState` should carry:

```ts
type ClaudeRunSessionState = {
  runId: string;
  autoExecuteTools: boolean;
  sessionContext: ClaudeSessionContext;
  teamContext: ClaudeSessionTeamContext | null;
  activeTurnId: string | null;
};
```

Why:
- single-agent runs do not need team context
- team-member runs do
- optional injection keeps the individual runtime path pure

### 3. Move Claude team-context assembly under `agent-team-execution`

Current smell:
- [claude-session-bootstrapper.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts) reads team metadata and resolves `teamInstruction`
- [claude-session-team-metadata.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-team-metadata.ts) lives in the session folder even though it is team parsing logic

Target:
- keep `ClaudeSessionBootstrapper` session-only
- add a team-owned builder/hydrator, for example:
  - `src/agent-team-execution/backends/claude/claude-session-team-context-builder.ts`

That builder should own:
- parsing any persisted team runtime metadata that still remains
- resolving `teamInstruction` from `AgentTeamDefinitionService`
- building `teamManifestMembers` from team definitions or team member bindings
- deriving `allowedRecipientNames`
- deciding `sendMessageToEnabled`

### 4. Narrow the persisted Claude runtime metadata contract

Current persisted metadata still carries more than runtime identity.

Target rule:
- persist only the minimum team restore identity needed to reconnect a Claude member run to a team run
- do not persist derived prompt/runtime values

Values that should no longer be treated as Claude session metadata:
- `teamInstruction`
- `agentInstruction`
- `allowedRecipientNames`
- teammate display rows derived purely for prompt rendering

Values that should be reconsidered and preferably derived rather than persisted:
- `sendMessageToEnabled`
- `teamManifestMembers`

Preferred persisted team restore identity:
- `teamRunId`
- `teamDefinitionId`
- `memberRouteKey`
- `memberName`

If implementation needs a temporary intermediate step, `teamManifestMembers` can remain persisted briefly, but the target architecture should not require it.

### 5. Keep `send_message_to` fully team-owned

Current state:
- [claude-send-message-tooling.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-send-message-tooling.ts) is already in the correct subsystem
- but it reads team fields from `state.sessionContext`

Target:
- `claude-send-message-tooling.ts` accepts `teamContext` directly
- it should not read any team-routing state from `sessionContext`

This keeps the feature ownership correct:
- team feature
- team-owned data
- team-owned file placement

### 6. Re-home teammate runtime instruction composition

Current state:
- [member-run-instruction-composer.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/runtime-execution/member-run-instruction-composer.ts) is under generic `runtime-execution`
- but its logic is specifically about team-member instruction composition and `send_message_to`

Target:
- move it under `agent-team-execution`, or
- keep it as a generic utility only if it stops depending on team-owned metadata conventions

Preferred target:
- `src/agent-team-execution/runtime/member-run-instruction-composer.ts`

## Change Inventory (Delta)

| Change ID | Change Type | Current Path | Target Path | Responsibility |
| --- | --- | --- | --- | --- |
| C-001 | Modify | `src/agent-execution/backends/claude/session/claude-session-context.ts` | same | Slim `ClaudeSessionContext` to session-owned fields only. |
| C-002 | Add | N/A | `src/agent-team-execution/backends/claude/claude-session-team-context.ts` | Team-owned Claude runtime context type. |
| C-003 | Add | N/A | `src/agent-team-execution/backends/claude/claude-session-team-context-builder.ts` | Build/hydrate optional team context. |
| C-004 | Modify | `src/agent-execution/backends/claude/claude-runtime-shared.ts` | same | Add optional `teamContext` to Claude runtime state. |
| C-005 | Modify | `src/agent-execution/backends/claude/session/claude-session.ts` | same | Hold `sessionContext` plus optional `teamContext`. |
| C-006 | Modify | `src/agent-execution/backends/claude/session/claude-turn-input-builder.ts` | same | Consume session context and team context separately. |
| C-007 | Modify | `src/agent-team-execution/backends/claude/claude-send-message-tooling.ts` | same | Read team routing state from `teamContext`, not `sessionContext`. |
| C-008 | Modify | `src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts` | same | Build session-only context; stop assembling team-owned context. |
| C-009 | Rename/Move | `src/agent-execution/backends/claude/session/claude-session-team-metadata.ts` | team-owned builder or metadata helper under `agent-team-execution/backends/claude` | Remove team metadata helpers from session folder. |
| C-010 | Modify | `src/agent-team-execution/services/team-member-manager.ts` | same | Build team context inputs and reduce persisted derived metadata. |
| C-011 | Modify | `src/run-history/store/agent-run-manifest-record-types.ts` | same | Narrow Claude team runtime metadata to minimum restore identity. |
| C-012 | Rename/Move | `src/runtime-execution/member-run-instruction-composer.ts` | `src/agent-team-execution/runtime/member-run-instruction-composer.ts` | Move team-runtime-specific composition out of generic runtime folder. |

## File And Module Responsibilities

| File/Module | Responsibility | Key APIs |
| --- | --- | --- |
| `src/agent-execution/backends/claude/session/claude-session-context.ts` | Session-owned Claude runtime context only. | `buildClaudeSessionContext` |
| `src/agent-team-execution/backends/claude/claude-session-team-context.ts` | Team-owned Claude member runtime context. | type exports only |
| `src/agent-team-execution/backends/claude/claude-session-team-context-builder.ts` | Build optional Claude team context from team ids, definitions, manifest, and runtime reference. | `buildClaudeSessionTeamContext` |
| `src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts` | Build session-only Claude bootstrap result. | `bootstrap` |
| `src/agent-execution/backends/claude/session/claude-session.ts` | Execute Claude turns using session context and optional team context. | `sendTurn`, `injectInterAgentEnvelope`, `getRuntimeReference` |
| `src/agent-execution/backends/claude/session/claude-turn-input-builder.ts` | Compose per-turn Claude input from explicit session and team inputs. | `buildClaudeTurnInput` |
| `src/agent-team-execution/backends/claude/claude-send-message-tooling.ts` | Team relay tooling and dynamic tool exposure. | `buildClaudeTeamMcpServers`, relay handlers |
| `src/agent-team-execution/services/team-member-manager.ts` | Team member runtime orchestration and team context source-of-truth assembly. | `createMemberRuntimeSessions`, `restoreMemberRuntimeSessions` |

## Data Workflow (Future-State Data-Flow Spines)

### Spine A: Single-Agent Claude Run Create / Restore

1. Outer layer builds `AgentRunConfig`.
2. [ClaudeAgentRunBackendFactory](/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-backend-factory.ts) calls session bootstrap only.
3. `ClaudeSessionBootstrapper` resolves:
   - working directory
   - agent definition
   - agent instruction
   - configured skills
   - permission mode
4. Bootstrapper returns:
   - `sessionContext`
   - `autoExecuteTools`
5. Session manager creates/restores `ClaudeSession` with:
   - `sessionContext`
   - `teamContext = null`
6. Claude session executes with no team-specific branches.

### Spine B: Claude Team-Member Run Create / Restore

1. Team layer creates or restores member-runtime sessions through [TeamMemberManager](/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/team-member-manager.ts).
2. Team layer resolves:
   - `teamRunId`
   - `teamDefinitionId`
   - `memberName`
   - `memberRouteKey`
   - teammate manifest
   - current `send_message_to` capability
   - `teamInstruction`
3. Team layer builds `ClaudeSessionTeamContext`.
4. Claude backend factory builds `ClaudeSessionContext` separately.
5. Session manager creates/restores `ClaudeSession` with both contexts.
6. Team binding registry remains the parent source of truth for member membership and routing.

### Spine C: Claude Turn Input Assembly

1. `ClaudeSession.sendTurn(...)` prepares turn execution.
2. `ClaudeTurnInputBuilder` receives:
   - `sessionContext`
   - `teamContext`
   - raw user content
   - `sendMessageToToolingEnabled`
3. If `teamContext` is present, team runtime instruction is composed from:
   - `teamInstruction`
   - `memberName`
   - `teamManifestMembers`
   - `sendMessageToEnabled`
4. Agent instruction and configured-skill content come from `sessionContext`.
5. Final Claude input is emitted with clean ownership boundaries.

### Spine D: Claude `send_message_to` Team Relay

1. Claude tool-use path invokes [claude-send-message-tooling.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-send-message-tooling.ts).
2. Tooling reads team identity and routing from `teamContext`, not `sessionContext`.
3. Tooling dispatches relay request using:
   - `teamRunId`
   - `memberName`
   - `recipient_name`
   - current turn id
4. Team runtime relay service delivers to the target member.
5. Session layer stays unaware of teammate-routing data beyond holding optional injected `teamContext`.

### Spine E: Runtime Reference Persistence / Restore

1. Claude session runtime reference persists session-owned state only:
   - session id
   - session-owned metadata that is truly part of runtime identity
2. Team layer persists minimal team restore identity separately in the runtime metadata envelope only as needed.
3. On restore:
   - session bootstrap recomputes session-only derived values
   - team context builder recomputes team-derived values from team ids, manifest, and definitions
4. Derived values do not round-trip through metadata just to be read back into memory.

## Boundary Rules

### Rule 1: Session layer cannot be the owner of team identity

The Claude session layer may carry an optional injected team context, but it must not define the team-owned domain model as part of its session-owned context.

### Rule 2: Team features must read team data from team-owned context

If a file owns team behavior, it should not read team state from a session-owned context object.

### Rule 3: Derived prompt/runtime values should not be treated as persisted runtime identity

If a value can be recomputed from:
- agent definition
- team definition
- team manifest/member bindings

then it should not be persisted as the main source of truth.

## Recommended Implementation Order

1. Slim `ClaudeSessionContext` and add `ClaudeSessionTeamContext`.
2. Update `ClaudeRunSessionState` and `ClaudeSession` to carry optional `teamContext`.
3. Refactor `claude-turn-input-builder.ts` and `claude-send-message-tooling.ts` to use the split contexts.
4. Move team metadata parsing/building out of the Claude session folder.
5. Narrow persisted Claude team runtime metadata and remove remaining derived values from that contract.
6. Move `member-run-instruction-composer.ts` into team-owned runtime placement if the code still remains team-specific after the split.

## Open Questions

1. Should `sendMessageToEnabled` be persisted at all?
- Preferred answer: no, derive it from current agent definition/tool exposure in team layer.

2. Should `teamManifestMembers` be persisted at all?
- Preferred answer: no, rebuild it from team member bindings + agent definitions during create/restore.

3. Does `ClaudeAgentRunBackendFactory` need an explicit optional team-context input?
- Most likely yes, if we want to keep session bootstrap pure and avoid re-parsing team metadata inside the session layer.
