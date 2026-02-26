import { computed, reactive } from 'vue';
import type { useMessagingProviderScopeStore } from '~/stores/messagingProviderScopeStore';
import type { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';
import type { ExternalChannelBindingDraft } from '~/types/messaging';

export function normalizeAccountId(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function useBindingDraftState(input: {
  providerScopeStore: ReturnType<typeof useMessagingProviderScopeStore>;
  gatewayStore: ReturnType<typeof useGatewaySessionSetupStore>;
}) {
  const { providerScopeStore, gatewayStore } = input;

  const draft = reactive<ExternalChannelBindingDraft>({
    provider: providerScopeStore.selectedProvider,
    transport: providerScopeStore.resolvedTransport,
    accountId:
      providerScopeStore.selectedProvider === 'DISCORD'
        ? providerScopeStore.discordAccountId || ''
        : providerScopeStore.selectedProvider === 'TELEGRAM'
          ? providerScopeStore.telegramAccountId || ''
        : '',
    peerId: '',
    threadId: null,
    targetType: 'AGENT',
    targetId: '',
  });

  const discordAccountHint = computed(() => providerScopeStore.discordAccountId || '');
  const telegramAccountHint = computed(() => providerScopeStore.telegramAccountId || '');

  const accountIdModel = computed({
    get: () => {
      if (draft.provider === 'DISCORD' && !draft.accountId.trim()) {
        return discordAccountHint.value;
      }
      if (draft.provider === 'TELEGRAM' && !draft.accountId.trim()) {
        return telegramAccountHint.value;
      }
      return draft.accountId;
    },
    set: (value: string) => {
      draft.accountId = value;
    },
  });

  const scopedAccountId = computed(() => {
    if (draft.provider === 'DISCORD') {
      return normalizeAccountId(draft.accountId) || normalizeAccountId(discordAccountHint.value);
    }
    if (draft.provider === 'TELEGRAM') {
      return normalizeAccountId(draft.accountId) || normalizeAccountId(telegramAccountHint.value);
    }
    if (providerScopeStore.requiresPersonalSession) {
      return (
        normalizeAccountId(gatewayStore.session?.accountLabel) || normalizeAccountId(draft.accountId)
      );
    }
    return normalizeAccountId(draft.accountId);
  });

  return {
    draft,
    discordAccountHint,
    telegramAccountHint,
    accountIdModel,
    scopedAccountId,
  };
}
