# Future-State Runtime Call Stack

## Scope

This runtime model covers the renamed messaging / external-channel binding control-plane after `targetId -> targetRunId`.

It does not change the underlying dispatch/storage runtime behavior based on `agentRunId` / `teamRunId`.

## Use Case 1: Load Existing Bindings

### Entry

- User opens Messaging settings and the binding flow loads current bindings.

### Call Stack

1. `MessagingSetupManager.vue`
2. `useMessagingSetupBootstrap`
3. `useMessagingChannelBindingSetupStore.loadBindingsIfEnabled()`
4. Apollo client executes `EXTERNAL_CHANNEL_BINDINGS`
5. GraphQL query `externalChannelBindings`
6. `ExternalChannelSetupResolver.externalChannelBindings()`
7. `ChannelBindingService.listBindings()`
8. binding provider returns domain `ChannelBinding[]`
9. `toGraphqlBinding(binding)` maps:
   - `targetType`
   - `targetRunId = agentRunId | teamRunId`
10. Apollo result hydrates `ExternalChannelBindingModel.targetRunId`
11. web store sorts and stores bindings
12. `ChannelBindingSetupCard.vue` renders bound runtime targets using `binding.targetRunId`

### Key Naming Invariant

- GraphQL/web contract uses `targetRunId`
- server domain still stores explicit `agentRunId` / `teamRunId`

## Use Case 2: Load Active Runtime Target Options

### Entry

- User opens or refreshes the target dropdown while creating/editing a binding.

### Call Stack

1. `ChannelBindingSetupCard.vue`
2. `useMessagingChannelBindingSetupFlow`
3. `useMessagingChannelBindingOptionsStore.loadTargetOptions()`
4. Apollo client executes `EXTERNAL_CHANNEL_BINDING_TARGET_OPTIONS`
5. GraphQL query `externalChannelBindingTargetOptions`
6. `ExternalChannelSetupResolver.externalChannelBindingTargetOptions()`
7. `ChannelBindingTargetOptionsService.listActiveTargetOptions()`
8. service collects:
   - agent active runs -> option `{ targetType: "AGENT", targetRunId: agentRunId }`
   - team active runs -> option `{ targetType: "TEAM", targetRunId: teamRunId }`
9. `toGraphqlTargetOption(option)` returns `targetRunId`
10. Apollo result hydrates `ExternalChannelBindingTargetOption.targetRunId`
11. web flow stores dropdown selection as `selectedTargetRunId`
12. `draft.targetRunId` is synchronized from the selected option

### Key Naming Invariant

- every runtime option value is named `targetRunId`
- no generic `targetId` remains in the control-plane path

## Use Case 3: Upsert Binding

### Entry

- User clicks `Save Binding`.

### Call Stack

1. `ChannelBindingSetupCard.vue`
2. `useMessagingChannelBindingSetupFlow.onSaveBinding()`
3. `useMessagingChannelBindingOptionsStore.assertSelectionsFresh()`
4. `useMessagingChannelBindingSetupStore.validateDraft()`
5. validation checks `draft.targetRunId`
6. Apollo client executes `UPSERT_EXTERNAL_CHANNEL_BINDING`
7. mutation input sends:
   - `targetType`
   - `targetRunId`
8. `ExternalChannelSetupResolver.upsertExternalChannelBinding(input)`
9. resolver validates `targetRunId`
10. `ChannelBindingTargetOptionsService.isActiveTarget(targetType, targetRunId)`
11. resolver maps:
   - `AGENT -> agentRunId = targetRunId`
   - `TEAM -> teamRunId = targetRunId`
12. `ChannelBindingService.upsertBinding(...)`
13. provider persists explicit `agentRunId` / `teamRunId`
14. response maps back through `toGraphqlBinding(...)` with `targetRunId`
15. web store applies upsert result and UI renders updated binding row

### Key Naming Invariant

- generic control-plane input/output uses `targetRunId`
- persistence/runtime dispatch remains `agentRunId` / `teamRunId`

## Use Case 4: Verification Checks Target Runtime Activity

### Entry

- User runs setup verification after configuring bindings.

### Call Stack

1. `useMessagingVerificationStore.runSetupVerification()`
2. binding readiness reads `ExternalChannelBindingModel.targetRunId`
3. verification refreshes `targetOptions`
4. `resolveInactiveBinding(...)` compares:
   - `binding.targetType`
   - `binding.targetRunId`
   - `option.targetRunId`
5. if inactive:
   - blocker message names the missing `targetRunId`
   - blocker action payload uses `targetRunId`
6. verification result is stored and rendered in `SetupVerificationCard.vue`

### Key Naming Invariant

- verification messages and action payloads refer to runtime IDs explicitly

## Invariant Summary

After the rename:

- GraphQL/web binding boundary: `targetType` + `targetRunId`
- server runtime/storage internals: `agentRunId` / `teamRunId`
- definition identities remain separate and unchanged
