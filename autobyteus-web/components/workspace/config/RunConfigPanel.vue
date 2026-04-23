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
      <div v-if="!effectiveAgentConfig && !effectiveTeamConfig" class="flex h-full flex-col items-center justify-center text-center text-gray-500">
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
        @select-existing="handleSelectExisting"
        @load-new="handleLoadNew"
      />

      <TeamRunConfigForm
        v-else-if="effectiveTeamConfig && activeTeamDefinition"
        :config="effectiveTeamConfig"
        :team-definition="activeTeamDefinition"
        :workspace-loading-state="effectiveWorkspaceLoadingState"
        :initial-path="initialWorkspacePath"
        @select-existing="handleSelectExisting"
        @load-new="handleLoadNew"
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
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore'
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore'
import { useAgentContextsStore } from '~/stores/agentContextsStore'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useWorkspaceStore } from '~/stores/workspace'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { useWorkspaceCenterViewStore } from '~/stores/workspaceCenterViewStore'
import { useRightSideTabs } from '~/composables/useRightSideTabs'
import AgentRunConfigForm from './AgentRunConfigForm.vue'
import TeamRunConfigForm from './TeamRunConfigForm.vue'
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig'
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig'

const selectionStore = useAgentSelectionStore()
const runConfigStore = useAgentRunConfigStore()
const teamRunConfigStore = useTeamRunConfigStore()
const contextsStore = useAgentContextsStore()
const teamContextsStore = useAgentTeamContextsStore()
const definitionStore = useAgentDefinitionStore()
const teamDefinitionStore = useAgentTeamDefinitionStore()
const workspaceStore = useWorkspaceStore()
const runHistoryStore = useRunHistoryStore()
const workspaceCenterViewStore = useWorkspaceCenterViewStore()
const { setActiveTab } = useRightSideTabs()
const { t: $t } = useLocalization()

const isSelectionMode = computed(() => !!selectionStore.selectedRunId)

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
  if (selectionStore.isTeamSelected && selectionStore.selectedRunId) {
    return teamContextsStore.activeTeamContext?.config || null
  }
  if (!isSelectionMode.value && teamRunConfigStore.config?.teamDefinitionId) {
    return teamRunConfigStore.config
  }
  return null
})

const isTeamActive = computed(() => !!effectiveTeamConfig.value)
const teamLaunchReadiness = computed(() => teamRunConfigStore.launchReadiness)
const firstTeamBlockingIssue = computed(() => teamLaunchReadiness.value.blockingIssues[0]?.message || '')
const showTeamBlockingIssue = computed(() =>
  !isSelectionMode.value &&
  Boolean(effectiveTeamConfig.value) &&
  !teamLaunchReadiness.value.canLaunch &&
  Boolean(firstTeamBlockingIssue.value),
)

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
  if (effectiveTeamConfig.value) return isSelectionMode.value ? $t('workspace.components.workspace.config.RunConfigPanel.title.teamConfiguration') : $t('workspace.components.workspace.config.RunConfigPanel.title.newTeamConfiguration')
  return $t('workspace.components.workspace.config.RunConfigPanel.title.configuration')
})

const resolveWorkspacePath = (workspaceId: string | null): string => {
  if (!workspaceId) return ''
  const workspace = workspaceStore.workspaces[workspaceId]
  return workspace?.absolutePath || workspace?.workspaceConfig?.root_path || workspace?.workspaceConfig?.rootPath || ''
}

const effectiveWorkspaceLoadingState = computed(() => {
  if (isSelectionMode.value) {
    const workspaceId = effectiveTeamConfig.value?.workspaceId || effectiveAgentConfig.value?.workspaceId || null
    return { isLoading: false, error: null, loadedPath: resolveWorkspacePath(workspaceId) || null }
  }
  if (effectiveTeamConfig.value) {
    const base = teamRunConfigStore.workspaceLoadingState
    const fallbackPath = resolveWorkspacePath(effectiveTeamConfig.value.workspaceId)
    return {
      ...base,
      loadedPath: base.loadedPath || fallbackPath || null,
    }
  }
  if (effectiveAgentConfig.value) {
    const base = runConfigStore.workspaceLoadingState
    const fallbackPath = resolveWorkspacePath(effectiveAgentConfig.value.workspaceId)
    return {
      ...base,
      loadedPath: base.loadedPath || fallbackPath || null,
    }
  }
  return { isLoading: false, error: null, loadedPath: null }
})

const initialWorkspacePath = computed(() => {
  if (isSelectionMode.value) {
    const workspaceId = effectiveTeamConfig.value?.workspaceId || effectiveAgentConfig.value?.workspaceId || null
    return resolveWorkspacePath(workspaceId)
  }
  if (effectiveTeamConfig.value) {
    return teamRunConfigStore.workspaceLoadingState.loadedPath || resolveWorkspacePath(effectiveTeamConfig.value.workspaceId)
  }
  if (effectiveAgentConfig.value) {
    return runConfigStore.workspaceLoadingState.loadedPath || resolveWorkspacePath(effectiveAgentConfig.value.workspaceId)
  }
  return ''
})

const handleSelectExisting = (workspaceId: string) => {
  if (isSelectionMode.value) {
    if (selectionStore.isTeamSelected) {
      const teamContext = teamContextsStore.activeTeamContext
      if (!teamContext || teamContext.config?.isLocked) return
      teamContext.config.workspaceId = workspaceId
      teamContext.members?.forEach((member) => {
        if (!member.config?.isLocked) {
          member.config.workspaceId = workspaceId
        }
      })
    } else if (selectionStore.isAgentSelected) {
      const agentContext = contextsStore.activeRun
      if (!agentContext || agentContext.config?.isLocked) return
      agentContext.config.workspaceId = workspaceId
    }
    setActiveTab('files')
    return
  }

  if (effectiveTeamConfig.value) {
    teamRunConfigStore.updateConfig({ workspaceId })
    setActiveTab('files')
  } else if (effectiveAgentConfig.value) {
    runConfigStore.updateAgentConfig({ workspaceId })
    setActiveTab('files')
  }
}

const handleLoadNew = async (path: string) => {
  if (isSelectionMode.value) {
    if (selectionStore.isTeamSelected) {
      const teamContext = teamContextsStore.activeTeamContext
      if (!teamContext || teamContext.config?.isLocked) return
      try {
        const workspaceId = await workspaceStore.createWorkspace({ root_path: path })
        teamContext.config.workspaceId = workspaceId
        teamContext.members?.forEach((member) => {
          if (!member.config?.isLocked) {
            member.config.workspaceId = workspaceId
          }
        })
        setActiveTab('files')
      } catch (error: any) {
        console.error('Failed to load workspace for team:', error)
      }
      return
    }

    if (selectionStore.isAgentSelected) {
      const agentContext = contextsStore.activeRun
      if (!agentContext || agentContext.config?.isLocked) return
      try {
        const workspaceId = await workspaceStore.createWorkspace({ root_path: path })
        agentContext.config.workspaceId = workspaceId
        setActiveTab('files')
      } catch (error: any) {
        console.error('Failed to load workspace for agent:', error)
      }
      return
    }
  }

  if (effectiveTeamConfig.value) {
    teamRunConfigStore.setWorkspaceLoading(true)
    try {
      const workspaceId = await workspaceStore.createWorkspace({ root_path: path })
      teamRunConfigStore.setWorkspaceLoaded(workspaceId, path)
      setActiveTab('files')
    } catch (error: any) {
      teamRunConfigStore.setWorkspaceError(error?.message || 'Failed to load workspace')
    }
    return
  }

  if (effectiveAgentConfig.value) {
    runConfigStore.setWorkspaceLoading(true)
    try {
      const workspaceId = await workspaceStore.createWorkspace({ root_path: path })
      runConfigStore.setWorkspaceLoaded(workspaceId, path)
      setActiveTab('files')
    } catch (error: any) {
      runConfigStore.setWorkspaceError(error?.message || 'Failed to load workspace')
    }
  }
}

const isRunDisabled = computed(() => {
  if (!isSelectionMode.value) {
    if (effectiveTeamConfig.value) return !teamLaunchReadiness.value.canLaunch
    if (effectiveAgentConfig.value) return !runConfigStore.isConfigured
  }
  return (effectiveAgentConfig.value?.isLocked || effectiveTeamConfig.value?.isLocked)
})

const handleRun = () => {
  if (!isSelectionMode.value) {
    if (effectiveTeamConfig.value) {
      if (!teamLaunchReadiness.value.canLaunch) {
        const workspaceIssue = teamLaunchReadiness.value.blockingIssues.find(
          (issue) => issue.code === 'WORKSPACE_REQUIRED',
        )
        if (workspaceIssue) {
          teamRunConfigStore.setWorkspaceError(workspaceIssue.message)
        }
        return
      }
      teamContextsStore.createRunFromTemplate()
      teamRunConfigStore.clearConfig()
    } else if (effectiveAgentConfig.value) {
      if (!effectiveAgentConfig.value.workspaceId) {
        runConfigStore.setWorkspaceError('Workspace is required to run an agent.')
        return
      }
      contextsStore.createRunFromTemplate()
      runConfigStore.clearConfig()
    }
  }
}

const showConversationView = () => {
  workspaceCenterViewStore.showChat()
}
</script>
