import { defineStore } from 'pinia';
import type { MessagingProvider, SetupStepKey } from '~/types/messaging';
import { isStepAllowedForOrder } from '~/utils/messagingStepSelectionPolicy';

interface MessagingSetupNavigationState {
  selectedStepByProvider: Record<MessagingProvider, SetupStepKey | null>;
}

export const useMessagingSetupNavigationStore = defineStore(
  'messagingSetupNavigationStore',
  {
    state: (): MessagingSetupNavigationState => ({
      selectedStepByProvider: {
        WHATSAPP: null,
        WECHAT: null,
        WECOM: null,
        DISCORD: null,
        TELEGRAM: null,
      },
    }),

    actions: {
      selectedStepForProvider(provider: MessagingProvider): SetupStepKey | null {
        return this.selectedStepByProvider[provider] || null;
      },

      setSelectedStep(
        provider: MessagingProvider,
        step: SetupStepKey,
        allowedStepOrder: SetupStepKey[],
      ): boolean {
        if (!isStepAllowedForOrder(step, allowedStepOrder)) {
          return false;
        }
        this.selectedStepByProvider[provider] = step;
        return true;
      },

      clearSelectedStep(provider: MessagingProvider): void {
        this.selectedStepByProvider[provider] = null;
      },
    },
  },
);
