<template>
  <div
    v-if="voiceInputStore.isStarting || voiceInputStore.isRecording || voiceInputStore.isTranscribing"
    class="flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium"
    :class="voiceStatusClass"
  >
    <div class="flex items-center gap-2">
      <span
        v-if="voiceInputStore.isStarting"
        class="h-3 w-3 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"
      ></span>
      <span
        v-else
        class="h-2.5 w-2.5 rounded-full"
        :class="voiceInputStore.isRecording ? 'animate-pulse bg-red-500' : 'bg-blue-500'"
      ></span>
      <span>{{ voiceStatusText }}</span>
    </div>
    <span v-if="voiceInputStore.isRecording" class="tabular-nums text-[0.6875rem] text-current/80">
      {{ recordingDurationLabel }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useVoiceInputStore } from '~/stores/voiceInputStore';

const voiceInputStore = useVoiceInputStore();

const recordingElapsedSeconds = ref(0);
let recordingStartedAt = 0;
let recordingTimer: ReturnType<typeof setInterval> | null = null;

const voiceStatusText = computed(() => {
  if (voiceInputStore.isStarting) {
    return 'Starting microphone...';
  }
  if (voiceInputStore.isRecording) {
    return 'Recording... Tap stop when you are done.';
  }
  return 'Transcribing voice input...';
});

const voiceStatusClass = computed(() => {
  if (voiceInputStore.isRecording) {
    return 'border-red-200 bg-red-50 text-red-700';
  }
  return 'border-blue-200 bg-blue-50 text-blue-700';
});

const recordingDurationLabel = computed(() => {
  const minutes = Math.floor(recordingElapsedSeconds.value / 60);
  const seconds = recordingElapsedSeconds.value % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

const stopRecordingTimer = () => {
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }
};

watch(
  () => voiceInputStore.isRecording,
  (isRecording) => {
    stopRecordingTimer();
    if (!isRecording) {
      recordingElapsedSeconds.value = 0;
      return;
    }

    recordingStartedAt = Date.now();
    recordingElapsedSeconds.value = 0;
    recordingTimer = setInterval(() => {
      recordingElapsedSeconds.value = Math.floor((Date.now() - recordingStartedAt) / 1000);
    }, 250);
  },
  { immediate: true },
);

onUnmounted(stopRecordingTimer);
</script>
