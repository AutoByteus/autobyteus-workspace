<template>
  <section
    class="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
    :aria-labelledby="headingId"
    data-test="team-scope-config-editor"
    :data-team-address="address"
  >
    <div class="flex min-w-0 items-start gap-2">
      <button
        v-if="!isRoot"
        type="button"
        class="flex min-w-0 flex-1 items-start gap-2 rounded text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        :aria-expanded="expanded"
        :aria-controls="panelId"
        @click="expanded = !expanded"
      >
        <span aria-hidden="true" class="pt-0.5 text-slate-500">{{ expanded ? '▾' : '▸' }}</span>
        <span class="min-w-0 flex-1">
          <span :id="headingId" class="block truncate text-sm font-semibold text-slate-900">{{ displayName }}</span>
          <span class="block truncate font-mono text-xs text-slate-500" :title="address">{{ address }}</span>
        </span>
      </button>
      <div v-else class="min-w-0 flex-1">
        <h4 :id="headingId" class="text-sm font-semibold text-slate-900">{{ rootDefaultsLabel }}</h4>
        <p class="font-mono text-xs text-slate-500">/</p>
      </div>
      <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="stateBadgeClass">
        {{ stateLabel }}
      </span>
      <button
        v-if="!isRoot && isCustomized"
        type="button"
        class="rounded px-2 py-0.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        :aria-label="t('workspace.components.workspace.config.TeamScopeConfigEditor.reset_aria', { address })"
        :disabled="disabled"
        data-test="reset-team-scope"
        @click="resetScope"
      >
        {{ t('workspace.components.workspace.config.TeamScopeConfigEditor.reset') }}
      </button>
    </div>

    <div v-show="isRoot || expanded" :id="panelId" class="mt-4 border-t border-slate-100 pt-4">
      <p class="mb-3 text-xs text-slate-600" data-test="team-scope-effective-summary">
        <span class="font-semibold">{{ t('workspace.components.workspace.config.TeamScopeConfigEditor.effective') }}:</span>
        {{ effectiveConfig.runtimeKind }} · {{ effectiveConfig.llmModelIdentifier || noModelLabel }} ·
        {{ effectiveConfig.workspaceRootPath || t('workspace.components.workspace.config.StoredTeamRunConfig.none') }}
      </p>
      <p v-if="explicitFieldLabels.length" class="mb-3 text-xs text-amber-700" data-test="team-scope-explicit-fields">
        <span class="font-semibold">{{ t('workspace.components.workspace.config.TeamScopeConfigEditor.customized_fields') }}</span>
        {{ explicitFieldLabels.join(', ') }}
      </p>

      <div
        v-if="runtimeCatalogState.status === 'loading'"
        role="status"
        class="mb-3 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700"
        data-test="team-runtime-catalog-loading"
      >
        {{ t('workspace.components.workspace.config.TeamScopeConfigEditor.catalog_loading', { address }) }}
      </div>
      <div
        v-else-if="runtimeCatalogState.status === 'error'"
        role="alert"
        class="mb-3 flex items-start justify-between gap-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        data-test="team-runtime-catalog-error"
      >
        <span>{{ t('workspace.components.workspace.config.TeamScopeConfigEditor.catalog_error', { address, error: runtimeCatalogState.error || '' }) }}</span>
        <button type="button" class="font-semibold underline disabled:opacity-50" :disabled="disabled" @click="retryCatalog">
          {{ t('workspace.components.workspace.config.TeamScopeConfigEditor.retry') }}
        </button>
      </div>

      <RuntimeModelConfigFields
        :runtime-kind="effectiveConfig.runtimeKind"
        :llm-model-identifier="effectiveConfig.llmModelIdentifier"
        :llm-config="effectiveConfig.llmConfig"
        :disabled="disabled"
        :read-only="readOnly || disabled"
        :runtime-selection-locked="disabled"
        :runtime-help-text="t('workspace.components.workspace.config.TeamScopeConfigEditor.runtime_help')"
        :model-label="t('workspace.components.workspace.config.TeamScopeConfigEditor.team_default_model')"
        :model-help-text="t('workspace.components.workspace.config.TeamScopeConfigEditor.model_help')"
        :id-prefix="inputIdPrefix"
        :advanced-initially-expanded="readOnly"
        control-variant="quiet"
        @update:runtime-kind="updateField('runtime', $event)"
        @update:llm-model-identifier="updateField('model', $event)"
        @update:llm-config="updateField('llmConfig', $event)"
      />

      <div class="mt-6">
        <WorkspaceSelector
          :workspace-id="effectiveConfig.workspaceId"
          :is-loading="workspaceLoadingState.isLoading"
          :error="workspaceLoadingState.error"
          :initial-path="effectiveConfig.workspaceRootPath || workspaceLoadingState.loadedPath || ''"
          :disabled="disabled"
          :auto-select-default="isRoot"
          control-variant="quiet"
          @select-existing="selectWorkspace"
          @workspace-input-change="updateWorkspaceInput"
        />
      </div>

      <div class="mt-4 flex items-center justify-between gap-4 py-2">
        <div class="min-w-0">
          <label :for="autoExecuteId" class="block text-sm font-medium text-gray-700">
            {{ t('workspace.components.workspace.config.TeamScopeConfigEditor.auto_approve') }}
          </label>
          <p class="mt-1 text-xs text-gray-500">{{ t('workspace.components.workspace.config.TeamScopeConfigEditor.auto_help') }}</p>
        </div>
        <button
          :id="autoExecuteId"
          type="button"
          role="switch"
          :aria-checked="effectiveConfig.autoExecuteTools"
          :disabled="disabled"
          class="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          :class="effectiveConfig.autoExecuteTools ? 'bg-blue-600' : 'bg-gray-200'"
          @click="updateField('auto', !effectiveConfig.autoExecuteTools)"
        >
          <span class="sr-only">{{ t('workspace.components.workspace.config.TeamScopeConfigEditor.auto_approve') }}</span>
          <span aria-hidden="true" class="inline-block h-5 w-5 rounded-full bg-white shadow transition" :class="effectiveConfig.autoExecuteTools ? 'translate-x-5' : 'translate-x-0'" />
        </button>
      </div>

      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import RuntimeModelConfigFields from '~/components/launch-config/RuntimeModelConfigFields.vue'
import { useLocalization } from '~/composables/useLocalization'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { ResolvedTeamRunLaunchConfig, TeamScopeConfigOverride } from '~/types/agent/TeamRunConfig'
import type { RuntimeModelCatalogState, WorkspaceLoadingState } from '~/stores/teamRunConfigStore'
import { hasMeaningfulLaunchOverride, modelConfigsEqual } from '~/utils/teamRunConfigUtils'
import WorkspaceSelector from './WorkspaceSelector.vue'

const props = withDefaults(defineProps<{
  address: AgentTeamAddress
  displayName: string
  effectiveConfig: Readonly<ResolvedTeamRunLaunchConfig>
  inheritedConfig?: Readonly<ResolvedTeamRunLaunchConfig> | null
  override?: Readonly<TeamScopeConfigOverride> | null
  isRoot?: boolean
  isCustomized?: boolean
  disabled?: boolean
  readOnly?: boolean
  workspaceLoadingState?: WorkspaceLoadingState
  runtimeCatalogState?: RuntimeModelCatalogState
}>(), {
  inheritedConfig: null,
  override: null,
  isRoot: false,
  isCustomized: false,
  disabled: false,
  readOnly: false,
  workspaceLoadingState: () => ({ isLoading: false, error: null, loadedPath: null }),
  runtimeCatalogState: () => ({ status: 'idle', error: null }),
})
const emit = defineEmits<{
  (e: 'update-root', field: 'runtime' | 'model' | 'llmConfig' | 'auto', value: unknown): void
  (e: 'update-override', override: TeamScopeConfigOverride | null): void
  (e: 'reset'): void
  (e: 'select-existing', address: AgentTeamAddress, workspaceId: string): void
  (e: 'workspace-input-change', address: AgentTeamAddress, input: { mode: 'existing' | 'new'; pendingPath: string }): void
  (e: 'retry-runtime-catalog', runtimeKind: string): void
}>()
const { t } = useLocalization()
const expanded = ref(true)
const pendingOverride = ref<TeamScopeConfigOverride>({ ...(props.override ?? {}) })
watch(() => props.override, (value) => { pendingOverride.value = { ...(value ?? {}) } }, { deep: true })
const domKey = computed(() => props.address === '/' ? 'root' : props.address.slice(1).replaceAll('/', '-'))
const headingId = computed(() => `team-scope-${domKey.value}-heading`)
const panelId = computed(() => `team-scope-${domKey.value}-panel`)
const inputIdPrefix = computed(() => `team-scope-${domKey.value}`)
const autoExecuteId = computed(() => `${inputIdPrefix.value}-auto-execute`)
const noModelLabel = computed(() => t('workspace.components.workspace.config.TeamScopeConfigEditor.no_model'))
const rootDefaultsLabel = computed(() => t('workspace.components.workspace.config.TeamScopeConfigEditor.root_defaults'))
const stateLabel = computed(() => props.isRoot ? rootDefaultsLabel.value : t(`workspace.components.workspace.config.TeamScopeConfigEditor.${props.isCustomized ? 'customized' : 'inherited'}`))
const stateBadgeClass = computed(() => props.isCustomized ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600')
const explicitFieldLabels = computed(() => {
  const override = props.override ?? {}
  const labels: string[] = []
  if (override.runtimeKind !== undefined) labels.push(t('workspace.components.workspace.config.StoredTeamRunConfig.runtime'))
  if (override.llmModelIdentifier !== undefined) labels.push(t('workspace.components.workspace.config.StoredTeamRunConfig.model'))
  if (Object.hasOwn(override, 'llmConfig')) labels.push(t('workspace.components.workspace.config.StoredTeamRunConfig.model_config'))
  if (override.workspace !== undefined) labels.push(t('workspace.components.workspace.config.StoredTeamRunConfig.workspace'))
  if (override.autoExecuteTools !== undefined) labels.push(t('workspace.components.workspace.config.StoredTeamRunConfig.auto_execute'))
  return labels
})

const normalizeOverride = (value: TeamScopeConfigOverride): TeamScopeConfigOverride | null => {
  const inherited = props.inheritedConfig
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
  if (props.disabled) return
  if (props.isRoot) { emit('update-root', field, value); return }
  const next = { ...pendingOverride.value }
  if (field === 'runtime') next.runtimeKind = value as TeamScopeConfigOverride['runtimeKind']
  else if (field === 'model') next.llmModelIdentifier = value as string
  else if (field === 'llmConfig') next.llmConfig = value as Record<string, unknown> | null
  else next.autoExecuteTools = value as boolean
  emitOverride(next)
}
const resetScope = () => { if (!props.disabled) emit('reset') }
const selectWorkspace = (workspaceId: string) => { if (!props.disabled) emit('select-existing', props.address, workspaceId) }
const updateWorkspaceInput = (input: { mode: 'existing' | 'new'; pendingPath: string }) => { if (!props.disabled) emit('workspace-input-change', props.address, input) }
const retryCatalog = () => { if (!props.disabled) emit('retry-runtime-catalog', props.effectiveConfig.runtimeKind) }
</script>
