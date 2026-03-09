<template>
  <section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <div class="flex items-start justify-between gap-4">
      <div class="space-y-3">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <span class="i-heroicons-microphone-20-solid h-5 w-5"></span>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">{{ extension.name }}</h3>
            <p class="text-sm text-gray-500">{{ extension.description }}</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <div class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium" :class="statusClass">
            {{ statusLabel }}
          </div>
          <div
            v-if="extension.status === 'installed' && extension.enabled"
            class="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700"
          >
            Enabled
          </div>
          <div
            v-else-if="extension.status === 'installed'"
            class="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-medium text-yellow-700"
          >
            Disabled
          </div>
        </div>

        <div
          v-if="extension.status === 'installing'"
          class="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-300 border-t-amber-700"></span>
          <span>{{ extension.message || 'Installing Voice Input...' }}</span>
        </div>
        <div
          v-if="extension.status === 'installing' && extension.installProgress"
          class="space-y-2 rounded-lg border border-amber-100 bg-amber-50/70 px-3 py-3"
        >
          <div class="flex items-center justify-between text-xs font-medium text-amber-900">
            <span>{{ installPhaseLabel }}</span>
            <span v-if="extension.installProgress.percent !== null">{{ extension.installProgress.percent }}%</span>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-amber-100">
            <div
              class="h-full rounded-full bg-amber-500 transition-all duration-300"
              :class="extension.installProgress.percent === null ? 'w-1/3 animate-pulse' : ''"
              :style="extension.installProgress.percent !== null ? { width: `${extension.installProgress.percent}%` } : undefined"
            ></div>
          </div>
        </div>

        <p v-if="extension.message && extension.status !== 'installing'" class="text-sm text-gray-600">{{ extension.message }}</p>
        <p v-if="extension.lastError" class="text-sm text-red-600">{{ extension.lastError }}</p>

        <div v-if="extension.status === 'installed' || extension.status === 'error'" class="space-y-2">
          <label class="flex flex-col gap-1 text-sm text-gray-700">
            <span class="font-medium">Language</span>
            <select
              class="w-44 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              :disabled="busy || extension.status !== 'installed'"
              :value="extension.settings.languageMode"
              @change="handleLanguageModeChange"
            >
              <option value="auto">Auto</option>
              <option value="en">English</option>
              <option value="zh">Chinese</option>
            </select>
          </label>
        </div>

        <div v-if="extension.status === 'installed'" class="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-sm font-medium text-gray-900">Test Voice Input</p>
              <p class="text-xs text-gray-600">
                Record a short sample here to verify microphone capture and local transcription before using the composer.
              </p>
            </div>
            <button
              type="button"
              class="rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              :class="isSettingsTestRecording ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-blue-600 text-white hover:bg-blue-700'"
              :disabled="busy || !extension.enabled || voiceInputStore.isTranscribing"
              @click="handleSettingsTestToggle"
            >
              {{ settingsTestButtonLabel }}
            </button>
          </div>

          <p v-if="!extension.enabled" class="text-xs text-amber-700">
            Enable Voice Input to run a microphone test.
          </p>

          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs font-medium text-gray-600">
              <span>Input level</span>
              <span>{{ Math.round(voiceInputStore.liveInputLevel * 100) }}%</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                class="h-full rounded-full bg-blue-500 transition-all duration-150"
                :style="{ width: `${voiceInputStore.liveInputLevel > 0 ? Math.round(voiceInputStore.liveInputLevel * 100) : 0}%` }"
              ></div>
            </div>
          </div>

          <div
            v-if="isSettingsTestRecording || isSettingsTestTranscribing"
            class="rounded-lg border px-3 py-2 text-sm"
            :class="isSettingsTestRecording ? 'border-red-200 bg-red-50 text-red-700' : 'border-blue-200 bg-blue-50 text-blue-700'"
          >
            {{ isSettingsTestRecording ? 'Recording a test sample...' : 'Transcribing the test sample...' }}
          </div>

          <div v-if="settingsTestResult" class="space-y-2 rounded-lg border border-gray-200 bg-white px-3 py-3">
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-medium text-gray-900">Last Test Result</p>
              <span class="rounded-full px-2 py-0.5 text-[11px] font-medium" :class="settingsTestOutcomeClass">
                {{ settingsTestOutcomeLabel }}
              </span>
            </div>

            <p v-if="settingsTestResult.transcript" class="text-sm text-gray-800">
              {{ settingsTestResult.transcript }}
            </p>
            <p v-else-if="settingsTestResult.error" class="text-sm text-red-700">
              {{ settingsTestResult.error }}
            </p>
            <p v-else class="text-sm text-gray-600">
              {{ settingsTestOutcomeDescription }}
            </p>

            <div v-if="settingsTestResult.diagnostics" class="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <span>Input: {{ settingsTestResult.diagnostics.inputSampleRate }} Hz</span>
              <span>WAV: {{ settingsTestResult.diagnostics.wavSampleRate }} Hz</span>
              <span>Duration: {{ formatDuration(settingsTestResult.diagnostics.durationMs) }}</span>
              <span>RMS: {{ settingsTestResult.diagnostics.rms.toFixed(3) }}</span>
              <span>Peak: {{ settingsTestResult.diagnostics.peak.toFixed(3) }}</span>
              <span v-if="settingsTestResult.detectedLanguage">Language: {{ settingsTestResult.detectedLanguage }}</span>
            </div>
          </div>
        </div>

        <p v-if="canOpenFolder" class="text-xs text-gray-500">
          Managed locally in your AutoByteus extensions folder.
        </p>
        <div class="text-xs text-gray-500">
          Runtime: {{ extension.runtimeVersion || 'Not installed' }}
          <span v-if="extension.modelVersion"> · Model: {{ extension.modelVersion }}</span>
          <span v-if="extension.backendKind"> · Backend: {{ backendLabel }}</span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="extension.status === 'installing'"
          type="button"
          class="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 disabled:cursor-wait"
          disabled
        >
          {{ pendingActionLabel }}
        </button>
        <button
          v-else-if="extension.status === 'not-installed'"
          type="button"
          class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="busy"
          @click="$emit('install')"
        >
          Install
        </button>
        <button
          v-else-if="extension.status === 'installed' && !extension.enabled"
          type="button"
          class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="busy"
          @click="$emit('enable')"
        >
          Enable
        </button>
        <button
          v-else-if="extension.status === 'installed' && extension.enabled"
          type="button"
          class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="busy"
          @click="$emit('disable')"
        >
          Disable
        </button>
        <button
          v-if="canOpenFolder"
          type="button"
          class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="busy"
          @click="$emit('openFolder')"
        >
          Open Folder
        </button>
        <button
          v-if="extension.status === 'installed'"
          type="button"
          class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="busy"
          @click="$emit('remove')"
        >
          Remove
        </button>
        <button
          v-if="extension.status === 'installed' || extension.status === 'error'"
          type="button"
          class="rounded-md border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="busy"
          @click="$emit('reinstall')"
        >
          Reinstall
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import type { ManagedExtensionState } from '~/electron/extensions/types';
import { useVoiceInputStore } from '~/stores/voiceInputStore';

const props = defineProps<{
  extension: ManagedExtensionState;
  busy: boolean;
  pendingAction: 'install' | 'enable' | 'disable' | 'remove' | 'reinstall' | 'update-settings' | null;
}>();

const emit = defineEmits<{
  install: [];
  enable: [];
  disable: [];
  remove: [];
  reinstall: [];
  openFolder: [];
  updateLanguageMode: [value: string];
}>();

const voiceInputStore = useVoiceInputStore();
const { latestResult } = storeToRefs(voiceInputStore);

onMounted(async () => {
  await voiceInputStore.initialize();
});

const canOpenFolder = computed(() => props.extension.status === 'installed' || props.extension.status === 'error');

const statusLabel = computed(() => {
  switch (props.extension.status) {
    case 'installed':
      return 'Installed';
    case 'installing':
      return 'Installing';
    case 'error':
      return 'Needs Attention';
    default:
      return 'Not Installed';
  }
});

const statusClass = computed(() => {
  switch (props.extension.status) {
    case 'installed':
      return 'bg-green-50 text-green-700';
    case 'installing':
      return 'bg-amber-50 text-amber-700';
    case 'error':
      return 'bg-red-50 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
});

const pendingActionLabel = computed(() => {
  switch (props.pendingAction) {
    case 'enable':
      return 'Enabling...';
    case 'disable':
      return 'Disabling...';
    case 'reinstall':
      return 'Reinstalling...';
    case 'update-settings':
      return 'Saving...';
    default:
      return 'Installing...';
  }
});

const backendLabel = computed(() => {
  if (props.extension.backendKind === 'faster-whisper') {
    return 'faster-whisper';
  }
  if (props.extension.backendKind === 'mlx') {
    return 'MLX';
  }
  return null;
});

const installPhaseLabel = computed(() => {
  switch (props.extension.installProgress?.phase) {
    case 'fetching-manifest':
      return 'Fetching runtime manifest';
    case 'downloading-runtime':
      return 'Downloading runtime bundle';
    case 'extracting-runtime':
      return 'Extracting runtime bundle';
    case 'bootstrapping-runtime':
      return 'Bootstrapping local runtime';
    case 'bootstrapping-model':
      return 'Downloading and preparing the model';
    case 'ready':
      return 'Ready';
    default:
      return 'Installing Voice Input';
  }
});

const settingsTestResult = computed(() => (
  latestResult.value?.source === 'settings-test' ? latestResult.value : null
));

const isSettingsTestRecording = computed(() => (
  voiceInputStore.isRecording && voiceInputStore.recordingSource === 'settings-test'
));

const isSettingsTestTranscribing = computed(() => (
  voiceInputStore.isTranscribing && settingsTestResult.value?.source === 'settings-test'
));

const settingsTestButtonLabel = computed(() => (
  isSettingsTestRecording.value ? 'Stop Test' : 'Start Test'
));

const settingsTestOutcomeLabel = computed(() => {
  switch (settingsTestResult.value?.outcome) {
    case 'transcript-ready':
      return 'Transcript Ready';
    case 'no-speech':
      return 'No Speech';
    case 'empty-transcript':
      return 'Empty Transcript';
    case 'error':
      return 'Error';
    case 'transcribing':
      return 'Transcribing';
    case 'recording':
      return 'Recording';
    default:
      return 'Idle';
  }
});

const settingsTestOutcomeClass = computed(() => {
  switch (settingsTestResult.value?.outcome) {
    case 'transcript-ready':
      return 'bg-green-50 text-green-700';
    case 'error':
      return 'bg-red-50 text-red-700';
    case 'no-speech':
    case 'empty-transcript':
      return 'bg-amber-50 text-amber-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
});

const settingsTestOutcomeDescription = computed(() => {
  switch (settingsTestResult.value?.outcome) {
    case 'no-speech':
      return 'The worker classified this recording as silence or very low-level input.';
    case 'empty-transcript':
      return 'Audio was captured, but the worker returned no transcript text.';
    case 'recording':
      return 'Recording is in progress.';
    case 'transcribing':
      return 'The local worker is transcribing the captured sample.';
    default:
      return 'No settings-level test result yet.';
  }
});

function handleLanguageModeChange(event: Event): void {
  const target = event.target as HTMLSelectElement | null;
  if (!target) {
    return;
  }
  emit('updateLanguageMode', target.value);
}

async function handleSettingsTestToggle(): Promise<void> {
  await voiceInputStore.toggleRecording('settings-test');
}

function formatDuration(durationMs: number): string {
  return `${(durationMs / 1000).toFixed(2)}s`;
}
</script>
