# Proposed Design Document

## Design Version

- Current Version: `v40`
- Status: `Refined (Post-Implementation Write-Back)`
- Updated On: `2026-02-24`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v23 | Round 50 write-back | Added frontend runtime selector architecture and `runtimeKind` propagation. | 50 |
| v24 | Round 55 write-back | Removed document drift: replaced non-existent stream orchestrator/catch-up module design with the actual implemented runtime event pipeline and file ownership. | 55 |
| v25 | Round 58 write-back | Added explicit runtime immutability parity contract for existing runs (`editableFields.runtimeKind` + frontend runtime lock wiring). | 58 |
| v26 | Round 61 write-back | Added explicit terminate lifecycle use-case modeling and coverage matrix/test-planning alignment. | 61 |
| v27 | Round 64 write-back | Added explicit reopen/reconnect live-handoff use-case modeling (projection replay + live-context preservation strategy). | 64 |
| v28 | Round 67 write-back | Added explicit runtime-status alias-parity design so run-history lifecycle updates use the same canonical method normalization policy as websocket mapping. | 67 |
| v29 | Round 70 write-back | Split Codex event adaptation into dedicated adapter boundary and aligned streaming contract to segment-first mapping with frontend fallback bridge/recovery. | 70 |
| v30 | Round 74 write-back | Enforced frontend-minimal streaming architecture: backend normalizes core chunk events to segment envelopes; frontend chunk-dispatch compatibility path removed. | 74 |
| v31 | Round 77 write-back | Removed dead backend chunk compatibility surface after confirming core production flow is segment-first (`SEGMENT_EVENT`), decommissioning mapper chunk branch and websocket `ASSISTANT_CHUNK` enum type. | 77 |
| v32 | Round 80 write-back | Added canonical Codex tool-lifecycle payload mapping and introduced explicit Codex history-hydration design use case (backend-owned projection source, frontend unchanged). | 80 |
| v33 | Round 82 write-back | Refined projection architecture to runtime-provider separation and added Codex thinking-metadata/config parity use case (model metadata + turn effort propagation). | 82 |
| v34 | Round 83 write-back | Tightened separation boundaries: added dedicated Codex thread-history reader contract for projection providers and simplified effort propagation to runtime session defaults (no generic send-turn contract expansion). | 83 |
| v35 | Round 84 write-back | Added detailed use-case granularity for Codex history transformation and thinking normalization/application lifecycles (UC-018/UC-019/UC-020) and expanded future-state workflow detail. | 84 |
| v36 | Round 85 write-back | Added explicit reopen reasoning-config reconciliation use case (UC-021) to cover persisted config/schema drift handling with schema-driven, runtime-agnostic frontend behavior. | 85 |
| v37 | Round 86 write-back | Clarified `effort:null` semantics and added continuation manifest source-of-truth use case (UC-022) for deterministic model/thinking config restoration. | 86 |
| v38 | Round 87 write-back | Added runtime capability-gating use case (UC-023) and backend-owned runtime-availability contract to keep optional runtime enable/disable concerns out of frontend hardcoding. | 87 |
| v39 | Round 88 write-back | Refined capability architecture to operation-scoped degradation policy (UC-024) so safety/read flows are not blocked by global runtime availability gating. | 88 |
| v40 | Round 90 write-back | Synced design to implemented C-058..C-062 slice completion: projection-provider runtime boundary, Codex model reasoning metadata + effort propagation, backend runtime capability contract, and operation-scoped ingress degradation policy. | 90 |

## Summary

This ticket integrates Codex App Server as a real server-owned runtime in `autobyteus-server-ts` and aligns agent runtime selection on personal branch architecture.
The runtime transport is concrete (`codex app-server` JSON-RPC client + per-run session service), and frontend run configuration now exposes runtime selection with end-to-end `runtimeKind` propagation.

## Goals

- Keep `autobyteus-ts` core library unchanged.
- Support runtime selection (`autobyteus`, `codex_app_server`) through server composition.
- Provide real Codex App Server transport for create/restore/send/approve/interrupt/terminate.
- Preserve personal branch team approval routing semantics (`agent_name` / `target_member_name` / `agent_id`).
- Persist runtime metadata in run manifests for resume/restore.
- Stream Codex runtime events to websocket with deterministic mapper behavior and no silent drop.
- Provide runtime-scoped model catalog for GraphQL/startup/model reload paths.
- Expose runtime selector in agent run config UI and propagate `runtimeKind` through launch/continue/resume flows.
- Keep runtime immutable for existing runs and surface that invariant directly in resume-config/edit UI contracts.
- Model terminate lifecycle as a first-class flow, separate from stop-generation interrupt semantics.
- Model reopen/reconnect live-handoff as a first-class flow so active subscribed contexts are not clobbered.
- Keep runtime method normalization policy single-sourced across websocket mapping and run-history status derivation.
- Keep Codex runtime event adaptation isolated behind a dedicated adapter module so Codex-specific method mapping does not leak into generic stream-event mapping concerns.
- Keep Codex history replay backend-owned by hydrating run projection from Codex thread APIs when local projection is incomplete.
- Keep Codex thinking configuration backend-owned and runtime-aware, while frontend remains schema-driven and runtime-agnostic.
- Keep Codex history transformation deterministic (ordering, tool/result stitching, text/reasoning folding) so projection stays runtime-agnostic for frontend.
- Keep Codex reasoning metadata normalization deterministic (enum/default validation) before exposing schema to frontend.
- Keep reopen config reconciliation deterministic when persisted reasoning config drifts from current schema.
- Keep continuation restore deterministic by using manifest model/thinking config as source-of-truth when overrides are omitted.
- Keep runtime availability backend-owned so optional runtime enable/disable is deterministic and frontend remains runtime-agnostic.
- Keep runtime degradation handling operation-scoped so command, safety, and read paths have explicit policy boundaries.

## Non-Goals

- Team runtime selector UX in this phase.
- Mixed runtime execution inside one run.
- Enterprise token-based approval routing compatibility.

## Current State (As-Is Before This Ticket)

- Runtime was effectively local-runtime-first and not explicitly selected by users in agent run form.
- Ticket docs accumulated design assumptions for modules that are not present in personal branch implementation.
- Ticket artifact wording still included stale "runtime not configured" state after concrete runtime transport landed.

## Target State (Implemented)

- Runtime execution is routed by `RuntimeCompositionService` + `RuntimeCommandIngressService`.
- Codex runtime adapter delegates to `CodexAppServerRuntimeService` backed by `CodexAppServerClient`.
- Run manifest carries `runtimeKind` and `runtimeReference`; continuation restore uses runtime composition.
- Agent websocket path can stream either local `AgentEventStream` or Codex runtime notifications.
- Runtime events are persisted first (`RunHistoryService.onRuntimeEvent`) and then mapped to websocket messages.
- Codex runtime notifications are adapted by a dedicated Codex event adapter, then passed through generic mapper flow to websocket serialization.
- Runtime method alias normalization is shared between websocket mapping and run-history lifecycle status derivation.
- Frontend runtime selector and runtime-scoped model loading are wired in run config/store/query layers.
- Resume editable flags include `runtimeKind=false` and frontend run config disables runtime selector when opening existing runs.
- Run termination path triggers runtime/local shutdown, run-history inactive update, and runtime-session cleanup.
- Run-open path applies strategy-based handoff (`KEEP_LIVE_CONTEXT` vs projection hydration) for active runs.
- Run projection uses runtime-specific provider registry (Codex thread-history provider + local fallback).
- Codex model metadata exposes reasoning levels/defaults and Codex turn dispatch applies selected reasoning effort via session defaults.
- Runtime capability metadata is backend-owned and consumed by frontend runtime selector gating.
- Runtime command ingress applies operation-scoped degradation policy (`send/approve` fail-fast, `interrupt/terminate` best-effort).

## Known Gap (Follow-Up Validation Depth)

- UC-021 follow-up depth: add broader regression around persisted reasoning-config schema drift across model catalog reload edge cases.
- UC-022 follow-up depth: add broader continuation manifest source-of-truth coverage for mixed active/inactive run batches.

## Change Inventory (Delta)

| Change ID | Change Type | Current Path | Target Path | Responsibility |
| --- | --- | --- | --- | --- |
| C-001 | Add | N/A | `src/runtime-management/runtime-kind.ts` | Runtime kind constants + normalization helpers. |
| C-002 | Add | N/A | `src/runtime-execution/runtime-adapter-port.ts` | Runtime adapter contracts for create/restore/send/approve/interrupt/terminate. |
| C-003 | Add | N/A | `src/runtime-execution/adapters/autobyteus-runtime-adapter.ts` | Personal local runtime path behind adapter boundary. |
| C-004 | Add | N/A | `src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts` | Codex runtime adapter delegating to runtime service. |
| C-005 | Add | N/A | `src/runtime-execution/runtime-adapter-registry.ts` | Runtime adapter resolution by kind. |
| C-006 | Add | N/A | `src/runtime-execution/runtime-session-store.ts` | Run -> runtime session mapping. |
| C-007 | Add | N/A | `src/runtime-execution/runtime-composition-service.ts` | Runtime create/restore orchestration and session registration. |
| C-008 | Add | N/A | `src/runtime-execution/runtime-command-ingress-service.ts` | Canonical runtime command ingress with session resolution and stale-session handling. |
| C-009 | Modify | `src/run-history/domain/models.ts` | same | Runtime fields added to run manifest domain model. |
| C-010 | Modify | `src/run-history/services/run-continuation-service.ts` | same | Continue/restore through runtime composition and ingress, including runtime invariants. |
| C-011 | Modify | `src/services/agent-streaming/agent-stream-handler.ts` | same | Websocket connect/send/approve/interrupt uses runtime ingress; Codex event bridge. |
| C-012 | Modify | `src/services/agent-streaming/agent-team-stream-handler.ts` | same | Team path routes through runtime ingress with personal approval target identity semantics. |
| C-013 | Modify | `src/api/websocket/agent.ts` | same | Deterministic `SESSION_NOT_READY` response before connect handshake completes. |
| C-014 | Add/Modify | `src/services/agent-streaming/runtime-event-message-mapper.ts` | same | Generic stream-event mapper for core/autobyteus events plus Codex-adapter delegation. |
| C-015 | Modify | `src/run-history/services/run-history-service.ts` | same | Runtime activity/status tracking and active-runtime detection. |
| C-016 | Add | N/A | `src/run-history/services/runtime-manifest-migration-service.ts` | Manifest migration/validation for runtime fields. |
| C-017 | Add | N/A | `src/run-history/services/active-run-override-policy.ts` | Active-run override decision policy. |
| C-018 | Add | N/A | `src/runtime-execution/codex-app-server/codex-app-server-client.ts` | `codex app-server` JSON-RPC process client. |
| C-019 | Add | N/A | `src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts` | Per-run Codex thread/session lifecycle + approval tracking + model/list integration. |
| C-020 | Add | N/A | `src/runtime-management/model-catalog/runtime-model-catalog-service.ts` + providers | Runtime-scoped model listing/reload facade. |
| C-021 | Modify | `src/api/graphql/types/llm-provider.ts` | same | Model APIs switched to runtime model catalog and `runtimeKind` argument. |
| C-022 | Modify | `src/startup/cache-preloader.ts` | same | Model preloading switched to runtime model catalog. |
| C-023 | Modify | `src/api/graphql/types/run-history.ts` + `src/api/graphql/types/agent-instance.ts` | same | Runtime fields exposed in resume config and runtime-aware termination path. |
| C-024 | Remove | direct runtime-path `LlmModelService` usage in runtime GraphQL/startup path | runtime model catalog path | Single source of truth for runtime-scoped models. |
| C-048 | Modify | `src/services/agent-streaming/runtime-event-message-mapper.ts` | same | Finalized Codex v2 method compatibility (`turn/*`, `item/*`, `error`) and alias normalization. |
| C-049 | Modify | `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` + run/config/history/model stores + GraphQL docs/codegen | same | Frontend runtime selector and `runtimeKind` propagation in agent run flow. |
| C-050 | Modify | `src/run-history/services/run-history-service.ts` + `src/api/graphql/types/run-history.ts` + `autobyteus-web/stores/runHistoryStore.ts` + `autobyteus-web/components/workspace/config/{RunConfigPanel,AgentRunConfigForm}.vue` | same | Runtime immutability parity: expose `editableFields.runtimeKind` and lock runtime selector for existing runs. |
| C-051 | Modify | `src/api/graphql/types/agent-instance.ts` + `src/runtime-execution/runtime-command-ingress-service.ts` + `autobyteus-web/stores/agentRunStore.ts` + `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | same | Terminate lifecycle orchestration and failure handling coverage for runtime-backed and local runs. |
| C-052 | Modify | `autobyteus-web/services/runOpen/{runOpenCoordinator,runOpenStrategyPolicy}.ts` + `autobyteus-web/stores/runHistoryStore.ts` | same | Reopen/reconnect live-handoff strategy coverage (preserve subscribed live context, hydrate otherwise). |
| C-053 | Add/Modify | `src/runtime-execution/codex-app-server/codex-runtime-method-normalizer.ts` + `src/services/agent-streaming/runtime-event-message-mapper.ts` + `src/run-history/services/run-history-service.ts` + `tests/unit/run-history/services/run-history-service.test.ts` | same | Single-source runtime-method canonicalization shared by websocket mapping and run-history status derivation. |
| C-054 | Add | N/A | `src/services/agent-streaming/codex-runtime-event-adapter.ts` | Dedicated Codex runtime method-to-websocket adaptation boundary (segment-first envelopes + deterministic fallback). |
| C-055 | Modify | `autobyteus-web/services/agentStreaming/{AgentStreamingService,TeamStreamingService}.ts` + `autobyteus-web/services/agentStreaming/handlers/{agentStatusHandler,segmentHandler}.ts` + `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | same | Frontend stream-contract minimization: remove `ASSISTANT_CHUNK` dispatch/typing; retain only segment-first handling + out-of-order segment-content recovery. |
| C-056 | Modify/Remove | `src/services/agent-streaming/runtime-event-message-mapper.ts` + `src/services/agent-streaming/models.ts` | same | Decommission dead backend `ASSISTANT_CHUNK` compatibility path: remove chunk-branch/state logic and remove websocket `ASSISTANT_CHUNK` message type from server protocol enum. |
| C-057 | Modify | `src/services/agent-streaming/codex-runtime-event-adapter.ts` + `tests/unit/services/agent-streaming/runtime-event-message-mapper.test.ts` | same | Normalize Codex tool lifecycle payloads to frontend canonical contract fields (`invocation_id`, `tool_name`, `arguments`, `tool_invocation_id`, `log_entry`, `result`/`error`). |
| C-058 | Add/Modify | `src/run-history/projection/run-projection-provider-port.ts` + `src/run-history/projection/run-projection-provider-registry.ts` + `src/run-history/projection/providers/{local-memory,codex-thread}-run-projection-provider.ts` + `src/run-history/services/run-projection-service.ts` + `src/runtime-execution/codex-app-server/codex-thread-history-reader.ts` + `src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts` + `src/api/graphql/types/run-history.ts` | same | Runtime-pluggable run-projection architecture with dedicated Codex thread-history reader boundary and deterministic local fallback. |
| C-059 | Modify | `src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts` + `src/runtime-management/model-catalog/providers/codex-runtime-model-provider.ts` + `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | same | Codex model metadata parity: expose reasoning labels/defaults and render backend model display names in frontend selector. |
| C-060 | Modify | `src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts` + `src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts` + `tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts` | same | Codex thinking config execution parity: propagate `llmConfig.reasoning_effort` to `turn/start` payload (`effort`) via runtime session defaults across create/restore/continue flows. |
| C-061 | Add/Modify | `src/runtime-management/runtime-capability-service.ts` + `src/api/graphql/types/runtime-capability.ts` + `src/runtime-execution/runtime-command-ingress-service.ts` + `autobyteus-web/stores/runtimeCapabilitiesStore.ts` + `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | same | Backend-owned runtime capability contract (`enabled`/`reason`) with frontend selector gating and ingress fail-fast guard for unavailable runtimes. |
| C-062 | Add/Modify | `src/runtime-execution/runtime-capability-policy.ts` + `src/runtime-execution/runtime-command-ingress-service.ts` + `src/api/graphql/types/run-history.ts` + `autobyteus-web/stores/agentRunStore.ts` | same | Operation-scoped runtime degradation policy (`send/approve` fail-fast, `terminate` best-effort, read-plane unaffected) with deterministic result codes/reasons. |

## File/Module Responsibilities (Separation Of Concerns)

| File/Module | Responsibility | Key APIs |
| --- | --- | --- |
| `src/runtime-execution/runtime-composition-service.ts` | Create/restore run with selected runtime adapter and persist session record. | `createAgentRun`, `restoreAgentRun` |
| `src/runtime-execution/runtime-command-ingress-service.ts` | Execute runtime commands for send/approve/interrupt/terminate with run-session lookup policy. | `sendTurn`, `approveTool`, `interruptRun`, `terminateRun` |
| `src/runtime-execution/codex-app-server/codex-app-server-client.ts` | Transport client for app-server process and JSON-RPC request/notification routing. | `start`, `request`, `notify`, `onNotification`, `onServerRequest`, `close` |
| `src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts` | Per-run Codex lifecycle and protocol integration. | `createRunSession`, `restoreRunSession`, `sendTurn`, `approveTool`, `interruptRun`, `terminateRun`, `listModels`, `subscribeToRunEvents` |
| `src/runtime-execution/codex-app-server/codex-thread-history-reader.ts` | Read-only Codex thread-history retrieval for projection hydration using ephemeral app-server clients. | `readThread` |
| `src/services/agent-streaming/agent-stream-handler.ts` | Agent websocket lifecycle and runtime event forwarding. | `connect`, `handleMessage`, `disconnect` |
| `src/services/agent-streaming/agent-team-stream-handler.ts` | Team websocket lifecycle and runtime command routing. | `connect`, `handleMessage`, `disconnect` |
| `src/runtime-execution/codex-app-server/codex-runtime-method-normalizer.ts` | Canonical runtime-method normalization boundary shared across runtime consumers. | `normalizeCodexRuntimeMethod` |
| `src/services/agent-streaming/codex-runtime-event-adapter.ts` | Codex runtime notification adaptation into websocket envelopes. | `map`, `normalizeMethodAlias` |
| `src/run-history/projection/run-projection-provider-port.ts` | Projection-provider contract by runtime concern. | `buildProjection` |
| `src/run-history/projection/run-projection-provider-registry.ts` | Runtime-kind projection provider resolution + fallback ordering. | `resolveProvider`, `resolveFallbackProvider` |
| `src/run-history/projection/providers/local-memory-run-projection-provider.ts` | Local memory-view projection provider. | `buildProjection` |
| `src/run-history/projection/providers/codex-thread-run-projection-provider.ts` | Codex thread-history projection provider using app-server thread APIs. | `buildProjection` |
| `src/run-history/services/run-projection-service.ts` | Projection orchestrator: manifest/runtime lookup + provider selection + fallback. | `getProjection` |
| `src/services/agent-streaming/runtime-event-message-mapper.ts` | Generic runtime-event mapper (autobyteus/core stream events + Codex adapter delegation). | `map` |
| `src/run-history/services/run-history-service.ts` | Run history index maintenance for agent and runtime events with canonical runtime-method lifecycle derivation. | `onAgentEvent`, `onRuntimeEvent`, `getRunResumeConfig`, `listRunHistory` |
| `src/run-history/services/run-continuation-service.ts` | Continue existing/new run with runtime-aware resume/override rules. | `continueRun` |
| `src/runtime-management/model-catalog/runtime-model-catalog-service.ts` | Runtime-scoped model list/reload API. | `listLlmModels`, `reloadLlmModels`, `listAudioModels`, `listImageModels` |
| `src/runtime-management/runtime-capability-service.ts` | Runtime availability/capability evaluation owned by backend runtime layer. | `listRuntimeCapabilities`, `assertRuntimeAvailable` |
| `src/runtime-execution/runtime-capability-policy.ts` | Operation-scoped capability decision policy for runtime commands under degradation. | `evaluateCommandCapability`, `isSafetyOperation` |
| `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | Runtime selector UI and runtime-aware model loading trigger. | `updateRuntimeKind`, runtime watcher |
| `autobyteus-web/stores/runtimeCapabilitiesStore.ts` | Runtime capability hydration/cache for selector gating and availability messaging. | `loadRuntimeCapabilities`, `isRuntimeEnabled` |
| `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | Wires run-history editable flags to UI lock state for existing runs. | `isRuntimeLockedForSelectedAgentRun` |
| `autobyteus-web/stores/agentRunStore.ts` | Launch/continue mutation payload composition with `runtimeKind` plus terminate-run orchestration. | `sendUserInputAndSubscribe`, `terminateRun`, `closeAgent` |
| `src/api/graphql/types/agent-instance.ts` | GraphQL lifecycle commands for runtime-backed/local run termination. | `terminateAgentInstance` |
| `autobyteus-web/services/runOpen/runOpenCoordinator.ts` | Resume hydration for runtime fields (`runtimeKind`, `runtimeReference`). | `openRunWithCoordinator` |
| `autobyteus-web/services/runOpen/runOpenStrategyPolicy.ts` | Active-run reopen strategy decision for live-context preservation. | `decideRunOpenStrategy` |
| `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts` | Agent status/assistant-complete/error state transitions; no runtime-specific chunk adaptation. | `handleAgentStatus`, `handleAssistantComplete`, `handleError` |
| `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | Segment lifecycle handling with out-of-order content fallback recovery. | `handleSegmentContent` |

## Data Workflow (Event Flow + Command Flow)

### Workflow A: Run Create + First Turn

1. Frontend prepares `ContinueRunInput` with `runtimeKind`.
2. GraphQL resolver calls `RunContinuationService.continueRun(...)`.
3. `RuntimeCompositionService.createAgentRun(...)` selects adapter by runtime kind.
4. Adapter creates runtime session (local manager or Codex app-server) and returns runtime reference.
5. Session is bound in `RuntimeSessionStore`.
6. `RuntimeCommandIngressService.sendTurn(...)` dispatches first user turn.
7. Run manifest and run-history index are upserted with runtime metadata.

### Workflow B: Continue Existing Run

1. `RunContinuationService.continueExistingRun(...)` checks active runtime/agent session.
2. If active: send turn directly and apply active-run override policy (ignored fields list).
3. If inactive: read manifest, validate runtime invariants, restore via runtime composition.
4. Bind restored runtime session and send turn through ingress.
5. Update run-history status/activity timestamp.

### Workflow C: Runtime Event Flow (Codex)

1. Websocket connect registers session in `AgentStreamHandler`.
2. For Codex runtime, handler subscribes via `CodexAppServerRuntimeService.subscribeToRunEvents(...)`.
3. On each event, handler first calls `RunHistoryService.onRuntimeEvent(runId, event)`.
4. `RunHistoryService` normalizes runtime method aliases to canonical form before lifecycle status branching.
5. Handler maps event via `RuntimeEventMessageMapper.map(event)`.
6. `RuntimeEventMessageMapper` delegates Codex notifications to `CodexRuntimeEventAdapter.map(...)`.
7. Adapter emits segment-first text/reasoning envelopes (`SEGMENT_CONTENT` / `SEGMENT_END`) with deterministic ids/deltas.
8. Resulting `ServerMessage` is sent to websocket connection.
9. Unknown mapped methods are emitted as deterministic `SEGMENT_CONTENT` payload envelope, not silently dropped.

### Workflow I: Frontend Streaming Contract Recovery

1. Frontend websocket service dispatches segment events as primary path.
2. Backend `RuntimeEventMessageMapper` treats `SEGMENT_EVENT` as canonical core-stream input and does not carry legacy `ASSISTANT_CHUNK` compatibility branching.
3. If `SEGMENT_CONTENT` arrives before `SEGMENT_START`, `handleSegmentContent(...)` auto-creates deterministic text fallback segment and appends delta.
4. Content is preserved and user-facing stream remains stable with no frontend runtime-specific chunk path.

### Workflow J: Codex Tool-Lifecycle Canonical Payload Mapping

1. Codex emits `item/commandExecution/*` or `item/fileChange/requestApproval`.
2. `CodexRuntimeEventAdapter.map(...)` extracts canonical lifecycle keys:
   - `invocation_id` or `tool_invocation_id`,
   - `tool_name`,
   - `arguments` / `log_entry` / `result` / `error`.
3. `RuntimeEventMessageMapper` forwards typed websocket messages without frontend runtime-specific adaptation.
4. Frontend tool lifecycle parsers consume canonical payload fields deterministically.

### Workflow K: Codex History Hydration

1. `getRunProjection(runId)` resolves manifest and runtime reference.
2. `RunProjectionService` resolves a projection provider by runtime kind using provider registry.
3. If `runtimeKind=codex_app_server` and thread id exists, Codex projection provider calls dedicated reader to fetch Codex thread (`thread/read` with `includeTurns`).
4. Provider transforms Codex turn/items into existing projection conversation schema with deterministic chronological ordering.
5. Provider folds text/reasoning deltas and stitches tool-call/tool-result entries into canonical projection fields.
6. Provider emits runtime-agnostic conversation entries only (no Codex-specific frontend types).
7. If runtime provider fails or returns no usable conversation, service falls back to local-memory projection provider.
8. Frontend run-open flow remains unchanged and consumes unified projection payload.

### Workflow D: Runtime-Scoped Model Catalog

1. Frontend model query/mutation passes optional `runtimeKind`.
2. GraphQL `LlmProviderResolver` delegates to `RuntimeModelCatalogService`.
3. Catalog resolves runtime provider (`autobyteus` or `codex_app_server`).
4. Codex provider calls `CodexAppServerRuntimeService.listModels()` (`model/list` RPC loop).
5. Startup preloader also uses runtime model catalog service, not direct `LlmModelService` runtime path.

### Workflow L: Codex Thinking Metadata + Turn Effort Parity

1. `CodexAppServerRuntimeService.listModels()` reads model metadata from `model/list`.
2. Codex runtime model provider maps reasoning metadata to:
   - model display label (name includes default reasoning level when available),
   - `configSchema.reasoning_effort` enum/default for schema-driven config UI.
3. Provider validates/normalizes reasoning enum/default values before exposing schema.
4. Frontend model selector renders backend-provided model `name` (not identifier-only label), remaining runtime-agnostic.
5. Run create/restore keeps `llmConfig.reasoning_effort` in manifest and normalizes it into Codex runtime session defaults.
6. Codex send-turn applies normalized session-default `reasoning_effort` to app-server `turn/start` payload (`effort`).

### Workflow M: Reopen Reasoning-Config Reconciliation

1. Frontend opens run and hydrates manifest config (`llmConfig`) with current model identifier.
2. Frontend loads current model schema from backend runtime model catalog.
3. Schema-driven reconciliation validates persisted reasoning fields against current schema enum/default constraints.
4. Valid values are preserved; invalid values are sanitized deterministically (or removed) without runtime-specific branching.
5. Reconciled config remains editable according to existing editable flags and is used for subsequent continue/turn flows.

### Workflow N: Continuation Manifest Source-Of-Truth

1. Continue request targets an inactive run and omits model/thinking overrides.
2. `RunContinuationService` reads run manifest and merges overrides with manifest defaults.
3. Restored runtime session receives manifest `llmModelIdentifier` and `llmConfig`.
4. Runtime normalizes session defaults (including reasoning effort where supported) before sending new turns.
5. For active runs, override policy returns `ignoredConfigFields` and runtime keeps existing session settings.

### Workflow O: Runtime Capability Gating

1. Frontend loads runtime capabilities from backend before enabling runtime selector interactions.
2. Backend `RuntimeCapabilityService.listRuntimeCapabilities()` returns runtime-kind rows (`enabled`, `reason`).
3. `AgentRunConfigForm` renders only enabled runtimes (or disabled entries with backend reason) with no runtime-specific hardcoded checks.
4. Continue/create payload still carries selected `runtimeKind` unchanged through existing flow.
5. `RuntimeCommandIngressService` consults operation-scoped capability policy before runtime dispatch.
6. If runtime becomes unavailable mid-session, send/approve operations fail fast with deterministic runtime-unavailable code/message.

### Workflow P: Runtime Degradation Command/Read Policy

1. Ingress receives runtime command (`send`, `approve`, `interrupt`, `terminate`) for a run session.
2. `runtime-capability-policy` classifies operation plane:
   - command-write (`send`, `approve`),
   - safety/lifecycle (`interrupt`, `terminate`).
3. For command-write operations when runtime unavailable:
   - reject deterministically (`RUNTIME_UNAVAILABLE_FOR_SEND` / `RUNTIME_UNAVAILABLE_FOR_APPROVAL`).
4. For safety/lifecycle operations when runtime unavailable:
   - execute best-effort local/session cleanup path and return deterministic degraded result metadata (`TERMINATE_BEST_EFFORT`).
5. Read-plane operations (`run projection`, history open) remain independent of command availability gating and continue via projection providers/fallbacks.

### Workflow E: Existing Run Runtime-Immutability Parity

1. Frontend opens run via `runOpenCoordinator` and stores resume config editable flags.
2. Backend `RunHistoryService.getRunResumeConfig(...)` returns `editableFields.runtimeKind=false`.
3. `RunConfigPanel` resolves `isRuntimeLockedForSelectedAgentRun`.
4. `AgentRunConfigForm` disables `runtime-kind` selector when runtime is locked.
5. User cannot issue an invalid existing-run runtime switch that would be rejected by continuation service.

### Workflow F: Terminate Lifecycle

1. User triggers terminate in history/running UI.
2. Frontend calls `agentRunStore.terminateRun(runId)`.
3. GraphQL `terminateAgentInstance(id)` executes.
4. Resolver attempts local termination and runtime termination for runtime-backed sessions.
5. On success, resolver updates run history to inactive and clears runtime session binding.
6. Frontend marks run inactive and refreshes history tree.

### Workflow G: Reopen/Reconnect Live Handoff

1. User opens an existing run from history.
2. Frontend fetches projection + resume config in parallel.
3. `decideRunOpenStrategy(...)` selects `KEEP_LIVE_CONTEXT` only when active + existing + subscribed.
4. `KEEP_LIVE_CONTEXT`: patch config only; do not overwrite live conversation state.
5. `HYDRATE_FROM_PROJECTION`: hydrate context from projection for inactive/unsubscribed cases.
6. If run is active, ensure websocket stream connection is (re)attached.

### Workflow H: Runtime Status Alias-Parity

1. Runtime notification arrives with either canonical slash method or legacy alias method.
2. `RunHistoryService.onRuntimeEvent(...)` resolves method through shared canonical normalizer.
3. Lifecycle status derivation branches on canonical value (`turn/started`, `turn/completed`, `error`).
4. `RunHistoryIndexStore` receives deterministic status transitions independent of method alias format.

## Use-Case Coverage Matrix

| Use Case | Primary Path | Fallback Path | Error Path | Mapped Sections |
| --- | --- | --- | --- | --- |
| UC-001 Create run with runtime kind selection | Yes | Yes | Yes | Workflows A/B |
| UC-002 Send user turn through runtime ingress | Yes | Yes | Yes | Workflows A/B |
| UC-003 Continue inactive run via runtime reference | Yes | Yes | Yes | Workflow B |
| UC-004 Stop generation via runtime interrupt | Yes | N/A | Yes | runtime command ingress + adapters |
| UC-005 Team approval/denial with personal routing | Yes | Yes | Yes | team stream handler + runtime ingress |
| UC-006 Runtime event normalization to websocket | Yes | Yes | Yes | Workflow C |
| UC-007 Runtime-scoped model listing/reload/preload | Yes | Yes | Yes | Workflow D |
| UC-008 Runtime transport/session failure handling | Yes | Yes | Yes | codex runtime service + command ingress |
| UC-009 Codex method-level compatibility coverage | Yes | Yes | Yes | runtime event message mapper |
| UC-010 Frontend runtime selector propagation | Yes | Yes | Yes | frontend form/store/open coordinator + workflow A/D |
| UC-011 Existing-run runtime immutability parity | Yes | N/A | Yes | workflow B + workflow E + run-history editable flags |
| UC-012 Terminate lifecycle completeness | Yes | Yes | Yes | workflow F + agent-instance resolver + run store |
| UC-013 Reopen/reconnect live-handoff completeness | Yes | Yes | Yes | workflow G + run-open coordinator/strategy |
| UC-014 Runtime-status alias parity | Yes | Yes | Yes | workflow C/H + run-history-service normalization |
| UC-015 Codex adapter boundary + segment-flow strictness | Yes | Yes | Yes | workflow C/I + codex runtime event adapter + frontend streaming handlers |
| UC-016 Codex history replay and continue-chat parity | Yes | Yes | Yes | workflow K + run projection service + codex runtime service |
| UC-017 Codex thinking metadata/config parity | Yes | Yes | Yes | workflow D/L + runtime model catalog + codex runtime adapter/service |
| UC-018 Codex history transformation completeness | Yes | Yes | Yes | workflow K + codex-thread projection provider |
| UC-019 Codex model metadata normalization completeness | Yes | Yes | Yes | workflow D/L + codex runtime model provider |
| UC-020 Codex reasoning effort lifecycle parity | Yes | Yes | Yes | workflow L + run continuation + codex runtime service |
| UC-021 Reopen reasoning-config reconciliation parity | Yes | Yes | Yes | workflow M + runOpen coordinator + model config schema adapter |
| UC-022 Continuation manifest source-of-truth parity | Yes | Yes | Yes | workflow B/N + run continuation service + runtime restore |
| UC-023 Runtime capability gating parity | Yes | Yes | Yes | workflow O + runtime capability service + runtime command ingress |
| UC-024 Runtime degradation command/read policy parity | Yes | Yes | Yes | workflow P + runtime capability policy + ingress/run-history boundaries |

## Naming Decisions + Drift Check

- Keep runtime integration under `runtime-execution/codex-app-server/*` to isolate transport/runtime concern from GraphQL/websocket concerns.
- Keep command boundary in `runtime-command-ingress-service.ts`; stream handlers must not call adapters directly.
- Keep mapping boundary in `runtime-event-message-mapper.ts`; stream handlers only orchestrate persist->map->send.
- Keep Codex-specific mapping in `codex-runtime-event-adapter.ts`; `runtime-event-message-mapper.ts` remains runtime-agnostic orchestration.
- Keep method-normalization boundary in `codex-runtime-method-normalizer.ts` so run-history and websocket mapping do not couple directly to each other.
- Drift finding resolved in v24: remove non-existent orchestrator/catch-up module assumptions from design artifacts.

## Dependencies And Risk

- External dependency: Codex App Server protocol behavior (especially approval idempotency semantics).
- Local risk: team runtime selector remains out of scope and should be tracked in follow-up ticket.
- Local risk: capability source drift if runtime selector availability is not sourced from backend capability metadata.
- Local risk: overly coarse availability gating could block terminate/cleanup safety paths during runtime outages unless operation-scoped policy is implemented.

## Verification Snapshot

- Build: `pnpm -C autobyteus-server-ts build:full` passed.
- Focused runtime tests: unit + websocket integration passed.
- Live runtime e2e: `RUN_CODEX_E2E=1` runtime + run-history GraphQL tests passed.
- Frontend schema parity: codegen passed against updated live backend schema (`BACKEND_GRAPHQL_BASE_URL=http://127.0.0.1:8011/graphql`).
- Terminate-path verification: backend run-history and live codex e2e plus frontend run/history terminate tests passed.
- Reopen/handoff verification: frontend run-history open-run strategy tests (including non-clobber active subscribed context) passed.
- Runtime alias-parity verification: shared runtime-method normalizer is wired in mapper + run-history service; targeted unit tests (mapper + run-history-service) and run-history GraphQL e2e passed.
- Startup smoke (no `--data-dir`): server reached listening state on port `8011`.
