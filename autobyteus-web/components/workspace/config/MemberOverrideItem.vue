<template>
  <div class="bg-white p-3" data-test="member-override-item">
    <div class="mb-3 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-[0.95rem] font-semibold text-slate-800">{{ node.displayName }}</span>
        <span v-if="node.isCoordinator" class="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600">
          {{ t('workspace.components.workspace.config.MemberOverrideItem.coordinator') }}
        </span>
      </div>
      <span v-if="node.isCustomized" class="rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-xs text-amber-600">
        {{ t('workspace.components.workspace.config.MemberOverrideItem.overridden') }}
      </span>
    </div>
    <p
      v-if="memberBreadcrumb && memberBreadcrumb !== node.displayName"
      class="-mt-2 mb-3 truncate font-mono text-xs text-gray-500"
      :title="node.address"
      data-test="member-override-breadcrumb"
    >
      {{ memberBreadcrumb }}
    </p>

    <RuntimeModelConfigFields
      v-if="existingNode"
      class="mb-3"
      :runtime-kind="node.effectiveConfig.runtimeKind"
      :llm-model-identifier="node.effectiveConfig.llmModelIdentifier"
      :llm-config="node.effectiveConfig.llmConfig"
      :runtime-selection-locked="true"
      :model-selection-locked="true"
      :model-config-disabled="disabled"
      :model-config-read-only="disabled"
      :historical-model-config="true"
      :validation-errors="modelConfigFieldErrors"
      :id-prefix="`existing-${inputIdSuffix}`"
      control-variant="quiet"
      @update:llm-config="emit('update-existing-model-config', node.address, $event)"
      @schema-state="emit('schema-state', node.address, $event)"
    />

    <div v-if="!existingNode" class="mb-3">
      <label class="mb-1 block text-xs text-gray-500">{{ t('workspace.components.workspace.config.MemberOverrideItem.runtime_override') }}</label>
      <select
        :id="`override-runtime-${inputIdSuffix}`"
        :value="runtimeSelectionValue"
        :disabled="isInteractionDisabled"
        class="block w-full rounded-md border border-transparent bg-blue-50/40 px-3 py-2 text-sm text-gray-900 ring-1 ring-inset ring-blue-100/80 transition-colors hover:bg-blue-50/70 hover:ring-blue-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
        @change="handleRuntimeChange(($event.target as HTMLSelectElement).value)"
      >
        <option v-if="editableNode" value="">{{ t('workspace.components.workspace.config.MemberOverrideItem.use_global_runtime_default') }}</option>
        <option v-for="option in runtimeOptions" :key="option.value" :value="option.value" :disabled="!option.enabled">
          {{ option.label }}
        </option>
      </select>
      <p v-if="selectedRuntimeUnavailableReason" class="mt-1 text-xs text-amber-600">{{ selectedRuntimeUnavailableReason }}</p>
      <p
        v-if="editableNode?.runtimeCatalogState.status === 'loading'"
        role="status"
        class="mt-2 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700"
        data-test="agent-runtime-catalog-loading"
      >{{ t('workspace.components.workspace.config.TeamScopeConfigEditor.catalog_loading', { address: node.address }) }}</p>
      <div
        v-else-if="editableNode?.runtimeCatalogState.status === 'error'"
        role="alert"
        class="mt-2 flex items-start justify-between gap-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        data-test="agent-runtime-catalog-error"
      >
        <span>{{ t('workspace.components.workspace.config.TeamScopeConfigEditor.catalog_error', { address: node.address, error: editableNode.runtimeCatalogState.error || '' }) }}</span>
        <button type="button" class="font-semibold underline disabled:opacity-50" :disabled="isInteractionDisabled" @click="retryRuntimeCatalog">
          {{ t('workspace.components.workspace.config.TeamScopeConfigEditor.retry') }}
        </button>
      </div>
    </div>

    <div v-if="isUnresolvedInheritedModel" class="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700" data-testid="member-override-warning">
      {{ unresolvedInheritedModelMessage }}
    </div>

    <div v-if="!existingNode" class="mb-3">
      <label class="mb-1 block text-xs text-gray-500">{{ t('workspace.components.workspace.config.MemberOverrideItem.llm_model_override') }}</label>
      <SearchableGroupedSelect
        :model-value="selectedModelIdentifier"
        :options="groupedModelOptions"
        :disabled="isInteractionDisabled"
        :placeholder="modelPlaceholder"
        :search-placeholder="t('workspace.components.workspace.config.MemberOverrideItem.search_models')"
        variant="quiet"
        class="w-full"
        @update:model-value="handleModelChange"
      />
      <p v-if="storedModelUnavailable" class="mt-1 text-xs text-amber-600" data-test="historical-agent-model-unavailable">
        {{ historicalUnavailableMessage }}
      </p>
    </div>

    <WorkspaceSelector
      v-if="existingNode"
      class="mb-3"
      :model="{ mode: 'stored', workspace: existingNode.storedWorkspace }"
      :disabled="true"
      :historical-value-unavailable-message="historicalUnavailableMessage"
      :auto-select-default="false"
      control-variant="quiet"
    />

    <div class="mb-3">
      <div class="mb-1 text-xs text-gray-500">{{ t('workspace.components.workspace.config.MemberOverrideItem.auto_approve') }}</div>
      <input
        :id="`override-auto-${inputIdSuffix}`"
        type="checkbox"
        :checked="node.effectiveConfig.autoExecuteTools"
        :indeterminate="Boolean(editableNode && editableNode.override?.autoExecuteTools === undefined)"
        :disabled="isFixedFieldDisabled"
        class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
        @change="handleAutoExecuteChange"
      />
      <label :for="`override-auto-${inputIdSuffix}`" class="ml-2 select-none text-xs text-gray-600">{{ autoExecuteStateLabel }}</label>
    </div>

    <ModelConfigSection
      v-if="effectiveModelIdentifier && !existingNode"
      :schema="modelConfigSchema"
      :model-config="node.effectiveConfig.llmConfig"
      :disabled="isInteractionDisabled"
      :read-only="isInteractionDisabled"
      :compact="true"
      :id-prefix="`config-${inputIdSuffix}`"
      :advanced-initially-expanded="memberAdvancedExplicitlyExpanded"
      :historical="false"
      :historical-value-unavailable-message="historicalUnavailableMessage"
      :historical-model-config-title="t('workspace.components.workspace.config.TeamRunConfigForm.saved_model_configuration')"
      control-variant="quiet"
      @update:config="emitOverrideWithConfig"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AgentConfigOverride } from '~/types/agent/TeamRunConfig'
import type { TeamFormAgentNode } from '~/types/agent/TeamRunFormModel'
import type { ProviderWithModels } from '~/stores/llmProviderConfig'
import SearchableGroupedSelect from '~/components/agentTeams/SearchableGroupedSelect.vue'
import RuntimeModelConfigFields from '~/components/launch-config/RuntimeModelConfigFields.vue'
import ModelConfigSection from './ModelConfigSection.vue'
import WorkspaceSelector from './WorkspaceSelector.vue'
import { useLocalization } from '~/composables/useLocalization'
import { loadRuntimeProviderGroupsForSelection, useRuntimeScopedModelSelection } from '~/composables/useRuntimeScopedModelSelection'
import {
  buildUnavailableInheritedModelMessage,
  hasExplicitMemberLlmConfigOverride,
  hasExplicitMemberLlmModelOverride,
  hasMeaningfulMemberOverride,
  modelConfigsEqual,
  resolveEffectiveMemberRuntimeKind,
} from '~/utils/teamRunConfigUtils'
import { normalizeModelConfigSchema, type UiModelConfigSchema } from '~/utils/llmConfigSchema'
import { getThinkingControlState } from '~/utils/llmThinkingConfigAdapter'

const props = defineProps<{
  node: Readonly<TeamFormAgentNode>
  memberBreadcrumb?: string
  disabled: boolean
  modelConfigFieldErrors?: Readonly<Record<string, string>>
}>()
const emit = defineEmits<{
  (e: 'update:override', memberAddress: string, override: AgentConfigOverride | null): void
  (e: 'retry-runtime-catalog', runtimeKind: string): void
  (e: 'update-existing-model-config', memberAddress: string, config: Record<string, unknown> | null): void
  (e: 'schema-state', address: string, state: { status: 'loading' | 'ready' | 'invalid' | 'unavailable'; message: string | null }): void
}>()
const { t } = useLocalization()
const editableNode = computed(() => props.node.mode === 'editable' ? props.node : null)
const existingNode = computed(() => props.node.mode === 'existing' ? props.node : null)
const isInteractionDisabled = computed(() => props.disabled || props.node.mode === 'existing')
const isFixedFieldDisabled = computed(() => props.disabled || props.node.mode === 'existing')
const historicalUnavailableMessage = computed(() => t('workspace.components.workspace.config.TeamRunConfigForm.historical_value_unavailable'))
const modelConfigFieldErrors = computed(() => props.modelConfigFieldErrors ?? {})
const memberAdvancedExplicitlyExpanded = ref(false)
const inputIdSuffix = computed(() => props.node.address.replace(/[^a-zA-Z0-9_-]+/g, '-'))
const editableOverride = computed(() => editableNode.value?.override)
const baselineConfig = computed(() => editableNode.value?.baselineConfig ?? props.node.effectiveConfig)

const {
  effectiveRuntimeKind,
  groupedModelOptions,
  hasModelIdentifier,
  modelConfigSchemaByIdentifier,
  runtimeOptions,
  selectedRuntimeUnavailableReason,
} = useRuntimeScopedModelSelection({
  runtimeKind: computed(() => editableNode.value
    ? resolveEffectiveMemberRuntimeKind(editableNode.value.override, editableNode.value.baselineConfig.runtimeKind)
    : props.node.effectiveConfig.runtimeKind),
})

const runtimeSelectionValue = computed(() => editableNode.value
  ? editableNode.value.override?.runtimeKind || ''
  : props.node.effectiveConfig.runtimeKind)
const explicitModelIdentifier = computed(() => editableOverride.value?.llmModelIdentifier || '')
const hasExplicitModelOverride = computed(() => hasExplicitMemberLlmModelOverride(editableOverride.value))
const globalModelIdentifier = computed(() => baselineConfig.value.llmModelIdentifier || '')
const inheritedGlobalModelAvailable = computed(() => Boolean(globalModelIdentifier.value && hasModelIdentifier(globalModelIdentifier.value)))
const isUnresolvedInheritedModel = computed(() => Boolean(
  editableOverride.value?.runtimeKind &&
  !hasExplicitModelOverride.value &&
  globalModelIdentifier.value &&
  !inheritedGlobalModelAvailable.value,
))
const unresolvedInheritedModelMessage = computed(() => buildUnavailableInheritedModelMessage({
  globalLlmModelIdentifier: globalModelIdentifier.value,
  runtimeKind: effectiveRuntimeKind.value ?? '',
  memberName: props.node.displayName,
}))
const effectiveModelIdentifier = computed(() => props.node.effectiveConfig.llmModelIdentifier || '')
const selectedModelIdentifier = computed(() => existingNode.value ? effectiveModelIdentifier.value : explicitModelIdentifier.value)
const modelConfigSchema = computed(() => modelConfigSchemaByIdentifier(effectiveModelIdentifier.value))
const storedModelUnavailable = computed(() => Boolean(
  existingNode.value && selectedModelIdentifier.value && !hasModelIdentifier(selectedModelIdentifier.value),
))
const modelPlaceholder = computed(() => existingNode.value
  ? selectedModelIdentifier.value
  : isUnresolvedInheritedModel.value
    ? t('workspace.components.workspace.config.MemberOverrideItem.choose_compatible_member_model')
    : t('workspace.components.workspace.config.MemberOverrideItem.use_global_model_default'))
const autoExecuteStateLabel = computed(() => {
  if (existingNode.value) {
    return props.node.effectiveConfig.autoExecuteTools
      ? t('workspace.components.workspace.config.MemberOverrideItem.auto_execute_on')
      : t('workspace.components.workspace.config.MemberOverrideItem.auto_execute_off')
  }
  if (editableOverride.value?.autoExecuteTools === undefined) {
    return t('workspace.components.workspace.config.MemberOverrideItem.auto_execute_use_global')
  }
  return editableOverride.value.autoExecuteTools
    ? t('workspace.components.workspace.config.MemberOverrideItem.auto_execute_on')
    : t('workspace.components.workspace.config.MemberOverrideItem.auto_execute_off')
})

const buildOverride = (input: {
  runtimeKind?: string
  llmModelIdentifier?: string
  autoExecuteTools?: boolean
  llmConfig?: Record<string, unknown> | null
}): AgentConfigOverride | null => {
  const override: AgentConfigOverride = {}
  if (input.runtimeKind) override.runtimeKind = input.runtimeKind
  if (input.llmModelIdentifier) override.llmModelIdentifier = input.llmModelIdentifier
  if (input.autoExecuteTools !== undefined) override.autoExecuteTools = input.autoExecuteTools
  if (input.llmConfig !== undefined) override.llmConfig = input.llmConfig
  return hasMeaningfulMemberOverride(override) ? override : null
}
const emitEditableOverride = (override: AgentConfigOverride | null) => {
  if (!isInteractionDisabled.value && editableNode.value) emit('update:override', props.node.address, override)
}

const shouldOpenAdvancedForSchema = (
  schema: UiModelConfigSchema | null,
  config: Record<string, unknown> | null | undefined,
) => {
  const state = getThinkingControlState(schema, config)
  return state.supported && state.enabled
}
const modelConfigSchemaFromRows = (
  rows: ProviderWithModels[],
  modelIdentifier: string | null | undefined,
): UiModelConfigSchema | null => {
  const identifier = (modelIdentifier || '').trim()
  for (const row of rows) {
    const normalized = normalizeModelConfigSchema(row.models.find((model) => model.modelIdentifier === identifier)?.configSchema)
    if (normalized && Object.keys(normalized).length) return normalized
  }
  return null
}
const maybeOpenAdvanced = (schema: UiModelConfigSchema | null, config: Record<string, unknown> | null | undefined) => {
  if (shouldOpenAdvancedForSchema(schema, config)) memberAdvancedExplicitlyExpanded.value = true
}

watch(
  () => [effectiveRuntimeKind.value, explicitModelIdentifier.value],
  () => {
    const editable = editableNode.value
    if (!editable || isInteractionDisabled.value || !hasExplicitModelOverride.value || !explicitModelIdentifier.value) return
    if (hasModelIdentifier(explicitModelIdentifier.value)) return
    emitEditableOverride(buildOverride({
      runtimeKind: editable.override?.runtimeKind,
      autoExecuteTools: editable.override?.autoExecuteTools,
    }))
  },
)

const handleRuntimeChange = async (value: string) => {
  const editable = editableNode.value
  if (!editable || isInteractionDisabled.value) return
  const nextRuntimeKind = value || undefined
  const runtimeChanged = nextRuntimeKind !== (editable.override?.runtimeKind || undefined)
  const nextRows = await loadRuntimeProviderGroupsForSelection(nextRuntimeKind || editable.baselineConfig.runtimeKind)
  const identifiers = nextRows.flatMap((row) => row.models.map((model) => model.modelIdentifier))
  const retainedModel = explicitModelIdentifier.value && identifiers.includes(explicitModelIdentifier.value)
    ? explicitModelIdentifier.value
    : undefined
  const effectiveModel = retainedModel || (identifiers.includes(globalModelIdentifier.value) ? globalModelIdentifier.value : undefined)
  const retainedConfig = !runtimeChanged && retainedModel && hasExplicitMemberLlmConfigOverride(editable.override)
    ? editable.override?.llmConfig ?? null
    : undefined
  emitEditableOverride(buildOverride({
    runtimeKind: nextRuntimeKind,
    llmModelIdentifier: retainedModel,
    autoExecuteTools: editable.override?.autoExecuteTools,
    llmConfig: retainedConfig,
  }))
  if (runtimeChanged) maybeOpenAdvanced(modelConfigSchemaFromRows(nextRows, effectiveModel), retainedConfig ?? editable.baselineConfig.llmConfig)
}
const emitOverrideWithConfig = (config: Record<string, unknown> | null | undefined) => {
  const editable = editableNode.value
  if (!editable || isInteractionDisabled.value) return
  emitEditableOverride(buildOverride({
    runtimeKind: editable.override?.runtimeKind,
    llmModelIdentifier: editable.override?.llmModelIdentifier,
    autoExecuteTools: editable.override?.autoExecuteTools,
    llmConfig: modelConfigsEqual(config ?? null, editable.baselineConfig.llmConfig ?? null) ? undefined : config ?? null,
  }))
}
const handleModelChange = (value: string) => {
  const editable = editableNode.value
  if (!editable || isInteractionDisabled.value) return
  const changed = value !== explicitModelIdentifier.value
  if (changed && value) maybeOpenAdvanced(modelConfigSchemaByIdentifier(value), editable.baselineConfig.llmConfig)
  emitEditableOverride(buildOverride({
    runtimeKind: editable.override?.runtimeKind,
    llmModelIdentifier: value || undefined,
    autoExecuteTools: editable.override?.autoExecuteTools,
    llmConfig: !changed && hasExplicitMemberLlmConfigOverride(editable.override) ? editable.override?.llmConfig ?? null : undefined,
  }))
}
const handleAutoExecuteChange = () => {
  const editable = editableNode.value
  if (!editable || isInteractionDisabled.value) return
  const current = editable.override?.autoExecuteTools
  emitEditableOverride(buildOverride({
    runtimeKind: editable.override?.runtimeKind,
    llmModelIdentifier: editable.override?.llmModelIdentifier,
    autoExecuteTools: current === undefined ? true : current ? false : undefined,
    llmConfig: hasExplicitMemberLlmConfigOverride(editable.override) ? editable.override?.llmConfig ?? null : undefined,
  }))
}
const retryRuntimeCatalog = () => {
  if (!isInteractionDisabled.value && editableNode.value) emit('retry-runtime-catalog', effectiveRuntimeKind.value ?? '')
}
</script>
