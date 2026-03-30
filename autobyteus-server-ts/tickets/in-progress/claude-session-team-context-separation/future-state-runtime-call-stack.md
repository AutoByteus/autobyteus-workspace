# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v1`
- Source Artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-agent-team-support/autobyteus-server-ts/tickets/in-progress/claude-session-team-context-separation/proposed-design.md`
- Source Design Version: `v1`
- Referenced Sections: `C-001..C-012`

## Future-State Modeling Rule (Mandatory)

- This models the target-state behavior after Claude session context is split from team-owned runtime context.
- Session-owned and team-owned context carriers must remain separate in every modeled path.

## Use Case Index

- UC-001: Single-agent Claude run create/restore uses session-only context.
- UC-002: Claude team-member run create/restore injects separate team context.
- UC-003: Claude turn input is assembled from session context plus optional team context.
- UC-004: Claude `send_message_to` reads team-owned routing state from team context only.

---

## Use Case: UC-001 Single-agent Claude run create/restore uses session-only context

### Primary Runtime Call Stack

```text
[ENTRY] src/agent-execution/services/agent-run-manager.ts:createAgentRun(config) [ASYNC]
├── src/agent-execution/backends/claude/backend/claude-agent-run-backend-factory.ts:createBackend(config) [ASYNC]
│   ├── src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts:bootstrap(config) [ASYNC]
│   │   ├── resolve workspace root / working directory
│   │   ├── resolve agent definition
│   │   ├── derive agentInstruction
│   │   └── build session-only ClaudeSessionContext
│   └── src/agent-execution/backends/claude/session/claude-session-manager.ts:createRunSession(...) [ASYNC]
│       └── new ClaudeSession({ sessionContext, teamContext: null, ... })
└── live run remains team-agnostic
```

### Error Path

```text
[ERROR] agent definition lookup fails
claude-session-bootstrapper.ts:bootstrap(...)
└── throw bootstrap error before session creation
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

---

## Use Case: UC-002 Claude team-member run create/restore injects separate team context

### Primary Runtime Call Stack

```text
[ENTRY] src/agent-team-execution/services/team-member-manager.ts:createMemberRuntimeSessions(...) [ASYNC]
├── build team manifest metadata / member bindings
├── src/agent-team-execution/backends/claude/claude-session-team-context-builder.ts:buildClaudeSessionTeamContext(...) [ASYNC]
│   ├── resolve teamInstruction from AgentTeamDefinitionService
│   ├── resolve sendMessageToEnabled from agent definition / tool exposure
│   ├── derive teamManifestMembers
│   └── derive allowedRecipientNames
├── src/agent-execution/services/agent-run-manager.ts:restoreAgentRun(...) [ASYNC]
│   └── src/agent-execution/backends/claude/backend/claude-agent-run-backend-factory.ts:restoreBackend(...) [ASYNC]
│       ├── session bootstrap -> sessionContext only
│       └── session manager restore -> new ClaudeSession({ sessionContext, teamContext, ... })
└── team binding registry remains source-of-truth for member membership/routing
```

### Fallback/Error Paths

```text
[FALLBACK] non-team Claude run
team context builder not invoked
└── session created with teamContext = null
```

```text
[ERROR] team definition lookup fails
claude-session-team-context-builder.ts:buildClaudeSessionTeamContext(...)
└── emit null teamInstruction or fail-fast per builder policy
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

---

## Use Case: UC-003 Claude turn input is assembled from session context plus optional team context

### Primary Runtime Call Stack

```text
[ENTRY] src/agent-execution/backends/claude/session/claude-session.ts:sendTurn(message) [ASYNC]
├── src/agent-execution/backends/claude/session/claude-session.ts:executeTurn(...) [ASYNC]
│   ├── resolve/create SDK session
│   ├── src/agent-execution/backends/claude/session/claude-turn-input-builder.ts:buildClaudeTurnInput(...) [STATE]
│   │   ├── read agentInstruction / skills from sessionContext
│   │   ├── if teamContext != null:
│   │   │   └── compose team runtime instruction from teamInstruction, memberName, teamManifestMembers, sendMessageToEnabled
│   │   └── render final Claude input sections
│   ├── session.send(turnInput)
│   └── session.stream()
└── runtime event emission unchanged
```

### Fallback/Error Paths

```text
[FALLBACK] no teamContext and no session-owned extra instructions
buildClaudeTurnInput(...)
└── return raw user content unchanged
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `N/A`

---

## Use Case: UC-004 Claude `send_message_to` reads team-owned routing state from team context only

### Primary Runtime Call Stack

```text
[ENTRY] Claude SDK tool-use callback -> src/agent-team-execution/backends/claude/claude-send-message-tooling.ts [ASYNC]
├── validate teamContext exists
├── read teamRunId + memberName from teamContext
├── validate recipient_name / content
├── request approval if autoExecuteTools=false
├── invoke inter-agent relay handler with teamRunId, senderMemberName, senderTurnId
└── emit completion events
```

### Error Paths

```text
[ERROR] teamContext missing
claude-send-message-tooling.ts
└── return INTER_AGENT_RELAY_UNSUPPORTED or equivalent failure
```

```text
[ERROR] recipient/content invalid
claude-send-message-tooling.ts
└── reject before relay attempt
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
