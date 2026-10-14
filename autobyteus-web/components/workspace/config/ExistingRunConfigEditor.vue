<template>
  <div class="flex min-h-0 flex-1 flex-col" :aria-busy="draftStore.loadingCanonical || draftStore.saving || draftStore.reconciling || delegatedDraft.saving">
    <div v-if="!draft" class="flex-1 overflow-y-auto px-4 py-4">
      <p
        :role="draftStore.feedback?.kind === 'error' ? 'alert' : 'status'"
        class="text-sm"
        :class="draftStore.feedback?.kind === 'error' ? 'text-red-600' : 'text-gray-500'"
        data-test="existing-run-loading"
      >
        {{ draftStore.feedback?.kind === 'error' ? draftStore.feedback.message : t('workspace.runModelConfig.loading') }}
      </p>
      <button v-if="draftStore.reconciliationRequired" type="button" data-test="existing-run-refresh"
        class="mt-2 rounded px-1 text-sm font-medium text-blue-600 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500/40"
        @click="draftStore.retryCanonicalRefresh">{{ t('runSettings.existing.refresh') }}</button>
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
      :delegated="delegatedRows"
      :delegated-locked-models-for="delegatedLockedModelsFor"
      :delegated-notice="delegatedNotice"
      :dirty="draftStore.dirty || delegatedDraft.dirty"
      :can-save="canSave"
      :saving="draftStore.saving || draftStore.reconciling || delegatedDraft.saving"
      :saved="draftStore.feedback?.kind === 'success' || delegatedDraft.feedback?.kind === 'success'"
      :save-error="saveError"
      @stop="stopAction.stop"
      @refresh="draftStore.retryCanonicalRefresh"
      @change-root="(change) => changeScope('/', change)"
      @change-member="changeScope"
      @change-delegated="changeDelegated"
      @stop-delegated="stopDelegated"
      @cancel="cancel"
      @save="save"
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
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useExistingRunConfigStore } from '~/stores/existingRunConfigStore'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore'
import {
  collaborationTaskExecutionLists,
  collaboratorAgentSourceAt,
} from '~/services/collaborators/agentSourceSelectors'
import {
  collaborationDelegatedLaunchNodes,
  delegatedRowsByKey,
  teamDelegatedLaunchNodes,
  type DelegatedRowControl,
} from '~/utils/runSettings/delegatedLaunchRows'
import { useDelegatedLaunchDraftStore } from '~/stores/delegatedLaunchDraftStore'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { planExistingTeamModelConfigPatches } from '~/services/runConfigEditing/existingTeamModelConfigDraft'
import { planExistingAgentOrgModelConfigPatches } from '~/services/runConfigEditing/existingAgentOrgModelConfigDraft'
import { existingAgentOrgWorkspacesDirty } from '~/services/runConfigEditing/existingAgentOrgWorkspaceDraft'
import type { DelegatedConfiguredPatch, DelegatedRoot } from '~/services/runConfigEditing/delegatedLaunchSelectionClient'
import type { RunMemberDelegatedFacts } from '~/utils/runSettings/runMemberTree'
import { AgentStatus } from '~/types/agent/AgentStatus'
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
const windowNode = useWindowNodeContextStore()
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

watch([selectedKind, selectedRunId, () => windowNode.bindingRevision], ([kind, id]) => {
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

const delegatedDraft = useDelegatedLaunchDraftStore()
/** The run whose copies and collaborators are shown (DS-001): their choices are kept per run. */
const delegatedRoot = computed<DelegatedRoot | null>(() => {
  const kind = selectedKind.value, rootRunId = selectedRunId.value
  if (!kind || !rootRunId) return null
  return { rootKind: kind === 'agent' ? 'AGENT' : kind === 'team' ? 'AGENT_TEAM' : 'AGENT_ORG', rootRunId }
})
// Bind to selection, not draft publication: another run/node invalidates in-flight saves immediately.
watch([delegatedRoot, () => windowNode.bindingRevision], ([root]) => delegatedDraft.bind(root), { immediate: true })

onBeforeUnmount(() => { draftStore.clear(); delegatedDraft.bind(null) })

const stopSubject = computed<RunStopSubject | null>(() => {
  const current = draft.value
  if (!current) return null
  if (current.kind === 'agent') return { kind: 'agent', runId: current.runId }
  if (current.kind === 'team') return { kind: 'team', teamRunId: current.teamRunId }
  return { kind: 'agent_org', orgRunId: current.orgRunId }
})
const stopAction = useRunStopAction(stopSubject, { onStopped: async () => { await draftStore.reloadCanonical() } })

const refreshRequired = computed(() => draftStore.reconciliationRequired || draft.value?.editability.reason === 'REFRESH_REQUIRED')
const state = computed<'editable' | 'read_only' | 'refresh_required'>(() => {
  if (refreshRequired.value) return 'refresh_required'
  return draft.value?.editability.editable ? 'editable' : 'read_only'
})
const canEdit = computed(() => Boolean(draft.value && draft.value.editability.editable && !draft.value.isActive
  && !refreshRequired.value && !delegatedDraft.saving && !draftStore.saving && !draftStore.reconciling && !draftStore.loadingCanonical))
const saveError = computed(() => (draftStore.feedback?.kind === 'error' ? draftStore.feedback.message
  : delegatedDraft.feedback?.kind === 'error' ? delegatedDraft.feedback.message : null))

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

/** An agent of the open run is live (its status is not offline); a stopped run's agents never are. */
const isAgentLive = (agentRunId: string): boolean => {
  const current = draft.value
  if (!current?.isActive) return false
  const context = current.kind === 'team' ? useAgentTeamContextsStore().getTeamContextById(current.teamRunId)?.view
    : current.kind === 'agent_org' ? useAgentOrgContextsStore().contextFor(current.orgRunId)
      : useAgentRunCollaborationStore().contextFor(current.runId)
  const status = context?.getAgentContext(agentRunId)?.state.currentStatus ?? AgentStatus.Offline
  return status !== AgentStatus.Offline
}
/**
 * SR-007: a stopped copy's model can change while the run is stopped and editable, or while it runs
 * (only its copies can then change); never while it is archived, owned elsewhere, or anything is in flight.
 */
const delegatedEditable = computed(() => Boolean(draft.value && !refreshRequired.value && !delegatedDraft.saving && !draftStore.saving && !draftStore.reconciling
  && !draftStore.loadingCanonical
  && (draft.value.editability.editable || (draft.value.isActive && draft.value.editability.reason === 'RUN_ACTIVE'))))
const delegatedControl = computed<DelegatedRowControl>(() => {
  const root = delegatedRoot.value
  return {
    editable: delegatedEditable.value,
    isAgentLive,
    isStopping: (reference) => Boolean(root && delegatedDraft.isStopping(root, reference)),
    draftOf: (target) => delegatedDraft.edits[target] ?? null,
  }
})

/**
 * REQ-007 (SR-007): collaborators and open delegated copies of the run. Team and Org runs read the
 * saved tree; a stopped Agent reads its Settings snapshot, an active Agent its live view. Closed copies are left out.
 */
const delegatedRows = computed<readonly RunMemberNode[]>(() => {
  const current = draft.value
  if (!current) return []
  const deps = { schemaFor, sameWorkspace: sameRunWorkspaceChoice }
  if (current.kind === 'team') {
    const closed = useAgentTeamContextsStore().getTeamContextById(current.teamRunId)?.view.getClosedTaskExecutions() ?? []
    return teamDelegatedLaunchNodes(current.executionTree, closed, deps, delegatedControl.value)
  }
  const view = current.kind === 'agent' ? (current.isActive
    ? useAgentRunCollaborationStore().contextFor(current.runId)?.view ?? null : current.delegatedSnapshot) : null
  if (current.kind === 'agent' && !view) return []
  const org = current.kind === 'agent_org' ? current.executionTree.rootOrg : null
  const collaborators = org?.collaborators ?? view!.execution_tree.collaborators
  const configured = (org?.members ?? []).flatMap((member) => 'agentRunId' in member ? [member] : member.members)
  const teams = [...(org?.members ?? []).flatMap((member) => 'teamRunId' in member ? [member] : []),
    ...collaborators.flatMap((entry) => entry.kind === 'agent_team' ? [entry] : [])]
  return collaborationDelegatedLaunchNodes({
    collaborators,
    taskExecutions: collaborationTaskExecutionLists({
      taskExecutions: org?.taskExecutions ?? view!.execution_tree.taskExecutions, members: org?.members ?? [], collaborators,
    }),
    launchAt: (address) => configured.find((agent) => agent.address === address)?.launchConfiguration
      ?? collaboratorAgentSourceAt(collaborators, address)?.launchConfiguration
      ?? teams.find((team) => team.address === address)?.defaultLaunchConfiguration ?? null,
    coordinatorAt: (address) => teams.find((team) => team.address === address)?.coordinatorAddress ?? null,
    closed: current.kind === 'agent_org' ? history.agentOrgHistory.find((run) => run.rootRunId === current.orgRunId)?.closedTaskExecutions ?? []
      : view!.closed_task_executions,
  }, deps, delegatedControl.value)
})
const delegatedByKey = computed(() => delegatedRowsByKey(delegatedRows.value))
const delegatedNotice = computed(() => delegatedDraft.stopFeedback
  ? { tone: delegatedDraft.stopFeedback.kind, text: delegatedDraft.stopFeedback.message } : null)

/** A copy row's model menu: its runtime's models the server allows for that copy (its current one first). */
const delegatedLockedModelsFor = (key: string): readonly ChatModelOption[] | null => {
  const node = delegatedByKey.value.get(key)
  const options = node?.delegated ? delegatedDraft.optionsByKey[node.delegated.target]?.options : null
  if (!node || !options) return []
  const rows = [...(options.currentModel ? [options.currentModel] : []), ...options.replacements]
  const seen = new Set<string>()
  return rows.filter((row) => !seen.has(row.llmModelIdentifier) && seen.add(row.llmModelIdentifier))
    .map((row) => toChatModelOption(node.values.runtimeKind, row))
}

/** A model or thinking change on a stopped copy row becomes this edit's choice for its target. */
const changeDelegated = (key: string, change: RunMemberSettingChange): void => {
  const node = delegatedByKey.value.get(key)
  if (!node?.delegated || node.locked?.model !== false) return
  const current = { llmModelIdentifier: node.values.llmModelIdentifier, llmConfig: node.values.llmConfig }
  if (change.field === 'model') {
    delegatedDraft.edit(node.delegated.target, node.delegated.original, { llmModelIdentifier: change.choice.llmModelIdentifier, llmConfig: null })
  } else if (change.field === 'thinking') {
    delegatedDraft.edit(node.delegated.target, node.delegated.original, { ...current, llmConfig: change.llmConfig })
  }
}

const stopDelegated = (reference: NonNullable<RunMemberDelegatedFacts['stop']>): void => {
  const root = delegatedRoot.value
  if (root) void delegatedDraft.stop(root, reference)
}

/** On a stopped run, its own changed settings, saved with the copies' choices in one Save (AR-004). */
const configuredPatches = (): DelegatedConfiguredPatch[] => {
  const current = draft.value
  if (!current || current.isActive || !draftStore.dirty) return []
  if (current.kind === 'team') return planExistingTeamModelConfigPatches(current.planner).map((patch) => ({ ...patch }))
  if (current.kind === 'agent_org') return planExistingAgentOrgModelConfigPatches(current.planner).map((patch) => ({ ...patch }))
  return [{ scopeKind: 'CONFIGURED_AGENT', scopeAddress: '/', ...current.draftSelection }]
}
const orgWorkspaceDirty = computed(() => draft.value?.kind === 'agent_org'
  && existingAgentOrgWorkspacesDirty(draft.value.executionTree, draft.value.workspaceDraft))
const canSave = computed(() => {
  if (!delegatedDraft.dirty) return draftStore.canSave
  // A workspace change is saved on its own; the copies' choices can join model changes only.
  return delegatedEditable.value && delegatedDraft.changesAllowed && !orgWorkspaceDirty.value
    && (!draftStore.dirty || draftStore.canSave)
})
const save = async (): Promise<void> => {
  if (!delegatedDraft.dirty) { await draftStore.save(); return }
  if (!canSave.value) return
  await delegatedDraft.save(configuredPatches(), () => draftStore.reloadCanonical(true))
}
const cancel = (): void => {
  draftStore.discardChanges()
  delegatedDraft.discard()
}

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
