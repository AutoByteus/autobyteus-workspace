import { defineStore } from 'pinia'
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { buildTeamRunTemplate, cloneTeamConfig } from '~/composables/useDefinitionLaunchDefaults'
import { type MemberConfigOverride, type TeamRunConfig } from '~/types/agent/TeamRunConfig'
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata'
import { createWorkspaceMetadata } from '~/utils/workspaceMetadata'
import { normalizeMemberAddress } from '~/utils/teamDefinitionMembers'
import {
  createTeamLaunchDraftId,
  type TeamLaunchConfigEdit,
  type TeamLaunchDraft,
  type TeamLaunchDraftId,
  type TeamLaunchPendingInput,
} from '~/types/agent/TeamLaunchDraft'
import type { ContextAttachment } from '~/types/conversation'
import type { AgentTeamAddress } from '~/types/agent/TeamExecutionAddress'
import {
  evaluateTeamRunLaunchReadiness,
  type RuntimeModelCatalogs,
  type TeamRunLaunchReadiness,
} from '~/utils/teamRunLaunchReadiness'
import {
  hasExplicitMemberLlmConfigOverride,
  hasExplicitMemberLlmModelOverride,
  hasExplicitMemberRuntimeOverride,
  hasMeaningfulMemberOverride,
} from '~/utils/teamRunConfigUtils'

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

const deepFreeze = (value: unknown): void => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return
  Object.values(value).forEach(deepFreeze)
  Object.freeze(value)
}

const freezeConfig = (config: TeamRunConfig): Readonly<TeamRunConfig> => {
  const cloned = cloneTeamConfig(config)
  deepFreeze(cloned)
  return cloned
}

const cloneAttachment = (attachment: ContextAttachment): ContextAttachment => {
  const common = {
    id: attachment.id,
    locator: attachment.locator,
    displayName: attachment.displayName,
    type: attachment.type,
  }
  switch (attachment.kind) {
    case 'workspace_path': return { ...common, kind: 'workspace_path' }
    case 'uploaded': return {
      ...common,
      kind: 'uploaded',
      storedFilename: attachment.storedFilename,
      phase: attachment.phase,
    }
    case 'external_url': return { ...common, kind: 'external_url' }
    case 'unsupported_local_file': return { ...common, kind: 'unsupported_local_file' }
  }
}

const freezePendingInput = (input: TeamLaunchPendingInput): TeamLaunchPendingInput => {
  const cloned: TeamLaunchPendingInput = {
    text: input.text,
    attachments: input.attachments.map(cloneAttachment),
  }
  deepFreeze(cloned)
  return cloned
}

const pruneInheritedMemberLlmConfigs = (
  overrides: Readonly<Record<string, MemberConfigOverride>>,
  changedGlobal: Readonly<{ runtime: boolean; model: boolean }>,
): Record<string, MemberConfigOverride> => Object.fromEntries(
  Object.entries(overrides).flatMap(([memberAddress, override]) => {
    const shouldPruneConfig = hasExplicitMemberLlmConfigOverride(override) && (
      (changedGlobal.runtime && !hasExplicitMemberRuntimeOverride(override)) ||
      (changedGlobal.model && !hasExplicitMemberLlmModelOverride(override))
    )
    if (!shouldPruneConfig) return [[memberAddress, override]]
    const prunedOverride = { ...override }
    delete prunedOverride.llmConfig
    return hasMeaningfulMemberOverride(prunedOverride) ? [[memberAddress, prunedOverride]] : []
  }),
)

const canonicalMemberAddress = (value: string): AgentTeamAddress => {
  const normalized = normalizeMemberAddress(value)
  if (normalized !== value) throw new Error(`Team launch edit requires canonical member address '${value}'.`)
  return normalized
}

const applyConfigEdit = (config: Readonly<TeamRunConfig>, edit: TeamLaunchConfigEdit): TeamRunConfig => {
  const next = cloneTeamConfig(config)
  switch (edit.kind) {
    case 'set_workspace':
      next.workspaceId = edit.workspaceId
      next.workspaceMetadata = edit.workspaceMetadata
      return next
    case 'set_runtime':
      next.memberOverrides = pruneInheritedMemberLlmConfigs(next.memberOverrides, {
        runtime: edit.runtimeKind !== next.runtimeKind,
        model: false,
      })
      next.runtimeKind = edit.runtimeKind
      return next
    case 'set_model':
      next.memberOverrides = pruneInheritedMemberLlmConfigs(next.memberOverrides, {
        runtime: false,
        model: edit.llmModelIdentifier !== next.llmModelIdentifier,
      })
      next.llmModelIdentifier = edit.llmModelIdentifier
      return next
    case 'set_llm_config':
      next.llmConfig = edit.llmConfig
      return next
    case 'set_auto_execute_tools':
      next.autoExecuteTools = edit.autoExecuteTools
      return next
    case 'set_member_override': {
      const memberAddress = canonicalMemberAddress(edit.memberAddress)
      if (edit.override && hasMeaningfulMemberOverride(edit.override)) {
        next.memberOverrides[memberAddress] = edit.override
      } else {
        delete next.memberOverrides[memberAddress]
      }
      return next
    }
  }
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

    applyConfigEdit(edit: TeamLaunchConfigEdit) {
      const draft = this.selectedDraft
      if (!draft) return
      this.replaceSelectedDraft(replaceDraft(draft, { config: freezeConfig(applyConfigEdit(draft.config, edit)) }))
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
      this.applyConfigEdit({
        kind: 'set_workspace',
        workspaceId,
        workspaceMetadata: workspaceMetadata ?? createWorkspaceMetadata({ workspaceId, workspaceRootPath: path }),
      })
    },
    setWorkspaceError(error: string) { this.workspaceLoadingState = { ...this.workspaceLoadingState, isLoading: false, error } },
    clearWorkspaceState() {
      this.workspaceLoadingState = { isLoading: false, error: null, loadedPath: null }
      if (this.selectedDraft) this.applyConfigEdit({ kind: 'set_workspace', workspaceId: null, workspaceMetadata: null })
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
