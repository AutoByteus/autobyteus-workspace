# Design Document (External Messaging Provider-Scoped Setup UX)

## Summary
Current External Messaging setup mixes provider concerns in one binding form.  
Users must reason about provider/transport combinations while also handling session and binding details, which causes confusion.

This design moves to a provider-scoped setup flow:
- User first selects setup provider scope (`WHATSAPP`, `WECHAT`, `WECOM`).
- Binding provider/transport is derived from scope, not manually combined.
- Personal session setup is shown only when required (WhatsApp/WeChat).
- WeCom setup skips personal-session prerequisite.

## Goals
- Make provider identity explicit and persistent during setup.
- Remove ambiguous provider/transport combinations from primary UX.
- Keep separation of concerns between:
  - scope selection
  - gateway/session lifecycle
  - binding CRUD
  - option loading (peers/targets)
- Preserve advanced/manual peer and target fallback where appropriate.

## Non-Goals
- No runtime monitoring dashboard.
- No automatic agent/team startup.
- No provider-specific business logic in presentational components.

## Use Cases
- Use Case 1: User selects setup provider scope and sees provider-specific setup context.
- Use Case 2: WhatsApp/WeChat setup requires active personal session before peer discovery.
- Use Case 3: WeCom setup does not require personal session and is not blocked by it.
- Use Case 4: Binding save uses provider/transport derived from selected scope.
- Use Case 5: User refreshes peer candidates only when discovery is supported.
- Use Case 6: Stale dropdown selections are blocked before mutation.

## File-Level Design (Separation of Concerns)

| File | Concern | APIs | Input -> Output |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/ExternalMessagingManager.vue` | Page composition + bootstrap orchestration only | `bootstrapSetupState()` | mounted view -> initialized stores |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/ProviderSetupScopeCard.vue` (new) | Provider-scope selector UI only | `setSelectedProvider(provider)` | user scope selection -> scope-store state |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/PersonalSessionSetupCard.vue` | Session setup UI only, conditional by scope | start/refresh/stop session actions | session store state -> session actions |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/ChannelBindingSetupCard.vue` | Binding form orchestration + peer/target dropdown UX | `onRefreshPeerCandidates`, `onSaveBinding` | scope + store options + draft -> binding mutations |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/externalMessagingProviderScopeStore.ts` (new) | Provider scope source-of-truth + derived transport | `initialize`, `setSelectedProvider` | capabilities -> selected provider + transport |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/gatewaySessionSetupStore.ts` | Gateway/session lifecycle and persistence | existing session APIs | gateway/session actions -> readiness snapshot |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/externalChannelBindingSetupStore.ts` | Binding capability + CRUD only | existing binding APIs | draft -> GraphQL CRUD result |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/externalChannelBindingOptionsStore.ts` | Peer/target option loading + stale-selection guard | existing options APIs | gateway/graphql options -> validated selections |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/externalMessagingSetupStore.ts` | Checklist + verification aggregation | `mergeReadiness`, `runSetupVerification` | readiness snapshots -> setup blockers/result |

## Provider Scope Rules
- `WHATSAPP` -> `PERSONAL_SESSION`
- `WECHAT` -> `PERSONAL_SESSION`
- `WECOM` -> `BUSINESS_API`

Provider/transport pair is no longer manually selected in setup form.

## Verification Rules
- For `WHATSAPP` and `WECHAT`:
  - `personal_session` step follows personal session readiness.
  - peer discovery enabled when gateway + active session prerequisites are met.
- For `WECOM`:
  - `personal_session` step is automatically `READY` with “not required” detail.
  - peer discovery is disabled; manual peer input is used.

## UX Behavior Changes
- Setup Provider card appears before checklist.
- Personal Session card:
  - shows full controls for personal providers;
  - shows informational “not required” panel for WeCom.
- Binding card:
  - shows provider/transport as read-only derived values;
  - only shows peer discovery toggle/actions when supported;
  - keeps manual peer/target fallback options.

## Error Handling
- Unsupported discovery context:
  - “Peer discovery is only available for personal session transports.”
- Missing gateway/session prerequisites:
  - existing actionable setup messages remain.
- Stale dropdown selections:
  - blocked before mutation via `assertSelectionsFresh`.

## Assumptions And Defaults
- Default scope remains `WHATSAPP`.
- Capabilities determine available scope options:
  - WeChat option visible only when `wechatPersonalEnabled`.
  - WeCom option visible only when `wecomAppEnabled`.
- Hidden `allowTransportFallback` remains forced to `false` in setup UX.
