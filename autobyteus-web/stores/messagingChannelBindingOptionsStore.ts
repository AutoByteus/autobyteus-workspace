import { defineStore } from 'pinia';
import { EXTERNAL_CHANNEL_BINDING_TARGET_OPTIONS } from '~/graphql/queries/externalChannelSetupQueries';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';
import { getApolloClient } from '~/utils/apolloClient';
import type {
  ExternalChannelBindingDraft,
  MessagingProvider,
  ExternalChannelBindingTargetOption,
  ExternalChannelBindingTargetType,
  GatewayPeerCandidate,
} from '~/types/messaging';

export type BindingSelectionMode = 'dropdown' | 'manual';

export interface AssertSelectionFreshInput {
  draft: ExternalChannelBindingDraft;
  peerSelectionMode: BindingSelectionMode;
  targetSelectionMode: BindingSelectionMode;
  selectedPeerKey?: string | null;
  selectedTargetId?: string | null;
}

interface BindingOptionsState {
  targetOptions: ExternalChannelBindingTargetOption[];
  isTargetOptionsLoading: boolean;
  targetOptionsError: string | null;
  peerCandidates: GatewayPeerCandidate[];
  peerCandidatesSessionId: string | null;
  isPeerCandidatesLoading: boolean;
  peerCandidatesError: string | null;
  staleSelectionError: string | null;
}

const STALE_SELECTION_MESSAGE =
  'Selection is outdated. Refresh peers/targets and select again.';

const normalizeErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Request failed';
};

export const buildPeerCandidateKey = (candidate: {
  peerId: string;
  threadId: string | null;
}): string => `${candidate.peerId}::${candidate.threadId ?? ''}`;

const normalizeDraftThreadId = (threadId: string | null): string | null => {
  if (threadId === null) {
    return null;
  }
  const normalized = threadId.trim();
  return normalized.length > 0 ? normalized : null;
};

export const useMessagingChannelBindingOptionsStore = defineStore(
  'messagingChannelBindingOptionsStore',
  {
    state: (): BindingOptionsState => ({
      targetOptions: [],
      isTargetOptionsLoading: false,
      targetOptionsError: null,
      peerCandidates: [],
      peerCandidatesSessionId: null,
      isPeerCandidatesLoading: false,
      peerCandidatesError: null,
      staleSelectionError: null,
    }),

    getters: {
      targetOptionsByType: (state) => {
        return (targetType: ExternalChannelBindingTargetType) =>
          state.targetOptions.filter((option) => option.targetType === targetType);
      },
    },

    actions: {
      clearStaleSelectionError() {
        this.staleSelectionError = null;
      },

      resetPeerCandidates() {
        this.peerCandidates = [];
        this.peerCandidatesSessionId = null;
        this.peerCandidatesError = null;
      },

      async loadTargetOptions(): Promise<ExternalChannelBindingTargetOption[]> {
        this.isTargetOptionsLoading = true;
        this.targetOptionsError = null;

        try {
          const client = getApolloClient();
          const { data, errors } = await client.query({
            query: EXTERNAL_CHANNEL_BINDING_TARGET_OPTIONS,
            fetchPolicy: 'network-only',
          });

          if (errors && errors.length > 0) {
            throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '));
          }

          this.targetOptions =
            (data?.externalChannelBindingTargetOptions as ExternalChannelBindingTargetOption[]) || [];
          return this.targetOptions;
        } catch (error) {
          this.targetOptionsError = normalizeErrorMessage(error);
          throw error;
        } finally {
          this.isTargetOptionsLoading = false;
        }
      },

      async loadPeerCandidates(
        contextId: string,
        options?: { includeGroups?: boolean; limit?: number },
        provider: MessagingProvider = 'WHATSAPP',
      ): Promise<GatewayPeerCandidate[]> {
        const normalizedContextId = contextId.trim();
        if (provider !== 'DISCORD' && provider !== 'TELEGRAM' && !normalizedContextId) {
          throw new Error('sessionId is required to load peer candidates.');
        }

        this.isPeerCandidatesLoading = true;
        this.peerCandidatesError = null;

        try {
          const gatewayStore = useGatewaySessionSetupStore();
          const client = gatewayStore.createClient();
          const response =
            provider === 'DISCORD'
              ? await client.getDiscordPeerCandidates({
                  accountId: normalizedContextId || undefined,
                  includeGroups: options?.includeGroups,
                  limit: options?.limit,
                })
              : provider === 'TELEGRAM'
              ? await client.getTelegramPeerCandidates({
                  accountId: normalizedContextId || undefined,
                  includeGroups: options?.includeGroups,
                  limit: options?.limit,
                })
              : provider === 'WECHAT'
              ? await client.getWeChatPersonalPeerCandidates(normalizedContextId, {
                  includeGroups: options?.includeGroups,
                  limit: options?.limit,
                })
              : await client.getWhatsAppPersonalPeerCandidates(normalizedContextId, {
                  includeGroups: options?.includeGroups,
                  limit: options?.limit,
                });

          this.peerCandidates = response.items;
          this.peerCandidatesSessionId =
            provider === 'DISCORD' || provider === 'TELEGRAM'
              ? null
              : (response as { sessionId: string }).sessionId;
          return this.peerCandidates;
        } catch (error) {
          this.peerCandidatesError = normalizeErrorMessage(error);
          throw error;
        } finally {
          this.isPeerCandidatesLoading = false;
        }
      },

      assertSelectionsFresh(input: AssertSelectionFreshInput): void {
        this.staleSelectionError = null;

        if (input.peerSelectionMode === 'dropdown') {
          const selectedPeerKey = input.selectedPeerKey?.trim();
          if (!selectedPeerKey) {
            this.staleSelectionError = STALE_SELECTION_MESSAGE;
            throw new Error(STALE_SELECTION_MESSAGE);
          }

          const selectedCandidate = this.peerCandidates.find(
            (candidate) => buildPeerCandidateKey(candidate) === selectedPeerKey,
          );
          if (!selectedCandidate) {
            this.staleSelectionError = STALE_SELECTION_MESSAGE;
            throw new Error(STALE_SELECTION_MESSAGE);
          }

          if (
            selectedCandidate.peerId !== input.draft.peerId ||
            normalizeDraftThreadId(selectedCandidate.threadId) !==
              normalizeDraftThreadId(input.draft.threadId)
          ) {
            this.staleSelectionError = STALE_SELECTION_MESSAGE;
            throw new Error(STALE_SELECTION_MESSAGE);
          }
        }

        if (input.targetSelectionMode === 'dropdown') {
          const selectedTargetId = input.selectedTargetId?.trim();
          if (!selectedTargetId) {
            this.staleSelectionError = STALE_SELECTION_MESSAGE;
            throw new Error(STALE_SELECTION_MESSAGE);
          }

          const targetOption = this.targetOptions.find(
            (option) =>
              option.targetType === input.draft.targetType && option.targetId === selectedTargetId,
          );
          if (!targetOption || input.draft.targetId !== selectedTargetId) {
            this.staleSelectionError = STALE_SELECTION_MESSAGE;
            throw new Error(STALE_SELECTION_MESSAGE);
          }
        }
      },
    },
  },
);
