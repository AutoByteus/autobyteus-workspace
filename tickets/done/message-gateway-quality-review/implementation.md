# Implementation Sketch

## Scope

- Ticket: `message-gateway-quality-review`
- Scope: `Medium`
- Active Stage: `3 Design Basis`

## Problem To Solve

`src/bootstrap/create-gateway-app.ts` currently mixes bootstrap assembly with bootstrap lifecycle support:

- queue-lock acquisition and release
- persisted-session restore
- worker startup and shutdown
- supervised provider startup and shutdown
- lock heartbeat handling
- partial-startup failure behavior

That mixed shape hides the startup/shutdown spine and leaves partial-startup rollback without a clear local owner.

## Primary Spine

`createGatewayApp(config) -> assemble dependencies -> register routes -> bootstrap lifecycle start/stop owner`

The bootstrap function should stay the assembly spine. Startup/shutdown support should hang off that owner as explicit support structure.

## Design Decisions

- Keep `createGatewayApp` as the owning bootstrap entry point.
- Add one bootstrap-local helper file, tentatively `src/bootstrap/gateway-runtime-lifecycle.ts`.
- The helper will own:
  - acquiring/releasing the queue-lock pair
  - running startup restore tasks
  - starting/stopping workers
  - starting/stopping the session supervisor registry
  - lock heartbeat timer setup/cleanup
  - rollback when startup fails after partial success
- `createGatewayApp` will:
  - assemble adapters, services, locks, and route dependencies
  - build the lifecycle helper
  - delegate `onReady` to `lifecycle.start()`
  - delegate `onClose` to `lifecycle.stop()`
- Keep route registration and adapter/service construction in `createGatewayApp`; this slice does not redesign every assembly branch.

## Support Structure

- `createGatewayRuntimeLifecycle(...)`
  - serves the bootstrap owner directly
  - exposes `start()` and `stop()`
  - keeps the partial-startup rollback policy in one place
- Startup restore tasks are passed into the helper as explicit support work, instead of being inlined in the main bootstrap spine.
- Heartbeat failure handling stays in the lifecycle helper because it belongs to runtime-lifecycle ownership, not route wiring or adapter construction.

## File Mapping

- `Modify`: `src/bootstrap/create-gateway-app.ts`
- `Add`: `src/bootstrap/gateway-runtime-lifecycle.ts`
- `Modify`: `tests/integration/bootstrap/create-gateway-app.integration.test.ts`

## Migration / Refactor Sequence

1. Add focused integration coverage for provider-start failure rollback.
2. Introduce the bootstrap lifecycle helper with startup, rollback, heartbeat, and shutdown ownership.
3. Simplify `createGatewayApp` so it assembles dependencies and delegates lifecycle start/stop.
4. Re-run focused bootstrap validation.

## Risk Notes

- Main risk: changing startup ordering or cleanup semantics.
- Mitigation:
  - preserve existing startup order before `sessionSupervisorRegistry.startAll()`
  - preserve existing normal shutdown order
  - validate with a new startup-failure rollback test plus existing bootstrap integration tests
