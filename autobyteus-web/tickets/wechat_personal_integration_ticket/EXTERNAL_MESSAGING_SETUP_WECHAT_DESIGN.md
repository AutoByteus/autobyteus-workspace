# Design Document (autobyteus-web: WeChat Setup UX)

## Summary
Extend External Messaging setup UI for WeChat with two route choices:
1. `WECOM_APP_BRIDGE` (recommended)
2. `DIRECT_PERSONAL_SESSION` (experimental)

Source-of-truth split:
- Gateway admin APIs: channel mode/account runtime availability.
- Server GraphQL: binding CRUD, target options, and server compatibility pairs.

## Goals
- Keep setup flow simple and setup-only.
- Make route availability deterministic via gateway + server preflight.
- Keep component/store/service boundaries clean.

## Non-Goals
- No runtime monitoring dashboard.
- No secret editing in web phase 1.

## Requirements And Use Cases
- Use Case 1: Load gateway capabilities and WeCom account inventory.
- Use Case 2: Load server compatibility pairs and compute route compatibility verdict.
- Use Case 3: Select route and render route-specific setup card.
- Use Case 4: Start direct personal session + scan QR.
- Use Case 5: Refresh peer candidates and save binding.
- Use Case 6: Run setup verification using combined gateway/server/binding readiness.

## File And Module Breakdown

| File/Module | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/ExternalMessagingManager.vue` | setup flow composition | section orchestration | store snapshots -> rendered cards | setup stores |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/ChannelModeSelectorCard.vue` (new) | mode select + recommendation badge | emits mode | mode list -> selected mode | mode store |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/WeComBridgeSetupCard.vue` (new) | bridge setup status panel | refresh accounts action | account inventory -> operator choices | capability store |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/WeChatPersonalSessionSetupCard.vue` (new) | direct session controls | start/refresh/status/stop events | session state -> actions | session store |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/ChannelBindingSetupCard.vue` | binding CRUD UI | save/delete actions | draft -> mutation | binding store |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/gatewayCapabilityStore.ts` (new) | gateway capability + account inventory | `loadCapabilities`, `loadWeComAccounts` | REST -> state | gateway client |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/serverChannelCompatibilityStore.ts` (new) | server compatibility source | `loadServerCompatibility` | GraphQL capability -> compatibility state | Apollo |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/wechatSetupModeStore.ts` (new) | selected mode source + compatibility resolution | `setMode`, `resolveDefaultMode` | gateway+server states -> selected mode | capability stores |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/gatewaySessionSetupStore.ts` | direct session orchestration | start/status/qr/stop/peer-candidates APIs | UI actions -> REST | gateway client |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/externalChannelBindingSetupStore.ts` | binding orchestration + validation | `upsertBinding`, `deleteBinding` | draft -> GraphQL | Apollo |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/externalMessagingSetupStore.ts` | checklist aggregation | `runSetupVerification` | snapshot inputs -> verdict | all setup stores |
| `/Users/normy/autobyteus_org/autobyteus-web/services/externalMessagingGatewayClient.ts` | gateway transport boundary | add capability/accounts/wechat session APIs | REST request/response | axios |
| `/Users/normy/autobyteus_org/autobyteus-web/graphql/queries/externalChannelSetupQueries.ts` | server GraphQL boundary | include `acceptedProviderTransportPairs` | query -> typed data | Apollo |
| `/Users/normy/autobyteus_org/autobyteus-web/types/externalMessaging.ts` | domain contracts | mode/capability/account/compatibility types | typed contracts | none |

## Public API/Type Additions (Web Internal)
- `WeChatSetupMode = 'WECOM_APP_BRIDGE' | 'DIRECT_PERSONAL_SESSION'`
- `GatewayCapabilities` with `wechatModes`, `defaultWeChatMode`
- `ServerChannelCompatibility` with `acceptedProviderTransportPairs: string[]`
- `RouteCompatibilityVerdict` derived from both capability sources

## UX Defaults
- Default mode: gateway default mode if compatible with server; otherwise first compatible mode.
- Unsupported mode: shown disabled with exact reason.
- If no compatible mode exists: setup step blocked with actionable mismatch message.

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation |
| --- | --- | --- | --- | --- |
| `gatewayCapabilityStore.ts` | gateway client | mode store + setup cards | Low | read-only gateway source |
| `serverChannelCompatibilityStore.ts` | GraphQL capability query | mode store + setup checklist | Low | read-only server source |
| `wechatSetupModeStore.ts` | gateway + server compatibility stores | manager + mode selector | Low | state-only selection logic |
| `gatewaySessionSetupStore.ts` | gateway client + mode store | direct setup card + checklist | Medium | direct route orchestration only |
| `externalChannelBindingSetupStore.ts` | GraphQL + mode store | binding card + checklist | Medium | all binding validation centralized |

## Error Handling And Edge Cases
- Gateway capability fetch fails -> block mode select with retry.
- Server compatibility fetch fails -> block setup verification with mismatch diagnostic.
- Mode available in gateway but not accepted by server -> disable mode and explain upgrade mismatch.
- Direct session sidecar unavailable -> `SIDECAR_UNAVAILABLE` actionable error.
- Peer candidates empty -> instruction to send inbound message first.

## Migration / Rollout
1. Add gateway capability/account endpoints.
2. Add server compatibility field in GraphQL.
3. Add web compatibility stores and mode-resolution logic.
4. Extend binding validation and setup verification to include compatibility verdict.

## Open Questions
- None blocking design.
