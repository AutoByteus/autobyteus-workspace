<template>
  <div class="mt-5 border-t border-gray-100 pt-5" data-testid="voice-microphone-panel">
    <h4 class="text-sm font-semibold text-gray-900">{{ t('extensions.voice.micTitle') }}</h4>
    <p class="mt-1 max-w-2xl text-xs leading-5 text-gray-500">{{ t('extensions.voice.micLead') }}</p>

    <div class="mt-3 max-w-md space-y-1.5">
      <div class="flex items-center justify-between gap-3">
        <label for="voice-microphone" class="text-sm font-medium text-gray-700">{{ t('extensions.voice.microphone') }}</label>
        <button
          type="button"
          class="rounded text-xs font-medium text-blue-700 transition-colors hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="testing"
          data-testid="voice-microphone-refresh"
          @click="refreshDevices"
        >{{ t('extensions.voice.refresh') }}</button>
      </div>
      <select
        id="voice-microphone"
        class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"
        :value="voice.microphoneDeviceId ?? ''"
        :disabled="testing"
        data-testid="voice-microphone-select"
        @change="voice.setMicrophone(($event.target as HTMLSelectElement).value || null)"
      >
        <option value="">{{ systemDefaultName ? t('extensions.voice.systemDefault', { name: systemDefaultName }) : t('extensions.voice.systemDefaultShort') }}</option>
        <option v-if="voice.selectedAudioInputUnavailable" :value="voice.microphoneDeviceId ?? ''">{{ voice.selectedAudioInputLabel }}</option>
        <option v-for="device in voice.audioInputDevices" :key="device.deviceId" :value="device.deviceId">{{ device.label }}</option>
      </select>
      <p class="text-xs" :class="deviceProblem ? 'text-amber-700' : 'text-gray-500'" :role="deviceProblem ? 'alert' : undefined" data-testid="voice-microphone-status">{{ deviceProblem ?? t('extensions.voice.deviceCount', { count: voice.audioInputDevices.length }) }}</p>
    </div>

    <div class="mt-4 max-w-2xl space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4" data-testid="voice-test-panel">
      <div class="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm font-medium text-gray-900">{{ t('extensions.voice.testTitle') }}</p>
          <p class="text-xs text-gray-600">{{ t('extensions.voice.testLead') }}</p>
        </div>
        <button
          type="button"
          class="min-w-[7.5rem] self-start rounded-md px-3 py-2 text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
          :class="phase === 'recording' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'"
          :disabled="testDisabled"
          :aria-busy="phase === 'starting' ? 'true' : undefined"
          data-testid="voice-test-button"
          @click="voice.toggleRecording({ source: 'settings-test' })"
        >{{ phase === 'recording' ? t('extensions.voice.stopTest') : phase === 'starting' ? t('extensions.voice.starting') : t('extensions.voice.startTest') }}</button>
      </div>

      <p v-if="!usable" class="text-xs text-amber-700" data-testid="voice-test-off">{{ t('extensions.voice.turnOnToTest') }}</p>

      <div class="space-y-2">
        <div class="flex items-center justify-between text-xs font-medium text-gray-600">
          <span>{{ t('extensions.voice.inputLevel') }}</span>
          <span class="tabular-nums">{{ Math.round(level * 100) }}%</span>
        </div>
        <div class="h-2 overflow-hidden rounded-full bg-gray-200">
          <div class="h-full rounded-full bg-blue-500 transition-all duration-150 motion-reduce:transition-none" :style="{ width: `${Math.round(level * 100)}%` }" />
        </div>
      </div>

      <div v-if="phase === 'recording' || phase === 'transcribing'" class="rounded-lg border px-3 py-2 text-sm" :class="phase === 'recording' ? 'border-red-200 bg-red-50 text-red-700' : 'border-blue-200 bg-blue-50 text-blue-800'" role="status">
        <template v-if="phase === 'recording'">{{ t('extensions.voice.recording') }}</template>
        <template v-else>
          <span class="inline-flex items-center gap-2">
            <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700 motion-reduce:animate-none" aria-hidden="true" />
            {{ t('extensions.voice.transcribing') }}
          </span>
          <span v-if="slow" class="mt-1 block text-xs text-blue-700" data-testid="voice-test-slow-note">{{ t('extensions.voice.firstNote') }}</span>
        </template>
      </div>

      <div v-if="result" class="space-y-2 rounded-lg border border-gray-200 bg-white px-3 py-3" data-testid="voice-test-result">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm font-medium text-gray-900">{{ t('extensions.voice.lastResult') }}</p>
          <span class="rounded-full px-2 py-0.5 text-[0.6875rem] font-medium" :class="outcome.class">{{ outcome.label }}</span>
        </div>
        <p v-if="result.outcome === 'transcript-ready'" class="text-sm text-gray-800">{{ result.transcript }}</p>
        <p v-else class="text-sm" :class="result.outcome === 'error' ? 'text-red-700' : 'text-gray-600'">{{ result.outcome === 'error' ? result.error : outcome.description }}</p>
        <div v-if="result.diagnostics || result.detectedLanguage" class="flex gap-6 text-xs text-gray-600">
          <span v-if="result.diagnostics">{{ t('extensions.voice.duration', { value: t('extensions.voice.seconds', { value: (result.diagnostics.durationMs / 1000).toFixed(1) }) }) }}</span>
          <span v-if="result.detectedLanguage">{{ t('extensions.voice.detected', { value: languageName(result.detectedLanguage) }) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import { useVoiceInputStore } from '~/stores/voiceInputStore';

/**
 * Voice Input's microphone connection point, drawn by AutoByteus under the extension's page (contract: the microphone
 * stays with AutoByteus): this computer's microphone choice, shared by every microphone button, and the Test, which
 * records here and transcribes with this computer's Voice Input like any dictation (V8).
 */
const props = defineProps<{ usable: boolean }>();
const { t } = useLocalization();
const voice = useVoiceInputStore();
const systemDefaultName = ref<string | null>(null);

const ownsCapture = computed(() => voice.recordingSource === 'settings-test');
const phase = computed(() => (!ownsCapture.value ? 'idle' : voice.isStarting ? 'starting' : voice.isRecording ? 'recording' : voice.isTranscribing ? 'transcribing' : 'idle'));
const testing = computed(() => phase.value !== 'idle');
const level = computed(() => (phase.value === 'recording' ? voice.liveInputLevel : 0));
const result = computed(() => {
  const latest = voice.latestResult;
  return latest?.source === 'settings-test' && !['recording', 'transcribing'].includes(latest.outcome) ? latest : null;
});
const testDisabled = computed(() => !props.usable
  || phase.value === 'starting' || phase.value === 'transcribing'
  || (!ownsCapture.value && (voice.isStarting || voice.isRecording || voice.isTranscribing))
  || voice.microphonePermissionState === 'denied' || voice.selectedAudioInputUnavailable);

const deviceProblem = computed<string | null>(() => {
  if (voice.microphonePermissionState === 'denied') return t('extensions.voice.audioStatus.permissionDenied');
  if (voice.selectedAudioInputUnavailable) return t('extensions.voice.audioStatus.savedUnavailable');
  if (voice.audioInputDevices.length > 0) return null;
  if (voice.microphonePermissionState === 'prompt') return t('extensions.voice.audioStatus.permissionPrompt');
  if (voice.microphonePermissionState === 'unsupported') return t('extensions.voice.audioStatus.unsupported');
  return t('extensions.voice.audioStatus.noDevices');
});

const outcome = computed(() => {
  switch (result.value?.outcome) {
    case 'transcript-ready': return { label: t('extensions.voice.transcriptReady'), class: 'bg-green-50 text-green-700', description: '' };
    case 'no-speech': return { label: t('extensions.voice.outcome.noSpeech'), class: 'bg-amber-50 text-amber-700', description: t('extensions.voice.outcomeDescription.noSpeech') };
    case 'empty-transcript': return { label: t('extensions.voice.outcome.emptyTranscript'), class: 'bg-amber-50 text-amber-700', description: t('extensions.voice.outcomeDescription.emptyTranscript') };
    default: return { label: t('extensions.voice.outcome.error'), class: 'bg-red-50 text-red-700', description: '' };
  }
});
const languageName = (code: string): string => (code === 'en' ? t('extensions.voice.english') : code === 'zh' ? t('extensions.voice.chinese') : code);

/** The name of the microphone the system records from by default (its `default` device), when the system says. */
async function readSystemDefault(): Promise<void> {
  try {
    const devices = await navigator.mediaDevices?.enumerateDevices?.() ?? [];
    const label = devices.find((device) => device.kind === 'audioinput' && device.deviceId === 'default')?.label ?? '';
    systemDefaultName.value = label.replace(/^Default\s*-\s*/i, '').trim() || null;
  } catch {
    systemDefaultName.value = null;
  }
}
async function refreshDevices(): Promise<void> {
  await voice.refreshAudioInputDevices();
  await readSystemDefault();
}

/** The transcription waits while the voice program starts (up to ~30 s, measured): said after about 2 s of waiting. */
const slow = ref(false);
let slowTimer: ReturnType<typeof setTimeout> | null = null;
watch(phase, (next) => {
  if (slowTimer) clearTimeout(slowTimer);
  slow.value = false;
  if (next === 'transcribing') slowTimer = setTimeout(() => { slow.value = true; }, 2000);
});

onMounted(async () => {
  await voice.initialize();
  await refreshDevices();
});
onBeforeUnmount(() => {
  if (slowTimer) clearTimeout(slowTimer);
  void voice.resetSettingsTestState();
});
</script>
