import { computed, watch } from 'vue';
import { useMessagingProviderFlowStore } from '~/stores/messagingProviderFlowStore';
import { useMessagingSetupNavigationStore } from '~/stores/messagingSetupNavigationStore';
import type { MessagingProvider, SetupStepKey } from '~/types/messaging';
import {
  isStepAllowedForOrder,
  resolveActiveStep,
  resolveGuidedStep,
} from '~/utils/messagingStepSelectionPolicy';

export function useMessagingProviderStepFlow(provider: MessagingProvider) {
  const providerFlowStore = useMessagingProviderFlowStore();
  const navigationStore = useMessagingSetupNavigationStore();

  const steps = computed(() => providerFlowStore.stepStatesForProvider(provider));
  const stepOrder = computed(() => providerFlowStore.providerStepOrder(provider));
  const guidedStepKey = computed<SetupStepKey>(() =>
    resolveGuidedStep(stepOrder.value, steps.value),
  );

  const activeStepKey = computed<SetupStepKey>(() => {
    return resolveActiveStep({
      stepOrder: stepOrder.value,
      stepStates: steps.value,
      manualStep: navigationStore.selectedStepByProvider[provider],
    });
  });

  const hasManualSelection = computed(
    () => navigationStore.selectedStepByProvider[provider] !== null,
  );

  watch(
    [stepOrder, () => navigationStore.selectedStepByProvider[provider]],
    ([nextOrder, nextManualStep]) => {
      if (!nextManualStep) {
        return;
      }
      if (!isStepAllowedForOrder(nextManualStep, nextOrder)) {
        navigationStore.clearSelectedStep(provider);
      }
    },
    { immediate: true },
  );

  function requestStepSelection(stepKey: SetupStepKey): boolean {
    return navigationStore.setSelectedStep(provider, stepKey, stepOrder.value);
  }

  function returnToGuidedStep(): void {
    navigationStore.clearSelectedStep(provider);
  }

  return {
    steps,
    guidedStepKey,
    activeStepKey,
    hasManualSelection,
    requestStepSelection,
    returnToGuidedStep,
  };
}
