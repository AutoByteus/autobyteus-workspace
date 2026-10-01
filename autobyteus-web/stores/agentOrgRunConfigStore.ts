import { autoExecuteForNewRuntimeSelection, withNewRuntimeOverridePolicy } from '~/utils/agentRunRuntimeDraftPolicy'
import type { AgentOrgRunLaunchSeed } from '~/types/agent/AgentOrgRunLaunchSeed'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { TeamWorkspaceOperationState } from '~/types/agent/TeamLaunchDraft'
import type { AgentConfigOverride, TeamScopeConfigOverride } from '~/types/agent/TeamRunConfig'
import type { RuntimeModelConfigSchemaState } from '~/types/agent/RuntimeModelConfigSchemaState'
import type { WorkspaceSelectionState } from '~/types/workspace/WorkspaceSelectionState'
import { normalizeModelConfigRecord } from '~/types/launch/defaultLaunchConfig'
import { canonicalizeAgentOrgPlacementLaunchPatch } from '~/utils/agentOrgLaunchPatch'

export type AgentOrgRunConfigIntent = Readonly<{
  definitionId: string
  runtimeKind: string
  llmModelIdentifier: string
  llmConfig: Record<string, unknown> | null
  autoExecuteTools: boolean
  workspaceSelection: WorkspaceSelectionState
  teamOverrides: Readonly<Record<AgentTeamAddress, TeamScopeConfigOverride>>
  agentOverrides: Readonly<Record<AgentTeamAddress, AgentConfigOverride>>
  teamWorkspaceSelections: Readonly<Record<AgentTeamAddress, WorkspaceSelectionState>>
}>

export type AgentOrgRootWorkspaceSelectionSource = 'untouched' | 'defaulted' | 'explicit'

const emptyWorkspace = (): WorkspaceSelectionState => ({ mode: 'new', existingWorkspaceId: null, newWorkspacePath: '' })
const idleWorkspaceOperation = (): TeamWorkspaceOperationState => ({ status: 'idle', error: null })
const loadingSchemaState = (): RuntimeModelConfigSchemaState => ({ status: 'loading', message: null })
const cloneTeamOverride = (override: TeamScopeConfigOverride): TeamScopeConfigOverride => ({
  ...override,
  ...(override.workspace ? {
    workspace: {
      workspaceId: override.workspace.workspaceId,
      workspaceMetadata: override.workspace.workspaceMetadata
        ? { ...override.workspace.workspaceMetadata }
        : null,
    },
  } : {}),
})

export const useAgentOrgRunConfigStore = defineStore('agentOrgRunConfig', () => {
  const definitionId = ref('')
  const runtimeKind = ref('autobyteus')
  const llmModelIdentifier = ref('')
  const llmConfig = ref<Record<string, unknown> | null>(null)
  const autoExecuteTools = ref(false)
  const workspaceSelection = ref<WorkspaceSelectionState>(emptyWorkspace())
  const draftEpoch = ref(0)
  const rootWorkspaceSelectionSource = ref<AgentOrgRootWorkspaceSelectionSource>('untouched')
  const teamOverrides = ref<Record<AgentTeamAddress, TeamScopeConfigOverride>>({})
  const agentOverrides = ref<Record<AgentTeamAddress, AgentConfigOverride>>({})
  const teamWorkspaceSelections = ref<Record<AgentTeamAddress, WorkspaceSelectionState>>({})
  const teamWorkspaceOperations = ref<Record<AgentTeamAddress, TeamWorkspaceOperationState>>({})
  const modelSchemaScopeAddresses = ref<readonly AgentTeamAddress[]>(['/'])
  const modelSchemaStateByAddress = ref<Record<AgentTeamAddress, RuntimeModelConfigSchemaState>>({
    '/': loadingSchemaState(),
  })
  const projectionError = ref<string | null>(null)
  const launchError = ref<string | null>(null)

  const begin = (input: {
    definitionId: string
    runtimeKind?: string | null
    llmModelIdentifier?: string | null
    llmConfig?: Record<string, unknown> | null
  }): void => {
    draftEpoch.value += 1
    definitionId.value = input.definitionId
    runtimeKind.value = input.runtimeKind || 'autobyteus'
    llmModelIdentifier.value = input.llmModelIdentifier || ''
    llmConfig.value = normalizeModelConfigRecord(input.llmConfig)
    autoExecuteTools.value = autoExecuteForNewRuntimeSelection(runtimeKind.value, false)
    workspaceSelection.value = emptyWorkspace()
    rootWorkspaceSelectionSource.value = 'untouched'
    teamOverrides.value = {}
    agentOverrides.value = {}
    teamWorkspaceSelections.value = {}
    teamWorkspaceOperations.value = {}
    modelSchemaScopeAddresses.value = ['/']
    modelSchemaStateByAddress.value = { '/': loadingSchemaState() }
    projectionError.value = null
    launchError.value = null
  }

  const beginFromSeed = (seed: AgentOrgRunLaunchSeed): void => {
    const copy: AgentOrgRunLaunchSeed = JSON.parse(JSON.stringify(seed))
    begin(copy)
    autoExecuteTools.value = copy.autoExecuteTools
    workspaceSelection.value = copy.workspaceSelection
    rootWorkspaceSelectionSource.value = 'explicit'
    teamOverrides.value = copy.teamOverrides
    agentOverrides.value = copy.agentOverrides
    teamWorkspaceSelections.value = copy.teamWorkspaceSelections
  }

  const setRootRuntimeKind = (value: string): void => {
    if (runtimeKind.value === value) return
    runtimeKind.value = value
    autoExecuteTools.value = autoExecuteForNewRuntimeSelection(value, autoExecuteTools.value)
    llmConfig.value = null
  }
  const setRootLlmModelIdentifier = (value: string): void => {
    if (llmModelIdentifier.value === value) return
    llmModelIdentifier.value = value
    llmConfig.value = null
  }
  const setRootLlmConfig = (value: Record<string, unknown> | null): void => {
    llmConfig.value = normalizeModelConfigRecord(value)
  }
  const setRootAutoExecuteTools = (value: boolean): void => {
    autoExecuteTools.value = value
  }
  const setWorkspaceSelection = (
    selection: WorkspaceSelectionState,
    source: AgentOrgRootWorkspaceSelectionSource = 'explicit',
  ): void => {
    workspaceSelection.value = { ...selection }
    rootWorkspaceSelectionSource.value = source
  }
  const selectDefaultRootWorkspace = (workspaceId: string | null | undefined): boolean => {
    if (!workspaceId || rootWorkspaceSelectionSource.value !== 'untouched') return false
    if (workspaceSelection.value.existingWorkspaceId || workspaceSelection.value.newWorkspacePath.trim()) return false
    setWorkspaceSelection({ mode: 'existing', existingWorkspaceId: workspaceId, newWorkspacePath: '' }, 'defaulted')
    return true
  }
  const setTeamOverride = (address: AgentTeamAddress, override: TeamScopeConfigOverride | null): void => {
    const next = { ...teamOverrides.value }
    if (override) next[address] = cloneTeamOverride(canonicalizeAgentOrgPlacementLaunchPatch(
      withNewRuntimeOverridePolicy(teamOverrides.value[address], override)!,
    ))
    else delete next[address]
    teamOverrides.value = next
  }
  const resetTeamOverride = (address: AgentTeamAddress): void => {
    setTeamOverride(address, null)
    const selections = { ...teamWorkspaceSelections.value }
    const operations = { ...teamWorkspaceOperations.value }
    delete selections[address]
    delete operations[address]
    teamWorkspaceSelections.value = selections
    teamWorkspaceOperations.value = operations
  }
  const setAgentOverride = (address: AgentTeamAddress, override: AgentConfigOverride | null): void => {
    const next = { ...agentOverrides.value }
    if (override) next[address] = canonicalizeAgentOrgPlacementLaunchPatch(withNewRuntimeOverridePolicy(agentOverrides.value[address], override)!)
    else delete next[address]
    agentOverrides.value = next
  }
  const setTeamWorkspaceSelection = (address: AgentTeamAddress, selection: WorkspaceSelectionState): void => {
    teamWorkspaceSelections.value = {
      ...teamWorkspaceSelections.value,
      [address]: { ...selection },
    }
    setTeamWorkspaceOperation(address, idleWorkspaceOperation())
  }
  const setTeamWorkspaceOperation = (address: AgentTeamAddress, operation: TeamWorkspaceOperationState): void => {
    teamWorkspaceOperations.value = {
      ...teamWorkspaceOperations.value,
      [address]: { ...operation },
    }
  }
  const teamWorkspaceSelectionFor = (address: AgentTeamAddress): WorkspaceSelectionState | null =>
    teamWorkspaceSelections.value[address] ?? null
  const teamWorkspaceOperationFor = (address: AgentTeamAddress): TeamWorkspaceOperationState =>
    teamWorkspaceOperations.value[address] ?? idleWorkspaceOperation()
  const reconcileModelSchemaScopes = (addresses: readonly AgentTeamAddress[]): void => {
    const exactAddresses = [...new Set(addresses)]
    if (exactAddresses.length === modelSchemaScopeAddresses.value.length
      && exactAddresses.every((address, index) => modelSchemaScopeAddresses.value[index] === address)) return
    modelSchemaScopeAddresses.value = Object.freeze(exactAddresses)
    modelSchemaStateByAddress.value = Object.fromEntries(exactAddresses.map((address) => [
      address,
      modelSchemaStateByAddress.value[address] ?? loadingSchemaState(),
    ]))
  }
  const setModelSchemaState = (address: AgentTeamAddress, state: RuntimeModelConfigSchemaState): void => {
    if (!modelSchemaScopeAddresses.value.includes(address)) return
    const current = modelSchemaStateByAddress.value[address]
    if (current?.status === state.status && current.message === state.message && current.reason === state.reason) return
    modelSchemaStateByAddress.value = {
      ...modelSchemaStateByAddress.value,
      [address]: { ...state },
    }
  }
  const modelSchemaStateFor = (address: AgentTeamAddress): RuntimeModelConfigSchemaState =>
    modelSchemaStateByAddress.value[address] ?? loadingSchemaState()
  const firstModelSchemaBlock = computed(() => {
    const ordered = [...modelSchemaScopeAddresses.value].sort((left, right) => {
      const failure = (address: string) => ['invalid', 'unavailable'].includes(modelSchemaStateFor(address).status)
        && modelSchemaStateFor(address).reason !== 'model_required' ? 0 : 1
      return failure(left) - failure(right)
    })
    for (const address of ordered) {
      const state = modelSchemaStateFor(address)
      if (state.status !== 'ready') return Object.freeze({ address, state })
    }
    return null
  })
  const allModelSchemaScopesReady = computed(() => Boolean(
    modelSchemaScopeAddresses.value.length && !firstModelSchemaBlock.value,
  ))
  const setProjectionError = (error: string | null): void => {
    projectionError.value = error
  }
  const setLaunchError = (error: string | null): void => {
    launchError.value = error
  }

  const intent = computed<AgentOrgRunConfigIntent>(() => Object.freeze({
    definitionId: definitionId.value,
    runtimeKind: runtimeKind.value,
    llmModelIdentifier: llmModelIdentifier.value,
    llmConfig: llmConfig.value,
    autoExecuteTools: autoExecuteTools.value,
    workspaceSelection: { ...workspaceSelection.value },
    teamOverrides: Object.freeze(Object.fromEntries(
      Object.entries(teamOverrides.value).map(([address, override]) => [address, cloneTeamOverride(override)]),
    )),
    agentOverrides: Object.freeze(Object.fromEntries(
      Object.entries(agentOverrides.value).map(([address, override]) => [address, { ...override }]),
    )),
    teamWorkspaceSelections: Object.freeze(Object.fromEntries(
      Object.entries(teamWorkspaceSelections.value).map(([address, selection]) => [address, { ...selection }]),
    )),
  }))

  return {
    definitionId, runtimeKind, llmModelIdentifier, llmConfig, autoExecuteTools,
    draftEpoch, rootWorkspaceSelectionSource,
    workspaceSelection, teamOverrides, agentOverrides, teamWorkspaceSelections, teamWorkspaceOperations,
    modelSchemaScopeAddresses, modelSchemaStateByAddress, firstModelSchemaBlock, allModelSchemaScopesReady,
    projectionError, launchError, intent,
    begin, beginFromSeed, setRootRuntimeKind, setRootLlmModelIdentifier, setRootLlmConfig, setRootAutoExecuteTools,
    setWorkspaceSelection, selectDefaultRootWorkspace, setTeamOverride, resetTeamOverride, setAgentOverride,
    setTeamWorkspaceSelection, setTeamWorkspaceOperation, teamWorkspaceSelectionFor, teamWorkspaceOperationFor,
    reconcileModelSchemaScopes, setModelSchemaState, modelSchemaStateFor,
    setProjectionError, setLaunchError,
  }
})
