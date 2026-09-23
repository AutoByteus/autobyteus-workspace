<template>
  <div class="flex min-h-0 flex-1 flex-col" :aria-busy="draftStore.loadingCanonical || draftStore.saving || draftStore.reconciling">
    <div class="flex-1 overflow-y-auto px-4 py-4">
      <div
        v-if="!draft"
        :role="draftStore.feedback?.kind === 'error' ? 'alert' : 'status'"
        class="rounded border px-3 py-2 text-sm"
        :class="draftStore.feedback?.kind === 'error'
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-blue-100 bg-blue-50 text-blue-700'"
      >
        {{ draftStore.feedback?.kind === 'error'
          ? draftStore.feedback.message
          : t('workspace.runModelConfig.loading') }}
      </div>

      <AgentRunConfigForm
        v-else-if="draft.kind === 'agent' && agentConfig && agentDefinition"
        :config="agentConfig"
        :agent-definition="agentDefinition"
        :workspace-loading-state="{ isLoading: false, error: null, loadedPath: draft.metadata.workspaceRootPath }"
        :workspace-selection="agentWorkspaceSelection"
        :workspace-locked="true"
        :runtime-locked="true"
        :existing-run="true"
        :existing-model-config-editable="draft.editability.editable && !draft.isActive && !draftStore.reconciliationRequired"
        :existing-model-config-reason="draftStore.reconciliationRequired ? 'REFRESH_REQUIRED' : draft.editability.reason"
        :saving="draftStore.saving || draftStore.reconciling"
        :model-config-field-errors="agentModelConfigFieldErrors"
        :original-model-identifier="draft.metadata.llmModelIdentifier"
        :model-options="draftStore.modelOptionsByAddress['/']"
        @selection-change="draftStore.updateAgentModelConfig"
        @schema-state="draftStore.setSchemaState('/', $event)"
      />

      <TeamRunConfigForm
        v-else-if="draft.kind === 'team'"
        :model="teamFormModel"
        :model-config-field-errors-by-address="teamModelConfigFieldErrorsByAddress"
        @update-existing-model-config="draftStore.updateTeamScopeModelConfig"
        @schema-state="draftStore.setSchemaState"
      />

      <AgentOrgRunConfigForm
        v-else-if="draft.kind === 'agent_org'"
        class="mx-auto max-w-3xl"
        :existing-model="agentOrgFormModel"
        :model-config-field-errors-by-address="teamModelConfigFieldErrorsByAddress"
        @update-existing-model-config="draftStore.updateAgentOrgScopeModelConfig"
        @update:workspace-selection="draftStore.updateAgentOrgWorkspaceSelection"
        @schema-state="draftStore.setSchemaState"
      />

      <div v-else role="alert" class="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {{ t('workspace.runModelConfig.runUnavailable') }}
      </div>

      <ul v-if="draftStore.fieldErrors.length" role="alert" class="mt-4 space-y-1 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        <li v-for="error in draftStore.fieldErrors" :key="`${error.path}:${error.message}`">
          <span class="font-mono text-xs">{{ error.path }}</span>: {{ error.message }}
        </li>
      </ul>
    </div>

    <div class="border-t border-gray-200 bg-gray-50 px-4 py-3">
      <p
        v-if="draftStore.feedback && draft"
        :role="draftStore.feedback.kind === 'error' ? 'alert' : 'status'"
        :aria-live="draftStore.feedback.kind === 'error' ? 'assertive' : 'polite'"
        class="mb-2 text-xs"
        :class="draftStore.feedback.kind === 'error' ? 'text-red-700' : draftStore.feedback.kind === 'success' ? 'text-emerald-700' : 'text-blue-700'"
      >
        {{ draftStore.feedback.message }}
      </p>
      <button
        v-if="draftStore.reconciliationRequired || draft?.editability.reason === 'REFRESH_REQUIRED'"
        type="button"
        class="mb-2 inline-flex w-full justify-center rounded-md border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="draftStore.loadingCanonical || draftStore.reconciling"
        @click="draftStore.retryCanonicalRefresh"
      >
        {{ t('workspace.runModelConfig.retry') }}
      </button>
      <button
        type="button"
        data-test="save-existing-model-config"
        class="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!draftStore.canSave"
        @click="draftStore.save"
      >
        {{ draftStore.saving
          ? t('workspace.runModelConfig.saving')
          : draftStore.reconciling
            ? t('workspace.runModelConfig.verifying')
            : t('workspace.runModelConfig.save') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { useExistingRunConfigStore } from '~/stores/existingRunConfigStore'
import { useAgentContextsStore } from '~/stores/agentContextsStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import type { AgentRunConfig, SkillAccessMode } from '~/types/agent/AgentRunConfig'
import type { WorkspaceSelectionState } from '~/types/workspace/WorkspaceSelectionState'
import { projectExistingTeamRunFormModel } from '~/services/runConfigEditing/existingTeamRunFormModel'
import { projectExistingAgentOrgRunFormModel } from '~/services/runConfigEditing/existingAgentOrgRunFormModel'
import AgentRunConfigForm from './AgentRunConfigForm.vue'
import TeamRunConfigForm from './TeamRunConfigForm.vue'
import AgentOrgRunConfigForm from './AgentOrgRunConfigForm.vue'
import { useLocalization } from '~/composables/useLocalization'

const selection = useAgentSelectionStore()
const history = useRunHistoryStore()
const draftStore = useExistingRunConfigStore()
const contexts = useAgentContextsStore()
const definitions = useAgentDefinitionStore()
const { t } = useLocalization()
const { draft } = storeToRefs(draftStore)
const props = defineProps<{ target?: Readonly<{ kind: 'agent_org'; orgRunId: string }> | null }>()

type SelectedRunKind = 'agent' | 'team' | 'agent_org'
const selectedKind = computed<SelectedRunKind | null>(() => {
  if (props.target) return 'agent_org'
  const subject = selection.subject
  if (subject?.kind === 'agent_run') return 'agent'
  if (subject?.kind === 'team_run') return 'team'
  return null
})
const selectedRunId = computed(() => {
  if (props.target) return props.target.orgRunId
  const subject = selection.subject
  if (subject?.kind === 'agent_run') return subject.runId
  if (subject?.kind === 'team_run') return subject.rootTeamRunId
  return null
})

const selectedCanonical = computed(() => {
  const subject = selection.subject
  if (subject?.kind === 'agent_run') return history.resumeConfigByRunId[subject.runId] ?? null
  if (subject?.kind === 'team_run') return history.teamResumeConfigByTeamRunId[subject.rootTeamRunId] ?? null
  return null
})

watch([selectedKind, selectedRunId], ([kind, id]) => {
  if (!kind || !id) {
    draftStore.clear()
    return
  }
  if (kind === 'agent') void draftStore.loadAgentCanonical(id)
  else if (kind === 'team') void draftStore.loadTeamCanonical(id)
  else void draftStore.loadAgentOrgCanonical(id)
}, { immediate: true })

watch(selectedCanonical, (payload) => {
  if (!payload) return
  if ('runId' in payload) draftStore.applyCachedAgentLifecycle(payload)
  else draftStore.applyCachedTeamLifecycle(payload)
}, { deep: true })

onBeforeUnmount(() => draftStore.clear())

const agentConfig = computed<AgentRunConfig | null>(() => {
  const current = draft.value
  if (current?.kind !== 'agent') return null
  const hydrated = contexts.getConfigForRun(current.runId)
  return {
    agentDefinitionId: current.metadata.agentDefinitionId,
    agentDefinitionName: hydrated?.agentDefinitionName ?? 'Agent',
    agentAvatarUrl: hydrated?.agentAvatarUrl ?? null,
    runtimeKind: current.metadata.runtimeKind ?? 'autobyteus',
    ...current.draftSelection,
    workspaceId: hydrated?.workspaceId ?? null,
    workspaceMetadata: hydrated?.workspaceMetadata ?? null,
    autoExecuteTools: current.metadata.autoExecuteTools,
    skillAccessMode: (current.metadata.skillAccessMode ?? 'PRELOADED_ONLY') as SkillAccessMode,
    isLocked: true,
  }
})
const agentDefinition = computed(() => agentConfig.value
  ? definitions.getAgentDefinitionById(agentConfig.value.agentDefinitionId) ?? { name: agentConfig.value.agentDefinitionName }
  : null)
const agentWorkspaceSelection = computed<WorkspaceSelectionState>(() => ({
  mode: 'existing',
  existingWorkspaceId: agentConfig.value?.workspaceId ?? null,
  newWorkspacePath: draft.value?.kind === 'agent' ? draft.value.metadata.workspaceRootPath : '',
}))
const agentModelConfigFieldErrors = computed<Record<string, string>>(() => Object.fromEntries(
  draftStore.fieldErrors.flatMap((error) => {
    const match = /^llmConfig\.([^.[]+)/.exec(error.path)
    return match ? [[match[1]!, error.message]] : []
  }),
))
const teamModelConfigFieldErrorsByAddress = computed<Record<string, Record<string, string>>>(() => {
  const byAddress: Record<string, Record<string, string>> = {}
  for (const error of draftStore.fieldErrors) {
    const match = /^(?:patches|modelPatches)\[(.+)]\.llmConfig\.([^.[]+)/.exec(error.path)
    if (!match) continue
    const addressErrors = byAddress[match[1]!] ??= {}
    addressErrors[match[2]!] = error.message
  }
  return byAddress
})
const teamFormModel = computed(() => {
  const current = draft.value
  if (current?.kind !== 'team') throw new Error('Existing Team form requires a Team draft.')
  return projectExistingTeamRunFormModel({
    tree: current.executionTree,
    planner: current.planner,
    isActive: current.isActive,
    modelConfigEditable: current.editability.editable && !current.isActive && !draftStore.reconciliationRequired,
    modelConfigReason: draftStore.reconciliationRequired ? 'REFRESH_REQUIRED' : current.editability.reason ?? null,
    modelOptionsByAddress: draftStore.modelOptionsByAddress,
    saving: draftStore.saving || draftStore.reconciling,
  })
})
const agentOrgFormModel = computed(() => {
  const current = draft.value
  if (current?.kind !== 'agent_org') throw new Error('Existing AgentOrg form requires an AgentOrg draft.')
  return projectExistingAgentOrgRunFormModel({
    workspaceDraft: current.workspaceDraft,
    tree: current.executionTree,
    planner: current.planner,
    isActive: current.isActive,
    modelConfigEditable: current.editability.editable && !current.isActive && !draftStore.reconciliationRequired,
    modelConfigReason: draftStore.reconciliationRequired ? 'REFRESH_REQUIRED' : current.editability.reason ?? null,
    modelOptionsByAddress: draftStore.modelOptionsByAddress,
    saving: draftStore.saving || draftStore.reconciling,
  })
})
</script>
