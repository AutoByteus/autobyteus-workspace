<template>
  <div class="flex min-h-0 flex-1 flex-col" :aria-busy="draftStore.loadingCanonical || draftStore.saving || draftStore.reconciling">
    <div v-if="!draft" class="flex-1 overflow-y-auto px-4 py-4">
      <p
        :role="draftStore.feedback?.kind === 'error' ? 'alert' : 'status'"
        class="text-sm"
        :class="draftStore.feedback?.kind === 'error' ? 'text-red-600' : 'text-gray-500'"
        data-test="existing-run-loading"
      >
        {{ draftStore.feedback?.kind === 'error' ? draftStore.feedback.message : t('workspace.runModelConfig.loading') }}
      </p>
    </div>

    <ExistingRunSettings
      v-else-if="view"
      :key="view.key"
      :kind="view.kind"
      :name="view.name"
      :is-active="draft.isActive"
      :can-edit="canEdit"
      :state="state"
      :stop="{ label: stopAction.label.value, pending: stopAction.pending.value, error: stopAction.error.value }"
      :root="view.root"
      :root-locked-models="lockedModelsFor('/')"
      :root-model-unavailable="modelUnavailable('/')"
      :members="view.members"
      :locked-models-for="lockedModelsFor"
      :dirty="draftStore.dirty"
      :can-save="draftStore.canSave"
      :saving="draftStore.saving || draftStore.reconciling"
      :saved="draftStore.feedback?.kind === 'success'"
      :save-error="saveError"
      @stop="stopAction.stop"
      @refresh="draftStore.retryCanonicalRefresh"
      @change-root="(change) => changeScope('/', change)"
      @change-member="changeScope"
      @cancel="draftStore.discardChanges"
      @save="draftStore.save"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import { storeToRefs } from 'pinia'
import ExistingRunSettings from '~/components/run-settings/ExistingRunSettings.vue'
import { useAgentContextsStore } from '~/stores/agentContextsStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useExistingRunConfigStore } from '~/stores/existingRunConfigStore'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { useLocalization } from '~/composables/useLocalization'
import { useRunStopAction, type RunStopSubject } from '~/composables/runSettings/useRunStopAction'
import type { ChatModelOption } from '~/composables/chat/useChatModelCatalog'
import {
  runWorkspaceChoiceFromRootPath,
  sameRunWorkspaceChoice,
  toWorkspaceSelection,
} from '~/services/workspace/runWorkspaceChoice'
import type { RunMemberSettingChange, RunSettingsValues } from '~/types/runSettings/RunSettings'
import type { ExistingRunModelChoice } from '~/types/agent/ExistingRunModelConfigDraft'
import { buildSavedRunMemberTree, type RunMemberNode } from '~/utils/runSettings/runMemberTree'
import {
  existingRunChoiceLabelInput,
  getModelSelectionOptionDescription,
  getModelSelectionOptionLabel,
} from '~/utils/modelSelectionLabel'

/**
 * The saved-run settings container (Edit Config): loads the selected run into
 * `existingRunConfigStore` and maps its state onto `ExistingRunSettings`. Edits, Cancel, Save and
 * Refresh go to the store; the stop icon goes through `useRunStopAction`, then re-reads the run.
 */
const props = defineProps<{ target?: Readonly<{ kind: 'agent_org'; orgRunId: string }> | null }>()

const selection = useAgentSelectionStore()
const history = useRunHistoryStore()
const draftStore = useExistingRunConfigStore()
const contexts = useAgentContextsStore()
const definitions = useAgentDefinitionStore()
const catalogs = useLLMProviderConfigStore()
const { t } = useLocalization()
const { draft } = storeToRefs(draftStore)

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

const stopSubject = computed<RunStopSubject | null>(() => {
  const current = draft.value
  if (!current) return null
  if (current.kind === 'agent') return { kind: 'agent', runId: current.runId }
  if (current.kind === 'team') return { kind: 'team', teamRunId: current.teamRunId }
  return { kind: 'agent_org', orgRunId: current.orgRunId }
})
const stopAction = useRunStopAction(stopSubject, { onStopped: () => draftStore.reloadCanonical() })

const refreshRequired = computed(() => draftStore.reconciliationRequired || draft.value?.editability.reason === 'REFRESH_REQUIRED')
const state = computed<'editable' | 'read_only' | 'refresh_required'>(() => {
  if (refreshRequired.value) return 'refresh_required'
  return draft.value?.editability.editable ? 'editable' : 'read_only'
})
const canEdit = computed(() => Boolean(draft.value && draft.value.editability.editable && !draft.value.isActive
  && !refreshRequired.value && !draftStore.saving && !draftStore.reconciling && !draftStore.loadingCanonical))
const saveError = computed(() => (draftStore.feedback?.kind === 'error' ? draftStore.feedback.message : null))

const schemaFor = (runtimeKind: string, llmModelIdentifier: string) => catalogs.modelConfigSchemaByIdentifier(runtimeKind, llmModelIdentifier)

/** The saved run as run-settings values and member rows. */
const view = computed<{ key: string; kind: 'agent' | 'team' | 'org'; name: string; root: RunSettingsValues; members: readonly RunMemberNode[] } | null>(() => {
  const current = draft.value
  if (!current) return null
  if (current.kind === 'agent') {
    const hydrated = contexts.getConfigForRun(current.runId)
    const definition = definitions.getAgentDefinitionById(current.metadata.agentDefinitionId)
    return {
      key: `agent:${current.runId}`,
      kind: 'agent',
      name: definition?.name ?? hydrated?.agentDefinitionName ?? current.metadata.agentDefinitionId,
      root: {
        workspace: runWorkspaceChoiceFromRootPath(current.metadata.workspaceRootPath)
          ?? (hydrated?.workspaceId ? { kind: 'existing', workspaceId: hydrated.workspaceId } : null),
        runtimeKind: current.metadata.runtimeKind ?? 'autobyteus',
        llmModelIdentifier: current.draftSelection.llmModelIdentifier,
        llmConfig: current.draftSelection.llmConfig,
        autoExecuteTools: current.metadata.autoExecuteTools,
      },
      members: [],
    }
  }
  const tree = buildSavedRunMemberTree(current.kind === 'team'
    ? { kind: 'team', tree: current.executionTree, planner: current.planner }
    : { kind: 'agent_org', tree: current.executionTree, planner: current.planner, workspaceDraft: current.workspaceDraft },
  { schemaFor, sameWorkspace: sameRunWorkspaceChoice, workspaceFromRootPath: runWorkspaceChoiceFromRootPath })
  return {
    key: current.kind === 'team' ? `team:${current.teamRunId}` : `agent_org:${current.orgRunId}`,
    kind: current.kind === 'team' ? 'team' : 'org',
    name: tree.name,
    root: tree.root,
    members: tree.nodes,
  }
})

const runtimeOf = (address: string): string => {
  const current = draft.value
  if (!current) return ''
  if (current.kind === 'agent') return current.metadata.runtimeKind ?? 'autobyteus'
  return current.planner.scopesByAddress[address]?.runtimeKind ?? ''
}

const toChatModelOption = (runtimeKind: string, choice: ExistingRunModelChoice): ChatModelOption => {
  const labelInput = existingRunChoiceLabelInput(choice)
  return {
    runtimeKind,
    llmModelIdentifier: choice.llmModelIdentifier,
    label: getModelSelectionOptionLabel(labelInput, runtimeKind),
    secondary: getModelSelectionOptionDescription(labelInput, runtimeKind),
    recommended: choice.recommended,
    providerName: choice.providerName,
    displayName: choice.displayName || null,
    canonicalName: choice.canonicalName || null,
  }
}

/** REQ-017: the saved-run model menu lists the run's runtime's models the server allows for this scope. */
const lockedModelsFor = (address: string): readonly ChatModelOption[] | null => {
  const options = draftStore.modelOptionsByAddress[address]?.options
  if (!options) return []
  const runtimeKind = runtimeOf(address)
  const rows = [...(options.currentModel ? [options.currentModel] : []), ...options.replacements]
  const seen = new Set<string>()
  return rows.filter((row) => !seen.has(row.llmModelIdentifier) && seen.add(row.llmModelIdentifier))
    .map((row) => toChatModelOption(runtimeKind, row))
}

/** REQ-016: the run's model is no longer offered by its runtime (and is still chosen). */
const modelUnavailable = (address: string): boolean => {
  const current = draft.value
  const options = draftStore.modelOptionsByAddress[address]
  if (!current || options?.status !== 'ready' || !options.options) return false
  const selected = current.kind === 'agent'
    ? current.draftSelection.llmModelIdentifier
    : current.planner.scopesByAddress[address]?.draftSelection.llmModelIdentifier
  return selected === options.options.currentModelIdentifier && !options.options.currentModel
}

const selectionOf = (address: string) => {
  const current = draft.value
  if (!current) return null
  return current.kind === 'agent' ? current.draftSelection : current.planner.scopesByAddress[address]?.draftSelection ?? null
}

const updateScope = (address: string, llmModelIdentifier: string, llmConfig: Record<string, unknown> | null) => {
  const current = draft.value
  if (!current) return
  const next = { llmModelIdentifier, llmConfig }
  if (current.kind === 'agent') draftStore.updateAgentModelConfig(next)
  else if (current.kind === 'team') draftStore.updateTeamScopeModelConfig(address, next)
  else draftStore.updateAgentOrgScopeModelConfig(address, next)
}

const changeScope = (address: string, change: RunMemberSettingChange) => {
  const current = selectionOf(address)
  if (!current || !canEdit.value) return
  if (change.field === 'model') {
    // A saved-run replacement commits the target with its own defaults (`null`), as before.
    updateScope(address, change.choice.llmModelIdentifier, null)
  } else if (change.field === 'thinking') {
    updateScope(address, current.llmModelIdentifier, change.llmConfig)
  } else if (change.field === 'workspace' && draft.value?.kind === 'agent_org') {
    draftStore.updateAgentOrgWorkspaceSelection(address, toWorkspaceSelection(change.choice))
  }
}
</script>
