# Design Document

## Summary
`autobyteus-web` will provide a **setup-only** external messaging control surface. It will help operators connect gateway, onboard WhatsApp personal session, configure routing bindings, and run a minimal verification check.

It will **not** become a full monitoring dashboard and will **not** act as a transport path for WhatsApp/WeCom messages.

Scope classification: `Medium`.

## Goals
- Add an `External Messaging` setup section under Settings.
- Let user configure and validate gateway connection.
- Let user onboard WhatsApp personal session using QR flow.
- Let user create/update/delete channel routing bindings.
- Let user run a minimal setup verification step.
- Preserve strict separation of concerns (UI composition vs stores vs transport clients).

## Non-Goals
- No full delivery/event monitoring console.
- No analytics/alerting/reporting views.
- No direct provider message transport from web.
- No replacement of `agentRunStore` send flow.
- No conversation-persistence coupling.

## Requirements And Use Cases
- Use Case 1: Open Settings -> External Messaging and see setup checklist + current step statuses.
- Use Case 2: Configure gateway URL/token and validate connectivity.
- Use Case 3: Start WhatsApp personal session, fetch QR, observe `ACTIVE` status.
- Use Case 4: Configure channel binding `(provider, transport, accountId, peerId, threadId) -> target`.
- Use Case 5: Run setup verification and confirm setup ready.

## Architecture Overview
Three layers:

1. Setup Composition Layer
- Renders setup cards/checklist and orchestrates UI step flow.

2. Setup State Layer (Pinia)
- Owns setup step state, loading/error, and mutation orchestration.

3. Transport Layer
- Gateway REST client for health + personal session setup.
- Server GraphQL admin APIs for binding setup.

## Locked Decisions (This Iteration)
- Gateway setup calls are **direct from web to message gateway** in phase 1 using runtime config (`messageGatewayBaseUrl`, optional admin token). Proxy via `autobyteus-server-ts` is deferred.
- `runSetupVerification()` is **client-side aggregated verification** in phase 1 (reads child store readiness snapshots); no new server verification endpoint in this phase.
- Channel binding setup uses **exact matching only** (`provider + transport + accountId + peerId + threadId`). Wildcard routing is deferred.
- Server GraphQL binding capability is treated as a **rollout gate** for binding setup, not as an unresolved design question.

## Required Upstream API Contracts

| Upstream System | Contract | Purpose In Web Setup | Failure Handling |
| --- | --- | --- | --- |
| Message Gateway | `GET /health` | Gateway connectivity validation | Show gateway step `BLOCKED` with retry |
| Message Gateway | `POST /providers/whatsapp/personal/sessions` | Start personal WhatsApp session | Show personal session step `BLOCKED` with reason on `403` |
| Message Gateway | `GET /providers/whatsapp/personal/sessions/:id/qr` | Fetch onboarding QR | Show QR expired state on `410` with refresh action |
| Message Gateway | `GET /providers/whatsapp/personal/sessions/:id` | Read personal session status | Clear stale session on `404` |
| Message Gateway | `DELETE /providers/whatsapp/personal/sessions/:id` | Stop linked personal session | Keep local state consistent after stop |
| autobyteus-server-ts GraphQL | `externalChannelCapabilities` query | Detect if binding APIs are exposed | Set capability blocker and actionable guidance |
| autobyteus-server-ts GraphQL | `externalChannelBindings` query | Load existing bindings | Show binding step error with retry |
| autobyteus-server-ts GraphQL | `upsertExternalChannelBinding` mutation | Create/update routing binding | Inline field errors for validation failures |
| autobyteus-server-ts GraphQL | `deleteExternalChannelBinding` mutation | Remove binding | Keep list state consistent and reversible |

## File And Module Breakdown

| File/Module | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web/pages/settings.vue` | Register `external-messaging` settings section | `activeSection` route state | Input: nav selection. Output: mounts setup manager | existing settings shell |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/ExternalMessagingManager.vue` | Setup section composition | local props/emits only | Input: step states. Output: setup card render | setup stores |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/SetupChecklistCard.vue` | Step progress UI only | none | Input: `SetupStepState[]`. Output: checklist render | `externalMessagingSetupStore` |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/GatewayConnectionCard.vue` | Gateway URL/token setup form | `@validate-connection` | Input: form fields. Output: validate action | `gatewaySessionSetupStore` |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/PersonalSessionSetupCard.vue` | WhatsApp personal QR onboarding UI | `@start-session`, `@refresh-qr`, `@stop-session` | Input: session state/qr. Output: session actions | `gatewaySessionSetupStore` |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/ChannelBindingSetupCard.vue` | Binding setup CRUD UI | `@save-binding`, `@delete-binding` | Input: binding models. Output: binding actions | `externalChannelBindingSetupStore` |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/SetupVerificationCard.vue` | Minimal verification UI | `@run-verification` | Input: verification result. Output: run check action | `externalMessagingSetupStore` |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/gatewaySessionSetupStore.ts` | Gateway health + personal session setup state | `validateGatewayConnection()`, `startPersonalSession()`, `fetchPersonalSessionQr()`, `fetchPersonalSessionStatus()`, `stopPersonalSession()` | Input: operator actions. Output: session and connection state | gateway REST client |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/externalChannelBindingSetupStore.ts` | Binding setup state and CRUD orchestration | `loadCapabilities()`, `loadBindingsIfEnabled()`, `upsertBinding()`, `deleteBinding()`, `getCapabilitySnapshot()`, `getReadinessSnapshot()` | Input: binding draft actions. Output: normalized binding + capability state | GraphQL docs + Apollo client |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/externalMessagingSetupStore.ts` | Setup step orchestration + verification state | `stepStates` (derived getter), `runSetupVerification()` | Input: child store states. Output: overall setup readiness state | gateway/binding stores |
| `/Users/normy/autobyteus_org/autobyteus-web/services/externalMessagingGatewayClient.ts` | Gateway REST boundary | `getHealth()`, `startWhatsAppPersonalSession()`, `getWhatsAppPersonalQr()`, `getWhatsAppPersonalStatus()`, `stopWhatsAppPersonalSession()` | Input: DTOs. Output: typed responses/errors | axios + runtime config |
| `/Users/normy/autobyteus_org/autobyteus-web/graphql/queries/external_channel_setup_queries.ts` | Binding read operations for setup | gql query exports | Input: variables. Output: operation docs | graphql-tag |
| `/Users/normy/autobyteus_org/autobyteus-web/graphql/mutations/external_channel_setup_mutations.ts` | Binding write operations for setup | gql mutation exports | Input: variables. Output: operation docs | graphql-tag |
| `/Users/normy/autobyteus_org/autobyteus-web/types/externalMessaging.ts` | Setup-domain type contracts | enums/interfaces | Input: gql/rest payloads. Output: normalized web models | none |
| `/Users/normy/autobyteus_org/autobyteus-web/nuxt.config.ts` | Runtime config for gateway setup endpoint/token | `runtimeConfig.public.messageGateway*` | Input: env. Output: client config | Nuxt runtime config |
| `/Users/normy/autobyteus_org/autobyteus-web/.env.local.example` | Setup env documentation | env examples | Input: developer setup. Output: valid local config | none |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `ExternalMessagingManager.vue` | setup stores | setup cards | Low | manager composes only; no transport logic |
| setup card components | setup stores | none | Low | cards emit actions; no direct IO |
| `externalMessagingSetupStore.ts` | gateway/binding setup stores | manager/checklist/verification card | Medium | keep it read-orchestrator only; no direct REST/GraphQL calls; child stores must not import it |
| `gatewaySessionSetupStore.ts` | `externalMessagingGatewayClient.ts` | manager + checklist + personal session card | Low | single REST boundary client |
| `externalChannelBindingSetupStore.ts` | GraphQL docs + Apollo | manager + checklist + binding card | Medium | no coupling to gateway session code |
| `externalMessagingGatewayClient.ts` | axios + runtime config | gateway session store | Low | no Pinia imports; pure transport module |
| GraphQL setup docs | schema availability in server | binding setup store | Medium | capability flag for unavailable schema fields |

## Data Models (If Needed)

```ts
export type ExternalChannelBindingTargetType = 'AGENT' | 'TEAM';

export interface ExternalChannelBindingModel {
  id: string;
  provider: 'WHATSAPP' | 'WECOM';
  transport: 'BUSINESS_API' | 'PERSONAL_SESSION';
  accountId: string;
  peerId: string;
  threadId: string | null;
  targetType: ExternalChannelBindingTargetType;
  targetId: string;
  allowTransportFallback: boolean;
  updatedAt: string;
}

export interface GatewayPersonalSessionModel {
  sessionId: string;
  accountLabel: string;
  status: 'PENDING_QR' | 'ACTIVE' | 'DEGRADED' | 'STOPPED';
  qr?: { code: string; expiresAt: string };
}

export interface ExternalChannelCapabilityModel {
  bindingCrudEnabled: boolean;
  reason?: string;
}

export interface SetupStepState {
  key: 'gateway' | 'personal_session' | 'binding' | 'verification';
  status: 'PENDING' | 'READY' | 'BLOCKED' | 'DONE';
  detail?: string;
}
```

## Error Handling And Edge Cases
- Gateway unreachable: mark `gateway` step `BLOCKED` with retry action.
- Gateway feature disabled (`403`): mark personal session step blocked with reason.
- QR expired (`410`): keep session and allow refresh QR action.
- Session not found (`404`): clear stale session id and return to start state.
- Binding capability disabled (`externalChannelCapabilities.bindingCrudEnabled=false`): mark binding step blocked with capability message.
- Capability/schema stale mismatch (capability says enabled but binding mutation/query missing): mark binding step blocked with rollout-gate error.
- Setup verification failure: show minimal error detail and corrective step hint.

## Performance / Security Considerations
- Keep setup stores lazy-loaded by section mount.
- Avoid polling-heavy behavior; user-triggered refresh is default.
- Never store provider secrets in local persistent storage.
- Support optional admin token header for gateway setup endpoints.
- Redact raw payloads from error surfaces.

## Migration / Rollout (If Needed)
1. Add settings section + setup manager + checklist card.
2. Implement gateway connection and personal session setup path (unblocked).
3. Add binding setup path when server admin GraphQL APIs are available.
4. Add setup verification card and minimal readiness summary.
5. Add targeted tests for stores and setup cards.
6. Rollout gate: enable web binding setup only when server GraphQL binding capability returns enabled.

## Design Feedback Loop Notes (From Implementation)

| Date | Trigger (File/Test/Blocker) | Design Smell | Design Update Applied | Status |
| --- | --- | --- | --- | --- |
| 2026-02-08 | Scope alignment request | Previous design drifted into monitoring-heavy scope | Reduced to setup-only flow and checklist-based UX | Updated |
| 2026-02-08 | Runtime stack inspection | Child stores invoking parent setup store introduced upward coupling risk | Replaced `computeStepStates()` imperative API with derived `stepStates` and one-way dependency rule | Updated |
| 2026-02-08 | Gap-closure iteration | Remaining open decisions (gateway path, verification source, wildcard support) caused implementation ambiguity | Locked phase-1 decisions and added explicit upstream contract table + rollout gate | Updated |

## Open Questions
- None for phase 1.
- Deferred to future iteration: gateway proxy mode and wildcard routing support.
