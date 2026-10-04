<template>
    <div v-if="voicePhase !== 'idle' || voiceMessage" class="rounded-lg border px-3 py-2.5 text-xs leading-5" :class="voicePhase === 'recording' ? 'border-red-200 bg-red-50 text-red-700' : voiceError ? 'border-red-200 bg-red-50 text-red-700' : 'border-blue-200 bg-blue-50 text-blue-700'" :role="voiceError ? 'alert' : 'status'" :data-testid="statusTestId">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="flex items-center gap-2"><span v-if="voicePhase !== 'idle'" class="h-2 w-2 flex-shrink-0 rounded-full" :class="voicePhase === 'recording' ? 'animate-pulse bg-red-500 motion-reduce:animate-none' : 'bg-blue-500'"></span>{{ voiceStatus }}</span>
        <button v-if="voicePhase === 'recording'" type="button" class="min-h-8 rounded px-1 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500" :data-testid="cancelTestId" @click="cancelVoice">{{ t('projects.ui.cancelRecording') }}</button>
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useVoiceInputStore } from '~/stores/voiceInputStore'
import { useLocalization } from '~/composables/useLocalization'
import type { VoiceTranscriptTarget, VoiceInputLatestResult } from '~/types/voiceInput'

const props = withDefaults(defineProps<{
  target: VoiceTranscriptTarget
  statusTestId?: string
  cancelTestId?: string
}>(), {statusTestId: 'project-voice-status', cancelTestId: 'project-voice-cancel'})
const {t} = useLocalization()
const voice = useVoiceInputStore()
const result = ref<VoiceInputLatestResult | null>(null)
const ownsCapture = computed(() => voice.transcriptTarget?.key === props.target.key)
const voicePhase = computed(() => !ownsCapture.value ? 'idle' : voice.isStarting ? 'starting' : voice.isRecording ? 'recording' : voice.isTranscribing ? 'transcribing' : 'idle')
const voiceError = computed(() => result.value?.outcome === 'error')
const voiceMessage = computed(() => !result.value ? '' : result.value.outcome === 'no-speech' || result.value.outcome === 'empty-transcript' ? t('projects.ui.voiceNoSpeech') : voiceError.value ? t('projects.ui.voiceFailed') : '')
const voiceStatus = computed(() => voicePhase.value === 'recording' ? t('projects.ui.voiceRecording') : voicePhase.value === 'starting' ? t('projects.ui.voiceStarting') : voicePhase.value === 'transcribing' ? t('projects.ui.voiceTranscribing') : voiceMessage.value)
// Capture terminal feedback before the store releases its target in the same tick.
// Success deliberately renders no status node: the editable transcript is the feedback.
watch(() => voice.latestResult, (latest) => {if (ownsCapture.value) result.value = latest}, {flush: 'sync'})
const cancelVoice = () => {result.value = null; void voice.cancelOperationForTarget(props.target.key)}
</script>
