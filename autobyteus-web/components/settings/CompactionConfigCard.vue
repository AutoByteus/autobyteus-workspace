<template>
  <section class="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm" data-testid="compaction-config-card">
    <div class="mb-4 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="text-2xl font-semibold leading-tight text-gray-900">
          {{ t('settings.components.settings.CompactionConfigCard.title') }}
        </h3>
        <p class="mt-1 text-sm text-gray-500">
          {{ t('settings.components.settings.CompactionConfigCard.description') }}
        </p>
      </div>
      <div class="shrink-0">
        <button
          type="button"
          class="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 bg-white text-blue-700 hover:bg-blue-50 hover:border-blue-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed transition-colors duration-150"
          :disabled="isSaving"
          data-testid="compaction-config-save"
          @click="save"
        >
          <span v-if="isSaving" class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 inline-block"></span>
          <Icon v-else icon="heroicons:check" class="w-4 h-4" />
        </button>
      </div>
    </div>

    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-900 mb-1">
          {{ t('settings.components.settings.CompactionConfigCard.compactionModel') }}
        </label>
        <select v-model="compactionModelIdentifier" class="w-full h-11 px-3 border border-gray-300 rounded-lg bg-white" data-testid="compaction-model-select">
          <option value="">{{ t('settings.components.settings.CompactionConfigCard.useActiveRunModel') }}</option>
          <option v-for="option in modelOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-900 mb-1">
          {{ t('settings.components.settings.CompactionConfigCard.compactionTriggerRatio') }}
        </label>
        <input
          v-model="triggerRatioPercent"
          type="number"
          min="1"
          max="100"
          class="w-full h-11 px-3 border border-gray-300 rounded-lg bg-white"
          data-testid="compaction-ratio-input"
        >
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-900 mb-1">
          {{ t('settings.components.settings.CompactionConfigCard.effectiveContextOverride') }}
        </label>
        <input
          v-model="activeContextTokensOverride"
          type="number"
          min="1"
          class="w-full h-11 px-3 border border-gray-300 rounded-lg bg-white"
          :placeholder="t('settings.components.settings.CompactionConfigCard.leaveBlankToDisable')"
          data-testid="compaction-context-override-input"
        >
      </div>

      <label class="inline-flex items-center gap-3 text-sm text-gray-900" data-testid="compaction-debug-logs-toggle-row">
        <input v-model="detailedLogsEnabled" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600" data-testid="compaction-debug-logs-toggle">
        <span>{{ t('settings.components.settings.CompactionConfigCard.enableDetailedCompactionLogs') }}</span>
      </label>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { useServerSettingsStore } from '~/stores/serverSettings'
import { DEFAULT_AGENT_RUNTIME_KIND } from '~/types/agent/AgentRunConfig'
import { getModelSelectionSelectedLabel } from '~/utils/modelSelectionLabel'

const COMPACTION_TRIGGER_RATIO_KEY = 'AUTOBYTEUS_COMPACTION_TRIGGER_RATIO'
const COMPACTION_MODEL_IDENTIFIER_KEY = 'AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER'
const ACTIVE_CONTEXT_TOKENS_OVERRIDE_KEY = 'AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE'
const COMPACTION_DEBUG_LOGS_KEY = 'AUTOBYTEUS_COMPACTION_DEBUG_LOGS'

const store = useServerSettingsStore()
const llmProviderConfigStore = useLLMProviderConfigStore()
const { t } = useLocalization()

const triggerRatioPercent = ref('80')
const compactionModelIdentifier = ref('')
const activeContextTokensOverride = ref('')
const detailedLogsEnabled = ref(false)
const isSaving = ref(false)
const availableProviderGroups = computed(() => llmProviderConfigStore.providersWithModelsForSelection ?? [])

const modelOptions = computed(() => {
  const seen = new Set<string>()
  const options: Array<{ value: string; label: string }> = []

  for (const providerGroup of availableProviderGroups.value) {
    for (const model of providerGroup.models ?? []) {
      const value = String(model.modelIdentifier ?? '').trim()
      if (!value || seen.has(value)) continue
      seen.add(value)
      options.push({
        value,
        label: getModelSelectionSelectedLabel(providerGroup.provider.name, model, DEFAULT_AGENT_RUNTIME_KIND),
      })
    }
  }

  return options.sort((a, b) => a.label.localeCompare(b.label))
})

const syncFromStore = (): void => {
  const ratioRaw = store.getSettingByKey(COMPACTION_TRIGGER_RATIO_KEY)?.value?.trim() ?? ''
  const ratio = Number(ratioRaw)
  triggerRatioPercent.value = Number.isFinite(ratio) && ratio > 0 ? String(Math.round(ratio * 100)) : '80'

  compactionModelIdentifier.value = store.getSettingByKey(COMPACTION_MODEL_IDENTIFIER_KEY)?.value ?? ''
  activeContextTokensOverride.value = store.getSettingByKey(ACTIVE_CONTEXT_TOKENS_OVERRIDE_KEY)?.value ?? ''
  const debugValue = store.getSettingByKey(COMPACTION_DEBUG_LOGS_KEY)?.value?.trim().toLowerCase() ?? ''
  detailedLogsEnabled.value = ['1', 'true', 'yes', 'on'].includes(debugValue)
}

watch(() => store.settings, syncFromStore, { deep: true, immediate: true })

onMounted(async () => {
  if ((llmProviderConfigStore.providersWithModels?.length ?? 0) === 0) {
    try {
      await llmProviderConfigStore.fetchProvidersWithModels(DEFAULT_AGENT_RUNTIME_KIND)
    } catch (_error) {
      // Best effort only; keep the active-model fallback available.
    }
  }
})

const save = async (): Promise<void> => {
  isSaving.value = true
  try {
    const ratioPercent = Number(triggerRatioPercent.value)
    const normalizedRatio = Number.isFinite(ratioPercent) && ratioPercent > 0 ? String(Math.min(100, ratioPercent) / 100) : '0.8'
    const normalizedModelIdentifier = String(compactionModelIdentifier.value ?? '').trim()
    const normalizedActiveContextOverride = String(activeContextTokensOverride.value ?? '').trim()

    await store.updateServerSetting(COMPACTION_TRIGGER_RATIO_KEY, normalizedRatio)
    await store.updateServerSetting(COMPACTION_MODEL_IDENTIFIER_KEY, normalizedModelIdentifier)
    await store.updateServerSetting(ACTIVE_CONTEXT_TOKENS_OVERRIDE_KEY, normalizedActiveContextOverride)
    await store.updateServerSetting(COMPACTION_DEBUG_LOGS_KEY, detailedLogsEnabled.value ? 'true' : 'false')
  } finally {
    isSaving.value = false
  }
}
</script>
