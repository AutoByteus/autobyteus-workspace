# Implementation Plan (WeChat Personal Integration)

Ticket: `wechat_personal_integration_ticket`  
Scope: `Large` (cross-project)  
Strategy: `Bottom-up TDD` (`source skeleton -> tests -> implementation -> refactor`)

## Goal
Implement WeChat support with two routes:
1. `WECOM + BUSINESS_API` (WeCom app bridge, recommended)
2. `WECHAT + PERSONAL_SESSION` (Wechaty sidecar, experimental)

while keeping setup flow clean across gateway/server/web.

## Locked Constraints
- Gateway owns provider protocol logic and mode/account source-of-truth.
- Server owns runtime dispatch + binding invariants.
- Web stays setup-only.
- Sidecar owns direct WeChat credentials; gateway stores only session metadata.

## Implementation Order

1. Shared contract foundation (`autobyteus-ts`)
- `src/external-channel/provider.ts`
- `src/external-channel/provider-transport-compatibility.ts` (new)
- `src/external-channel/external-message-envelope.ts`
- `src/external-channel/external-outbound-envelope.ts`
- tests:
  - `tests/unit/external-channel/provider.test.ts`
  - `tests/unit/external-channel/external-message-envelope.test.ts`
  - `tests/unit/external-channel/external-outbound-envelope.test.ts`

2. Server invariant + compatibility surface (`autobyteus-server-ts`)
- `src/api/graphql/types/external-channel-setup.ts`
- `src/external-channel/services/channel-binding-constraint-service.ts` (new)
- tests:
  - `tests/unit/api/graphql/types/external-channel-setup.test.ts` (new/updated)
  - external-channel binding tests for invalid provider/transport

3. Gateway capability/read APIs + WeCom route split (`autobyteus-message-gateway`)
- `src/http/routes/wecom-app-webhook-route.ts` (new)
- `src/application/services/gateway-capability-service.ts` (new)
- `src/http/routes/channel-admin-route.ts`
- `src/bootstrap/create-gateway-app.ts`
- `src/config/env.ts`
- `src/config/runtime-config.ts`
- tests:
  - route integration tests for capability/accounts and handshake

4. Gateway WeCom unified adapter + ID normalizers (`autobyteus-message-gateway`)
- `src/infrastructure/adapters/wecom/wecom-unified-adapter.ts` (new)
- `src/infrastructure/adapters/wecom/wecom-app-inbound-strategy.ts` (new)
- `src/infrastructure/adapters/wecom/wecom-app-outbound-strategy.ts` (new)
- `src/infrastructure/adapters/wecom/wecom-account-registry.ts` (new)
- `src/infrastructure/adapters/wecom/wecom-inbound-message-id-normalizer.ts` (new)
- tests: unit + integration

5. Gateway direct WeChat session skeleton (experimental) (`autobyteus-message-gateway`)
- `src/infrastructure/adapters/wechat-personal/wechat-personal-adapter.ts` (new)
- `src/infrastructure/adapters/wechat-personal/wechaty-sidecar-client.ts` (new)
- `src/infrastructure/adapters/wechat-personal/session-state-store.ts` (new)
- `src/infrastructure/adapters/wechat-personal/wechat-inbound-message-id-normalizer.ts` (new)
- `src/application/services/wechat-personal-session-service.ts` (new)
- tests: unit + route integration for session lifecycle/peer candidates

6. Web setup compatibility + mode flow (`autobyteus-web`)
- `stores/gatewayCapabilityStore.ts` (new)
- `stores/serverChannelCompatibilityStore.ts` (new)
- `stores/wechatSetupModeStore.ts` (new)
- `services/externalMessagingGatewayClient.ts` (extend)
- `stores/externalChannelBindingSetupStore.ts` (extend validation)
- `graphql/queries/externalChannelSetupQueries.ts` (extend)
- `components/settings/externalMessaging/*` (new/extend)
- tests: store/service/component suites

7. Documentation and operator setup
- gateway/web/server READMEs as needed

## Verification Gate
- `autobyteus-ts`: targeted unit tests + build
- `autobyteus-server-ts`: targeted unit/e2e tests + typecheck
- `autobyteus-message-gateway`: targeted unit/integration tests + build
- `autobyteus-web`: targeted Nuxt test suites + build/typecheck

## Out Of Scope For This Slice
- Production-grade sidecar deployment automation.
- Full operational monitoring dashboard for WeChat channels.
