# Investigation Notes

## Metadata

- Ticket: `message-delivery-robustness`
- Date: `2026-03-10`
- Scope Triage: `Medium`

## Sources Consulted

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-delivery-robustness/autobyteus-message-gateway/src/bootstrap/create-gateway-app.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-delivery-robustness/autobyteus-message-gateway/src/application/services/inbound-message-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-delivery-robustness/autobyteus-message-gateway/src/application/services/inbound-forwarder-worker.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-delivery-robustness/autobyteus-message-gateway/src/application/services/outbound-sender-worker.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-delivery-robustness/autobyteus-message-gateway/src/application/services/outbound-outbox-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-delivery-robustness/autobyteus-message-gateway/src/http/routes/server-callback-route.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-delivery-robustness/autobyteus-message-gateway/src/infrastructure/server-api/autobyteus-server-client.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-delivery-robustness/autobyteus-server-ts/src/app.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-delivery-robustness/autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-delivery-robustness/autobyteus-server-ts/src/external-channel/runtime/gateway-callback-publisher.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-delivery-robustness/autobyteus-server-ts/src/external-channel/runtime/runtime-external-channel-turn-bridge.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-delivery-robustness/autobyteus-server-ts/src/agent-customization/processors/response-customization/external-channel-assistant-reply-processor.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-delivery-robustness/autobyteus-server-ts/src/external-channel/services/delivery-event-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-delivery-robustness/autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-delivery-robustness/autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-process-supervisor.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-delivery-robustness/autobyteus-server-ts/src/persistence/file/store-utils.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-delivery-robustness/autobyteus-server-ts/tests/unit/external-channel/services/reply-callback-service.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-delivery-robustness/autobyteus-server-ts/tests/unit/agent-customization/processors/response-customization/external-channel-assistant-reply-processor.delivery.test.ts`

## Entrypoints And Execution Boundaries

1. Gateway inbound provider/webhook ingress parses provider payloads and enqueues normalized envelopes into a durable inbox.
2. Gateway inbound worker forwards queued envelopes to `autobyteus-server-ts` over `/rest/api/channel-ingress/v1/messages` with retry and dead-letter handling.
3. Server dispatches accepted inbound messages into an agent or runtime and stores turn-to-external-source receipt bindings.
4. Server outbound reply publishing currently calls the gateway callback endpoint `/api/server-callback/v1/messages` directly through `GatewayCallbackPublisher.publish(...)`.
5. Gateway callback ingress enqueues outbound envelopes into a durable outbox and a gateway worker sends them to the external provider/bot with retry and dead-letter handling.

## Key Findings

1. The gateway already implements durable reliability queues on both sides of its boundary:
   - inbound inbox: queued before forwarding to server,
   - outbound outbox: queued before provider send.
2. The server-to-gateway reply path is not durable:
   - `ReplyCallbackService.publishAssistantReplyByTurn(...)` records `PENDING`, then synchronously calls `callbackPublisher.publish(envelope)`,
   - on network timeout or non-2xx response it records `FAILED` and throws,
   - callers (`ExternalChannelAssistantReplyProcessor` and `RuntimeExternalChannelTurnBridge`) catch the error, log it, and continue.
3. In this deployment the server and gateway are usually on the same machine, so the dominant practical failure mode is gateway unavailability or unhealthy runtime state rather than cross-network transport loss.
4. This means one gateway-down or gateway-unhealthy window can permanently drop a reply:
   - there is no retry queue on the server,
   - the failure is swallowed after logging,
   - the user receives no response.
5. Callback idempotency currently reserves the callback key before publish. Once reserved, a later re-invocation of `publishAssistantReplyByTurn(...)` will be treated as `DUPLICATE`, so the current synchronous design cannot safely recover by simply retrying the same service call.
6. The gateway callback endpoint is already idempotent by `callbackIdempotencyKey`, which is a strong fit for an at-least-once server retry worker. Repeated server POST attempts can therefore be made safe without duplicate bot sends.
7. Existing delivery-event persistence on the server (`PENDING` / `SENT` / `FAILED`) is useful but incomplete for diagnosis because it does not preserve a durable retry state machine for the callback handoff itself.
8. The current managed gateway recovery behavior is incomplete for availability. `ManagedMessagingGatewayService.handleProcessExit(...)` marks unexpected gateway exits as `BLOCKED` instead of scheduling an automatic restart, so a managed gateway crash can leave the system down until manual intervention.
9. The gateway already emits a usable liveness signal for managed supervision. `createGatewayApp(...)` refreshes inbox and outbox queue lock heartbeats every five seconds, and `/api/runtime-reliability/v1/status` exposes `updatedAt`, worker-running flags, lock ownership, and `lastHeartbeatAt` timestamps.
10. The server currently uses that runtime-reliability endpoint only opportunistically during status reconciliation. It does not run a periodic supervision loop, does not evaluate heartbeat freshness, and does not restart a managed gateway when the process is still present but the gateway runtime is effectively wedged.

## Constraints

1. Code edits must preserve current external-channel binding semantics and supported providers.
2. The current codebase already distinguishes:
   - server-to-gateway acceptance,
   - gateway-to-provider final delivery events.
   The new design should keep that boundary instead of conflating them.
3. The fix should not rely on manual replay or operator restarts to recover transient connectivity issues.
4. The fix should avoid duplicate bot deliveries across retries by reusing existing callback idempotency and gateway-side outbox deduplication.
5. Automatic restart can only be implemented in code when the gateway process is actually managed by the server. Standalone gateway deployments still require an external supervisor (`systemd`, Docker restart policy, Kubernetes, PM2, or equivalent).
6. Heartbeat-based restart policy should stay within the managed gateway service boundary instead of introducing a second supervision subsystem.

## Module And File Placement Observations

1. Gateway reliability queue concerns already live in the gateway runtime/application/infrastructure boundaries and are placed coherently for that package.
2. Server reply-routing concerns live under `autobyteus-server-ts/src/external-channel/runtime` and `.../services`, so the missing reliability layer should be added in the server external-channel runtime area rather than pushed into unrelated startup or generic persistence folders.
3. Provider-backed channel state providers under `autobyteus-server-ts/src/external-channel/providers` currently own durable domain records such as bindings, message receipts, idempotency, and delivery events. A callback outbox is a runtime delivery orchestration concern rather than a channel binding domain concern, so a runtime-focused module placement is more coherent than extending the existing provider proxy set unless SQL-backed multi-node support becomes an explicit requirement.

## Open Unknowns

1. Whether the user’s failures come only from gateway-down / gateway-unhealthy windows or also from external provider send failures after the gateway has accepted the callback.
2. Whether a future multi-process or multi-node server deployment will require a shared SQL-backed callback outbox instead of file-backed persistence.
3. Whether additional runtime visibility endpoints are needed immediately, or whether durable outbox state plus existing delivery events are sufficient for this ticket.

## Implications For Requirements And Design

1. The confirmed reliability gap is the server-to-gateway callback hop.
2. A durable callback outbox on the server is the highest-leverage change because it lets the reliable server absorb gateway downtime without losing replies.
3. Gateway recovery ownership must be modeled explicitly:
   - managed gateway mode: the server-owned supervisor should restart unexpectedly exited gateway processes with backoff,
   - standalone gateway mode: external supervision remains mandatory because the server does not own that process.
4. Managed gateway recovery must cover both:
   - process exits,
   - stuck-but-still-present runtimes detected through stale heartbeat or unhealthy reliability status.
5. The design should use a persistent at-least-once dispatch worker with retry backoff and lease recovery, while keeping gateway deduplication as the safety net.
6. Requirements should explicitly distinguish:
   - inbound durability,
   - callback handoff durability,
   - gateway process recovery responsibility,
   - managed gateway liveness supervision responsibility,
   - final provider delivery tracking,
   - diagnosable state transitions.
7. Scope remains `Medium` because the change now crosses service, runtime orchestration, persistence, managed gateway supervision, heartbeat policy, startup lifecycle, and tests.

## Stage 8 Design-Impact Re-Entry Addendum

### Additional Sources Consulted

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-delivery-robustness/tickets/in-progress/message-delivery-robustness/code-review.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-delivery-robustness/tickets/in-progress/message-delivery-robustness/implementation-progress.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-delivery-robustness/autobyteus-server-ts/tests/unit/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.test.ts`

### Re-Entry Findings

1. The Stage 8 blocker is not only a file-length limit violation. The review failure exposed a boundary concentration problem inside `managed-messaging-gateway-service.ts`.
2. The managed service currently owns three separate concern groups:
   - public managed-gateway admin and lifecycle API (`getStatus`, `enable`, `disable`, `update`, `restoreIfEnabled`, provider/account reads),
   - runtime lifecycle and reachability orchestration (`startInstalledRuntime`, runtime adoption, shutdown, restart, reconciliation),
   - timer-driven supervision and restart policy (`handleProcessExit`, supervision loop, heartbeat health evaluation, bounded restart scheduling).
3. Those concerns change for different reasons and are verified at different levels:
   - admin/lifecycle API changes follow GraphQL and persisted state behavior,
   - runtime lifecycle changes follow process and reachability behavior,
   - supervision changes follow timer, heartbeat, and backoff policy behavior.
4. Keeping them in one file forces unrelated edits into one module and makes every new reliability rule raise Stage 8 review risk again, even when behavior is correct.
5. The current design version (`v2`) modeled managed restart ownership correctly, but it did not model the internal ownership split needed to keep the managed gateway boundary maintainable under the mandatory file-size and delta gates.

### Updated Module And File Placement Observations

1. `managed-messaging-gateway-service.ts` is the right package boundary but the wrong single-file boundary for the full managed runtime surface.
2. Runtime start/stop/adopt/reconcile behavior still belongs under `src/managed-capabilities/messaging-gateway/` because it is specific to the managed gateway package and depends on the installer, process supervisor, admin client, and persisted managed state.
3. Supervision policy should stay in the same package, but in a separate module, because timer ownership, heartbeat parsing, and restart backoff are not public admin API concerns.
4. Runtime reliability payload interpretation and heartbeat staleness checks are reusable support logic for supervision and reachability, so they should move into a small helper module instead of living at the bottom of the public service file.

### Design Implications From Re-Entry

1. The managed gateway design needs a structural split, not just a local reduction in method count.
2. The new target boundary should keep `ManagedMessagingGatewayService` as the public facade while delegating:
   - runtime lifecycle and reachability orchestration into a dedicated lifecycle module,
   - timer-driven restart supervision into a dedicated supervision module,
   - runtime reliability parsing and heartbeat utilities into a small helper module.
3. This is a `Design Impact` re-entry rather than a `Local Fix` because the correct remediation changes ownership boundaries, file placement, and runtime call stacks.
