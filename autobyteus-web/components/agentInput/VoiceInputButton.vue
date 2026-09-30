<template>
  <button
    v-if="isVisible"
    type="button"
    @click="handleVoiceAction"
    :disabled="voiceInputStore.isStarting || voiceInputStore.isTranscribing || !target"
    :title="voiceButtonTitle"
    :aria-label="voiceButtonTitle"
    :aria-busy="voiceInputStore.isStarting ? 'true' : undefined"
    class="flex items-center justify-center rounded-full focus:outline-none focus:ring-2 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
    :class="[voiceButtonClass, compact ? 'h-8 w-8' : 'p-2']"
  >
    <Icon
      :icon="voiceInputStore.isRecording ? 'heroicons:stop-solid' : voiceInputStore.isStarting ? 'heroicons:arrow-path-solid' : 'heroicons:microphone-solid'"
      :class="[compact ? 'h-4 w-4' : 'h-5 w-5', voiceInputStore.isStarting ? 'animate-spin' : '']"
    />
  </button>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { Icon } from '@iconify/vue';
import { useVoiceInputStore } from '~/stores/voiceInputStore';
import type { ComposerTarget } from '~/composables/agentInput/useComposerTarget';

const props = defineProps<{
  target: ComposerTarget | null;
  /** 32px circle (Chat footer) instead of the run-view 36px button. */
  compact?: boolean;
}>();

const voiceInputStore = useVoiceInputStore();

const isVisible = computed(() => voiceInputStore.isAvailable
  || voiceInputStore.isStarting
  || voiceInputStore.isRecording
  || voiceInputStore.isTranscribing);

const voiceButtonTitle = computed(() => {
  if (voiceInputStore.isStarting) {
    return 'Starting microphone...';
  }
  if (voiceInputStore.isTranscribing) {
    return 'Transcribing...';
  }
  return voiceInputStore.isRecording ? 'Stop recording' : 'Start voice input';
});

const voiceButtonClass = computed(() => {
  if (voiceInputStore.isRecording) {
    return 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500/50';
  }
  return 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-400/50';
});

const handleVoiceAction = async () => {
  const target = props.target;
  if (!target) {
    return;
  }
  try {
    await voiceInputStore.toggleRecording({ source: 'composer', targetContext: target.context });
  } catch (error) {
    console.error('Error toggling voice input:', error);
  }
};

onMounted(() => {
  void voiceInputStore.initialize();
});

onUnmounted(() => {
  void voiceInputStore.cancelOperationForSource('composer');
});
</script>
