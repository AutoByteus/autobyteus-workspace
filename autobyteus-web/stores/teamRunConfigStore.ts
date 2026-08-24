import { defineStore } from 'pinia'
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { buildTeamRunTemplate, cloneTeamConfig, normalizeRuntimeKind } from '~/composables/useDefinitionLaunchDefaults'
import type { AgentConfigOverride, TeamRunConfig, TeamScopeConfigOverride } from '~/types/agent/TeamRunConfig'
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata'
import { createWorkspaceMetadata } from '~/utils/workspaceMetadata'
import { buildTeamMemberTreeFromDefinition, normalizeMemberAddress, type TeamDefinitionMemberNode } from '~/utils/teamDefinitionMembers'
import { createTeamLaunchDraftId, type TeamLaunchConfigEdit, type TeamLaunchDraft, type TeamLaunchDraftId, type TeamLaunchPendingInput } from '~/types/agent/TeamLaunchDraft'
import type { ContextAttachment } from '~/types/conversation'
import { parseAgentTeamAddress, type AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import { evaluateTeamRunLaunchReadiness, type RuntimeModelCatalogs, type TeamRunLaunchReadiness } from '~/utils/teamRunLaunchReadiness'
import { hasExplicitLlmConfigOverride, hasMeaningfulLaunchOverride } from '~/utils/teamRunConfigUtils'
import { indexTeamLaunchTopology, reconcileTeamRunConfigTopology, resolveTeamRunConfiguration } from '~/utils/teamRunLaunchHierarchy'

export interface WorkspaceLoadingState { isLoading: boolean; error: string | null; loadedPath: string | null }
export interface RuntimeModelCatalogState { status: 'idle' | 'loading' | 'ready' | 'error'; error: string | null }
interface TeamLaunchDraftState {
  drafts: Map<TeamLaunchDraftId, TeamLaunchDraft>
  inFlightDrafts: Map<TeamLaunchDraftId, TeamLaunchDraft>
  selectedDraftId: TeamLaunchDraftId | null
  isPanelExpanded: boolean
  hasFirstMessageSent: boolean
  workspaceLoadingStates: Record<AgentTeamAddress, WorkspaceLoadingState>
  runtimeModelCatalogs: RuntimeModelCatalogs
  runtimeModelCatalogStates: Record<string, RuntimeModelCatalogState>
  repairNotice: { addresses: readonly AgentTeamAddress[] } | null
}
const emptyWorkspaceState = (): WorkspaceLoadingState => ({ isLoading: false, error: null, loadedPath: null })
const deepFreeze = (value: unknown): void => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return
  Object.values(value).forEach(deepFreeze); Object.freeze(value)
}
const freezeConfig = (config: TeamRunConfig): Readonly<TeamRunConfig> => { const cloned = cloneTeamConfig(config); deepFreeze(cloned); return cloned }
const cloneAttachment = (attachment: ContextAttachment): ContextAttachment => ({ ...attachment }) as ContextAttachment
const freezePendingInput = (input: TeamLaunchPendingInput): TeamLaunchPendingInput => {
  const cloned = { text: input.text, attachments: input.attachments.map(cloneAttachment) }; deepFreeze(cloned); return cloned
}
const replaceDraft = (draft: TeamLaunchDraft, changes: Partial<Pick<TeamLaunchDraft, 'config' | 'focusedMemberAddress' | 'pendingInputsByMemberAddress'>>): TeamLaunchDraft =>
  Object.freeze({ ...draft, ...changes })
const assertNoInFlightDraft = (drafts: ReadonlyMap<TeamLaunchDraftId, TeamLaunchDraft>, operation: string): void => {
  const id = drafts.keys().next().value as TeamLaunchDraftId | undefined
  if (id) throw new Error(`Team launch draft '${id}' is in flight and cannot ${operation}.`)
}
const assertDraftMutable = (drafts: ReadonlyMap<TeamLaunchDraftId, TeamLaunchDraft>, id: TeamLaunchDraftId, operation: string): void => {
  if (drafts.has(id)) throw new Error(`Team launch draft '${id}' is in flight and cannot ${operation}.`)
}
const currentMemberTree = (config: Readonly<TeamRunConfig>): readonly TeamDefinitionMemberNode[] | null => {
  const definitions = useAgentTeamDefinitionStore()
  const definition = definitions.getAgentTeamDefinitionById(config.teamDefinitionId)
  return definition ? buildTeamMemberTreeFromDefinition(definition, { getTeamDefinitionById: definitions.getAgentTeamDefinitionById }) : null
}
const pruneInvalidatedLlmConfigs = (
  previous: Readonly<TeamRunConfig>,
  next: TeamRunConfig,
  memberTree: readonly TeamDefinitionMemberNode[],
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
export const applyTeamLaunchConfigEdit = (
  config: Readonly<TeamRunConfig>,
  edit: TeamLaunchConfigEdit,
  memberTree: readonly TeamDefinitionMemberNode[],
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

export const useTeamRunConfigStore = defineStore('teamRunConfig', {
  state: (): TeamLaunchDraftState => ({
    drafts: new Map(), inFlightDrafts: new Map(), selectedDraftId: null,
    isPanelExpanded: true, hasFirstMessageSent: false,
    workspaceLoadingStates: {}, runtimeModelCatalogs: {}, runtimeModelCatalogStates: {}, repairNotice: null,
  }),
  getters: {
    selectedDraft(state): TeamLaunchDraft | null { return state.selectedDraftId ? state.drafts.get(state.selectedDraftId) ?? null : null },
    config(): Readonly<TeamRunConfig> | null { return this.selectedDraft?.config ?? null },
    hasConfig(): boolean { return this.selectedDraft !== null },
    memberTree(): readonly TeamDefinitionMemberNode[] | null { return this.selectedDraft ? currentMemberTree(this.selectedDraft.config) : null },
    launchReadiness(): TeamRunLaunchReadiness { return evaluateTeamRunLaunchReadiness(this.selectedDraft?.config, this.runtimeModelCatalogs, this.memberTree) },
    displayName(): string { return this.selectedDraft?.config.teamDefinitionName ?? '' },
    hasInFlightLaunch(state): boolean { return state.inFlightDrafts.size > 0 },
    isDraftLaunchInFlight: (state) => (id: TeamLaunchDraftId | null): boolean => Boolean(id) && state.inFlightDrafts.has(id as TeamLaunchDraftId),
    workspaceLoadingState(state): WorkspaceLoadingState { return state.workspaceLoadingStates['/'] ?? emptyWorkspaceState() },
    workspaceLoadingStateFor: (state) => (address: AgentTeamAddress): WorkspaceLoadingState => state.workspaceLoadingStates[address] ?? emptyWorkspaceState(),
  },
  actions: {
    createDraft(config: TeamRunConfig, focusedMemberAddress: AgentTeamAddress): TeamLaunchDraftId {
      assertNoInFlightDraft(this.inFlightDrafts, 'be replaced')
      const draftId = createTeamLaunchDraftId()
      const draft = Object.freeze({ draftId, config: freezeConfig(config), focusedMemberAddress, pendingInputsByMemberAddress: Object.freeze({}) })
      this.drafts = new Map(this.drafts).set(draftId, draft); this.selectedDraftId = draftId
      this.isPanelExpanded = true; this.hasFirstMessageSent = false; this.workspaceLoadingStates = {}; this.repairNotice = null
      return draftId
    },
    setTemplate(definition: AgentTeamDefinition) { this.createDraft(buildTeamRunTemplate(definition), normalizeMemberAddress(definition.coordinatorMemberName)) },
    setConfig(config: TeamRunConfig) {
      const definition = useAgentTeamDefinitionStore().getAgentTeamDefinitionById(config.teamDefinitionId)
      this.createDraft(config, normalizeMemberAddress(definition?.coordinatorMemberName || Object.keys(config.agentOverrides)[0] || 'coordinator'))
    },
    applyConfigEdit(edit: TeamLaunchConfigEdit) {
      const draft = this.selectedDraft; if (!draft) return
      assertDraftMutable(this.inFlightDrafts, draft.draftId, 'be edited')
      this.replaceSelectedDraft(replaceDraft(draft, { config: freezeConfig(applyTeamLaunchConfigEdit(draft.config, edit, requireMemberTree(draft.config))) }))
    },
    reconcileSelectedDraftTopology(memberTree: readonly TeamDefinitionMemberNode[]) {
      const draft = this.selectedDraft; if (!draft) return { repaired: false, addresses: [] as readonly AgentTeamAddress[], draft: null }
      assertDraftMutable(this.inFlightDrafts, draft.draftId, 'be reconciled')
      const result = reconcileTeamRunConfigTopology(draft.config, memberTree)
      if (!result.repairedAddresses.length) return { repaired: false, addresses: result.repairedAddresses, draft }
      const repairedDraft = replaceDraft(draft, { config: freezeConfig(result.config) })
      this.replaceSelectedDraft(repairedDraft); this.repairNotice = { addresses: result.repairedAddresses }
      return { repaired: true, addresses: result.repairedAddresses, draft: repairedDraft }
    },
    clearRepairNotice() { this.repairNotice = null },
    focusMember(address: AgentTeamAddress) {
      const draft = this.selectedDraft; if (!draft) return
      assertDraftMutable(this.inFlightDrafts, draft.draftId, 'change focus')
      assertEditTarget(requireMemberTree(draft.config), address, 'agent')
      this.replaceSelectedDraft(replaceDraft(draft, { focusedMemberAddress: address }))
    },
    setPendingInput(address: AgentTeamAddress, input: TeamLaunchPendingInput | null) {
      const draft = this.selectedDraft; if (!draft) return
      assertDraftMutable(this.inFlightDrafts, draft.draftId, 'change pending input'); assertEditTarget(requireMemberTree(draft.config), address, 'agent')
      const pending = { ...draft.pendingInputsByMemberAddress }
      if (input) pending[address] = freezePendingInput(input); else delete pending[address]
      this.replaceSelectedDraft(replaceDraft(draft, { pendingInputsByMemberAddress: Object.freeze(pending) }))
    },
    removeDraft(id: TeamLaunchDraftId) {
      assertDraftMutable(this.inFlightDrafts, id, 'be removed'); if (!this.drafts.has(id)) return
      const next = new Map(this.drafts); next.delete(id); this.drafts = next; if (this.selectedDraftId === id) this.selectedDraftId = null
    },
    selectDraft(id: TeamLaunchDraftId | null) {
      if (id !== this.selectedDraftId) assertNoInFlightDraft(this.inFlightDrafts, 'change selection')
      if (id && !this.drafts.has(id)) throw new Error(`Team launch draft '${id}' was not found.`); this.selectedDraftId = id
    },
    replaceSelectedDraft(draft: TeamLaunchDraft) {
      if (!this.selectedDraftId || draft.draftId !== this.selectedDraftId) throw new Error('Selected Team launch draft identity changed.')
      assertDraftMutable(this.inFlightDrafts, draft.draftId, 'be replaced'); this.drafts = new Map(this.drafts).set(draft.draftId, draft)
    },
    admitDraftLaunch(draft: TeamLaunchDraft) {
      if (this.selectedDraft !== draft || this.selectedDraftId !== draft.draftId) throw new Error(`Team launch draft '${draft.draftId}' is not the exact selected snapshot.`)
      assertNoInFlightDraft(this.inFlightDrafts, 'start another launch'); this.inFlightDrafts = new Map(this.inFlightDrafts).set(draft.draftId, draft)
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
    setWorkspaceLoading(isLoading: boolean, address: AgentTeamAddress = '/') { this.setWorkspaceState(address, { ...(this.workspaceLoadingStates[address] ?? emptyWorkspaceState()), isLoading, error: isLoading ? null : this.workspaceLoadingStates[address]?.error ?? null }) },
    setWorkspaceLoaded(workspaceId: string, path: string, metadata: WorkspaceMetadata | null = null, address: AgentTeamAddress = '/') {
      this.setWorkspaceState(address, { isLoading: false, loadedPath: path, error: null })
      const workspace = { workspaceId, workspaceMetadata: metadata ?? createWorkspaceMetadata({ workspaceId, workspaceRootPath: path }) }
      if (address === '/') this.applyConfigEdit({ kind: 'set_root_workspace', workspace })
      else {
        const current = this.selectedDraft?.config.teamOverrides[address] ?? {}
        this.applyConfigEdit({ kind: 'set_team_override', teamAddress: address, override: { ...current, workspace } })
      }
    },
    setWorkspaceError(error: string, address: AgentTeamAddress = '/') { this.setWorkspaceState(address, { ...(this.workspaceLoadingStates[address] ?? emptyWorkspaceState()), isLoading: false, error }) },
    clearWorkspaceState(address: AgentTeamAddress = '/') {
      this.setWorkspaceState(address, emptyWorkspaceState())
      if (address === '/') this.applyConfigEdit({ kind: 'set_root_workspace', workspace: { workspaceId: null, workspaceMetadata: null } })
      else {
        const current = { ...(this.selectedDraft?.config.teamOverrides[address] ?? {}) }; delete current.workspace
        this.applyConfigEdit({ kind: 'set_team_override', teamAddress: address, override: current })
      }
    },
    setWorkspaceState(address: AgentTeamAddress, state: WorkspaceLoadingState) {
      parseAgentTeamAddress(address); if (this.selectedDraftId) assertDraftMutable(this.inFlightDrafts, this.selectedDraftId, 'change workspace state')
      this.workspaceLoadingStates = { ...this.workspaceLoadingStates, [address]: state }
    },
    collapsePanel() { this.isPanelExpanded = false }, expandPanel() { this.isPanelExpanded = true }, togglePanel() { this.isPanelExpanded = !this.isPanelExpanded },
    markFirstMessageSent() { this.hasFirstMessageSent = true; this.collapsePanel() },
    clearConfig() {
      const id = this.selectedDraftId; if (id) this.removeDraft(id)
      this.isPanelExpanded = true; this.hasFirstMessageSent = false; this.workspaceLoadingStates = {}; this.repairNotice = null
    },
  },
})
