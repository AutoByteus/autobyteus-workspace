# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Large`
- Call Stack Version: `v1`
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
│           ├── [ASYNC] @anthropic-ai/claude-agent-sdk:query(...resume/session options...)
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
[ERROR] SDK query failure
claude-agent-sdk-runtime-service.ts:sendTurn(...)
└── emitRuntimeEvent("error", { code, message }) -> mapped to ServerMessageType.ERROR
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

### Primary Path

```text
[ENTRY] tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts + claude-team-*.e2e.test.ts
├── live runtime gate enabled (`RUN_CLAUDE_E2E=1`, `CLAUDE_AGENT_SDK_ENABLED=1`)
├── GraphQL + websocket transport checks execute against real Claude runtime sessions
├── supported-path checks assert create/send/continue/projection/workspace/team routing behavior
├── unsupported-path checks assert deterministic rejection behavior for Claude-only unsupported contracts
└── parity-check script verifies Claude live E2E test count equals Codex baseline count (`13`)
```

### Error Path

```text
[ERROR] parity count mismatch or failing live scenario
stage 7 gate fails -> re-entry required before stage 8 review
└── no handoff allowed until parity-count and pass-state are both satisfied
```
