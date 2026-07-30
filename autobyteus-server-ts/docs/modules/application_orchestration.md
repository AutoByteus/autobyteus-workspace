# Application Orchestration

## Scope

Owns application-authored runtime orchestration after an application backend is running: list available execution resources, start bound agents and teams, persist durable run bindings keyed by app-owned `launchRequestId`, route live input/termination to those bindings, append runtime lifecycle events to the durable journal, dispatch those lifecycle events back into application event handlers with at-least-once semantics, relay published-artifact events live to bound applications, expose published-artifact reads for in-scope apps, rebuild run lookups on restart, and gate live traffic until startup recovery completes.

## TS Source

- `src/application-orchestration`
- `src/application-platform`
- `src/startup/agent-tool-loader.ts`
- `src/compositions/build-studio-server.ts`
- `src/compositions/build-standalone-application-server.ts`

## Main Service And Supporting Owners

- `src/application-orchestration/services/application-orchestration-host-service.ts`
- `src/application-orchestration/services/application-run-binding-launch-service.ts`
- `src/application-orchestration/services/application-execution-resource-resolver.ts`
- `src/application-platform/launch-configuration/application-launch-configuration-service.ts`
- `src/application-platform/launch-configuration/application-launch-resource-baseline-builder.ts`
- `src/application-platform/launch-configuration/application-launch-host-capability-validator.ts`
- `src/application-platform/launch-configuration/application-portable-launch-config-policy.ts`
- `src/application-orchestration/services/application-run-observer-service.ts`
- `src/application-orchestration/services/application-bound-run-lifecycle-gateway.ts`
- `src/application-orchestration/services/application-execution-event-ingress-service.ts`
- `src/application-orchestration/services/application-execution-event-dispatch-service.ts`
- `src/application-orchestration/services/application-orchestration-recovery-service.ts`
- `src/application-orchestration/services/application-orchestration-startup-gate.ts`
- `src/application-orchestration/services/application-published-artifact-relay-service.ts`
- `src/application-orchestration/stores/application-launch-override-store.ts`
- `src/application-orchestration/stores/application-run-binding-store.ts`
- `src/application-orchestration/stores/application-run-lookup-store.ts`
- `src/application-orchestration/stores/application-execution-event-journal-store.ts`
- `src/application-platform/runtime/create-application-orchestration-services.ts`
- `src/application-platform/runtime/create-application-run-services.ts`

## Authority Boundary

- The generic Applications host no longer owns platform-level `applicationSession` creation, retained session snapshots, or execution-mode orchestration.
- Application backends own the decision to start runtime work by calling `context.agentExecution.startAgent(...)` or `startAgentTeam(...)` from inside the application worker.
- `launchRequestId` is an app-generated, non-empty correlation identifier for one launch request. The platform persists and echoes it, while business identity stays in app-owned state. It supports recovery lookup and is not an idempotent-start guarantee.
- Runtime-originated artifact publication is a runtime-wide concern owned by the shared published-artifact subsystem. Application orchestration does not validate the tool payload or persist artifact truth; it only relays bound-run `ARTIFACT_PERSISTED` events and exposes reads through `context.publishedArtifacts`.
- Lifecycle journals remain authoritative only for `RUN_STARTED`, `RUN_TERMINATED`, `RUN_FAILED`, and `RUN_ORPHANED`. Published artifacts do not append a second `ARTIFACT` journal family.
- Recovery and startup gating are first-class owners. Callers should not bypass them with ad hoc resume logic.

## Named Backend Context Capabilities

`ApplicationHandlerContext` exposes three orchestration capabilities:

- `agentExecution.startAgent(...)`, `startAgentTeam(...)`, `sendInput(...)`, `terminate(...)`, `get(...)`, `list(...)`, and `findByLaunchRequestId(...)`
- `agentResources.listAvailable(...)` and `getConfigured(...)`
- `publishedArtifacts.list(runId)` and `readRevision({ runId, revisionId })`

`agentResources.listAvailable(...)` returns both:

- bundled application resources discovered from the owning bundle (`source = bundle`), and
- shared agent / team definitions that remain visible to the application (`source = shared`).

`agentResources.getConfigured(slotKey)` resolves the effective resource selection for one manifest-declared slot after validating:

- the slot exists for the application,
- the persisted override (if any) still satisfies the slot's allowed source/kind contract, and
- the manifest default still resolves when no persisted override exists.

This read-time validation is authoritative: stale persisted overrides or invalid manifest defaults fail here before app launch code can call `startAgent(...)` or `startAgentTeam(...)`.

`startAgent(...)` and `startAgentTeam(...)` require:

- an app-owned `launchRequestId`,
- a concrete `executionResourceRef` (`bundle` or `shared`, `AGENT` or `AGENT_TEAM`),
- launch configuration for the matching runtime kind, and
- optional `initialInput`.

The orchestration host validates the resource choice and explicit start kind, launches the underlying agent/team run, persists one durable binding together with `launchRequestId`, registers lifecycle observation, optionally forwards the initial input only after the synthetic `RUN_STARTED` event path is appended, and returns the binding summary. Runtime skill exposure still comes from the selected agent/team definitions: agent starts and each team leaf member use configured skills only, and `GLOBAL_DISCOVERY` values in app-authored inputs are rejected rather than normalized into broader access.

`publishedArtifacts.list(runId)` and `readRevision({ runId, revisionId })` provide application-owned read access to the shared published-artifact store after validating that the requested run still belongs to the calling application. These reads are for application/runtime consumers such as Brief Studio and Socratic reconciliation; the current web Artifacts tab is not a consumer of this API.

## Resource Configuration And Availability

The application-platform launch-configuration boundary owns portable package
defaults and optional Studio overrides for manifest-declared
`executionResourceSlots[]`. Every slot view keeps four meanings separate:

- `packageBaseline`: the bundle-owned resource choice and complete kind-aware
  launch configuration shipped in the package;
- `selectedResourceBaseline`: a no-write preview of defaults for a resource the
  user is considering;
- `savedOverride`: a sparse, host-owned Studio override, when one exists; and
- `effectiveConfiguration`: the package baseline with a valid saved override
  overlaid on top.

The absence of a saved override means the package baseline is effective. A
saved override that becomes invalid is preserved and surfaced with
`savedOverrideState = INVALID`, issue detail, and no effective configuration;
the platform does not silently repair or delete it. Explicit reset removes the
override and reveals the package baseline again.

Package baselines must be bundle-owned, complete for every required slot, and
portable across Studio and standalone. Host validation re-resolves current
definitions and credentials before accepting an override or declaring a launch
runnable. Agent configurations can include `runtimeKind`,
`llmModelIdentifier`, and `workspaceRootPath` only when the slot supports them.
Team configurations use shared defaults plus current member runtime/model
overrides, with `workspaceRootPath` on the shared defaults.

Application agent-execution launch inputs carry an optional `skillAccessMode`
field. It has a narrow value set: `PRELOADED_ONLY` is the
host-managed default and means "use the configured skills on the target
definition"; `NONE` suppresses AutoByteus skill exposure when an
internal/application flow intentionally needs that. The saved setup
launch-configuration editors do not expose a skill-access selector, and the removed
`GLOBAL_DISCOVERY` value is not a valid saved setup, backend SDK, or
`agentExecution` input.

`ApplicationLaunchConfigurationService` is the semantic owner behind the
legacy-named launch-setup routes:

- `GET /applications/:applicationId/execution-resource-configurations`
- `POST /applications/:applicationId/execution-resource-configurations/:slotKey/selection-preview`
- `PUT /applications/:applicationId/execution-resource-configurations/:slotKey`
- `DELETE /applications/:applicationId/execution-resource-configurations/:slotKey`
- `GET /applications/:applicationId/available-execution-resources`

The preview route is read-only. `PUT` validates and re-resolves current
definitions before storing a sparse override. `DELETE` is the explicit reset
operation. Application readiness is reported as `RUNNABLE`,
`INVALID_PACKAGE`, or `HOST_REQUIREMENT_MISSING`; saved-override validity is
reported separately so an invalid override cannot be confused with a missing
package default.

Application backends still keep business launch timing app-owned. They consume
the resolved effective configuration through the shared helpers in
`@autobyteus/application-backend-sdk` to build the concrete runtime launch
input each app needs.

`createApplicationOrchestrationServices` and
`createApplicationRunServices` construct named runtime services around the
exact runtime-local definition services and injected `MemberTeamContextBuilder`.
They prepare managers and factories only. `ApplicationRunBindingLaunchService`
is the business-demand boundary that creates a new agent or team run; startup
recovery only restores runs represented by recorded nonterminal bindings. No
service locator or process-global team-definition fallback participates in
either path.

`ApplicationAvailabilityService` owns app-scoped liveness for applications discovered by the bundle layer:

- `ACTIVE` means the application can serve backend and orchestration traffic,
- `QUARANTINED` means the bundle currently has diagnostics, or the application is persisted-only after package removal/temporary disappearance, and backend/orchestration entrypoints reject with availability detail, and
- `REENTERING` means one repaired application is being resumed without restarting unrelated applications, while backend/context-capability admission remains blocked behind retryable availability detail.

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
- Applications recover missed deliveries by calling `agentExecution.list(...)`, `publishedArtifacts.list(...)`, and `publishedArtifacts.readRevision(...)`, then applying their own idempotency keyed by `revisionId`.
- For a full overview of how artifact relay, backend notifications, and named context capabilities relate to each other, see [`application_communication_model.md`](./application_communication_model.md).

## Startup Recovery And Gating

The Studio and standalone server assembly roots run orchestration startup recovery
after their HTTP/WebSocket stack is listening:

1. `ApplicationOrchestrationStartupGate.runStartupRecovery(...)` enters the `RECOVERING` state.
2. `ApplicationOrchestrationRecoveryService.resumeBindings()` enumerates all installed applications, reloads nonterminal bindings, rebuilds global run lookups, and reattaches lifecycle observers when possible.
3. Bindings that cannot be reattached are marked `ORPHANED` and a matching lifecycle event is journaled.
4. `ApplicationExecutionEventDispatchService.resumePendingEvents()` resumes pending journal drains without eagerly starting every worker.
5. The startup gate moves to `READY` only after recovery and dispatch resumption succeed.

Live application context-capability calls await this gate before proceeding. Startup recovery also restores the binding/observer state that later published-artifact relay depends on for bound runs.

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
- [`application_backend_api_gateway.md`](./application_backend_api_gateway.md)
- [`application_engine.md`](./application_engine.md)
- [`application_storage.md`](./application_storage.md)
- [`application_sessions.md`](./application_sessions.md)
- [`application_communication_model.md`](./application_communication_model.md)
- [`agent_artifacts.md`](./agent_artifacts.md)
- `../../../autobyteus-web/docs/applications.md`
- `../../../autobyteus-web/docs/application-bundle-iframe-contract.md`
- `../../../autobyteus-application-sdk-contracts/README.md`
- `../../../autobyteus-application-backend-sdk/README.md`
