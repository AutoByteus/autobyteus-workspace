# Investigation Notes

## Scope

Re-audit the managed Telegram path across:

- `autobyteus-message-gateway`
- `autobyteus-server-ts`
- `autobyteus-web`

Focus areas:

- managed Telegram setup completeness
- polling vs webhook viability
- binding/account-scope ergonomics
- delivery/reliability guarantees
- current automated coverage vs live proof

## Sources Consulted

### Frontend

- `autobyteus-web/components/settings/MessagingSetupManager.vue`
- `autobyteus-web/components/settings/messaging/ManagedGatewayRuntimeCard.vue`
- `autobyteus-web/components/settings/messaging/GatewayConnectionCard.vue`
- `autobyteus-web/components/settings/messaging/ChannelBindingSetupCard.vue`
- `autobyteus-web/composables/useMessagingSetupBootstrap.ts`
- `autobyteus-web/composables/useMessagingChannelBindingSetupFlow.ts`
- `autobyteus-web/composables/messaging-binding-flow/draft-state.ts`
- `autobyteus-web/stores/gatewaySessionSetupStore.ts`
- `autobyteus-web/stores/gatewayCapabilityStore.ts`
- `autobyteus-web/stores/messagingProviderScopeStore.ts`
- `autobyteus-web/stores/messagingVerificationStore.ts`
- `autobyteus-web/stores/messagingChannelBindingSetupStore.ts`
- `autobyteus-web/stores/messagingChannelBindingOptionsStore.ts`
- `autobyteus-web/types/messaging.ts`
- `autobyteus-web/docs/messaging.md`

### Server

- `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts`
- `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-env.ts`
- `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/types.ts`
- `autobyteus-server-ts/src/api/rest/channel-ingress.ts`
- `autobyteus-server-ts/src/api/rest/channel-ingress-message-route.ts`
- `autobyteus-server-ts/src/api/rest/channel-delivery-event-route.ts`
- `autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts`

### Gateway

- `autobyteus-message-gateway/src/bootstrap/create-gateway-app.ts`
- `autobyteus-message-gateway/src/config/runtime-config.ts`
- `autobyteus-message-gateway/src/infrastructure/adapters/telegram-business/telegram-business-adapter.ts`
- `autobyteus-message-gateway/src/infrastructure/adapters/telegram-business/telegram-bot-client.ts`
- `autobyteus-message-gateway/src/http/routes/provider-webhook-route.ts`
- `autobyteus-message-gateway/src/http/routes/channel-admin-route.ts`
- `autobyteus-message-gateway/src/http/routes/runtime-reliability-route.ts`
- `autobyteus-message-gateway/src/application/services/inbound-message-service.ts`
- `autobyteus-message-gateway/src/application/services/inbound-inbox-service.ts`
- `autobyteus-message-gateway/src/application/services/inbound-forwarder-worker.ts`
- `autobyteus-message-gateway/src/application/services/outbound-outbox-service.ts`
- `autobyteus-message-gateway/src/application/services/outbound-sender-worker.ts`
- `autobyteus-message-gateway/src/application/services/reliability-status-service.ts`
- `autobyteus-message-gateway/src/infrastructure/server-api/autobyteus-server-client.ts`

### Tests

- `autobyteus-server-ts/tests/e2e/messaging/managed-messaging-gateway-graphql.e2e.test.ts`
- `autobyteus-server-ts/tests/e2e/messaging/managed-messaging-gateway-e2e-fixtures.ts`
- `autobyteus-server-ts/tests/e2e/external-channel/external-channel-setup-graphql.e2e.test.ts`
- `autobyteus-server-ts/tests/unit/external-channel/services/channel-binding-constraint-service.test.ts`
- `autobyteus-web/components/settings/messaging/__tests__/GatewayConnectionCard.spec.ts`
- `autobyteus-web/components/settings/messaging/__tests__/ChannelBindingSetupCard.spec.ts`
- `autobyteus-web/stores/__tests__/messagingVerificationStore.spec.ts`
- `autobyteus-web/stores/__tests__/messagingProviderScopeStore.spec.ts`
- `autobyteus-web/stores/__tests__/gatewayCapabilityStore.spec.ts`
- `autobyteus-message-gateway/tests/unit/config/runtime-config.test.ts`
- `autobyteus-message-gateway/tests/unit/infrastructure/adapters/telegram-business/telegram-bot-client.test.ts`
- `autobyteus-message-gateway/tests/unit/infrastructure/adapters/telegram-business/telegram-business-adapter.test.ts`
- `autobyteus-message-gateway/tests/unit/application/services/telegram-peer-discovery-service.test.ts`
- `autobyteus-message-gateway/tests/integration/http/routes/channel-admin-route.integration.test.ts`
- `autobyteus-message-gateway/tests/integration/http/routes/provider-webhook-route.integration.test.ts`
- `autobyteus-message-gateway/tests/integration/bootstrap/create-gateway-app.integration.test.ts`

## Key Findings

### 1. Managed Telegram polling mode is mostly implemented

The managed flow already covers:

- on-demand gateway install/start from the server
- Telegram provider config in the app
- gateway runtime env wiring for Telegram
- Telegram polling adapter startup
- peer discovery via the server-owned boundary
- channel binding into active runtimes

This means polling mode is the right product path to harden, not a new path to invent.

### 2. Managed Telegram webhook mode is not viable in the current architecture

The managed server always launches the gateway on loopback:

- `bindHost = "127.0.0.1"` in `managed-messaging-gateway-service.ts`

The Telegram webhook ingress exists only inside the gateway:

- `POST /webhooks/:provider` in `provider-webhook-route.ts`

No server-side public proxy route was found in `autobyteus-server-ts`.

Implication:

- managed webhook mode is exposed in the UI and supported by the raw gateway runtime
- but it is not a realistic managed-node product path
- it should be removed or clearly constrained from the normal managed Telegram flow

### 3. Telegram account scope is not synchronized well enough after saving config

The binding flow still depends on `providerScopeStore.telegramAccountId`, while provider save only updates the gateway store status/config.

Observed boundary:

- provider save updates `gatewayStore`
- binding/account hints and verification scoping still read `providerScopeStore`
- `providerScopeStore` is initialized during bootstrap and can lag behind the latest saved Telegram config

Implication:

- after saving Telegram config, the binding step can still feel stale
- the user may need refresh/rebootstrap behavior instead of seeing the saved account scope immediately

### 4. Verification is not Telegram-specific enough

Current verification checks:

- gateway
- session
- binding
- target runtime

It does not explicitly verify:

- provider configuration readiness
- peer discovery readiness for Telegram
- whether a real Telegram inbound message has been observed

Implication:

- the Verify step can say the setup is structurally ready without proving the Telegram part has actually been exercised

### 5. Delivery reliability is stronger than a simple heartbeat

The gateway uses a file-backed reliability queue:

- inbound inbox
- outbound outbox
- queue-owner locks
- retry workers
- dead-letter states
- replay endpoints

Inbound path:

1. Telegram update is normalized into an envelope.
2. Envelope is deduplicated and persisted into the inbound inbox.
3. Inbound forwarder worker leases pending records and forwards them to `autobyteus-server-ts`.
4. Failures are retried with backoff.
5. Terminal failures become dead letters.

Outbound path:

1. `autobyteus-server-ts` publishes a callback into the gateway.
2. Gateway persists the outbound envelope into the outbox.
3. Outbound sender worker attempts delivery through the Telegram adapter.
4. Retryable failures back off and retry.
5. Terminal failures become dead letters.
6. Delivery events are posted back to the server.

Runtime health/heartbeat:

- queue-owner locks emit heartbeats every `5s`
- lock loss stops workers and marks runtime state `CRITICAL_LOCK_LOST`
- runtime reliability status includes worker states and dead-letter counters

Implication:

- yes, there is a heartbeat-like mechanism
- but the deeper guarantee comes from persisted queue state, retries, idempotency, dead letters, and replay

### 6. Product-facing automated coverage is decent, but live Telegram proof is still missing

Passing focused slices:

- frontend Telegram/config/binding/verification store tests
- server managed gateway + binding E2E tests

Current limits:

- managed gateway E2E uses fake Telegram discovery fixtures
- no real BotFather token/live Telegram round-trip proof exists yet
- some broader gateway Telegram tests are stale and currently fail for test-maintenance reasons

Implication:

- the managed polling path is technically close
- but a live credentialed Telegram proof is still the final confidence step

## Module / File Placement Observations

- Managed runtime lifecycle ownership remains correctly under:
  - `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/`
- Telegram runtime logic remains correctly under:
  - `autobyteus-message-gateway/src/infrastructure/adapters/telegram-business/`
- Messaging UX flow remains correctly under:
  - `autobyteus-web/components/settings/messaging/`
  - `autobyteus-web/stores/`
  - `autobyteus-web/composables/`

No obvious module-placement rewrite is required for this round.

## Unknowns / Risks

1. Whether the fastest path is to disable managed webhook mode entirely or preserve it behind an advanced path.
2. Whether the current Verify step should be made Telegram-aware or whether a lighter UX hint is enough.
3. Whether stale gateway Telegram tests hide any real issue or are purely test-maintenance debt.

## Implications For Requirements / Design

- Make polling the only normal managed Telegram path.
- Remove or constrain managed webhook configuration in UI and runtime normalization.
- Synchronize Telegram account scope immediately after provider save.
- Strengthen verification/readiness around provider-specific Telegram setup.
- Preserve and possibly surface the existing reliability/dead-letter model rather than inventing a new heartbeat system.
