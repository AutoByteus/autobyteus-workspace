<template>
  <div class="flex h-full flex-col bg-white">
    <div
      v-if="isSelectionMode"
      class="flex items-center justify-between border-b border-gray-200 px-4 py-2"
    >
      <h3 class="truncate text-sm font-semibold text-gray-800">{{ configTitle }}</h3>
      <button
        type="button"
        data-test="run-config-back-to-events"
        class="inline-flex h-8 w-8 items-center justify-center rounded-md text-indigo-600 transition-colors hover:bg-indigo-50"
        :title="$t('workspace.components.workspace.config.RunConfigPanel.return_to_event_view')"
        :aria-label="$t('workspace.components.workspace.config.RunConfigPanel.back_to_event_view')"
        @click="showConversationView"
      >
        <Icon icon="heroicons:arrow-long-left-20-solid" aria-hidden="true" class="h-4 w-5" />
      </button>
    </div>

    <ExistingRunConfigEditor
      v-if="isSelectionMode"
      :key="`existing:${selectionStore.selectedType}:${selectionStore.selectedRunId}`"
    />

    <div v-else class="flex-1 overflow-y-auto px-4 py-4">
      <div v-if="!effectiveAgentConfig && !teamRunFormModel" class="flex h-full flex-col items-center justify-center text-center text-gray-500">
        <span class="i-heroicons-cursor-arrow-rays-20-solid mb-2 h-12 w-12 text-gray-300"></span>
        <p>{{ $t('workspace.components.workspace.config.RunConfigPanel.select_an_agent_or_team_to') }}</p>
      </div>

      <AgentRunConfigForm
        v-else-if="effectiveAgentConfig && activeAgentDefinition"
        :key="activeRunConfigContextRenderKey"
        :config="effectiveAgentConfig"
        :agent-definition="activeAgentDefinition"
        :workspace-loading-state="effectiveWorkspaceLoadingState"
        :workspace-selection="workspaceSelection"
        @update:workspace-selection="handleWorkspaceSelectionChange"
      />

      <TeamRunConfigForm
        v-else-if="teamRunFormModel"
        :key="activeRunConfigContextRenderKey"
        :model="teamRunFormModel"
        @update:workspace-selection="handleTeamWorkspaceSelectionChange"
        @edit-config="handleTeamConfigEdit"
        @retry-runtime-catalog="retryTeamRuntimeCatalog"
      />

      <div v-else class="mt-4 text-center text-red-500">{{ $t('workspace.components.workspace.config.RunConfigPanel.error_definition_not_found') }}</div>
    </div>

    <div v-if="!isSelectionMode && ((effectiveAgentConfig && activeAgentDefinition) || (effectiveTeamConfig && activeTeamDefinition))" class="border-t border-gray-200 bg-gray-50 px-4 py-3">
      <button
        @click="handleRun"
        :disabled="isRunDisabled"
        class="run-btn inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
      >
        <span>{{ isTeamActive ? $t('workspace.components.workspace.config.RunConfigPanel.runTeamButton') : $t('workspace.components.workspace.config.RunConfigPanel.runAgentButton') }}</span>
      </button>
      <p
        v-if="showTeamBlockingIssue"
        data-test="team-run-blocking-issue"
        class="mt-2 text-xs text-amber-700"
      >
        {{ firstTeamBlockingIssue }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore'
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore'
import { useAgentContextsStore } from '~/stores/agentContextsStore'
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useWorkspaceStore } from '~/stores/workspace'
import { useExistingRunModelConfigStore } from '~/stores/existingRunModelConfigStore'
import { useWorkspaceCenterViewStore } from '~/stores/workspaceCenterViewStore'
import { useRightSideTabs } from '~/composables/useRightSideTabs'
import AgentRunConfigForm from './AgentRunConfigForm.vue'
import TeamRunConfigForm from './TeamRunConfigForm.vue'
import ExistingRunConfigEditor from './ExistingRunConfigEditor.vue'
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig'
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig'
import type { TeamRunFormModel } from '~/types/agent/TeamRunFormModel'
import { isTeamLaunchRepairRequiredError, type TeamLaunchConfigEdit } from '~/types/agent/TeamLaunchDraft'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { WorkspaceSelectionState } from '~/types/workspace/WorkspaceSelectionState'
import { projectEditableTeamRunFormModel } from '~/utils/editableTeamRunFormModel'
import { useTeamRunRuntimeCatalogSync } from '~/composables/useTeamRunRuntimeCatalogSync'

const selectionStore = useAgentSelectionStore()
const runConfigStore = useAgentRunConfigStore()
const teamRunConfigStore = useTeamRunConfigStore()
const contextsStore = useAgentContextsStore()
const teamRunStore = useAgentTeamRunStore()
const definitionStore = useAgentDefinitionStore()
const teamDefinitionStore = useAgentTeamDefinitionStore()
const workspaceStore = useWorkspaceStore()
const existingRunModelConfigStore = useExistingRunModelConfigStore()
const workspaceCenterViewStore = useWorkspaceCenterViewStore()
const { setActiveTab } = useRightSideTabs()
const { t: $t } = useLocalization()

const workspaceSelection = ref<WorkspaceSelectionState>({ mode: 'new', existingWorkspaceId: null, newWorkspacePath: '' })
const isRunPreparationPending = ref(false)
const isSelectionMode = computed(() => !!selectionStore.selectedRunId)
const isTeamLaunchPending = computed(() => teamRunStore.isDraftLaunchPending(teamRunConfigStore.selectedDraft?.draftId ?? null))

const effectiveAgentConfig = computed((): AgentRunConfig | null => {
  if (!isSelectionMode.value && runConfigStore.config?.agentDefinitionId) {
    return runConfigStore.config
  }
  return null
})

const effectiveTeamConfig = computed((): TeamRunConfig | null => {
  if (!isSelectionMode.value && teamRunConfigStore.config?.teamDefinitionId) {
    return teamRunConfigStore.config
  }
  return null
})
const isTeamActive = computed(() => !!effectiveTeamConfig.value)
const teamLaunchReadiness = computed(() => teamRunConfigStore.launchReadiness)

const activeAgentDefinition = computed(() => {
  if (!effectiveAgentConfig.value?.agentDefinitionId) return null
  return definitionStore.getAgentDefinitionById(effectiveAgentConfig.value.agentDefinitionId) || null
})

const activeTeamDefinition = computed(() => {
  if (!effectiveTeamConfig.value?.teamDefinitionId) return null
  return teamDefinitionStore.getAgentTeamDefinitionById(effectiveTeamConfig.value.teamDefinitionId) || null
})
const { reloadRuntimeKind: retryTeamRuntimeCatalog } = useTeamRunRuntimeCatalogSync(effectiveTeamConfig)

const configTitle = computed(() => {
  if (selectionStore.isAgentSelected) return $t('workspace.components.workspace.config.RunConfigPanel.title.agentConfiguration')
  if (selectionStore.isTeamSelected) return $t('workspace.components.workspace.config.RunConfigPanel.title.teamConfiguration')
  if (effectiveAgentConfig.value) return $t('workspace.components.workspace.config.RunConfigPanel.title.newAgentConfiguration')
  if (effectiveTeamConfig.value) return $t('workspace.components.workspace.config.RunConfigPanel.title.newTeamConfiguration')
  return $t('workspace.components.workspace.config.RunConfigPanel.title.configuration')
})

const resolveWorkspacePath = (config: AgentRunConfig | TeamRunConfig | null): string => {
  const selection = config && 'rootConfig' in config
    ? config.rootConfig.workspace
    : config
  if (selection?.workspaceMetadata?.workspaceRootPath) return selection.workspaceMetadata.workspaceRootPath
  if (!selection?.workspaceId) return ''
  const workspace = workspaceStore.workspaces[selection.workspaceId]
  return workspace?.absolutePath || workspace?.workspaceConfig?.root_path || workspace?.workspaceConfig?.rootPath || ''
}

const normalizeRootPath = (path: string | null | undefined): string => {
  const source = (path || '').trim().replace(/\\/g, '/')
  if (!source || source === '/') return source
  return source.replace(/\/+$/, '')
}

const effectiveWorkspaceLoadingState = computed(() => {
  if (isSelectionMode.value) {
    const config = effectiveTeamConfig.value || effectiveAgentConfig.value || null
    return { isLoading: false, error: null, loadedPath: resolveWorkspacePath(config) || null }
  }
  if (effectiveAgentConfig.value) {
    const base = runConfigStore.workspaceLoadingState
    const fallbackPath = resolveWorkspacePath(effectiveAgentConfig.value)
    return {
      ...base,
      loadedPath: base.loadedPath || fallbackPath || null,
    }
  }
  return { isLoading: false, error: null, loadedPath: null }
})

const currentWorkspacePath = computed(() => {
  if (isSelectionMode.value) {
    return resolveWorkspacePath(effectiveTeamConfig.value || effectiveAgentConfig.value || null)
  }
  if (effectiveAgentConfig.value) {
    return runConfigStore.workspaceLoadingState.loadedPath || resolveWorkspacePath(effectiveAgentConfig.value)
  }
  return ''
})

const applyExistingWorkspaceSelection = (workspaceId: string) => {
  if (isSelectionMode.value || isRunPreparationPending.value || isTeamLaunchPending.value) {
    return
  }
  const selectedWorkspace = workspaceStore.workspaces[workspaceId] || null
  const workspaceMetadata = workspaceStore.workspaceMetadataById[workspaceId]
    || (selectedWorkspace ? workspaceStore.registerWorkspaceInfoMetadata(selectedWorkspace) : null)
    || null

  if (effectiveAgentConfig.value) {
    runConfigStore.updateAgentConfig({ workspaceId, workspaceMetadata })
    setActiveTab('files')
  }
}

const handleTeamConfigEdit = (edit: TeamLaunchConfigEdit) => {
  if (isSelectionMode.value || isRunPreparationPending.value || isTeamLaunchPending.value || !effectiveTeamConfig.value) return
  teamRunConfigStore.applyConfigEdit(edit)
}

const handleWorkspaceSelectionChange = (selection: WorkspaceSelectionState) => {
  if (isSelectionMode.value || isRunPreparationPending.value || isTeamLaunchPending.value) return
  workspaceSelection.value = { ...selection }
  if (selection.mode === 'existing' && selection.existingWorkspaceId) {
    applyExistingWorkspaceSelection(selection.existingWorkspaceId)
  }
}
const handleTeamWorkspaceSelectionChange = (address: AgentTeamAddress, selection: WorkspaceSelectionState) => {
  const draft = teamRunConfigStore.selectedDraft
  if (!draft || isRunPreparationPending.value || isTeamLaunchPending.value) return
  teamRunConfigStore.applyTeamWorkspaceAuthoringCommand({
    kind: 'set_selection', draftId: draft.draftId, teamAddress: address, selection,
  })
  if (selection.mode === 'existing' && selection.existingWorkspaceId) setActiveTab('files')
}

const teamRunFormModel = computed((): Readonly<TeamRunFormModel> | null => {
  const config = effectiveTeamConfig.value
  const definition = activeTeamDefinition.value
  if (!config || !definition) return null
  return projectEditableTeamRunFormModel({
    config,
    teamDefinition: definition,
    getTeamDefinitionById: teamDefinitionStore.getAgentTeamDefinitionById,
    repairAddresses: teamRunConfigStore.repairNotice?.addresses || [],
    workspaceOperationFor: (address) => teamRunConfigStore.teamWorkspaceAuthoringViewFor(address).operation,
    workspaceSelectionFor: (address) => teamRunConfigStore.teamWorkspaceAuthoringViewFor(address).selection,
    runtimeCatalogStateFor: (runtimeKind) => teamRunConfigStore.runtimeModelCatalogStates[runtimeKind]
      ?? { status: 'idle', error: null },
    forceReadOnly: isRunPreparationPending.value || isTeamLaunchPending.value,
  })
})

const currentPendingNewPath = computed(() =>
  workspaceSelection.value.mode === 'new'
    ? workspaceSelection.value.newWorkspacePath.trim()
    : '',
)

const isNewWorkspaceInputMode = computed(() => workspaceSelection.value.mode === 'new')
const setActiveWorkspaceError = (message: string) => runConfigStore.setWorkspaceError(message)
const setActiveWorkspaceLoaded = (workspaceId: string, fallbackPath: string) => {
  const workspace = workspaceStore.workspaces[workspaceId] || null
  const workspaceMetadata = workspaceStore.workspaceMetadataById[workspaceId]
    || (workspace ? workspaceStore.registerWorkspaceInfoMetadata(workspace) : null)
    || null
  const loadedPath = workspaceMetadata?.workspaceRootPath
    || workspace?.workspaceRootPath
    || workspace?.absolutePath
    || workspace?.workspaceConfig?.root_path
    || workspace?.workspaceConfig?.rootPath
    || fallbackPath
  runConfigStore.setWorkspaceLoaded(workspaceId, loadedPath, workspaceMetadata)
  workspaceSelection.value = {
    mode: 'existing',
    existingWorkspaceId: workspaceId,
    newWorkspacePath: workspaceSelection.value.newWorkspacePath,
  }
}

const ensurePendingWorkspaceLoadedForRun = async (): Promise<boolean> => {
  if (!isNewWorkspaceInputMode.value) {
    return true
  }

  const pendingPath = currentPendingNewPath.value
  if (!pendingPath) {
    setActiveWorkspaceError(
      effectiveTeamConfig.value
        ? 'Workspace path is required to run a team.'
        : 'Workspace path is required to run an agent.',
    )
    return false
  }

  const activeConfig = effectiveAgentConfig.value
  const currentWorkspacePath = resolveWorkspacePath(activeConfig)
  if (activeConfig?.workspaceId && normalizeRootPath(currentWorkspacePath) === normalizeRootPath(pendingPath)) {
    workspaceSelection.value = {
      mode: 'existing',
      existingWorkspaceId: activeConfig.workspaceId,
      newWorkspacePath: workspaceSelection.value.newWorkspacePath,
    }
    return true
  }

  runConfigStore.setWorkspaceLoading(true)
  try {
    const workspaceId = await workspaceStore.createWorkspace({ root_path: pendingPath })
    setActiveWorkspaceLoaded(workspaceId, pendingPath)
    setActiveTab('files')
    return true
  } catch (error: any) {
    setActiveWorkspaceError(error?.message || 'Failed to load workspace')
    return false
  }
}

const effectiveTeamBlockingIssues = computed(() => effectiveTeamConfig.value
  ? teamLaunchReadiness.value.blockingIssues
  : [])

const canLaunchTeamBeforeRun = computed(() =>
  Boolean(effectiveTeamConfig.value) && effectiveTeamBlockingIssues.value.length === 0,
)

const firstTeamBlockingIssue = computed(() => effectiveTeamBlockingIssues.value[0]?.message || '')
const showTeamBlockingIssue = computed(() =>
  !isSelectionMode.value &&
  Boolean(effectiveTeamConfig.value) &&
  !canLaunchTeamBeforeRun.value &&
  Boolean(firstTeamBlockingIssue.value),
)

const canLaunchAgentBeforeRun = computed(() => {
  const config = effectiveAgentConfig.value
  if (!config) return false
  if (!config.llmModelIdentifier) return false
  if (isNewWorkspaceInputMode.value) {
    return Boolean(currentPendingNewPath.value)
  }
  return Boolean(config.workspaceId)
})

const isRunDisabled = computed(() => {
  if (isRunPreparationPending.value || isTeamLaunchPending.value || effectiveWorkspaceLoadingState.value.isLoading) {
    return true
  }
  if (!isSelectionMode.value) {
    if (effectiveTeamConfig.value) return !canLaunchTeamBeforeRun.value
    if (effectiveAgentConfig.value) return !canLaunchAgentBeforeRun.value
  }
  return (effectiveAgentConfig.value?.isLocked || effectiveTeamConfig.value?.isLocked)
})

const handleRun = async () => {
  if (isRunPreparationPending.value || isTeamLaunchPending.value) {
    return
  }

  if (!isSelectionMode.value) {
    if (effectiveTeamConfig.value) {
      const draft = teamRunConfigStore.selectedDraft
      if (!draft) throw new Error('Team launch draft is unavailable.')
      try {
        await teamRunStore.launchDraft(draft)
      } catch (error) {
        if (!isTeamLaunchRepairRequiredError(error)) throw error
      }
      return
    }
    isRunPreparationPending.value = true
    try {
      const workspaceReady = await ensurePendingWorkspaceLoadedForRun()
      if (!workspaceReady) {
        return
      }

      if (effectiveAgentConfig.value) {
        if (!effectiveAgentConfig.value.workspaceId) {
          runConfigStore.setWorkspaceError('Workspace is required to run an agent.')
          return
        }
        contextsStore.createRunFromTemplate()
        runConfigStore.clearConfig()
      }
    } finally {
      isRunPreparationPending.value = false
    }
  }
}

const showConversationView = () => {
  existingRunModelConfigStore.clear()
  workspaceCenterViewStore.showChat()
}

const deriveWorkspaceSelection = (): WorkspaceSelectionState => {
  const config = effectiveAgentConfig.value
  const existingWorkspaceId = config?.workspaceId || null
  const newWorkspacePath = config
    ? (runConfigStore.workspaceLoadingState.loadedPath || resolveWorkspacePath(config))
    : ''
  const preserveReadOnlyPathDisplay = Boolean(
    isSelectionMode.value
    && existingWorkspaceId
    && newWorkspacePath
    && !workspaceStore.workspaces[existingWorkspaceId],
  )
  return {
    mode: existingWorkspaceId && !preserveReadOnlyPathDisplay ? 'existing' : 'new',
    existingWorkspaceId,
    newWorkspacePath,
  }
}

const selectedRunContextIdentity = computed(() => {
  const subject = selectionStore.subject
  if (subject?.kind === 'agent_run') {
    return `agent-run:${subject.runId}:${effectiveAgentConfig.value ? 'ready' : 'pending'}`
  }
  if (subject?.kind === 'team_run') {
    return `team-run:${subject.rootTeamRunId}:ready`
  }
  return null
})

const activeRunConfigContextIdentity = computed(() => {
  if (selectedRunContextIdentity.value) return selectedRunContextIdentity.value
  if (effectiveTeamConfig.value) {
    return teamRunConfigStore.selectedDraft?.draftId
      ? `team-draft:${teamRunConfigStore.selectedDraft.draftId}`
      : null
  }
  if (effectiveAgentConfig.value) return effectiveAgentConfig.value
  return null
})

const agentBufferRenderKeys = new WeakMap<object, number>()
let nextAgentBufferRenderKey = 1
const activeRunConfigContextRenderKey = computed(() => {
  const identity = activeRunConfigContextIdentity.value
  if (typeof identity === 'string') return identity
  if (!identity) return 'no-run-config-context'
  let key = agentBufferRenderKeys.get(identity)
  if (!key) {
    key = nextAgentBufferRenderKey++
    agentBufferRenderKeys.set(identity, key)
  }
  return `agent-draft:${key}`
})

watch(
  activeRunConfigContextIdentity,
  () => {
    workspaceSelection.value = deriveWorkspaceSelection()
  },
  { immediate: true },
)
</script>
