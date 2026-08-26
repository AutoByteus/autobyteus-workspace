# Application Worker Operation Completion Contract

Status: Normative SR-003 design supplement for `CRR-003 / CR-002`; derived from `BEH-007`, `REQ-008`, and `AC-018` without changing the public GraphQL, command, route, SDK, or application-agent address schema.

## 1. Trigger And Bounded Decision

A supported cold Studio restart returned HTTP 500 after the host-side `executeApplicationGraphql` correlation expired at 30 seconds, while the worker and its nested host capability continued and later committed the requested work. The same live-process timeout pattern occurred on standalone Brief and Socratic cold/reentry paths. Both fixed deadlines are transport-local: neither is a cancellation boundary or a commit owner.

The existing public application API is synchronous: the HTTP/SDK caller awaits the application handler's result, and the handler awaits any nested host capability needed to accept its work. SR-003 therefore selects **completion-coupled execution**, not a new asynchronous admission/status protocol:

- an application-work request remains correlated until the real remote result/error, write failure, or transport/process close;
- a nested worker-to-host capability remains correlated until the real host result/error, write failure, or bridge close;
- no live transport may manufacture a timeout failure while the remote operation is still allowed to continue;
- only engine lifecycle control (`loadApplicationDefinition`, `stopApplication`) remains deadline-bounded, and its deadline owner must terminate and await the worker before surfacing the timeout.

This is the smallest contract that restores the already-exposed synchronous completion result. It does not add a public operation ID, retry endpoint, cancellation protocol, idempotency key, `202` response, status poll, alias, or dual mutation API. Those are different product contracts and are not needed to correct the observed live-worker failure.

## 2. Operation Classes

| Class | Exact Methods / Callers | Completion Policy | Deadline Owner | Required Terminal Evidence |
| --- | --- | --- | --- | --- |
| Application work | `invokeApplicationQuery`, `invokeApplicationCommand`, `routeApplicationRequest`, `executeApplicationGraphql`, application event/artifact handlers, application WebSocket open/message/close | `AWAIT_REMOTE_COMPLETION` | None | worker result, worker error, local write failure, or actual client/process close |
| Nested host capability | every `ApplicationWorkerHostBridgeClient.invokeContextCapability` and `invokeWebSocketAction` operation | `AWAIT_REMOTE_COMPLETION` | None | host result, host error, local write failure, or explicit bridge close |
| Engine startup control | `ApplicationEngineLauncher` -> `loadApplicationDefinition` | `ABORT_BEFORE_TIMEOUT_FAILURE` | launcher through the control-request owner | response/error, or worker client close plus supervisor stop completed before timeout escapes |
| Engine shutdown control | `ApplicationEngineController.stopAttachedEngine` -> `stopApplication` | `ABORT_BEFORE_TIMEOUT_FAILURE` | controller through the control-request owner | response/error, or worker client close plus supervisor stop completed before timeout escapes |

`getApplicationStatus` is currently worker-side-only and has no host caller. Any future host caller must be explicitly classified; it must not inherit a default deadline.

## 3. Exact Owners

### `ApplicationEngineController`

Owns the outward application-work completion contract. Every application-facing request method calls the correlation client without a deadline. It returns only the actual worker result/error or a real transport failure. It does not parse GraphQL to guess query versus mutation, because GraphQL, routes, and commands may all contain application-owned effects.

### `ApplicationEngineClient`

Owns host-to-worker frame correlation, not operation timeout policy. Its pending map retains each application-work ID until one terminal transport event:

1. response result;
2. response error;
3. frame-write failure;
4. explicit client close;
5. child-process error/close.

It has no `timeoutMs` parameter, no timeout handle in `PendingRequest`, and no timer that deletes live correlation. `close()` and child-process failure reject all pending requests exactly once.

### `ApplicationWorkerHostBridgeClient`

Owns worker-to-host correlation for one worker lifetime. Its pending map has the same result/error/write-failure/close terminals and no timer. It exposes idempotent `close(error)` so worker teardown rejects all pending bridge requests and blocks new requests. A write failure removes and rejects its exact pending entry immediately; it cannot leak a promise after the fixed timer is removed.

### Application engine control-request owner

Add `application-engine/services/application-engine-control-request.ts` with one concrete responsibility: execute one startup/stop control request under an explicit deadline and, once the deadline fires, close the client and await `ApplicationWorkerSupervisor.stop()` before rejecting with the control timeout. It owns timer cleanup, one terminal settlement, primary-versus-cleanup error preservation, and the invariant that a lifecycle timeout never leaves the worker running.

It is not used by application work, nested capabilities, providers, Agent/Team runs, or arbitrary callers. It is not a generic retry/cancellation helper.

### `ApplicationEngineLauncher` and worker entry

The launcher uses the control-request owner only for `loadApplicationDefinition` and retains its current failed-start detach/status/unwind. When host stdin closes, `application-worker-entry.ts` first closes the unavailable host bridge so pending capability cancellations cannot hang, then awaits/isolates backend-runtime cleanup, and exits. `ApplicationAgentStreamObserverRegistry.closeAll()` already uses `Promise.allSettled` for bridge-backed cancellations; worker entry must catch the expected aggregate/local `runtime.stop()` rejection before its final exit rather than create an unhandled rejection. Normal `stopApplication` still runs `runtime.stop()` while the bridge is open, writes the stop response, and exits.

## 4. Correlation State Machines

### Host-to-worker application work

```text
CREATED
  -> FRAME_PENDING
  -> WAITING_FOR_REMOTE
  -> RESOLVED(result)
   | REJECTED_REMOTE(error)
   | REJECTED_WRITE(error)
   | REJECTED_TRANSPORT_CLOSE(error)
```

There is intentionally no `TIMED_OUT` transition for application work.

### Worker-to-host nested capability

```text
CREATED
  -> FRAME_PENDING
  -> WAITING_FOR_HOST
  -> RESOLVED(result)
   | REJECTED_HOST(error)
   | REJECTED_WRITE(error)
   | REJECTED_BRIDGE_CLOSE(error)
```

There is intentionally no `TIMED_OUT` transition for a nested capability. The outer worker request cannot finish until the nested capability reaches a real terminal state.

### Lifecycle control

```text
REQUESTING
  -> RESPONSE(result/error)
   | DEADLINE_FIRED
       -> CLIENT_CLOSE
       -> SUPERVISOR_STOP_AWAITED
       -> CONTROL_TIMEOUT_REJECTED
```

After `DEADLINE_FIRED`, a late response cannot win. Cleanup failures are attached to the primary control-timeout error (for example through `cause`/`AggregateError`) rather than replacing or hiding the deadline, and all acquired worker resources are still unwound idempotently by the existing launcher/controller cleanup.

## 5. Primary And Return Spines

### `DS-010` — cold synchronous mutation

`Studio/standalone UI -> frontend GraphQL client -> REST route -> ApplicationBackendApiGatewayService -> ApplicationEngineController -> ApplicationEngineClient correlation -> worker entry -> application GraphQL executor -> application mutation -> ApplicationWorkerHostBridgeClient correlation -> host context capability -> application orchestration/execution acceptance -> bridge response -> application result -> worker response -> controller/gateway -> HTTP 2xx GraphQL result`

Governing completion owner: `ApplicationEngineController`; nested correlation owner: `ApplicationWorkerHostBridgeClient`. The operation may take longer than 30 seconds without changing its result classification.

### `DS-011` — application error return

`application handler or host capability rejection -> exact JSON-RPC error response -> retained pending correlation -> worker GraphQL error/result -> retained host pending correlation -> gateway/REST result`

A real domain/provider/authorization failure is preserved. Removing transport timers must not convert a genuine error into success.

### `DS-012` — engine lifecycle deadline

`launcher/controller lifecycle trigger -> control-request owner -> worker control method -> deadline -> client close -> supervisor SIGTERM/SIGKILL fallback and close wait -> timeout failure/status unwind`

This is off the normal application mutation spine and is the only deadline-bearing request path.

## 6. Allowed And Forbidden Dependencies

Allowed:

- REST/gateway -> `ApplicationEngineController` application-work methods;
- controller application-work methods -> `ApplicationEngineClient.request`;
- worker application handler -> `ApplicationWorkerHostBridgeClient` -> registered host capability;
- launcher/controller lifecycle -> `runApplicationEngineControlRequest` -> exact runtime handle;
- worker entry teardown -> bridge `close` -> backend runtime stop.

Forbidden:

- application route/gateway/controller callers supplying an arbitrary timeout;
- `ApplicationEngineClient.request` or `ApplicationWorkerHostBridgeClient.request` owning a default fixed deadline;
- deleting a pending application-work/capability correlation while the corresponding transport is live;
- applying the lifecycle control-request helper to GraphQL, command, route, event/artifact, WebSocket, or context-capability work;
- interpreting a timeout as confirmed rejection while work may continue;
- increasing `30_000` as the application-work fix;
- adding public retry/idempotency/status/cancellation fields under this correction;
- changing Brief/Socratic mutation schemas or application-local persistence to compensate for a transport timeout.

## 7. Error And Close Rules

1. Remote error responses preserve their exact current messages and application GraphQL mapping.
2. Frame-write failure removes/rejects only the exact correlation and does not wait indefinitely.
3. `ApplicationEngineClient.close()` remains idempotent, rejects all pending application work, and terminates its child; the outer lifecycle already awaits supervisor stop.
4. `ApplicationWorkerHostBridgeClient.close(error)` is idempotent, rejects all pending nested calls, records the close error, and rejects later calls without writing. On host-stdin close it occurs before runtime cleanup to unblock bridge-backed cancellation; the worker entry isolates the resulting expected cleanup rejection and exits.
5. Unknown/late response IDs after an actual close remain ignored. A response is never late merely because 30 seconds elapsed.
6. Existing platform quiesce/drain order remains authoritative; this change does not add an automatic retry after a real transport/process failure.

## 8. Public And Persisted Contract Decision

- Public GraphQL/command/route requests and responses: unchanged.
- Application SDK contracts: unchanged by SR-003.
- Application-agent logical address and role contraction: unchanged.
- JSON-RPC frame schema and IDs: unchanged; IDs remain transport-local correlation, not public idempotency keys.
- Brief/Socratic GraphQL schemas, repositories, and business records: unchanged.
- Persisted-data outcome: `Not Affected`; no migration, rewrite, journal, operation table, or compatibility branch.

## 9. Exact Proof Obligations

1. A host-to-worker request remains pending after fake time advances beyond 30 seconds and then resolves from the exact late response.
2. A nested host capability remains pending after the same interval and then resolves from the exact late host response.
3. Host and bridge write failures reject and remove the exact pending correlation.
4. Host client/worker bridge close rejects all pending requests exactly once; new bridge calls fail closed; host-stdin teardown cannot hang or produce an unhandled rejection while runtime cleanup encounters the closed bridge.
5. Startup/stop control deadline terminates and awaits the worker before the timeout is observable; late response cannot override it.
6. Architecture occurrence proof finds no `setTimeout`, `30_000`, `timeoutMs`, or timeout handle in the two application-work correlation clients, and finds the control-request helper only in launcher startup and controller stop paths.
7. Existing domain/authorization/provider errors still propagate.
8. Exact cold Studio restart, standalone Socratic recovery, and cold Brief launch return their actual completion result rather than HTTP 500 at 30 seconds, with one logical input/launch effect and unchanged artifact/transcript outcomes.
9. Warm Studio/standalone, logical root/member addressing, package parity, restart/reentry, streaming, publication, and cleanup evidence remains valid.
