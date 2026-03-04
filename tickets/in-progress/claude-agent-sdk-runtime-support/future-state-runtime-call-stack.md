# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Large`
- Call Stack Version: `v3`
- Requirements: `tickets/in-progress/claude-agent-sdk-runtime-support/requirements.md` (`Design-ready`)
- Source Artifact: `tickets/in-progress/claude-agent-sdk-runtime-support/proposed-design.md` (`v1`)

## Use Case Index

| use_case_id | Source Type | Requirement ID(s) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- |
| UC-001 | Requirement | R-001,R-004 | Create single-agent Claude runtime run | Yes/N/A/Yes |
| UC-002 | Requirement | R-005 | Send/stream Claude runtime turn | Yes/N/A/Yes |
| UC-003 | Requirement | R-006 | Interrupt/terminate Claude runtime run | Yes/N/A/Yes |
| UC-004 | Requirement | R-004 | Continue persisted Claude runtime run | Yes/N/A/Yes |
| UC-005 | Requirement | R-008 | Build run-history projection for Claude run | Yes/Yes/Yes |
| UC-006 | Requirement | R-009 | Team run external-member mode with Claude members | Yes/Yes/Yes |
| UC-007 | Requirement | R-002 | Independent runtime capability checks (codex vs claude) | Yes/N/A/Yes |
| UC-008 | Requirement | R-007 | Claude runtime model listing | Yes/N/A/Yes |
| UC-009 | Requirement | R-010 | Existing codex/autobyteus no-regression path | Yes/N/A/Yes |
| UC-010 | Requirement | R-003,R-011 | Runtime-neutral orchestration dispatch | Yes/N/A/Yes |
| UC-011 | Requirement | R-012 | Claude live E2E parity-count gate | Yes/N/A/Yes |
| UC-013 | Requirement | R-013 | External runtime listener continuity across terminate/continue | Yes/N/A/Yes |
| UC-014 | Requirement | R-014 | Claude team `send_message_to` relay tooling parity | Yes/N/A/Yes |
| UC-015 | Requirement | R-015,R-016,R-017 | Claude V2-only session/runtime execution path | Yes/N/A/Yes |
| UC-018 | Requirement | R-020 | Claude incremental streaming cadence preserved to websocket deltas | Yes/N/A/Yes |
| UC-019 | Requirement | R-021 | Team-member run-history projection selects richer external-runtime transcript on reopen | Yes/Yes/Yes |

## UC-001: Create Single-Agent Claude Runtime Run

### Primary Path

```text
[ENTRY] src/api/graphql/types/agent-run.ts:sendAgentUserInput(input)
├── src/runtime-management/runtime-kind.ts:normalizeRuntimeKind("claude_agent_sdk")
├── [ASYNC] src/runtime-execution/runtime-composition-service.ts:createAgentRun(...)
│   ├── src/runtime-execution/runtime-adapter-registry.ts:resolveAdapter("claude_agent_sdk")
│   ├── [ASYNC] src/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.ts:createAgentRun(...)
│   │   └── [ASYNC] src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts:createRunSession(runId,...)
│   └── src/runtime-execution/runtime-session-store.ts:upsertSession(...)
└── src/runtime-execution/runtime-command-ingress-service.ts:bindRunSession(...)
```

### Error Path

```text
[ERROR] Runtime disabled/unavailable
runtime-composition-service.ts:assertRuntimeAvailableForCreateOrRestore("claude_agent_sdk")
└── throws with deterministic runtime-capability reason
```

## UC-002: Send/Stream Claude Runtime Turn

### Primary Path

```text
[ENTRY] src/services/agent-streaming/agent-stream-handler.ts:handleSendMessage(runId,payload)
├── src/runtime-execution/runtime-command-ingress-service.ts:sendTurn(runId,"agent",message)
│   ├── runtime-command-ingress-service.ts:resolveSession(runId,"agent")
│   └── [ASYNC] claude-agent-sdk-runtime-adapter.ts:sendTurn(...)
│       └── [ASYNC] claude-agent-sdk-runtime-service.ts:sendTurn(runId,message)
│           ├── [ASYNC] claude-runtime-v2-session-invoker.ts:resolveOrCreateSession(...)
│           │   ├── @anthropic-ai/claude-agent-sdk:unstable_v2_createSession(...) or unstable_v2_resumeSession(...)
│           │   └── claude-runtime-v2-control-interop.ts:resolveSessionControls(...)
│           ├── [ASYNC] claude-runtime-v2-control-interop.ts:configureDynamicMcpServers(...) when team relay is enabled
│           ├── claude-runtime-turn-preamble.ts:buildTeamAwareTurnPreamble(runtimeMetadata)
│           ├── [ASYNC] SDKSession.send(...)
│           ├── [ASYNC] SDKSession.stream()
│           ├── claude-runtime-message-normalizers.ts:normalizeClaudeStreamChunk(...) [delta-priority, fallback-suppression when delta already emitted]
│           ├── claude-agent-sdk-runtime-service.ts:emitRuntimeEvent("turn/started")
│           ├── claude-agent-sdk-runtime-service.ts:emitRuntimeEvent("assistant/delta", ...)
│           └── claude-agent-sdk-runtime-service.ts:emitRuntimeEvent("turn/completed")
├── agent-stream-handler.ts:startExternalRuntimeStreamLoop(...)
│   ├── src/runtime-execution/external-runtime-event-source-registry.ts:resolveSource("claude_agent_sdk")
│   ├── source.subscribeToRunEvents(runId,...)
│   └── src/services/agent-streaming/runtime-event-message-mapper.ts:map(claudeRuntimeEvent)
└── websocket sends mapped `ServerMessage`
```

### Error Path

```text
[ERROR] SDK V2 turn execution failure
claude-agent-sdk-runtime-service.ts:sendTurn(...)
└── emitRuntimeEvent("error", { code, message }) -> mapped to ServerMessageType.ERROR
```

## UC-018: Preserve Incremental Streaming Cadence

### Primary Path

```text
[ENTRY] claude-agent-sdk-runtime-service.ts:executeV2Turn(...)
├── [ASYNC] session.stream() yields chunk[n]
├── claude-runtime-message-normalizers.ts:normalizeClaudeStreamChunk(chunk[n], context)
│   ├── extract incremental delta text when present
│   ├── mark turn/item delta-emitted state
│   └── suppress full-message fallback payload for same item once delta-emitted=true
├── claude-agent-sdk-runtime-service.ts:emitRuntimeEvent("item/outputText/delta", ...)
├── runtime-event-message-mapper.ts:map(...) -> `SEGMENT_CONTENT`
└── websocket delivers multiple incremental `SEGMENT_CONTENT` before terminal `SEGMENT_END`
```

### Error Path

```text
[ERROR] chunk has neither delta nor deterministic fallback text
claude-runtime-message-normalizers.ts:normalizeClaudeStreamChunk(...)
└── returns null (no-op emission) and stream continues without synthetic buffering hacks
```

## UC-003: Interrupt/Terminate Claude Runtime Run

### Primary Path

```text
[ENTRY] src/runtime-execution/runtime-command-ingress-service.ts:interruptRun/terminateRun(...)
├── runtime-adapter-registry.ts:resolveAdapter("claude_agent_sdk")
└── [ASYNC] claude-agent-sdk-runtime-adapter.ts:interruptRun/terminateRun(...)
    └── [ASYNC] claude-agent-sdk-runtime-service.ts:interruptRun/terminateRun(...)
        ├── activeQuery.interrupt()/close()
        └── emitRuntimeEvent("turn/interrupted" or "session/terminated")
```

### Error Path

```text
[ERROR] No active turn/session
claude-agent-sdk-runtime-service.ts:requireSession(runId)
└── returns command rejection (`RUN_SESSION_NOT_FOUND`/`NO_ACTIVE_TURN`)
```

## UC-004: Continue Persisted Claude Runtime Run

### Primary Path

```text
[ENTRY] src/run-history/services/run-continuation-service.ts:continueRun(input)
├── run-continuation-service.ts:continueExistingRun(runId,...)
├── [ASYNC] runtime-composition-service.ts:restoreAgentRun(...runtimeKind="claude_agent_sdk"...)
│   └── [ASYNC] claude-agent-sdk-runtime-adapter.ts:restoreAgentRun(...)
│       └── [ASYNC] claude-agent-sdk-runtime-service.ts:restoreRunSession(runId, runtimeReference)
├── runtime-command-ingress-service.ts:bindRunSession(restoredSession)
├── [ASYNC] runtime-command-ingress-service.ts:sendTurn(...)
└── run-history/services/run-history-service.ts:upsertRunHistoryRow(...ACTIVE...)
```

### Error Path

```text
[ERROR] Manifest/runtime reference invalid
run-continuation-service.ts:mergeInactiveOverrides(...)
└── deterministic throw with invalid runtime/manifest message
```

## UC-005: Build Claude Run-History Projection

### Primary Path

```text
[ENTRY] src/run-history/services/run-projection-service.ts:getProjection(runId)
├── run-manifest-store.ts:readManifest(runId)
├── run-projection-provider-registry.ts:resolveProvider("claude_agent_sdk")
└── [ASYNC] run-history/projection/providers/claude-session-run-projection-provider.ts:buildProjection(...)
    ├── [ASYNC] @anthropic-ai/claude-agent-sdk:getSessionMessages(sessionId,...)
    ├── claude-session-run-projection-provider.ts:transformMessagesToConversation(...)
    └── run-projection-utils.ts:buildRunProjection(runId,conversation)
```

### Fallback Path

```text
[FALLBACK] Claude provider returns empty conversation
run-projection-service.ts:resolveFallbackProvider()
└── local-memory provider attempted as fallback per registry policy
```

### Error Path

```text
[ERROR] Provider failure
run-projection-service.ts:tryBuildProjection(provider,...)
└── warning logged, returns empty projection deterministically
```

## UC-019: Team-Member Run-History Rehydration Completeness (External Runtime)

### Primary Path

```text
[ENTRY] src/api/graphql/types/team-run-history.ts:getTeamMemberRunProjection(teamRunId, memberRouteKey)
└── [ASYNC] src/run-history/services/team-member-run-projection-service.ts:getProjection(...)
    ├── [ASYNC] team-member-memory-projection-reader.ts:getProjection(teamRunId, memberRunId)
    ├── resolve runtime provider by binding.runtimeKind (non-autobyteus)
    ├── [ASYNC] runtime provider buildProjection(...)
    │   └── claude-session-run-projection-provider.ts:getSessionMessages(sessionId)
    ├── projection arbitration: choose richer projection (conversation cardinality priority)
    └── return projection used by frontend run-history hydration
```

### Fallback Path

```text
[FALLBACK] Runtime projection unavailable/error/empty
team-member-run-projection-service.ts:getProjection(...)
└── return local member-memory projection when available
```

### Error Path

```text
[ERROR] Both local and runtime projections unavailable
team-member-run-projection-service.ts:getProjection(...)
└── throw deterministic projection-unavailable error with source context
```

## UC-006: Team External-Member Mode With Claude Members

### Primary Path

```text
[ENTRY] src/api/graphql/services/team-run-mutation-service.ts:ensureTeamCreated(...)
├── resolveTeamRuntimeMode(memberConfigs)
│   └── returns "external_member_runtime" when runtimeKind != "autobyteus"
├── [ASYNC] team-member-runtime-orchestrator.ts:createExternalMemberSessions(...)
│   ├── [ASYNC] runtime-composition-service.ts:restoreAgentRun(...memberRunId, runtimeKind="claude_agent_sdk")
│   └── team-runtime-binding-registry.ts:upsertTeamBindings(teamRunId,"external_member_runtime",...)
├── [ASYNC] team-run-history-service.ts:upsertTeamRunHistoryRow(...)
└── send path: team-member-runtime-orchestrator.ts:sendToMember(...)
    └── runtime-command-ingress-service.ts:sendTurn(memberRunId,"agent",...)
```

### Fallback Path

```text
[FALLBACK] runtimeKind == "autobyteus"
team-run-mutation-service.ts:resolveTeamRuntimeMode(...)
└── uses existing autobyteus team manager path
```

### Error Path

```text
[ERROR] mixed runtime kinds in one team
team-run-mutation-service.ts:resolveTeamRuntimeMode(...)
└── throws [MIXED_TEAM_RUNTIME_UNSUPPORTED]
```

## UC-007: Independent Runtime Capability Checks

### Primary Path

```text
[ENTRY] src/api/graphql/types/runtime-capability.ts:runtimeCapabilities()
└── runtime-capability-service.ts:listRuntimeCapabilities()
    ├── resolveCapability("codex_app_server") via codex descriptor
    └── resolveCapability("claude_agent_sdk") via claude descriptor
```

### Error Path

```text
[ERROR] invalid env override
runtime-capability-service.ts:resolveEnvOverride(...)
└── capability row returns enabled=false + deterministic invalid-value reason
```

## UC-008: Claude Runtime Model Listing

### Primary Path

```text
[ENTRY] src/api/graphql/types/llm-provider.ts:availableLlmProvidersWithModels(runtimeKind)
└── runtime-model-catalog-service.ts:listLlmModels("claude_agent_sdk")
    ├── resolveProvider("claude_agent_sdk")
    └── [ASYNC] claude-runtime-model-provider.ts:listLlmModels()
        └── [ASYNC] claude-agent-sdk-runtime-service.ts:listModels()
```

### Error Path

```text
[ERROR] runtime model provider missing
runtime-model-catalog-service.ts:resolveProvider(...)
└── throws deterministic provider-not-configured error
```

## UC-009: Codex/Autobyteus No-Regression

### Primary Path

```text
[ENTRY] Existing codex/autobyteus run/team/graphql paths
└── unchanged runtime-kind dispatch still resolves existing adapters/providers
```

### Error Path

```text
[ERROR] runtime-specific probe disabled
capability gating rejects create/send for disabled runtime only
└── unaffected runtimes continue to operate
```

## UC-010: Runtime-Neutral Orchestration Dispatch

### Primary Path

```text
[ENTRY] shared runtime orchestrators (stream handlers, team mode selector, projection fallback)
├── runtime-kind-driven registry lookups
├── no codex-only checks for generic external runtime behavior
└── codex-specific relay logic invoked only inside codex modules
```

### Error Path

```text
[ERROR] source/provider not registered for runtime kind
registry resolve throws deterministic runtime-kind missing message
└── surfaced as runtime command/projection error without implicit codex fallback
```

## UC-011: Claude Live E2E Parity-Count Gate

## UC-013: External Runtime Listener Continuity Across Terminate/Continue

### Primary Path

```text
[ENTRY] Existing websocket session subscribes to external runtime run events
├── agent/team stream handlers call external runtime source subscribe(runId, listener)
├── runtime service persists listener by runId even if session is later closed
├── terminate/close removes runtime session state but keeps deferred listeners for runId
├── continue/restore recreates runtime session for same runId
└── runtime service rebinds deferred listeners to restored session before/at turn emission
    └── websocket receives AGENT_STATUS + SEGMENT_* events for post-continue send
```

### Error Path

```text
[ERROR] Listener continuity not preserved across close/restore
terminate->continue send accepted but websocket receives no runtime events
└── Stage 7 live E2E fails on explicit running/idle/output assertion
```

### Primary Path

```text
[ENTRY] tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts + claude-team-*.e2e.test.ts
├── live runtime gate enabled (`RUN_CLAUDE_E2E=1`, `CLAUDE_AGENT_SDK_ENABLED=1`)
├── GraphQL + websocket transport checks execute against real Claude runtime sessions
├── supported-path checks assert create/send/continue/projection/workspace/team routing behavior
├── team relay checks assert tool-call lifecycle and recipient delivery for `send_message_to`
└── parity-check script verifies Claude live E2E test count equals Codex baseline count (`13`)
```

### Error Path

```text
[ERROR] parity count mismatch or failing live scenario
stage 7 gate fails -> re-entry required before stage 8 review
└── no handoff allowed until parity-count and pass-state are both satisfied
```

## UC-014: Claude Team `send_message_to` Relay Tooling Parity

### Primary Path

```text
[ENTRY] team-member-runtime-orchestrator.ts:createExternalMemberSessions(...)
├── runtimeReference.metadata includes teamRunId/memberName/sendMessageToEnabled/teamMemberManifest
├── claude-agent-sdk-runtime-adapter.ts:restoreAgentRun(...)
│   └── claude-agent-sdk-runtime-service.ts:restoreRunSession(...runtimeMetadata)
├── send turn path: claude-agent-sdk-runtime-service.ts:sendTurn(...)
│   ├── builds teammate-aware turn preamble from runtime metadata
│   ├── registers in-process MCP server with custom `send_message_to` tool
│   └── applies MCP dynamic registration via V2 session-control interop
├── Claude calls `send_message_to` MCP tool
│   └── claude-agent-sdk-runtime-service.ts tool handler -> team-member-runtime-orchestrator relay handler
├── team-member-runtime-orchestrator.ts:relayInterAgentMessage(...)
│   └── runtime-command-ingress-service.ts:relayInterAgentMessage(recipientRunId,envelope)
│       └── recipient runtime adapter `relayInterAgentMessage` injects inter-agent envelope
└── team websocket bridge emits:
    ├── sender `SEGMENT_START/SEGMENT_END` for tool call metadata
    └── recipient `INTER_AGENT_MESSAGE` with sender/recipient/content payload
```

### Error Path

```text
[ERROR] relay handler unavailable or recipient unresolved
Claude MCP tool handler returns deterministic error payload/code
└── sender emits tool-call completion metadata with error and no false success claim
```

## UC-015: Claude V2-Only Session/Runtime Execution Path

### Primary Path

```text
[ENTRY] claude-agent-sdk-runtime-service.ts:createRunSession/restoreRunSession/sendTurn
├── claude-runtime-v2-session-invoker.ts:createOrResumeSession(...)
│   ├── @anthropic-ai/claude-agent-sdk:unstable_v2_createSession(...)
│   └── @anthropic-ai/claude-agent-sdk:unstable_v2_resumeSession(...)
├── claude-runtime-v2-control-interop.ts:resolveSessionControls(session)
├── claude-runtime-v2-control-interop.ts:configureDynamicMcpServers(...) when tooling is required
├── claude-runtime-turn-preamble.ts:prepend teammate context onto outgoing user turn payload
└── claude-agent-sdk-runtime-service.ts:consume SDKSession.stream() and normalize into runtime events
```

### Error Path

```text
[ERROR] required V2 control capability unavailable on session object
claude-runtime-v2-control-interop.ts:requireControlMethod(...)
└── throws deterministic `CLAUDE_V2_CONTROL_UNAVAILABLE` runtime error and aborts turn dispatch
```

## UC-016: Claude V2 Workspace CWD Propagation

### Primary Path

```text
[ENTRY] claude-agent-sdk-runtime-service.ts:resolveOrCreateV2Session(state,...)
├── forwards `state.workingDirectory` into claude-runtime-v2-control-interop.ts:createOrResumeClaudeV2Session(...)
├── interop acquires serialized session-creation critical section
├── interop temporarily scopes `process.cwd()` to run workspace path
├── invokes SDK V2 create/resume API while cwd scope is active
├── restores original `process.cwd()` immediately after API call
└── returns validated session/control handles for normal turn flow
```

### Error Path

```text
[ERROR] workspace path cannot be activated for cwd-scoped V2 session create/resume
claude-runtime-v2-control-interop.ts fails deterministic cwd scope setup
└── emits `CLAUDE_V2_WORKING_DIRECTORY_INVALID` and fails turn start without silent fallback to wrong cwd
```
