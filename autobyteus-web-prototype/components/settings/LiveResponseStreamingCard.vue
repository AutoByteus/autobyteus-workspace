<template>
  <section
    class="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm"
    data-testid="live-response-streaming-card"
  >
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <h3 class="text-2xl font-semibold leading-tight text-gray-900">
          {{ t('settings.components.settings.LiveResponseStreamingCard.title') }}
        </h3>
        <p class="mt-1 text-sm text-gray-500" id="live-response-streaming-help">
          {{ t('settings.components.settings.LiveResponseStreamingCard.description') }}
        </p>
      </div>
    </div>

    <div class="mt-4">
      <label
        for="live-response-streaming-interval"
        class="block text-sm font-semibold text-gray-900"
      >
        {{ t('settings.components.settings.LiveResponseStreamingCard.label') }}
      </label>
      <div class="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          id="live-response-streaming-interval"
          v-model="draftValue"
          type="number"
          inputmode="numeric"
          step="1"
          min="100"
          max="2000"
          class="h-10 w-full rounded-lg border bg-white px-3 text-sm text-gray-900 focus:ring-2 sm:max-w-52"
          :class="validationMessage ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/20'"
          :disabled="isUnavailable || isBusy"
          :aria-invalid="Boolean(validationMessage)"
          aria-describedby="live-response-streaming-help live-response-streaming-status"
          data-testid="live-response-streaming-input"
        />
        <div class="flex gap-2">
          <button
            type="button"
            class="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            :disabled="!canSave"
            data-testid="live-response-streaming-save"
            @click="save"
          >
            {{ t('settings.components.settings.LiveResponseStreamingCard.save') }}
          </button>
          <button
            type="button"
            class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            :disabled="isUnavailable || isBusy || (!isDirty && effectiveValue === DEFAULT_INTERVAL)"
            data-testid="live-response-streaming-reset"
            @click="reset"
          >
            {{ t('settings.components.settings.LiveResponseStreamingCard.reset') }}
          </button>
        </div>
      </div>
      <div id="live-response-streaming-status" class="mt-3 min-h-5 text-sm">
        <p v-if="isUnavailable" class="text-slate-500">
          {{ t('settings.components.settings.LiveResponseStreamingCard.unavailable') }}
        </p>
        <p v-else-if="validationMessage" class="text-red-600" role="alert">
          {{ validationMessage }}
        </p>
        <p v-else-if="errorMessage" class="text-red-600" role="alert">
          {{ errorMessage }}
        </p>
        <p v-else class="text-slate-500">
          {{ t('settings.components.settings.LiveResponseStreamingCard.effective', { value: displayEffectiveValue }) }}
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import { useServerSettingsStore } from '~/stores/serverSettings'

const SETTING_KEY = 'AUTOBYTEUS_STREAMING_CONTENT_FLUSH_INTERVAL_MS'
const DEFAULT_INTERVAL = 500
const MIN_INTERVAL = 100
const MAX_INTERVAL = 2_000

const store = useServerSettingsStore()
const { t } = useLocalization()
const draftValue = ref('')
const originalValue = ref<number | null>(null)
const isSaving = ref(false)
const errorMessage = ref('')

const effectiveValue = computed(() => store.effectiveStreamingContentFlushIntervalMs)
const displayEffectiveValue = computed(() => effectiveValue.value ?? DEFAULT_INTERVAL)
const parsedDraft = computed(() => /^\d+$/.test(draftValue.value)
  ? Number(draftValue.value)
  : null)
const validationMessage = computed(() => {
  const value = parsedDraft.value
  if (value !== null && Number.isInteger(value) && value >= MIN_INTERVAL && value <= MAX_INTERVAL) {
    return ''
  }
  return t('settings.components.settings.LiveResponseStreamingCard.validation')
})
const isUnavailable = computed(() => effectiveValue.value === null)
const isBusy = computed(() => isSaving.value || store.isLoading || store.isUpdating)
const isDirty = computed(() => parsedDraft.value !== originalValue.value)
const canSave = computed(() =>
  !isUnavailable.value && !isBusy.value && !validationMessage.value && isDirty.value)

watch(effectiveValue, (value) => {
  if (value === null) {
    draftValue.value = ''
    originalValue.value = null
    return
  }
  if (!isDirty.value) {
    draftValue.value = String(value)
  }
  originalValue.value = value
}, { immediate: true })

const persist = async (value: number): Promise<void> => {
  if (isBusy.value || isUnavailable.value) return
  isSaving.value = true
  errorMessage.value = ''
  try {
    await store.updateServerSetting(SETTING_KEY, String(value))
    draftValue.value = String(value)
    originalValue.value = value
  } catch (error: any) {
    errorMessage.value = error?.message || t('settings.components.settings.LiveResponseStreamingCard.saveFailed')
  } finally {
    isSaving.value = false
  }
}

const save = (): void => {
  if (!canSave.value || parsedDraft.value === null) return
  void persist(parsedDraft.value)
}

const reset = (): void => {
  void persist(DEFAULT_INTERVAL)
}
</script>
