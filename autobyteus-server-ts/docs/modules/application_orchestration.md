# Application Orchestration

## Scope

Owns application-authored runtime orchestration after an application backend is running: list available runtime resources, start bound runs, persist durable run bindings keyed by app-owned opaque `bindingIntentId` handoff, route live input/termination to those bindings, append runtime lifecycle events to the durable journal, dispatch those lifecycle events back into application event handlers with at-least-once semantics, relay published-artifact events live to bound applications, expose runtime-control published-artifact reads for in-scope apps, rebuild run lookups on restart, and gate live traffic until startup recovery completes.

## TS Source

- `src/application-orchestration`
- `src/startup/agent-tool-loader.ts`
- `src/server-runtime.ts`

## Main Service And Supporting Owners

- `src/application-orchestration/services/application-orchestration-host-service.ts`
- `src/application-orchestration/services/application-run-binding-launch-service.ts`
- `src/application-orchestration/services/application-resource-configuration-service.ts`
- `src/application-orchestration/services/application-resource-configuration-launch-profile.ts`
- `src/application-orchestration/services/application-runtime-resource-resolver.ts`
- `src/application-orchestration/services/application-run-observer-service.ts`
- `src/application-orchestration/services/application-bound-run-lifecycle-gateway.ts`
- `src/application-orchestration/services/application-execution-event-ingress-service.ts`
- `src/application-orchestration/services/application-execution-event-dispatch-service.ts`
- `src/application-orchestration/services/application-orchestration-recovery-service.ts`
- `src/application-orchestration/services/application-orchestration-startup-gate.ts`
- `src/application-orchestration/services/application-published-artifact-relay-service.ts`
- `src/application-orchestration/stores/application-resource-configuration-store.ts`
- `src/application-orchestration/stores/application-run-binding-store.ts`
- `src/application-orchestration/stores/application-run-lookup-store.ts`
- `src/application-orchestration/stores/application-execution-event-journal-store.ts`

## Authority Boundary

- The generic Applications host no longer owns platform-level `applicationSession` creation, retained session snapshots, or execution-mode orchestration.
- Application backends own the decision to start runtime work by calling `context.runtimeControl.*` from inside the application worker.
- `bindingIntentId` is an opaque app-supplied correlation token for direct `startRun(...)` handoff. The platform persists and echoes it, but business identity stays in app-owned state.
- Runtime-originated artifact publication is now a runtime-wide concern owned by the shared published-artifact subsystem. Application orchestration does not validate the tool payload or persist artifact truth; it only relays bound-run `ARTIFACT_PERSISTED` events and exposes artifact reads through runtime control.
- Lifecycle journals remain authoritative only for `RUN_STARTED`, `RUN_TERMINATED`, `RUN_FAILED`, and `RUN_ORPHANED`. Published artifacts do not append a second `ARTIFACT` journal family.
- Recovery and startup gating are first-class owners. Callers should not bypass them with ad hoc resume logic.

## Runtime-Control Surface

`ApplicationHandlerContext.runtimeControl` exposes:

- `listAvailableResources(...)`
- `getConfiguredResource(...)`
- `startRun(...)`
- `getRunBinding(...)`
- `getRunBindingByIntentId(...)`
- `listRunBindings(...)`
- `getRunPublishedArtifacts(runId)`
- `getPublishedArtifactRevisionText({ runId, revisionId })`
- `postRunInput(...)`
- `terminateRunBinding(...)`

`listAvailableResources(...)` returns both:

- bundled application resources discovered from the owning bundle (`owner = bundle`), and
- shared agent / team definitions that remain visible to the application (`owner = shared`).

`getConfiguredResource(slotKey)` resolves the effective resource selection for one manifest-declared slot after validating:

- the slot exists for the application,
- the persisted override (if any) still satisfies the slot's allowed owner/kind contract, and
- the manifest default still resolves when no persisted override exists.

This read-time validation is authoritative: stale persisted overrides or invalid manifest defaults fail here before app launch code can call `startRun(...)`.

`startRun(...)` requires:

- app-owned opaque `bindingIntentId`,
- a concrete `resourceRef` (`bundle` or `shared`, `AGENT` or `AGENT_TEAM`),
- launch configuration for the matching runtime kind, and
- optional `initialInput`.

The orchestration host validates the resource choice, launches the underlying agent/team run, persists one durable binding together with `bindingIntentId`, registers lifecycle observation, optionally forwards the initial input only after the synthetic `RUN_STARTED` event path is appended, and returns the binding summary.

`getRunPublishedArtifacts(runId)` and `getPublishedArtifactRevisionText({ runId, revisionId })` provide application-owned read access to the shared published-artifact store after validating that the requested run still belongs to the calling application. These reads are for application/runtime consumers such as Brief Studio and Socratic reconciliation; the current web Artifacts tab is not a consumer of this API.

## Resource Configuration And Availability

The orchestration boundary also owns persisted application launch setup for manifest-declared `resourceSlots[]`:

- per-application saved resource selections and kind-aware `launchProfile` records are stored in platform-owned state,
- agent-backed selections can persist `runtimeKind`, `llmModelIdentifier`, and `workspaceRootPath` only when the slot declares those fields,
- agent-team-backed selections can persist shared defaults plus current member runtime/model overrides, with `workspaceRootPath` stored on the shared defaults record,
- legacy `launch_defaults_json` rows are migrated forward through the normal read/write path so preexisting saved application setup survives the contract rename,
- read-time validation is authoritative: malformed profiles, kind mismatches, unsupported fields, or stale team topology are surfaced as `INVALID_SAVED_CONFIGURATION` together with `invalidSavedConfiguration` and issue detail instead of silently launching stale state, and
- host-managed application flows keep `autoExecuteTools` enabled for the application-owned teaching workflows.

`ApplicationResourceConfigurationService` is the semantic owner for `GET /applications/:applicationId/resource-configurations` and `PUT /applications/:applicationId/resource-configurations/:slotKey`. It normalizes writes, rewrites legacy rows when needed, maps invalid write attempts to HTTP 400, and returns `READY`, `NOT_CONFIGURED`, or `INVALID_SAVED_CONFIGURATION` views for the frontend setup gate.

Application backends still keep business launch timing app-owned. They consume the saved `launchProfile` through the shared helpers in `@autobyteus/application-backend-sdk` to expand the persisted selection into the concrete runtime launch input each app needs.

`ApplicationAvailabilityService` owns app-scoped liveness for applications discovered by the bundle layer:

- `ACTIVE` means the application can serve backend and orchestration traffic,
- `QUARANTINED` means the bundle currently has diagnostics, or the application is persisted-only after package removal/temporary disappearance, and backend/orchestration entrypoints reject with availability detail, and
- `REENTERING` means one repaired application is being resumed without restarting unrelated applications, while backend/runtime-control admission remains blocked behind retryable availability detail.

`POST /rest/applications/:applicationId/backend/reload` triggers app-scoped reload-and-reenter. A successful repair path now:

- marks the application `REENTERING` immediately,
- stops any pre-existing application worker before the repaired bundle returns to service,
- reruns binding recovery plus pending-event dispatch resume for that one application, and
- only then restores `ACTIVE`, leaving the worker in `stopped` state so the next `ensure-ready` boots a fresh worker from the repaired bundle.

## Durable Binding And Lookup State

Per-application `platform.sqlite` owns the active orchestration records:

- `__autobyteus_run_bindings`
- `__autobyteus_run_binding_members`
- `__autobyteus_execution_event_journal`
- `__autobyteus_execution_event_dispatch_cursor`

Global run lookup state lives separately under:

- `<app-data-dir>/applications/_global/db/orchestration.sqlite`
- active table: `__autobyteus_application_run_lookup`

That global lookup maps observed runtime `runId` values back to `{ applicationId, bindingId }` so runtime-originated events can be routed to the correct application binding without scanning every app.

## Event Ingress, Dispatch, And Published Artifacts

Runtime-visible lifecycle events use the application-owned orchestration journal, not the removed application-session journal. Published artifacts use the shared published-artifact subsystem and only cross the application boundary through best-effort live relay plus app-owned query/reconciliation.

### Lifecycle ingress

- Runtime lifecycle owners append `RUN_STARTED`, `RUN_TERMINATED`, `RUN_FAILED`, and `RUN_ORPHANED` events through `ApplicationExecutionEventIngressService`.
- Every appended record gets a stable `eventId` plus monotonically increasing `journalSequence`.

### Lifecycle dispatch

- `ApplicationExecutionEventDispatchService` drains one application journal in order.
- Delivery semantics are `AT_LEAST_ONCE`.
- Retry backoff doubles from `1s` up to `60s`.
- Missing app-side handlers are treated as acknowledged no-op dispatches by the worker/runtime protocol.
- App-owned event handlers must therefore be idempotent by `eventId`.

### Published-artifact relay and query

- The shared `PublishedArtifactPublicationService` snapshots the requested workspace file, updates the durable projection, and emits runtime `ARTIFACT_PERSISTED`.
- `ApplicationPublishedArtifactRelayService` listens for bound-run `ARTIFACT_PERSISTED` events, derives the bound application context, and invokes `artifactHandlers.persisted` through `ApplicationEngineHostService`.
- Live artifact relay is intentionally best-effort. Relay failure logs a warning but does not roll back the published artifact or synthesize retry journal state.
- Applications recover missed deliveries by calling `listRunBindings(...)`, `getRunPublishedArtifacts(...)`, and `getPublishedArtifactRevisionText(...)`, then applying their own idempotency keyed by `revisionId`.

## Startup Recovery And Gating

`server-runtime.ts` runs orchestration startup recovery after the HTTP/WebSocket stack is listening:

1. `ApplicationOrchestrationStartupGate.runStartupRecovery(...)` enters the `RECOVERING` state.
2. `ApplicationOrchestrationRecoveryService.resumeBindings()` enumerates all installed applications, reloads nonterminal bindings, rebuilds global run lookups, and reattaches lifecycle observers when possible.
3. Bindings that cannot be reattached are marked `ORPHANED` and a matching lifecycle event is journaled.
4. `ApplicationExecutionEventDispatchService.resumePendingEvents()` resumes pending journal drains without eagerly starting every worker.
5. The startup gate moves to `READY` only after recovery and dispatch resumption succeed.

Live application runtime-control calls await this gate before proceeding. Startup recovery also restores the binding/observer state that later published-artifact relay depends on for bound runs.

## Removed Historical Model

The old application-session subsystem is no longer authoritative for current application runtime behavior. The current architecture replaced:

- platform-owned `applicationSessionId` identity,
- GraphQL session bind/create/send-input surfaces,
- `/ws/application-session/:applicationSessionId` snapshot streaming,
- retained host-owned session projections,
- launch-time singular `runtimeTarget` ownership,
- and the old application-journal `ARTIFACT` delivery path plus `eventHandlers.artifact` callback shape.

See [`application_sessions.md`](./application_sessions.md) only for the historical redirect note.

## Related Docs

- [`applications.md`](./applications.md)
- [`application_backend_gateway.md`](./application_backend_gateway.md)
- [`application_engine.md`](./application_engine.md)
- [`application_storage.md`](./application_storage.md)
- [`application_sessions.md`](./application_sessions.md)
- [`agent_artifacts.md`](./agent_artifacts.md)
- `../../../autobyteus-web/docs/applications.md`
- `../../../autobyteus-web/docs/application-bundle-iframe-contract-v3.md`
- `../../../autobyteus-application-sdk-contracts/README.md`
- `../../../autobyteus-application-backend-sdk/README.md`
