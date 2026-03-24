# Future-State Runtime Call Stack

## Scope

- Ticket: `message-gateway-quality-review`
- Slice: bootstrap lifecycle refactor for `create-gateway-app`
- Date: `2026-03-24`

## FS-1 Successful Bootstrap Startup

1. `createGatewayApp(config)` constructs the Fastify app and assembles gateway dependencies.
2. `createGatewayApp(...)` creates a bootstrap lifecycle helper.
3. Fastify triggers `onReady`.
4. `lifecycle.start()`:
   - acquires the inbox/outbox lock pair,
   - records lock-held reliability state,
   - runs configured restore tasks,
   - starts inbound/outbound workers,
   - records worker-running reliability state,
   - starts the session supervisor registry,
   - starts the lock heartbeat timer.
5. Startup completes and the app becomes ready.

Owner notes:

- Bootstrap owner: `createGatewayApp`
- Lifecycle support owner: `gateway-runtime-lifecycle`

## FS-2 Partial Startup Failure With Rollback

1. `createGatewayApp(config)` assembles dependencies and creates the lifecycle helper.
2. Fastify triggers `onReady`.
3. `lifecycle.start()` acquires locks and starts workers successfully.
4. `sessionSupervisorRegistry.startAll()` throws because a supervised provider fails to start.
5. `lifecycle.start()` catches that failure and runs rollback in the same owner:
   - clears any heartbeat timer,
   - stops the session supervisor registry,
   - stops inbound/outbound workers,
   - records worker-running false,
   - releases the inbox/outbox locks,
   - records lock-released status.
6. `lifecycle.start()` rethrows the original startup failure.
7. Fastify surfaces the startup failure without leaving previously started runtime resources active.

Why it matters:

- Partial-startup rollback is now explicit and local to the lifecycle owner instead of being an implicit side effect of later cleanup.

## FS-3 Normal Shutdown

1. Fastify triggers `onClose`.
2. `lifecycle.stop()`:
   - clears the heartbeat timer,
   - stops the session supervisor registry,
   - stops workers,
   - records worker-running false,
   - releases both locks,
   - records lock-released status.
3. Shutdown completes even if startup had previously failed and already rolled resources back.

## Allowed Dependencies

- `createGatewayApp` may depend on:
  - concrete adapter/service construction
  - route registration
  - the bootstrap lifecycle helper
- `gateway-runtime-lifecycle` may depend on:
  - queue locks
  - workers
  - session supervisor registry
  - reliability status service
  - startup restore tasks

## Forbidden Shortcuts

- Partial-startup cleanup must not be left to the generic `onClose` path alone.
- Startup rollback must not be spread across multiple unrelated inline branches in `createGatewayApp`.
