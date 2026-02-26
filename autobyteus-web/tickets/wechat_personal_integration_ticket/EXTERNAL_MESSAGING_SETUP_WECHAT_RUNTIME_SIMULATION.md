# Simulated Runtime Call Stacks (autobyteus-web)

## Simulation Basis
- Scope Classification: `Medium`
- Source Artifact:
  - `/Users/normy/autobyteus_org/autobyteus-web/tickets/wechat_personal_integration_ticket/EXTERNAL_MESSAGING_SETUP_WECHAT_DESIGN.md`

## Use Case Index
- Use Case 1: Load gateway capabilities + WeCom account inventory.
- Use Case 2: Load server compatibility and compute route compatibility.
- Use Case 3: Select mode and render setup cards.
- Use Case 4: Start direct WeChat personal session and show QR.
- Use Case 5: Refresh peer candidates and save binding.
- Use Case 6: Run combined setup verification.

---

## Use Case 1: Load Gateway Capabilities + Accounts

### Primary Runtime Call Stack
```text
[ENTRY] ExternalMessagingManager.vue:onMounted()
├── gatewayCapabilityStore.ts:loadCapabilities() [ASYNC]
│   └── externalMessagingGatewayClient.ts:getGatewayCapabilities() [IO]
└── gatewayCapabilityStore.ts:loadWeComAccounts() [ASYNC]
    └── externalMessagingGatewayClient.ts:listWeComAccounts() [IO]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 2: Load Server Compatibility And Compute Verdict

### Primary Runtime Call Stack
```text
[ENTRY] ExternalMessagingManager.vue:onMounted()
└── serverChannelCompatibilityStore.ts:loadServerCompatibility() [ASYNC]
    └── GraphQL EXTERNAL_CHANNEL_CAPABILITIES query [IO]

[ENTRY] wechatSetupModeStore.ts:resolveDefaultMode() [STATE]
└── computes route compatibility from gatewayCapabilityStore + serverChannelCompatibilityStore [STATE]
```

### Branching / Error Paths
```text
[FALLBACK] gateway supports direct mode, server does not accept WECHAT:PERSONAL_SESSION
resolveDefaultMode() => fallback to WECOM_APP_BRIDGE
└── set compatibility warning message [STATE]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 3: Select Mode And Render Setup Cards

### Primary Runtime Call Stack
```text
[ENTRY] ChannelModeSelectorCard.vue:onModeChanged(mode)
└── wechatSetupModeStore.ts:setMode(mode) [STATE]
    └── ExternalMessagingManager.vue:conditional render by selected mode [STATE]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 4: Start Direct Session And Show QR

### Primary Runtime Call Stack
```text
[ENTRY] WeChatPersonalSessionSetupCard.vue:onStartSession(accountLabel)
└── gatewaySessionSetupStore.ts:startWeChatPersonalSession(accountLabel) [ASYNC]
    ├── externalMessagingGatewayClient.ts:startWeChatPersonalSession(accountLabel) [IO]
    ├── gatewaySessionSetupStore.ts:fetchWeChatPersonalQr(sessionId) [ASYNC]
    │   └── externalMessagingGatewayClient.ts:getWeChatPersonalQr(sessionId) [IO]
    └── card renders QR panel from store state [STATE]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 5: Refresh Peer Candidates And Save Binding

### Primary Runtime Call Stack
```text
[ENTRY] ChannelBindingSetupCard.vue:onRefreshPeerCandidates()
└── gatewaySessionSetupStore.ts:fetchWeChatPeerCandidates(sessionId, query) [ASYNC]
    └── externalMessagingGatewayClient.ts:getWeChatPersonalPeerCandidates(sessionId, query) [IO]

[ENTRY] ChannelBindingSetupCard.vue:onSaveBinding()
└── externalChannelBindingSetupStore.ts:upsertBinding(draft) [ASYNC]
    ├── validateDraft(provider='WECHAT', transport='PERSONAL_SESSION') [STATE]
    ├── GraphQL UPSERT_EXTERNAL_CHANNEL_BINDING [IO]
    └── applyUpsertResult(binding) [STATE]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 6: Run Combined Setup Verification

### Primary Runtime Call Stack
```text
[ENTRY] SetupVerificationCard.vue:onRunVerification()
└── externalMessagingSetupStore.ts:runSetupVerification() [ASYNC]
    ├── gatewayCapabilityStore.ts:getReadinessSnapshot() [STATE]
    ├── serverChannelCompatibilityStore.ts:getReadinessSnapshot() [STATE]
    ├── gatewaySessionSetupStore.ts:getReadinessSnapshot() [STATE]
    ├── externalChannelBindingSetupStore.ts:getReadinessSnapshot() [STATE]
    └── update checklist/verdict [STATE]
```

### Verification Checklist
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No
