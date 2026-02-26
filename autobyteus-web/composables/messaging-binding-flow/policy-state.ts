import { computed, type Ref } from 'vue';
import type { useMessagingChannelBindingSetupStore } from '~/stores/messagingChannelBindingSetupStore';
import type { useMessagingChannelBindingOptionsStore } from '~/stores/messagingChannelBindingOptionsStore';
import type { useMessagingProviderScopeStore } from '~/stores/messagingProviderScopeStore';
import type { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';
import type {
  ExternalChannelBindingDraft,
  ExternalChannelBindingTargetOption,
  ExternalChannelBindingTargetType,
} from '~/types/messaging';

export function useBindingFlowPolicyState(input: {
  draft: ExternalChannelBindingDraft;
  useManualPeerInput: Ref<boolean>;
  useManualTargetInput: Ref<boolean>;
  bindingStore: ReturnType<typeof useMessagingChannelBindingSetupStore>;
  optionsStore: ReturnType<typeof useMessagingChannelBindingOptionsStore>;
  providerScopeStore: ReturnType<typeof useMessagingProviderScopeStore>;
  gatewayStore: ReturnType<typeof useGatewaySessionSetupStore>;
  scopedAccountId: Ref<string | null>;
}) {
  const {
    draft,
    useManualPeerInput,
    useManualTargetInput,
    bindingStore,
    optionsStore,
    providerScopeStore,
    gatewayStore,
    scopedAccountId,
  } = input;

  const filteredTargetOptions = computed<ExternalChannelBindingTargetOption[]>(() =>
    optionsStore.targetOptionsByType(draft.targetType),
  );

  const supportsPeerDiscovery = computed(() => {
    if (
      (draft.provider === 'DISCORD' || draft.provider === 'TELEGRAM') &&
      draft.transport === 'BUSINESS_API'
    ) {
      return true;
    }
    return (
      providerScopeStore.requiresPersonalSession &&
      draft.transport === 'PERSONAL_SESSION' &&
      (draft.provider === 'WHATSAPP' || draft.provider === 'WECHAT')
    );
  });

  const effectiveManualPeerInput = computed(
    () => !supportsPeerDiscovery.value || useManualPeerInput.value,
  );

  const canDiscoverPeers = computed(() => {
    if (!supportsPeerDiscovery.value || !gatewayStore.gatewayReady) {
      return false;
    }
    if (draft.provider === 'DISCORD' || draft.provider === 'TELEGRAM') {
      return true;
    }
    return (
      gatewayStore.personalSessionReady &&
      Boolean(gatewayStore.session?.sessionId) &&
      gatewayStore.sessionProvider === draft.provider
    );
  });

  const peerDiscoveryProviderLabel = computed(() => {
    if (draft.provider === 'WECHAT') {
      return 'WeChat';
    }
    if (draft.provider === 'DISCORD') {
      return 'Discord';
    }
    if (draft.provider === 'TELEGRAM') {
      return 'Telegram';
    }
    return 'WhatsApp';
  });

  const showPeerDiscoveryInstruction = computed(
    () =>
      !effectiveManualPeerInput.value &&
      canDiscoverPeers.value &&
      !optionsStore.isPeerCandidatesLoading &&
      optionsStore.peerCandidates.length === 0,
  );

  const showTargetOptionsInstruction = computed(
    () =>
      !useManualTargetInput.value &&
      !optionsStore.isTargetOptionsLoading &&
      filteredTargetOptions.value.length === 0,
  );

  const showDiscordIdentityHint = computed(() => draft.provider === 'DISCORD');
  const showTelegramAgentOnlyHint = computed(() => draft.provider === 'TELEGRAM');
  const allowedTargetTypes = computed<ExternalChannelBindingTargetType[]>(() =>
    draft.provider === 'TELEGRAM' ? ['AGENT'] : ['AGENT', 'TEAM'],
  );

  const scopedBindings = computed(() =>
    bindingStore.bindingsForScope({
      provider: draft.provider,
      transport: draft.transport,
      accountId: scopedAccountId.value,
    }),
  );

  return {
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
  };
}
