# Proposed-Design-Based Future-State Runtime Call Stack

## Call Stack Version

- Current Version: `v41`
- Basis Design Version: `v40`
- Updated On: `2026-02-24`

## Scope

- UC-001: Create run with runtime kind selection.
- UC-002: Send user turn through runtime command ingress.
- UC-003: Continue inactive run via runtime reference.
- UC-004: Stop generation via runtime interrupt.
- UC-005: Team approval/denial via personal direct routing.
- UC-006: Runtime event to websocket mapping with persistence.
- UC-007: Runtime-scoped model listing/reload/preload.
- UC-008: Runtime transport/session failure handling.
- UC-009: Codex method-level compatibility mapping and alias normalization.
- UC-010: Frontend runtime selector and `runtimeKind` propagation.
- UC-011: Existing-run runtime immutability lock parity.
- UC-012: Terminate lifecycle completeness.
- UC-013: Reopen/reconnect live-handoff completeness.
- UC-014: Runtime-status alias parity between websocket mapping and run-history lifecycle persistence.
- UC-015: Runtime event adaptation and segment-flow strictness (backend-owned Codex adapter + canonical core `SEGMENT_EVENT` flow + out-of-order recovery).
- UC-016: Codex history replay and continue-chat parity via backend projection hydration from Codex thread APIs.
- UC-017: Codex thinking metadata/config parity (model label + schema + turn effort propagation).
- UC-018: Codex history transformation completeness (ordering + tool/result stitching + runtime-agnostic projection entries).
- UC-019: Codex model metadata normalization completeness (reasoning enum/default validation + display naming parity).
- UC-020: Codex reasoning effort lifecycle parity (persist -> restore/session-default -> send-turn application).
- UC-021: Reopen reasoning-config reconciliation parity (persisted config/schema drift handling with schema-driven sanitization).
- UC-022: Continuation manifest source-of-truth parity (inactive-run restore uses manifest model/thinking config defaults).
- UC-023: Runtime capability gating parity (backend-owned runtime availability metadata + selector gating + ingress fail-fast guard).
- UC-024: Runtime degradation command/read policy parity (operation-scoped capability policy for write-plane vs safety/read-plane flows).

## UC-001 Create Run With Runtime Kind Selection

### Primary Path

```text
[ENTRY] autobyteus-web/stores/agentRunStore.ts:sendUserInputAndSubscribe()
  -> GraphQL mutation ContinueRun(input.runtimeKind)
  -> src/api/graphql/types/run-history.ts:RunHistoryResolver.continueRun(...)
  -> src/run-history/services/run-continuation-service.ts:continueRun(...)
  -> src/run-history/services/run-continuation-service.ts:createAndContinueNewRun(...)
  -> src/runtime-execution/runtime-composition-service.ts:createAgentRun(...)
  -> src/runtime-execution/runtime-adapter-registry.ts:resolveAdapter(runtimeKind)
  -> src/runtime-execution/adapters/{autobyteus|codex-app-server}-runtime-adapter.ts:createAgentRun(...)
  -> src/runtime-execution/runtime-session-store.ts:upsertSession(...)
  -> src/runtime-execution/runtime-command-ingress-service.ts:bindRunSession(...)
  -> src/run-history/store/run-manifest-store.ts:writeManifest(...)
  -> src/run-history/services/run-history-service.ts:upsertRunHistoryRow(...)
  -> src/runtime-execution/runtime-command-ingress-service.ts:sendTurn(...)
[EXIT] runId returned, run active
```

### Fallback/Error Path

```text
[FALLBACK] runtimeKind missing/invalid
  -> src/runtime-management/runtime-kind.ts:normalizeRuntimeKind(...)
  -> default runtimeKind = autobyteus

[ERROR] adapter create/send rejected
  -> RuntimeCommandIngressService returns accepted=false + code/message
  -> continueRun resolver returns success=false
```

### Coverage Status

- Primary: `Yes`
- Fallback: `Yes`
- Error: `Yes`

## UC-002 Send User Turn Through Runtime Command Ingress

### Primary Path

```text
[ENTRY] src/services/agent-streaming/agent-stream-handler.ts:handleSendMessage(...)
  -> build AgentInputUserMessage
  -> src/runtime-execution/runtime-command-ingress-service.ts:sendTurn(...)
  -> resolveSession(runId, mode)
  -> adapterRegistry.resolveAdapter(session.runtimeKind).sendTurn(...)
  -> adapter forwards to runtime implementation
[EXIT] accepted=true
```

### Fallback/Error Path

```text
[ERROR] no session found
  -> code RUN_SESSION_NOT_FOUND

[ERROR] runtime adapter throws
  -> code RUNTIME_COMMAND_FAILED (or adapter-specific failure code)
```

### Coverage Status

- Primary: `Yes`
- Fallback: `Yes`
- Error: `Yes`

## UC-003 Continue Inactive Run Via Runtime Reference

### Primary Path

```text
[ENTRY] RunHistoryResolver.continueRun(runId=existing)
  -> RunContinuationService.continueExistingRun(...)
  -> active session check (runtime + legacy local)
  -> read manifest: RunManifestStore.readManifest(...)
  -> validate/migrate manifest: RuntimeManifestMigrationService.migrateAndValidate(...)
  -> merge inactive overrides (runtime kind immutable)
  -> RuntimeCompositionService.restoreAgentRun(...)
  -> RuntimeCommandIngressService.bindRunSession(...)
  -> RunManifestStore.writeManifest(...)
  -> RuntimeCommandIngressService.sendTurn(...)
[EXIT] run restored and continued
```

### Fallback/Error Path

```text
[FALLBACK] codex session record exists but process/session is stale
  -> RuntimeCompositionService.removeRunSession(...)
  -> proceed with restore path

[ERROR] runtime kind change requested on existing run
  -> throw "Runtime kind cannot be changed for an existing run."
```

### Coverage Status

- Primary: `Yes`
- Fallback: `Yes`
- Error: `Yes`

## UC-004 Stop Generation Via Runtime Interrupt

### Primary Path

```text
[ENTRY] websocket STOP_GENERATION
  -> agent-stream-handler.ts:handleStopGeneration(...)
  -> RuntimeCommandIngressService.interruptRun(...)
  -> adapter.interruptRun(...)
    autobyteus adapter -> agent.stop()/team.stop()
    codex adapter -> CodexAppServerRuntimeService.interruptRun(turnId)
[EXIT] accepted=true
```

### Error Path

```text
[ERROR] no active turn id for codex interrupt
  -> Codex runtime service throws
  -> ingress returns accepted=false + error code
```

### Coverage Status

- Primary: `Yes`
- Fallback: `N/A`
- Error: `Yes`

## UC-005 Team Approval/Denial With Personal Direct Routing

### Primary Path

```text
[ENTRY] agent-team-stream-handler.ts:handleToolApproval(...)
  -> parse invocation_id
  -> resolve approvalTarget from payload in order:
     agent_name | target_member_name | agent_id
  -> RuntimeCommandIngressService.approveTool(...approvalTarget, approvalTargetSource)
  -> AutobyteusRuntimeAdapter.approveTool(...)
  -> team.postToolExecutionApproval(memberName, invocationId, approved, reason)
[EXIT] approval routed to team runtime
```

### Fallback/Error Path

```text
[ERROR] invocation_id missing
  -> request ignored with warning

[ERROR] approvalTarget missing for team mode
  -> code APPROVAL_TARGET_REQUIRED
```

### Coverage Status

- Primary: `Yes`
- Fallback: `Yes`
- Error: `Yes`

## UC-006 Runtime Event Normalization To Websocket With Persistence

### Primary Path

```text
[ENTRY] src/api/websocket/agent.ts route connect
  -> AgentStreamHandler.connect(...)
  -> codex runtime session detected
  -> AgentStreamHandler.startCodexStreamLoop(...)
  -> CodexAppServerRuntimeService.subscribeToRunEvents(runId, listener)
  -> AgentStreamHandler.forwardCodexRuntimeEvent(...)
     -> RunHistoryService.onRuntimeEvent(runId, event)   [PERSIST FIRST]
        -> src/runtime-execution/codex-app-server/codex-runtime-method-normalizer.ts:normalizeCodexRuntimeMethod(...)
     -> RuntimeEventMessageMapper.map(event)
     -> connection.send(serverMessage)
[EXIT] runtime event persisted and streamed
```

### Fallback/Error Path

```text
[FALLBACK] pre-connect websocket message
  -> websocket route returns ERROR code SESSION_NOT_READY

[ERROR] mapping/forwarding exception
  -> logged in handler; websocket loop stays alive
```

### Coverage Status

- Primary: `Yes`
- Fallback: `Yes`
- Error: `Yes`

## UC-007 Runtime-Scoped Model Listing/Reload/Preload

### Primary Path

```text
[ENTRY] GraphQL availableLlmProvidersWithModels(runtimeKind)
  -> LlmProviderResolver.availableLlmProvidersWithModels(...)
  -> RuntimeModelCatalogService.listLlmModels(runtimeKind)
  -> provider by runtimeKind:
     autobyteus -> AutobyteusRuntimeModelProvider
     codex_app_server -> CodexRuntimeModelProvider
  -> Codex provider -> CodexAppServerRuntimeService.listModels()
     -> CodexAppServerClient.request("model/list", ...)
[EXIT] runtime-scoped provider/model list
```

### Fallback/Error Path

```text
[FALLBACK] runtimeKind omitted
  -> normalize to default runtime kind (autobyteus)

[ERROR] provider missing for runtime kind
  -> RuntimeModelCatalogService throws "Runtime model provider '<kind>' is not configured."
```

### Coverage Status

- Primary: `Yes`
- Fallback: `Yes`
- Error: `Yes`

## UC-008 Runtime Transport/Session Failure Handling

### Primary Path

```text
[ENTRY] codex runtime command
  -> CodexAppServerRuntimeService.requireSession(runId)
  -> CodexAppServerClient.request(...)
  -> response handled and returned
[EXIT] accepted runtime command
```

### Fallback/Error Path

```text
[ERROR] codex process closes unexpectedly
  -> CodexAppServerClient emits close error
  -> CodexAppServerRuntimeService removes run session
  -> emits runtime error event to listeners

[ERROR] stale runtime session record
  -> RuntimeCommandIngressService.resolveSession(...)
  -> for codex: hasRunSession false => remove session store record
  -> return RUN_SESSION_NOT_FOUND
```

### Coverage Status

- Primary: `Yes`
- Fallback: `Yes`
- Error: `Yes`

## UC-009 Codex Method-Level Compatibility Mapping (+ Alias Normalization)

### Primary Path

```text
[ENTRY] RuntimeEventMessageMapper.map(rawEvent)
  -> CodexRuntimeEventAdapter.map(rawEvent)
  -> normalizeMethodAlias(method)
  -> branch by canonical method:
     turn/started -> AGENT_STATUS
     turn/completed -> AGENT_STATUS
     turn/diffUpdated -> ARTIFACT_UPDATED
     turn/taskProgressUpdated -> TODO_LIST_UPDATE
     item/outputText/delta -> SEGMENT_CONTENT(id, delta, segment_type=text)
     item/reasoning/delta -> SEGMENT_CONTENT(id, delta, segment_type=reasoning)
     item/commandExecution/requestApproval -> TOOL_APPROVAL_REQUESTED
     item/commandExecution/* -> TOOL_EXECUTION_* / TOOL_LOG
     item/fileChange/* -> SEGMENT/ARTIFACT_* events
     error -> ERROR
[EXIT] typed websocket message
```

### Fallback/Error Path

```text
[FALLBACK] unknown but valid runtime method
  -> return SEGMENT_CONTENT with runtime_event_method and serialized payload
  -> no silent drop

[ERROR] missing runtime method
  -> return ERROR message code RUNTIME_EVENT_UNMAPPED
```

### Coverage Status

- Primary: `Yes`
- Fallback: `Yes`
- Error: `Yes`

## UC-015 Runtime Adapter Boundary + Segment-Flow Strictness

### Primary Path

```text
[ENTRY] Codex runtime notification arrives
  -> AgentStreamHandler.forwardCodexRuntimeEvent(...)
  -> RunHistoryService.onRuntimeEvent(runId, event)
  -> RuntimeEventMessageMapper.map(event)
     -> CodexRuntimeEventAdapter.map(event)
     -> emits segment-first envelope for text/reasoning deltas
  -> Core stream event arrives (SEGMENT_EVENT)
     -> RuntimeEventMessageMapper.map(event)
     -> maps SEGMENT_START / SEGMENT_CONTENT / SEGMENT_END directly
  -> websocket sends SEGMENT_CONTENT / SEGMENT_END
  -> frontend Agent/TeamStreamingService dispatches segment messages
  -> handleSegmentContent(...) appends delta to matching segment
[EXIT] no chunk-specific contract required, content rendered
```

### Fallback/Error Path

```text
[FALLBACK] SEGMENT_CONTENT received before SEGMENT_START
  -> segmentHandler.handleSegmentContent(...) creates fallback text segment
  -> delta appended instead of dropped

[ERROR] unexpected legacy assistant-chunk stream event appears
  -> RuntimeEventMessageMapper default branch emits UNKNOWN_EVENT error envelope
  -> integration test/monitoring flags contract regression
```

### Coverage Status

- Primary: `Yes`
- Fallback: `Yes`
- Error: `Yes`

## UC-010 Frontend Runtime Selector And `runtimeKind` Propagation

### Primary Path

```text
[ENTRY] AgentRunConfigForm.vue runtime selector change
  -> updateRuntimeKind(...)
  -> AgentRunConfig.runtimeKind updated
  -> ensureModelsForRuntime(runtimeKind)
  -> llmProviderConfigStore.fetchProvidersWithModels(runtimeKind)
  -> user runs agent
  -> agentRunStore.sendUserInputAndSubscribe()
  -> ContinueRun mutation input includes runtimeKind
  -> backend runtime composition uses runtimeKind for create/restore
  -> runOpenCoordinator.getRunResumeConfig() hydrates runtimeKind/runtimeReference
[EXIT] runtime choice preserved across launch and reopen
```

### Fallback/Error Path

```text
[FALLBACK] runtime kind undefined
  -> frontend defaults DEFAULT_AGENT_RUNTIME_KIND (autobyteus)

[ERROR] selected model invalid for switched runtime
  -> form watcher clears llmModelIdentifier and llmConfig
```

### Coverage Status

- Primary: `Yes`
- Fallback: `Yes`
- Error: `Yes`

## UC-011 Existing-Run Runtime Immutability Lock Parity

### Primary Path

```text
[ENTRY] run-history store opens existing run
  -> runOpenCoordinator.getRunResumeConfig()
  -> GraphQL returns editableFields.runtimeKind=false
  -> runHistoryStore.resumeConfigByRunId[runId] updated
  -> RunConfigPanel computes isRuntimeLockedForSelectedAgentRun
  -> AgentRunConfigForm runtime selector disabled (runtimeLocked=true)
[EXIT] runtime selector locked for existing run
```

### Error Path

```text
[ERROR] stale schema/codegen missing editableFields.runtimeKind
  -> frontend codegen validation fails against backend schema
  -> release pipeline blocks until schema and generated types are synchronized
```

### Coverage Status

- Primary: `Yes`
- Fallback: `N/A`
- Error: `Yes`

## UC-012 Terminate Lifecycle Completeness

### Primary Path

```text
[ENTRY] UI terminate action from running/history panel
  -> autobyteus-web/stores/agentRunStore.ts:terminateRun(runId)
  -> GraphQL mutation terminateAgentInstance(id)
  -> src/api/graphql/types/agent-instance.ts:terminateAgentInstance(...)
  -> local termination attempt: AgentInstanceManager.terminateAgentInstance(id)
  -> runtime termination attempt when codex session exists:
     RuntimeCommandIngressService.terminateRun(...)
  -> runtime composition cleanup: RuntimeCompositionService.removeRunSession(id)
  -> run history status update: RunHistoryService.onRunTerminated(id)
  -> frontend marks run inactive + refreshes history
[EXIT] run is terminated and remains in history as inactive
```

### Fallback/Error Path

```text
[FALLBACK] temporary run id (`temp-*`)
  -> frontend performs local teardown only
  -> marks run inactive without backend mutation

[ERROR] terminate mutation returns success=false
  -> frontend preserves current context/history state
  -> user-visible error path (no destructive cleanup)
```

### Coverage Status

- Primary: `Yes`
- Fallback: `Yes`
- Error: `Yes`

## UC-013 Reopen/Reconnect Live-Handoff Completeness

### Primary Path

```text
[ENTRY] user opens run from history tree
  -> autobyteus-web/stores/runHistoryStore.ts:openRun(runId)
  -> autobyteus-web/services/runOpen/runOpenCoordinator.ts:openRunWithCoordinator(...)
  -> query GetRunProjection + GetRunResumeConfig in parallel
  -> autobyteus-web/services/runOpen/runOpenStrategyPolicy.ts:decideRunOpenStrategy(...)
  -> active + existing + subscribed => KEEP_LIVE_CONTEXT
  -> agentContextsStore.patchConfigOnly(runId, locked config)
  -> ensure stream attachment: agentRunStore.connectToAgentStream(runId)
[EXIT] live context preserved, stream handoff active
```

### Fallback/Error Path

```text
[FALLBACK] inactive or unsubscribed context
  -> HYDRATE_FROM_PROJECTION
  -> upsertProjectionContext(runId, projection conversation)

[ERROR] projection or resume query fails
  -> openRun throws
  -> runHistoryStore.error set
  -> existing context remains unchanged
```

### Coverage Status

- Primary: `Yes`
- Fallback: `Yes`
- Error: `Yes`

## UC-014 Runtime-Status Alias Parity

### Primary Path

```text
[ENTRY] runtime event received in AgentStreamHandler.forwardCodexRuntimeEvent(...)
  -> src/run-history/services/run-history-service.ts:onRuntimeEvent(runId, event)
  -> extract raw method
  -> src/runtime-execution/codex-app-server/codex-runtime-method-normalizer.ts:normalizeCodexRuntimeMethod(method)
  -> deriveStatusFromRuntimeMethod(canonicalMethod)
  -> src/run-history/store/run-history-index-store.ts:updateRow(...)
[EXIT] ACTIVE/IDLE/ERROR lifecycle status persisted consistently
```

### Fallback/Error Path

```text
[FALLBACK] canonical slash method already provided
  -> normalizer returns same method
  -> lifecycle update proceeds with no behavior change

[ERROR] method missing/non-string
  -> no status transition applied
  -> lastKnownStatus remains unchanged
```

### Coverage Status

- Primary: `Yes`
- Fallback: `Yes`
- Error: `Yes`

## UC-016 Codex History Replay + Continue-Chat Parity

### Primary Path

```text
[ENTRY] GraphQL getRunProjection(runId)
  -> src/api/graphql/types/run-history.ts:getRunProjection(...)
  -> src/run-history/services/run-projection-service.ts:getProjection(runId)
  -> read run manifest and runtime reference
  -> src/run-history/projection/run-projection-provider-registry.ts:resolveProvider(runtimeKind)
  -> codex provider selected for codex_app_server
  -> src/run-history/projection/providers/codex-thread-run-projection-provider.ts:buildProjection(...)
     -> src/runtime-execution/codex-app-server/codex-thread-history-reader.ts:readThread(threadId)
       -> CodexAppServerClient.request("thread/read", { threadId, includeTurns: true })
  -> transform Codex turns/items into projection conversation schema
  -> return RunProjectionPayload
  -> frontend runOpenCoordinator hydrates unified conversation
[EXIT] reopened run displays historical Codex conversation and can continue chat
```

### Fallback/Error Path

```text
[FALLBACK] codex thread read unavailable/failed
  -> run-projection-service resolves fallback provider (local memory)
  -> src/run-history/projection/providers/local-memory-run-projection-provider.ts:buildProjection(...)
  -> open run still succeeds

[ERROR] manifest missing runtime reference for codex run
  -> return local projection with warning marker in server logs
  -> continueRun path still uses existing runtime restore logic
```

### Coverage Status

- Primary: `Yes`
- Fallback: `Yes`
- Error: `Yes`

## UC-023 Runtime Capability Gating Parity

### Primary Path

```text
[ENTRY] frontend opens run config panel
  -> autobyteus-web/stores/runtimeCapabilitiesStore.ts:loadRuntimeCapabilities()
  -> GraphQL query runtimeCapabilities
  -> src/api/graphql/types/runtime-capability.ts:runtimeCapabilities(...)
  -> src/runtime-management/runtime-capability-service.ts:listRuntimeCapabilities()
  -> capability rows returned ({ runtimeKind, enabled, reason })
  -> AgentRunConfigForm renders runtime selector from capability rows
  -> user selects enabled runtime and sends continue/create
  -> src/runtime-execution/runtime-capability-policy.ts:evaluateCommandCapability(runtimeKind, "send")
  -> sendTurn proceeds through existing adapter dispatch flow
[EXIT] runtime selection and dispatch are capability-safe and backend-owned
```

### Fallback/Error Path

```text
[FALLBACK] codex runtime unavailable at load time
  -> capability row for codex_app_server has enabled=false with backend reason
  -> selector disables/hides codex option deterministically

[ERROR] runtime becomes unavailable after selection but before dispatch
  -> evaluateCommandCapability(..., "send") returns unavailable
  -> deterministic runtime-unavailable error returned to caller
```

### Coverage Status

- Primary: `Yes`
- Fallback: `Yes`
- Error: `Yes`

## UC-024 Runtime Degradation Command/Read Policy Parity

### Primary Path

```text
[ENTRY] runtime command received while runtime capability state is degraded
  -> src/runtime-execution/runtime-command-ingress-service.ts:execute(...)
  -> src/runtime-execution/runtime-capability-policy.ts:evaluateCommandCapability(runtimeKind, operation)
  -> operation=send/approve => unavailable -> fail-fast deterministic response
  -> operation=terminate/interrupt => degraded-allowed -> best-effort lifecycle handling
  -> terminate path still clears session binding/run-history inactive state when possible
[EXIT] command outcomes are deterministic and operation-scoped under degradation
```

### Fallback/Error Path

```text
[FALLBACK] read-plane open/history request during runtime outage
  -> run projection path remains available
  -> runtime provider failure falls back to local projection provider

[ERROR] terminate attempts runtime cleanup but runtime transport is unreachable
  -> return deterministic degraded lifecycle result code (best effort)
  -> stale runtime session record is removed to avoid dead-loop retries
```

### Coverage Status

- Primary: `Yes`
- Fallback: `Yes`
- Error: `Yes`

## UC-022 Continuation Manifest Source-Of-Truth Parity

### Primary Path

```text
[ENTRY] continueRun for inactive run with no explicit model/llmConfig overrides
  -> src/run-history/services/run-continuation-service.ts:continueExistingRun(...)
  -> src/run-history/store/run-manifest-store.ts:readManifest(runId)
  -> mergeInactiveOverrides(manifest, overrides)
  -> runtime restore receives manifest llmModelIdentifier + llmConfig
  -> runtime session defaults initialized from restored config
  -> sendTurn dispatches using restored session defaults
[EXIT] continuation uses previously selected model/thinking config deterministically
```

### Fallback/Error Path

```text
[FALLBACK] active run continuation with overrides
  -> active-run override policy marks model/llmConfig as ignored
  -> response includes ignoredConfigFields
  -> existing active session settings remain authoritative

[ERROR] manifest missing/corrupt for run
  -> continueRun rejects with deterministic manifest error
  -> no partial runtime restore occurs
```

### Coverage Status

- Primary: `Yes`
- Fallback: `Yes`
- Error: `Yes`

## UC-021 Reopen Reasoning-Config Reconciliation Parity

### Primary Path

```text
[ENTRY] user opens existing run
  -> autobyteus-web/services/runOpen/runOpenCoordinator.ts:openRunWithCoordinator(...)
  -> hydrate manifest llmConfig + model identifier into AgentRunConfig
  -> autobyteus-web/stores/llmProviderConfig.ts fetches current model schema for runtime/model
  -> autobyteus-web/utils/llmConfigSchema.ts normalizeModelConfigSchema(...)
  -> schema-driven reconciliation keeps compatible reasoning fields (reasoning_effort, etc.)
  -> run config panel renders reconciled config via ModelConfigSection
[EXIT] reopened run shows valid reasoning config and remains ready to continue
```

### Fallback/Error Path

```text
[FALLBACK] schema unavailable at reopen moment
  -> keep persisted config temporarily
  -> reconcile once schema fetch succeeds

[ERROR] persisted reasoning value not in current enum
  -> sanitize invalid value (remove or coerce to default/null)
  -> prevent invalid value dispatch in subsequent continue/turn flow
```

### Coverage Status

- Primary: `Yes`
- Fallback: `Yes`
- Error: `Yes`

## UC-018 Codex History Transformation Completeness

### Primary Path

```text
[ENTRY] codex-thread projection provider receives thread payload
  -> src/run-history/projection/providers/codex-thread-run-projection-provider.ts:buildProjection(...)
  -> normalize turn/item chronology (deterministic ordering)
  -> fold output text + reasoning deltas into canonical assistant message entries
  -> stitch command/file tool-call + result/error into canonical tool entry fields
  -> emit projection conversation[] using existing MemoryConversationEntry schema
[EXIT] runtime-agnostic projection payload ready for frontend hydration
```

### Fallback/Error Path

```text
[FALLBACK] partial turn payload (missing optional item fields)
  -> emit best-effort canonical entry with available fields
  -> preserve ordering and continue transformation

[ERROR] malformed/unsupported item payload
  -> skip malformed item with structured warning log
  -> continue remaining item transformation for same thread
```

### Coverage Status

- Primary: `Yes`
- Fallback: `Yes`
- Error: `Yes`

## UC-019 Codex Model Metadata Normalization Completeness

### Primary Path

```text
[ENTRY] Codex model/list rows received
  -> src/runtime-management/model-catalog/providers/codex-runtime-model-provider.ts:listLlmModels()
  -> parse reasoningEffort[] + defaultReasoningEffort
  -> validate enum/default pair (default must belong to enum)
  -> build ModelInfo.config_schema.reasoning_effort { enum, default }
  -> build ModelInfo.display_name with compact default-effort hint when available
[EXIT] frontend receives schema-driven model metadata with stable naming
```

### Fallback/Error Path

```text
[FALLBACK] reasoning metadata absent
  -> return model without reasoning schema fields
  -> frontend remains schema-driven and functional

[ERROR] invalid reasoning metadata (unknown default or non-array enum)
  -> drop invalid reasoning fields and log warning
  -> return baseline model metadata only
```

### Coverage Status

- Primary: `Yes`
- Fallback: `Yes`
- Error: `Yes`

## UC-020 Codex Reasoning Effort Lifecycle Parity

### Primary Path

```text
[ENTRY] continueRun/create/restore includes llmConfig.reasoning_effort
  -> src/run-history/services/run-continuation-service.ts persists llmConfig in manifest
  -> src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts:createAgentRun/restoreAgentRun(...)
  -> src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts
     normalize reasoning_effort into session defaults
  -> sendTurn(...)
     reads session-default effort
     sets turn/start payload.effort
[EXIT] every Codex turn applies persisted/normalized reasoning effort deterministically
```

### Fallback/Error Path

```text
[FALLBACK] reasoning_effort missing in llmConfig
  -> session default effort = null
  -> turn/start uses effort:null

[ERROR] invalid reasoning_effort value
  -> normalize to null and log warning
  -> turn/start proceeds without effort override
```

### Coverage Status

- Primary: `Yes`
- Fallback: `Yes`
- Error: `Yes`

## UC-017 Codex Thinking Metadata/Config Parity

### Primary Path

```text
[ENTRY] frontend loads models for runtimeKind=codex_app_server
  -> GraphQL availableLlmProvidersWithModels(runtimeKind)
  -> src/runtime-management/model-catalog/providers/codex-runtime-model-provider.ts:listLlmModels()
  -> src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts:listModels()
     -> CodexAppServerClient.request("model/list", ...)
  -> map reasoning metadata (reasoningEffort/defaultReasoningEffort) to:
     - model display name label
     - config_schema.reasoning_effort enum/default
  -> frontend AgentRunConfigForm renders backend model name
  -> ModelConfigSection exposes reasoning_effort selection from config schema
  -> continueRun persists llmConfig.reasoning_effort in manifest
  -> codex adapter/runtime service normalizes reasoning_effort into session defaults during create/restore
  -> sendTurn maps session-default reasoning_effort to turn/start payload.effort
[EXIT] user can see reasoning label and selected effort is applied during Codex turns
```

### Fallback/Error Path

```text
[FALLBACK] model metadata omits reasoning fields
  -> provider returns model without reasoning label/schema
  -> frontend remains functional with identifier + base config only

[ERROR] invalid reasoning_effort value in llmConfig
  -> codex runtime service normalizes or drops invalid value
  -> turn/start uses null effort and request still proceeds
```

### Coverage Status

- Primary: `Yes`
- Fallback: `Yes`
- Error: `Yes`
