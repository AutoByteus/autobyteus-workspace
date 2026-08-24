import { defineStore } from 'pinia';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';
import type {
  ExternalChannelBindingDraft,
  MessagingProvider,
  GatewayPeerCandidate,
} from '~/types/messaging';

export type BindingSelectionMode = 'dropdown' | 'manual';

export interface AssertSelectionFreshInput {
  draft: ExternalChannelBindingDraft;
  peerSelectionMode: BindingSelectionMode;
  selectedPeerKey?: string | null;
}

interface BindingOptionsState {
  peerCandidates: GatewayPeerCandidate[];
  peerCandidatesSessionId: string | null;
  isPeerCandidatesLoading: boolean;
  peerCandidatesError: string | null;
  staleSelectionError: string | null;
}

const STALE_SELECTION_MESSAGE = 'Selection is outdated. Refresh peers and select again.';

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
      peerCandidates: [],
      peerCandidatesSessionId: null,
      isPeerCandidatesLoading: false,
      peerCandidatesError: null,
      staleSelectionError: null,
    }),

    actions: {
      clearStaleSelectionError() {
        this.staleSelectionError = null;
      },

      resetPeerCandidates() {
        this.peerCandidates = [];
        this.peerCandidatesSessionId = null;
        this.peerCandidatesError = null;
      },

    async loadPeerCandidates(
      _contextId: string,
      options?: { includeGroups?: boolean; limit?: number },
      provider: MessagingProvider = 'WHATSAPP',
    ): Promise<GatewayPeerCandidate[]> {
      if (provider !== 'DISCORD' && provider !== 'TELEGRAM') {
        this.peerCandidatesError =
          'Peer discovery is only available for Discord and Telegram in managed mode.';
        throw new Error(this.peerCandidatesError);
      }

      this.isPeerCandidatesLoading = true;
      this.peerCandidatesError = null;

      try {
        const gatewayStore = useGatewaySessionSetupStore();
        const response =
          provider === 'DISCORD'
            ? await gatewayStore.loadPeerCandidates('DISCORD', {
                includeGroups: options?.includeGroups,
                limit: options?.limit,
              })
            : await gatewayStore.loadPeerCandidates('TELEGRAM', {
                includeGroups: options?.includeGroups,
                limit: options?.limit,
              });

          this.peerCandidates = response.items;
          this.peerCandidatesSessionId = null;
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

      },
    },
  },
);
