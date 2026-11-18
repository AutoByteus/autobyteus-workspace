<template>
  <section class="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm" data-testid="claude-runtime-card">
    <div class="mb-4 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="text-2xl font-semibold leading-tight text-gray-900">
          {{ t('settings.components.settings.ClaudeRuntimeCard.title') }}
        </h3>
        <p class="mt-1 text-sm text-gray-500">
          {{ t('settings.components.settings.ClaudeRuntimeCard.description') }}
        </p>
      </div>
    </div>

    <div
      class="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
      data-testid="claude-runtime-one-hour-cache-row"
    >
      <span class="min-w-0">
        <span class="block text-sm font-semibold text-gray-900">
          {{ t('settings.components.settings.ClaudeRuntimeCard.toggleLabel') }}
        </span>
        <span class="mt-1 block text-sm text-gray-600">
          {{ t('settings.components.settings.ClaudeRuntimeCard.explanation') }}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        class="relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
        :class="switchTrackClass"
        :aria-checked="oneHourCacheEnabled"
        :aria-label="t('settings.components.settings.ClaudeRuntimeCard.toggleLabel')"
        :disabled="isSaving"
        data-testid="claude-runtime-one-hour-cache-toggle"
        @click="toggleOneHourCache"
      >
        <span class="sr-only">{{ t('settings.components.settings.ClaudeRuntimeCard.toggleLabel') }}</span>
        <span
          aria-hidden="true"
          class="inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform"
          :class="switchThumbClass"
        />
      </button>
    </div>

    <div class="mt-4 space-y-1">
      <p class="text-xs text-gray-500" data-testid="claude-runtime-precedence-note">
        {{ t('settings.components.settings.ClaudeRuntimeCard.precedenceNote') }}
      </p>
      <p class="text-xs text-gray-500" data-testid="claude-runtime-future-session-note">
        {{ t('settings.components.settings.ClaudeRuntimeCard.futureSessionNote') }}
      </p>
      <p v-if="errorMessage" class="text-sm text-red-600" data-testid="claude-runtime-error">
        {{ errorMessage }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import { useServerSettingsStore } from '~/stores/serverSettings'

const ONE_HOUR_PROMPT_CACHE_SETTING_KEY = 'CLAUDE_AGENT_SDK_ONE_HOUR_PROMPT_CACHE'

const store = useServerSettingsStore()
const { t } = useLocalization()

const oneHourCacheEnabled = ref(true)
const originalOneHourCacheEnabled = ref(true)
const isSaving = ref(false)
const errorMessage = ref('')

const isDirty = computed(() => oneHourCacheEnabled.value !== originalOneHourCacheEnabled.value)
const switchTrackClass = computed(() => (oneHourCacheEnabled.value ? 'bg-blue-600' : 'bg-slate-300'))
const switchThumbClass = computed(() => (oneHourCacheEnabled.value ? 'translate-x-5' : 'translate-x-0.5'))

// Absent (never saved) means on, matching the server default.
const isOneHourCacheSettingOn = (value: unknown): boolean =>
  typeof value !== 'string' || value.trim().toLowerCase() !== 'false'

const syncFromStore = (): void => {
  const currentEnabled = isOneHourCacheSettingOn(
    store.getSettingByKey(ONE_HOUR_PROMPT_CACHE_SETTING_KEY)?.value,
  )

  if (!isDirty.value) {
    oneHourCacheEnabled.value = currentEnabled
  }

  originalOneHourCacheEnabled.value = currentEnabled
}

watch(() => store.settings, syncFromStore, { deep: true, immediate: true })

const persistOneHourCache = async (enabled: boolean): Promise<void> => {
  const previousEnabled = originalOneHourCacheEnabled.value
  oneHourCacheEnabled.value = enabled

  isSaving.value = true
  errorMessage.value = ''
  try {
    await store.updateServerSetting(ONE_HOUR_PROMPT_CACHE_SETTING_KEY, enabled ? 'true' : 'false')
    originalOneHourCacheEnabled.value = enabled
  } catch (error: any) {
    oneHourCacheEnabled.value = previousEnabled
    errorMessage.value = error?.message || t('settings.components.settings.ClaudeRuntimeCard.saveFailed')
  } finally {
    isSaving.value = false
  }
}

const toggleOneHourCache = (): void => {
  if (isSaving.value) return
  void persistOneHourCache(!oneHourCacheEnabled.value)
}
</script>
