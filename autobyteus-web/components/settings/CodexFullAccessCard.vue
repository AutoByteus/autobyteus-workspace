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

    <label
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
      <input
        v-model="fullAccessEnabled"
        type="checkbox"
        class="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        data-testid="codex-full-access-toggle"
      >
    </label>

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
