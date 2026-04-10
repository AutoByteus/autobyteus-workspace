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
            {{ t('settings.components.settings.VoiceInputExtensionCard.badge.enabled') }}
          </div>
          <div
            v-else-if="extension.status === 'installed'"
            class="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-medium text-yellow-700"
          >
            {{ t('settings.components.settings.VoiceInputExtensionCard.badge.disabled') }}
          </div>
        </div>

        <div
          v-if="extension.status === 'installing'"
          class="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-300 border-t-amber-700"></span>
          <span>{{ installMessage }}</span>
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

        <p v-if="extensionStatusMessage && extension.status !== 'installing'" class="text-sm text-gray-600">{{ extensionStatusMessage }}</p>
        <p v-if="extension.lastError" class="text-sm text-red-600">{{ extension.lastError }}</p>

        <div v-if="extension.status === 'installed' || extension.status === 'error'" class="space-y-2">
          <label class="flex flex-col gap-1 text-sm text-gray-700">
            <span class="font-medium">{{ t('settings.components.settings.VoiceInputExtensionCard.language') }}</span>
            <select
              class="w-44 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              :disabled="busy || extension.status !== 'installed'"
              :value="extension.settings.languageMode"
              @change="handleLanguageModeChange"
            >
              <option value="auto">{{ t('settings.components.settings.VoiceInputExtensionCard.languageOption.auto') }}</option>
              <option value="en">{{ t('settings.components.settings.VoiceInputExtensionCard.languageOption.english') }}</option>
              <option value="zh">{{ t('settings.components.settings.VoiceInputExtensionCard.languageOption.chinese') }}</option>
            </select>
          </label>

          <div class="space-y-2 text-sm text-gray-700">
            <div class="flex items-center justify-between gap-3">
              <span class="font-medium">{{ t('settings.components.settings.VoiceInputExtensionCard.audio_source') }}</span>
              <button
                type="button"
                class="text-xs font-medium text-blue-700 transition-colors hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="busy || voiceInputStore.isRecording || voiceInputStore.isTranscribing"
                @click="refreshAudioInputs"
              >
                {{ t('settings.components.settings.VoiceInputExtensionCard.refresh') }}
              </button>
            </div>
            <select
              class="w-full max-w-sm rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              :disabled="busy || extension.status !== 'installed'"
              :value="selectedAudioInputValue"
              @change="handleAudioInputDeviceChange"
            >
              <option value="">{{ t('settings.components.settings.VoiceInputExtensionCard.system_default') }}</option>
              <option
                v-for="device in voiceInputStore.audioInputDevices"
                :key="device.deviceId"
                :value="device.deviceId"
              >
                {{ device.label }}
              </option>
            </select>
            <p class="text-xs" :class="audioInputStatusClass">
              {{ audioInputStatusMessage }}
            </p>
          </div>
        </div>

        <div v-if="extension.status === 'installed'" class="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-sm font-medium text-gray-900">{{ t('settings.components.settings.VoiceInputExtensionCard.test_voice_input') }}</p>
              <p class="text-xs text-gray-600">{{ t('settings.components.settings.VoiceInputExtensionCard.record_a_short_sample_here_to') }}</p>
            </div>
            <button
              type="button"
              class="rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              :class="isSettingsTestRecording ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-blue-600 text-white hover:bg-blue-700'"
              :disabled="settingsTestButtonDisabled"
              @click="handleSettingsTestToggle"
            >
              {{ settingsTestButtonLabel }}
            </button>
          </div>

          <div v-if="showSettingsTestReset" class="flex justify-end">
            <button
              type="button"
              class="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="busy"
              @click="handleSettingsTestReset"
            >{{ t('settings.components.settings.VoiceInputExtensionCard.reset_test') }}</button>
          </div>

          <p v-if="!extension.enabled" class="text-xs text-amber-700">{{ t('settings.components.settings.VoiceInputExtensionCard.enable_voice_input_to_run_a') }}</p>

          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs font-medium text-gray-600">
              <span>{{ t('settings.components.settings.VoiceInputExtensionCard.input_level') }}</span>
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
            {{ isSettingsTestRecording
              ? t('settings.components.settings.VoiceInputExtensionCard.test.recording')
              : t('settings.components.settings.VoiceInputExtensionCard.test.transcribing') }}
          </div>

          <div v-if="settingsTestResult" class="space-y-2 rounded-lg border border-gray-200 bg-white px-3 py-3">
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-medium text-gray-900">{{ t('settings.components.settings.VoiceInputExtensionCard.last_test_result') }}</p>
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
              <span>{{ t('settings.components.settings.VoiceInputExtensionCard.diagnostics.input', { value: settingsTestResult.diagnostics.inputSampleRate }) }}</span>
              <span>{{ t('settings.components.settings.VoiceInputExtensionCard.diagnostics.wav', { value: settingsTestResult.diagnostics.wavSampleRate }) }}</span>
              <span>{{ t('settings.components.settings.VoiceInputExtensionCard.diagnostics.duration', { value: formatDuration(settingsTestResult.diagnostics.durationMs) }) }}</span>
              <span>{{ t('settings.components.settings.VoiceInputExtensionCard.diagnostics.rms', { value: settingsTestResult.diagnostics.rms.toFixed(3) }) }}</span>
              <span>{{ t('settings.components.settings.VoiceInputExtensionCard.diagnostics.peak', { value: settingsTestResult.diagnostics.peak.toFixed(3) }) }}</span>
              <span v-if="settingsTestResult.detectedLanguage">{{ t('settings.components.settings.VoiceInputExtensionCard.diagnostics.language', { value: settingsTestResult.detectedLanguage }) }}</span>
            </div>
          </div>
        </div>

        <p v-if="canOpenFolder" class="text-xs text-gray-500">{{ t('settings.components.settings.VoiceInputExtensionCard.managed_locally_in_your_autobyteus_extensions') }}</p>
        <div class="text-xs text-gray-500">
          {{ t('settings.components.settings.VoiceInputExtensionCard.runtime', { value: extension.runtimeVersion || t('settings.components.settings.VoiceInputExtensionCard.notInstalled') }) }}
          <span v-if="extension.modelVersion"> · {{ t('settings.components.settings.VoiceInputExtensionCard.model', { value: extension.modelVersion }) }}</span>
          <span v-if="extension.backendKind"> · {{ t('settings.components.settings.VoiceInputExtensionCard.backend', { value: backendLabel }) }}</span>
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
          {{ t('settings.components.settings.VoiceInputExtensionCard.action.install') }}
        </button>
        <button
          v-else-if="extension.status === 'installed' && !extension.enabled"
          type="button"
          class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="busy"
          @click="$emit('enable')"
        >
          {{ t('settings.components.settings.VoiceInputExtensionCard.action.enable') }}
        </button>
        <button
          v-else-if="extension.status === 'installed' && extension.enabled"
          type="button"
          class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="busy"
          @click="$emit('disable')"
        >
          {{ t('settings.components.settings.VoiceInputExtensionCard.action.disable') }}
        </button>
        <button
          v-if="canOpenFolder"
          type="button"
          class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="busy"
          @click="$emit('openFolder')"
        >{{ t('settings.components.settings.VoiceInputExtensionCard.open_folder') }}</button>
        <button
          v-if="extension.status === 'installed'"
          type="button"
          class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="busy"
          @click="$emit('remove')"
        >
          {{ t('settings.components.settings.VoiceInputExtensionCard.action.remove') }}
        </button>
        <button
          v-if="extension.status === 'installed' || extension.status === 'error'"
          type="button"
          class="rounded-md border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="busy"
          @click="$emit('reinstall')"
        >
          {{ t('settings.components.settings.VoiceInputExtensionCard.action.reinstall') }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import type { ManagedExtensionState } from '~/electron/extensions/types';
import { useLocalization } from '~/composables/useLocalization';
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
  updateAudioInputDevice: [value: string | null];
}>();

const voiceInputStore = useVoiceInputStore();
const { latestResult } = storeToRefs(voiceInputStore);
const { t } = useLocalization();

onMounted(async () => {
  await voiceInputStore.initialize();
  await voiceInputStore.refreshAudioInputDevices();
});

const canOpenFolder = computed(() => props.extension.status === 'installed' || props.extension.status === 'error');

const statusLabel = computed(() => {
  switch (props.extension.status) {
    case 'installed':
      return t('settings.components.settings.VoiceInputExtensionCard.status.installed');
    case 'installing':
      return t('settings.components.settings.VoiceInputExtensionCard.status.installing');
    case 'error':
      return t('settings.components.settings.VoiceInputExtensionCard.status.needsAttention');
    default:
      return t('settings.components.settings.VoiceInputExtensionCard.status.notInstalled');
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
      return t('settings.components.settings.VoiceInputExtensionCard.pending.enable');
    case 'disable':
      return t('settings.components.settings.VoiceInputExtensionCard.pending.disable');
    case 'reinstall':
      return t('settings.components.settings.VoiceInputExtensionCard.pending.reinstall');
    case 'update-settings':
      return t('settings.components.settings.VoiceInputExtensionCard.pending.updateSettings');
    default:
      return t('settings.components.settings.VoiceInputExtensionCard.pending.install');
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
      return t('settings.components.settings.VoiceInputExtensionCard.installPhase.fetchingManifest');
    case 'downloading-runtime':
      return t('settings.components.settings.VoiceInputExtensionCard.installPhase.downloadingRuntime');
    case 'extracting-runtime':
      return t('settings.components.settings.VoiceInputExtensionCard.installPhase.extractingRuntime');
    case 'bootstrapping-runtime':
      return t('settings.components.settings.VoiceInputExtensionCard.installPhase.bootstrappingRuntime');
    case 'bootstrapping-model':
      return t('settings.components.settings.VoiceInputExtensionCard.installPhase.bootstrappingModel');
    case 'ready':
      return t('settings.components.settings.VoiceInputExtensionCard.installPhase.ready');
    default:
      return t('settings.components.settings.VoiceInputExtensionCard.installPhase.installingVoiceInput');
  }
});

const installMessage = computed(() => (
  props.extension.installProgress ? installPhaseLabel.value : t('settings.components.settings.VoiceInputExtensionCard.installPhase.installingVoiceInput')
));

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
  isSettingsTestRecording.value
    ? t('settings.components.settings.VoiceInputExtensionCard.test.stop')
    : t('settings.components.settings.VoiceInputExtensionCard.test.start')
));

const showSettingsTestReset = computed(() => (
  isSettingsTestRecording.value
  || settingsTestResult.value?.outcome === 'error'
  || settingsTestResult.value?.outcome === 'recording'
));

const selectedAudioInputValue = computed(() => props.extension.settings.audioInputDeviceId ?? '');

const audioInputStatusMessage = computed(() => {
  if (voiceInputStore.microphonePermissionState === 'denied') {
    return t('settings.components.settings.VoiceInputExtensionCard.audioStatus.permissionDenied');
  }

  if (voiceInputStore.selectedAudioInputUnavailable) {
    return t('settings.components.settings.VoiceInputExtensionCard.audioStatus.savedUnavailable');
  }

  if (voiceInputStore.audioInputDevices.length === 0) {
    if (voiceInputStore.microphonePermissionState === 'prompt') {
      return t('settings.components.settings.VoiceInputExtensionCard.audioStatus.permissionPrompt');
    }

    if (voiceInputStore.microphonePermissionState === 'unsupported') {
      return t('settings.components.settings.VoiceInputExtensionCard.audioStatus.unsupported');
    }

    return t('settings.components.settings.VoiceInputExtensionCard.audioStatus.noDevices');
  }

  const count = voiceInputStore.audioInputDevices.length;
  return t('settings.components.settings.VoiceInputExtensionCard.audioStatus.selectedSource', {
    label: voiceInputStore.selectedAudioInputLabel,
    count,
    suffix: count === 1 ? '' : 's',
  });
});

const audioInputStatusClass = computed(() => {
  if (voiceInputStore.microphonePermissionState === 'denied') {
    return 'text-red-700';
  }

  if (voiceInputStore.selectedAudioInputUnavailable || voiceInputStore.audioInputDevices.length === 0) {
    return 'text-amber-700';
  }

  return 'text-gray-600';
});

const settingsTestButtonDisabled = computed(() => (
  props.busy
  || !props.extension.enabled
  || voiceInputStore.isTranscribing
  || voiceInputStore.microphonePermissionState === 'denied'
  || voiceInputStore.selectedAudioInputUnavailable
));

const settingsTestOutcomeLabel = computed(() => {
  switch (settingsTestResult.value?.outcome) {
    case 'transcript-ready':
      return t('settings.components.settings.VoiceInputExtensionCard.outcome.transcriptReady');
    case 'no-speech':
      return t('settings.components.settings.VoiceInputExtensionCard.outcome.noSpeech');
    case 'empty-transcript':
      return t('settings.components.settings.VoiceInputExtensionCard.outcome.emptyTranscript');
    case 'error':
      return t('settings.components.settings.VoiceInputExtensionCard.outcome.error');
    case 'transcribing':
      return t('settings.components.settings.VoiceInputExtensionCard.outcome.transcribing');
    case 'recording':
      return t('settings.components.settings.VoiceInputExtensionCard.outcome.recording');
    default:
      return t('settings.components.settings.VoiceInputExtensionCard.outcome.idle');
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
      return t('settings.components.settings.VoiceInputExtensionCard.outcomeDescription.noSpeech');
    case 'empty-transcript':
      return t('settings.components.settings.VoiceInputExtensionCard.outcomeDescription.emptyTranscript');
    case 'recording':
      return t('settings.components.settings.VoiceInputExtensionCard.outcomeDescription.recording');
    case 'transcribing':
      return t('settings.components.settings.VoiceInputExtensionCard.outcomeDescription.transcribing');
    default:
      return t('settings.components.settings.VoiceInputExtensionCard.outcomeDescription.idle');
  }
});

const extensionStatusMessage = computed(() => {
  if (props.extension.status === 'installed') {
    return props.extension.enabled
      ? t('settings.components.settings.VoiceInputExtensionCard.message.installedEnabled')
      : t('settings.components.settings.VoiceInputExtensionCard.message.installedDisabled');
  }

  if (props.extension.status === 'error') {
    return t('settings.components.settings.VoiceInputExtensionCard.message.error');
  }

  return props.extension.message || '';
});

function handleLanguageModeChange(event: Event): void {
  const target = event.target as HTMLSelectElement | null;
  if (!target) {
    return;
  }
  emit('updateLanguageMode', target.value);
}

function handleAudioInputDeviceChange(event: Event): void {
  const target = event.target as HTMLSelectElement | null;
  if (!target) {
    return;
  }
  emit('updateAudioInputDevice', target.value || null);
}

async function handleSettingsTestToggle(): Promise<void> {
  await voiceInputStore.toggleRecording('settings-test');
}

async function refreshAudioInputs(): Promise<void> {
  await voiceInputStore.refreshAudioInputDevices();
}

async function handleSettingsTestReset(): Promise<void> {
  await voiceInputStore.resetSettingsTestState();
}

function formatDuration(durationMs: number): string {
  return t('settings.components.settings.VoiceInputExtensionCard.durationSeconds', {
    value: (durationMs / 1000).toFixed(2),
  });
}
</script>
