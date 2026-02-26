# Simulated Runtime Call Stacks (autobyteus-web: Unbound Peer Discovery UX, Rev 4)

## Simulation Basis
- Scope Classification: `Medium`
- Source Artifact:
  - `/Users/normy/autobyteus_org/autobyteus-web/tickets/unbound_peer_discovery_ticket/EXTERNAL_MESSAGING_UNBOUND_DISCOVERY_DESIGN.md`

## Verification Outcome Summary
- Use Case 1: Pass (config edit invalidates readiness)
- Use Case 2: Pass (peer refresh eligibility gate uses gateway+session readiness)
- Use Case 3: Pass (empty candidate state remains actionable)
- Use Case 4: Pass
- Use Case 5: Pass
- Use Case 6: Partial (file boundary cleanliness smell remains)
- Use Case 7: Pass (gateway client construction unified via shared factory)
- Use Case 8: Pass (binding capability self-heal on save/delete)
- Use Case 9: Pass (gateway config persistence across reload)
- Use Case 10: Pass (transport-fallback choice removed from setup UI; deterministic default used)

---

## Use Case 1: Config Edit Invalidates Readiness

### Runtime Call Stack
```text
[ENTRY] GatewayConnectionCard.vue:baseUrl/adminToken computed setters
└── gatewaySessionSetupStore.ts:setGatewayConfig(...)
    ├── updates baseUrl/adminToken [STATE]
    ├── config changed -> gatewayStatus='UNKNOWN' [STATE]
    ├── clears gatewayError/gatewayHealth [STATE]
    └── persists config to localStorage key external_messaging_gateway_config_v1 [STATE]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Partial
- Boundaries/API ownership are clear: Partial
- Dependency flow is reasonable: Yes
- Major smell detected: No (functional); Yes (structural split still pending)

---

## Use Case 2: Refresh Peers Before Binding

### Runtime Call Stack
```text
[ENTRY] ChannelBindingSetupCard.vue:onRefreshPeerCandidates()
└── canDiscoverPeers = provider + transport + sessionActive + gatewayReady
    ├── ineligible -> actionable message [STATE]
    └── eligible -> optionsStore.loadPeerCandidates(...) [ASYNC]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Partial
- Boundaries/API ownership are clear: Partial
- Dependency flow is reasonable: Yes
- Major smell detected: No (functional); Yes (component size)

---

## Use Case 3: Empty Candidate State Is Actionable

### Runtime Call Stack
```text
[ENTRY] externalChannelBindingOptionsStore.ts:loadPeerCandidates(...) [ASYNC]
└── response.items=[] [STATE]
    └── PeerSelectionPanel.vue shows guidance text [STATE]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 4: Save Binding For Discovered Peer

### Runtime Call Stack
```text
[ENTRY] useChannelBindingFormController.ts:onSaveBinding()
├── optionsStore.assertSelectionsFresh(...) [STATE]
└── bindingStore.upsertBinding(draft) [ASYNC]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 5: Stale Selection Guard

### Runtime Call Stack
```text
[ENTRY] onSaveBinding()
└── assertSelectionsFresh(...) throws stale-selection error
    └── mutation aborted
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 6: File Boundary Cleanliness

### Current Runtime (Observed)
```text
[ENTRY] ChannelBindingSetupCard.vue (504 LOC)
└── renders UI + maintains draft + watchers + eligibility policy + command handlers

[ENTRY] gatewaySessionSetupStore.ts (501 LOC)
└── config + readiness + session lifecycle + qr + polling scheduler all in one store
```

### Target Runtime (Post-Design Update)
```text
[ENTRY] ChannelBindingSetupCard.vue
└── delegates behavior to useChannelBindingFormController + child panels

[ENTRY] gatewayConnectionStore.ts + personalSessionStore.ts + session sync controller
└── concerns split by bounded responsibility
```

### Verification Checklist
- End-to-end path achieves expected outcome: Partial (current), Yes (target)
- Separation of concerns looks clean: No (current), Yes (target)
- Boundaries/API ownership are clear: Partial (current), Yes (target)
- Dependency flow is reasonable: Yes
- Major smell detected: Yes

---

## Use Case 7: Gateway Client Construction Consistency

### Runtime Call Stack
```text
[ENTRY] gatewaySessionSetupStore.ts:createClient()
└── services/gatewayClientFactory.ts:createGatewayClient(...)
    └── createExternalMessagingGatewayClient({ baseUrl, adminToken })

[ENTRY] gatewayCapabilityStore.ts:createClient()
└── services/gatewayClientFactory.ts:createGatewayClient(...)
    └── createExternalMessagingGatewayClient({ baseUrl, adminToken })
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes (at this boundary)
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 8: Binding Capability Self-Heal Before Save/Delete

### Runtime Call Stack
```text
[ENTRY] ChannelBindingSetupCard.vue:onSaveBinding()
└── externalChannelBindingSetupStore.ts:upsertBinding(draft)
    ├── if bindingCrudEnabled=false -> loadCapabilities() [ASYNC]
    ├── capability enabled -> continue mutation path [ASYNC]
    └── capability still disabled -> throw with server reason [ERROR]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 9: Gateway Config Rehydration On Next Launch

### Runtime Call Stack
```text
[ENTRY] ExternalMessagingManager.vue:onMounted()
└── gatewaySessionSetupStore.ts:initializeFromConfig()
    ├── readPersistedGatewayConfig() from localStorage [STATE]
    ├── prefer persisted baseUrl/adminToken when present [STATE]
    └── fallback to runtime config when persisted values absent [STATE]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 10: Beginner-Friendly Binding Save (No Fallback Toggle)

### Runtime Call Stack
```text
[ENTRY] ChannelBindingSetupCard.vue:render
└── no user-facing allowTransportFallback checkbox rendered [STATE]

[ENTRY] ChannelBindingSetupCard.vue:onSaveBinding()
└── bindingStore.upsertBinding({
      ...draft,
      allowTransportFallback: false
   }) [ASYNC]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No
