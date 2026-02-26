<template>
  <section class="border border-gray-200 rounded-lg p-4">
    <ol class="flex items-start">
      <li
        v-for="(step, index) in steps"
        :key="step.key"
        class="relative flex-1"
      >
        <div
          v-if="index < steps.length - 1"
          class="absolute top-4 left-1/2 right-[-50%] h-px"
          :class="connectorClass(step)"
          aria-hidden="true"
        ></div>
        <button
          type="button"
          class="relative z-10 flex w-full flex-col items-center text-center px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          :aria-current="isActive(step) ? 'step' : undefined"
          :data-testid="`setup-step-${step.key}`"
          @click="onSelectStep(step.key)"
        >
          <div class="h-8 w-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold" :class="stepCircleClass(step)">
            <span v-if="isCompleted(step)" class="i-heroicons-check-20-solid h-4 w-4"></span>
            <span v-else>{{ index + 1 }}</span>
          </div>
          <p class="mt-2 text-sm font-medium" :class="stepLabelClass(step)">{{ formatKey(step.key) }}</p>
          <p v-if="step.detail && isActive(step)" class="mt-1 text-[11px] text-gray-500 max-w-32 leading-4">
            {{ step.detail }}
          </p>
        </button>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SetupStepState, SetupStepKey } from '~/types/messaging';

const props = defineProps<{
  steps: SetupStepState[];
  activeStep?: SetupStepKey;
}>();
const emit = defineEmits<{
  (event: 'select-step', stepKey: SetupStepKey): void;
}>();

const resolvedActiveStep = computed<SetupStepKey>(() => {
  if (props.activeStep) {
    return props.activeStep;
  }
  const firstPending = props.steps.find(
    (step) => step.status !== 'READY' && step.status !== 'DONE',
  );
  return firstPending?.key || 'verification';
});

function formatKey(key: SetupStepKey): string {
  switch (key) {
    case 'gateway':
      return 'Gateway';
    case 'personal_session':
      return 'Session';
    case 'binding':
      return 'Channel Binding';
    case 'verification':
      return 'Verify';
    default:
      return key;
  }
}

function isCompleted(step: SetupStepState): boolean {
  return step.status === 'READY' || step.status === 'DONE';
}

function isActive(step: SetupStepState): boolean {
  return step.key === resolvedActiveStep.value;
}

function connectorClass(step: SetupStepState): string {
  if (isCompleted(step)) {
    return 'bg-green-300';
  }
  if (isActive(step)) {
    return 'bg-blue-300';
  }
  return 'bg-gray-200';
}

function stepCircleClass(step: SetupStepState): string {
  if (isCompleted(step)) {
    return 'border-green-500 bg-green-500 text-white';
  }
  if (isActive(step)) {
    return 'border-blue-500 bg-blue-500 text-white';
  }
  if (step.status === 'BLOCKED') {
    return 'border-red-300 bg-red-50 text-red-600';
  }
  return 'border-gray-300 bg-white text-gray-500';
}

function stepLabelClass(step: SetupStepState): string {
  if (isCompleted(step)) {
    return 'text-gray-900';
  }
  if (isActive(step)) {
    return 'text-blue-700';
  }
  if (step.status === 'BLOCKED') {
    return 'text-red-700';
  }
  return 'text-gray-500';
}

function onSelectStep(stepKey: SetupStepKey): void {
  emit('select-step', stepKey);
}
</script>
