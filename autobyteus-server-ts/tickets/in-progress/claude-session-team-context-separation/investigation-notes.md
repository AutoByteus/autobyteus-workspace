# Investigation Notes

## Scope

Investigate whether current Claude session runtime state improperly mixes team runtime concerns into individual session execution state, and compare the current server design against the local `autobyteus-ts` context model.

## Evidence Summary

### 1. `autobyteus-ts` keeps individual and team contexts separate

- [autobyteus-ts/src/agent/context/agent-context.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent/context/agent-context.ts)
  - `AgentContext` contains agent config, runtime state, tools, memory, workspace, and custom data.
  - It does not structurally own team member names, teammate manifests, or recipient lists.
- [autobyteus-ts/src/agent-team/context/agent-team-context.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent-team/context/agent-team-context.ts)
  - `AgentTeamContext` is the team-owned state carrier.
- [autobyteus-ts/src/agent/message/send-message-to.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-ts/src/agent/message/send-message-to.ts)
  - `send_message_to` resolves team support through `context.customData.teamContext.teamManager`.
  - This confirms the intended model: team capability is injected separately, not embedded into the core individual context type.

### 2. Current Claude session context is mixed

- [autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-context.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-context.ts)
  - `ClaudeSessionContext` currently carries:
    - `resolvedClaudeSessionConfig`
    - `teamInstruction`
    - `agentInstruction`
    - `teamRunId`
    - `teamDefinitionId`
    - `memberName`
    - `memberRouteKey`
    - `sendMessageToEnabled`
    - `teamManifestMembers`
    - `allowedRecipientNames`
    - configured skill fields
  - The listed team fields are not session-owned. They are team-runtime-owned.

### 3. Current Claude turn-input assembly depends on mixed session context

- [autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-turn-input-builder.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-turn-input-builder.ts)
  - uses `sessionContext.memberName`
  - uses `sessionContext.teamManifestMembers`
  - uses `sendMessageToToolingEnabled`
  - uses `sessionContext.teamInstruction`
  - uses `sessionContext.agentInstruction`
- This means one context object is carrying both:
  - per-session instruction/config
  - team-member runtime identity and teammate-routing data

### 4. Current Claude `send_message_to` tooling also depends on mixed session context

- [autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-send-message-tooling.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-send-message-tooling.ts)
  - reads:
    - `state.sessionContext.teamRunId`
    - `state.sessionContext.memberName`
  - That is a team feature reaching into the session context for team-owned state.

### 5. Team member manager is already the real source of team runtime data

- [autobyteus-server-ts/src/agent-team-execution/services/team-member-manager.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-team-execution/services/team-member-manager.ts)
  - resolves `send_message_to` capability from agent definition or runtime reference metadata
  - builds teammate manifest display data
  - builds team runtime metadata with:
    - `teamRunId`
    - `teamDefinitionId`
    - `memberRouteKey`
    - `memberName`
    - `sendMessageToEnabled`
    - `teamMemberManifest`
  - This is already team-layer responsibility, not Claude-session responsibility.

### 6. Claude session bootstrap still merges team/runtime metadata into session assembly

- [autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts)
  - resolves `teamInstruction` from `teamDefinitionId` found in metadata
  - merges team/runtime metadata into one `runtimeMetadata` object
  - then builds `ClaudeSessionContext` from that metadata
- This keeps the session bootstrap path aware of team-owned concerns.

## Current-State Problem Statement

The current Claude runtime shape mixes three distinct concern sets:

1. Session-owned Claude state
- model
- working directory
- permission mode
- agent instruction
- configured skills

2. Team-owned runtime state
- team run id
- team definition id
- member route key
- member name
- teammate manifest
- recipient resolution
- `send_message_to` exposure

3. Derived runtime prompt composition
- team instruction
- allowed recipient names
- teammate display lines

This is why the Claude session layer currently feels impure and too aware of team execution.

## Investigation Conclusion

The correct design direction is:

- keep `ClaudeSessionContext` session-only
- create a separate Claude team runtime context under `agent-team-execution/backends/claude`
- let team-owned tooling and turn-input composition consume the team context explicitly
- stop using `ClaudeSessionContext` as the carrier for team-member runtime identity
