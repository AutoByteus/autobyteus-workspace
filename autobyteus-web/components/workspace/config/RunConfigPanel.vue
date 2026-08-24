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

    <div class="flex-1 overflow-y-auto px-4 py-4">
      <div v-if="!effectiveAgentConfig && !effectiveTeamConfig && !storedTeamConfiguration" class="flex h-full flex-col items-center justify-center text-center text-gray-500">
        <span class="i-heroicons-cursor-arrow-rays-20-solid mb-2 h-12 w-12 text-gray-300"></span>
        <p>{{ $t('workspace.components.workspace.config.RunConfigPanel.select_an_agent_or_team_to') }}</p>
      </div>

      <AgentRunConfigForm
        v-else-if="effectiveAgentConfig && activeAgentDefinition"
        :config="effectiveAgentConfig"
        :agent-definition="activeAgentDefinition"
        :workspace-loading-state="effectiveWorkspaceLoadingState"
        :initial-path="initialWorkspacePath"
        :workspace-locked="isWorkspaceLockedForSelectedAgentRun"
        :runtime-locked="isRuntimeLockedForSelectedAgentRun"
        :read-only="isSelectionMode"
        @select-existing="handleSelectExisting"
        @workspace-input-change="handleWorkspaceInputChange"
      />

      <StoredTeamRunConfigForm
        v-else-if="storedTeamConfiguration"
        :view="storedTeamConfiguration"
      />

      <TeamRunConfigForm
        v-else-if="effectiveTeamConfig && activeTeamDefinition"
        :config="effectiveTeamConfig"
        :team-definition="activeTeamDefinition"
        :workspace-loading-state="effectiveWorkspaceLoadingState"
        :workspace-loading-states="teamRunConfigStore.workspaceLoadingStates"
        :repair-addresses="teamRunConfigStore.repairNotice?.addresses || []"
        :read-only="isSelectionMode || isRunPreparationPending || isTeamLaunchPending"
        @select-existing="handleTeamSelectExisting"
        @workspace-input-change="handleTeamWorkspaceInputChange"
        @edit-config="handleTeamConfigEdit"
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
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useWorkspaceStore } from '~/stores/workspace'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { useWorkspaceCenterViewStore } from '~/stores/workspaceCenterViewStore'
import { useRightSideTabs } from '~/composables/useRightSideTabs'
import AgentRunConfigForm from './AgentRunConfigForm.vue'
import TeamRunConfigForm from './TeamRunConfigForm.vue'
import StoredTeamRunConfigForm from './StoredTeamRunConfigForm.vue'
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig'
import type { TeamRunConfig, TeamRunConfigurationView } from '~/types/agent/TeamRunConfig'
import type { TeamLaunchConfigEdit } from '~/types/agent/TeamLaunchDraft'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'

const selectionStore = useAgentSelectionStore()
const runConfigStore = useAgentRunConfigStore()
const teamRunConfigStore = useTeamRunConfigStore()
const contextsStore = useAgentContextsStore()
const teamContextsStore = useAgentTeamContextsStore()
const teamRunStore = useAgentTeamRunStore()
const definitionStore = useAgentDefinitionStore()
const teamDefinitionStore = useAgentTeamDefinitionStore()
const workspaceStore = useWorkspaceStore()
const runHistoryStore = useRunHistoryStore()
const workspaceCenterViewStore = useWorkspaceCenterViewStore()
const { setActiveTab } = useRightSideTabs()
const { t: $t } = useLocalization()

type PendingWorkspaceInput = { mode: 'existing' | 'new'; pendingPath: string }

const pendingWorkspaceInput = ref<PendingWorkspaceInput>({ mode: 'existing', pendingPath: '' })
const pendingTeamWorkspaceInputs = ref<Record<AgentTeamAddress, PendingWorkspaceInput>>({})
const isRunPreparationPending = ref(false)
const isSelectionMode = computed(() => !!selectionStore.selectedRunId)
const isTeamLaunchPending = computed(() => teamRunStore.isDraftLaunchPending(teamRunConfigStore.selectedDraft?.draftId ?? null))

const effectiveAgentConfig = computed((): AgentRunConfig | null => {
  if (selectionStore.isAgentSelected && selectionStore.selectedRunId) {
    return contextsStore.activeRun?.config || null
  }
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
const storedTeamConfiguration = computed((): Readonly<TeamRunConfigurationView> | null => {
  if (!selectionStore.isTeamSelected || !selectionStore.selectedRunId) return null
  return teamContextsStore.activeTeamContext?.view.getConfigurationView() ?? null
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

const isWorkspaceLockedForSelectedAgentRun = computed(() => {
  if (!selectionStore.isAgentSelected || !selectionStore.selectedRunId) {
    return false
  }
  return runHistoryStore.isWorkspaceLockedForRun(selectionStore.selectedRunId)
})

const isRuntimeLockedForSelectedAgentRun = computed(() => {
  if (!selectionStore.isAgentSelected || !selectionStore.selectedRunId) {
    return false
  }
  return runHistoryStore.isRuntimeLockedForRun(selectionStore.selectedRunId)
})

const configTitle = computed(() => {
  if (effectiveAgentConfig.value) return isSelectionMode.value ? $t('workspace.components.workspace.config.RunConfigPanel.title.agentConfiguration') : $t('workspace.components.workspace.config.RunConfigPanel.title.newAgentConfiguration')
  if (storedTeamConfiguration.value) return $t('workspace.components.workspace.config.RunConfigPanel.title.teamConfiguration')
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
  if (effectiveTeamConfig.value) {
    const base = teamRunConfigStore.workspaceLoadingState
    const fallbackPath = resolveWorkspacePath(effectiveTeamConfig.value)
    return {
      ...base,
      loadedPath: base.loadedPath || fallbackPath || null,
    }
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

const initialWorkspacePath = computed(() => {
  if (isSelectionMode.value) {
    return resolveWorkspacePath(effectiveTeamConfig.value || effectiveAgentConfig.value || null)
  }
  if (effectiveTeamConfig.value) {
    return teamRunConfigStore.workspaceLoadingState.loadedPath || resolveWorkspacePath(effectiveTeamConfig.value)
  }
  if (effectiveAgentConfig.value) {
    return runConfigStore.workspaceLoadingState.loadedPath || resolveWorkspacePath(effectiveAgentConfig.value)
  }
  return ''
})

const handleSelectExisting = (workspaceId: string) => {
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

const handleTeamSelectExisting = (address: AgentTeamAddress, workspaceId: string) => {
  if (isSelectionMode.value || isRunPreparationPending.value || isTeamLaunchPending.value) return
  const workspace = workspaceStore.workspaces[workspaceId] || null
  const workspaceMetadata = workspaceStore.workspaceMetadataById[workspaceId]
    || (workspace ? workspaceStore.registerWorkspaceInfoMetadata(workspace) : null) || null
  const selection = { workspaceId, workspaceMetadata }
  if (address === '/') teamRunConfigStore.applyConfigEdit({ kind: 'set_root_workspace', workspace: selection })
  else {
    const current = effectiveTeamConfig.value?.teamOverrides[address] ?? {}
    teamRunConfigStore.applyConfigEdit({ kind: 'set_team_override', teamAddress: address, override: { ...current, workspace: selection } })
  }
  const next = { ...pendingTeamWorkspaceInputs.value }; delete next[address]; pendingTeamWorkspaceInputs.value = next
  setActiveTab('files')
}

const handleTeamConfigEdit = (edit: TeamLaunchConfigEdit) => {
  if (isSelectionMode.value || isRunPreparationPending.value || isTeamLaunchPending.value || !effectiveTeamConfig.value) return
  teamRunConfigStore.applyConfigEdit(edit)
}

const handleWorkspaceInputChange = (input: PendingWorkspaceInput) => {
  if (isRunPreparationPending.value || isTeamLaunchPending.value) return
  pendingWorkspaceInput.value = {
    mode: input.mode,
    pendingPath: input.mode === 'new' ? input.pendingPath.trim() : '',
  }
}
const handleTeamWorkspaceInputChange = (address: AgentTeamAddress, input: PendingWorkspaceInput) => {
  if (isRunPreparationPending.value || isTeamLaunchPending.value) return
  pendingTeamWorkspaceInputs.value = {
    ...pendingTeamWorkspaceInputs.value,
    [address]: { mode: input.mode, pendingPath: input.mode === 'new' ? input.pendingPath.trim() : '' },
  }
}

const currentPendingNewPath = computed(() =>
  pendingWorkspaceInput.value.mode === 'new'
    ? pendingWorkspaceInput.value.pendingPath.trim()
    : '',
)

const isNewWorkspaceInputMode = computed(() => pendingWorkspaceInput.value.mode === 'new')
const activeWorkspaceConfigStore = () =>
  effectiveTeamConfig.value ? teamRunConfigStore : effectiveAgentConfig.value ? runConfigStore : null
const setActiveWorkspaceError = (message: string) => activeWorkspaceConfigStore()?.setWorkspaceError(message)
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
  activeWorkspaceConfigStore()?.setWorkspaceLoaded(workspaceId, loadedPath, workspaceMetadata)
}

const ensurePendingWorkspaceLoadedForRun = async (): Promise<boolean> => {
  if (effectiveTeamConfig.value) {
    const pending = Object.entries(pendingTeamWorkspaceInputs.value)
      .filter(([, value]) => value.mode === 'new') as Array<[AgentTeamAddress, PendingWorkspaceInput]>
    const missing = pending.find(([, value]) => !value.pendingPath.trim())
    if (missing) { teamRunConfigStore.setWorkspaceError('Workspace path is required to run this Team scope.', missing[0]); return false }
    const creations = new Map<string, Promise<string>>()
    try {
      for (const [address, value] of pending) {
        const path = value.pendingPath.trim(); const key = normalizeRootPath(path)
        teamRunConfigStore.setWorkspaceLoading(true, address)
        let creation = creations.get(key)
        if (!creation) { creation = workspaceStore.createWorkspace({ root_path: path }); creations.set(key, creation) }
        const workspaceId = await creation
        const workspace = workspaceStore.workspaces[workspaceId] || null
        const metadata = workspaceStore.workspaceMetadataById[workspaceId]
          || (workspace ? workspaceStore.registerWorkspaceInfoMetadata(workspace) : null) || null
        const loadedPath = metadata?.workspaceRootPath || path
        teamRunConfigStore.setWorkspaceLoaded(workspaceId, loadedPath, metadata, address)
      }
      if (pending.length) setActiveTab('files')
      return true
    } catch (error: any) {
      const address = pending.find(([candidate]) => teamRunConfigStore.workspaceLoadingStates[candidate]?.isLoading)?.[0] || '/'
      teamRunConfigStore.setWorkspaceError(error?.message || 'Failed to load workspace', address)
      return false
    }
  }
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
    return true
  }

  activeWorkspaceConfigStore()?.setWorkspaceLoading(true)
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

const effectiveTeamBlockingIssues = computed(() => {
  if (!effectiveTeamConfig.value) return []
  const issues = teamLaunchReadiness.value.blockingIssues
  return issues.filter((issue) => issue.code !== 'WORKSPACE_REQUIRED'
    || !issue.subjectAddress
    || !pendingTeamWorkspaceInputs.value[issue.subjectAddress]?.pendingPath.trim())
})

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
    isRunPreparationPending.value = true
    try {
      const workspaceReady = await ensurePendingWorkspaceLoadedForRun()
      if (!workspaceReady) {
        return
      }

      if (effectiveTeamConfig.value) {
        if (!teamLaunchReadiness.value.canLaunch) {
          const workspaceIssue = teamLaunchReadiness.value.blockingIssues.find(
            (issue) => issue.code === 'WORKSPACE_REQUIRED',
          )
          if (workspaceIssue) {
            teamRunConfigStore.setWorkspaceError(workspaceIssue.message, workspaceIssue.subjectAddress || '/')
          }
          return
        }
        const draft = teamRunConfigStore.selectedDraft
        if (!draft) {
          throw new Error('Team launch draft is unavailable.')
        }
        const launch = teamRunStore.launchDraft(draft)
        isRunPreparationPending.value = false
        await launch
      } else if (effectiveAgentConfig.value) {
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
  workspaceCenterViewStore.showChat()
}

watch(
  () => [
    effectiveAgentConfig.value,
    effectiveTeamConfig.value,
    isSelectionMode.value ? 'selection' : 'draft',
  ],
  () => {
    pendingWorkspaceInput.value = { mode: 'existing', pendingPath: '' }
    pendingTeamWorkspaceInputs.value = {}
  },
)
</script>
