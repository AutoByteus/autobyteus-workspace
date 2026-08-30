<template>
  <div v-if="isRoot" class="space-y-4" data-test="root-team-config-fields">
    <div
      v-if="editableScope?.runtimeCatalogState.status === 'loading'"
      role="status"
      class="rounded border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700"
      data-test="team-runtime-catalog-loading"
    >
      {{ t('workspace.components.workspace.config.TeamScopeConfigEditor.catalog_loading', { address: scope.address }) }}
    </div>
    <div
      v-else-if="editableScope?.runtimeCatalogState.status === 'error'"
      role="alert"
      class="flex items-start justify-between gap-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
      data-test="team-runtime-catalog-error"
    >
      <span>{{ t('workspace.components.workspace.config.TeamScopeConfigEditor.catalog_error', { address: scope.address, error: editableScope.runtimeCatalogState.error || '' }) }}</span>
      <button type="button" class="font-semibold underline disabled:opacity-50" :disabled="isInteractionDisabled" @click="retryCatalog">
        {{ t('workspace.components.workspace.config.TeamScopeConfigEditor.retry') }}
      </button>
    </div>

    <RuntimeModelConfigFields
      :runtime-kind="scope.effectiveConfig.runtimeKind"
      :llm-model-identifier="scope.effectiveConfig.llmModelIdentifier"
      :llm-config="scope.effectiveConfig.llmConfig"
      :disabled="scope.mode === 'editable' && isInteractionDisabled"
      :read-only="scope.mode === 'editable' && isInteractionDisabled"
      :runtime-selection-locked="isFixedFieldDisabled"
      :model-selection-locked="isFixedFieldDisabled"
      :model-config-disabled="isInteractionDisabled"
      :model-config-read-only="isInteractionDisabled"
      :historical-model-config="scope.mode === 'existing'"
      :runtime-help-text="scope.mode === 'existing' ? t('workspace.runModelConfig.fixedIdentity') : t('workspace.components.workspace.config.TeamRunConfigForm.selects_the_runtime_backend_used_by')"
      :model-label="t('workspace.components.workspace.config.TeamRunConfigForm.default_llm_model_global')"
      :model-help-text="scope.mode === 'existing' ? t('workspace.runModelConfig.fixedIdentity') : t('workspace.components.workspace.config.TeamRunConfigForm.this_model_will_be_used_by')"
      :id-prefix="inputIdPrefix"
      :advanced-initially-expanded="scope.mode === 'existing'"
      :historical-value-unavailable-message="historicalUnavailableMessage"
      :historical-model-config-title="historicalModelConfigTitle"
      :validation-errors="modelConfigFieldErrors"
      control-variant="quiet"
      @update:runtime-kind="updateField('runtime', $event)"
      @update:llm-model-identifier="updateField('model', $event)"
      @update:llm-config="updateField('llmConfig', $event)"
      @schema-state="emit('schema-state', scope.address, $event)"
    />

    <div class="mt-8">
      <WorkspaceSelector
        v-if="editableScope"
        :model="{
          mode: 'editable',
          selection: editableScope.workspaceSelection,
          isLoading: editableScope.workspaceOperation.status === 'loading',
          error: editableScope.workspaceOperation.error,
        }"
        :disabled="isInteractionDisabled"
        :auto-select-default="true"
        control-variant="quiet"
        @update:model-value="updateWorkspaceSelection"
      />
      <WorkspaceSelector
        v-else-if="existingScope"
        :model="{ mode: 'stored', workspace: existingScope.storedWorkspace }"
        :disabled="true"
        :historical-value-unavailable-message="historicalUnavailableMessage"
        :auto-select-default="false"
        control-variant="quiet"
      />
    </div>

    <div class="mt-4 flex items-center justify-between gap-4 py-2" data-test="team-auto-approve-row">
      <div class="min-w-0">
        <label :for="autoExecuteId" class="block select-none text-base text-gray-900" :class="{ 'text-gray-400': isInteractionDisabled }">
          {{ t('workspace.components.workspace.config.TeamRunConfigForm.auto_approve_tools') }}
        </label>
        <p class="mt-1 text-xs leading-relaxed text-gray-500">
          {{ t('workspace.components.workspace.config.TeamRunConfigForm.auto_approve_tools_help') }}
        </p>
      </div>
      <AutoApproveSwitch
        :id="autoExecuteId"
        :checked="scope.effectiveConfig.autoExecuteTools"
        :disabled="isFixedFieldDisabled"
        :label="t('workspace.components.workspace.config.TeamRunConfigForm.auto_approve_tools')"
        @toggle="updateField('auto', $event)"
      />
    </div>
  </div>

  <section
    v-else
    class="bg-slate-50/70 p-3"
    :aria-labelledby="headingId"
    data-test="team-scope-config-editor"
    :data-team-address="scope.address"
  >
    <div class="flex min-w-0 items-start gap-2">
      <button
        type="button"
        class="flex min-w-0 flex-1 flex-wrap items-center gap-2 rounded text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        :aria-expanded="expanded"
        :aria-controls="panelId"
        @click="expanded = !expanded"
      >
        <span :id="headingId" class="truncate text-sm font-semibold text-slate-800" :title="scope.address">
          {{ scope.displayName }}
        </span>
        <span class="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-slate-500">
          {{ t('workspace.components.workspace.config.TeamScopeConfigEditor.team_marker') }}
        </span>
        <span class="min-w-0 flex-1 truncate font-mono text-xs text-slate-500" :title="scope.address">{{ scope.address }}</span>
        <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="stateBadgeClass">
          {{ stateLabel }}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-4 w-4 flex-shrink-0 transform text-slate-500 transition-transform duration-300"
          :class="expanded ? '' : '-rotate-90'"
          data-test="team-scope-chevron"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <button
        v-if="editableScope?.isCustomized"
        type="button"
        class="rounded px-2 py-0.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        :aria-label="t('workspace.components.workspace.config.TeamScopeConfigEditor.reset_aria', { name: scope.displayName, address: scope.address })"
        :disabled="isInteractionDisabled"
        data-test="reset-team-scope"
        @click="resetScope"
      >
        {{ t('workspace.components.workspace.config.TeamScopeConfigEditor.reset') }}
      </button>
    </div>

    <div
      v-if="editableScope?.runtimeCatalogState.status === 'loading'"
      role="status"
      class="mt-3 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700"
      data-test="team-runtime-catalog-loading"
    >
      {{ t('workspace.components.workspace.config.TeamScopeConfigEditor.catalog_loading', { address: scope.address }) }}
    </div>
    <div
      v-else-if="editableScope?.runtimeCatalogState.status === 'error'"
      role="alert"
      class="mt-3 flex items-start justify-between gap-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
      data-test="team-runtime-catalog-error"
    >
      <span>{{ t('workspace.components.workspace.config.TeamScopeConfigEditor.catalog_error', { address: scope.address, error: editableScope.runtimeCatalogState.error || '' }) }}</span>
      <button type="button" class="font-semibold underline disabled:opacity-50" :disabled="isInteractionDisabled" @click="retryCatalog">
        {{ t('workspace.components.workspace.config.TeamScopeConfigEditor.retry') }}
      </button>
    </div>

    <div v-show="expanded" :id="panelId" class="mt-4 border-t border-slate-200 pt-4">
      <RuntimeModelConfigFields
        :runtime-kind="scope.effectiveConfig.runtimeKind"
        :llm-model-identifier="scope.effectiveConfig.llmModelIdentifier"
        :llm-config="scope.effectiveConfig.llmConfig"
        :disabled="scope.mode === 'editable' && isInteractionDisabled"
        :read-only="scope.mode === 'editable' && isInteractionDisabled"
        :runtime-selection-locked="isFixedFieldDisabled"
        :model-selection-locked="isFixedFieldDisabled"
        :model-config-disabled="isInteractionDisabled"
        :model-config-read-only="isInteractionDisabled"
        :historical-model-config="scope.mode === 'existing'"
        :runtime-help-text="scope.mode === 'existing' ? t('workspace.runModelConfig.fixedIdentity') : t('workspace.components.workspace.config.TeamScopeConfigEditor.runtime_help')"
        :model-label="t('workspace.components.workspace.config.TeamScopeConfigEditor.team_default_model')"
        :model-help-text="scope.mode === 'existing' ? t('workspace.runModelConfig.fixedIdentity') : t('workspace.components.workspace.config.TeamScopeConfigEditor.model_help')"
        :id-prefix="inputIdPrefix"
        :advanced-initially-expanded="scope.mode === 'existing'"
        :historical-value-unavailable-message="historicalUnavailableMessage"
        :historical-model-config-title="historicalModelConfigTitle"
        :validation-errors="modelConfigFieldErrors"
        control-variant="quiet"
        @update:runtime-kind="updateField('runtime', $event)"
        @update:llm-model-identifier="updateField('model', $event)"
        @update:llm-config="updateField('llmConfig', $event)"
        @schema-state="emit('schema-state', scope.address, $event)"
      />

      <div class="mt-6">
        <WorkspaceSelector
          v-if="editableScope"
          :model="{
            mode: 'editable',
            selection: editableScope.workspaceSelection,
            isLoading: editableScope.workspaceOperation.status === 'loading',
            error: editableScope.workspaceOperation.error,
          }"
          :disabled="isInteractionDisabled"
          :auto-select-default="false"
          control-variant="quiet"
          @update:model-value="updateWorkspaceSelection"
        />
        <WorkspaceSelector
          v-else-if="existingScope"
          :model="{ mode: 'stored', workspace: existingScope.storedWorkspace }"
          :disabled="true"
          :historical-value-unavailable-message="historicalUnavailableMessage"
          :auto-select-default="false"
          control-variant="quiet"
        />
      </div>

      <div class="mt-4 flex items-center justify-between gap-4 py-2">
        <div class="min-w-0">
          <label :for="autoExecuteId" class="block text-sm font-medium text-gray-700">
            {{ t('workspace.components.workspace.config.TeamScopeConfigEditor.auto_approve') }}
          </label>
          <p class="mt-1 text-xs text-gray-500">{{ t('workspace.components.workspace.config.TeamScopeConfigEditor.auto_help') }}</p>
        </div>
        <AutoApproveSwitch
          :id="autoExecuteId"
          :checked="scope.effectiveConfig.autoExecuteTools"
          :disabled="isFixedFieldDisabled"
          :label="t('workspace.components.workspace.config.TeamScopeConfigEditor.auto_approve')"
          @toggle="updateField('auto', $event)"
        />
      </div>

      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import RuntimeModelConfigFields from '~/components/launch-config/RuntimeModelConfigFields.vue'
import AutoApproveSwitch from './AutoApproveSwitch.vue'
import WorkspaceSelector from './WorkspaceSelector.vue'
import { useLocalization } from '~/composables/useLocalization'
import type { TeamScopeConfigOverride } from '~/types/agent/TeamRunConfig'
import type { TeamScopeFormModel } from '~/types/agent/TeamRunFormModel'
import type { WorkspaceSelectionState } from '~/types/workspace/WorkspaceSelectionState'
import { hasMeaningfulLaunchOverride, modelConfigsEqual } from '~/utils/teamRunConfigUtils'

const props = withDefaults(defineProps<{
  scope: Readonly<TeamScopeFormModel>
  isRoot?: boolean
  disabled?: boolean
  modelConfigFieldErrors?: Readonly<Record<string, string>>
}>(), {
  isRoot: false,
  disabled: false,
})
const emit = defineEmits<{
  (e: 'update-root', field: 'runtime' | 'model' | 'llmConfig' | 'auto', value: unknown): void
  (e: 'update-override', override: TeamScopeConfigOverride | null): void
  (e: 'reset'): void
  (e: 'update:workspace-selection', address: string, selection: WorkspaceSelectionState): void
  (e: 'retry-runtime-catalog', runtimeKind: string): void
  (e: 'update-existing-model-config', address: string, config: Record<string, unknown> | null): void
  (e: 'schema-state', address: string, state: { status: 'loading' | 'ready' | 'invalid' | 'unavailable'; message: string | null }): void
}>()
const { t } = useLocalization()
const editableScope = computed(() => props.scope.mode === 'editable' ? props.scope : null)
const existingScope = computed(() => props.scope.mode === 'existing' ? props.scope : null)
const isInteractionDisabled = computed(() => props.disabled)
const isFixedFieldDisabled = computed(() => props.disabled || props.scope.mode === 'existing')
const expanded = ref(false)
const pendingOverride = ref<TeamScopeConfigOverride>({
  ...(props.scope.mode === 'editable' ? props.scope.override ?? {} : {}),
})
watch(() => props.scope, (scope) => {
  if (scope.mode === 'editable') pendingOverride.value = { ...(scope.override ?? {}) }
}, { deep: true })
const domKey = computed(() => props.scope.address === '/' ? 'root' : props.scope.address.slice(1).replaceAll('/', '-'))
const headingId = computed(() => `team-scope-${domKey.value}-heading`)
const panelId = computed(() => `team-scope-${domKey.value}-panel`)
const inputIdPrefix = computed(() => `team-scope-${domKey.value}`)
const autoExecuteId = computed(() => `${inputIdPrefix.value}-auto-execute`)
const stateLabel = computed(() => t(`workspace.components.workspace.config.TeamScopeConfigEditor.${props.scope.isCustomized ? 'customized' : 'inherited'}`))
const stateBadgeClass = computed(() => props.scope.isCustomized ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600')
const historicalUnavailableMessage = computed(() => t('workspace.components.workspace.config.TeamRunConfigForm.historical_value_unavailable'))
const historicalModelConfigTitle = computed(() => t('workspace.components.workspace.config.TeamRunConfigForm.saved_model_configuration'))
const modelConfigFieldErrors = computed(() => props.modelConfigFieldErrors ?? {})

const normalizeOverride = (value: TeamScopeConfigOverride): TeamScopeConfigOverride | null => {
  const inherited = editableScope.value?.inheritedConfig
  const next = { ...value }
  if (inherited) {
    if (next.runtimeKind === inherited.runtimeKind) delete next.runtimeKind
    if (next.llmModelIdentifier === inherited.llmModelIdentifier) delete next.llmModelIdentifier
    if (Object.hasOwn(next, 'llmConfig') && modelConfigsEqual(next.llmConfig, inherited.llmConfig)) delete next.llmConfig
    if (next.autoExecuteTools === inherited.autoExecuteTools) delete next.autoExecuteTools
    if (next.workspace?.workspaceId === inherited.workspaceId
      && next.workspace.workspaceMetadata?.workspaceRootPath === inherited.workspaceRootPath) delete next.workspace
  }
  return hasMeaningfulLaunchOverride(next) ? next : null
}
const emitOverride = (next: TeamScopeConfigOverride) => {
  const normalized = normalizeOverride(next)
  pendingOverride.value = { ...(normalized ?? {}) }
  emit('update-override', normalized)
}
const updateField = (field: 'runtime' | 'model' | 'llmConfig' | 'auto', value: unknown) => {
  if (isInteractionDisabled.value) return
  if (existingScope.value) {
    if (field === 'llmConfig') emit('update-existing-model-config', props.scope.address, value as Record<string, unknown> | null)
    return
  }
  if (!editableScope.value) return
  if (props.isRoot) { emit('update-root', field, value); return }
  const next = { ...pendingOverride.value }
  if (field === 'runtime') next.runtimeKind = value as TeamScopeConfigOverride['runtimeKind']
  else if (field === 'model') next.llmModelIdentifier = value as string
  else if (field === 'llmConfig') next.llmConfig = value as Record<string, unknown> | null
  else next.autoExecuteTools = value as boolean
  emitOverride(next)
}
const resetScope = () => {
  if (!isInteractionDisabled.value && editableScope.value) emit('reset')
}
const updateWorkspaceSelection = (selection: WorkspaceSelectionState) => {
  if (!isInteractionDisabled.value && editableScope.value) {
    emit('update:workspace-selection', editableScope.value.address, selection)
  }
}
const retryCatalog = () => {
  if (!isInteractionDisabled.value && editableScope.value) {
    emit('retry-runtime-catalog', editableScope.value.effectiveConfig.runtimeKind)
  }
}
</script>
