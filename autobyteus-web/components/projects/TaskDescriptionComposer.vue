<template>
  <div class="mt-3 rounded-xl border bg-white shadow-sm focus-within:ring-2" :class="error ? 'border-red-400 focus-within:ring-red-500/20' : 'border-slate-300 focus-within:border-blue-400 focus-within:ring-blue-500/20'" data-testid="task-description-composer" @dragover.prevent @drop.prevent="onDrop" @paste="onPaste">
    <input ref="fileInput" type="file" multiple class="hidden" :disabled="disabled || adding" @change="onSelect" />
    <div class="border-b border-slate-100 px-3 py-2">
      <div class="flex min-w-0 items-center gap-2">
        <button type="button" class="flex min-h-11 min-w-0 flex-1 flex-wrap items-center gap-1.5 rounded px-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" :aria-expanded="expanded" aria-controls="task-composer-context-files" @click="expanded = !expanded">
          <Icon v-if="files.length" icon="heroicons:chevron-right" class="h-4 w-4 flex-shrink-0 text-slate-500" :class="expanded ? 'rotate-90' : ''" aria-hidden="true" />
          <span class="text-xs font-medium text-slate-700">{{ t('projects.ui.contextFiles') }} ({{ files.length }})</span>
          <span v-if="!files.length" class="text-xs text-slate-400">{{ t('projects.ui.contextHint') }}</span>
        </button>
        <button type="button" :disabled="disabled || adding" :title="t('projects.ui.attachFiles')" :aria-label="t('projects.ui.attachFiles')" class="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-blue-600 transition-colors hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50" data-testid="task-attach-files" @click="fileInput?.click()"><Icon icon="heroicons:plus" class="h-5 w-5" aria-hidden="true" /></button>
      </div>
      <div v-if="expanded && files.length" id="task-composer-context-files" class="pb-1">
        <TaskContextFiles :files="files" :client="client" :draft-id="draftId" :saved-filenames="savedFilenames" editable :disabled="disabled || adding" @remove="emit('remove', $event)" />
        <div class="mt-2 flex items-center justify-between gap-2">
          <p v-if="adding" class="text-xs text-blue-600" role="status">{{ t('projects.ui.addingFiles') }}</p><span v-else></span>
          <button type="button" :disabled="disabled || adding" class="min-h-9 rounded px-2 text-xs font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50" data-testid="task-clear-files" @click="emit('clear')">{{ t('projects.ui.clearAll') }}</button>
        </div>
      </div>
    </div>

    <textarea id="task-page-description" :value="modelValue" rows="8" :disabled="disabled" :placeholder="placeholder" :aria-invalid="error ? 'true' : 'false'" :aria-describedby="error ? 'task-page-help task-page-error' : 'task-page-help'" class="block w-full resize-y rounded-none border-0 bg-transparent px-3 py-3 text-base leading-6 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 sm:text-sm" data-testid="task-page-description-input" @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)" @keydown.enter.ctrl.exact.prevent="emit('save')" @keydown.enter.meta.exact.prevent="emit('save')" />

    <div v-if="voicePhase !== 'idle' || voiceMessage" class="mx-3 mb-3 rounded-lg border px-3 py-2.5 text-xs leading-5" :class="voicePhase === 'recording' ? 'border-red-200 bg-red-50 text-red-700' : voiceError ? 'border-red-200 bg-red-50 text-red-700' : 'border-blue-200 bg-blue-50 text-blue-700'" :role="voiceError ? 'alert' : 'status'" data-testid="task-voice-status">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="flex items-center gap-2"><span v-if="voicePhase !== 'idle'" class="h-2 w-2 flex-shrink-0 rounded-full" :class="voicePhase === 'recording' ? 'animate-pulse bg-red-500 motion-reduce:animate-none' : 'bg-blue-500'"></span>{{ voiceStatus }}</span>
        <button v-if="voicePhase === 'recording'" type="button" class="min-h-8 rounded px-1 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500" data-testid="task-voice-cancel" @click="cancelVoice">{{ t('projects.ui.cancelRecording') }}</button>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2 rounded-b-xl border-t border-slate-100 px-3 py-2">
      <p class="text-xs text-slate-500">{{ t('projects.ui.shortcut') }}</p>
      <VoiceInputButton :target="target" source="project-task" large :disabled="disabled || adding" data-testid="task-voice-button" />
    </div>
  </div>
  <p class="mt-2 text-xs leading-5 text-slate-400">{{ t('projects.ui.inputPolicy') }}</p>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import TaskContextFiles from './TaskContextFiles.vue'
import VoiceInputButton from '~/components/voiceInput/VoiceInputButton.vue'
import { useVoiceInputStore } from '~/stores/voiceInputStore'
import { useLocalization } from '~/composables/useLocalization'
import type { VoiceTranscriptTarget, VoiceInputLatestResult } from '~/types/voiceInput'
import type { ProjectTaskContextFile } from '~/types/project'
import type { createProjectTaskContextClient } from '~/services/projects/projectTaskContextClient'
const props = defineProps<{modelValue: string; files: ProjectTaskContextFile[]; client: ReturnType<typeof createProjectTaskContextClient>; draftId?: string; savedFilenames?: string[]; target: VoiceTranscriptTarget; disabled?: boolean; adding?: boolean; error?: string; placeholder: string}>()
const emit = defineEmits<{'update:modelValue': [value: string]; add: [files: File[]]; remove: [filename: string]; clear: []; save: []}>()
const {t} = useLocalization(), voice = useVoiceInputStore()
const fileInput = ref<HTMLInputElement | null>(null), expanded = ref(true), result = ref<VoiceInputLatestResult | null>(null)
const ownsCapture = computed(() => voice.transcriptTarget?.key === props.target.key)
const voicePhase = computed(() => !ownsCapture.value ? 'idle' : voice.isStarting ? 'starting' : voice.isRecording ? 'recording' : voice.isTranscribing ? 'transcribing' : 'idle')
const voiceError = computed(() => result.value?.outcome === 'error')
const voiceMessage = computed(() => !result.value ? '' : result.value.outcome === 'transcript-ready' ? t('projects.ui.voiceReady') : result.value.outcome === 'no-speech' || result.value.outcome === 'empty-transcript' ? t('projects.ui.voiceNoSpeech') : voiceError.value ? t('projects.ui.voiceFailed') : '')
const voiceStatus = computed(() => voicePhase.value === 'recording' ? t('projects.ui.voiceRecording') : voicePhase.value === 'starting' ? t('projects.ui.voiceStarting') : voicePhase.value === 'transcribing' ? t('projects.ui.voiceTranscribing') : voiceMessage.value)
watch(() => voice.latestResult, (latest) => {if (ownsCapture.value) result.value = latest}, {flush: 'sync'})
const cancelVoice = () => {result.value = null; void voice.cancelOperationForTarget(props.target.key)}
const addFiles = (files: File[]) => {if (!props.disabled && !props.adding && files.length) {expanded.value = true; emit('add', files)}}
const onSelect = (event: Event) => {const input = event.target as HTMLInputElement; addFiles(Array.from(input.files ?? [])); input.value = ''}
const onDrop = (event: DragEvent) => addFiles(Array.from(event.dataTransfer?.files ?? []))
const onPaste = (event: ClipboardEvent) => {const files = Array.from(event.clipboardData?.files ?? []); if (files.length) {event.preventDefault(); addFiles(files)}}
</script>
