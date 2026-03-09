# Future-State Runtime Call Stack

## Use Case 1: Save Managed Telegram Config And Move To Binding

1. User opens `Settings -> Messaging`.
2. `useMessagingSetupBootstrap()` loads managed gateway status and initializes the messaging setup stores.
3. User selects `Telegram Bot`.
4. User enters:
   - bot token
   - stable account id
   - polling-only managed settings
5. Frontend calls `saveManagedMessagingGatewayProviderConfig`.
6. Server normalizes managed Telegram config to polling mode, persists it, and infers provider activation from the valid saved config.
7. If runtime is enabled, server restarts the managed gateway with the updated Telegram env.
8. Gateway boots with:
   - `GATEWAY_TELEGRAM_ENABLED=true`
   - `GATEWAY_TELEGRAM_POLLING_ENABLED=true`
   - `GATEWAY_TELEGRAM_WEBHOOK_ENABLED=false`
9. Frontend receives updated managed status.
10. Provider-scope store synchronizes the Telegram account id from the updated managed status.
11. Channel Binding now pre-fills/scopes to the saved Telegram account id without a full page refresh.
12. No extra Telegram-specific enable click is required.

## Use Case 2: Verify Managed Telegram Readiness

1. User opens `Verify`.
2. Verification store runs checks in order:
   - gateway
   - provider
   - binding
   - target runtime
3. `gateway` checks managed runtime reachability and runtime reliability state.
4. `provider` checks Telegram effective enablement and required config presence.
5. `binding` checks for at least one Telegram binding in the selected account scope.
6. `target runtime` checks that bound runtimes are still active.
7. UI reports:
   - `READY` if all pass
   - actionable blockers otherwise

## Use Case 2a: Restart Managed Gateway And Restore Configured Providers

1. User previously saved valid provider configuration for one or more supported providers.
2. User restarts the app, or the managed gateway process restarts under server supervision.
3. `ManagedMessagingGatewayService.restoreIfEnabled()` restores the managed gateway runtime.
4. Server reads persisted provider configuration.
5. Non-WeChat provider flags normalize back into the inferred-enable model.
6. Runtime env is rebuilt from the persisted provider config.
7. Any provider with valid required config starts active again automatically.
8. User does not need to re-enable Telegram, Discord, WeCom, or WhatsApp individually.

## Use Case 3: Inbound Telegram Message Delivery

1. Telegram polling client receives an update.
2. Telegram adapter normalizes the update into an external message envelope.
3. Inbound message service enqueues the envelope into the file-backed inbound inbox using an idempotent ingress key.
4. Inbound forwarder worker leases the pending inbox record.
5. Worker forwards the envelope to `autobyteus-server-ts` `/api/channel-ingress/v1/messages`.
6. Server resolves the binding:
   - `ROUTED`
   - `UNBOUND`
   - `DUPLICATE`
7. Gateway marks the inbox record:
   - `COMPLETED_ROUTED`
   - `COMPLETED_UNBOUND`
   - `COMPLETED_DUPLICATE`
8. Retryable failures back off and retry.
9. Terminal failures move to inbound dead letter.
10. Runtime reliability status reflects worker/lock health independently of individual message delivery.

## Use Case 4: Outbound Reply Delivery Back To Telegram

1. Server reply-callback service publishes an outbound envelope to the gateway callback route.
2. Gateway persists the outbound envelope into the file-backed outbox using callback idempotency.
3. Outbound sender worker leases the pending outbox record.
4. Telegram adapter attempts to send the message through Bot API.
5. On success:
   - outbox record becomes `SENT`
   - gateway posts delivery event back to server
6. On retryable failure:
   - outbox record becomes `FAILED_RETRY`
   - next attempt is scheduled with backoff
7. On terminal failure:
   - outbox record becomes `DEAD_LETTER`
   - failure delivery event is posted back to server

## Use Case 5: Queue Heartbeat / Runtime Reliability

1. Gateway acquires inbox and outbox owner locks during startup.
2. Reliability status marks both locks held and both workers running.
3. Every `5s`, lock heartbeat refresh runs for inbox and outbox.
4. If a lock heartbeat fails with ownership loss:
   - workers stop
   - reliability status becomes `CRITICAL_LOCK_LOST`
5. Managed server status surfaces runtime reliability snapshot and dead-letter counters to the frontend.
