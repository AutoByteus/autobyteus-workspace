<template>
  <section class="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm" data-testid="embedding-models-card" aria-labelledby="embedding-models-heading">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div class="min-w-0 max-w-3xl">
        <h3 id="embedding-models-heading" class="text-2xl font-semibold leading-tight text-gray-900">{{ t('settings.search.models.title') }}</h3>
        <p class="mt-1 text-sm text-gray-500" data-testid="embedding-models-footnote">{{ t('settings.search.models.description') }} {{ t('settings.search.models.sourceBefore') }}<a href="https://huggingface.co" target="_blank" rel="noopener noreferrer" class="underline decoration-gray-300 underline-offset-2 hover:text-gray-800 hover:decoration-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1" data-testid="embedding-source-link">{{ t('settings.search.models.sourceName') }}</a>{{ t('settings.search.models.sourceAfter') }}</p>
      </div>
      <p class="flex-shrink-0 text-sm text-gray-500 sm:pt-1.5" data-testid="embedding-disk-total">{{ t('settings.search.models.disk', { size: t('settings.search.facts.size', { mb: toMb(status.onDiskBytes) }) }) }}</p>
    </div>

    <ul class="mt-5 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200" :aria-label="t('settings.search.models.listLabel')">
      <li
        v-for="model in status.models"
        :key="model.id"
        tabindex="-1"
        class="px-4 py-4 focus:outline-none"
        :class="model.activeDisplay ? 'bg-blue-50/40' : 'bg-white'"
        :data-testid="`embedding-model-${model.id}`"
        :data-state="rowState(model)"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div class="min-w-0">
            <div class="flex flex-wrap items-baseline gap-x-2">
              <h4 class="text-base font-semibold text-gray-900">{{ model.displayName }}</h4>
              <span v-if="model.id === status.defaultModelId" class="text-xs text-gray-400">{{ t('settings.search.models.defaultTag') }}</span>
            </div>

            <!-- one status line: a dot and plain words, never a boxed pill -->
            <p class="mt-1 flex flex-wrap items-center gap-x-2 text-sm" :data-testid="`embedding-model-${model.id}-status`">
              <template v-if="model.activeDisplay">
                <span class="font-medium text-blue-700">{{ t('settings.search.state.active') }}</span>
                <span class="text-gray-300" aria-hidden="true">·</span>
                <span v-if="model.activeDisplay.state === 'READY'" class="inline-flex items-center gap-1.5 text-green-700"><span class="h-1.5 w-1.5 rounded-full bg-green-600"></span>{{ t('settings.search.readiness.ready') }}</span>
                <span v-else-if="model.activeDisplay.state === 'PREPARING'" class="inline-flex items-center gap-1.5 text-amber-700"><span class="h-3 w-3 animate-spin rounded-full border-2 border-amber-300 border-t-amber-600"></span>{{ t('settings.search.readiness.preparing') }}</span>
                <span v-else-if="model.activeDisplay.state === 'NOT_DOWNLOADED'" class="text-gray-400">{{ t('settings.search.state.notDownloaded') }}</span>
                <span v-else class="inline-flex items-center gap-1.5 text-red-700"><span class="h-1.5 w-1.5 rounded-full bg-red-600"></span>{{ t('settings.search.readiness.unavailable') }}</span>
              </template>
              <span v-else-if="model.file.state === 'DOWNLOADING'" class="inline-flex items-center gap-1.5 text-amber-700"><span class="h-3 w-3 animate-spin rounded-full border-2 border-amber-300 border-t-amber-600"></span>{{ t('settings.search.state.downloading') }}</span>
              <span v-else-if="model.file.state === 'DOWNLOADED'" class="text-gray-700">{{ t('settings.search.state.downloaded') }}</span>
              <span v-else class="text-gray-400">{{ t('settings.search.state.notDownloaded') }}</span>
            </p>

            <!-- the catalog facts: one quiet line (labels live in the aria text) -->
            <p class="mt-1.5 flex flex-wrap gap-x-3 text-sm text-gray-500 sm:gap-x-0" :data-testid="`embedding-model-${model.id}-facts`">
              <span v-for="(fact, i) in facts(model)" :key="fact.id" class="whitespace-nowrap"><span v-if="i > 0" class="mx-1.5 hidden text-gray-300 sm:inline" aria-hidden="true">·</span><span class="sr-only">{{ fact.label }}: </span>{{ fact.value }}</span>
            </p>

            <!-- progress: a bar and one line, no box -->
            <div v-if="!model.activeDisplay && model.file.state === 'DOWNLOADING'" class="mt-3 max-w-md" :data-testid="`embedding-model-${model.id}-progress`">
              <div class="h-1.5 overflow-hidden rounded-full bg-gray-100" role="progressbar" :aria-label="`${model.displayName}: ${t('settings.search.state.downloading')}`" aria-valuemin="0" :aria-valuemax="toMb(model.file.total ?? model.downloadBytes)" :aria-valuenow="toMb(model.file.done)">
                <div class="h-full rounded-full bg-blue-500 transition-all duration-300" :style="{ width: `${percentOf(model.file.done, model.file.total)}%` }"></div>
              </div>
              <p class="mt-1.5 text-xs text-gray-500">{{ t('settings.search.progress.download', { done: toMb(model.file.done), total: toMb(model.file.total ?? model.downloadBytes) }) }} · {{ percentOf(model.file.done, model.file.total) }}%</p>
            </div>
            <div v-if="model.activeDisplay?.state === 'PREPARING'" class="mt-3 max-w-md" :data-testid="`embedding-model-${model.id}-preparing`">
              <template v-if="model.activeDisplay.phase === 'DOWNLOADING'">
                <div class="h-1.5 overflow-hidden rounded-full bg-gray-100" role="progressbar" :aria-label="`${model.displayName}: ${t('settings.search.readiness.preparing')}`" aria-valuemin="0" :aria-valuemax="toMb(model.activeDisplay.total)" :aria-valuenow="toMb(model.activeDisplay.done)">
                  <div class="h-full rounded-full bg-blue-500 transition-all duration-300" :style="{ width: `${percentOf(model.activeDisplay.done, model.activeDisplay.total)}%` }"></div>
                </div>
                <p class="mt-1.5 text-xs text-gray-500">{{ t('settings.search.progress.preparingDownload', { done: toMb(model.activeDisplay.done), total: toMb(model.activeDisplay.total) }) }} · {{ percentOf(model.activeDisplay.done, model.activeDisplay.total) }}%</p>
              </template>
              <template v-else>
                <div class="h-1.5 overflow-hidden rounded-full bg-gray-100"><div class="h-full w-1/3 animate-pulse rounded-full bg-blue-500"></div></div>
                <p class="mt-1.5 text-xs text-gray-500">{{ t('settings.search.progress.preparingLoad') }}</p>
              </template>
            </div>

            <!-- problems: plain text lines; reasons come from the server -->
            <div v-if="model.activeDisplay?.state === 'UNAVAILABLE'" class="mt-3 text-sm" role="alert" :data-testid="`embedding-model-${model.id}-unavailable`">
              <p class="text-red-700">{{ t('settings.search.unavailable.reason', { reason: model.activeDisplay.reason ?? '' }) }}</p>
            </div>
            <div v-if="!model.activeDisplay && model.file.state === 'FAILED'" class="mt-3 text-sm" role="alert" :data-testid="`embedding-model-${model.id}-failed`">
              <p class="text-red-700">{{ t('settings.search.failed.reason', { reason: model.file.reason ?? '' }) }}</p>
            </div>
          </div>

          <div class="flex flex-shrink-0 flex-wrap items-center gap-2" :data-testid="`embedding-model-${model.id}-actions`">
            <template v-if="model.activeDisplay">
              <button v-if="model.activeDisplay.state === 'NOT_DOWNLOADED'" type="button" :class="secondaryButton" :disabled="working === model.id" :data-testid="`embedding-model-${model.id}-download`" @click="run(model.id, () => actions.download(model.id))">{{ t('settings.search.actions.download') }}</button>
              <button v-if="model.activeDisplay.state === 'UNAVAILABLE'" type="button" :class="secondaryButton" :disabled="working === model.id" :data-testid="`embedding-model-${model.id}-retry`" @click="run(model.id, () => actions.retryModel())">{{ t('settings.search.actions.retry') }}</button>
            </template>
            <template v-else-if="model.file.state === 'DOWNLOADING'">
              <button type="button" :class="secondaryButton" :disabled="working === model.id" :data-testid="`embedding-model-${model.id}-cancel`" @click="run(model.id, () => actions.cancelDownload(model.id))">{{ t('settings.search.actions.cancel') }}</button>
            </template>
            <template v-else-if="confirmingRemove !== model.id">
              <button v-if="model.file.state === 'NOT_DOWNLOADED'" type="button" :class="secondaryButton" :disabled="working === model.id" :data-testid="`embedding-model-${model.id}-download`" @click="run(model.id, () => actions.download(model.id))">{{ t('settings.search.actions.download') }}</button>
              <button v-if="model.file.state === 'FAILED'" type="button" :class="secondaryButton" :disabled="working === model.id" :data-testid="`embedding-model-${model.id}-retry`" @click="run(model.id, () => actions.download(model.id))">{{ t('settings.search.actions.retry') }}</button>
              <button type="button" :class="secondaryButton" :disabled="working === model.id" :data-testid="`embedding-model-${model.id}-use`" @click="$emit('use', model.id)">{{ t('settings.search.actions.use') }}</button>
              <button v-if="model.file.state === 'DOWNLOADED'" type="button" :class="textDangerButton" :data-testid="`embedding-model-${model.id}-remove`" @click="openRemove(model.id)">{{ t('settings.search.actions.remove') }}</button>
            </template>
          </div>
        </div>

        <!-- Remove: inline confirmation -->
        <div v-if="confirmingRemove === model.id && !model.activeDisplay && model.file.state === 'DOWNLOADED'" class="mt-3 flex flex-col gap-3 rounded-lg bg-gray-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between" role="group" :aria-label="t('settings.search.actions.remove')" :data-testid="`embedding-model-${model.id}-remove-confirmation`" @keydown.esc.prevent="closeRemove(model.id)">
          <p class="text-sm text-gray-700">{{ t('settings.search.removeConfirm.text', { name: model.displayName, size: toMb(model.downloadBytes) }) }}</p>
          <div class="flex flex-shrink-0 items-center gap-2">
            <button type="button" class="inline-flex min-h-9 items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1" :disabled="working === model.id" :data-testid="`embedding-model-${model.id}-remove-confirm`" @click="confirmRemove(model.id)">{{ t('settings.search.actions.remove') }}</button>
            <button type="button" :class="secondaryButton" :data-testid="`embedding-model-${model.id}-remove-cancel`" @click="closeRemove(model.id)">{{ t('settings.search.actions.cancel') }}</button>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { EmbeddingSettings } from '~/composables/settings/useEmbeddingSettings'
import type { EmbeddingModelInfo, EmbeddingModelsStatus } from '~/types/embeddingSettings'
import { focusTestId, languageLabelKey, percentOf, toMb } from './embeddingPresentation'

const props = defineProps<{
  status: EmbeddingModelsStatus
  actions: Pick<EmbeddingSettings, 'download' | 'cancelDownload' | 'remove' | 'retryModel'>
}>()
defineEmits<{ (e: 'use', modelId: string): void }>()

const { t } = useLocalization()
const confirmingRemove = ref<string | null>(null)
/** The model whose action is on its way (its buttons are disabled meanwhile). */
const working = ref<string | null>(null)

const run = async (modelId: string, action: () => Promise<boolean>) => {
  working.value = modelId
  try {
    return await action()
  } finally {
    working.value = null
  }
}

// Two facts at most: the language label (when the catalog gives one) and the download size.
const facts = (model: EmbeddingModelInfo) => {
  const languageKey = languageLabelKey(model.languages)
  return [
    ...(languageKey ? [{ id: 'languages', label: t('settings.search.facts.languages'), value: t(languageKey) }] : []),
    { id: 'size', label: t('settings.search.facts.download'), value: t('settings.search.facts.size', { mb: toMb(model.downloadBytes) }) },
  ]
}
const rowState = (model: EmbeddingModelInfo) =>
  model.activeDisplay ? `active-${model.activeDisplay.state.toLowerCase()}` : model.file.state.toLowerCase()

// Focus follows the inline confirmation: into it (on the safe Cancel), then back to the row's own button or the row.
const openRemove = (modelId: string) => { confirmingRemove.value = modelId; void focusTestId(`embedding-model-${modelId}-remove-cancel`) }
const closeRemove = (modelId: string) => { confirmingRemove.value = null; void focusTestId(`embedding-model-${modelId}-remove`) }
const confirmRemove = async (modelId: string) => {
  await run(modelId, () => props.actions.remove(modelId))
  confirmingRemove.value = null
  void focusTestId(`embedding-model-${modelId}`)
}

const secondaryButton = 'inline-flex min-h-9 items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50'
const textDangerButton = 'inline-flex min-h-9 items-center rounded-md px-2.5 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1'
</script>
