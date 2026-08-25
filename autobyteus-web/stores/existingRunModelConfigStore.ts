import { defineStore } from 'pinia'
import { teamRunExecutionTreeDtoSchema } from '@autobyteus/team-stream-contracts'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { useAgentContextsStore } from '~/stores/agentContextsStore'
import type { RunResumeConfigPayload, TeamRunResumeConfigPayload } from '~/stores/runHistoryTypes'
import type {
  ExistingRunModelConfigDraft,
  ExistingRunModelConfigFieldError,
  ExistingRunModelConfigSchemaState,
} from '~/types/agent/ExistingRunModelConfigDraft'
import {
  cloneExistingRunModelConfig,
  cloneExistingRunJsonValue,
  existingRunModelConfigsEqual,
} from '~/services/runConfigEditing/existingAgentModelConfigDraft'
import {
  createExistingTeamModelConfigDraft,
  planExistingTeamModelConfigPatches,
  rebaseExistingTeamModelConfigDraft,
  updateExistingTeamScopeModelConfig,
} from '~/services/runConfigEditing/existingTeamModelConfigDraft'
import {
  updateStoppedAgentModelConfig,
  updateStoppedTeamModelConfigs,
  type AgentModelConfigMutationResult,
  type ExistingRunModelConfigMutationResult,
  type TeamModelConfigMutationResult,
} from '~/services/runConfigEditing/existingRunModelConfigMutationClient'

const loadingSchemaState = (): ExistingRunModelConfigSchemaState => ({ status: 'loading', message: null })

const shouldRefreshAfterFailure = (outcome: string): boolean => [
  'STALE_REVISION',
  'PERSISTENCE_FAILED',
  'PERSISTENCE_INDETERMINATE',
].includes(outcome)

export const useExistingRunModelConfigStore = defineStore('existingRunModelConfig', {
  state: () => ({
    draft: null as ExistingRunModelConfigDraft | null,
    schemaStateByAddress: {} as Record<string, ExistingRunModelConfigSchemaState>,
    saving: false,
    reconciling: false,
    reconciliationRequired: false,
    forceBaselineOnNextStoppedSync: false,
    feedback: null as { kind: 'success' | 'error'; message: string } | null,
    fieldErrors: [] as ExistingRunModelConfigFieldError[],
  }),
  getters: {
    patches(state) {
      return state.draft?.kind === 'team'
        ? planExistingTeamModelConfigPatches(state.draft.planner)
        : []
    },
    dirty(state): boolean {
      if (!state.draft) return false
      return state.draft.kind === 'agent'
        ? !existingRunModelConfigsEqual(state.draft.canonicalLlmConfig, state.draft.draftLlmConfig)
        : planExistingTeamModelConfigPatches(state.draft.planner).length > 0
    },
    canSave(state): boolean {
      if (!state.draft || state.saving || state.reconciling || state.reconciliationRequired
          || state.draft.isActive || !state.draft.editability.editable) return false
      if (state.draft.kind === 'agent') {
        return !existingRunModelConfigsEqual(state.draft.canonicalLlmConfig, state.draft.draftLlmConfig)
          && state.schemaStateByAddress['/']?.status === 'ready'
      }
      const patches = planExistingTeamModelConfigPatches(state.draft.planner)
      const allScopesReady = Object.keys(state.draft.planner.scopesByAddress)
        .every((address) => state.schemaStateByAddress[address]?.status === 'ready')
      return patches.length > 0 && allScopesReady
    },
  },
  actions: {
    clear(): void {
      this.draft = null
      this.schemaStateByAddress = {}
      this.saving = false
      this.reconciling = false
      this.reconciliationRequired = false
      this.forceBaselineOnNextStoppedSync = false
      this.feedback = null
      this.fieldErrors = []
    },
    syncAgentCanonical(payload: RunResumeConfigPayload, forceBaseline = false): void {
      const revision = payload.modelConfigEditability.configurationRevision
      const sameSubject = this.draft?.kind === 'agent' && this.draft.runId === payload.runId
      const mustReplaceBaseline = forceBaseline || (this.forceBaselineOnNextStoppedSync && !payload.isActive)
      if (!mustReplaceBaseline && sameSubject
        && this.draft.editability.configurationRevision === revision) {
        this.draft = {
          ...this.draft,
          isActive: payload.isActive,
          editability: { ...payload.modelConfigEditability },
        }
        return
      }
      const canonical = cloneExistingRunModelConfig(payload.metadataConfig.llmConfig)
      this.draft = {
        kind: 'agent',
        runId: payload.runId,
        isActive: payload.isActive,
        editability: { ...payload.modelConfigEditability },
        metadata: cloneExistingRunJsonValue(payload.metadataConfig),
        canonicalLlmConfig: canonical,
        draftLlmConfig: cloneExistingRunModelConfig(canonical),
      }
      this.schemaStateByAddress = { '/': loadingSchemaState() }
      this.fieldErrors = []
      this.reconciliationRequired = false
      this.forceBaselineOnNextStoppedSync = false
      if (!sameSubject) this.feedback = null
    },
    syncTeamCanonical(payload: TeamRunResumeConfigPayload, forceBaseline = false): void {
      const revision = payload.modelConfigEditability.configurationRevision
      const sameSubject = this.draft?.kind === 'team' && this.draft.teamRunId === payload.teamRunId
      const mustReplaceBaseline = forceBaseline || (this.forceBaselineOnNextStoppedSync && !payload.isActive)
      if (!mustReplaceBaseline && sameSubject
        && this.draft.editability.configurationRevision === revision) {
        this.draft = {
          ...this.draft,
          isActive: payload.isActive,
          editability: { ...payload.modelConfigEditability },
        }
        return
      }
      this.draft = {
        kind: 'team',
        teamRunId: payload.teamRunId,
        isActive: payload.isActive,
        editability: { ...payload.modelConfigEditability },
        executionTree: cloneExistingRunJsonValue(payload.executionTree),
        planner: createExistingTeamModelConfigDraft(payload.executionTree),
      }
      this.schemaStateByAddress = Object.fromEntries(
        Object.keys(this.draft.planner.scopesByAddress).map((address) => [address, loadingSchemaState()]),
      )
      this.fieldErrors = []
      this.reconciliationRequired = false
      this.forceBaselineOnNextStoppedSync = false
      if (!sameSubject) this.feedback = null
    },
    updateAgentModelConfig(llmConfig: Record<string, unknown> | null): void {
      if (this.draft?.kind !== 'agent' || !this.draft.editability.editable || this.draft.isActive
          || this.saving || this.reconciling || this.reconciliationRequired) return
      this.draft = { ...this.draft, draftLlmConfig: cloneExistingRunModelConfig(llmConfig) }
      this.feedback = null
      this.fieldErrors = []
    },
    updateTeamScopeModelConfig(address: string, llmConfig: Record<string, unknown> | null): void {
      if (this.draft?.kind !== 'team' || !this.draft.editability.editable || this.draft.isActive
          || this.saving || this.reconciling || this.reconciliationRequired) return
      this.draft = {
        ...this.draft,
        planner: updateExistingTeamScopeModelConfig(this.draft.planner, address, llmConfig),
      }
      this.feedback = null
      this.fieldErrors = []
    },
    setSchemaState(address: string, state: ExistingRunModelConfigSchemaState): void {
      if (!this.draft || (this.draft.kind === 'agent' && address !== '/') ||
          (this.draft.kind === 'team' && !this.draft.planner.scopesByAddress[address])) return
      this.schemaStateByAddress = { ...this.schemaStateByAddress, [address]: { ...state } }
    },
    async save(): Promise<boolean> {
      const draft = this.draft
      if (!draft || !this.canSave) return false
      this.saving = true
      this.feedback = null
      this.fieldErrors = []
      try {
        return draft.kind === 'agent'
          ? await this.saveAgent(draft)
          : await this.saveTeam(draft)
      } catch (error) {
        this.feedback = { kind: 'error', message: error instanceof Error ? error.message : String(error) }
        if (draft.kind === 'agent') {
          await this.reconcileAgentFailure('PERSISTENCE_INDETERMINATE', draft.runId)
        } else {
          await this.reconcileTeamFailure('PERSISTENCE_INDETERMINATE', draft.teamRunId)
        }
        return false
      } finally {
        this.saving = false
      }
    },
    async saveAgent(draft: Extract<ExistingRunModelConfigDraft, { kind: 'agent' }>): Promise<boolean> {
      const result = await updateStoppedAgentModelConfig({
        agentRunId: draft.runId,
        expectedConfigurationRevision: draft.editability.configurationRevision,
        llmConfig: cloneExistingRunModelConfig(draft.draftLlmConfig),
      })
      const history = useRunHistoryStore()
      if (result.success) {
        this.applyResultState(result)
        const payload: RunResumeConfigPayload = {
          runId: draft.runId,
          isActive: result.isActive,
          metadataConfig: { ...draft.metadata, llmConfig: cloneExistingRunModelConfig(result.canonicalLlmConfig) },
          modelConfigEditability: result.editability,
        }
        history.resumeConfigByRunId[draft.runId] = payload
        this.syncAgentCanonical(payload, true)
        useAgentContextsStore().patchConfigOnly(draft.runId, { llmConfig: result.canonicalLlmConfig ?? null })
        this.feedback = { kind: 'success', message: result.message }
        this.reconciliationRequired = false
        return true
      }
      this.applyAgentFailureCanonical(draft, result)
      this.applyResultState(result)
      if (result.outcome === 'RUN_ACTIVE') {
        this.reconciliationRequired = true
        this.forceBaselineOnNextStoppedSync = true
      }
      await this.reconcileAgentFailure(result.outcome, draft.runId)
      return false
    },
    async saveTeam(draft: Extract<ExistingRunModelConfigDraft, { kind: 'team' }>): Promise<boolean> {
      const result = await updateStoppedTeamModelConfigs({
        teamRunId: draft.teamRunId,
        expectedConfigurationRevision: draft.editability.configurationRevision,
        patches: planExistingTeamModelConfigPatches(draft.planner),
      })
      const history = useRunHistoryStore()
      if (result.success) {
        this.applyResultState(result)
        const tree = teamRunExecutionTreeDtoSchema.parse(result.canonicalExecutionTree)
        const payload: TeamRunResumeConfigPayload = {
          teamRunId: draft.teamRunId,
          isActive: result.isActive,
          executionTree: tree,
          modelConfigEditability: result.editability,
        }
        history.teamResumeConfigByTeamRunId[draft.teamRunId] = payload
        this.syncTeamCanonical(payload, true)
        this.feedback = { kind: 'success', message: result.message }
        this.reconciliationRequired = false
        return true
      }
      this.applyTeamFailureCanonical(draft, result)
      this.applyResultState(result)
      if (result.outcome === 'RUN_ACTIVE') {
        this.reconciliationRequired = true
        this.forceBaselineOnNextStoppedSync = true
      }
      await this.reconcileTeamFailure(result.outcome, draft.teamRunId)
      return false
    },
    applyAgentFailureCanonical(
      draft: Extract<ExistingRunModelConfigDraft, { kind: 'agent' }>,
      result: AgentModelConfigMutationResult,
    ): void {
      if (!Object.prototype.hasOwnProperty.call(result, 'canonicalLlmConfig')) {
        this.draft = {
          ...draft,
          isActive: result.isActive,
          editability: {
            ...result.editability,
            configurationRevision: draft.editability.configurationRevision,
          },
        }
        return
      }
      const canonical = cloneExistingRunModelConfig(result.canonicalLlmConfig)
      const payload: RunResumeConfigPayload = {
        runId: draft.runId,
        isActive: result.isActive,
        metadataConfig: { ...draft.metadata, llmConfig: canonical },
        modelConfigEditability: result.editability,
      }
      useRunHistoryStore().resumeConfigByRunId[draft.runId] = payload
      if (result.editability.configurationRevision !== draft.editability.configurationRevision) {
        this.syncAgentCanonical(payload, true)
        return
      }
      this.draft = {
        ...draft,
        isActive: result.isActive,
        editability: { ...result.editability },
        metadata: cloneExistingRunJsonValue(payload.metadataConfig),
        canonicalLlmConfig: canonical,
      }
    },
    applyTeamFailureCanonical(
      draft: Extract<ExistingRunModelConfigDraft, { kind: 'team' }>,
      result: TeamModelConfigMutationResult,
    ): void {
      const parsedTree = teamRunExecutionTreeDtoSchema.safeParse(result.canonicalExecutionTree)
      if (!parsedTree.success) {
        this.draft = {
          ...draft,
          isActive: result.isActive,
          editability: {
            ...result.editability,
            configurationRevision: draft.editability.configurationRevision,
          },
        }
        return
      }
      const payload: TeamRunResumeConfigPayload = {
        teamRunId: draft.teamRunId,
        isActive: result.isActive,
        executionTree: parsedTree.data,
        modelConfigEditability: result.editability,
      }
      useRunHistoryStore().teamResumeConfigByTeamRunId[draft.teamRunId] = payload
      if (result.editability.configurationRevision !== draft.editability.configurationRevision) {
        this.syncTeamCanonical(payload, true)
        return
      }
      this.draft = {
        ...draft,
        isActive: result.isActive,
        editability: { ...result.editability },
        executionTree: cloneExistingRunJsonValue(parsedTree.data),
        planner: rebaseExistingTeamModelConfigDraft(draft.planner, parsedTree.data),
      }
    },
    applyResultState(result: ExistingRunModelConfigMutationResult): void {
      this.feedback = { kind: result.success ? 'success' : 'error', message: result.message }
      this.fieldErrors = [...(result.fieldErrors ?? [])]
      if (result.outcome === 'MODEL_UNAVAILABLE' || result.outcome === 'SCHEMA_UNAVAILABLE') {
        const affectedAddresses = this.draft?.kind === 'team'
          ? planExistingTeamModelConfigPatches(this.draft.planner).map((patch) => patch.scopeAddress)
          : ['/']
        this.schemaStateByAddress = {
          ...this.schemaStateByAddress,
          ...Object.fromEntries(affectedAddresses.map((address) => [address, {
            status: 'unavailable' as const,
            message: result.message,
          }])),
        }
      }
    },
    async reconcileAgentFailure(outcome: string, runId: string): Promise<void> {
      if (!shouldRefreshAfterFailure(outcome)) return
      this.reconciliationRequired = true
      this.reconciling = true
      try {
        this.syncAgentCanonical(await useRunHistoryStore().refreshAgentResumeConfig(runId))
        this.reconciliationRequired = false
      } catch (error) {
        this.feedback = { kind: 'error', message: error instanceof Error ? error.message : String(error) }
      } finally {
        this.reconciling = false
      }
    },
    async reconcileTeamFailure(outcome: string, teamRunId: string): Promise<void> {
      if (!shouldRefreshAfterFailure(outcome)) return
      this.reconciliationRequired = true
      this.reconciling = true
      try {
        this.syncTeamCanonical(await useRunHistoryStore().refreshTeamResumeConfig(teamRunId))
        this.reconciliationRequired = false
      } catch (error) {
        this.feedback = { kind: 'error', message: error instanceof Error ? error.message : String(error) }
      } finally {
        this.reconciling = false
      }
    },
    async retryCanonicalRefresh(): Promise<void> {
      const draft = this.draft
      if (!draft || this.reconciling) return
      this.reconciliationRequired = true
      if (draft.kind === 'agent') {
        await this.reconcileAgentFailure('PERSISTENCE_INDETERMINATE', draft.runId)
      } else {
        await this.reconcileTeamFailure('PERSISTENCE_INDETERMINATE', draft.teamRunId)
      }
    },
  },
})
