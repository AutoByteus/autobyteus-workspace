# Application Engine

## Scope

Owns the platform-run worker lifecycle for one installed application: prepare storage, apply migrations, spawn the worker, load the backend definition, surface engine status, forward backend invocations, bridge worker context-capability requests back to the host, and stop the worker cleanly.

## TS Source

- `src/application-engine`
- `src/application-platform/runtime`
- `src/compositions/build-studio-server.ts`
- `src/compositions/build-standalone-application-server.ts`

## Main Service And Supporting Owners

- `src/application-engine/services/application-engine-controller.ts`
- `src/application-engine/services/application-engine-launcher.ts`
- `src/application-engine/services/application-engine-state-registry.ts`
- `src/application-engine/services/application-engine-context-capability-handler.ts`
- `src/application-engine/runtime/application-worker-supervisor.ts`
- `src/application-engine/runtime/application-engine-client.ts`
- `src/application-engine/runtime/protocol.ts`
- `src/application-engine/worker/application-backend-host.ts`
- `src/application-storage/services/application-storage-lifecycle-service.ts`
- `src/application-orchestration/services/application-orchestration-host-service.ts`

## Lifecycle States

`ApplicationEngineStatus.state` is one of:

- `stopped`
- `preparing_storage`
- `starting_worker`
- `ready`
- `failed`
- `stopping`

`ready` means storage is prepared, the worker is loaded, and the backend definition exposures have been validated against the bundle manifest.

## Startup Contract

For a given `applicationId`, `ApplicationEngineLauncher`:

1. validates the bundle exists,
2. prepares per-app storage through `ApplicationStorageLifecycleService.ensureStoragePrepared(...)`,
3. starts one worker subprocess rooted at the application bundle,
4. loads the backend entry module declared by the bundle manifest,
5. validates that the loaded definition matches the declared supported exposures,
6. writes `engine-status.json`, and
7. exposes the ready status plus exposure summary to callers.

Startup is de-duplicated per application so concurrent callers share one in-flight startup promise.

## Worker Contract

- The worker loads a self-contained ESM backend module.
- The backend definition contract version must be `"6"`; unsupported definitions are rejected before any handler or lifecycle hook runs.
- Exposed handlers must not exceed the bundle manifest’s `supportedExposures` flags.
- Custom `webSocketRoutes` run in the worker-owned `ApplicationBackendHost`; standard application-agent communication never traverses the engine or worker.
- Lifecycle hooks (`onStart`, `onStop`) run inside the worker with the same storage context shape used by query/command/route/event handlers.
- Worker notifications flow back to the host over the engine protocol and are re-published by the backend API gateway.
- Worker-side `context.agentExecution`, `context.agentResources`, and `context.publishedArtifacts` calls are bridged back to `ApplicationOrchestrationHostService` through one discriminated engine protocol; application backends do not launch agent/team runs directly inside the worker process.

## Invocation Boundary

Once ready, `ApplicationEngineController` is the only owner used to invoke:

- application queries,
- application commands,
- application routes,
- application GraphQL execution,
- custom application WebSocket session open/message/close handling,
- application event handlers, and
- optional backend agent-event observer callbacks, and
- worker-originated context-capability requests.

The gateway and orchestration owners both depend on this boundary instead of reaching into worker details directly.

## Operational Artifacts

Per application storage keeps:

- `runtime/engine-status.json`
- `logs/worker.stdout.log`
- `logs/worker.stderr.log`

Unexpected worker exit clears the in-memory runtime handle and moves engine status to `failed`.

## Startup Resume Hook

After the HTTP/WebSocket stack is listening, each server assembly root runs
application-orchestration startup recovery:

- `ApplicationOrchestrationRecoveryService.resumeBindings()` rebuilds durable lookups and reattaches observers,
- `ApplicationExecutionEventDispatchService.resumePendingEvents()` reschedules pending event journals,
- none of that eagerly starts every application worker, but pending event dispatch or live backend traffic may lazily start a worker when needed.

## Application Platform Runtime Shutdown

The Studio and standalone servers place each application engine inside one
`ApplicationPlatformRuntime`. Building that runtime prepares its services and
managers but starts no new run. Business launch requests create new runs;
post-listen recovery may restore recorded runs. Runtime shutdown is ordered so
no new work can enter while owned capabilities are being dismantled:

1. block new application Agent Tools session issue;
2. stop execution-event dispatch and close application communication, backend
   gateway/socket, and notification ingress;
3. stop artifact-delivery intake and drain every accepted command through
   launcher ensure plus controller invoke;
4. dispose remaining run observers and stop application workers;
5. use `ApplicationRunShutdownCoordinator` to stop runtime-owned team runs
   before remaining runtime-owned agent runs; exact run removal also revokes
   run sessions and detaches file/artifact/memory observers;
6. close the runtime's scoped Agent Tools session manager/scope; and
7. stop remaining streaming surfaces.

The process-level `AgentToolsMcpRuntime` closes only after the application
runtime has stopped. There is no deferred publisher or handler state.
This ordering prevents a stopped application from retaining a publication
capability, accepting new runtime-scoped work, or abandoning accepted artifact
delivery after a worker exit.

## Related Docs

- [`applications.md`](./applications.md)
- [`application_orchestration.md`](./application_orchestration.md)
- [`application_backend_api_gateway.md`](./application_backend_api_gateway.md)
- [`application_storage.md`](./application_storage.md)
- `../../../autobyteus-application-sdk-contracts/README.md`
- `../../../autobyteus-application-backend-sdk/README.md`
