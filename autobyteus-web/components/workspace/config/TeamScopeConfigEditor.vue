<template>
  <section class="rounded-lg border border-slate-200 bg-white p-3" :data-test="isRoot ? 'root-team-scope-editor' : 'nested-team-scope-editor'">
    <header v-if="!isRoot" class="flex items-start justify-between gap-3">
      <button
        type="button"
        class="flex min-w-0 flex-1 items-center gap-2 rounded text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        :aria-expanded="expanded"
        :aria-controls="panelId"
        @click="expanded = !expanded"
      >
        <span aria-hidden="true" class="text-slate-500">{{ expanded ? '▾' : '▸' }}</span>
        <span class="min-w-0">
          <span class="block truncate text-sm font-semibold text-slate-900">{{ displayName }}</span>
          <span class="block truncate font-mono text-xs text-slate-500">{{ address }}</span>
        </span>
        <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="isCustomized ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'">
          {{ isCustomized ? t('workspace.components.workspace.config.TeamScopeConfigEditor.customized') : t('workspace.components.workspace.config.TeamScopeConfigEditor.inherited') }}
        </span>
      </button>
      <button
        v-if="isCustomized"
        type="button"
        class="rounded px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
        :disabled="disabled"
        :aria-label="t('workspace.components.workspace.config.TeamScopeConfigEditor.reset_aria', { address })"
        @click="$emit('reset', address)"
      >{{ t('workspace.components.workspace.config.TeamScopeConfigEditor.reset') }}</button>
    </header>
    <div v-if="isRoot" class="mb-3">
      <h4 class="text-sm font-semibold text-slate-900">{{ t('workspace.components.workspace.config.TeamScopeConfigEditor.root_defaults') }}</h4>
      <p class="font-mono text-xs text-slate-500">/</p>
    </div>
    <div v-show="isRoot || expanded" :id="panelId" :class="{ 'mt-4 border-t border-slate-100 pt-4': !isRoot }">
      <p v-if="!isRoot" class="mb-3 text-xs text-slate-500">
        {{ t('workspace.components.workspace.config.TeamScopeConfigEditor.effective') }}: {{ effectiveConfig.runtimeKind }} · {{ effectiveConfig.llmModelIdentifier || t('workspace.components.workspace.config.TeamScopeConfigEditor.no_model') }}
      </p>
      <p
        v-if="runtimeCatalogState.status === 'loading'"
        role="status"
        class="mb-3 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700"
        data-test="team-runtime-catalog-loading"
      >{{ t('workspace.components.workspace.config.TeamScopeConfigEditor.catalog_loading', { address }) }}</p>
      <div
        v-else-if="runtimeCatalogState.status === 'error'"
        role="alert"
        class="mb-3 flex items-start justify-between gap-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        data-test="team-runtime-catalog-error"
      >
        <span>{{ t('workspace.components.workspace.config.TeamScopeConfigEditor.catalog_error', { address, error: runtimeCatalogState.error || '' }) }}</span>
        <button type="button" class="font-semibold underline" @click="$emit('retry-runtime-catalog', effectiveConfig.runtimeKind)">
          {{ t('workspace.components.workspace.config.TeamScopeConfigEditor.retry') }}
        </button>
      </div>
      <RuntimeModelConfigFields
        :runtime-kind="effectiveConfig.runtimeKind"
        :llm-model-identifier="effectiveConfig.llmModelIdentifier"
        :llm-config="effectiveConfig.llmConfig"
        :disabled="disabled"
        :read-only="disabled"
        :runtime-selection-locked="disabled"
        :runtime-help-text="t('workspace.components.workspace.config.TeamScopeConfigEditor.runtime_help')"
        :model-label="t('workspace.components.workspace.config.TeamScopeConfigEditor.team_default_model')"
        :model-help-text="t('workspace.components.workspace.config.TeamScopeConfigEditor.model_help')"
        :advanced-initially-expanded="readOnly"
        :missing-historical-config="readOnly && effectiveConfig.llmConfig == null"
        :id-prefix="idPrefix"
        control-variant="quiet"
        @update:runtime-kind="updateRuntime"
        @update:llm-model-identifier="updateModel"
        @update:llm-config="updateLlmConfig"
      />
      <div class="mt-5">
        <WorkspaceSelector
          :workspace-id="effectiveConfig.workspaceId"
          :is-loading="workspaceLoadingState.isLoading"
          :error="workspaceLoadingState.error"
          :initial-path="workspaceLoadingState.loadedPath || effectiveConfig.workspaceMetadata?.workspaceRootPath || ''"
          :disabled="disabled"
          control-variant="quiet"
          @select-existing="$emit('select-existing', address, $event)"
          @workspace-input-change="$emit('workspace-input-change', address, $event)"
        />
      </div>
      <div class="mt-4 flex items-center justify-between gap-4 py-2">
        <div>
          <label :for="`${idPrefix}-auto-execute`" class="text-sm text-slate-900">{{ t('workspace.components.workspace.config.TeamScopeConfigEditor.auto_approve') }}</label>
          <p class="text-xs text-slate-500">{{ t('workspace.components.workspace.config.TeamScopeConfigEditor.auto_help') }}</p>
        </div>
        <button
          :id="`${idPrefix}-auto-execute`"
          type="button"
          role="switch"
          :aria-checked="effectiveConfig.autoExecuteTools"
          :disabled="disabled"
          class="relative h-6 w-11 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50"
          :class="effectiveConfig.autoExecuteTools ? 'bg-indigo-600' : 'bg-slate-300'"
          @click="updateAuto(!effectiveConfig.autoExecuteTools)"
        ><span aria-hidden="true" class="block h-5 w-5 translate-y-0.5 rounded-full bg-white transition" :class="effectiveConfig.autoExecuteTools ? 'translate-x-5' : 'translate-x-0.5'" /></button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import RuntimeModelConfigFields from '~/components/launch-config/RuntimeModelConfigFields.vue'
import WorkspaceSelector from './WorkspaceSelector.vue'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { ResolvedTeamRunLaunchConfig, TeamScopeConfigOverride } from '~/types/agent/TeamRunConfig'
import type { RuntimeModelCatalogState, WorkspaceLoadingState } from '~/stores/teamRunConfigStore'
import { useLocalization } from '~/composables/useLocalization'

const props = defineProps<{
  address: AgentTeamAddress
  displayName: string
  effectiveConfig: Readonly<ResolvedTeamRunLaunchConfig>
  override?: Readonly<TeamScopeConfigOverride> | null
  isRoot?: boolean
  isCustomized?: boolean
  disabled: boolean
  readOnly?: boolean
  workspaceLoadingState: WorkspaceLoadingState
  runtimeCatalogState: RuntimeModelCatalogState
}>()
const emit = defineEmits<{
  (e: 'update-root', field: 'runtime' | 'model' | 'llmConfig' | 'auto', value: unknown): void
  (e: 'update-override', address: AgentTeamAddress, override: TeamScopeConfigOverride | null): void
  (e: 'reset', address: AgentTeamAddress): void
  (e: 'select-existing', address: AgentTeamAddress, workspaceId: string): void
  (e: 'workspace-input-change', address: AgentTeamAddress, input: { mode: 'existing' | 'new'; pendingPath: string }): void
  (e: 'retry-runtime-catalog', runtimeKind: string): void
}>()
const { t } = useLocalization()
const expanded = ref(Boolean(props.isCustomized || props.readOnly))
const idPrefix = computed(() => `team-scope-${props.address === '/' ? 'root' : props.address.slice(1).replaceAll('/', '-')}`)
const panelId = computed(() => `${idPrefix.value}-panel`)
const emitField = (field: 'runtimeKind' | 'llmModelIdentifier' | 'llmConfig' | 'autoExecuteTools', value: unknown) => {
  if (props.disabled) return
  if (props.isRoot) {
    const rootField = field === 'runtimeKind' ? 'runtime' : field === 'llmModelIdentifier' ? 'model' : field === 'autoExecuteTools' ? 'auto' : 'llmConfig'
    emit('update-root', rootField, value); return
  }
  const next: TeamScopeConfigOverride = { ...(props.override || {}), [field]: value }
  emit('update-override', props.address, next)
}
const updateRuntime = (value: string) => emitField('runtimeKind', value)
const updateModel = (value: string) => emitField('llmModelIdentifier', value)
const updateLlmConfig = (value: Record<string, unknown> | null) => emitField('llmConfig', value)
const updateAuto = (value: boolean) => emitField('autoExecuteTools', value)
</script>
