<template>
  <button
    v-if="isVisible"
    type="button"
    @click="handleVoiceAction"
    :disabled="otherBusy || voiceInputStore.isStarting || voiceInputStore.isTranscribing || disabled || !target"
    :title="voiceButtonTitle"
    :aria-label="voiceButtonTitle"
    :aria-busy="voiceInputStore.isStarting ? 'true' : undefined"
    class="flex items-center justify-center rounded-full focus:outline-none focus:ring-2 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
    :class="[voiceButtonClass, compact ? 'h-8 w-8' : large ? 'h-11 w-11' : 'p-2']"
  >
    <Icon
      :icon="voiceInputStore.isRecording ? 'heroicons:stop-solid' : voiceInputStore.isStarting ? 'heroicons:arrow-path-solid' : 'heroicons:microphone-solid'"
      :class="[compact ? 'h-4 w-4' : 'h-5 w-5', voiceInputStore.isStarting ? 'animate-spin motion-reduce:animate-none' : '']"
    />
  </button>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { Icon } from '@iconify/vue';
import { useLocalization } from '~/composables/useLocalization';
import { useVoiceInputStore } from '~/stores/voiceInputStore';
import type { VoiceTranscriptTarget, VoiceInputRecordingSource } from '~/types/voiceInput';

const props = defineProps<{
  target: VoiceTranscriptTarget | null;
  source?: Exclude<VoiceInputRecordingSource, 'settings-test'>;
  disabled?: boolean;
  large?: boolean;
  /** 32px circle (Chat footer) instead of the run-view 36px button. */
  compact?: boolean;
}>();

const voiceInputStore = useVoiceInputStore();
const {t} = useLocalization();

const ownsOperation = computed(() => Boolean(props.target && voiceInputStore.transcriptTarget?.key === props.target.key));
const otherBusy = computed(() => !ownsOperation.value && (voiceInputStore.isStarting || voiceInputStore.isRecording || voiceInputStore.isTranscribing));
const isVisible = computed(() => voiceInputStore.isAvailable
  || ownsOperation.value);

const voiceButtonTitle = computed(() => {
  if (voiceInputStore.isStarting) {
    return t('settings.voiceInput.controls.starting');
  }
  if (voiceInputStore.isTranscribing) {
    return t('settings.voiceInput.controls.transcribing');
  }
  return voiceInputStore.isRecording ? t('settings.voiceInput.controls.stop') : t('settings.voiceInput.controls.start');
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
    await voiceInputStore.toggleRecording({ source: props.source ?? 'composer', target });
  } catch (error) {
    console.error('Error toggling voice input:', error);
  }
};

onMounted(() => {
  void voiceInputStore.initialize();
});

watch(() => props.target, (target, old) => {
  if (old && old.key !== target?.key) void voiceInputStore.cancelOperationForTarget(old.key);
});

onUnmounted(() => {
  if (props.target) void voiceInputStore.cancelOperationForTarget(props.target.key);
});
</script>
