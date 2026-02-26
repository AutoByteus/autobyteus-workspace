# Simulated Runtime Call Stacks (Provider-Scoped External Messaging Setup)

## Simulation Basis
- `/Users/normy/autobyteus_org/autobyteus-web/tickets/external_messaging_binding_ux_ticket/EXTERNAL_MESSAGING_BINDING_UX_DESIGN.md`

## Conventions
- Frame format: `path/to/file.ts:functionName(...)`
- Tags: `[ENTRY] [ASYNC] [STATE] [IO] [FALLBACK] [ERROR]`

## Use Case 1: Bootstrap Provider-Scoped Setup State

```text
[ENTRY] components/settings/ExternalMessagingManager.vue:onMounted()
└── ExternalMessagingManager.vue:bootstrapSetupState() [ASYNC]
    ├── stores/gatewaySessionSetupStore.ts:initializeFromConfig() [STATE]
    ├── stores/gatewayCapabilityStore.ts:loadCapabilities() [ASYNC][IO]
    ├── stores/externalMessagingProviderScopeStore.ts:initialize(capabilities) [STATE]
    ├── stores/externalChannelBindingSetupStore.ts:loadCapabilities() [ASYNC][IO]
    ├── stores/externalChannelBindingSetupStore.ts:loadBindingsIfEnabled() [ASYNC][IO]
    └── stores/externalChannelBindingOptionsStore.ts:loadTargetOptions() [ASYNC][IO]
```

Verification:
- Scope initialization has dedicated boundary: Pass
- Bootstrap stays orchestration-only: Pass

## Use Case 2: Select Provider Scope

```text
[ENTRY] components/settings/externalMessaging/ProviderSetupScopeCard.vue:click(provider)
└── stores/externalMessagingProviderScopeStore.ts:setSelectedProvider(provider) [STATE]
    └── ExternalMessagingManager.vue:watch(selectedProvider) [STATE]
        └── stores/gatewaySessionSetupStore.ts:setSessionProvider(provider) [STATE] (personal providers only)
```

Verification:
- Provider identity is explicit and centralized: Pass
- No binding CRUD side effects at this stage: Pass

## Use Case 3: Personal Session Card In WeCom Scope

```text
[ENTRY] PersonalSessionSetupCard.vue:render()
└── stores/externalMessagingProviderScopeStore.ts:requiresPersonalSession [STATE]
    ├── false -> show "not required" panel [STATE]
    └── no session API call [FALLBACK]
```

Verification:
- WeCom no longer blocked by personal-session requirement: Pass
- UI concern isolated from gateway APIs: Pass

## Use Case 4: Peer Discovery For WhatsApp/WeChat Scope

```text
[ENTRY] ChannelBindingSetupCard.vue:onRefreshPeerCandidates()
└── supportsPeerDiscovery gate [STATE]
    ├── false -> peer-discovery unavailable message [FALLBACK]
    └── true
        ├── canDiscoverPeers gate (gateway/session/provider alignment) [STATE]
        └── stores/externalChannelBindingOptionsStore.ts:loadPeerCandidates(sessionId, opts, provider) [ASYNC]
            └── services/externalMessagingGatewayClient.ts:get*PeerCandidates(...) [IO]
```

Verification:
- Provider/session mismatch guard explicit: Pass
- Discovery concern stays in options store + gateway client boundary: Pass

## Use Case 5: Save Binding With Derived Provider/Transport

```text
[ENTRY] ChannelBindingSetupCard.vue:onSaveBinding()
└── draft uses scope-derived provider/transport [STATE]
    ├── stores/externalChannelBindingOptionsStore.ts:assertSelectionsFresh(...) [STATE]
    └── stores/externalChannelBindingSetupStore.ts:upsertBinding(draft) [ASYNC][IO]
```

Verification:
- Invalid provider/transport combinations removed from primary UX path: Pass
- CRUD responsibility remains isolated: Pass

## Use Case 6: Setup Verification In WeCom Scope

```text
[ENTRY] SetupVerificationCard.vue:onRunVerification()
└── stores/externalMessagingSetupStore.ts:runSetupVerification() [ASYNC]
    └── mergeReadiness(gatewaySnapshot, bindingSnapshot) [STATE]
        ├── reads providerScopeStore.requiresPersonalSession [STATE]
        ├── personal_session blocker skipped for WeCom [FALLBACK]
        └── returns verification result
```

Verification:
- Verification reflects provider-specific prerequisite model: Pass
- No cross-layer leak into components: Pass

## Design Smell Review
- Mixed provider/transport input in one form: Removed from primary flow.
- Session requirement incorrectly globalized across providers: Corrected.
- Component doing direct network logic: Not observed.
- CRUD store overloaded with options logic: Not observed.
