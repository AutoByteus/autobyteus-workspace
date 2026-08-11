import { defineStore } from 'pinia'
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { buildTeamRunTemplate } from '~/composables/useDefinitionLaunchDefaults'
import { type TeamRunConfig } from '~/types/agent/TeamRunConfig'
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata'
import { createWorkspaceMetadata } from '~/utils/workspaceMetadata'
import { normalizeMemberAddress } from '~/utils/teamDefinitionMembers'
import {
  createTeamLaunchDraftId,
  type TeamLaunchDraft,
  type TeamLaunchDraftId,
  type TeamLaunchPendingInput,
} from '~/types/agent/TeamLaunchDraft'
import type { AgentTeamAddress } from '~/types/agent/TeamExecutionAddress'
import {
  evaluateTeamRunLaunchReadiness,
  type RuntimeModelCatalogs,
  type TeamRunLaunchReadiness,
} from '~/utils/teamRunLaunchReadiness'

interface WorkspaceLoadingState {
  isLoading: boolean
  error: string | null
  loadedPath: string | null
}

interface TeamLaunchDraftState {
  drafts: Map<TeamLaunchDraftId, TeamLaunchDraft>
  selectedDraftId: TeamLaunchDraftId | null
  isPanelExpanded: boolean
  hasFirstMessageSent: boolean
  workspaceLoadingState: WorkspaceLoadingState
  runtimeModelCatalogs: RuntimeModelCatalogs
}

const cloneConfig = (config: TeamRunConfig): TeamRunConfig => structuredClone(config)

const deepFreeze = (value: unknown): void => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return
  Object.values(value).forEach(deepFreeze)
  Object.freeze(value)
}

const freezeConfig = (config: TeamRunConfig): Readonly<TeamRunConfig> => {
  const cloned = cloneConfig(config)
  deepFreeze(cloned)
  return cloned
}

const freezePendingInput = (input: TeamLaunchPendingInput): TeamLaunchPendingInput => {
  const cloned = structuredClone(input)
  deepFreeze(cloned)
  return cloned
}

const replaceDraft = (
  draft: TeamLaunchDraft,
  changes: Partial<Pick<TeamLaunchDraft, 'config' | 'focusedMemberAddress' | 'pendingInputsByMemberAddress'>>,
): TeamLaunchDraft => Object.freeze({ ...draft, ...changes })

export const useTeamRunConfigStore = defineStore('teamRunConfig', {
  state: (): TeamLaunchDraftState => ({
    drafts: new Map(),
    selectedDraftId: null,
    isPanelExpanded: true,
    hasFirstMessageSent: false,
    workspaceLoadingState: { isLoading: false, error: null, loadedPath: null },
    runtimeModelCatalogs: {},
  }),

  getters: {
    selectedDraft(state): TeamLaunchDraft | null {
      return state.selectedDraftId ? state.drafts.get(state.selectedDraftId) ?? null : null
    },
    config(): Readonly<TeamRunConfig> | null {
      return this.selectedDraft?.config ?? null
    },
    hasConfig(): boolean { return this.selectedDraft !== null },
    launchReadiness(): TeamRunLaunchReadiness {
      return evaluateTeamRunLaunchReadiness(this.selectedDraft?.config ?? null, this.runtimeModelCatalogs)
    },
    displayName(): string { return this.selectedDraft?.config.teamDefinitionName ?? '' },
  },

  actions: {
    createDraft(config: TeamRunConfig, focusedMemberAddress: AgentTeamAddress): TeamLaunchDraftId {
      const draftId = createTeamLaunchDraftId()
      const draft: TeamLaunchDraft = Object.freeze({
        draftId,
        config: freezeConfig(config),
        focusedMemberAddress,
        pendingInputsByMemberAddress: Object.freeze({}),
      })
      this.drafts = new Map(this.drafts).set(draftId, draft)
      this.selectedDraftId = draftId
      this.isPanelExpanded = true
      this.hasFirstMessageSent = false
      this.workspaceLoadingState = { isLoading: false, error: null, loadedPath: null }
      return draftId
    },

    setTemplate(teamDefinition: AgentTeamDefinition) {
      const focusedMemberAddress = normalizeMemberAddress(teamDefinition.coordinatorMemberName)
      this.createDraft(buildTeamRunTemplate(teamDefinition), focusedMemberAddress)
    },

    setConfig(config: TeamRunConfig) {
      const focusedMemberAddress = normalizeMemberAddress(
        useAgentTeamDefinitionStore().getAgentTeamDefinitionById(config.teamDefinitionId)?.coordinatorMemberName
          || Object.keys(config.memberOverrides)[0]
          || 'coordinator',
      )
      this.createDraft(config, focusedMemberAddress)
    },

    updateConfig(updates: Partial<TeamRunConfig>) {
      const draft = this.selectedDraft
      if (!draft) return
      const next = cloneConfig({ ...draft.config, ...updates } as TeamRunConfig)
      if ('workspaceId' in updates && !('workspaceMetadata' in updates)) next.workspaceMetadata = null
      this.replaceSelectedDraft(replaceDraft(draft, { config: freezeConfig(next) }))
    },

    focusMember(memberAddress: AgentTeamAddress) {
      const draft = this.selectedDraft
      if (draft) this.replaceSelectedDraft(replaceDraft(draft, { focusedMemberAddress: memberAddress }))
    },

    setPendingInput(memberAddress: AgentTeamAddress, input: TeamLaunchPendingInput | null) {
      const draft = this.selectedDraft
      if (!draft) return
      const pending = { ...draft.pendingInputsByMemberAddress }
      if (input) pending[memberAddress] = freezePendingInput(input)
      else delete pending[memberAddress]
      this.replaceSelectedDraft(replaceDraft(draft, { pendingInputsByMemberAddress: Object.freeze(pending) }))
    },

    removeDraft(draftId: TeamLaunchDraftId) {
      if (!this.drafts.has(draftId)) return
      const next = new Map(this.drafts)
      next.delete(draftId)
      this.drafts = next
      if (this.selectedDraftId === draftId) this.selectedDraftId = null
    },

    selectDraft(draftId: TeamLaunchDraftId | null) {
      if (draftId && !this.drafts.has(draftId)) throw new Error(`Team launch draft '${draftId}' was not found.`)
      this.selectedDraftId = draftId
    },

    replaceSelectedDraft(draft: TeamLaunchDraft) {
      if (!this.selectedDraftId || draft.draftId !== this.selectedDraftId) throw new Error('Selected Team launch draft identity changed.')
      this.drafts = new Map(this.drafts).set(draft.draftId, draft)
    },

    setRuntimeModelCatalog(runtimeKind: string, modelIdentifiers: string[]) {
      const normalizedRuntimeKind = runtimeKind.trim()
      if (!normalizedRuntimeKind) return
      this.runtimeModelCatalogs = { ...this.runtimeModelCatalogs, [normalizedRuntimeKind]: [...new Set(modelIdentifiers)] }
    },
    setWorkspaceLoading(isLoading: boolean) {
      this.workspaceLoadingState = { ...this.workspaceLoadingState, isLoading, error: isLoading ? null : this.workspaceLoadingState.error }
    },
    setWorkspaceLoaded(workspaceId: string, path: string, workspaceMetadata: WorkspaceMetadata | null = null) {
      this.workspaceLoadingState = { isLoading: false, loadedPath: path, error: null }
      this.updateConfig({ workspaceId, workspaceMetadata: workspaceMetadata ?? createWorkspaceMetadata({ workspaceId, workspaceRootPath: path }) })
    },
    setWorkspaceError(error: string) { this.workspaceLoadingState = { ...this.workspaceLoadingState, isLoading: false, error } },
    clearWorkspaceState() {
      this.workspaceLoadingState = { isLoading: false, error: null, loadedPath: null }
      if (this.selectedDraft) this.updateConfig({ workspaceId: null, workspaceMetadata: null })
    },
    collapsePanel() { this.isPanelExpanded = false },
    expandPanel() { this.isPanelExpanded = true },
    togglePanel() { this.isPanelExpanded = !this.isPanelExpanded },
    markFirstMessageSent() { this.hasFirstMessageSent = true; this.collapsePanel() },
    clearConfig() {
      const draftId = this.selectedDraftId
      if (draftId) this.removeDraft(draftId)
      this.isPanelExpanded = true
      this.hasFirstMessageSent = false
      this.workspaceLoadingState = { isLoading: false, error: null, loadedPath: null }
    },
  },
})
