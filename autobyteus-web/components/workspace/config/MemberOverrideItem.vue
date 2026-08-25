<template>
  <div class="bg-white p-3" data-test="member-override-item">
    <div class="mb-3 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-[0.95rem] font-semibold text-slate-800">{{ memberName }}</span>
        <span v-if="isCoordinator" class="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600">
          {{ t('workspace.components.workspace.config.MemberOverrideItem.coordinator') }}
        </span>
      </div>
      <span v-if="hasOverride" class="rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-xs text-amber-600">
        {{ t('workspace.components.workspace.config.MemberOverrideItem.overridden') }}
      </span>
    </div>
    <p
      v-if="memberBreadcrumb && memberBreadcrumb !== memberName"
      class="-mt-2 mb-3 truncate font-mono text-xs text-gray-500"
      :title="memberAddress"
      data-test="member-override-breadcrumb"
    >
      {{ memberBreadcrumb }}
    </p>

    <div class="mb-3">
      <label class="mb-1 block text-xs text-gray-500">{{ t('workspace.components.workspace.config.MemberOverrideItem.runtime_override') }}</label>
      <select
        :id="`override-runtime-${inputIdSuffix}`"
        :value="runtimeSelectionValue"
        :disabled="disabled"
        class="block w-full rounded-md border border-transparent bg-blue-50/40 px-3 py-2 text-sm text-gray-900 ring-1 ring-inset ring-blue-100/80 transition-colors hover:bg-blue-50/70 hover:ring-blue-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
        @change="handleRuntimeChange(($event.target as HTMLSelectElement).value)"
      >
        <option v-if="mode === 'editable'" value="">{{ t('workspace.components.workspace.config.MemberOverrideItem.use_global_runtime_default') }}</option>
        <option
          v-for="option in runtimeOptions"
          :key="option.value"
          :value="option.value"
          :disabled="!option.enabled"
        >
          {{ option.label }}
        </option>
      </select>
      <p v-if="selectedRuntimeUnavailableReason" class="mt-1 text-xs text-amber-600">
        {{ selectedRuntimeUnavailableReason }}
      </p>
      <p
        v-if="runtimeCatalogState?.status === 'loading'"
        role="status"
        class="mt-2 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700"
        data-test="agent-runtime-catalog-loading"
      >{{ t('workspace.components.workspace.config.TeamScopeConfigEditor.catalog_loading', { address: memberAddress }) }}</p>
      <div
        v-else-if="runtimeCatalogState?.status === 'error'"
        role="alert"
        class="mt-2 flex items-start justify-between gap-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        data-test="agent-runtime-catalog-error"
      >
        <span>{{ t('workspace.components.workspace.config.TeamScopeConfigEditor.catalog_error', { address: memberAddress, error: runtimeCatalogState.error || '' }) }}</span>
        <button type="button" class="font-semibold underline" @click="$emit('retry-runtime-catalog', effectiveRuntimeKind)">
          {{ t('workspace.components.workspace.config.TeamScopeConfigEditor.retry') }}
        </button>
      </div>
    </div>

    <div v-if="isUnresolvedInheritedModel" class="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700" data-testid="member-override-warning">
      {{ unresolvedInheritedModelMessage }}
    </div>

    <div class="mb-3">
      <label class="mb-1 block text-xs text-gray-500">{{ t('workspace.components.workspace.config.MemberOverrideItem.llm_model_override') }}</label>
      <SearchableGroupedSelect
        :model-value="selectedModelIdentifier"
        @update:modelValue="handleModelChange"
        :options="groupedModelOptions"
        :disabled="disabled"
        :placeholder="modelPlaceholder"
        :search-placeholder="t('workspace.components.workspace.config.MemberOverrideItem.search_models')"
        variant="quiet"
        class="w-full"
      />
      <p v-if="storedModelUnavailable" class="mt-1 text-xs text-amber-600" data-test="historical-agent-model-unavailable">
        {{ historicalUnavailableMessage }}
      </p>
    </div>

    <WorkspaceSelector
      v-if="isStored"
      class="mb-3"
      :model-value="storedWorkspaceSelection"
      :is-loading="false"
      :error="null"
      :disabled="true"
      :stored-workspace="storedWorkspace"
      :historical-value-unavailable-message="historicalUnavailableMessage"
      :auto-select-default="false"
      control-variant="quiet"
    />

    <div class="mb-3">
      <div class="mb-1 text-xs text-gray-500">
        {{ t('workspace.components.workspace.config.MemberOverrideItem.auto_approve') }}
      </div>
      <input
        :id="`override-auto-${inputIdSuffix}`"
        type="checkbox"
        :checked="autoExecuteValue === true"
        :indeterminate="mode === 'editable' && override?.autoExecuteTools === undefined"
        @change="handleAutoExecuteChange"
        :disabled="disabled"
        class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
      />
      <label :for="`override-auto-${inputIdSuffix}`" class="ml-2 select-none text-xs text-gray-600">
        {{ autoExecuteStateLabel }}
      </label>
    </div>

    <ModelConfigSection
      v-if="effectiveModelIdentifier"
      :schema="modelConfigSchema"
      :model-config="effectiveModelConfig"
      :disabled="disabled"
      :read-only="disabled"
      :compact="true"
      :id-prefix="`config-${inputIdSuffix}`"
      :advanced-initially-expanded="effectiveAdvancedInitiallyExpanded"
      :missing-historical-config="missingHistoricalConfig"
      control-variant="quiet"
      @update:config="emitOverrideWithConfig"
    />
    <HistoricalModelConfigFallback
      v-if="showHistoricalConfigFallback"
      :config="effectiveModelConfig!"
      :title="t('workspace.components.workspace.config.TeamRunConfigForm.saved_model_configuration')"
      :unavailable-message="historicalUnavailableMessage"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AgentConfigOverride, ResolvedTeamRunLaunchConfig } from '~/types/agent/TeamRunConfig'
import type { ProviderWithModels } from '~/stores/llmProviderConfig'
import SearchableGroupedSelect from '~/components/agentTeams/SearchableGroupedSelect.vue'
import ModelConfigSection from './ModelConfigSection.vue'
import HistoricalModelConfigFallback from './HistoricalModelConfigFallback.vue'
import WorkspaceSelector from './WorkspaceSelector.vue'
import { useLocalization } from '~/composables/useLocalization'
import {
  loadRuntimeProviderGroupsForSelection,
  useRuntimeScopedModelSelection,
} from '~/composables/useRuntimeScopedModelSelection'
import {
  buildUnavailableInheritedModelMessage,
  hasExplicitMemberLlmConfigOverride,
  hasExplicitMemberLlmModelOverride,
  hasMeaningfulMemberOverride,
  modelConfigsEqual,
  resolveEffectiveMemberLlmConfig,
  resolveEffectiveMemberRuntimeKind,
} from '~/utils/teamRunConfigUtils'
import { normalizeModelConfigSchema, type UiModelConfigSchema } from '~/utils/llmConfigSchema'
import { getThinkingControlState } from '~/utils/llmThinkingConfigAdapter'
import type { RuntimeModelCatalogState } from '~/stores/teamRunConfigStore'
import type { StoredWorkspaceDisplay } from '~/types/agent/TeamRunFormModel'

const props = withDefaults(defineProps<{
  mode?: 'editable' | 'stored'
  memberName: string
  memberAddress: string
  memberBreadcrumb?: string
  override: AgentConfigOverride | undefined
  globalRuntimeKind: string
  globalLlmModel: string
  globalLlmConfig?: Record<string, unknown> | null
  disabled: boolean
  isCoordinator?: boolean
  advancedInitiallyExpanded?: boolean
  missingHistoricalConfig?: boolean
  runtimeCatalogState?: RuntimeModelCatalogState
  effectiveConfig?: Readonly<ResolvedTeamRunLaunchConfig>
  storedWorkspace?: StoredWorkspaceDisplay | null
  storedCustomized?: boolean
}>(), { mode: 'editable' })

const emit = defineEmits<{
  (e: 'update:override', memberAddress: string, override: AgentConfigOverride | null): void
  (e: 'retry-runtime-catalog', runtimeKind: string): void
}>()
const { t } = useLocalization()
const mode = computed(() => props.mode)
const isStored = computed(() => props.mode === 'stored')
const historicalUnavailableMessage = computed(() => t('workspace.components.workspace.config.TeamRunConfigForm.historical_value_unavailable'))
const storedWorkspaceSelection = computed(() => {
  const workspaceId = props.storedWorkspace?.workspaceId ?? props.effectiveConfig?.workspaceId ?? null
  const rootPath = props.storedWorkspace?.rootPath ?? props.effectiveConfig?.workspaceRootPath ?? ''
  return workspaceId
    ? { mode: 'existing' as const, existingWorkspaceId: workspaceId, newWorkspacePath: rootPath }
    : { mode: 'new' as const, existingWorkspaceId: null, newWorkspacePath: rootPath }
})

const {
  effectiveRuntimeKind,
  groupedModelOptions,
  hasModelIdentifier,
  modelConfigSchemaByIdentifier,
  runtimeOptions,
  selectedRuntimeUnavailableReason,
} = useRuntimeScopedModelSelection({
  runtimeKind: computed(() => isStored.value
    ? props.effectiveConfig?.runtimeKind
    : resolveEffectiveMemberRuntimeKind(props.override, props.globalRuntimeKind)),
})

const storedRuntimeOverrideValue = computed(() => props.override?.runtimeKind || '')
const runtimeSelectionValue = computed(() => isStored.value
  ? (props.effectiveConfig?.runtimeKind || '')
  : storedRuntimeOverrideValue.value)
const inputIdSuffix = computed(() => props.memberAddress.replace(/[^a-zA-Z0-9_-]+/g, '-'))
const explicitModelIdentifier = computed(() => props.override?.llmModelIdentifier || '')
const memberAdvancedExplicitlyExpanded = ref(false)
const hasOverride = computed(() => isStored.value
  ? props.storedCustomized === true
  : hasMeaningfulMemberOverride(props.override))
const globalModelIdentifier = computed(() => props.globalLlmModel || '')
const hasExplicitModelOverride = computed(() => hasExplicitMemberLlmModelOverride(props.override))
const inheritedGlobalModelAvailable = computed(() => {
  if (!globalModelIdentifier.value) {
    return false
  }
  return hasModelIdentifier(globalModelIdentifier.value)
})

const isUnresolvedInheritedModel = computed(() =>
  Boolean(
    props.override?.runtimeKind &&
      !hasExplicitModelOverride.value &&
      globalModelIdentifier.value &&
      !inheritedGlobalModelAvailable.value,
  ),
)

const unresolvedInheritedModelMessage = computed(() =>
  buildUnavailableInheritedModelMessage({
    globalLlmModelIdentifier: globalModelIdentifier.value,
    runtimeKind: effectiveRuntimeKind.value,
    memberName: props.memberName,
  }),
)

const effectiveModelIdentifier = computed(() => {
  if (isStored.value) return props.effectiveConfig?.llmModelIdentifier || ''
  if (hasExplicitModelOverride.value) {
    return explicitModelIdentifier.value
  }
  if (isUnresolvedInheritedModel.value) {
    return ''
  }
  return globalModelIdentifier.value
})

const effectiveModelConfig = computed(() => {
  if (isStored.value) return props.effectiveConfig?.llmConfig ?? null
  if (isUnresolvedInheritedModel.value) {
    return null
  }
  return resolveEffectiveMemberLlmConfig(props.override, props.globalLlmConfig)
})

const modelConfigSchema = computed(() =>
  modelConfigSchemaByIdentifier(effectiveModelIdentifier.value),
)
const selectedModelIdentifier = computed(() => isStored.value
  ? effectiveModelIdentifier.value
  : explicitModelIdentifier.value)
const storedModelUnavailable = computed(() => Boolean(
  isStored.value && selectedModelIdentifier.value && !hasModelIdentifier(selectedModelIdentifier.value),
))
const showHistoricalConfigFallback = computed(() => Boolean(
  isStored.value &&
  effectiveModelConfig.value &&
  Object.keys(effectiveModelConfig.value).length > 0 &&
  !modelConfigSchema.value,
))
const effectiveAdvancedInitiallyExpanded = computed(() =>
  props.advancedInitiallyExpanded === true || memberAdvancedExplicitlyExpanded.value,
)

const shouldOpenAdvancedForSchema = (
  schema: UiModelConfigSchema | null,
  config: Record<string, unknown> | null | undefined,
) => {
  const thinkingState = getThinkingControlState(schema, config)
  return thinkingState.supported && thinkingState.enabled
}

const modelConfigSchemaFromRows = (
  rows: ProviderWithModels[],
  modelIdentifier: string | null | undefined,
): UiModelConfigSchema | null => {
  const normalizedIdentifier = (modelIdentifier || '').trim()
  if (!normalizedIdentifier) {
    return null
  }

  for (const row of rows) {
    const model = row.models.find((entry) => entry.modelIdentifier === normalizedIdentifier)
    if (!model?.configSchema) {
      continue
    }
    const normalized = normalizeModelConfigSchema(model.configSchema)
    if (normalized && Object.keys(normalized).length > 0) {
      return normalized
    }
  }

  return null
}

const maybeOpenMemberAdvancedForSchema = (
  schema: UiModelConfigSchema | null,
  config: Record<string, unknown> | null | undefined,
) => {
  if (shouldOpenAdvancedForSchema(schema, config)) {
    memberAdvancedExplicitlyExpanded.value = true
  }
}

const modelPlaceholder = computed(() =>
  isStored.value
    ? selectedModelIdentifier.value
    : isUnresolvedInheritedModel.value
      ? t('workspace.components.workspace.config.MemberOverrideItem.choose_compatible_member_model')
      : t('workspace.components.workspace.config.MemberOverrideItem.use_global_model_default'),
)

const autoExecuteStateLabel = computed(() => {
  if (isStored.value) {
    return props.effectiveConfig?.autoExecuteTools
      ? t('workspace.components.workspace.config.MemberOverrideItem.auto_execute_on')
      : t('workspace.components.workspace.config.MemberOverrideItem.auto_execute_off')
  }
  if (props.override?.autoExecuteTools === undefined) {
    return t('workspace.components.workspace.config.MemberOverrideItem.auto_execute_use_global')
  }
  return props.override.autoExecuteTools
    ? t('workspace.components.workspace.config.MemberOverrideItem.auto_execute_on')
    : t('workspace.components.workspace.config.MemberOverrideItem.auto_execute_off')
})
const autoExecuteValue = computed(() => isStored.value
  ? props.effectiveConfig?.autoExecuteTools === true
  : props.override?.autoExecuteTools)

const buildOverride = (input: {
  runtimeKind?: string
  llmModelIdentifier?: string
  autoExecuteTools?: boolean
  llmConfig?: Record<string, unknown> | null
}): AgentConfigOverride | null => {
  const override: AgentConfigOverride = {}

  if (input.runtimeKind) {
    override.runtimeKind = input.runtimeKind
  }

  if (input.llmModelIdentifier) {
    override.llmModelIdentifier = input.llmModelIdentifier
  }

  if (input.autoExecuteTools !== undefined) {
    override.autoExecuteTools = input.autoExecuteTools
  }

  if (input.llmConfig !== undefined) {
    override.llmConfig = input.llmConfig
  }

  return hasMeaningfulMemberOverride(override) ? override : null
}

watch(
  () => [effectiveRuntimeKind.value, explicitModelIdentifier.value],
  async () => {
    if (props.disabled) {
      return
    }

    if (!hasExplicitModelOverride.value || !explicitModelIdentifier.value) {
      return
    }

    if (hasModelIdentifier(explicitModelIdentifier.value)) {
      return
    }

    emit(
      'update:override',
      props.memberAddress,
      buildOverride({
        runtimeKind: props.override?.runtimeKind,
        autoExecuteTools: props.override?.autoExecuteTools,
      }),
    )
  },
)

const handleRuntimeChange = async (value: string) => {
  if (props.disabled) return
  const nextRuntimeKind = value || undefined
  const runtimeChanged = nextRuntimeKind !== (props.override?.runtimeKind || undefined)
  const effectiveNextRuntimeKind = nextRuntimeKind || props.globalRuntimeKind
  const nextRows = await loadRuntimeProviderGroupsForSelection(effectiveNextRuntimeKind)
  const nextModelIdentifiers = nextRows.flatMap((row) => row.models.map((model) => model.modelIdentifier))
  const retainedExplicitModel = explicitModelIdentifier.value && nextModelIdentifiers.includes(explicitModelIdentifier.value)
    ? explicitModelIdentifier.value
    : undefined
  const effectiveNextModel = retainedExplicitModel ||
    (nextModelIdentifiers.includes(globalModelIdentifier.value) ? globalModelIdentifier.value : undefined)
  const retainedExplicitConfig =
    !runtimeChanged &&
    retainedExplicitModel &&
    hasExplicitMemberLlmConfigOverride(props.override)
      ? (props.override?.llmConfig ?? null)
      : undefined
  const effectiveNextConfig = retainedExplicitConfig ?? (props.globalLlmConfig ?? null)

  emit(
    'update:override',
    props.memberAddress,
    buildOverride({
      runtimeKind: nextRuntimeKind,
      llmModelIdentifier: retainedExplicitModel,
      autoExecuteTools: props.override?.autoExecuteTools,
      llmConfig:
        !runtimeChanged && retainedExplicitModel && hasExplicitMemberLlmConfigOverride(props.override)
          ? (props.override?.llmConfig ?? null)
          : undefined,
    }),
  )

  if (runtimeChanged) {
    maybeOpenMemberAdvancedForSchema(
      modelConfigSchemaFromRows(nextRows, effectiveNextModel),
      effectiveNextConfig,
    )
  }
}

const emitOverrideWithConfig = (nextConfig: Record<string, unknown> | null | undefined) => {
  if (props.disabled) return
  const explicitConfig = modelConfigsEqual(nextConfig ?? null, props.globalLlmConfig ?? null)
    ? undefined
    : (nextConfig ?? null)

  emit(
    'update:override',
    props.memberAddress,
    buildOverride({
      runtimeKind: props.override?.runtimeKind,
      llmModelIdentifier: props.override?.llmModelIdentifier,
      autoExecuteTools: props.override?.autoExecuteTools,
      llmConfig: explicitConfig,
    }),
  )
}

const handleModelChange = (value: string) => {
  if (props.disabled) return
  const modelChanged = value !== explicitModelIdentifier.value
  if (modelChanged && value) {
    maybeOpenMemberAdvancedForSchema(
      modelConfigSchemaByIdentifier(value),
      props.globalLlmConfig ?? null,
    )
  }

  emit(
    'update:override',
    props.memberAddress,
    buildOverride({
      runtimeKind: props.override?.runtimeKind,
      llmModelIdentifier: value || undefined,
      autoExecuteTools: props.override?.autoExecuteTools,
      llmConfig:
        !modelChanged && hasExplicitMemberLlmConfigOverride(props.override)
          ? (props.override?.llmConfig ?? null)
          : undefined,
    }),
  )
}

const handleAutoExecuteChange = () => {
  if (props.disabled) return
  let newValue: boolean | undefined
  if (props.override?.autoExecuteTools === undefined) {
    newValue = true
  } else if (props.override.autoExecuteTools === true) {
    newValue = false
  } else {
    newValue = undefined
  }

  emit(
    'update:override',
    props.memberAddress,
    buildOverride({
      runtimeKind: props.override?.runtimeKind,
      llmModelIdentifier: props.override?.llmModelIdentifier,
      autoExecuteTools: newValue,
      llmConfig: hasExplicitMemberLlmConfigOverride(props.override)
        ? (props.override?.llmConfig ?? null)
        : undefined,
    }),
  )
}
</script>
