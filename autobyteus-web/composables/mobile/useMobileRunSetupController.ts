import { computed, onMounted, ref, watch } from 'vue'
import { useMobileLaunchWorkspaces } from '~/composables/mobile/useMobileLaunchWorkspaces'
import { useMobileRunLaunchCoordinator } from '~/composables/mobile/useMobileRunLaunchCoordinator'
import { useActiveContextStore } from '~/stores/activeContextStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore'
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore'
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig'
import type { MobileLaunchPickerItem } from '~/types/mobileLaunch'

/** The agent New run starts from when no run was opened before (UXJ-004). */
const PREFERRED_AGENT_NAME = 'Project Task Manager'

/**
 * New run on the phone (autobyteus-277 DS-006, DEC-007): an agent run only. The agent is preselected (the open
 * target's agent, else the Project Task Manager, else the first agent), then the first folder; runtime, model and
 * auto approve are the agent's launch configuration. Create run launches it through the run launch coordinator.
 */
export function useMobileRunSetupController(options: { onLaunched: (runId: string) => void }) {
  const activeContext = useActiveContextStore()
  const agentDefinitionStore = useAgentDefinitionStore()
  const agentRunConfigStore = useAgentRunConfigStore()
  const teamRunConfigStore = useTeamRunConfigStore()
  const launchWorkspaces = useMobileLaunchWorkspaces()
  const { createAgentRun } = useMobileRunLaunchCoordinator()

  const selectedAgentId = ref('')
  const selectedWorkspaceId = ref('')
  const creating = ref(false)
  const error = ref<string | null>(null)

  const agentChoices = computed<MobileLaunchPickerItem[]>(() => agentDefinitionStore.agentDefinitions.map((agent) => ({
    id: agent.id, label: agent.name, detail: agent.description || agent.role || undefined,
  })))
  const workspaceChoices = computed<MobileLaunchPickerItem[]>(() => launchWorkspaces.workspaceItems.value)

  const agentConfig = computed<AgentRunConfig | null>(() => {
    const config = agentRunConfigStore.config
    return config?.agentDefinitionId === selectedAgentId.value ? config : null
  })
  const agentSeedModelIdentifier = computed(() =>
    agentDefinitionStore.getAgentDefinitionById(selectedAgentId.value)?.defaultLaunchConfig?.llmModelIdentifier ?? null)

  const blockingIssue = computed(() => {
    if (!selectedAgentId.value) return 'Choose an agent before creating the run.'
    if (!selectedWorkspaceId.value) return 'Choose a workspace before creating the run.'
    if (!agentConfig.value) return 'Agent launch configuration is still loading.'
    if (!agentRunConfigStore.isConfigured) return 'Choose a model before creating the run.'
    return ''
  })
  const canLaunch = computed(() => !blockingIssue.value)

  /** The agent of the run last opened (still the open target), else the Project Task Manager, else the first agent. */
  const preselectedAgentId = (): string => {
    const choices = agentChoices.value
    const targetAgentId = activeContext.activeWorkspaceTarget?.context.config.agentDefinitionId
    return choices.find((item) => item.id === targetAgentId)?.id
      ?? choices.find((item) => item.label === PREFERRED_AGENT_NAME)?.id
      ?? choices[0]?.id
      ?? ''
  }

  const applyDefaults = (): void => {
    if (creating.value) return
    if (selectedAgentId.value && !agentChoices.value.some((item) => item.id === selectedAgentId.value)) selectedAgentId.value = ''
    if (selectedWorkspaceId.value && !workspaceChoices.value.some((item) => item.id === selectedWorkspaceId.value)) selectedWorkspaceId.value = ''
    if (!selectedAgentId.value) selectedAgentId.value = preselectedAgentId()
    if (!selectedWorkspaceId.value) selectedWorkspaceId.value = workspaceChoices.value[0]?.id ?? ''
  }

  /** The agent's launch configuration follows the chosen agent and folder. */
  const syncConfig = (): void => {
    if (creating.value) return
    teamRunConfigStore.clearConfig()
    if (!selectedAgentId.value) { agentRunConfigStore.clearConfig(); return }
    const definition = agentDefinitionStore.getAgentDefinitionById(selectedAgentId.value)
    if (!definition) return
    if (agentRunConfigStore.config?.agentDefinitionId !== selectedAgentId.value) agentRunConfigStore.setTemplate(definition)
    agentRunConfigStore.updateAgentConfig({ workspaceId: selectedWorkspaceId.value || null })
  }

  const update = (change: Partial<Pick<AgentRunConfig, 'runtimeKind' | 'llmModelIdentifier' | 'llmConfig' | 'autoExecuteTools'>>): void => {
    if (!creating.value) agentRunConfigStore.updateAgentConfig(change)
  }

  function selectWorkspace(workspaceId: string): void {
    if (creating.value) return
    selectedWorkspaceId.value = workspaceId
    error.value = null
  }

  /** Opens a folder by its path on the node and chooses it; a failed load shows the product's error under the field. */
  async function loadWorkspacePath(path: string): Promise<void> {
    if (creating.value) return
    const recordsLoading = Boolean(agentConfig.value)
    if (recordsLoading) agentRunConfigStore.setWorkspaceLoading(true)
    try {
      const result = await launchWorkspaces.loadByPath(path)
      selectedWorkspaceId.value = result.workspaceId
      if (recordsLoading) agentRunConfigStore.setWorkspaceLoaded(result.workspaceId, result.rootPath)
    } catch (cause) {
      if (recordsLoading) {
        agentRunConfigStore.setWorkspaceError(launchWorkspaces.error.value || (cause instanceof Error ? cause.message : 'Could not load that workspace path.'))
      }
    }
  }

  async function createRun(): Promise<void> {
    if (creating.value) return
    error.value = null
    if (!canLaunch.value) { error.value = blockingIssue.value; return }
    creating.value = true
    try {
      const runId = await createAgentRun({ agentDefinitionId: selectedAgentId.value, workspaceId: selectedWorkspaceId.value })
      options.onLaunched(runId)
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Failed to create mobile run.'
    } finally {
      creating.value = false
    }
  }

  watch([agentChoices, workspaceChoices], applyDefaults, { immediate: true })
  watch([selectedAgentId, selectedWorkspaceId, agentChoices], syncConfig, { immediate: true })
  onMounted(() => { void launchWorkspaces.refresh().catch(() => undefined) })

  return {
    selectedAgentId,
    selectedWorkspaceId,
    creating,
    error,
    agentChoices,
    workspaceChoices,
    workspaceError: launchWorkspaces.error,
    workspacePathLoading: launchWorkspaces.isLoadingPath,
    agentConfig,
    agentSeedModelIdentifier,
    canLaunch,
    blockingIssue,
    selectWorkspace,
    setAutoExecuteTools: (autoExecuteTools: boolean) => update({ autoExecuteTools }),
    updateRuntimeKind: (runtimeKind: string) => update({ runtimeKind }),
    updateLlmModelIdentifier: (llmModelIdentifier: string) => update({ llmModelIdentifier }),
    updateLlmConfig: (llmConfig: Record<string, unknown> | null) => update({ llmConfig }),
    loadWorkspacePath,
    createRun,
  }
}
