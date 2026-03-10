# Proposed Design Document

## Design Version

- Current Version: `v3`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Added server-side durable callback outbox, dynamic callback target resolver, and lifecycle-managed dispatch worker. | 1 |
| v2 | Requirement-gap re-entry | Added managed gateway unexpected-exit restart and heartbeat/liveness supervision with bounded restart policy. | 3 |
| v3 | Stage 8 design-impact re-entry | Split managed gateway ownership into public facade, runtime lifecycle, supervision, and runtime-health helper modules so restart reliability remains maintainable under Stage 8 review constraints. | 5 |

## Artifact Basis

- Investigation Notes: `tickets/in-progress/message-delivery-robustness/investigation-notes.md`
- Requirements: `tickets/in-progress/message-delivery-robustness/requirements.md`
- Requirements Status: `Refined`

## Summary

Close the only non-durable link in the external messaging reply chain by moving server reply publishing from synchronous direct HTTP callback to a durable server-side callback outbox with an async dispatch worker. The worker resolves the current gateway callback target on each attempt, so replies survive gateway-down periods and are retried when the gateway becomes available again. In managed mode, the server also supervises gateway unexpected exits and stale runtime heartbeats with bounded restart policy. To keep that reliability work maintainable, `ManagedMessagingGatewayService` remains the public facade while dedicated lifecycle, supervision, and runtime-health modules own the internal policy-heavy behavior. The gateway keeps its existing durable outbound queue for the provider/bot side, and standalone gateways still require an external supervisor.

## Goals

1. Prevent silent reply loss when the gateway is down or unhealthy.
2. Preserve idempotent behavior across duplicate callback processing and retry sends.
3. Keep gateway acceptance distinct from final provider delivery tracking.
4. Restore a server-managed gateway automatically after recoverable crashes or heartbeat/liveness stalls.
5. Keep the implementation localized to existing server runtime concerns without introducing compatibility wrappers or a second supervision subsystem.
6. Keep managed gateway ownership split along stable reasons-to-change so future reliability work does not re-concentrate in one file.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: replace direct synchronous reply publishing from runtime/processors with the new outbox-based delivery flow.
- Gate rule: design is invalid if it depends on compatibility wrappers, dual-path behavior, or legacy fallback branches.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| R-001 | Persist outbound replies durably before depending on gateway availability. | AC-001 | Reply remains queued when gateway is down. | UC-001, UC-002 |
| R-002 | Retry queued replies with bounded backoff and lease recovery. | AC-001, AC-002, AC-003 | Retry and crash recovery prevent stuck or silently lost replies. | UC-002, UC-003 |
| R-003 | Preserve idempotency across duplicates and retries. | AC-004 | One callback key maps to one durable callback work item. | UC-004 |
| R-004 | Distinguish server callback queue state from later gateway/provider delivery state. | AC-003, AC-005 | Operators can tell where delivery is stalled. | UC-001, UC-003 |
| R-005 | Start and stop callback delivery runtime with the server lifecycle. | AC-002 | Worker resumes after restart and stops cleanly. | UC-002, UC-003 |
| R-006 | Restart a server-managed gateway automatically after unexpected exit. | AC-006 | Managed gateway returns without manual intervention after recoverable crashes. | UC-005 |
| R-007 | Restart a server-managed gateway when runtime heartbeat/liveness goes stale or unhealthy while the process is still present. | AC-007 | Wedged managed runtimes are recycled before callback work stalls indefinitely. | UC-006 |

## Codebase Understanding Snapshot (Pre-Design Mandatory)

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Boundaries | Gateway already owns durable inbox/outbox workers and exposes runtime reliability state; server reply path is still synchronous and managed supervision only handles startup/exit state today. | `autobyteus-message-gateway/src/bootstrap/create-gateway-app.ts`, `autobyteus-message-gateway/src/http/routes/runtime-reliability-route.ts`, `autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts`, `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts` | None blocking design. |
| Current Naming Conventions | External-channel runtime orchestration sits under `src/external-channel/runtime`; domain-facing behavior stays under `.../services`. | `autobyteus-server-ts/src/external-channel/runtime/*`, `autobyteus-server-ts/src/external-channel/services/*` | None. |
| Impacted Modules / Responsibilities | Reply callback assembly is duplicated across processor and runtime turn bridge; callback target resolution is currently direct and synchronous; managed gateway admin API, runtime lifecycle, and supervision policy are concentrated in one service file. | `external-channel-assistant-reply-processor.ts`, `runtime-external-channel-turn-bridge.ts`, `gateway-callback-publisher-options-resolver.ts`, `managed-messaging-gateway-service.ts` | None. |
| Data / Persistence / External IO | Server has atomic file persistence helpers and existing delivery-event persistence, but no callback outbox persistence. | `persistence/file/store-utils.ts`, `delivery-event-service.ts` | Multi-node shared persistence remains future scope. |

## Current State (As-Is)

1. `ReplyCallbackService.publishAssistantReplyByTurn(...)` validates input, reserves callback idempotency, records `PENDING`, and publishes to gateway immediately through `GatewayCallbackPublisher`.
2. If the gateway callback fails, the service records `FAILED` and throws.
3. Callers catch and log the error, so the reply is lost after a single failure.
4. The managed-gateway callback target is resolved only from an explicit callback base URL or a currently running managed gateway snapshot; when the managed gateway is down, the callback path can appear “not configured”.
5. `ManagedMessagingGatewayService.handleProcessExit(...)` writes lifecycle `BLOCKED` on unexpected exit instead of attempting restart.
6. The gateway already publishes runtime reliability state and lock heartbeat timestamps, but the managed service does not run a periodic liveness policy against that signal, so a stuck gateway can remain wedged indefinitely.
7. `managed-messaging-gateway-service.ts` also mixes public admin API, runtime lifecycle/reachability orchestration, and supervision policy in one module, which makes the reliability boundary harder to review and maintain.

## Target State (To-Be)

1. `ReplyCallbackService.publishAssistantReplyByTurn(...)` validates input, checks whether callback delivery is configured, reserves callback idempotency, records `PENDING`, and persists a callback outbox record keyed by `callbackIdempotencyKey`.
2. A lifecycle-managed `GatewayCallbackDispatchWorker` polls the durable outbox, resolves the current callback target dynamically, and POSTs the callback envelope to the gateway when available.
3. The worker records successful gateway acceptance as `SENT` in the callback outbox and updates the existing delivery event to `SENT`.
4. Transient gateway-down or callback-target-unavailable states become retryable outbox states with bounded backoff.
5. Terminal failures or exhausted retries become `DEAD_LETTER` with attempt count and last error preserved.
6. `ManagedMessagingGatewayService` becomes the public managed-gateway facade and composes dedicated runtime lifecycle and supervision modules instead of owning all policy-heavy logic directly.
7. A dedicated managed runtime lifecycle module owns install/start/adopt/restart/stop/reconcile behavior and reachable-runtime discovery.
8. A dedicated managed supervision module owns process-exit recovery, timer lifecycle, heartbeat/liveness evaluation, and bounded restart scheduling for managed gateways:
   - unexpected process exits schedule restart attempts,
   - stale or unhealthy runtime reliability/heartbeat state schedules restart attempts,
   - repeated failed restarts eventually degrade to `BLOCKED`.
9. A small managed runtime-health helper module owns runtime reliability payload parsing, heartbeat staleness checks, and restart backoff policy helpers so supervision logic is explicit and reusable.
10. The managed supervision loop uses the existing runtime-reliability endpoint and heartbeat timestamps instead of introducing a second heartbeat channel.
11. The gateway continues to queue accepted callbacks into its own outbound outbox and later reports provider delivery events back to the server.

## Shared Architecture Principles (Design + Review, Mandatory)

- Principle alignment statement: design and review both evaluate this ticket as a runtime delivery orchestration problem, not as a local “retry one HTTP request” patch.
- SoC cause statement: reply-content selection stays in `ReplyCallbackService`; callback target discovery stays in a resolver; durable queue state stays in outbox store/service; retry policy stays in the dispatch worker; managed gateway public API, runtime lifecycle, and supervision policy are separated into distinct modules.
- Layering result statement: the structure remains `service -> runtime orchestration -> infra/persistence/publisher`, with layering emerging from clear ownership of validation, orchestration, and IO.
- Decoupling rule statement: reply services enqueue work without depending on gateway liveness; the worker depends on a target resolver and publisher boundary, not on callers.
- Module/file placement rule statement: new callback runtime pieces live under `src/external-channel/runtime` because they coordinate runtime delivery; reply-domain behavior stays under `src/external-channel/services`.

## Architecture Direction Decision (Mandatory)

- Chosen direction: `Add` a durable server callback delivery runtime and `Remove` direct synchronous publish coupling from reply generation.
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`): this adds one orchestration boundary but removes silent loss, makes retry behavior testable in isolation, and keeps operational state explicit.
- Layering fitness assessment (are current layering and interactions still coherent under emergent-layering rules?): `Yes`
- Decoupling assessment (are boundaries low-coupled with clear one-way dependency directions?): `Yes`
- Module/file placement assessment (do file paths/folders match owning concerns for this scope?): `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Add`, `Split`, `Remove`

## Layering Emergence And Extraction Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers (provider selection/fallback/retry/aggregation/routing/fan-out) exists | Yes | Reply callback service assembly is duplicated in two callers; retry policy is currently absent but belongs in one place. | Extract orchestration boundary |
| Responsibility overload exists in one file/module (multiple concerns mixed) | Yes | `ReplyCallbackService` currently validates reply intent, records delivery events, and performs direct transport publishing. `managed-messaging-gateway-service.ts` also concentrates public admin API, runtime lifecycle, and supervision policy. | Split + lift coordination |
| Proposed new layer owns concrete coordination policy (not pass-through only) | Yes | Worker owns lease/retry/backoff/target-resolution policy. | Keep layer |
| Current layering can remain unchanged without SoC/decoupling degradation | No | Leaving direct publish in callers or service would keep reply generation coupled to gateway liveness. | Change |

### Optional Alternatives (Use For Non-Trivial Or Uncertain Changes)

| Option | Summary | Pros | Cons | Decision (`Chosen`/`Rejected`) | Rationale |
| --- | --- | --- | --- | --- | --- |
| A | Durable server callback outbox with async dispatch worker | Survives gateway downtime and process interruption; uses existing gateway idempotency safely | Adds runtime queue/state machine | Chosen | Best match for reliability and diagnosability goals |
| B | Keep synchronous publish and add a few inline retries | Small change | Still loses replies on server crash or long gateway outage; does not preserve durable state | Rejected | Not durable enough |
| C | Only improve gateway restart/health behavior | Helps uptime | Does not protect replies created while gateway is unavailable | Rejected | Fails core requirement R-001 |
| D | Add a brand-new heartbeat transport between server and gateway | Could provide a dedicated liveness signal | Unnecessary because the gateway already exposes reliability and heartbeat state | Rejected | Existing runtime-reliability endpoint is sufficient for this scope |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Add | N/A | `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-dispatch-target-resolver.ts` | Resolve explicit or managed callback target availability without requiring live synchronous publish at reply-creation time. | Runtime orchestration, managed gateway integration | Async resolver |
| C-002 | Add | N/A | `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-outbox-store.ts` | Persist callback outbox records with lease and retry state. | Persistence, runtime delivery | File-backed durable state |
| C-003 | Add | N/A | `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-outbox-service.ts` | Encapsulate queue state transitions. | Runtime delivery | Stable service boundary |
| C-004 | Add | N/A | `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-dispatch-worker.ts` | Own retry/backoff/lease recovery and publish attempts. | Runtime delivery | Lifecycle-managed worker |
| C-005 | Add | N/A | `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-delivery-runtime.ts` | Share runtime singleton/factory and worker lifecycle wiring. | Startup, reply service assembly | Removes duplicated setup logic |
| C-006 | Modify | `autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts` | same | Enqueue durable callback work instead of direct synchronous publish. | Reply service, delivery events | `published` now means accepted for delivery runtime |
| C-007 | Modify | `autobyteus-server-ts/src/agent-customization/processors/response-customization/external-channel-assistant-reply-processor.ts` | same | Use shared reply callback runtime assembly. | Reply processor | Removes duplicated publisher setup |
| C-008 | Modify | `autobyteus-server-ts/src/external-channel/runtime/runtime-external-channel-turn-bridge.ts` | same | Use shared reply callback runtime assembly. | Runtime-native reply routing | Removes duplicated publisher setup |
| C-009 | Modify | `autobyteus-server-ts/src/app.ts` | same | Start and stop callback delivery runtime with app lifecycle. | Server lifecycle | Required for R-005 |
| C-010 | Remove | `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-publisher-options-resolver.ts` | replaced by `gateway-callback-dispatch-target-resolver.ts` | Old sync resolver conflates “currently running” with “configured for delivery”. | Runtime delivery | Replace tests accordingly |
| C-011 | Modify | `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts` | same | Reduce the public service to a facade that owns admin-facing lifecycle API and delegates runtime lifecycle and supervision responsibilities. | Managed gateway public boundary | Structural split required by Stage 8 review |
| C-012 | Add | N/A | `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-lifecycle.ts` | Isolate install/start/adopt/restart/stop/reconcile runtime lifecycle behavior from the public facade and timer policy. | Managed gateway runtime lifecycle | Keeps process and reachability behavior in one module |
| C-013 | Add | N/A | `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-supervision.ts` | Isolate timer lifecycle, exit-triggered recovery, heartbeat/liveness-triggered recovery, and bounded restart scheduling. | Managed gateway supervision | Keeps restart policy independent from admin APIs |
| C-014 | Add | N/A | `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-health.ts` | Isolate runtime reliability payload parsing, heartbeat staleness logic, and restart-delay policy helpers. | Managed gateway runtime health support | Prevents supervision and facade files from accumulating support logic |

## Module/File Placement And Ownership Check (Mandatory)

| File/Module | Current Path | Target Path | Owning Concern / Platform | Path Matches Concern? (`Yes`/`No`) | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| Reply callback service | `src/external-channel/services/reply-callback-service.ts` | same | External-channel reply-domain behavior | Yes | Keep | It should still own validation, source lookup, and queue submission. |
| Callback target resolution | old sync resolver | `src/external-channel/runtime/gateway-callback-dispatch-target-resolver.ts` | Runtime delivery orchestration | Yes | Move/Replace | Availability-aware target resolution is runtime policy, not generic options glue. |
| Callback outbox persistence | N/A | `src/external-channel/runtime/gateway-callback-outbox-store.ts` | Runtime delivery persistence | Yes | Keep | This queue exists only to support runtime callback delivery. |
| Dispatch worker | N/A | `src/external-channel/runtime/gateway-callback-dispatch-worker.ts` | Runtime delivery orchestration | Yes | Keep | Retry and lease policy belong in runtime. |
| Managed gateway public facade | `src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts` | same | Managed gateway admin-facing lifecycle boundary | Yes | Split | The package boundary is correct, but the single-file boundary is overloaded. |
| Managed gateway runtime lifecycle | N/A | `src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-lifecycle.ts` | Managed runtime start/stop/adopt/reconcile behavior | Yes | Add | Start/stop/reachability logic should not live in the public facade. |
| Managed gateway supervision | N/A | `src/managed-capabilities/messaging-gateway/managed-messaging-gateway-supervision.ts` | Managed exit recovery, heartbeat evaluation, and restart timers | Yes | Add | Timer and restart policy are separate from public admin API. |
| Managed gateway runtime health | N/A | `src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-health.ts` | Reliability payload parsing and supervision policy helpers | Yes | Add | Shared support logic should not remain at the bottom of the facade file. |

## Target Architecture Shape And Boundaries (Mandatory)

| Layer/Boundary | Purpose | Owns | Must Not Own | Notes |
| --- | --- | --- | --- | --- |
| Reply callback service | Build validated outbound reply envelope and persist initial delivery intent | source lookup, binding check, idempotency reservation, delivery-event `PENDING`, outbox enqueue | retry loop, gateway target polling | Keeps caller contract stable |
| Callback delivery runtime | Coordinate queued callback dispatch | worker lifecycle, target resolution, worker construction | source lookup or reply formatting | Shared singleton/factory |
| Callback outbox service/store | Durable callback work state | queue records, lease state, retry/dead-letter transitions | HTTP publishing | File-backed |
| Gateway callback publisher | Execute one HTTP callback attempt | request signing, timeout, status mapping | retry policy, queue state | Reused boundary |
| Managed gateway service facade | Expose managed gateway admin and lifecycle APIs | status assembly, enable/disable/update/restore orchestration, provider/account reads | timer ownership, reliability parsing, reachable-runtime polling loops | Public boundary remains stable |
| Managed gateway runtime lifecycle | Own runtime process and reachability orchestration | install/start/adopt/restart/stop/reconcile, reachable-runtime discovery | admin-facing status composition, timer scheduling | Internal helper owned by the managed gateway package |
| Managed gateway supervision | Own timer-driven health and restart policy | exit handling, supervision loop, health evaluation, bounded restart scheduling | public GraphQL/admin API assembly | Restart ownership stays in-package without living in the facade |
| Managed gateway runtime health | Own payload and backoff helpers | runtime reliability parsing, heartbeat staleness, restart backoff config | storage writes, process control, public API orchestration | Small reusable support boundary |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Replacement Clean-Cut Design |
| --- | --- | --- | --- |
| Keep old synchronous publish as fallback when queue runtime is unavailable | Might reduce code changes | Rejected | Always enqueue into callback outbox when callback delivery is configured |
| Dual-path “publish now and queue only on error” compatibility branch | Might preserve current timing semantics | Rejected | Single outbox-first path with worker-driven delivery |

## File And Module Breakdown

| File/Module | Change Type | Layer / Boundary | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| `gateway-callback-dispatch-target-resolver.ts` | Add | Runtime | Resolve `AVAILABLE` vs `UNAVAILABLE` vs `DISABLED` callback target state | `resolveGatewayCallbackDispatchTarget()` | config/service status -> target state | app config, managed gateway service |
| `gateway-callback-outbox-store.ts` | Add | Runtime persistence | Persist and lease callback outbox records | `enqueueOrGet`, `leaseBatch`, `updateRecord` | queue commands -> durable records | file persistence utils |
| `gateway-callback-outbox-service.ts` | Add | Runtime | State-transition API over store | `enqueueOrGet`, `leaseBatch`, `markSent`, `markRetry`, `markDeadLetter` | record ids/state -> updated records | outbox store |
| `gateway-callback-dispatch-worker.ts` | Add | Runtime | Poll queue and dispatch to gateway with retry policy | `start`, `stop`, `runOnce` | queued records -> gateway callback attempts | outbox service, target resolver, publisher |
| `gateway-callback-delivery-runtime.ts` | Add | Runtime | Build shared runtime singleton and reply callback service deps | `startGatewayCallbackDeliveryRuntime`, `stopGatewayCallbackDeliveryRuntime`, factory helpers | app lifecycle/callers -> runtime deps | worker, outbox service |
| `reply-callback-service.ts` | Modify | Service | Validate reply routing and enqueue durable callback work | `publishAssistantReplyByTurn` | reply context -> queued envelope/result | receipt service, idempotency, binding, delivery events, callback runtime deps |
| `managed-messaging-gateway-service.ts` | Modify | Managed gateway facade | Expose public admin-facing managed gateway lifecycle/status APIs and delegate policy-heavy behavior | `getStatus`, `enable`, `disable`, `update`, `restoreIfEnabled`, `saveProviderConfig`, `close` | admin calls -> persisted state and delegated runtime actions | storage, installer/admin/process deps, runtime lifecycle, supervision |
| `managed-messaging-gateway-runtime-lifecycle.ts` | Add | Managed gateway internal runtime | Own install/start/adopt/restart/stop/reconcile and reachable-runtime discovery | `startInstalledRuntime`, `restartActiveRuntime`, `reconcileReachableRuntime`, `stopTrackedOrReachableRuntime` | managed state -> runtime mutation/reachability result | storage, installer, admin client, process supervisor, runtime health |
| `managed-messaging-gateway-supervision.ts` | Add | Managed gateway internal supervision | Own process-exit recovery, timer lifecycle, health evaluation, and bounded restart scheduling | `handleProcessExit`, `ensureRuntimeSupervisionLoop`, `stopRuntimeSupervision`, `scheduleManagedRestart` | runtime events -> lifecycle transitions/restarts | storage, runtime lifecycle, runtime health |
| `managed-messaging-gateway-runtime-health.ts` | Add | Managed gateway support | Parse runtime reliability payloads and compute heartbeat/backoff policy | `readManagedRuntimeReliabilityStatus`, `isHeartbeatStale`, `computeManagedGatewayRestartDelayMs` | raw payload/env -> typed health/policy values | env, shared types |

## Layer-Appropriate Separation Of Concerns Check

- UI/frontend scope: not applicable.
- Non-UI scope: responsibility stays clear at file/module/service boundaries.
- Integration/infrastructure scope: publisher, resolver, outbox store, and worker each own one integration/runtime concern.
- Layering note: the new worker boundary exists because retry/lease/availability policy is repeated-orchestration logic, not because a new layer is required by habit.
- Decoupling check: reply creation no longer depends on gateway process liveness.
- Module/file placement check: new files stay inside `external-channel/runtime`, which already owns runtime delivery concerns.

## Naming Decisions (Natural And Implementation-Friendly)

| Item Type (`File`/`Module`/`API`) | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| File | `gateway-callback-publisher-options-resolver.ts` | `gateway-callback-dispatch-target-resolver.ts` | The new concern is dispatch-target availability, not simple option assembly. | Replaces obsolete sync resolver |
| Module | N/A | `GatewayCallbackDispatchWorker` | Names the real concern: queued callback dispatch. | Clear retry-runtime ownership |
| Module | N/A | `GatewayCallbackOutboxService` | Matches gateway-side outbox terminology while remaining server-specific. | Symmetric but not shared code |
| File | N/A | `managed-messaging-gateway-runtime-lifecycle.ts` | Names the start/stop/adopt/reconcile concern directly. | Internal helper under managed gateway package |
| File | N/A | `managed-messaging-gateway-supervision.ts` | Names the timer-driven recovery policy directly. | Keeps restart ownership explicit |
| File | N/A | `managed-messaging-gateway-runtime-health.ts` | Names the reliability parsing and policy-helper concern directly. | Keeps support logic out of the facade |
| Module | `ManagedMessagingGatewayService` | same | The name still fits because restart and liveness supervision are part of managed lifecycle ownership. | No rename needed |

## Naming Drift Check (Mandatory)

| Item | Current Responsibility | Does Name Still Match? (`Yes`/`No`) | Corrective Action (`Rename`/`Split`/`Move`/`N/A`) | Mapped Change ID |
| --- | --- | --- | --- | --- |
| `ReplyCallbackService` | Build/validate reply callback intent and enqueue delivery | Yes | N/A | C-006 |
| `gateway-callback-publisher-options-resolver.ts` | Will need async availability-aware target resolution | No | Rename | C-010 |
| `ManagedMessagingGatewayService` | Expose managed gateway public API while composing internal lifecycle and supervision helpers | Yes | Split | C-011 |

## Existing-Structure Bias Check (Mandatory)

| Candidate Area | Current-File-Layout Bias Risk | Architecture-First Alternative | Decision | Why |
| --- | --- | --- | --- | --- |
| Keep direct publish inside `ReplyCallbackService` because it already exists there | High | Split publish orchestration into runtime worker and queue | Change | The current location couples reply generation to gateway availability |
| Extend provider proxy set for callback outbox immediately | Medium | Keep callback outbox local to runtime delivery concern | Keep | Shared provider abstraction is unnecessary until multi-node storage is a real requirement |
| Keep all managed gateway lifecycle, runtime reachability, and supervision logic in `managed-messaging-gateway-service.ts` because the package boundary is already correct | High | Keep the public service as facade and split internal lifecycle and supervision modules | Change | The package is correct, but the single-file boundary is not |

Rule:
- Do not keep a misplaced file in place merely because many callers already import it from there; that is structure bias, not design quality.

## Anti-Hack Check (Mandatory)

| Candidate Change | Shortcut/Hack Risk | Proper Structural Fix | Decision | Notes |
| --- | --- | --- | --- | --- |
| Add `try/catch` inline retry loop in processor/turn bridge | High | Durable outbox + worker | Reject | Would still lose replies on crash or long outage |
| Use current sync resolver and drop replies when target unavailable | High | Async availability-aware target resolver | Reject | Gateway-down is the main scenario to cover |
| Trim `managed-messaging-gateway-service.ts` cosmetically without moving runtime lifecycle and supervision ownership | High | Structural split into facade, lifecycle, supervision, and health helpers | Reject | Would satisfy style locally but leave the design smell intact |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `reply-callback-service.ts` | receipt service, idempotency, binding, delivery events, callback runtime factory | processor, turn bridge | Low | One-way dependency into runtime queue boundary only |
| `gateway-callback-dispatch-worker.ts` | outbox service, target resolver, publisher | callback delivery runtime | Low | Worker owns retry policy and does not call back into reply service |
| `gateway-callback-delivery-runtime.ts` | worker, outbox service, target resolver | app lifecycle, reply service assembly | Medium | Keep it as runtime composition root only |
| `managed-messaging-gateway-service.ts` | storage, installer/admin/process deps, lifecycle helper, supervision helper | status APIs, callback target resolver | Low | Keep only public API orchestration here |
| `managed-messaging-gateway-runtime-lifecycle.ts` | storage, installer, admin client, process supervisor, runtime health helper | service facade, supervision helper | Medium | Keep process and reachability policy one-way and reusable |
| `managed-messaging-gateway-supervision.ts` | storage, lifecycle helper, runtime health helper | service facade | Medium | Keep timer and restart policy independent from public status assembly |
| `managed-messaging-gateway-runtime-health.ts` | env, managed types | lifecycle helper, supervision helper | Low | Pure support logic; no reverse dependencies |

## Allowed Dependency Direction (Mandatory)

- Allowed direction rules: `Callers/Processors -> ReplyCallbackService -> Runtime callback delivery boundary -> Publisher/Persistence/Managed Gateway Service`
- Temporary boundary violations and cleanup deadline: none expected.

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| Old sync resolver and tests | Replace imports, remove old file, add new resolver tests | No compatibility alias | `rg -n "resolveGatewayCallbackPublisherOptions|buildManagedMessagingCallbackBaseUrl" autobyteus-server-ts/src autobyteus-server-ts/tests` |
| Direct publish assumptions in reply processor tests | Update assertions from “publisher called immediately” to “callback queued and worker delivers” | Remove old behavior expectation | Targeted vitest runs |

## Data Models (If Needed)

Server callback outbox record:

- `id`
- `callbackIdempotencyKey`
- `payload`
- `status` = `PENDING` | `DISPATCHING` | `FAILED_RETRY` | `SENT` | `DEAD_LETTER`
- `attemptCount`
- `nextAttemptAt`
- `leaseToken`
- `leaseExpiresAt`
- `lastError`
- `createdAt`
- `updatedAt`

Dispatch target resolution result:

- `state` = `AVAILABLE` | `UNAVAILABLE` | `DISABLED`
- `options` when available
- `reason` when unavailable/disabled

## Error Handling And Edge Cases

1. Gateway down or callback target unavailable: retryable, keep outbox record pending with backoff.
2. Worker crash after leasing but before completion: expired lease makes record dispatchable again.
3. Callback HTTP 4xx configuration/auth/path errors: terminal failure unless explicitly marked retryable by publisher classification.
4. Duplicate callback enqueue for same key: return existing outbox record and preserve idempotent delivery.
5. Managed gateway down with no current runtime snapshot: queue still accepted if callback delivery is configured for managed messaging; worker waits for target availability.
6. Managed gateway unexpected exit: managed service transitions to restart scheduling with bounded backoff before escalating to `BLOCKED`.
7. Managed gateway heartbeat/liveness stale while the process is still present: managed service treats the runtime as unhealthy, attempts a bounded restart, and leaves queued callbacks pending until recovery.
8. Restart attempts exceed the bounded policy: lifecycle transitions to `BLOCKED` with the last restart failure preserved for diagnosis.

## Use-Case Coverage Matrix (Design Gate)

| use_case_id | Requirement | Use Case | Primary Path Covered (`Yes`/`No`) | Fallback Path Covered (`Yes`/`No`/`N/A`) | Error Path Covered (`Yes`/`No`/`N/A`) | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- | --- |
| UC-001 | R-001, R-004 | Queue outbound reply and dispatch to gateway | Yes | N/A | Yes | `UC-001` |
| UC-002 | R-001, R-002, R-005 | Retry while gateway is down, then recover | Yes | Yes | Yes | `UC-002` |
| UC-003 | R-002, R-004, R-005 | Exhaust retries and dead-letter | Yes | N/A | Yes | `UC-003` |
| UC-004 | R-003 | Deduplicate repeated callback processing | Yes | N/A | Yes | `UC-004` |
| UC-005 | R-006 | Restart managed gateway after unexpected exit | Yes | N/A | Yes | `UC-005` |
| UC-006 | R-007 | Restart managed gateway after heartbeat/liveness stall | Yes | Yes | Yes | `UC-006` |

## Performance / Security Considerations

1. Polling interval should stay short enough for good reply latency but bounded to avoid busy loops when the gateway is down.
2. The publisher must keep the existing shared-secret signing behavior.
3. File-backed queue writes should use existing atomic persistence helpers to avoid corruption on crash.

## Migration / Rollout (If Needed)

No data migration is required. Existing in-flight replies created before deployment are still subject to old behavior; replies created after deployment use the new durable callback outbox.

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/API/E2E) | Status |
| --- | --- | --- | --- |
| C-001 | T-001 | Unit + AV-001/AV-002 | Planned |
| C-002 | T-002 | Unit + Integration + AV-001/AV-003 | Planned |
| C-003 | T-003 | Unit | Planned |
| C-004 | T-004 | Unit + Integration + AV-002/AV-003 | Planned |
| C-005 | T-005 | Integration | Planned |
| C-006 | T-006 | Unit + Integration + AV-001/AV-004 | Planned |
| C-007 | T-007 | Unit | Planned |
| C-008 | T-008 | Unit | Planned |
| C-009 | T-009 | Integration | Planned |
| C-010 | T-010 | Unit | Planned |
| C-011 | T-011 | Unit + Integration + AV-005/AV-006 | Planned |
| C-012 | T-012 | Unit + Integration + AV-005/AV-006 | Planned |
| C-013 | T-013 | Unit + Integration + AV-005/AV-006 | Planned |
| C-014 | T-014 | Unit | Planned |

## Design Feedback Loop Notes (From Review/Implementation)

| Date | Trigger (Review/File/Test/Blocker) | Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`) | Design Smell | Requirements Updated? | Design Update Applied | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-03-10 | Initial design draft | N/A | None yet | No | v1 created | Open for review |
| 2026-03-10 | Stage 8 code-review hard-limit failure on `managed-messaging-gateway-service.ts` | Design Impact | Public API, runtime lifecycle, and supervision policy were too concentrated in one file | No | v3 splits the managed gateway boundary into facade, lifecycle, supervision, and runtime-health modules | Resolved in design |

## Open Questions

1. Whether current tests should expose callback outbox diagnostics directly or verify through outbox service state only.
2. Whether a future follow-up should surface callback outbox status in a runtime admin endpoint.
