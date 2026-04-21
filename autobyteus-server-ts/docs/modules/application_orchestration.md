# Application Orchestration

## Scope

Owns application-authored runtime orchestration after an application backend is running: list available runtime resources, start bound runs, persist durable run bindings keyed by app-owned opaque `bindingIntentId` handoff, route live input/termination to those bindings, append runtime lifecycle and artifact events to the durable journal, dispatch those events back into application event handlers with at-least-once semantics, rebuild run lookups on restart, and gate live traffic until startup recovery completes.

## TS Source

- `src/application-orchestration`
- `src/startup/agent-tool-loader.ts`
- `src/server-runtime.ts`

## Main Service And Supporting Owners

- `src/application-orchestration/services/application-orchestration-host-service.ts`
- `src/application-orchestration/services/application-run-binding-launch-service.ts`
- `src/application-orchestration/services/application-runtime-resource-resolver.ts`
- `src/application-orchestration/services/application-run-observer-service.ts`
- `src/application-orchestration/services/application-bound-run-lifecycle-gateway.ts`
- `src/application-orchestration/services/application-execution-event-ingress-service.ts`
- `src/application-orchestration/services/application-execution-event-dispatch-service.ts`
- `src/application-orchestration/services/application-orchestration-recovery-service.ts`
- `src/application-orchestration/services/application-orchestration-startup-gate.ts`
- `src/application-orchestration/stores/application-run-binding-store.ts`
- `src/application-orchestration/stores/application-run-lookup-store.ts`
- `src/application-orchestration/stores/application-execution-event-journal-store.ts`
- `src/application-orchestration/tools/publish-artifact-tool.ts`

## Authority Boundary

- The generic Applications host no longer owns platform-level `applicationSession` creation, retained session snapshots, or execution-mode orchestration.
- Application backends own the decision to start runtime work by calling `context.runtimeControl.*` from inside the application worker.
- `bindingIntentId` is an opaque app-supplied correlation token for direct `startRun(...)` handoff. The platform persists and echoes it, but business identity stays in app-owned state.
- Runtime-originated artifact publication enters only through the `publish_artifact` tool. Callers do not append directly to journals or mutate run-binding state tables.
- Recovery and startup gating are first-class owners. Callers should not bypass them with ad hoc resume logic.

## Runtime-Control Surface

`ApplicationHandlerContext.runtimeControl` exposes:

- `listAvailableResources(...)`
- `getConfiguredResource(...)`
- `startRun(...)`
- `getRunBinding(...)`
- `getRunBindingByIntentId(...)`
- `listRunBindings(...)`
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

## Resource Configuration And Availability

The orchestration boundary also owns persisted application launch setup for manifest-declared `resourceSlots[]`:

- per-application saved resource selections and launch defaults are stored in platform-owned state,
- saved defaults currently support runtime kind, model identifier, and workspace root path when the slot declares them, and
- host-managed application flows keep `autoExecuteTools` enabled for the application-owned teaching workflows.

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

## Event Ingress And Dispatch

Runtime-visible execution events use the application-owned orchestration journal, not the removed application-session journal.

### Ingress

- `publish_artifact` validates `PublishArtifactInputV1` and derives application/provenance from runtime context.
- Runtime lifecycle owners append `RUN_STARTED`, `RUN_TERMINATED`, `RUN_FAILED`, and `RUN_ORPHANED` events through `ApplicationExecutionEventIngressService`.
- Every appended record gets a stable `eventId` plus monotonically increasing `journalSequence`.

### Dispatch

- `ApplicationExecutionEventDispatchService` drains one application journal in order.
- Delivery semantics are `AT_LEAST_ONCE`.
- Retry backoff doubles from `1s` up to `60s`.
- Missing app-side handlers are treated as acknowledged no-op dispatches by the worker/runtime protocol.
- App-owned event handlers must therefore be idempotent by `eventId`.

## Startup Recovery And Gating

`server-runtime.ts` runs orchestration startup recovery after the HTTP/WebSocket stack is listening:

1. `ApplicationOrchestrationStartupGate.runStartupRecovery(...)` enters the `RECOVERING` state.
2. `ApplicationOrchestrationRecoveryService.resumeBindings()` enumerates all installed applications, reloads nonterminal bindings, rebuilds global run lookups, and reattaches lifecycle observers when possible.
3. Bindings that cannot be reattached are marked `ORPHANED` and a matching lifecycle event is journaled.
4. `ApplicationExecutionEventDispatchService.resumePendingEvents()` resumes pending journal drains without eagerly starting every worker.
5. The startup gate moves to `READY` only after recovery and dispatch resumption succeed.

Live runtime-control calls and live `publish_artifact` ingress both await this gate before proceeding.

## Removed Historical Model

The old application-session subsystem is no longer authoritative for current application runtime behavior. The current architecture replaced:

- platform-owned `applicationSessionId` identity,
- GraphQL session bind/create/send-input surfaces,
- `/ws/application-session/:applicationSessionId` snapshot streaming,
- retained host-owned session projections,
- launch-time singular `runtimeTarget` ownership.

See [`application_sessions.md`](./application_sessions.md) only for the historical redirect note.

## Related Docs

- [`applications.md`](./applications.md)
- [`application_backend_gateway.md`](./application_backend_gateway.md)
- [`application_engine.md`](./application_engine.md)
- [`application_storage.md`](./application_storage.md)
- [`application_sessions.md`](./application_sessions.md)
- `../../../autobyteus-web/docs/applications.md`
- `../../../autobyteus-web/docs/application-bundle-iframe-contract-v1.md`
- `../../../autobyteus-application-sdk-contracts/README.md`
- `../../../autobyteus-application-backend-sdk/README.md`
