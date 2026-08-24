import { computed, onMounted, ref, watch, type Ref } from 'vue'
import { useMobileLaunchWorkspaces } from '~/composables/mobile/useMobileLaunchWorkspaces'
import { useMobileRunLaunchCoordinator } from '~/composables/mobile/useMobileRunLaunchCoordinator'
import { useMobileWorkCatalog } from '~/composables/mobile/useMobileWorkCatalog'
import { useTeamRunRuntimeCatalogSync } from '~/composables/useTeamRunRuntimeCatalogSync'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore'
import { useMobileWorkStore } from '~/stores/mobileWorkStore'
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore'
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig'
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig'
import type { MobileLaunchMode, MobileLaunchPickerItem } from '~/types/mobileLaunch'
import type { MobileRunSetupIntent, MobileWorkContext, MobileWorkListItem } from '~/types/mobileWork'

interface MobileRunSetupControllerOptions {
  context: Ref<MobileWorkContext | null>
  setupIntent: Ref<MobileRunSetupIntent | null | undefined>
  onLaunched: (context: MobileWorkContext) => void
  onSetupIntentConsumed: (revision: number) => void
}

export function useMobileRunSetupController(options: MobileRunSetupControllerOptions) {
  const agentDefinitionStore = useAgentDefinitionStore()
  const agentRunConfigStore = useAgentRunConfigStore()
  const teamDefinitionStore = useAgentTeamDefinitionStore()
  const teamRunStore = useAgentTeamRunStore()
  const teamRunConfigStore = useTeamRunConfigStore()
  const mobileWorkStore = useMobileWorkStore()
  const { agentItems, teamItems } = useMobileWorkCatalog()
  const launchWorkspaces = useMobileLaunchWorkspaces()
  const { createMobileRunFromConfig } = useMobileRunLaunchCoordinator()

  const mode = ref<MobileLaunchMode>('agent')
  const selectedAgentId = ref('')
  const selectedTeamId = ref('')
  const selectedWorkspaceId = ref('')
  const creationRequestPending = ref(false)
  const error = ref<string | null>(null)

  const selectedTeamDraftLaunchPending = computed(() => (
    teamRunStore.isDraftLaunchPending(teamRunConfigStore.selectedDraft?.draftId ?? null)
  ))
  const creating = computed(() => creationRequestPending.value || selectedTeamDraftLaunchPending.value)

  const draftAttachments = computed(() => mobileWorkStore.draftContextAttachments)

  const agentChoices = computed<MobileLaunchPickerItem[]>(() => agentItems.value.flatMap((item) => item.context.kind === 'agent-definition'
    ? [{ id: item.context.agentDefinitionId, label: item.label, detail: item.detail, group: choiceGroupForAgent(item) }]
    : []))

  const teamChoices = computed<MobileLaunchPickerItem[]>(() => teamItems.value.flatMap((item) => item.context.kind === 'team-definition'
    ? [{ id: item.context.teamDefinitionId, label: item.label, detail: item.detail, group: choiceGroupForTeam(item) }]
    : []))

  const workspaceChoices = computed<MobileLaunchPickerItem[]>(() => launchWorkspaces.workspaceItems.value.map((item) => ({
    ...item,
    group: choiceGroupForWorkspace(item),
  })))

  const agentConfigForSelectedTarget = computed<AgentRunConfig | null>(() => {
    const config = agentRunConfigStore.config
    return mode.value === 'agent' && config?.agentDefinitionId === selectedAgentId.value ? config : null
  })

  const teamConfigForSelectedTarget = computed<TeamRunConfig | null>(() => {
    const config = teamRunConfigStore.config
    return mode.value === 'team' && config?.teamDefinitionId === selectedTeamId.value ? config : null
  })

  const activeConfig = computed<AgentRunConfig | TeamRunConfig | null>(() => (
    mode.value === 'agent' ? agentConfigForSelectedTarget.value : teamConfigForSelectedTarget.value
  ))

  const activeTeamConfigForCatalogSync = computed(() => teamConfigForSelectedTarget.value)
  useTeamRunRuntimeCatalogSync(activeTeamConfigForCatalogSync)

  const teamReadiness = computed(() => teamRunConfigStore.launchReadiness)
  const blockingIssue = computed(() => {
    const targetSelected = mode.value === 'agent' ? selectedAgentId.value : selectedTeamId.value
    if (!targetSelected) {
      return mode.value === 'agent' ? 'Choose an agent before creating the run.' : 'Choose a team before creating the run.'
    }
    if (!selectedWorkspaceId.value) {
      return 'Choose a workspace before creating the run.'
    }
    if (mode.value === 'agent') {
      if (!agentConfigForSelectedTarget.value) {
        return 'Agent launch configuration is still loading.'
      }
      if (!agentRunConfigStore.isConfigured) {
        return 'Choose a model before creating the run.'
      }
      return ''
    }
    if (!teamConfigForSelectedTarget.value) {
      return 'Team launch configuration is still loading.'
    }
    if (!teamReadiness.value.canLaunch) {
      return teamReadiness.value.blockingIssues[0]?.message || 'Team configuration is not launch-ready.'
    }
    return ''
  })
  const canLaunch = computed(() => !blockingIssue.value)
  const autoExecuteTools = computed(() => activeConfig.value?.autoExecuteTools ?? false)

  function choiceGroupForAgent(item: MobileWorkListItem): string {
    const context = options.context.value
    if ((context?.kind === 'agent-definition' || context?.kind === 'agent-run') && item.context.kind === 'agent-definition' && item.context.agentDefinitionId === context.agentDefinitionId) {
      return 'Current context'
    }
    return 'All agents'
  }

  function choiceGroupForTeam(item: MobileWorkListItem): string {
    const context = options.context.value
    if ((context?.kind === 'team-definition' || context?.kind === 'team-run') && item.context.kind === 'team-definition' && item.context.teamDefinitionId === context.teamDefinitionId) {
      return 'Current context'
    }
    return 'All teams'
  }

  function choiceGroupForWorkspace(item: MobileLaunchPickerItem): string {
    const context = options.context.value
    const rootPath = launchWorkspaces.getRootPathForWorkspaceId(item.id)
    if (context?.kind === 'workspace' && item.id === context.workspaceId) {
      return 'Current context'
    }
    if ((context?.kind === 'agent-run' || context?.kind === 'team-run') && rootPath && rootPath === context.workspaceRootPath) {
      return 'Current run workspace'
    }
    return item.group || 'All workspaces'
  }

  function applyContextDefaults(): void {
    if (creating.value) return
    const context = options.context.value
    if (context?.kind === 'agent-definition' && !selectedAgentId.value) {
      mode.value = 'agent'
      selectedAgentId.value = context.agentDefinitionId
    }
    if (context?.kind === 'team-definition' && !selectedTeamId.value) {
      mode.value = 'team'
      selectedTeamId.value = context.teamDefinitionId
    }
    if (context?.kind === 'agent-run') {
      mode.value = 'agent'
      if (!selectedAgentId.value) {
        selectedAgentId.value = context.agentDefinitionId
      }
      if (!selectedWorkspaceId.value) {
        selectedWorkspaceId.value = launchWorkspaces.getWorkspaceIdForRootPath(context.workspaceRootPath)
      }
    }
    if (context?.kind === 'team-run') {
      mode.value = 'team'
      if (!selectedTeamId.value) {
        selectedTeamId.value = context.teamDefinitionId
      }
      if (!selectedWorkspaceId.value) {
        selectedWorkspaceId.value = launchWorkspaces.getWorkspaceIdForRootPath(context.workspaceRootPath)
      }
    }
    if (context?.kind === 'workspace' && !selectedWorkspaceId.value) {
      selectedWorkspaceId.value = context.workspaceId
    }
  }

  function applySetupIntentDefaults(intent: MobileRunSetupIntent | null | undefined): void {
    if (creating.value) return
    if (!intent) {
      return
    }
    if (intent.kind === 'agent') {
      mode.value = 'agent'
      selectedAgentId.value = intent.agentDefinitionId
      selectedTeamId.value = ''
    } else {
      mode.value = 'team'
      selectedTeamId.value = intent.teamDefinitionId
      selectedAgentId.value = ''
    }
    if (intent.workspaceId) {
      selectedWorkspaceId.value = intent.workspaceId
    }
  }

  function clearInvalidSelections(): void {
    if (creating.value) return
    if (selectedAgentId.value && !agentChoices.value.some((item) => item.id === selectedAgentId.value)) {
      selectedAgentId.value = ''
    }
    if (selectedTeamId.value && !teamChoices.value.some((item) => item.id === selectedTeamId.value)) {
      selectedTeamId.value = ''
    }
    if (selectedWorkspaceId.value && !workspaceChoices.value.some((item) => item.id === selectedWorkspaceId.value)) {
      selectedWorkspaceId.value = ''
    }
  }

  function updateActiveWorkspaceConfig(): void {
    if (creating.value) return
    const workspaceId = selectedWorkspaceId.value || null
    if (mode.value === 'agent' && agentRunConfigStore.config) {
      agentRunConfigStore.updateAgentConfig({ workspaceId })
    } else if (mode.value === 'team' && teamRunConfigStore.config) {
      teamRunConfigStore.applyConfigEdit({ kind: 'set_workspace', workspaceId, workspaceMetadata: null })
    }
  }

  function syncSelectedConfig(): void {
    if (creating.value) return
    if (mode.value === 'agent') {
      teamRunConfigStore.clearConfig()
      if (!selectedAgentId.value) {
        agentRunConfigStore.clearConfig()
        return
      }
      const definition = agentDefinitionStore.getAgentDefinitionById(selectedAgentId.value)
      if (!definition) {
        return
      }
      if (agentRunConfigStore.config?.agentDefinitionId !== selectedAgentId.value) {
        agentRunConfigStore.setTemplate(definition)
      }
      updateActiveWorkspaceConfig()
      return
    }

    agentRunConfigStore.clearConfig()
    if (!selectedTeamId.value) {
      teamRunConfigStore.clearConfig()
      return
    }
    const definition = teamDefinitionStore.getAgentTeamDefinitionById(selectedTeamId.value)
    if (!definition) {
      return
    }
    if (teamRunConfigStore.config?.teamDefinitionId !== selectedTeamId.value) {
      teamRunConfigStore.setTemplate(definition)
    }
    updateActiveWorkspaceConfig()
  }

  function setMode(nextMode: MobileLaunchMode): void {
    if (creating.value) return
    mode.value = nextMode
  }

  function selectWorkspace(workspaceId: string): void {
    if (creating.value) return
    selectedWorkspaceId.value = workspaceId
    error.value = null
    updateActiveWorkspaceConfig()
  }

  function setAutoExecuteTools(checked: boolean): void {
    if (creating.value) return
    if (mode.value === 'agent') {
      agentRunConfigStore.updateAgentConfig({ autoExecuteTools: checked })
    } else {
      teamRunConfigStore.applyConfigEdit({ kind: 'set_auto_execute_tools', autoExecuteTools: checked })
    }
  }

  function updateRuntimeKind(runtimeKind: string): void {
    if (creating.value) return
    if (mode.value === 'agent') {
      agentRunConfigStore.updateAgentConfig({ runtimeKind })
    } else {
      teamRunConfigStore.applyConfigEdit({ kind: 'set_runtime', runtimeKind })
    }
  }

  function updateLlmModelIdentifier(llmModelIdentifier: string): void {
    if (creating.value) return
    if (mode.value === 'agent') {
      agentRunConfigStore.updateAgentConfig({ llmModelIdentifier })
    } else {
      teamRunConfigStore.applyConfigEdit({ kind: 'set_model', llmModelIdentifier })
    }
  }

  function updateLlmConfig(llmConfig: Record<string, unknown> | null): void {
    if (creating.value) return
    if (mode.value === 'agent') {
      agentRunConfigStore.updateAgentConfig({ llmConfig })
    } else {
      teamRunConfigStore.applyConfigEdit({ kind: 'set_llm_config', llmConfig })
    }
  }

  async function loadWorkspacePath(path: string): Promise<void> {
    if (creating.value) return
    const loadingStore = mode.value === 'agent' ? agentRunConfigStore : teamRunConfigStore
    const hasActiveConfig = Boolean(activeConfig.value)
    if (hasActiveConfig) {
      loadingStore.setWorkspaceLoading(true)
    }

    try {
      const result = await launchWorkspaces.loadByPath(path)
      selectedWorkspaceId.value = result.workspaceId
      if (hasActiveConfig) {
        loadingStore.setWorkspaceLoaded(result.workspaceId, result.rootPath)
      } else {
        updateActiveWorkspaceConfig()
      }
    } catch (cause) {
      const message = launchWorkspaces.error.value || (cause instanceof Error ? cause.message : 'Could not load that workspace path.')
      if (hasActiveConfig) {
        loadingStore.setWorkspaceError(message)
      }
    }
  }

  async function createRun(): Promise<void> {
    if (creating.value) return
    error.value = null
    if (!canLaunch.value) {
      error.value = blockingIssue.value || 'Choose a target, workspace, and model before creating the run.'
      return
    }
    creationRequestPending.value = true
    try {
      const result = await createMobileRunFromConfig(
        mode.value === 'agent'
          ? {
              kind: 'agent',
              agentDefinitionId: selectedAgentId.value,
              workspaceId: selectedWorkspaceId.value,
            }
          : {
              kind: 'team',
              teamDefinitionId: selectedTeamId.value,
              workspaceId: selectedWorkspaceId.value,
            },
      )
      options.onLaunched(result.context)
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Failed to create mobile run.'
    } finally {
      creationRequestPending.value = false
    }
  }

  watch(() => options.context.value, () => {
    if (creating.value) return
    selectedAgentId.value = ''
    selectedTeamId.value = ''
    selectedWorkspaceId.value = ''
    applyContextDefaults()
    applySetupIntentDefaults(options.setupIntent.value)
  }, { immediate: true })

  watch([agentItems, teamItems, launchWorkspaces.workspaceItems], () => {
    if (creating.value) return
    clearInvalidSelections()
    applyContextDefaults()
    applySetupIntentDefaults(options.setupIntent.value)
  })

  watch(() => options.setupIntent.value?.revision, (revision) => {
    if (creating.value) return
    if (!revision) {
      return
    }
    applySetupIntentDefaults(options.setupIntent.value)
    options.onSetupIntentConsumed(revision)
  }, { immediate: true })

  watch([mode, selectedAgentId, selectedTeamId, selectedWorkspaceId, agentChoices, teamChoices, workspaceChoices], syncSelectedConfig, { immediate: true })

  onMounted(() => {
    void launchWorkspaces.refresh().catch(() => undefined)
  })

  return {
    mode,
    selectedAgentId,
    selectedTeamId,
    selectedWorkspaceId,
    creating,
    error,
    draftAttachments,
    agentChoices,
    teamChoices,
    workspaceChoices,
    workspaceError: launchWorkspaces.error,
    workspaceRefreshing: launchWorkspaces.isRefreshing,
    workspacePathLoading: launchWorkspaces.isLoadingPath,
    agentConfigForSelectedTarget,
    teamConfigForSelectedTarget,
    activeConfig,
    canLaunch,
    blockingIssue,
    autoExecuteTools,
    setMode,
    selectWorkspace,
    setAutoExecuteTools,
    updateRuntimeKind,
    updateLlmModelIdentifier,
    updateLlmConfig,
    loadWorkspacePath,
    createRun,
  }
}
