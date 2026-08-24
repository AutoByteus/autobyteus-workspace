import type { Ref } from 'vue';
import type { useMessagingChannelBindingSetupStore } from '~/stores/messagingChannelBindingSetupStore';
import type {
  buildPeerCandidateKey as buildPeerCandidateKeyType,
  useMessagingChannelBindingOptionsStore,
} from '~/stores/messagingChannelBindingOptionsStore';
import type { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';
import type {
  ExternalChannelBindingDraft,
  GatewayPeerCandidate,
} from '~/types/messaging';

export function createBindingFlowActions(input: {
  draft: ExternalChannelBindingDraft;
  selectedPeerKey: Ref<string>;
  useManualPeerInput: Ref<boolean>;
  supportsPeerDiscovery: Ref<boolean>;
  canDiscoverPeers: Ref<boolean>;
  effectiveManualPeerInput: Ref<boolean>;
  peerDiscoveryProviderLabel: Ref<string>;
  discordAccountHint: Ref<string>;
  telegramAccountHint: Ref<string>;
  bindingStore: ReturnType<typeof useMessagingChannelBindingSetupStore>;
  optionsStore: ReturnType<typeof useMessagingChannelBindingOptionsStore>;
  gatewayStore: ReturnType<typeof useGatewaySessionSetupStore>;
  buildPeerCandidateKey: typeof buildPeerCandidateKeyType;
}) {
  const {
    draft,
    selectedPeerKey,
    useManualPeerInput,
    supportsPeerDiscovery,
    canDiscoverPeers,
    effectiveManualPeerInput,
    peerDiscoveryProviderLabel,
    discordAccountHint,
    telegramAccountHint,
    bindingStore,
    optionsStore,
    gatewayStore,
    buildPeerCandidateKey,
  } = input;

  function formatPeerCandidateLabel(candidate: GatewayPeerCandidate): string {
    const name = candidate.displayName || candidate.peerId;
    const threadPart = candidate.threadId ? ` | thread ${candidate.threadId}` : '';
    return `${name} (${candidate.peerType})${threadPart}`;
  }

  function onTogglePeerInputMode(): void {
    if (!supportsPeerDiscovery.value) {
      return;
    }

    useManualPeerInput.value = !useManualPeerInput.value;
    if (useManualPeerInput.value) {
      selectedPeerKey.value = '';
      return;
    }

    const existing = optionsStore.peerCandidates.find(
      (candidate) =>
        candidate.peerId === draft.peerId &&
        (candidate.threadId ?? null) === (draft.threadId ?? null),
    );
    selectedPeerKey.value = existing ? buildPeerCandidateKey(existing) : '';
  }

  async function onRefreshPeerCandidates(): Promise<void> {
    if (!supportsPeerDiscovery.value) {
      optionsStore.peerCandidatesError = 'Peer discovery is not available for this provider/transport.';
      return;
    }

    if (!canDiscoverPeers.value) {
      if (!gatewayStore.gatewayReady) {
        optionsStore.peerCandidatesError =
          'Validate gateway connection first before loading peer candidates.';
        return;
      }

      if (draft.provider === 'DISCORD') {
        optionsStore.peerCandidatesError =
          'Discord peer discovery is not ready. Verify gateway Discord setup and retry.';
        return;
      }
      if (draft.provider === 'TELEGRAM') {
        optionsStore.peerCandidatesError =
          'Telegram peer discovery is not ready. Verify gateway Telegram setup and retry.';
        return;
      }

      optionsStore.peerCandidatesError =
        `Activate a ${peerDiscoveryProviderLabel.value} personal session first before loading peer candidates.`;
      return;
    }

    try {
      if (draft.provider === 'DISCORD') {
        await optionsStore.loadPeerCandidates(
          draft.accountId || discordAccountHint.value || '',
          {
            includeGroups: true,
            limit: 50,
          },
          draft.provider,
        );
      } else if (draft.provider === 'TELEGRAM') {
        await optionsStore.loadPeerCandidates(
          draft.accountId || telegramAccountHint.value || '',
          {
            includeGroups: true,
            limit: 50,
          },
          draft.provider,
        );
      } else {
        await optionsStore.loadPeerCandidates(
          gatewayStore.session?.sessionId || '',
          {
            includeGroups: true,
            limit: 50,
          },
          draft.provider,
        );
      }

      if (!effectiveManualPeerInput.value && selectedPeerKey.value) {
        const stillExists = optionsStore.peerCandidates.some(
          (candidate) => buildPeerCandidateKey(candidate) === selectedPeerKey.value,
        );
        if (!stillExists) {
          selectedPeerKey.value = '';
          draft.peerId = '';
          draft.threadId = null;
        }
      }
    } catch {
      // Store exposes request errors.
    }
  }

  async function onSaveBinding(): Promise<void> {
    try {
      const resolvedAccountId =
        draft.provider === 'DISCORD' && !draft.accountId.trim()
          ? discordAccountHint.value
          : draft.provider === 'TELEGRAM' && !draft.accountId.trim()
            ? telegramAccountHint.value
          : draft.accountId;

      optionsStore.assertSelectionsFresh({
        draft,
        peerSelectionMode: effectiveManualPeerInput.value ? 'manual' : 'dropdown',
        selectedPeerKey: selectedPeerKey.value,
      });

      await bindingStore.upsertBinding({
        ...draft,
        accountId: resolvedAccountId,
        threadId: draft.threadId?.trim() || null,
      });
    } catch {
      // Stores expose validation and request errors.
    }
  }

  async function onDeleteBinding(bindingId: string): Promise<void> {
    try {
      await bindingStore.deleteBinding(bindingId);
    } catch {
      // Store exposes request errors.
    }
  }

  async function onReloadBindings(): Promise<void> {
    try {
      await bindingStore.loadBindingsIfEnabled();
    } catch {
      // Store exposes request errors.
    }
  }

  return {
    formatPeerCandidateLabel,
    onTogglePeerInputMode,
    onRefreshPeerCandidates,
    onSaveBinding,
    onDeleteBinding,
    onReloadBindings,
  };
}
