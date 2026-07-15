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
      <button
        type="button"
        :class="saveButtonClass"
        :disabled="!canSave"
        :aria-label="t('settings.components.settings.CompactionConfigCard.saveAccessibleName')"
        :aria-busy="isSaving"
        data-testid="compaction-config-save"
        @click="save"
      >
        <span v-if="isSaving" class="inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-blue-700" />
        <Icon v-else icon="heroicons:check" class="h-4 w-4" />
      </button>
    </div>

    <div
      v-if="statusMessage"
      class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
      role="alert"
      data-testid="compaction-status-message"
    >
      {{ statusMessage }}
    </div>

    <div class="space-y-4">
      <div>
        <label for="compaction-strategy-select" class="mb-1 block text-sm font-medium text-gray-900">
          {{ t('settings.components.settings.CompactionConfigCard.compactionStrategy') }}
        </label>
        <select
          id="compaction-strategy-select"
          v-model="strategyId"
          class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 disabled:bg-slate-50"
          :disabled="!strategyControlReady || isSaving"
          :aria-busy="strategyLoading"
          data-testid="compaction-strategy-select"
        >
          <option v-if="unknownStrategyId" :value="unknownStrategyId" disabled>
            {{ t('settings.components.settings.CompactionConfigCard.unavailableStrategy', { id: unknownStrategyId }) }}
          </option>
          <option v-for="option in catalogStore.strategies" :key="option.id" :value="option.id">
            {{ option.name }}
          </option>
        </select>
        <p class="mt-1 text-xs text-gray-500">
          {{ t('settings.components.settings.CompactionConfigCard.strategyHelp') }}
        </p>
        <p v-if="strategyLoading" class="mt-2 text-sm text-gray-500" role="status" data-testid="compaction-strategy-loading">
          {{ t('settings.components.settings.CompactionConfigCard.loadingStrategies') }}
        </p>
        <div v-else-if="catalogStore.error" class="mt-2 text-sm text-red-700" role="alert" data-testid="compaction-strategy-error">
          <span>{{ t('settings.components.settings.CompactionConfigCard.catalogError') }}</span>
          <button type="button" class="ml-2 font-medium underline" :disabled="isSaving" @click="retryReads">
            {{ t('settings.components.settings.CompactionConfigCard.retry') }}
          </button>
        </div>
        <div v-else-if="settingsStore.error && !settingsReady" class="mt-2 text-sm text-red-700" role="alert" data-testid="compaction-effective-error">
          <span>{{ t('settings.components.settings.CompactionConfigCard.effectiveSelectionError') }}</span>
          <button type="button" class="ml-2 font-medium underline" :disabled="isSaving" @click="retryReads">
            {{ t('settings.components.settings.CompactionConfigCard.retry') }}
          </button>
        </div>
        <div v-else-if="catalogReady && catalogStore.strategies.length === 0" class="mt-2 text-sm text-red-700" role="alert" data-testid="compaction-strategy-empty">
          <span>{{ t('settings.components.settings.CompactionConfigCard.emptyCatalog') }}</span>
          <button type="button" class="ml-2 font-medium underline" :disabled="isSaving" @click="retryReads">
            {{ t('settings.components.settings.CompactionConfigCard.retry') }}
          </button>
        </div>
        <p v-if="unknownStrategyId" class="mt-2 text-sm text-amber-700" role="alert" data-testid="compaction-strategy-unknown">
          {{ t('settings.components.settings.CompactionConfigCard.unknownStrategyWarning') }}
        </p>
      </div>

      <div>
        <label for="compaction-ratio-input" class="mb-1 block text-sm font-medium text-gray-900">
          {{ t('settings.components.settings.CompactionConfigCard.compactionTriggerRatio') }}
        </label>
        <input
          id="compaction-ratio-input"
          v-model="triggerRatioPercent"
          type="number"
          min="1"
          max="100"
          class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3"
          :disabled="universalControlsDisabled"
          :aria-invalid="settingsReady && !ratioValid"
          data-testid="compaction-ratio-input"
        >
        <p v-if="settingsReady && !ratioValid" class="mt-1 text-sm text-red-700" role="alert" data-testid="compaction-ratio-error">
          {{ t('settings.components.settings.CompactionConfigCard.invalidRatio') }}
        </p>
      </div>

      <div>
        <label for="compaction-context-override-input" class="mb-1 block text-sm font-medium text-gray-900">
          {{ t('settings.components.settings.CompactionConfigCard.effectiveContextOverride') }}
        </label>
        <input
          id="compaction-context-override-input"
          v-model="activeContextTokensOverride"
          type="number"
          min="1"
          class="h-11 w-full rounded-lg border border-gray-300 bg-white px-3"
          :disabled="universalControlsDisabled"
          :aria-invalid="settingsReady && !overrideValid"
          :placeholder="t('settings.components.settings.CompactionConfigCard.leaveBlankToDisable')"
          data-testid="compaction-context-override-input"
        >
        <p v-if="settingsReady && !overrideValid" class="mt-1 text-sm text-red-700" role="alert" data-testid="compaction-override-error">
          {{ t('settings.components.settings.CompactionConfigCard.invalidOverride') }}
        </p>
      </div>

      <label class="inline-flex items-center gap-3 text-sm text-gray-900" data-testid="compaction-debug-logs-toggle-row">
        <input
          v-model="detailedLogsEnabled"
          type="checkbox"
          class="h-4 w-4 rounded border-gray-300 text-blue-600"
          :disabled="universalControlsDisabled"
          data-testid="compaction-debug-logs-toggle"
        >
        <span>{{ t('settings.components.settings.CompactionConfigCard.enableDetailedCompactionLogs') }}</span>
      </label>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref, watch } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import { useServerSettingsStore } from '~/stores/serverSettings'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useWorkingContextCompactionStrategyCatalogStore } from '~/stores/workingContextCompactionStrategyCatalog'

const COMPACTION_STRATEGY_KEY = 'AUTOBYTEUS_COMPACTION_STRATEGY'
const COMPACTION_TRIGGER_RATIO_KEY = 'AUTOBYTEUS_COMPACTION_TRIGGER_RATIO'
const ACTIVE_CONTEXT_TOKENS_OVERRIDE_KEY = 'AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE'
const COMPACTION_DEBUG_LOGS_KEY = 'AUTOBYTEUS_COMPACTION_DEBUG_LOGS'

const settingsStore = useServerSettingsStore()
const catalogStore = useWorkingContextCompactionStrategyCatalogStore()
const windowNodeContextStore = useWindowNodeContextStore()
const { t } = useLocalization()

const strategyId = ref('')
const triggerRatioPercent = ref('')
const activeContextTokensOverride = ref('')
const detailedLogsEnabled = ref(false)
const isSaving = ref(false)
const statusMessage = ref('')

const normalizeText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}
const parseDetailedLogs = (value: unknown): boolean => ['1', 'true', 'yes', 'on'].includes(normalizeText(value).toLowerCase())
const ratioPercentFromSetting = (value: unknown): string => {
  const ratio = Number(normalizeText(value))
  return Number.isFinite(ratio) && ratio > 0 ? String(Math.round(ratio * 100)) : '80'
}

const currentStrategyId = computed(() => normalizeText(settingsStore.effectiveWorkingContextCompactionStrategyId))
const currentTriggerRatioPercent = computed(() => ratioPercentFromSetting(settingsStore.getSettingByKey(COMPACTION_TRIGGER_RATIO_KEY)?.value))
const currentActiveContextTokensOverride = computed(() => normalizeText(settingsStore.getSettingByKey(ACTIVE_CONTEXT_TOKENS_OVERRIDE_KEY)?.value))
const currentDetailedLogsEnabled = computed(() => parseDetailedLogs(settingsStore.getSettingByKey(COMPACTION_DEBUG_LOGS_KEY)?.value))
const currentRevision = computed(() => windowNodeContextStore.bindingRevision)
const settingsReady = computed(() =>
  settingsStore.settingsBindingRevision === currentRevision.value && Boolean(currentStrategyId.value),
)
const catalogReady = computed(() => catalogStore.bindingRevision === currentRevision.value)
const strategyLoading = computed(() => settingsStore.isLoading || catalogStore.isLoading)
const strategyControlReady = computed(() => settingsReady.value && catalogReady.value && catalogStore.strategies.length > 0)
const universalControlsDisabled = computed(() => !settingsReady.value || isSaving.value)
const unknownStrategyId = computed(() => {
  const selected = normalizeText(strategyId.value)
  if (!selected || catalogStore.strategies.some((option) => option.id === selected)) return ''
  return selected
})

const ratioValid = computed(() => {
  const value = Number(triggerRatioPercent.value)
  return Number.isFinite(value) && value >= 1 && value <= 100
})
const overrideValid = computed(() => {
  const value = normalizeText(activeContextTokensOverride.value)
  if (!value) return true
  const numeric = Number(value)
  return Number.isInteger(numeric) && numeric > 0
})
const strategyDirty = computed(() => normalizeText(strategyId.value) !== currentStrategyId.value)
const isDirty = computed(() =>
  strategyDirty.value ||
  normalizeText(triggerRatioPercent.value) !== currentTriggerRatioPercent.value ||
  normalizeText(activeContextTokensOverride.value) !== currentActiveContextTokensOverride.value ||
  detailedLogsEnabled.value !== currentDetailedLogsEnabled.value,
)
const strategyChangeValid = computed(() =>
  !strategyDirty.value || (
    strategyControlReady.value &&
    catalogStore.strategies.some((option) => option.id === normalizeText(strategyId.value))
  ),
)
const canSave = computed(() =>
  isDirty.value && !isSaving.value && settingsReady.value && ratioValid.value && overrideValid.value && strategyChangeValid.value,
)

const saveButtonBaseClass = 'inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:shadow-none disabled:ring-0'
const saveButtonIdleClass = 'border-slate-200 bg-white text-slate-400'
const saveButtonReadyClass = 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/25 ring-2 ring-blue-200 hover:border-blue-700 hover:bg-blue-700'
const saveButtonClass = computed(() => [
  saveButtonBaseClass,
  canSave.value ? saveButtonReadyClass : saveButtonIdleClass,
])

const syncFromStore = (): void => {
  if (!settingsReady.value || isSaving.value) return
  strategyId.value = currentStrategyId.value
  triggerRatioPercent.value = currentTriggerRatioPercent.value
  activeContextTokensOverride.value = currentActiveContextTokensOverride.value
  detailedLogsEnabled.value = currentDetailedLogsEnabled.value
}

const resetDraftForBinding = (): void => {
  strategyId.value = ''
  triggerRatioPercent.value = ''
  activeContextTokensOverride.value = ''
  detailedLogsEnabled.value = false
}

watch(
  () => [
    settingsStore.settings,
    settingsStore.effectiveWorkingContextCompactionStrategyId,
    settingsStore.settingsBindingRevision,
  ],
  syncFromStore,
  { deep: true },
)

const loadForCurrentBinding = async (force = false): Promise<void> => {
  statusMessage.value = ''
  await Promise.allSettled([
    force ? settingsStore.reloadServerSettings() : settingsStore.fetchServerSettings(),
    catalogStore.fetchStrategies(force),
  ])
  syncFromStore()
}

watch(
  () => windowNodeContextStore.bindingRevision,
  () => {
    resetDraftForBinding()
    void loadForCurrentBinding(false)
  },
  { immediate: true, flush: 'sync' },
)

const retryReads = (): void => {
  void loadForCurrentBinding(true)
}

const buildChanges = (): ReadonlyArray<Readonly<{ key: string; value: string }>> => {
  const changes: Array<Readonly<{ key: string; value: string }>> = []
  if (strategyDirty.value) {
    changes.push({ key: COMPACTION_STRATEGY_KEY, value: normalizeText(strategyId.value) })
  }
  if (normalizeText(triggerRatioPercent.value) !== currentTriggerRatioPercent.value) {
    changes.push({ key: COMPACTION_TRIGGER_RATIO_KEY, value: String(Number(triggerRatioPercent.value) / 100) })
  }
  if (normalizeText(activeContextTokensOverride.value) !== currentActiveContextTokensOverride.value) {
    changes.push({ key: ACTIVE_CONTEXT_TOKENS_OVERRIDE_KEY, value: normalizeText(activeContextTokensOverride.value) })
  }
  if (detailedLogsEnabled.value !== currentDetailedLogsEnabled.value) {
    changes.push({ key: COMPACTION_DEBUG_LOGS_KEY, value: detailedLogsEnabled.value ? 'true' : 'false' })
  }
  return changes
}

const save = async (): Promise<void> => {
  if (!canSave.value) return

  isSaving.value = true
  statusMessage.value = ''
  let completed = false
  try {
    for (const change of buildChanges()) {
      await settingsStore.updateServerSetting(change.key, change.value)
    }
    completed = true
  } catch (error: any) {
    const errorDetail = error?.message ?? t('settings.components.settings.CompactionConfigCard.saveError')
    statusMessage.value = t('settings.components.settings.CompactionConfigCard.saveErrorWithDetail', {
      error: errorDetail,
    })
  } finally {
    isSaving.value = false
    if (completed) syncFromStore()
  }
}
</script>
