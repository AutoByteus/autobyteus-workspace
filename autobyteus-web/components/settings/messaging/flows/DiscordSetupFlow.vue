<template>
  <div class="space-y-6">
    <SetupChecklistCard
      :steps="steps"
      :active-step="activeStepKey"
      @select-step="requestStepSelection"
    />
    <div v-if="hasManualSelection" class="flex justify-end">
      <button
        type="button"
        class="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700"
        data-testid="return-guided-step"
        @click="returnToGuidedStep"
      >
        Return To Guided Step
      </button>
    </div>
    <SetupStepContentHost :active-step-key="activeStepKey" @open-step="requestStepSelection" />
  </div>
</template>

<script setup lang="ts">
import { useMessagingProviderStepFlow } from '~/composables/useMessagingProviderStepFlow';
import SetupChecklistCard from '~/components/settings/messaging/SetupChecklistCard.vue';
import SetupStepContentHost from '~/components/settings/messaging/SetupStepContentHost.vue';

const {
  steps,
  activeStepKey,
  hasManualSelection,
  requestStepSelection,
  returnToGuidedStep,
} = useMessagingProviderStepFlow('DISCORD');
</script>
