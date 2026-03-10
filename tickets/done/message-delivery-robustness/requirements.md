# Message Delivery Robustness Requirements

## Metadata

- Ticket: `message-delivery-robustness`
- Status: `Refined`
- Last Updated: `2026-03-10`
- Scope Classification: `Medium`
- Scope Rationale: The confirmed fix crosses external-channel reply services, runtime orchestration, persistence, managed gateway supervision/restart policy, server lifecycle startup/shutdown, and automated verification.

## Goal / Problem Statement

The messaging gateway already queues inbound messages before forwarding to the server and queues outbound provider sends before talking to the bot platform. In the current deployment, the server and gateway usually share the same machine, so the primary risk is gateway downtime or gateway runtime failure rather than cross-network transport loss. The remaining non-durable link is the server-to-gateway callback hop for agent replies. When that hop fails because the gateway is down or unhealthy, the current server code records a failed delivery event, logs the error, and drops the reply without retry. In addition, the current managed gateway path does not automatically restart the gateway after an unexpected exit and does not supervise heartbeat/liveness drift when the process is still present but effectively stuck. The goal of this ticket is to make agent reply handoff to the gateway durable, retryable, and diagnosable, and to ensure there is explicit restart ownership for managed gateway failures so outages do not silently lose bot responses.

## In-Scope Use Cases

1. `UC-001` Normal reply publish: an agent reply is accepted for external delivery, persisted durably on the server, and handed off to the gateway for queueing.
2. `UC-002` Gateway-down recovery: the initial server-to-gateway callback attempt fails because the gateway is down or unhealthy, the reply stays queued on the server, and a later retry succeeds without duplicate user-visible delivery.
3. `UC-003` Permanent or max-attempt failure: repeated callback failures eventually move the reply to a terminal inspectable state with the last error preserved.
4. `UC-004` Duplicate callback invocation or duplicate retry send: repeated processing for the same callback idempotency key does not create duplicate queue records or duplicate gateway work.
5. `UC-005` Managed gateway crash recovery: when the server-managed gateway exits unexpectedly, the server schedules an automatic restart with bounded backoff and queued replies are delivered after recovery.
6. `UC-006` Managed gateway stuck-runtime recovery: when the server-managed gateway remains running but its reliability heartbeat or liveness signal goes stale, the server detects the unhealthy runtime and performs bounded restart recovery.

## Out Of Scope

1. Redesigning gateway-to-provider retry behavior.
2. Redesigning provider-specific final delivery semantics.
3. Implementing multi-node shared SQL-backed callback outbox storage unless required by the current code path.
4. Building a process supervisor for standalone external gateway deployments that the server does not own. Those deployments still require Docker, `systemd`, Kubernetes, PM2, or equivalent.

## Requirements

| Requirement ID | Requirement | Expected Outcome |
| --- | --- | --- |
| R-001 | The server must durably persist each eligible outbound external-channel reply before relying on the gateway callback HTTP request to succeed. | A transient server-to-gateway transport failure cannot permanently lose a reply once the reply callback flow has accepted it. |
| R-002 | The server must process persisted outbound reply callbacks through a retryable dispatch worker with bounded exponential backoff and recovery for interrupted in-flight dispatches. | Gateway downtime, gateway callback errors, timeouts, or process interruptions result in retryable queued work instead of silent reply loss. |
| R-003 | The server must preserve idempotent delivery behavior across duplicate callback attempts and retry sends by using a stable callback idempotency key end to end. | Duplicate processing does not create duplicate queue records or duplicate downstream gateway/provider sends. |
| R-004 | The system must expose enough persisted state to distinguish server-side callback queue state from gateway/provider delivery state. | Operators can determine whether a reply is still queued on the server, accepted by the gateway, or failed before handoff. |
| R-005 | Server startup and shutdown must manage the callback dispatch worker coherently with the app lifecycle. | Pending work resumes after restart, and shutdown does not leave the worker in an uncontrolled state. |
| R-006 | When the gateway process is managed by the server, unexpected gateway exits must trigger automatic restart attempts with bounded backoff instead of remaining indefinitely down until manual intervention. | The managed gateway returns to service automatically after recoverable exits, and queued replies can resume delivery once the restart succeeds. |
| R-007 | When the gateway process is managed by the server, the server must supervise runtime heartbeat/liveness signals and restart the gateway when the process is present but its reliability state or heartbeat freshness shows it is unhealthy or stuck. | Managed gateway stalls do not leave the process wedged indefinitely while replies continue to queue without ever draining. |

## Acceptance Criteria

| Acceptance Criteria ID | Requirement ID(s) | Expected Outcome |
| --- | --- | --- |
| AC-001 | R-001, R-002 | When the first server-to-gateway callback attempt fails because the gateway is down or unhealthy, the reply remains in persisted retryable state and can be delivered successfully by a later retry without manual replay. |
| AC-002 | R-002, R-005 | If the server restarts or loses an in-flight worker attempt before gateway acceptance, the persisted callback becomes dispatchable again and is not stuck permanently in an in-progress-only state. |
| AC-003 | R-002, R-004 | When retries exceed the configured limit or a terminal callback error occurs, the callback is moved to a terminal inspectable state with attempt count and last error preserved. |
| AC-004 | R-003 | Reprocessing the same callback idempotency key does not create more than one durable callback outbox record and does not require duplicate downstream delivery. |
| AC-005 | R-004 | The persisted callback state model makes it possible to distinguish server-side queued/dispatching/retrying/dead-lettered work from later gateway/provider delivery-event status. |
| AC-006 | R-006 | When the managed gateway exits unexpectedly, the server schedules bounded restart attempts automatically and the gateway can resume serving queued replies without manual restart commands. |
| AC-007 | R-007 | When the managed gateway remains present but stops refreshing its reliability heartbeat or reports unhealthy runtime state, the server detects that condition and restarts the managed gateway automatically within bounded policy limits. |

## Constraints / Dependencies

1. The fix must preserve existing external-channel binding, source lookup, and gateway callback authentication behavior.
2. The fix must preserve the current boundary where gateway acceptance and provider final delivery are tracked separately.
3. The fix must not add backward-compatibility shims, dual-write paths, or legacy fallback branches retained only for old behavior.
4. The design may rely on the existing gateway callback endpoint idempotency keyed by `callbackIdempotencyKey`.
5. The current server persistence utilities under `autobyteus-server-ts/src/persistence/file/store-utils.ts` are available for atomic local durable state updates.
6. Automatic restart logic can only be implemented for gateways that are launched and supervised by the server itself.
7. Managed heartbeat supervision may rely on the existing gateway runtime reliability endpoint and the lock heartbeat timestamps it already exposes.

## Assumptions

1. The current deployment model is a single server process per persisted memory directory.
2. A file-backed durable callback outbox is acceptable for this ticket unless investigation during implementation proves a shared provider abstraction is required immediately.
3. Gateway acceptance of the callback request is the correct success condition for the server callback outbox; final provider delivery remains tracked by later delivery events.
4. Managed gateway restarts can reuse the existing process supervisor and managed gateway service boundaries instead of introducing a second supervisor subsystem.
5. A bounded heartbeat freshness threshold can be tuned conservatively enough to avoid routine false positives while still detecting wedged runtimes.

## Open Questions / Risks

1. If the deployment later becomes multi-node with non-shared local storage, a file-backed callback outbox will need promotion to a shared provider.
2. Some provider-level failures may still occur after the gateway has accepted the callback; those remain outside the server callback outbox boundary.
3. If current operations require a user-facing API for callback outbox visibility, additional exposure work may still be needed after this ticket.
4. Standalone gateway deployments still depend on an external process supervisor; this ticket can only document that operational requirement, not enforce it in-process.
5. Heartbeat freshness thresholds that are too aggressive could cause unnecessary restarts; the implementation needs sane defaults and configuration hooks.

## Requirement Coverage Map To Use Cases

| Requirement ID | Covered Use Case IDs |
| --- | --- |
| R-001 | `UC-001`, `UC-002` |
| R-002 | `UC-002`, `UC-003` |
| R-003 | `UC-004` |
| R-004 | `UC-001`, `UC-003` |
| R-005 | `UC-002`, `UC-003` |
| R-006 | `UC-005`, `UC-002` |
| R-007 | `UC-006`, `UC-002` |

## Acceptance Criteria Coverage Map To Stage 7 Scenarios

| Acceptance Criteria ID | Stage 7 Scenario ID(s) |
| --- | --- |
| AC-001 | `AV-001` |
| AC-002 | `AV-002` |
| AC-003 | `AV-003` |
| AC-004 | `AV-004` |
| AC-005 | `AV-001`, `AV-003` |
| AC-006 | `AV-005` |
| AC-007 | `AV-006` |
