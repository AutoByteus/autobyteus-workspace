# Proposed Design Document

## Design Version

- Current Version: `v18`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Server-owned runtime adapter architecture for Codex integration while keeping `autobyteus-ts` core strict. | 1 |
| v2 | Round 1 write-back | Added explicit runtime composition service, runtime command ingress boundary, and manifest migration/validation flow; strengthened decommission checks for legacy model service paths. | 1 |
| v3 | Round 2 write-back | Added active-run override policy, websocket pre-connect session-readiness policy, and explicit runtime model reload/preload call-path closure. | 2 |
| v4 | Round 4 write-back | Added explicit runtime-event identity/correlation envelope normalization (`eventId`, `sequence`, `occurredAt`) before websocket delivery. | 4 |
| v5 | Round 6 write-back | Added persistence parity requirement so run-history consumes the same normalized runtime envelope used for websocket mapping. | 6 |
| v6 | Round 8 write-back | Enforced persistence-before-mapping order in UC-006 so mapper failures do not create event-history gaps. | 8 |
| v7 | Round 10 write-back | Replaced session-scoped sequence state with run-scoped sequence ledger to keep event identity monotonic across reconnects/multi-session streaming. | 10 |
| v8 | Round 12 write-back | Added per-run event fanout hub so runtime stream is consumed once per run and broadcast to all websocket sessions. | 12 |
| v9 | Round 14 write-back | Added fanout subscriber-failure isolation and deterministic run-worker terminal cleanup semantics. | 14 |
| v10 | Round 16 write-back | Added explicit zero-subscriber policy (headless persistence mode + bounded orphan timeout) for active runs. | 16 |
| v11 | Round 18 write-back | Split worker orchestration from subscriber fanout and renamed fanout file to reflect actual subscriber concern ownership. | 18 |
| v12 | Round 20 write-back | Added explicit rename/move decommission closure checks for `runtime-event-fanout-hub` removal and stale-reference cleanup. | 20 |
| v13 | Round 22 write-back | Added reconnect catch-up replay contract (cursor-based) so missed events during disconnect can be replayed before live streaming resumes. | 22 |
| v14 | Round 24 write-back | Added reconnect replay watermark + pending-buffer handoff contract so reconnect sessions do not miss events emitted during catch-up replay. | 24 |
| v15 | Round 26 write-back | Added deterministic pending-subscriber cleanup contract when reconnect replay aborts mid-flight (disconnect/send failure). | 26 |
| v16 | Round 28 write-back | Added phase-aware reconnect cleanup contract so post-activation worker-start failures clean active sessions (not pending paths). | 28 |
| v17 | Round 30 write-back | Added connect-attempt idempotency contract so connect/disconnect races cannot apply cleanup to stale attempts. | 30 |
| v18 | Round 32 write-back | Aligned replay-abort error contract to attempt-scoped cleanup API (`abortConnectSession`) so design and call stack cannot diverge. | 32 |

## Summary

Introduce a server-owned runtime adapter layer so server runtime selection and Codex integration happen entirely in `autobyteus-server-ts`, while `autobyteus-ts` core remains strict and unchanged.

## Goals

- Keep `autobyteus-ts` core semantics strict (no nullable-core redesign).
- Add runtime selection via server composition (`autobyteus` / `codex_app_server`).
- Add explicit runtime command ingress for send/interrupt/approval calls.
- Add explicit run-manifest migration + validation for runtime references.
- Add explicit active-run override policy for continuation semantics.
- Unify model listing/reload/preload behind runtime model catalog service.
- Add deterministic runtime-event envelope identity for websocket delivery and client dedupe/order guarantees.
- Ensure normalized runtime-event envelope identity is consistent across websocket delivery and run-history persistence.
- Ensure run-history persistence is not bypassed when websocket mapping fails.
- Ensure event sequence allocation is run-scoped (not websocket-session-scoped) to preserve stable ordering and dedupe identity across reconnects.
- Ensure runtime event stream is consumed once per run (not once per websocket session) to prevent duplicate persistence and duplicate event identifiers.
- Ensure fanout broadcast isolates failing subscribers and does not terminate run worker for healthy subscribers.
- Ensure run worker/sequence state are deterministically cleaned at terminal run outcomes.
- Ensure active runs continue persisting events when subscriber count drops to zero, with bounded orphan-worker cleanup policy.
- Ensure file/module naming reflects owned concern boundaries (worker orchestration vs subscriber fanout).
- Ensure reconnecting sessions can replay missed persisted runtime events before live fanout resumes.
- Ensure reconnect replay/live handoff is gap-free when worker is already active by using replay watermark + pending subscriber buffer flush semantics.
- Ensure replay abort paths deterministically release pending subscriber state so reconnect failures do not leak buffers/sessions.
- Ensure reconnect cleanup is phase-aware: replay/activation failures clean pending state, while post-activation worker-start failures clean active subscriptions.
- Ensure reconnect cleanup is attempt-scoped and idempotent so concurrent disconnect/connect-abort paths cannot double-clean or clean stale session attempts.

## Non-Goals

- Changing `autobyteus-ts` `AgentConfig` invariants.
- Building UI runtime selector in this ticket.
- Supporting mixed-runtime execution inside one run.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove no-op stop-generation branches and direct `LlmModelService` runtime-path usage; do not keep dual model-source routing.

## Requirements And Use Cases

- UC-001: Create run with runtime kind selection.
- UC-002: Send user turn through runtime command ingress.
- UC-003: Continue inactive run via persisted runtime reference.
- UC-004: Stop generation via runtime interrupt API.
- UC-005: Tool approval/denial via runtime command ingress.
- UC-006: Canonical runtime event -> websocket message mapping with pre-connect policy and deterministic envelope identity.
- UC-007: Runtime-scoped model listing/reload/preload via runtime model catalog.
- UC-008: Runtime transport/session failure handling and deterministic cleanup.

## Codebase Understanding Snapshot (Pre-Design Mandatory)

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Boundaries | `AgentRunManager` currently owns local build + create/restore; websocket route delegates directly to handlers. | `src/agent-execution/services/agent-run-manager.ts`, `src/api/websocket/agent.ts` | Codex app server exact command/result payload contract needs spike validation. |
| Current Naming Conventions | `*Manager`, `*Service`, `*Handler` naming is consistent; runtime layering is currently implicit. | `AgentRunManager`, `RunContinuationService`, `AgentStreamHandler` | Final naming for route-level websocket command policy module can remain route-local if shared utility not needed. |
| Impacted Modules / Responsibilities | Stream handlers assume local `AgentEventStream`; STOP_GENERATION is no-op. | `src/services/agent-streaming/agent-stream-handler.ts`, `agent-team-stream-handler.ts` | Team-level command ingress token mapping to codex adapter needs strict contract tests. |
| Data / Persistence / External IO | Run manifest lacks runtime metadata; continuation is local-runtime-centric. | `src/run-history/domain/models.ts`, `src/run-history/services/run-continuation-service.ts` | Migration handling for existing manifests without runtime fields must be explicitly defined. |

## Current State (As-Is)

- Run creation always instantiates local LLM-backed runtime through `AgentRunManager`.
- Stream handlers consume local event stream assumptions.
- STOP_GENERATION only logs.
- GraphQL model listing/reload path is coupled to `LlmModelService`.
- Startup preloader is not runtime-aware.
- Run manifests do not preserve runtime engine identity/reference.

## Target State (To-Be)

- `RuntimeCompositionService` selects and configures runtime adapter by runtime kind.
- `RuntimeCommandIngressService` is the only path for send/interrupt/approval calls from stream handlers.
- `RuntimeSessionStore` tracks run->runtime session state.
- `RuntimeManifestMigrationService` upgrades old manifests and enforces runtime reference validation.
- `ActiveRunOverridePolicy` explicitly governs which overrides are allowed while run is active.
- Websocket route applies deterministic pre-connect command policy (`SESSION_NOT_READY`).
- `RuntimeEventMessageMapper` emits canonical websocket payloads independent of runtime source.
- Runtime model listing/reload/preload uses `RuntimeModelCatalogService` only.

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Add | N/A | `src/runtime-management/runtime-kind.ts` | Runtime kind constants + validation helpers. | runtime-management | canonical selector |
| C-002 | Add | N/A | `src/runtime-execution/runtime-adapter-port.ts` | Server runtime adapter API contract. | runtime-execution | command + event source interface |
| C-003 | Add | N/A | `src/runtime-execution/adapters/autobyteus-runtime-adapter.ts` | Local runtime path behind adapter boundary. | runtime-execution | wraps current local path, no behavior change |
| C-004 | Add | N/A | `src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts` | Codex runtime integration isolated in server. | runtime-execution | app server transport owned here |
| C-005 | Add | N/A | `src/runtime-execution/runtime-adapter-registry.ts` | Resolve adapter by runtime kind. | runtime-execution | injected into composition service |
| C-006 | Add | N/A | `src/runtime-execution/runtime-session-store.ts` | Active runtime session lookup/store. | runtime-execution, streaming | required for interrupt and approvals |
| C-007 | Add | N/A | `src/runtime-execution/runtime-composition-service.ts` | Central runtime selection/build/restore orchestration. | runtime-execution, agent-execution | removes adapter-specific logic from manager |
| C-008 | Add | N/A | `src/runtime-execution/runtime-command-ingress-service.ts` | Canonical send/interrupt/approval ingress. | streaming, runtime-execution | explicit ownership boundary for UC-005 |
| C-009 | Modify | `src/agent-execution/services/agent-run-manager.ts` | same | Delegate runtime create/restore to composition service. | agent-execution | manager no longer runtime-engine-specific |
| C-010 | Add | N/A | `src/services/agent-streaming/runtime-event-message-mapper.ts` | Canonical mapping from runtime events to websocket messages. | streaming | removes handler-local ad hoc mapping |
| C-011 | Modify | `src/services/agent-streaming/agent-stream-handler.ts` | same | Use runtime command ingress + runtime event source. | websocket streaming | STOP_GENERATION no-op removed |
| C-012 | Modify | `src/services/agent-streaming/agent-team-stream-handler.ts` | same | Team path uses runtime command ingress for approval/interrupt. | team streaming | explicit token translation stage |
| C-013 | Modify | `src/api/websocket/agent.ts` | same | Add deterministic pre-connect message policy (`SESSION_NOT_READY`). | websocket routes | avoids silent drop before session ready |
| C-014 | Modify | `src/run-history/domain/models.ts` | same | Add `runtimeKind` + `runtimeReference`. | run-history | strict schema |
| C-015 | Add | N/A | `src/run-history/services/runtime-manifest-migration-service.ts` | Migrate v1 manifests and enforce runtime reference invariants. | run-history | explicit upgrade path |
| C-016 | Add | N/A | `src/run-history/services/active-run-override-policy.ts` | Deterministic runtime override acceptance/rejection for active runs. | run-history | closes override ambiguity gap |
| C-017 | Modify | `src/run-history/services/run-continuation-service.ts` | same | Adapter-based resume + active override policy. | run-history | fail fast on invalid runtime reference |
| C-018 | Add | N/A | `src/runtime-management/model-catalog/runtime-model-provider.ts` | Runtime-scoped model-provider contract. | runtime-management | replaces LLM-only source ownership |
| C-019 | Add | N/A | `src/runtime-management/model-catalog/providers/autobyteus-runtime-model-provider.ts` | Existing model discovery as runtime provider. | runtime-management | wraps existing local source |
| C-020 | Add | N/A | `src/runtime-management/model-catalog/providers/codex-runtime-model-provider.ts` | Codex model discovery provider. | runtime-management | codex app server list models |
| C-021 | Add | N/A | `src/runtime-management/model-catalog/runtime-model-catalog-service.ts` | Unified runtime model list/reload/preload API. | runtime-management, GraphQL, startup | one source of truth |
| C-022 | Modify | `src/api/graphql/types/llm-provider.ts` | same | Runtime-aware listing/reload resolver path. | GraphQL | optional runtimeKind arg |
| C-023 | Modify | `src/startup/cache-preloader.ts` | same | Preload through runtime model catalog only. | startup | remove legacy bypass |
| C-024 | Remove | direct runtime-path `LlmModelService` usage | runtime model catalog usage | enforce no dual source. | GraphQL, startup | verified by grep gate |
| C-025 | Add | N/A | `src/services/agent-streaming/runtime-event-envelope-normalizer.ts` | Enforce deterministic websocket envelope metadata (`eventId`, `sequence`, `occurredAt`, `sourceRuntime`). | streaming | invoked before message mapping |
| C-026 | Modify | `src/services/agent-streaming/models.ts` | same | Add canonical metadata envelope for outbound runtime-originated server messages. | streaming protocol | enables client dedupe/replay safety |
| C-027 | Modify | `src/run-history/services/run-history-service.ts` | same | Consume normalized runtime envelope for event persistence/update derivation to keep parity with websocket output. | run-history, streaming | use the same envelope instance passed to mapper |
| C-028 | Modify | `src/services/agent-streaming/agent-stream-handler.ts` | same | Persist normalized envelope before mapping/sending so mapper failures do not drop persisted event trail. | streaming, run-history | mapping failures still emit websocket protocol error |
| C-029 | Add | N/A | `src/services/agent-streaming/runtime-event-sequence-ledger.ts` | Allocate monotonically increasing per-run event sequence for normalized envelopes. | streaming state | shared by all sessions bound to same run |
| C-030 | Add | N/A | `src/services/agent-streaming/runtime-run-stream-orchestrator.ts` | Own single per-run runtime stream worker lifecycle (start/stop/headless/orphan policy). | streaming state, runtime execution | isolates control-plane from subscriber fanout |
| C-031 | Rename/Move | `src/services/agent-streaming/runtime-event-fanout-hub.ts` | `src/services/agent-streaming/runtime-event-subscriber-hub.ts` | Name should reflect subscriber registry + broadcast responsibility (not worker orchestration). | streaming | improves naming naturalness |
| C-032 | Modify | `src/services/agent-streaming/runtime-run-stream-orchestrator.ts` | same | Define zero-subscriber active-run behavior: keep worker in headless persistence mode, then cleanup via terminal event or bounded orphan timeout. | streaming state, run-history | prevents data-loss on transient disconnect and prevents orphan leaks |
| C-033 | Modify | `src/services/agent-streaming/agent-stream-handler.ts` | same | Wire handler through orchestrator + subscriber hub boundaries. | websocket streaming | removes mixed worker/fanout ownership from handler |
| C-034 | Remove | stale imports/references to `runtime-event-fanout-hub` | orchestrator/subscriber-hub references only | Close rename decommission gap after C-031. | streaming, tests | enforced with grep gate |
| C-035 | Add | N/A | `src/services/agent-streaming/runtime-event-catchup-service.ts` | Replay persisted normalized runtime events from a reconnect cursor before live streaming resumes. | streaming, run-history | closes reconnect missed-event gap |
| C-036 | Modify | `src/services/agent-streaming/runtime-event-subscriber-hub.ts` | same | Add pending/activate session states and unicast send path for catch-up replay. | streaming | prevents live/catchup interleaving race |
| C-037 | Modify | `src/api/websocket/agent.ts` | same | Accept optional reconnect cursor (`after_sequence`) and pass to connect path. | websocket routes | enables deterministic catch-up contract |
| C-038 | Modify | `src/services/agent-streaming/runtime-event-catchup-service.ts` | same | Capture replay high-watermark sequence and return replay completion cursor to activation flow. | streaming, run-history | closes replay/live race window |
| C-039 | Modify | `src/services/agent-streaming/runtime-event-subscriber-hub.ts` | same | Buffer live broadcasts for pending reconnect sessions and drain buffered events above replay watermark during activation. | streaming | guarantees no event-loss between replay read and live attach |
| C-040 | Modify | `src/services/agent-streaming/agent-stream-handler.ts` | same | Coordinate reconnect handshake (`subscribePending` -> replay -> activateAfterReplay`) with replay watermark token. | websocket streaming | deterministic replay/live cutover |
| C-041 | Modify | `src/services/agent-streaming/runtime-event-catchup-service.ts` | same | Fail reconnect replay with explicit abort classification when replay delivery fails or connection closes. | streaming | closes pending replay abort ambiguity |
| C-042 | Modify | `src/services/agent-streaming/runtime-event-subscriber-hub.ts` | same | Add `cancelPending(sessionId, reason)` to release pending buffers/session state on replay abort before activation. | streaming | prevents pending-state leaks |
| C-043 | Modify | `src/services/agent-streaming/agent-stream-handler.ts` | same | Wrap reconnect handshake with abort cleanup on replay failure/disconnect-before-activate (later aligned to `abortConnectSession`). | websocket streaming | deterministic cleanup on failed connect |
| C-044 | Modify | `src/services/agent-streaming/runtime-event-subscriber-hub.ts` | same | Add phase-aware connect abort API to cleanup either pending or active subscriber state deterministically. | streaming | avoids cleanup mismatch after activation |
| C-045 | Modify | `src/services/agent-streaming/agent-stream-handler.ts` | same | Split reconnect handshake into phase-scoped failure handlers so worker-start failures after activation call active-session cleanup. | websocket streaming | closes post-activation failure leak |
| C-046 | Modify | `src/services/agent-streaming/runtime-event-subscriber-hub.ts` | same | Add connect-attempt token/state guard so `activateAfterReplay`, `abortConnectSession`, and `unsubscribe` are idempotent and scoped to one connect attempt. | streaming | closes connect/disconnect race cleanup ambiguity |
| C-047 | Modify | `src/services/agent-streaming/agent-stream-handler.ts` | same | Propagate `connectAttemptId` through replay/activation/abort/unsubscribe paths and ignore stale-attempt cleanup outcomes. | websocket streaming | prevents cross-attempt cleanup corruption |

## Architecture Overview

- API/WS input -> `RuntimeCompositionService` (create/restore) + `RuntimeCommandIngressService` (send/interrupt/approval).
- Route-level websocket guard rejects pre-connect commands with explicit protocol error.
- Runtime adapters emit runtime event envelopes.
- `RuntimeRunStreamOrchestrator` owns one active runtime stream worker per run and runtime worker lifecycle policies.
- `RuntimeEventSubscriberHub` owns subscriber registry + broadcast delivery with per-subscriber failure isolation.
- `RuntimeRunStreamOrchestrator` performs deterministic terminal cleanup (worker disposal + sequence ledger cleanup).
- `RuntimeRunStreamOrchestrator` transitions to headless persistence mode when no subscribers remain and run is still active.
- Headless workers are cleaned by terminal run event or bounded orphan timeout policy.
- `RuntimeEventCatchupService` replays persisted normalized envelopes from client reconnect cursor before subscriber activation.
- `RuntimeEventCatchupService` returns replay high-watermark sequence and replay diagnostics for deterministic activation.
- `RuntimeEventSubscriberHub` buffers live events for pending reconnect sessions and drains buffered events above replay watermark on activation.
- Replay aborts invoke `abortConnectSession({ connectAttemptId, phase: "pending" })` so pending session state is always released before connect failure returns.
- `RuntimeEventSubscriberHub` exposes phase-aware `abortConnectSession` to clean pending vs active state based on where reconnect fails.
- `RuntimeEventSubscriberHub` enforces connect-attempt-scoped idempotency so cleanup operations for stale attempts are no-op and cannot disturb current attempt state.
- `RuntimeEventSequenceLedger` allocates monotonic per-run sequence values across all active websocket sessions.
- `RuntimeEventEnvelopeNormalizer` assigns/validates event identity metadata and run-scoped sequence.
- Run-history persists normalized runtime event envelope before websocket mapping.
- `RuntimeEventMessageMapper` converts normalized runtime events into websocket message schema.
- GraphQL/startup model paths resolve by runtime through runtime model catalog.

## File And Module Breakdown

| File/Module | Change Type | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- |
| `src/runtime-execution/runtime-composition-service.ts` | Add | Runtime adapter selection for create/restore | `createRun`, `restoreRun` | run config in -> runtime run/session out | adapter registry, session store |
| `src/runtime-execution/runtime-command-ingress-service.ts` | Add | Runtime command path for send/interrupt/approval | `sendTurn`, `interruptRun`, `approveTool` | session+command in -> runtime outcome out | session store, adapter registry |
| `src/services/agent-streaming/runtime-run-stream-orchestrator.ts` | Add | Per-run runtime worker lifecycle orchestration | `ensureRunWorker`, `onSubscriberCountZero`, `cleanupRunWorker` | run id in -> worker state transitions out | runtime adapter registry, run-history, mapper, sequence ledger, subscriber hub |
| `src/services/agent-streaming/runtime-event-subscriber-hub.ts` | Rename/Move | Subscriber registry + fanout delivery boundary | `subscribePending`, `activateAfterReplay`, `cancelPending`, `abortConnectSession`, `unsubscribe`, `broadcast`, `sendToSession`, `subscriberCount` | run/session + connect attempt in -> buffered pending + live fanout messages out | websocket connections |
| `src/services/agent-streaming/runtime-event-catchup-service.ts` | Add | Replay persisted normalized runtime envelopes for reconnecting sessions | `replayFromSequence` | runId + cursor in -> replay messages + replay watermark or replay-abort error out | run-history service, subscriber hub |
| `src/services/agent-streaming/runtime-event-sequence-ledger.ts` | Add | Run-scoped sequence allocator for runtime events | `nextSequence`, `initializeFromHistory` | run id in -> next sequence out | run-history service, in-memory cache |
| `src/services/agent-streaming/runtime-event-envelope-normalizer.ts` | Add | Canonical runtime-event identity/correlation normalization | `normalizeRuntimeEnvelope` | runtime event + run sequence in -> normalized envelope out | runtime-event-sequence-ledger |
| `src/services/agent-streaming/agent-stream-handler.ts` | Modify | Session lifecycle + catch-up + orchestrator/subscriber-hub wiring | `connect`, `disconnect` | session + cursor in -> replay catch-up + watermark activation + live stream with phase-scoped and attempt-scoped cleanup on failure | runtime-event-catchup-service, runtime-run-stream-orchestrator, runtime-event-subscriber-hub |
| `src/services/agent-streaming/runtime-event-message-mapper.ts` | Add | Canonical mapping from runtime events to websocket messages | `mapRuntimeEventToServerMessage` | runtime event in -> `ServerMessage` out | streaming models |
| `src/run-history/services/run-history-service.ts` | Modify | Consume normalized runtime event envelope for persistence parity | `onRuntimeEvent` | normalized envelope in -> persisted event/status updates out | run-history stores |
| `src/run-history/services/runtime-manifest-migration-service.ts` | Add | Manifest upgrade and runtime reference validation | `migrateAndValidate` | manifest in -> upgraded valid manifest out | run-history models |
| `src/run-history/services/active-run-override-policy.ts` | Add | Validate override fields on active run continuation | `resolveOverrideDecision` | overrides in -> allowed/denied + diagnostics out | continuation service |
| `src/runtime-management/model-catalog/runtime-model-catalog-service.ts` | Add | Runtime-scoped model listing/reload/preload | `listModels`, `reload*`, `preload*` | runtime selector in -> model records out | runtime model providers |

## Naming Decisions (Natural And Implementation-Friendly)

| Item Type (`File`/`Module`/`API`) | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| Module | implicit runtime selection in manager | `runtime-composition-service` | explicit SoC for create/restore runtime selection | removes manager overload |
| Module | ad hoc command handling in handlers | `runtime-command-ingress-service` | explicit ownership for send/interrupt/approval flow | shared by agent + team handlers |
| Module | overloaded `runtime-event-fanout-hub` | `runtime-run-stream-orchestrator` + `runtime-event-subscriber-hub` | separates run-worker lifecycle from subscriber/broadcast concern | improves natural naming and maintenance |
| Module | none | `active-run-override-policy` | clear semantics for active continuation override handling | required by UC-003 hardening |
| Route behavior | silent early message handling | `SESSION_NOT_READY` pre-connect policy | deterministic client behavior | route-level policy in websocket route |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| Runtime composition service | adapter registry, session store | agent manager, continuation service | Medium | composition has no streaming logic |
| Runtime command ingress service | session store, adapter registry | stream handlers | Medium | ingress does not perform mapping/rendering |
| Runtime run stream orchestrator | runtime adapter registry, run-history, mapper, sequence ledger | stream handlers | Medium | owns only worker lifecycle and run-level policies |
| Runtime event subscriber hub | websocket subscribers | stream handlers, orchestrator | Medium | owns pending/live session states, per-session buffering, fanout isolation, and attempt-scoped/phase-aware connect abort cleanup |
| Runtime event catchup service | run-history read path, subscriber hub unicast | stream handlers | Medium | replay-before-activate with replay watermark; emits explicit replay-abort outcome for cleanup |
| Runtime run stream orchestrator (no-subscriber lifecycle) | subscriber count state, run terminal signals | stream handlers | Medium | headless mode + bounded orphan timeout + deterministic cleanup |
| Active-run override policy | run continuation input + manifest | continuation service | Medium | policy isolated from adapter transport |
| Runtime model catalog service | runtime model providers | GraphQL + startup preload | Medium | remove direct legacy service calls |

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| STOP_GENERATION no-op in handlers | Replace with command ingress interrupt call and outcome response. | No silent no-op fallback. | websocket integration tests for interrupt outcomes. |
| Direct runtime-path `LlmModelService` in GraphQL/startup | Replace with runtime model catalog calls. | No dual-source model listing. | `rg -n "getLlmModelService\(" src/api/graphql/types/llm-provider.ts src/startup/cache-preloader.ts` returns no hits. |
| Local-runtime-only continuation assumption | Require migrated+validated runtime reference before restore. | No implicit fallback for codex runs. | continuation integration tests + manifest validation tests. |
| Missing operational reload/preload runtime call-path coverage | Add explicit reload mutation and startup preload runtime catalog paths in call stacks/tests. | Avoid hidden runtime-model bypass. | GraphQL reload + startup preload integration tests pass via runtime model catalog. |
| Legacy fanout module references after C-031 rename | Remove old import paths/symbol references and old file remnants. | No dual naming path (`fanout-hub` vs `subscriber-hub`). | `rg -n "runtime-event-fanout-hub" src tests` returns no hits. |

## Data Models (If Needed)

- `RuntimeRunReference`
  - `runtimeKind: "autobyteus" | "codex_app_server"`
  - `sessionId: string | null`
  - `threadId: string | null`
  - `modelIdentifier: string`
  - `runtimeMetadata: Record<string, unknown> | null`

- `RunManifestV2`
  - existing V1 fields
  - `runtimeKind: string`
  - `runtimeReference: RuntimeRunReference`

- `RuntimeCommandContext`
  - `runId: string`
  - `runtimeKind: string`
  - `sessionRef: RuntimeRunReference`
  - `approvalToken?: string | null`

## Error Handling And Edge Cases

- Missing/invalid runtime reference after migration -> `RUNTIME_REFERENCE_INVALID` and continue denied.
- Active-run override includes disallowed runtime fields -> explicit reject with `ignoredConfigFields`/diagnostic reason.
- Pre-connect websocket command -> explicit `SESSION_NOT_READY` error response.
- Interrupt on non-active run -> deterministic `not_found` response.
- Duplicate stale approval token -> idempotent no-op result with warning event.
- Runtime event missing upstream id -> generate deterministic `eventId` from `(runId, sequence)` and mark source as synthesized.
- Run-history persistence receives non-normalized event after websocket normalization -> reject and log `RUNTIME_EVENT_ENVELOPE_MISMATCH`.
- Runtime-event mapping failure after persistence -> send websocket protocol `ERROR` and continue stream without dropping persisted event.
- Duplicate run worker acquisition attempt -> reject second worker and attach session to existing worker.
- Subscriber send failure during fanout -> evict failed subscriber and continue broadcasting to remaining subscribers.
- Run reaches terminal status or terminal transport error -> close run worker, clear subscribers, and cleanup sequence ledger state.
- Last subscriber disconnects while run active -> keep worker alive in headless persistence mode; no broadcast until subscriber returns.
- Headless worker exceeds orphan timeout without terminal signal -> force cleanup (and optional interrupt) with diagnostics.
- Reconnect cursor malformed -> reject connect with protocol error and require client to retry with valid cursor.
- Reconnect cursor outside retained history window -> emit replay gap error and instruct full thread/run-history sync.
- Pending replay buffer exceeds bounded limit before activation -> reject reconnect with `REPLAY_BUFFER_OVERFLOW` and require full sync.
- Replay delivery abort (socket close/send failure during replay) -> call `abortConnectSession({ connectAttemptId, phase: "pending" })`, fail connect deterministically, require client reconnect.
- Worker-start failure after activation -> call phase-aware abort for active session and emit connect failure (no leaked active subscriber).
- Disconnect arrives during connect-abort cleanup race -> enforce connect-attempt token check; stale/double cleanup is idempotent no-op.
- Codex transport timeout with retry budget exhausted -> session cleanup + run status `ERROR`.

## Use-Case Coverage Matrix (Design Gate)

| use_case_id | Use Case | Primary Path Covered (`Yes`/`No`) | Fallback Path Covered (`Yes`/`No`/`N/A`) | Error Path Covered (`Yes`/`No`/`N/A`) | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Create run with runtime kind selection | Yes | Yes | Yes | UC-001 |
| UC-002 | Send user turn via command ingress | Yes | N/A | Yes | UC-002 |
| UC-003 | Continue inactive run via migrated runtime reference | Yes | Yes | Yes | UC-003 |
| UC-004 | Stop generation via runtime interrupt | Yes | N/A | Yes | UC-004 |
| UC-005 | Tool approval/denial via command ingress | Yes | N/A | Yes | UC-005 |
| UC-006 | Runtime event normalization with envelope identity + pre-connect policy | Yes | Yes | Yes | UC-006 |
| UC-007 | Runtime-scoped model listing/reload/preload | Yes | Yes | Yes | UC-007 |
| UC-008 | Runtime failure handling and cleanup | Yes | Yes | Yes | UC-008 |

## Performance / Security Considerations

- Bound retries and backpressure in codex adapter event loops.
- Do not log runtime secret payloads/tokens.
- Ensure one stream consumer worker per run with deterministic subscriber fanout cleanup.

## Migration / Rollout (If Needed)

1. Add runtime adapter contracts, registry, composition, and command ingress with Autobyteus adapter first.
2. Add runtime manifest v2 migration + strict validation + active-run override policy.
3. Switch stream handlers/routes to command ingress, event mapper, and pre-connect policy.
4. Add Codex adapter + Codex runtime model provider.
5. Move GraphQL/startup model paths to runtime model catalog.
6. Remove legacy runtime-path `LlmModelService` usage and enforce grep gates.

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/Manual) | Status |
| --- | --- | --- | --- |
| C-001..C-013 | T1-T6 | Unit + Integration | Planned |
| C-014..C-017 | T7-T9 | Unit + Integration | Planned |
| C-018..C-024 | T10-T13 | Unit + Integration + grep decommission checks | Planned |
| C-025..C-026 | T14-T15 | Unit + Integration | Planned |
| C-027 | T16 | Unit + Integration | Planned |
| C-028 | T17 | Unit + Integration | Planned |
| C-029 | T18 | Unit + Integration | Planned |
| C-030 | T19 | Unit + Integration | Planned |
| C-031 | T20 | Unit + Integration | Planned |
| C-032 | T21 | Unit + Integration | Planned |
| C-033 | T22 | Unit + Integration | Planned |
| C-034 | T23 | Unit + Integration + grep decommission check | Planned |
| C-035..C-037 | T24-T26 | Unit + Integration | Planned |
| C-038..C-040 | T27-T29 | Unit + Integration | Planned |
| C-041..C-043 | T30-T32 | Unit + Integration | Planned |
| C-044..C-045 | T33-T34 | Unit + Integration | Planned |
| C-046..C-047 | T35-T36 | Unit + Integration | Planned |

## Design Feedback Loop Notes (From Review/Implementation)

| Date | Trigger (Review/File/Test/Blocker) | Design Smell | Design Update Applied | Status |
| --- | --- | --- | --- | --- |
| 2026-02-14 | Initial redesign kickoff | Core invariant dilution risk in prior approach | Chose server-owned adapter architecture with unchanged core framework invariants. | Updated |
| 2026-02-14 | Review round 1 | Missing explicit composition/ingress boundaries and manifest migration gate. | Added runtime composition/command ingress/migration services. | Updated |
| 2026-02-14 | Review round 2 | Missing active override policy, pre-connect determinism, and reload/preload closure. | Added `active-run-override-policy`, route pre-connect policy, and explicit runtime model reload/preload scope. | Updated |
| 2026-02-14 | Review round 4 | Missing explicit runtime-event identity contract for websocket mapping. | Added `runtime-event-envelope-normalizer` and protocol metadata envelope requirements. | Updated |
| 2026-02-14 | Review round 6 | Missing parity between websocket event identity and persisted run-history event identity. | Updated run-history path to consume normalized envelope directly. | Updated |
| 2026-02-14 | Review round 8 | Mapper-failure path could bypass persistence due incorrect operation ordering in UC-006. | Enforced persist-before-map stream order and explicit mapping-failure continuation policy. | Updated |
| 2026-02-14 | Review round 10 | Session-scoped sequence state could break run-scoped event-id monotonicity on reconnect/multi-session usage. | Added run-scoped `runtime-event-sequence-ledger` and updated normalizer dependency. | Updated |
| 2026-02-14 | Review round 12 | Per-session stream consumption risked duplicate persistence and duplicate event identifiers for one run. | Added `runtime-event-fanout-hub` with one stream worker per run and session fanout model. | Updated |
| 2026-02-14 | Review round 14 | Fanout hub lacked subscriber isolation and terminal cleanup semantics, risking worker-wide failures and stale state leaks. | Added per-subscriber failure eviction and explicit terminal worker/sequence cleanup policy. | Updated |
| 2026-02-14 | Review round 16 | Zero-subscriber behavior during active runs was ambiguous, risking either data loss (if stopped) or leaks (if never cleaned). | Added headless persistence mode + bounded orphan timeout cleanup policy in fanout hub. | Updated |
| 2026-02-14 | Review round 18 | `runtime-event-fanout-hub` mixed lifecycle orchestration and subscriber fanout responsibilities; naming no longer matched true scope. | Split into `runtime-run-stream-orchestrator` + `runtime-event-subscriber-hub` and rewired handler boundaries. | Updated |
| 2026-02-14 | Review round 20 | Rename/move cleanup closure for `runtime-event-fanout-hub` was not explicitly enforced in decommission gates. | Added explicit C-034 decommission item and grep verification rule. | Updated |
| 2026-02-14 | Review round 22 | Reconnect path lacked catch-up replay semantics for events missed during disconnect. | Added cursor-based `runtime-event-catchup-service` with replay-before-activate subscriber flow. | Updated |
| 2026-02-14 | Review round 24 | Reconnect flow still had race window when worker already active; events could arrive between catch-up read and live activation. | Added replay watermark return and pending-subscriber buffer-drain activation contract. | Updated |
| 2026-02-14 | Review round 26 | Replay failure path lacked deterministic pending-session cleanup semantics, risking leaked pending buffers after aborted reconnect attempts. | Added explicit replay-abort classification and `cancelPending` cleanup contract in connect flow. | Updated |
| 2026-02-14 | Review round 28 | Connect flow cleanup was not phase-aware; worker-start failure after activation could invoke pending cleanup path incorrectly. | Added phase-aware connect abort contract (`abortConnectSession`) and split handler cleanup by failure phase. | Updated |
| 2026-02-14 | Review round 30 | Connect/disconnect race lacked attempt-scoped idempotency guard, risking stale cleanup affecting a newer reconnect attempt. | Added connect-attempt token contract and idempotent stale-attempt no-op cleanup semantics. | Updated |
| 2026-02-14 | Review round 32 | Error-handling section still referenced legacy `cancelPending` semantics for replay-abort, diverging from attempt-scoped cleanup design. | Updated replay-abort contract to `abortConnectSession` with `connectAttemptId` to match UC-006 call stack. | Updated |

## Open Questions

- Final Codex app server payload contract for interrupt + approval idempotency outcomes.
- Whether team-level Codex execution needs a dedicated team adapter wrapper or only command-ingress token routing.
