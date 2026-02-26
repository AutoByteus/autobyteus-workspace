# Implementation Progress (WeChat Personal Integration)

Ticket: `wechat_personal_integration_ticket`

## Context
- Scope: `Large`
- Strategy: `bottom-up TDD`
- Kickoff date: `2026-02-09`

## Legend
- File Status: `Pending`, `In Progress`, `Blocked`, `Completed`
- Test Status: `Not Started`, `In Progress`, `Passed`, `Failed`, `Blocked`, `N/A`

## Progress Log
- 2026-02-09: Kickoff with finalized design + runtime simulation + gap-review artifacts.
- 2026-02-09: Completed shared-contract foundation in `autobyteus-ts`:
  - added `WECHAT` provider support
  - added centralized provider/transport compatibility guard
  - added inbound/outbound parser coverage for WECHAT compatibility
  - verification passed:
    - `pnpm -C /Users/normy/autobyteus_org/autobyteus-ts exec vitest run tests/unit/external-channel/provider.test.ts tests/unit/external-channel/external-message-envelope.test.ts tests/unit/external-channel/external-outbound-envelope.test.ts --no-watch`
    - `pnpm -C /Users/normy/autobyteus_org/autobyteus-ts build`
- 2026-02-09: Completed server invariant + compatibility surface in `autobyteus-server-ts`:
  - added `channel-binding-constraint-service` as dedicated provider/transport invariant policy module.
  - extended GraphQL `externalChannelCapabilities` with `acceptedProviderTransportPairs`.
  - enforced invariant check before binding upsert.
  - verification passed:
    - `pnpm -C /Users/normy/autobyteus_org/autobyteus-server-ts exec vitest run tests/unit/external-channel/services/channel-binding-constraint-service.test.ts tests/e2e/external-channel/external-channel-setup-graphql.e2e.test.ts --no-watch`
    - `pnpm -C /Users/normy/autobyteus_org/autobyteus-server-ts build`
- 2026-02-09: Completed gateway capability/read APIs + WeCom route split baseline in `autobyteus-message-gateway`:
  - added `gateway-capability-service` and `wecom-account-registry`.
  - added channel-admin setup read endpoints:
    - `GET /api/channel-admin/v1/capabilities`
    - `GET /api/channel-admin/v1/wecom/accounts`
  - added dedicated `wecom-app` webhook route:
    - `GET /webhooks/wecom-app/:accountId` handshake
    - `POST /webhooks/wecom-app/:accountId` callback ingress
  - extended runtime/env config for WeCom app capability and account inventory.
  - verification passed:
    - `pnpm -C /Users/normy/autobyteus_org/autobyteus-message-gateway exec vitest run tests/unit/application/services/gateway-capability-service.test.ts tests/unit/infrastructure/adapters/wecom/wecom-account-registry.test.ts tests/unit/config/env.test.ts tests/unit/config/runtime-config.test.ts tests/integration/http/routes/channel-admin-route.integration.test.ts tests/integration/http/routes/wecom-app-webhook-route.integration.test.ts --no-watch`
    - `pnpm -C /Users/normy/autobyteus_org/autobyteus-message-gateway build`
- 2026-02-09: Completed initial web capability/account store wiring in `autobyteus-web`:
  - added gateway capability store backed by gateway-session config source-of-truth.
  - extended gateway client with capabilities + WeCom accounts endpoints.
  - extended GraphQL capability query + binding draft validation to use server capability pairs.
  - verification passed:
    - `pnpm -C /Users/normy/autobyteus_org/autobyteus-web test:nuxt --run services/__tests__/externalMessagingGatewayClient.spec.ts stores/__tests__/externalChannelBindingSetupStore.spec.ts stores/__tests__/gatewayCapabilityStore.spec.ts`
- 2026-02-09: Added extra robustness coverage for current slice:
  - server e2e now verifies successful `WECHAT + PERSONAL_SESSION` upsert path.
  - gateway WeCom-app webhook integration now verifies invalid signature path (`401`, no forward).
  - web binding validation tests now verify:
    - capability-pair driven WECHAT acceptance,
    - backward-compatibility fallback rules when pair list is absent.
  - verification passed:
    - `pnpm -C /Users/normy/autobyteus_org/autobyteus-server-ts exec vitest run tests/unit/external-channel/services/channel-binding-constraint-service.test.ts tests/e2e/external-channel/external-channel-setup-graphql.e2e.test.ts --no-watch`
    - `pnpm -C /Users/normy/autobyteus_org/autobyteus-message-gateway exec vitest run tests/unit/application/services/gateway-capability-service.test.ts tests/unit/infrastructure/adapters/wecom/wecom-account-registry.test.ts tests/unit/config/env.test.ts tests/unit/config/runtime-config.test.ts tests/integration/http/routes/channel-admin-route.integration.test.ts tests/integration/http/routes/wecom-app-webhook-route.integration.test.ts --no-watch`
    - `pnpm -C /Users/normy/autobyteus_org/autobyteus-web test:nuxt --run services/__tests__/externalMessagingGatewayClient.spec.ts stores/__tests__/externalChannelBindingSetupStore.spec.ts stores/__tests__/gatewayCapabilityStore.spec.ts`
- 2026-02-09: Completed WeCom unified adapter wiring and WeChat personal runtime in `autobyteus-message-gateway`:
  - added `wecom-unified-adapter` composition with dedicated app inbound/outbound strategies and inbound message-id normalizer.
  - added WeChat personal runtime pieces:
    - `wechat-personal-adapter`
    - `wechaty-sidecar-client`
    - `wechat-personal-session-service`
    - state store + inbound id normalization
  - extended channel-admin APIs with WeChat personal session lifecycle endpoints.
  - verification passed:
    - `pnpm -C /Users/normy/autobyteus_org/autobyteus-message-gateway test`
    - `pnpm -C /Users/normy/autobyteus_org/autobyteus-message-gateway build`
- 2026-02-09: Completed web provider-aware personal setup path in `autobyteus-web`:
  - extended gateway REST client with WeChat personal session APIs.
  - made `gatewaySessionSetupStore` provider-aware (`WHATSAPP`/`WECHAT`) while preserving existing WhatsApp flow.
  - updated setup UI:
    - personal session card now supports provider selection
    - binding card now supports `WECHAT` provider and provider-aware peer refresh instructions
    - manager bootstrap now loads gateway capabilities/accounts source-of-truth
  - verification passed:
    - `pnpm -C /Users/normy/autobyteus_org/autobyteus-web test:nuxt --run services/__tests__/externalMessagingGatewayClient.spec.ts stores/__tests__/gatewaySessionSetupStore.spec.ts stores/__tests__/externalChannelBindingOptionsStore.spec.ts components/settings/__tests__/ExternalMessagingManager.spec.ts stores/__tests__/externalChannelBindingSetupStore.spec.ts stores/__tests__/gatewayCapabilityStore.spec.ts`

## File-Level Status

| File | Project | File Status | Test Status | Notes |
| --- | --- | --- | --- | --- |
| `src/external-channel/provider.ts` | `autobyteus-ts` | Completed | Passed | Added `WECHAT` enum/parse path. |
| `src/external-channel/provider-transport-compatibility.ts` | `autobyteus-ts` | Completed | Passed | New centralized compatibility guard. |
| `src/external-channel/external-message-envelope.ts` | `autobyteus-ts` | Completed | Passed | Uses centralized compatibility guard. |
| `src/external-channel/external-outbound-envelope.ts` | `autobyteus-ts` | Completed | Passed | Enforces compatibility on outbound parse. |
| `tests/unit/external-channel/provider.test.ts` | `autobyteus-ts` | Completed | Passed | Added WECHAT parse case. |
| `tests/unit/external-channel/external-message-envelope.test.ts` | `autobyteus-ts` | Completed | Passed | Added WECHAT valid/invalid transport tests. |
| `tests/unit/external-channel/external-outbound-envelope.test.ts` | `autobyteus-ts` | Completed | Passed | Added WECHAT valid/invalid transport tests. |
| `src/api/graphql/types/external-channel-setup.ts` | `autobyteus-server-ts` | Completed | Passed | Added compatibility field + invariant enforcement before binding upsert. |
| `src/external-channel/services/channel-binding-constraint-service.ts` | `autobyteus-server-ts` | Completed | Passed | New invariant policy module. |
| `tests/unit/external-channel/services/channel-binding-constraint-service.test.ts` | `autobyteus-server-ts` | Completed | Passed | Added valid/invalid provider-transport cases. |
| `tests/e2e/external-channel/external-channel-setup-graphql.e2e.test.ts` | `autobyteus-server-ts` | Completed | Passed | Added capability pair assertions + unsupported combination rejection. |
| `src/http/routes/wecom-app-webhook-route.ts` | `autobyteus-message-gateway` | Completed | Passed | Dedicated WeCom-app handshake/callback route. |
| `src/application/services/gateway-capability-service.ts` | `autobyteus-message-gateway` | Completed | Passed | Gateway setup capability source. |
| `src/infrastructure/adapters/wecom/wecom-account-registry.ts` | `autobyteus-message-gateway` | Completed | Passed | Configured account inventory boundary. |
| `src/http/routes/channel-admin-route.ts` | `autobyteus-message-gateway` | Completed | Passed | Added capability/accounts read endpoints. |
| `src/bootstrap/create-gateway-app.ts` | `autobyteus-message-gateway` | Completed | Passed | Wired capability service, account registry, and WeCom app route. |
| `src/config/env.ts` | `autobyteus-message-gateway` | Completed | Passed | Added WeCom app + WeChat capability env keys. |
| `src/config/runtime-config.ts` | `autobyteus-message-gateway` | Completed | Passed | Added WeCom app account parsing + capability mode defaults. |
| `tests/integration/http/routes/wecom-app-webhook-route.integration.test.ts` | `autobyteus-message-gateway` | Completed | Passed | Added handshake + callback route integration coverage. |
| `tests/integration/http/routes/channel-admin-route.integration.test.ts` | `autobyteus-message-gateway` | Completed | Passed | Added capabilities/accounts endpoint coverage. |
| `tests/unit/application/services/gateway-capability-service.test.ts` | `autobyteus-message-gateway` | Completed | Passed | Added mode/default capability behavior tests. |
| `tests/unit/infrastructure/adapters/wecom/wecom-account-registry.test.ts` | `autobyteus-message-gateway` | Completed | Passed | Added account list/resolve coverage. |
| `types/externalMessaging.ts` | `autobyteus-web` | Completed | Passed | Added WECHAT provider + gateway capability/account models. |
| `graphql/queries/externalChannelSetupQueries.ts` | `autobyteus-web` | Completed | Passed | Capability query now requests server compatibility pairs. |
| `services/externalMessagingGatewayClient.ts` | `autobyteus-web` | Completed | Passed | Added capabilities + WeCom account inventory API calls. |
| `stores/gatewayCapabilityStore.ts` | `autobyteus-web` | Completed | Passed | Gateway capability/account inventory store. |
| `stores/externalChannelBindingSetupStore.ts` | `autobyteus-web` | Completed | Passed | Binding transport/provider validation now consumes capability pair source-of-truth. |
| `stores/__tests__/gatewayCapabilityStore.spec.ts` | `autobyteus-web` | Completed | Passed | Added capability/account store tests. |
| `services/__tests__/externalMessagingGatewayClient.spec.ts` | `autobyteus-web` | Completed | Passed | Added capabilities/accounts endpoint tests. |
| `stores/__tests__/externalChannelBindingSetupStore.spec.ts` | `autobyteus-web` | Completed | Passed | Updated transport/provider validation expectations. |

## Blockers
- `autobyteus-web` production `nuxt build` currently fails in local prerender phase with `rendererContext._entrypoints is not iterable` on multiple routes; this appears unrelated to the external messaging changes (targeted tests for modified stores/services/components are passing).
