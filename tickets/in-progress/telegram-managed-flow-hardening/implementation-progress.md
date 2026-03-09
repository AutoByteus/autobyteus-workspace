# Implementation Progress

## Status

- Current Stage: `10`
- Code Edit Permission: `Locked`

## Completed Work

- Restored provider configuration as a persistent section in the messaging page so users can configure the selected provider without losing the guided binding and verification flow.
- Hardened managed Telegram into an explicit polling-only product path in both the frontend and the server-managed runtime configuration.
- Synchronized managed provider account hints back into the binding flow so Telegram and Discord account labels update immediately after saving provider config.
- Extended setup verification with a provider-configuration check and kept the global runtime and provider sections directly reachable from verification.
- Surfaced runtime reliability state, queue heartbeat timestamps, and dead-letter counts in the top runtime card.
- Fixed stale Telegram-focused gateway tests and revalidated the managed GraphQL flow.
- Re-entered on a requirement gap and removed the extra non-WeChat provider enable step from the managed flow.
- Defaulted non-WeChat managed providers into an inferred-enable model so valid saved config becomes active automatically and stale stored `...Enabled=false` values no longer block restore.
- Removed provider enable checkboxes from the managed UI and updated provider copy so saving valid config is clearly the activation step.

## Validation Executed

- `pnpm -C autobyteus-web test:nuxt --run components/settings/messaging/__tests__/GatewayConnectionCard.spec.ts components/settings/messaging/__tests__/ManagedGatewayRuntimeCard.spec.ts components/settings/messaging/__tests__/SetupVerificationCard.spec.ts components/settings/messaging/__tests__/ChannelBindingSetupCard.spec.ts components/settings/__tests__/MessagingSetupManager.spec.ts stores/__tests__/messagingProviderScopeStore.spec.ts stores/__tests__/messagingVerificationStore.spec.ts`
- `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/messaging/managed-messaging-gateway-graphql.e2e.test.ts`
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/managed-capabilities/messaging-gateway/provider-config-normalization.test.ts tests/e2e/messaging/managed-messaging-gateway-graphql.e2e.test.ts`
- `pnpm -C autobyteus-web test:nuxt --run components/settings/messaging/__tests__/GatewayConnectionCard.spec.ts stores/__tests__/gatewaySessionSetupStore.spec.ts`
- `pnpm -C autobyteus-server-ts build:file`
- `pnpm -C autobyteus-message-gateway exec vitest run tests/unit/config/runtime-config.test.ts tests/unit/infrastructure/adapters/telegram-business/telegram-business-adapter.test.ts tests/unit/infrastructure/adapters/telegram-business/telegram-bot-client.test.ts tests/unit/application/services/telegram-peer-discovery-service.test.ts tests/integration/http/routes/channel-admin-route.integration.test.ts tests/integration/http/routes/provider-webhook-route.integration.test.ts tests/integration/bootstrap/create-gateway-app.integration.test.ts`
- `pnpm -C autobyteus-message-gateway build`
- `git diff --check`

## Residual Risks

- The managed Telegram product path is now polling-only by design. A live real-bot credentialed acceptance run is still required to prove end-to-end delivery with a real Telegram bot token.
- The standalone low-level gateway continues to support Telegram webhook mode, but that path is intentionally not part of the managed in-app setup.
- Existing unrelated uncommitted work in the worktree remains preserved and untouched by this ticket.
