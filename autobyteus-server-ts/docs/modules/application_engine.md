# Application Engine

## Scope

Owns the platform-run worker lifecycle for one installed application: prepare storage, apply migrations, spawn the worker, load the backend definition, surface engine status, forward backend invocations, bridge worker `runtimeControl` requests back to the host, and stop the worker cleanly.

## TS Source

- `src/application-engine`
- `src/server-runtime.ts`

## Main Service And Supporting Owners

- `src/application-engine/services/application-engine-host-service.ts`
- `src/application-engine/runtime/application-worker-supervisor.ts`
- `src/application-engine/runtime/application-engine-client.ts`
- `src/application-engine/runtime/protocol.ts`
- `src/application-engine/worker/application-worker-runtime.ts`
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

For a given `applicationId`, the host service:

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
- The backend definition contract version must be `"2"`.
- Exposed handlers must not exceed the bundle manifest’s `supportedExposures` flags.
- Lifecycle hooks (`onStart`, `onStop`) run inside the worker with the same storage context shape used by query/command/route/event handlers.
- Worker notifications flow back to the host over the engine protocol and are re-published by the backend gateway.
- Worker-side `context.runtimeControl` calls are bridged back to `ApplicationOrchestrationHostService` through the engine protocol; application backends do not launch agent/team runs directly inside the worker process.

## Invocation Boundary

Once ready, the engine is the only owner used to invoke:

- application queries,
- application commands,
- application routes,
- application GraphQL execution,
- application event handlers, and
- worker-originated runtime-control requests.

The gateway and orchestration owners both depend on this boundary instead of reaching into worker details directly.

## Operational Artifacts

Per application storage keeps:

- `runtime/engine-status.json`
- `logs/worker.stdout.log`
- `logs/worker.stderr.log`

Unexpected worker exit clears the in-memory runtime handle and moves engine status to `failed`.

## Startup Resume Hook

After the HTTP/WebSocket stack is listening, `server-runtime.ts` runs application-orchestration startup recovery:

- `ApplicationOrchestrationRecoveryService.resumeBindings()` rebuilds durable lookups and reattaches observers,
- `ApplicationExecutionEventDispatchService.resumePendingEvents()` reschedules pending event journals,
- none of that eagerly starts every application worker, but pending event dispatch or live backend traffic may lazily start a worker when needed.

## Related Docs

- [`applications.md`](./applications.md)
- [`application_orchestration.md`](./application_orchestration.md)
- [`application_backend_gateway.md`](./application_backend_gateway.md)
- [`application_storage.md`](./application_storage.md)
- `../../../autobyteus-application-sdk-contracts/README.md`
- `../../../autobyteus-application-backend-sdk/README.md`
