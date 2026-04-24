<template>
  <div class="rounded-md border border-gray-200 bg-white p-3">
    <div class="mb-3 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-gray-700">{{ memberName }}</span>
        <span v-if="isCoordinator" class="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600">
          {{ $t('workspace.components.workspace.config.MemberOverrideItem.coordinator') }}
        </span>
      </div>
      <span v-if="hasOverride" class="rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-xs text-amber-600">
        {{ $t('workspace.components.workspace.config.MemberOverrideItem.overridden') }}
      </span>
    </div>

    <div class="mb-3">
      <label class="mb-1 block text-xs text-gray-500">{{ $t('workspace.components.workspace.config.MemberOverrideItem.runtime_override') }}</label>
      <select
        :id="`override-runtime-${memberName}`"
        :value="storedRuntimeOverrideValue"
        :disabled="disabled"
        class="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
        @change="handleRuntimeChange(($event.target as HTMLSelectElement).value)"
      >
        <option value="">{{ $t('workspace.components.workspace.config.MemberOverrideItem.use_global_runtime_default') }}</option>
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
    </div>

    <div v-if="isUnresolvedInheritedModel" class="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700" data-testid="member-override-warning">
      {{ unresolvedInheritedModelMessage }}
    </div>

    <div class="mb-3">
      <label class="mb-1 block text-xs text-gray-500">{{ $t('workspace.components.workspace.config.MemberOverrideItem.llm_model_override') }}</label>
      <SearchableGroupedSelect
        :model-value="explicitModelIdentifier"
        @update:modelValue="handleModelChange"
        :options="groupedModelOptions"
        :disabled="disabled"
        :placeholder="modelPlaceholder"
        :search-placeholder="$t('workspace.components.workspace.config.MemberOverrideItem.search_models')"
        class="w-full"
      />
    </div>

    <div class="mb-3 flex items-center">
      <input
        :id="`override-auto-${memberName}`"
        type="checkbox"
        :checked="override?.autoExecuteTools === true"
        :indeterminate="override?.autoExecuteTools === undefined"
        @change="handleAutoExecuteChange"
        :disabled="disabled"
        class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
      />
      <label :for="`override-auto-${memberName}`" class="ml-2 select-none text-xs text-gray-600">
        {{ autoExecuteLabel }}
      </label>
    </div>

    <ModelConfigSection
      v-if="effectiveModelIdentifier"
      :schema="modelConfigSchema"
      :model-config="effectiveModelConfig"
      :disabled="disabled"
      :read-only="disabled"
      :compact="true"
      :id-prefix="`config-${memberName}`"
      :advanced-initially-expanded="advancedInitiallyExpanded"
      :missing-historical-config="missingHistoricalConfig"
      @update:config="emitOverrideWithConfig"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, toRef, watch } from 'vue'
import type { MemberConfigOverride } from '~/types/agent/TeamRunConfig'
import SearchableGroupedSelect from '~/components/agentTeams/SearchableGroupedSelect.vue'
import ModelConfigSection from './ModelConfigSection.vue'
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

const props = defineProps<{
  memberName: string
  agentDefinitionId: string
  override: MemberConfigOverride | undefined
  globalRuntimeKind: string
  globalLlmModel: string
  globalLlmConfig?: Record<string, unknown> | null
  disabled: boolean
  isCoordinator?: boolean
  advancedInitiallyExpanded?: boolean
  missingHistoricalConfig?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:override', memberName: string, override: MemberConfigOverride | null): void
}>()
const { t: $t } = useLocalization()

const {
  effectiveRuntimeKind,
  groupedModelOptions,
  hasModelIdentifier,
  modelConfigSchemaByIdentifier,
  runtimeOptions,
  selectedRuntimeUnavailableReason,
} = useRuntimeScopedModelSelection({
  runtimeKind: computed(() => resolveEffectiveMemberRuntimeKind(props.override, props.globalRuntimeKind)),
})

const storedRuntimeOverrideValue = computed(() => props.override?.runtimeKind || '')
const explicitModelIdentifier = computed(() => props.override?.llmModelIdentifier || '')
const hasOverride = computed(() => hasMeaningfulMemberOverride(props.override))
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
  if (hasExplicitModelOverride.value) {
    return explicitModelIdentifier.value
  }
  if (isUnresolvedInheritedModel.value) {
    return ''
  }
  return globalModelIdentifier.value
})

const effectiveModelConfig = computed(() => {
  if (isUnresolvedInheritedModel.value) {
    return null
  }
  return resolveEffectiveMemberLlmConfig(props.override, props.globalLlmConfig)
})

const modelConfigSchema = computed(() =>
  modelConfigSchemaByIdentifier(effectiveModelIdentifier.value),
)

const modelPlaceholder = computed(() =>
  isUnresolvedInheritedModel.value
    ? $t('workspace.components.workspace.config.MemberOverrideItem.choose_compatible_member_model')
    : $t('workspace.components.workspace.config.MemberOverrideItem.use_global_model_default'),
)

const autoExecuteLabel = computed(() => {
  if (props.override?.autoExecuteTools === undefined) {
    return $t('workspace.components.workspace.config.MemberOverrideItem.auto_execute_use_global')
  }
  return props.override.autoExecuteTools
    ? $t('workspace.components.workspace.config.MemberOverrideItem.auto_execute_on')
    : $t('workspace.components.workspace.config.MemberOverrideItem.auto_execute_off')
})

const resolveRetainedExplicitConfig = (
  nextExplicitModelIdentifier: string | undefined,
): Record<string, unknown> | null | undefined => {
  if (!nextExplicitModelIdentifier || !hasExplicitMemberLlmConfigOverride(props.override)) {
    return undefined
  }

  return props.override?.llmConfig ?? null
}

const buildOverride = (input: {
  runtimeKind?: string
  llmModelIdentifier?: string
  autoExecuteTools?: boolean
  llmConfig?: Record<string, unknown> | null
}): MemberConfigOverride | null => {
  const override: MemberConfigOverride = {
    agentDefinitionId: props.agentDefinitionId,
  }

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
      props.memberName,
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
  const effectiveNextRuntimeKind = nextRuntimeKind || props.globalRuntimeKind
  const nextRows = await loadRuntimeProviderGroupsForSelection(effectiveNextRuntimeKind)
  const nextModelIdentifiers = nextRows.flatMap((row) => row.models.map((model) => model.modelIdentifier))
  const retainedExplicitModel = explicitModelIdentifier.value && nextModelIdentifiers.includes(explicitModelIdentifier.value)
    ? explicitModelIdentifier.value
    : undefined

  emit(
    'update:override',
    props.memberName,
    buildOverride({
      runtimeKind: nextRuntimeKind,
      llmModelIdentifier: retainedExplicitModel,
      autoExecuteTools: props.override?.autoExecuteTools,
      llmConfig: resolveRetainedExplicitConfig(retainedExplicitModel),
    }),
  )
}

const emitOverrideWithConfig = (nextConfig: Record<string, unknown> | null | undefined) => {
  if (props.disabled) return
  const explicitConfig = modelConfigsEqual(nextConfig ?? null, props.globalLlmConfig ?? null)
    ? undefined
    : (nextConfig ?? null)

  emit(
    'update:override',
    props.memberName,
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
  const canKeepExplicitConfig = Boolean(
    value
      ? hasExplicitMemberLlmConfigOverride(props.override)
      : hasExplicitMemberLlmConfigOverride(props.override) && inheritedGlobalModelAvailable.value,
  )

  emit(
    'update:override',
    props.memberName,
    buildOverride({
      runtimeKind: props.override?.runtimeKind,
      llmModelIdentifier: value || undefined,
      autoExecuteTools: props.override?.autoExecuteTools,
      llmConfig: canKeepExplicitConfig ? (props.override?.llmConfig ?? null) : undefined,
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
    props.memberName,
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
