<template>
  <section class="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm" data-testid="codex-full-access-card">
    <div class="mb-4 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="text-2xl font-semibold leading-tight text-gray-900">
          {{ t('settings.components.settings.CodexFullAccessCard.title') }}
        </h3>
        <p class="mt-1 text-sm text-gray-500">
          {{ t('settings.components.settings.CodexFullAccessCard.description') }}
        </p>
      </div>
      <div class="shrink-0">
        <button
          type="button"
          class="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 bg-white text-blue-700 hover:bg-blue-50 hover:border-blue-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed transition-colors duration-150"
          :disabled="!isDirty || isSaving"
          :aria-label="t('settings.components.settings.CodexFullAccessCard.save')"
          :title="t('settings.components.settings.CodexFullAccessCard.save')"
          data-testid="codex-full-access-save"
          @click="save"
        >
          <span v-if="isSaving" class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 inline-block"></span>
          <Icon v-else icon="heroicons:check" class="w-4 h-4" />
        </button>
      </div>
    </div>

    <div
      class="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
      data-testid="codex-full-access-toggle-row"
    >
      <span class="min-w-0">
        <span class="block text-sm font-semibold text-gray-900">
          {{ t('settings.components.settings.CodexFullAccessCard.toggleLabel') }}
        </span>
        <span class="mt-1 block text-sm text-gray-600">
          {{ t('settings.components.settings.CodexFullAccessCard.warning') }}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        class="relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
        :class="switchTrackClass"
        :aria-checked="fullAccessEnabled"
        :aria-label="t('settings.components.settings.CodexFullAccessCard.toggleLabel')"
        :disabled="isSaving"
        data-testid="codex-full-access-toggle"
        @click="toggleFullAccess"
      >
        <span class="sr-only">{{ t('settings.components.settings.CodexFullAccessCard.toggleLabel') }}</span>
        <span
          aria-hidden="true"
          class="inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform"
          :class="switchThumbClass"
        />
      </button>
    </div>

    <div class="mt-4 space-y-1">
      <p class="text-xs text-gray-500" data-testid="codex-full-access-note">
        {{ t('settings.components.settings.CodexFullAccessCard.futureSessionNote') }}
      </p>
      <p v-if="isDirty" class="text-sm text-slate-500" data-testid="codex-full-access-dirty">
        {{ t('settings.components.settings.CodexFullAccessCard.unsavedChanges') }}
      </p>
      <p v-if="errorMessage" class="text-sm text-red-600" data-testid="codex-full-access-error">
        {{ errorMessage }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref, watch } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import { useServerSettingsStore } from '~/stores/serverSettings'

const CODEX_SANDBOX_SETTING_KEY = 'CODEX_APP_SERVER_SANDBOX'
const FULL_ACCESS_SANDBOX_VALUE = 'danger-full-access'
const DEFAULT_SANDBOX_VALUE = 'workspace-write'

const store = useServerSettingsStore()
const { t } = useLocalization()

const fullAccessEnabled = ref(false)
const originalFullAccessEnabled = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')

const isDirty = computed(() => fullAccessEnabled.value !== originalFullAccessEnabled.value)
const switchTrackClass = computed(() => (fullAccessEnabled.value ? 'bg-blue-600' : 'bg-slate-300'))
const switchThumbClass = computed(() => (fullAccessEnabled.value ? 'translate-x-5' : 'translate-x-0.5'))

const isFullAccessSandboxValue = (value: unknown): boolean =>
  typeof value === 'string' && value.trim() === FULL_ACCESS_SANDBOX_VALUE

const toCodexFullAccessSandboxValue = (checked: boolean): string =>
  checked ? FULL_ACCESS_SANDBOX_VALUE : DEFAULT_SANDBOX_VALUE

const syncFromStore = (): void => {
  const currentFullAccessEnabled = isFullAccessSandboxValue(
    store.getSettingByKey(CODEX_SANDBOX_SETTING_KEY)?.value,
  )

  if (!isDirty.value) {
    fullAccessEnabled.value = currentFullAccessEnabled
  }

  originalFullAccessEnabled.value = currentFullAccessEnabled
}

watch(() => store.settings, syncFromStore, { deep: true, immediate: true })

const toggleFullAccess = (): void => {
  if (isSaving.value) return
  fullAccessEnabled.value = !fullAccessEnabled.value
}

const save = async (): Promise<void> => {
  if (!isDirty.value || isSaving.value) return

  isSaving.value = true
  errorMessage.value = ''
  try {
    const canonicalValue = toCodexFullAccessSandboxValue(fullAccessEnabled.value)
    await store.updateServerSetting(CODEX_SANDBOX_SETTING_KEY, canonicalValue)
    originalFullAccessEnabled.value = fullAccessEnabled.value
  } catch (error: any) {
    errorMessage.value = error?.message || t('settings.components.settings.CodexFullAccessCard.saveFailed')
  } finally {
    isSaving.value = false
  }
}
</script>
