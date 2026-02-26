<template>
  <GatewayConnectionCard v-if="activeStepKey === 'gateway'" />
  <PersonalSessionSetupCard v-else-if="activeStepKey === 'personal_session'" />
  <ChannelBindingSetupCard v-else-if="activeStepKey === 'binding'" />
  <SetupVerificationCard v-else @open-step="onOpenStep" />
</template>

<script setup lang="ts">
import ChannelBindingSetupCard from '~/components/settings/messaging/ChannelBindingSetupCard.vue';
import GatewayConnectionCard from '~/components/settings/messaging/GatewayConnectionCard.vue';
import PersonalSessionSetupCard from '~/components/settings/messaging/PersonalSessionSetupCard.vue';
import SetupVerificationCard from '~/components/settings/messaging/SetupVerificationCard.vue';
import type { SetupStepKey } from '~/types/messaging';

defineProps<{
  activeStepKey: SetupStepKey;
}>();

const emit = defineEmits<{
  (event: 'open-step', stepKey: SetupStepKey): void;
}>();

function onOpenStep(stepKey: SetupStepKey): void {
  emit('open-step', stepKey);
}
</script>
