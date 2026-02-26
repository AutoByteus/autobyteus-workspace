import { ref, watch } from 'vue';
import { useMessagingChannelBindingSetupStore } from '~/stores/messagingChannelBindingSetupStore';
import {
  buildPeerCandidateKey,
  useMessagingChannelBindingOptionsStore,
} from '~/stores/messagingChannelBindingOptionsStore';
import { useMessagingProviderScopeStore } from '~/stores/messagingProviderScopeStore';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';
import { useBindingDraftState } from '~/composables/messaging-binding-flow/draft-state';
import { useBindingFlowPolicyState } from '~/composables/messaging-binding-flow/policy-state';
import { createBindingFlowActions } from '~/composables/messaging-binding-flow/orchestration-actions';

export function useMessagingChannelBindingSetupFlow() {
  const bindingStore = useMessagingChannelBindingSetupStore();
  const optionsStore = useMessagingChannelBindingOptionsStore();
  const providerScopeStore = useMessagingProviderScopeStore();
  const gatewayStore = useGatewaySessionSetupStore();

  const useManualPeerInput = ref(false);
  const useManualTargetInput = ref(false);
  const selectedPeerKey = ref('');
  const selectedTargetId = ref('');

  const {
    draft,
    discordAccountHint,
    telegramAccountHint,
    accountIdModel,
    scopedAccountId,
  } = useBindingDraftState({
    providerScopeStore,
    gatewayStore,
  });

  const {
    filteredTargetOptions,
    supportsPeerDiscovery,
    effectiveManualPeerInput,
    canDiscoverPeers,
    peerDiscoveryProviderLabel,
    showPeerDiscoveryInstruction,
    showTargetOptionsInstruction,
    showDiscordIdentityHint,
    showTelegramAgentOnlyHint,
    allowedTargetTypes,
    scopedBindings,
  } = useBindingFlowPolicyState({
    draft,
    useManualPeerInput,
    useManualTargetInput,
    bindingStore,
    optionsStore,
    providerScopeStore,
    gatewayStore,
    scopedAccountId,
  });

  const {
    formatPeerCandidateLabel,
    onTogglePeerInputMode,
    onToggleTargetInputMode,
    onRefreshPeerCandidates,
    onRefreshTargetOptions,
    onSaveBinding,
    onDeleteBinding,
    onReloadBindings,
  } = createBindingFlowActions({
    draft,
    selectedPeerKey,
    selectedTargetId,
    useManualPeerInput,
    useManualTargetInput,
    supportsPeerDiscovery,
    canDiscoverPeers,
    effectiveManualPeerInput,
    peerDiscoveryProviderLabel,
    filteredTargetOptions,
    discordAccountHint,
    telegramAccountHint,
    bindingStore,
    optionsStore,
    gatewayStore,
    buildPeerCandidateKey,
  });

  watch(
    () => gatewayStore.session?.accountLabel,
    (accountLabel) => {
      if (providerScopeStore.requiresPersonalSession && accountLabel) {
        draft.accountId = accountLabel;
      }
    },
    { immediate: true },
  );

  watch(
    () => providerScopeStore.selectedProvider,
    (provider) => {
      draft.provider = provider;
      draft.transport = providerScopeStore.resolvedTransport;
      optionsStore.resetPeerCandidates();
      selectedPeerKey.value = '';
      draft.peerId = '';
      draft.threadId = null;

      if (provider === 'WHATSAPP' || provider === 'WECHAT') {
        gatewayStore.setSessionProvider(provider);
        useManualPeerInput.value = false;
        if (gatewayStore.session?.accountLabel) {
          draft.accountId = gatewayStore.session.accountLabel;
        }
      } else {
        useManualPeerInput.value = provider !== 'DISCORD' && provider !== 'TELEGRAM';
        if (provider === 'DISCORD' && providerScopeStore.discordAccountId) {
          draft.accountId = providerScopeStore.discordAccountId;
        }
        if (provider === 'TELEGRAM' && providerScopeStore.telegramAccountId) {
          draft.accountId = providerScopeStore.telegramAccountId;
        }
      }

      if (provider === 'TELEGRAM') {
        draft.targetType = 'AGENT';
      }
    },
    { immediate: true },
  );

  watch(
    () => providerScopeStore.discordAccountId,
    (discordAccountId) => {
      if (draft.provider === 'DISCORD' && discordAccountId && !draft.accountId.trim()) {
        draft.accountId = discordAccountId;
      }
    },
    { immediate: true },
  );

  watch(
    () => providerScopeStore.telegramAccountId,
    (telegramAccountId) => {
      if (draft.provider === 'TELEGRAM' && telegramAccountId && !draft.accountId.trim()) {
        draft.accountId = telegramAccountId;
      }
    },
    { immediate: true },
  );

  watch(
    () => selectedPeerKey.value,
    (key) => {
      if (effectiveManualPeerInput.value || !key) {
        return;
      }

      const candidate = optionsStore.peerCandidates.find(
        (entry) => buildPeerCandidateKey(entry) === key,
      );
      if (!candidate) {
        return;
      }

      draft.peerId = candidate.peerId;
      draft.threadId = candidate.threadId;
    },
  );

  watch(
    () => selectedTargetId.value,
    (targetId) => {
      if (useManualTargetInput.value || !targetId) {
        return;
      }

      draft.targetId = targetId;
    },
  );

  watch(
    () => draft.targetType,
    () => {
      if (draft.provider === 'TELEGRAM' && draft.targetType !== 'AGENT') {
        draft.targetType = 'AGENT';
      }
      if (useManualTargetInput.value) {
        return;
      }

      const selectedStillExists = filteredTargetOptions.value.some(
        (option) => option.targetId === selectedTargetId.value,
      );
      if (!selectedStillExists) {
        selectedTargetId.value = '';
        draft.targetId = '';
      }
    },
  );

  return {
    accountIdModel,
    bindingStore,
    buildPeerCandidateKey,
    canDiscoverPeers,
    discordAccountHint,
    draft,
    effectiveManualPeerInput,
    filteredTargetOptions,
    formatPeerCandidateLabel,
    gatewayStore,
    onDeleteBinding,
    onRefreshPeerCandidates,
    onRefreshTargetOptions,
    onReloadBindings,
    onSaveBinding,
    onTogglePeerInputMode,
    onToggleTargetInputMode,
    optionsStore,
    peerDiscoveryProviderLabel,
    scopedBindings,
    selectedPeerKey,
    selectedTargetId,
    showTelegramAgentOnlyHint,
    allowedTargetTypes,
    showDiscordIdentityHint,
    showPeerDiscoveryInstruction,
    showTargetOptionsInstruction,
    supportsPeerDiscovery,
    useManualPeerInput,
    useManualTargetInput,
  };
}
