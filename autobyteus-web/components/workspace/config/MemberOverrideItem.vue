<template>
  <div
    class="rounded-md border bg-white shadow-sm transition-colors duration-200 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100"
    :class="isExpanded ? 'border-blue-200 bg-blue-50/30 ring-1 ring-blue-100' : 'border-slate-200'"
    :data-state="isExpanded ? 'expanded' : 'collapsed'"
    :data-member-route-key="memberRouteKey"
    tabindex="-1"
    data-test="member-override-card"
  >
    <MemberOverrideHeader
      :member-name="memberName"
      :member-route-key="memberRouteKey"
      :member-breadcrumb="memberBreadcrumb"
      :is-coordinator="isCoordinator"
      :has-override="hasOverride"
      :is-expanded="isExpanded"
      :override-indicators="overrideIndicators"
      :disabled="disabled"
      :confirming-reset="confirmingReset"
      @toggle="toggleExpanded"
      @request-reset="requestResetOverride"
      @confirm-reset="confirmResetOverride"
      @cancel-reset="cancelResetOverride"
    />

    <div
      v-show="isExpanded"
      class="border-t border-slate-200 px-3 py-4"
      data-test="member-override-editor"
    >
      <div class="mb-4 min-w-0">
        <h4 class="text-sm font-semibold text-slate-900">{{ $t('workspace.components.workspace.config.MemberOverrideItem.member_override_details') }}</h4>
        <p class="mt-1 text-xs text-slate-500">
          {{ $t('workspace.components.workspace.config.MemberOverrideItem.member_override_details_help') }}
        </p>
      </div>

      <div class="mb-3" data-test="member-override-runtime-field">
        <div class="mb-1 flex items-center gap-2">
          <label class="block text-xs font-medium text-gray-500">{{ $t('workspace.components.workspace.config.MemberOverrideItem.runtime_override') }}</label>
          <span v-if="hasRuntimeOverride" class="rounded-full bg-blue-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-blue-700">
            {{ $t('workspace.components.workspace.config.MemberOverrideItem.field_overridden') }}
          </span>
        </div>
        <select
          :id="`override-runtime-${inputIdSuffix}`"
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

      <div class="mb-3" data-test="member-override-model-field">
        <div class="mb-1 flex items-center gap-2">
          <label class="block text-xs font-medium text-gray-500">{{ $t('workspace.components.workspace.config.MemberOverrideItem.llm_model_override') }}</label>
          <span v-if="hasModelOverride" class="rounded-full bg-blue-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-blue-700">
            {{ $t('workspace.components.workspace.config.MemberOverrideItem.field_overridden') }}
          </span>
        </div>
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

      <div class="mb-3" data-test="member-override-auto-approve-field">
        <div class="mb-1 flex items-center gap-2">
          <label :for="`override-auto-${inputIdSuffix}`" class="block text-xs font-medium text-gray-500">{{ $t('workspace.components.workspace.config.MemberOverrideItem.auto_approve_override') }}</label>
          <span v-if="hasAutoApproveOverride" class="rounded-full bg-blue-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-blue-700">
            {{ $t('workspace.components.workspace.config.MemberOverrideItem.field_overridden') }}
          </span>
        </div>
        <select
          :id="`override-auto-${inputIdSuffix}`"
          :value="autoApproveOverrideValue"
          :disabled="disabled"
          class="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
          @change="handleAutoApproveOverrideChange(($event.target as HTMLSelectElement).value)"
        >
          <option value="global">{{ $t('workspace.components.workspace.config.MemberOverrideItem.auto_approve_use_global') }}</option>
          <option value="yes">{{ $t('workspace.components.workspace.config.MemberOverrideItem.auto_approve_yes') }}</option>
          <option value="no">{{ $t('workspace.components.workspace.config.MemberOverrideItem.auto_approve_no') }}</option>
        </select>
        <p class="mt-1 text-xs text-gray-500">
          {{ $t('workspace.components.workspace.config.MemberOverrideItem.auto_approve_override_help') }}
          {{ globalAutoExecuteTools ? $t('workspace.components.workspace.config.MemberOverrideItem.global_auto_approve_on') : $t('workspace.components.workspace.config.MemberOverrideItem.global_auto_approve_off') }}
        </p>
      </div>

      <div data-test="member-override-model-config-field">
        <div class="mb-1 flex items-center gap-2">
          <span class="block text-xs font-medium text-gray-500">{{ $t('workspace.components.workspace.config.MemberOverrideItem.model_config_override') }}</span>
          <span v-if="hasModelConfigOverride" class="rounded-full bg-blue-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-blue-700">
            {{ $t('workspace.components.workspace.config.MemberOverrideItem.field_overridden') }}
          </span>
        </div>
        <ModelConfigSection
          v-if="shouldRenderModelConfigSection"
          :schema="modelConfigSchema"
          :model-config="effectiveModelConfig"
          :disabled="disabled"
          :read-only="disabled"
          :compact="true"
          :id-prefix="`config-${inputIdSuffix}`"
          :advanced-initially-expanded="advancedInitiallyExpanded === true"
          advanced-display-mode="flat"
          default-thinking-on-when-supported
          :missing-historical-config="missingHistoricalConfig"
          @update:config="emitOverrideWithConfig"
        />
        <p
          v-else
          class="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500"
          data-test="member-override-model-config-unavailable"
        >
          {{ modelConfigUnavailableMessage }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { MemberConfigOverride } from '~/types/agent/TeamRunConfig'
import SearchableGroupedSelect from '~/components/agentTeams/SearchableGroupedSelect.vue'
import MemberOverrideHeader from './MemberOverrideHeader.vue'
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
  hasExplicitMemberRuntimeOverride,
  hasMeaningfulMemberOverride,
  modelConfigsEqual,
  resolveEffectiveMemberLlmConfig,
  resolveEffectiveMemberRuntimeKind,
} from '~/utils/teamRunConfigUtils'

const props = defineProps<{
  memberName: string
  memberRouteKey: string
  memberBreadcrumb?: string
  agentDefinitionId: string
  override: MemberConfigOverride | undefined
  globalRuntimeKind: string
  globalLlmModel: string
  globalLlmConfig?: Record<string, unknown> | null
  globalAutoExecuteTools: boolean
  disabled: boolean
  isCoordinator?: boolean
  advancedInitiallyExpanded?: boolean
  missingHistoricalConfig?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:override', memberRouteKey: string, override: MemberConfigOverride | null): void
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
const inputIdSuffix = computed(() => props.memberRouteKey.replace(/[^a-zA-Z0-9_-]+/g, '-'))
const explicitModelIdentifier = computed(() => props.override?.llmModelIdentifier || '')
const isExpanded = ref(false)
const confirmingReset = ref(false)
const hasOverride = computed(() => hasMeaningfulMemberOverride(props.override))
const globalModelIdentifier = computed(() => props.globalLlmModel || '')
const hasRuntimeOverride = computed(() => hasExplicitMemberRuntimeOverride(props.override))
const hasModelOverride = computed(() => hasExplicitMemberLlmModelOverride(props.override))
const hasModelConfigOverride = computed(() => hasExplicitMemberLlmConfigOverride(props.override))
const hasAutoApproveOverride = computed(() => props.override?.autoExecuteTools !== undefined)
const inheritedGlobalModelAvailable = computed(() => {
  if (!globalModelIdentifier.value) {
    return false
  }
  return hasModelIdentifier(globalModelIdentifier.value)
})

const isUnresolvedInheritedModel = computed(() =>
  Boolean(
    props.override?.runtimeKind &&
      !hasModelOverride.value &&
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
  if (hasModelOverride.value) {
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
const hasModelConfigSchema = computed(() =>
  !!modelConfigSchema.value && Object.keys(modelConfigSchema.value).length > 0,
)
const shouldRenderModelConfigSection = computed(() =>
  Boolean(effectiveModelIdentifier.value) && hasModelConfigSchema.value,
)
const modelConfigUnavailableMessage = computed(() =>
  effectiveModelIdentifier.value
    ? $t('workspace.components.workspace.config.MemberOverrideItem.no_model_config_options')
    : $t('workspace.components.workspace.config.MemberOverrideItem.model_config_unavailable'),
)

const modelPlaceholder = computed(() =>
  isUnresolvedInheritedModel.value
    ? $t('workspace.components.workspace.config.MemberOverrideItem.choose_compatible_member_model')
    : $t('workspace.components.workspace.config.MemberOverrideItem.use_global_model_default'),
)

const autoApproveOverrideValue = computed(() => {
  if (props.override?.autoExecuteTools === undefined) return 'global'
  return props.override.autoExecuteTools ? 'yes' : 'no'
})

const overrideIndicators = computed(() => [
  ...(hasRuntimeOverride.value
    ? [{
        key: 'runtime',
        labelKey: 'workspace.components.workspace.config.MemberOverrideItem.runtime_field',
      }]
    : []),
  ...(hasModelOverride.value
    ? [{
        key: 'model',
        labelKey: 'workspace.components.workspace.config.MemberOverrideItem.model_field',
      }]
    : []),
  ...(hasModelConfigOverride.value
    ? [{
        key: 'model-config',
        labelKey: 'workspace.components.workspace.config.MemberOverrideItem.model_config_field',
      }]
    : []),
  ...(hasAutoApproveOverride.value
    ? [{
        key: 'auto-approve',
        labelKey: 'workspace.components.workspace.config.MemberOverrideItem.auto_approve_field',
      }]
    : []),
])

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

    if (!hasModelOverride.value || !explicitModelIdentifier.value) {
      return
    }

    if (hasModelIdentifier(explicitModelIdentifier.value)) {
      return
    }

    emit(
      'update:override',
      props.memberRouteKey,
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

  emit(
    'update:override',
    props.memberRouteKey,
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
}

const emitOverrideWithConfig = (nextConfig: Record<string, unknown> | null | undefined) => {
  if (props.disabled) return
  const explicitConfig = modelConfigsEqual(nextConfig ?? null, props.globalLlmConfig ?? null)
    ? undefined
    : (nextConfig ?? null)

  emit(
    'update:override',
    props.memberRouteKey,
    buildOverride({
      runtimeKind: props.override?.runtimeKind,
      llmModelIdentifier: props.override?.llmModelIdentifier,
      autoExecuteTools: props.override?.autoExecuteTools,
      llmConfig: explicitConfig,
    }),
  )
}

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}

const requestResetOverride = () => {
  if (props.disabled || !hasOverride.value) return
  confirmingReset.value = true
}

const cancelResetOverride = () => {
  confirmingReset.value = false
}

const confirmResetOverride = () => {
  if (props.disabled || !hasOverride.value) return
  emit('update:override', props.memberRouteKey, null)
  confirmingReset.value = false
}

const handleModelChange = (value: string) => {
  if (props.disabled) return
  const modelChanged = value !== explicitModelIdentifier.value

  emit(
    'update:override',
    props.memberRouteKey,
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

const handleAutoApproveOverrideChange = (value: string) => {
  if (props.disabled) return
  const newValue = value === 'yes' ? true : value === 'no' ? false : undefined

  emit(
    'update:override',
    props.memberRouteKey,
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

watch(
  () => [hasOverride.value, props.memberRouteKey, props.disabled],
  () => {
    if (!hasOverride.value || props.disabled) {
      confirmingReset.value = false
    }
  },
)
</script>
