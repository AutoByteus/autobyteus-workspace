<template>
  <section class="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm" data-testid="codex-sandbox-mode-card">
    <div class="mb-4 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="text-2xl font-semibold leading-tight text-gray-900">
          {{ t('settings.components.settings.CodexSandboxModeCard.title') }}
        </h3>
        <p class="mt-1 text-sm text-gray-500">
          {{ t('settings.components.settings.CodexSandboxModeCard.description') }}
        </p>
      </div>
      <div class="shrink-0">
        <button
          type="button"
          class="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 bg-white text-blue-700 hover:bg-blue-50 hover:border-blue-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed transition-colors duration-150"
          :disabled="!isDirty || isSaving"
          :aria-label="t('settings.components.settings.CodexSandboxModeCard.save')"
          :title="t('settings.components.settings.CodexSandboxModeCard.save')"
          data-testid="codex-sandbox-mode-save"
          @click="save"
        >
          <span v-if="isSaving" class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 inline-block"></span>
          <Icon v-else icon="heroicons:check" class="w-4 h-4" />
        </button>
      </div>
    </div>

    <div class="space-y-2" role="radiogroup" :aria-label="t('settings.components.settings.CodexSandboxModeCard.title')">
      <label
        v-for="option in sandboxModeOptions"
        :key="option.value"
        class="block rounded-2xl border p-4 transition-colors cursor-pointer"
        :class="option.value === selectedMode ? 'border-blue-200 bg-blue-50/80' : 'border-slate-200 bg-white hover:border-blue-100 hover:bg-slate-50'"
        :data-testid="`codex-sandbox-mode-option-${option.value}`"
      >
        <div class="flex items-start gap-3">
          <input
            v-model="selectedMode"
            type="radio"
            name="codex-sandbox-mode"
            class="mt-1 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
            :value="option.value"
            :data-testid="`codex-sandbox-mode-radio-${option.value}`"
          >
          <div class="min-w-0">
            <div class="text-sm font-semibold text-gray-900">{{ option.label }}</div>
            <p class="mt-1 text-sm text-gray-600">{{ option.description }}</p>
          </div>
        </div>
      </label>
    </div>

    <div class="mt-4 space-y-1">
      <p class="text-xs text-gray-500" data-testid="codex-sandbox-mode-note">
        {{ t('settings.components.settings.CodexSandboxModeCard.futureSessionNote') }}
      </p>
      <p v-if="isDirty" class="text-sm text-slate-500" data-testid="codex-sandbox-mode-dirty">
        {{ t('settings.components.settings.CodexSandboxModeCard.unsavedChanges') }}
      </p>
      <p v-if="errorMessage" class="text-sm text-red-600" data-testid="codex-sandbox-mode-error">
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
const CODEX_SANDBOX_MODES = ['read-only', 'workspace-write', 'danger-full-access'] as const
type CodexSandboxMode = (typeof CODEX_SANDBOX_MODES)[number]

const DEFAULT_CODEX_SANDBOX_MODE: CodexSandboxMode = 'workspace-write'
const CODEX_SANDBOX_MODE_SET = new Set<string>(CODEX_SANDBOX_MODES)

const isCodexSandboxMode = (value: unknown): value is CodexSandboxMode =>
  typeof value === 'string' && CODEX_SANDBOX_MODE_SET.has(value)

const normalizeCodexSandboxMode = (value: unknown): CodexSandboxMode => {
  const normalizedValue = typeof value === 'string' ? value.trim() : ''
  return isCodexSandboxMode(normalizedValue) ? normalizedValue : DEFAULT_CODEX_SANDBOX_MODE
}

const store = useServerSettingsStore()
const { t } = useLocalization()

const selectedMode = ref<CodexSandboxMode>(DEFAULT_CODEX_SANDBOX_MODE)
const originalMode = ref<CodexSandboxMode>(DEFAULT_CODEX_SANDBOX_MODE)
const isSaving = ref(false)
const errorMessage = ref('')

const sandboxModeOptions = computed(() => [
  {
    value: 'read-only' as const,
    label: t('settings.components.settings.CodexSandboxModeCard.option.readOnly.label'),
    description: t('settings.components.settings.CodexSandboxModeCard.option.readOnly.description'),
  },
  {
    value: 'workspace-write' as const,
    label: t('settings.components.settings.CodexSandboxModeCard.option.workspaceWrite.label'),
    description: t('settings.components.settings.CodexSandboxModeCard.option.workspaceWrite.description'),
  },
  {
    value: 'danger-full-access' as const,
    label: t('settings.components.settings.CodexSandboxModeCard.option.dangerFullAccess.label'),
    description: t('settings.components.settings.CodexSandboxModeCard.option.dangerFullAccess.description'),
  },
])

const isDirty = computed(() => selectedMode.value !== originalMode.value)

const syncFromStore = (): void => {
  const currentMode = normalizeCodexSandboxMode(store.getSettingByKey(CODEX_SANDBOX_SETTING_KEY)?.value)

  if (!isDirty.value) {
    selectedMode.value = currentMode
  }

  originalMode.value = currentMode
}

watch(() => store.settings, syncFromStore, { deep: true, immediate: true })

const save = async (): Promise<void> => {
  if (!isDirty.value || isSaving.value) return

  isSaving.value = true
  errorMessage.value = ''
  try {
    const canonicalMode = selectedMode.value
    await store.updateServerSetting(CODEX_SANDBOX_SETTING_KEY, canonicalMode)
    originalMode.value = canonicalMode
  } catch (error: any) {
    errorMessage.value = error?.message || t('settings.components.settings.CodexSandboxModeCard.saveFailed')
  } finally {
    isSaving.value = false
  }
}
</script>
