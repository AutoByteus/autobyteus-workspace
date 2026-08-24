import { defineStore } from 'pinia'
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useWorkspaceStore } from '~/stores/workspace'
import { buildTeamRunTemplate, cloneTeamConfig } from '~/composables/useDefinitionLaunchDefaults'
import type { AgentConfigOverride, TeamRunConfig, TeamScopeConfigOverride } from '~/types/agent/TeamRunConfig'
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata'
import { buildTeamMemberTreeFromDefinition, normalizeMemberAddress, type TeamDefinitionMemberNode } from '~/utils/teamDefinitionMembers'
import {
  createTeamLaunchDraftId,
  type TeamLaunchConfigEdit,
  type TeamLaunchDraft,
  type TeamLaunchDraftId,
  type TeamLaunchPendingInput,
  type TeamWorkspaceAuthoringCommand,
  type TeamWorkspaceAuthoringState,
  type TeamWorkspaceAuthoringView,
  type TeamWorkspacePreparationPlan,
} from '~/types/agent/TeamLaunchDraft'
import type { ContextAttachment } from '~/types/conversation'
import { parseAgentTeamAddress, type AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import {
  applyTeamWorkspaceAuthoringReadiness,
  evaluateTeamRunLaunchReadiness,
  type RuntimeModelCatalogs,
  type TeamRunLaunchReadiness,
} from '~/utils/teamRunLaunchReadiness'
import { hasExplicitLlmConfigOverride, hasMeaningfulLaunchOverride, normalizeRuntimeKind } from '~/utils/teamRunConfigUtils'
import { indexTeamLaunchTopology, reconcileTeamRunConfigTopology, resolveTeamRunConfiguration } from '~/utils/teamRunLaunchHierarchy'
import {
  buildTeamLaunchTopologySubjects,
  buildTeamWorkspacePreparationRequests,
  changedTeamLaunchTopologyAddresses,
  deriveTeamWorkspaceAuthoringView,
  freezeTeamWorkspaceAuthoring,
  idleTeamWorkspaceOperation,
  reconcileTeamWorkspaceAuthoringTopology,
  teamLaunchTopologyFingerprint,
} from '~/utils/teamWorkspaceLaunchPreparation'

export interface RuntimeModelCatalogState { status: 'idle' | 'loading' | 'ready' | 'error'; error: string | null }
interface TeamLaunchDraftState {
  drafts: Map<TeamLaunchDraftId, TeamLaunchDraft>
  inFlightDrafts: Map<TeamLaunchDraftId, TeamLaunchDraft>
  workspacePreparationPlans: Map<TeamLaunchDraftId, TeamWorkspacePreparationPlan>
  selectedDraftId: TeamLaunchDraftId | null
  isPanelExpanded: boolean
  hasFirstMessageSent: boolean
  runtimeModelCatalogs: RuntimeModelCatalogs
  runtimeModelCatalogStates: Record<string, RuntimeModelCatalogState>
  repairNotice: { addresses: readonly AgentTeamAddress[] } | null
}
const deepFreeze = (value: unknown): void => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return
  Object.values(value).forEach(deepFreeze); Object.freeze(value)
}
const freezeConfig = (config: TeamRunConfig): Readonly<TeamRunConfig> => { const cloned = cloneTeamConfig(config); deepFreeze(cloned); return cloned }
const cloneAttachment = (attachment: ContextAttachment): ContextAttachment => ({ ...attachment }) as ContextAttachment
const freezePendingInput = (input: TeamLaunchPendingInput): TeamLaunchPendingInput => {
  const cloned = { text: input.text, attachments: input.attachments.map(cloneAttachment) }; deepFreeze(cloned); return cloned
}
const replaceDraft = (
  draft: TeamLaunchDraft,
  changes: Partial<Pick<TeamLaunchDraft, 'config' | 'teamWorkspaceAuthoringByTeamAddress' | 'focusedMemberAddress' | 'pendingInputsByMemberAddress'>>,
): TeamLaunchDraft => Object.freeze({ ...draft, ...changes })
const assertNoLockedDraft = (
  preparations: ReadonlyMap<TeamLaunchDraftId, TeamWorkspacePreparationPlan>,
  inFlight: ReadonlyMap<TeamLaunchDraftId, TeamLaunchDraft>,
  operation: string,
): void => {
  const id = preparations.keys().next().value as TeamLaunchDraftId | undefined
    ?? inFlight.keys().next().value as TeamLaunchDraftId | undefined
  if (id) throw new Error(`Team launch draft '${id}' is in flight and cannot ${operation}.`)
}
const assertDraftMutable = (
  preparations: ReadonlyMap<TeamLaunchDraftId, TeamWorkspacePreparationPlan>,
  inFlight: ReadonlyMap<TeamLaunchDraftId, TeamLaunchDraft>,
  id: TeamLaunchDraftId,
  operation: string,
): void => {
  if (preparations.has(id) || inFlight.has(id)) throw new Error(`Team launch draft '${id}' is in flight and cannot ${operation}.`)
}
const currentMemberTree = (config: Readonly<TeamRunConfig>): readonly TeamDefinitionMemberNode[] | null => {
  const definitions = useAgentTeamDefinitionStore()
  const definition = definitions.getAgentTeamDefinitionById(config.teamDefinitionId)
  return definition ? buildTeamMemberTreeFromDefinition(definition, { getTeamDefinitionById: definitions.getAgentTeamDefinitionById }) : null
}
const requireMemberTree = (config: Readonly<TeamRunConfig>): readonly TeamDefinitionMemberNode[] => {
  const tree = currentMemberTree(config)
  if (!tree) throw new Error('The current Team topology is unavailable.')
  return tree
}
const assertEditTarget = (memberTree: readonly TeamDefinitionMemberNode[], address: string, expected: 'team' | 'agent'): AgentTeamAddress => {
  const canonical = parseAgentTeamAddress(address)
  if (canonical !== address || canonical === '/') throw new Error(`Team launch edit requires a canonical non-root ${expected} address '${address}'.`)
  const index = indexTeamLaunchTopology(memberTree)
  if (!(expected === 'team' ? index.teams : index.agents).has(canonical)) throw new Error(`Address '${canonical}' is not an exact ${expected === 'team' ? 'Team' : 'Agent'} placement.`)
  return canonical
}
const assertTeamTarget = (memberTree: readonly TeamDefinitionMemberNode[], address: string): AgentTeamAddress => {
  const canonical = parseAgentTeamAddress(address)
  if (canonical !== address || !indexTeamLaunchTopology(memberTree).teams.has(canonical)) {
    throw new Error(`Address '${address}' is not an exact Team placement.`)
  }
  return canonical
}
const pruneInvalidatedLlmConfigs = (
  previous: Readonly<TeamRunConfig>, next: TeamRunConfig, memberTree: readonly TeamDefinitionMemberNode[],
): TeamRunConfig => {
  const before = resolveTeamRunConfiguration(previous, memberTree)
  const after = resolveTeamRunConfiguration(next, memberTree)
  const changed = (left: { runtimeKind: string; llmModelIdentifier: string }, right: { runtimeKind: string; llmModelIdentifier: string }): boolean =>
    left.runtimeKind !== right.runtimeKind || left.llmModelIdentifier !== right.llmModelIdentifier
  const prune = <T extends AgentConfigOverride | TeamScopeConfigOverride>(values: Record<AgentTeamAddress, T>, address: AgentTeamAddress): void => {
    const override = values[address]
    if (!hasExplicitLlmConfigOverride(override)) return
    const retained = { ...override }; delete retained.llmConfig
    if (hasMeaningfulLaunchOverride(retained)) values[address] = retained as T
    else delete values[address]
  }
  for (const [address, scope] of Object.entries(after.teamsByAddress)) {
    if (address === '/') continue
    const prior = before.teamsByAddress[address]
    if (prior && changed(prior.effectiveConfig, scope.effectiveConfig)) prune(next.teamOverrides, address)
  }
  for (const [address, agent] of Object.entries(after.agentsByAddress)) {
    const prior = before.agentsByAddress[address]
    if (prior && changed(prior.effectiveConfig, agent.effectiveConfig)) prune(next.agentOverrides, address)
  }
  return next
}
export const applyTeamLaunchConfigEdit = (
  config: Readonly<TeamRunConfig>, edit: TeamLaunchConfigEdit, memberTree: readonly TeamDefinitionMemberNode[],
): TeamRunConfig => {
  const next = cloneTeamConfig(config)
  switch (edit.kind) {
    case 'set_root_workspace': next.rootConfig.workspace = edit.workspace; return next
    case 'set_root_runtime': {
      const runtimeKind = normalizeRuntimeKind(edit.runtimeKind)
      if (runtimeKind === next.rootConfig.runtimeKind) return next
      next.rootConfig.runtimeKind = runtimeKind; next.rootConfig.llmConfig = null
      return pruneInvalidatedLlmConfigs(config, next, memberTree)
    }
    case 'set_root_model': {
      const llmModelIdentifier = edit.llmModelIdentifier.trim()
      if (llmModelIdentifier === next.rootConfig.llmModelIdentifier) return next
      next.rootConfig.llmModelIdentifier = llmModelIdentifier; next.rootConfig.llmConfig = null
      return pruneInvalidatedLlmConfigs(config, next, memberTree)
    }
    case 'set_root_llm_config': next.rootConfig.llmConfig = edit.llmConfig; return next
    case 'set_root_auto_execute_tools': next.rootConfig.autoExecuteTools = edit.autoExecuteTools; return next
    case 'set_team_override': {
      const address = assertEditTarget(memberTree, edit.teamAddress, 'team')
      if (edit.override && hasMeaningfulLaunchOverride(edit.override)) next.teamOverrides[address] = edit.override
      else delete next.teamOverrides[address]
      return pruneInvalidatedLlmConfigs(config, next, memberTree)
    }
    case 'reset_team_override': {
      delete next.teamOverrides[assertEditTarget(memberTree, edit.teamAddress, 'team')]
      return pruneInvalidatedLlmConfigs(config, next, memberTree)
    }
    case 'set_agent_override': {
      const address = assertEditTarget(memberTree, edit.agentAddress, 'agent')
      if (edit.override && hasMeaningfulLaunchOverride(edit.override)) next.agentOverrides[address] = edit.override
      else delete next.agentOverrides[address]
      return pruneInvalidatedLlmConfigs(config, next, memberTree)
    }
  }
}
const reconcileDraftTopology = (draft: TeamLaunchDraft, memberTree: readonly TeamDefinitionMemberNode[]) => {
  const config = reconcileTeamRunConfigTopology(draft.config, memberTree)
  const workspaces = reconcileTeamWorkspaceAuthoringTopology(draft.teamWorkspaceAuthoringByTeamAddress, memberTree)
  const addresses = Object.freeze([...new Set([...config.repairedAddresses, ...workspaces.repairedAddresses])].sort())
  if (!addresses.length) return { draft, addresses }
  return {
    draft: replaceDraft(draft, {
      config: freezeConfig(config.config),
      teamWorkspaceAuthoringByTeamAddress: workspaces.values,
    }),
    addresses,
  }
}
const workspaceMetadataForId = (workspaceId: string): WorkspaceMetadata => {
  const workspaces = useWorkspaceStore()
  const workspace = workspaces.workspaces[workspaceId] ?? null
  const metadata = workspaces.workspaceMetadataById[workspaceId]
    ?? (workspace ? workspaces.registerWorkspaceInfoMetadata(workspace) : null)
  if (!metadata) throw new Error(`Workspace '${workspaceId}' has no canonical metadata.`)
  return metadata
}
const workspaceEdit = (
  config: Readonly<TeamRunConfig>, memberTree: readonly TeamDefinitionMemberNode[], address: AgentTeamAddress,
  workspace: { workspaceId: string; workspaceMetadata: WorkspaceMetadata },
): TeamRunConfig => address === '/'
  ? applyTeamLaunchConfigEdit(config, { kind: 'set_root_workspace', workspace }, memberTree)
  : applyTeamLaunchConfigEdit(config, {
      kind: 'set_team_override', teamAddress: address,
      override: { ...(config.teamOverrides[address] ?? {}), workspace },
    }, memberTree)
const resetLoadingOperations = (
  values: Readonly<Partial<Record<AgentTeamAddress, TeamWorkspaceAuthoringState>>>,
) => freezeTeamWorkspaceAuthoring(Object.fromEntries(Object.entries(values).map(([address, value]) => [address,
  value!.operation.status === 'loading'
    ? { ...value!, operation: idleTeamWorkspaceOperation() }
    : value,
])))

export const useTeamRunConfigStore = defineStore('teamRunConfig', {
  state: (): TeamLaunchDraftState => ({
    drafts: new Map(), inFlightDrafts: new Map(), workspacePreparationPlans: new Map(), selectedDraftId: null,
    isPanelExpanded: true, hasFirstMessageSent: false,
    runtimeModelCatalogs: {}, runtimeModelCatalogStates: {}, repairNotice: null,
  }),
  getters: {
    selectedDraft(state): TeamLaunchDraft | null { return state.selectedDraftId ? state.drafts.get(state.selectedDraftId) ?? null : null },
    config(): Readonly<TeamRunConfig> | null { return this.selectedDraft?.config ?? null },
    hasConfig(): boolean { return this.selectedDraft !== null },
    memberTree(): readonly TeamDefinitionMemberNode[] | null { return this.selectedDraft ? currentMemberTree(this.selectedDraft.config) : null },
    launchReadiness(): TeamRunLaunchReadiness {
      const base = evaluateTeamRunLaunchReadiness(this.selectedDraft?.config, this.runtimeModelCatalogs, this.memberTree)
      const blockingIssues = applyTeamWorkspaceAuthoringReadiness(
        base.blockingIssues, this.selectedDraft?.teamWorkspaceAuthoringByTeamAddress ?? {}, this.memberTree,
      )
      return { ...base, canLaunch: blockingIssues.length === 0, blockingIssues }
    },
    teamWorkspaceAuthoringViewFor(): (address: AgentTeamAddress) => TeamWorkspaceAuthoringView {
      const draft = this.selectedDraft; const memberTree = this.memberTree
      return (address) => {
        if (!draft || !memberTree) throw new Error('The current Team launch draft is unavailable.')
        return deriveTeamWorkspaceAuthoringView(draft, memberTree, address)
      }
    },
    displayName(): string { return this.selectedDraft?.config.teamDefinitionName ?? '' },
    hasInFlightLaunch(state): boolean { return state.inFlightDrafts.size > 0 || state.workspacePreparationPlans.size > 0 },
    isDraftLaunchInFlight: (state) => (id: TeamLaunchDraftId | null): boolean => Boolean(id)
      && (state.inFlightDrafts.has(id as TeamLaunchDraftId) || state.workspacePreparationPlans.has(id as TeamLaunchDraftId)),
  },
  actions: {
    createDraft(config: TeamRunConfig, focusedMemberAddress: AgentTeamAddress): TeamLaunchDraftId {
      assertNoLockedDraft(this.workspacePreparationPlans, this.inFlightDrafts, 'be replaced')
      const draftId = createTeamLaunchDraftId()
      const draft = Object.freeze({
        draftId, config: freezeConfig(config),
        teamWorkspaceAuthoringByTeamAddress: freezeTeamWorkspaceAuthoring({}),
        focusedMemberAddress, pendingInputsByMemberAddress: Object.freeze({}),
      })
      this.drafts = new Map(this.drafts).set(draftId, draft); this.selectedDraftId = draftId
      this.isPanelExpanded = true; this.hasFirstMessageSent = false; this.repairNotice = null
      return draftId
    },
    setTemplate(definition: AgentTeamDefinition) { this.createDraft(buildTeamRunTemplate(definition), normalizeMemberAddress(definition.coordinatorMemberName)) },
    setConfig(config: TeamRunConfig) {
      const definition = useAgentTeamDefinitionStore().getAgentTeamDefinitionById(config.teamDefinitionId)
      this.createDraft(config, normalizeMemberAddress(definition?.coordinatorMemberName || Object.keys(config.agentOverrides)[0] || 'coordinator'))
    },
    applyConfigEdit(edit: TeamLaunchConfigEdit) {
      const draft = this.selectedDraft; if (!draft) return
      assertDraftMutable(this.workspacePreparationPlans, this.inFlightDrafts, draft.draftId, 'be edited')
      const memberTree = requireMemberTree(draft.config)
      const authoring = { ...draft.teamWorkspaceAuthoringByTeamAddress }
      if (edit.kind === 'reset_team_override') delete authoring[edit.teamAddress]
      this.replaceSelectedDraft(replaceDraft(draft, {
        config: freezeConfig(applyTeamLaunchConfigEdit(draft.config, edit, memberTree)),
        teamWorkspaceAuthoringByTeamAddress: freezeTeamWorkspaceAuthoring(authoring),
      }))
    },
    applyTeamWorkspaceAuthoringCommand(command: TeamWorkspaceAuthoringCommand) {
      const draft = this.selectedDraft
      if (!draft || draft.draftId !== command.draftId) throw new Error(`Team launch draft '${command.draftId}' is not the exact selected draft.`)
      assertDraftMutable(this.workspacePreparationPlans, this.inFlightDrafts, draft.draftId, 'change workspace selection')
      const memberTree = requireMemberTree(draft.config)
      const address = assertTeamTarget(memberTree, command.teamAddress)
      const current = draft.teamWorkspaceAuthoringByTeamAddress[address]
      const authoring = { ...draft.teamWorkspaceAuthoringByTeamAddress }
      authoring[address] = {
        selectionMode: command.selection.mode,
        newWorkspacePath: command.selection.newWorkspacePath,
        operation: idleTeamWorkspaceOperation(),
      }
      let config = draft.config
      if (command.selection.mode === 'existing' && command.selection.existingWorkspaceId) {
        const metadata = workspaceMetadataForId(command.selection.existingWorkspaceId)
        config = workspaceEdit(config, memberTree, address, {
          workspaceId: command.selection.existingWorkspaceId,
          workspaceMetadata: metadata,
        })
      } else if (current?.selectionMode === 'new' && command.selection.mode === 'existing') {
        authoring[address] = { ...authoring[address]!, newWorkspacePath: current.newWorkspacePath }
      }
      this.replaceSelectedDraft(replaceDraft(draft, {
        config: freezeConfig(config as TeamRunConfig),
        teamWorkspaceAuthoringByTeamAddress: freezeTeamWorkspaceAuthoring(authoring),
      }))
    },
    reconcileSelectedDraftTopology(memberTree: readonly TeamDefinitionMemberNode[]) {
      const draft = this.selectedDraft; if (!draft) return { repaired: false, addresses: [] as readonly AgentTeamAddress[], draft: null }
      assertDraftMutable(this.workspacePreparationPlans, this.inFlightDrafts, draft.draftId, 'be reconciled')
      const result = reconcileDraftTopology(draft, memberTree)
      if (!result.addresses.length) return { repaired: false, addresses: result.addresses, draft }
      this.replaceSelectedDraft(result.draft); this.repairNotice = { addresses: result.addresses }
      return { repaired: true, addresses: result.addresses, draft: result.draft }
    },
    clearRepairNotice() { this.repairNotice = null },
    focusMember(address: AgentTeamAddress) {
      const draft = this.selectedDraft; if (!draft) return
      assertDraftMutable(this.workspacePreparationPlans, this.inFlightDrafts, draft.draftId, 'change focus')
      assertEditTarget(requireMemberTree(draft.config), address, 'agent')
      this.replaceSelectedDraft(replaceDraft(draft, { focusedMemberAddress: address }))
    },
    setPendingInput(address: AgentTeamAddress, input: TeamLaunchPendingInput | null) {
      const draft = this.selectedDraft; if (!draft) return
      assertDraftMutable(this.workspacePreparationPlans, this.inFlightDrafts, draft.draftId, 'change pending input')
      assertEditTarget(requireMemberTree(draft.config), address, 'agent')
      const pending = { ...draft.pendingInputsByMemberAddress }
      if (input) pending[address] = freezePendingInput(input); else delete pending[address]
      this.replaceSelectedDraft(replaceDraft(draft, { pendingInputsByMemberAddress: Object.freeze(pending) }))
    },
    removeDraft(id: TeamLaunchDraftId) {
      assertDraftMutable(this.workspacePreparationPlans, this.inFlightDrafts, id, 'be removed'); if (!this.drafts.has(id)) return
      const next = new Map(this.drafts); next.delete(id); this.drafts = next; if (this.selectedDraftId === id) this.selectedDraftId = null
    },
    selectDraft(id: TeamLaunchDraftId | null) {
      if (id !== this.selectedDraftId) assertNoLockedDraft(this.workspacePreparationPlans, this.inFlightDrafts, 'change selection')
      if (id && !this.drafts.has(id)) throw new Error(`Team launch draft '${id}' was not found.`); this.selectedDraftId = id
    },
    replaceSelectedDraft(draft: TeamLaunchDraft) {
      if (!this.selectedDraftId || draft.draftId !== this.selectedDraftId) throw new Error('Selected Team launch draft identity changed.')
      assertDraftMutable(this.workspacePreparationPlans, this.inFlightDrafts, draft.draftId, 'be replaced')
      this.drafts = new Map(this.drafts).set(draft.draftId, draft)
    },
    replacePreparedDraft(draft: TeamLaunchDraft, plan: TeamWorkspacePreparationPlan) {
      if (this.workspacePreparationPlans.get(plan.draftId) !== plan || this.selectedDraftId !== draft.draftId) {
        throw new Error(`Team workspace preparation for '${plan.draftId}' is no longer active.`)
      }
      this.drafts = new Map(this.drafts).set(draft.draftId, draft)
    },
    reconcileAndPlanSelectedDraftLaunch(expectedDraft: TeamLaunchDraft, memberTree: readonly TeamDefinitionMemberNode[]) {
      assertNoLockedDraft(this.workspacePreparationPlans, this.inFlightDrafts, 'start another launch')
      if (this.selectedDraft !== expectedDraft || this.selectedDraftId !== expectedDraft.draftId) {
        throw new Error(`Team launch draft '${expectedDraft.draftId}' is not the exact selected snapshot.`)
      }
      const reconciled = reconcileDraftTopology(expectedDraft, memberTree)
      if (reconciled.addresses.length) {
        this.drafts = new Map(this.drafts).set(expectedDraft.draftId, reconciled.draft)
        this.repairNotice = { addresses: reconciled.addresses }
        return { status: 'repaired' as const, addresses: reconciled.addresses, draft: reconciled.draft }
      }
      const preparation = buildTeamWorkspacePreparationRequests(expectedDraft.teamWorkspaceAuthoringByTeamAddress)
      if (preparation.emptyPathAddresses.length) {
        return { status: 'blocked' as const, addresses: preparation.emptyPathAddresses, draft: expectedDraft }
      }
      const topologySubjects = buildTeamLaunchTopologySubjects(expectedDraft.config, memberTree)
      const plan: TeamWorkspacePreparationPlan = Object.freeze({
        draftId: expectedDraft.draftId,
        topologyFingerprint: teamLaunchTopologyFingerprint(topologySubjects),
        topologySubjects,
        requests: preparation.requests,
      })
      this.workspacePreparationPlans = new Map(this.workspacePreparationPlans).set(plan.draftId, plan)
      const loadingAddresses = new Set(preparation.requests.flatMap((request) => request.teamAddresses))
      const authoring = Object.fromEntries(Object.entries(expectedDraft.teamWorkspaceAuthoringByTeamAddress).map(([address, value]) => [address,
        loadingAddresses.has(address as AgentTeamAddress)
          ? { ...value!, operation: { status: 'loading' as const, error: null } }
          : value,
      ]))
      const preparedDraft = replaceDraft(expectedDraft, {
        teamWorkspaceAuthoringByTeamAddress: freezeTeamWorkspaceAuthoring(authoring),
      })
      this.replacePreparedDraft(preparedDraft, plan)
      return { status: 'planned' as const, plan, draft: preparedDraft }
    },
    stopStaleWorkspacePreparation(plan: TeamWorkspacePreparationPlan, memberTree: readonly TeamDefinitionMemberNode[]) {
      const draft = this.selectedDraft
      if (!draft || this.workspacePreparationPlans.get(plan.draftId) !== plan) throw new Error(`Team workspace preparation for '${plan.draftId}' is no longer active.`)
      const subjects = buildTeamLaunchTopologySubjects(draft.config, memberTree)
      const changed = changedTeamLaunchTopologyAddresses(plan.topologySubjects, subjects)
      const reconciled = reconcileDraftTopology(draft, memberTree)
      const addresses = Object.freeze([...new Set([...changed, ...reconciled.addresses])].sort())
      const repairedDraft = replaceDraft(reconciled.draft, {
        teamWorkspaceAuthoringByTeamAddress: resetLoadingOperations(reconciled.draft.teamWorkspaceAuthoringByTeamAddress),
      })
      this.replacePreparedDraft(repairedDraft, plan)
      const plans = new Map(this.workspacePreparationPlans); plans.delete(plan.draftId); this.workspacePreparationPlans = plans
      this.repairNotice = { addresses }
      return { status: 'repaired' as const, addresses, draft: repairedDraft }
    },
    authorizeWorkspacePreparationRequest(
      plan: TeamWorkspacePreparationPlan, memberTree: readonly TeamDefinitionMemberNode[], addresses: readonly AgentTeamAddress[],
    ) {
      const draft = this.selectedDraft
      if (!draft || this.workspacePreparationPlans.get(plan.draftId) !== plan) throw new Error(`Team workspace preparation for '${plan.draftId}' is no longer active.`)
      const subjects = buildTeamLaunchTopologySubjects(draft.config, memberTree)
      if (teamLaunchTopologyFingerprint(subjects) !== plan.topologyFingerprint) return this.stopStaleWorkspacePreparation(plan, memberTree)
      const planned = new Set(plan.requests.flatMap((request) => request.teamAddresses))
      const teams = indexTeamLaunchTopology(memberTree).teams
      for (const address of addresses) {
        if (!planned.has(address) || !teams.has(address)) throw new Error(`Workspace preparation target '${address}' is not an authorized exact Team.`)
      }
      return { status: 'authorized' as const, draft }
    },
    completeWorkspacePreparation(
      plan: TeamWorkspacePreparationPlan,
      memberTree: readonly TeamDefinitionMemberNode[],
      addresses: readonly AgentTeamAddress[],
      result: { workspaceId: string; workspaceMetadata: WorkspaceMetadata },
    ) {
      const authorization = this.authorizeWorkspacePreparationRequest(plan, memberTree, addresses)
      if (authorization.status === 'repaired') return authorization
      let config: Readonly<TeamRunConfig> = authorization.draft.config
      const authoring = { ...authorization.draft.teamWorkspaceAuthoringByTeamAddress }
      for (const address of addresses) {
        config = workspaceEdit(config, memberTree, address, result)
        const state = authoring[address]
        if (!state) throw new Error(`Workspace preparation state for '${address}' is unavailable.`)
        authoring[address] = { ...state, selectionMode: 'existing', operation: idleTeamWorkspaceOperation() }
      }
      const draft = replaceDraft(authorization.draft, {
        config: freezeConfig(config as TeamRunConfig),
        teamWorkspaceAuthoringByTeamAddress: freezeTeamWorkspaceAuthoring(authoring),
      })
      this.replacePreparedDraft(draft, plan)
      return { status: 'completed' as const, draft }
    },
    failWorkspacePreparation(
      plan: TeamWorkspacePreparationPlan,
      memberTree: readonly TeamDefinitionMemberNode[],
      addresses: readonly AgentTeamAddress[],
      error: string,
    ) {
      const authorization = this.authorizeWorkspacePreparationRequest(plan, memberTree, addresses)
      if (authorization.status === 'repaired') return authorization
      const authoring = { ...authorization.draft.teamWorkspaceAuthoringByTeamAddress }
      for (const address of addresses) {
        const state = authoring[address]
        if (!state) throw new Error(`Workspace preparation state for '${address}' is unavailable.`)
        authoring[address] = { ...state, operation: { status: 'error', error } }
      }
      const draft = replaceDraft(authorization.draft, {
        teamWorkspaceAuthoringByTeamAddress: freezeTeamWorkspaceAuthoring(authoring),
      })
      this.replacePreparedDraft(draft, plan)
      const plans = new Map(this.workspacePreparationPlans); plans.delete(plan.draftId); this.workspacePreparationPlans = plans
      return { status: 'failed' as const, draft }
    },
    finalizeWorkspacePreparation(plan: TeamWorkspacePreparationPlan, memberTree: readonly TeamDefinitionMemberNode[]) {
      const authorization = this.authorizeWorkspacePreparationRequest(plan, memberTree, [])
      if (authorization.status === 'repaired') return authorization
      const reconciled = reconcileDraftTopology(authorization.draft, memberTree)
      if (reconciled.addresses.length) return this.stopStaleWorkspacePreparation(plan, memberTree)
      return { status: 'ready' as const, draft: authorization.draft }
    },
    admitPreparedDraftLaunch(plan: TeamWorkspacePreparationPlan, draft: TeamLaunchDraft) {
      if (this.workspacePreparationPlans.get(plan.draftId) !== plan || this.selectedDraft !== draft) {
        throw new Error(`Team launch draft '${draft.draftId}' is not the exact prepared snapshot.`)
      }
      if (this.inFlightDrafts.size) throw new Error('Another Team launch draft is already in flight.')
      const plans = new Map(this.workspacePreparationPlans); plans.delete(plan.draftId); this.workspacePreparationPlans = plans
      this.inFlightDrafts = new Map(this.inFlightDrafts).set(draft.draftId, draft)
    },
    cancelWorkspacePreparation(plan: TeamWorkspacePreparationPlan) {
      if (this.workspacePreparationPlans.get(plan.draftId) !== plan) return
      const draft = this.drafts.get(plan.draftId)
      if (draft) this.replacePreparedDraft(replaceDraft(draft, {
        teamWorkspaceAuthoringByTeamAddress: resetLoadingOperations(draft.teamWorkspaceAuthoringByTeamAddress),
      }), plan)
      const plans = new Map(this.workspacePreparationPlans); plans.delete(plan.draftId); this.workspacePreparationPlans = plans
    },
    isWorkspacePreparationActive(plan: TeamWorkspacePreparationPlan): boolean {
      return this.workspacePreparationPlans.get(plan.draftId) === plan
    },
    completeDraftLaunch(draft: TeamLaunchDraft) {
      if (this.inFlightDrafts.get(draft.draftId) !== draft || this.drafts.get(draft.draftId) !== draft) throw new Error(`Team launch draft '${draft.draftId}' is not the exact admitted snapshot.`)
      const next = new Map(this.drafts); next.delete(draft.draftId); this.drafts = next; if (this.selectedDraftId === draft.draftId) this.selectedDraftId = null
    },
    releaseDraftLaunch(draft: TeamLaunchDraft) {
      if (this.inFlightDrafts.get(draft.draftId) !== draft) throw new Error(`Team launch draft '${draft.draftId}' is not the exact in-flight snapshot.`)
      const next = new Map(this.inFlightDrafts); next.delete(draft.draftId); this.inFlightDrafts = next
    },
    setRuntimeModelCatalogLoading(runtimeKind: string) {
      const runtime = runtimeKind.trim(); if (!runtime) return
      const catalogs = { ...this.runtimeModelCatalogs }; delete catalogs[runtime]; this.runtimeModelCatalogs = catalogs
      this.runtimeModelCatalogStates = { ...this.runtimeModelCatalogStates, [runtime]: { status: 'loading', error: null } }
    },
    setRuntimeModelCatalog(runtimeKind: string, models: string[]) {
      const runtime = runtimeKind.trim(); if (!runtime) return
      this.runtimeModelCatalogs = { ...this.runtimeModelCatalogs, [runtime]: [...new Set(models)] }
      this.runtimeModelCatalogStates = { ...this.runtimeModelCatalogStates, [runtime]: { status: 'ready', error: null } }
    },
    setRuntimeModelCatalogError(runtimeKind: string, error: string) {
      const runtime = runtimeKind.trim(); if (!runtime) return
      const catalogs = { ...this.runtimeModelCatalogs }; delete catalogs[runtime]; this.runtimeModelCatalogs = catalogs
      this.runtimeModelCatalogStates = { ...this.runtimeModelCatalogStates, [runtime]: { status: 'error', error } }
    },
    collapsePanel() { this.isPanelExpanded = false }, expandPanel() { this.isPanelExpanded = true }, togglePanel() { this.isPanelExpanded = !this.isPanelExpanded },
    markFirstMessageSent() { this.hasFirstMessageSent = true; this.collapsePanel() },
    clearConfig() {
      const id = this.selectedDraftId; if (id) this.removeDraft(id)
      this.isPanelExpanded = true; this.hasFirstMessageSent = false; this.repairNotice = null
    },
  },
})
