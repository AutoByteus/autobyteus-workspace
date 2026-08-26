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
const requiresOutcomeVerification = (outcome: string): boolean => outcome === 'PERSISTENCE_INDETERMINATE'

type CanonicalLoadTarget =
  | Readonly<{ kind: 'agent'; runId: string }>
  | Readonly<{ kind: 'team'; teamRunId: string }>

type CachedLifecycleLock = Readonly<{
  target: CanonicalLoadTarget
  isActive: boolean
  editability: RunResumeConfigPayload['modelConfigEditability']
}>

const sameTarget = (left: CanonicalLoadTarget | null, right: CanonicalLoadTarget): boolean => {
  if (!left || left.kind !== right.kind) return false
  return left.kind === 'agent' && right.kind === 'agent'
    ? left.runId === right.runId
    : left.kind === 'team' && right.kind === 'team' && left.teamRunId === right.teamRunId
}

export const useExistingRunModelConfigStore = defineStore('existingRunModelConfig', {
  state: () => ({
    draft: null as ExistingRunModelConfigDraft | null,
    schemaStateByAddress: {} as Record<string, ExistingRunModelConfigSchemaState>,
    saving: false,
    loadingCanonical: false,
    reconciling: false,
    reconciliationRequired: false,
    canonicalLoadRequestId: 0,
    loadTarget: null as CanonicalLoadTarget | null,
    cachedLifecycleLock: null as CachedLifecycleLock | null,
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
      if (!state.draft || state.saving || state.loadingCanonical || state.reconciling
          || state.reconciliationRequired || state.draft.isActive || !state.draft.editability.editable) return false
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
      this.canonicalLoadRequestId += 1
      this.draft = null
      this.schemaStateByAddress = {}
      this.saving = false
      this.loadingCanonical = false
      this.reconciling = false
      this.reconciliationRequired = false
      this.loadTarget = null
      this.cachedLifecycleLock = null
      this.feedback = null
      this.fieldErrors = []
    },
    beginCanonicalLoad(target: CanonicalLoadTarget): number {
      const requestId = ++this.canonicalLoadRequestId
      this.draft = null
      this.schemaStateByAddress = {}
      this.saving = false
      this.loadingCanonical = true
      this.reconciling = false
      this.reconciliationRequired = false
      this.loadTarget = target
      this.cachedLifecycleLock = null
      this.feedback = null
      this.fieldErrors = []
      return requestId
    },
    isCurrentLoad(requestId: number, target: CanonicalLoadTarget): boolean {
      if (requestId !== this.canonicalLoadRequestId || this.loadTarget?.kind !== target.kind) return false
      return target.kind === 'agent'
        ? this.loadTarget.runId === target.runId
        : this.loadTarget.teamRunId === target.teamRunId
    },
    async loadAgentCanonical(runId: string): Promise<void> {
      const target = { kind: 'agent' as const, runId }
      const requestId = this.beginCanonicalLoad(target)
      try {
        const payload = await useRunHistoryStore().refreshAgentResumeConfig(runId)
        if (this.isCurrentLoad(requestId, target)) this.syncAgentCanonical(payload)
      } catch (error) {
        if (!this.isCurrentLoad(requestId, target)) return
        this.feedback = { kind: 'error', message: error instanceof Error ? error.message : String(error) }
        this.reconciliationRequired = true
      } finally {
        if (this.isCurrentLoad(requestId, target)) this.loadingCanonical = false
      }
    },
    async loadTeamCanonical(teamRunId: string): Promise<void> {
      const target = { kind: 'team' as const, teamRunId }
      const requestId = this.beginCanonicalLoad(target)
      try {
        const payload = await useRunHistoryStore().refreshTeamResumeConfig(teamRunId)
        if (this.isCurrentLoad(requestId, target)) this.syncTeamCanonical(payload)
      } catch (error) {
        if (!this.isCurrentLoad(requestId, target)) return
        this.feedback = { kind: 'error', message: error instanceof Error ? error.message : String(error) }
        this.reconciliationRequired = true
      } finally {
        if (this.isCurrentLoad(requestId, target)) this.loadingCanonical = false
      }
    },
    syncAgentCanonical(payload: RunResumeConfigPayload): void {
      const sameSubject = this.draft?.kind === 'agent' && this.draft.runId === payload.runId
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
      this.applyCachedLifecycleLock({ kind: 'agent', runId: payload.runId })
      if (!sameSubject) this.feedback = null
    },
    syncTeamCanonical(payload: TeamRunResumeConfigPayload): void {
      const sameSubject = this.draft?.kind === 'team' && this.draft.teamRunId === payload.teamRunId
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
      this.applyCachedLifecycleLock({ kind: 'team', teamRunId: payload.teamRunId })
      if (!sameSubject) this.feedback = null
    },
    applyCachedAgentLifecycle(payload: RunResumeConfigPayload): void {
      const target = { kind: 'agent' as const, runId: payload.runId }
      if (!payload.isActive && payload.modelConfigEditability.editable) return
      if (!sameTarget(this.loadTarget, target)
          && (this.draft?.kind !== 'agent' || this.draft.runId !== payload.runId)) return
      this.cachedLifecycleLock = {
        target,
        isActive: payload.isActive,
        editability: { ...payload.modelConfigEditability },
      }
      if (this.draft?.kind !== 'agent' || this.draft.runId !== payload.runId) return
      this.draft = {
        ...this.draft,
        isActive: payload.isActive,
        editability: { ...payload.modelConfigEditability },
      }
    },
    applyCachedTeamLifecycle(payload: TeamRunResumeConfigPayload): void {
      const target = { kind: 'team' as const, teamRunId: payload.teamRunId }
      if (!payload.isActive && payload.modelConfigEditability.editable) return
      if (!sameTarget(this.loadTarget, target)
          && (this.draft?.kind !== 'team' || this.draft.teamRunId !== payload.teamRunId)) return
      this.cachedLifecycleLock = {
        target,
        isActive: payload.isActive,
        editability: { ...payload.modelConfigEditability },
      }
      if (this.draft?.kind !== 'team' || this.draft.teamRunId !== payload.teamRunId) return
      this.draft = {
        ...this.draft,
        isActive: payload.isActive,
        editability: { ...payload.modelConfigEditability },
      }
    },
    applyCachedLifecycleLock(target: CanonicalLoadTarget): void {
      const lock = this.cachedLifecycleLock
      if (!lock || !sameTarget(lock.target, target)) return
      if (target.kind === 'agent' && this.draft?.kind === 'agent' && this.draft.runId === target.runId) {
        this.draft = { ...this.draft, isActive: lock.isActive, editability: { ...lock.editability } }
      } else if (target.kind === 'team' && this.draft?.kind === 'team' && this.draft.teamRunId === target.teamRunId) {
        this.draft = { ...this.draft, isActive: lock.isActive, editability: { ...lock.editability } }
      }
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
        this.syncAgentCanonical(payload)
        useAgentContextsStore().patchConfigOnly(draft.runId, { llmConfig: result.canonicalLlmConfig ?? null })
        this.feedback = { kind: 'success', message: result.message }
        return true
      }
      this.applyAgentFailureCanonical(draft, result)
      this.applyResultState(result)
      await this.reconcileAgentFailure(result.outcome, draft.runId)
      return false
    },
    async saveTeam(draft: Extract<ExistingRunModelConfigDraft, { kind: 'team' }>): Promise<boolean> {
      const result = await updateStoppedTeamModelConfigs({
        teamRunId: draft.teamRunId,
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
        this.syncTeamCanonical(payload)
        this.feedback = { kind: 'success', message: result.message }
        return true
      }
      this.applyTeamFailureCanonical(draft, result)
      this.applyResultState(result)
      await this.reconcileTeamFailure(result.outcome, draft.teamRunId)
      return false
    },
    applyAgentFailureCanonical(
      draft: Extract<ExistingRunModelConfigDraft, { kind: 'agent' }>,
      result: AgentModelConfigMutationResult,
    ): void {
      if (!Object.prototype.hasOwnProperty.call(result, 'canonicalLlmConfig')) {
        this.draft = { ...draft, isActive: result.isActive, editability: { ...result.editability } }
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
      this.draft = {
        ...draft,
        isActive: result.isActive,
        editability: { ...result.editability },
      }
    },
    applyTeamFailureCanonical(
      draft: Extract<ExistingRunModelConfigDraft, { kind: 'team' }>,
      result: TeamModelConfigMutationResult,
    ): void {
      const parsedTree = teamRunExecutionTreeDtoSchema.safeParse(result.canonicalExecutionTree)
      if (!parsedTree.success) {
        this.draft = { ...draft, isActive: result.isActive, editability: { ...result.editability } }
        return
      }
      const payload: TeamRunResumeConfigPayload = {
        teamRunId: draft.teamRunId,
        isActive: result.isActive,
        executionTree: parsedTree.data,
        modelConfigEditability: result.editability,
      }
      useRunHistoryStore().teamResumeConfigByTeamRunId[draft.teamRunId] = payload
      this.draft = {
        ...draft,
        isActive: result.isActive,
        editability: { ...result.editability },
        executionTree: cloneExistingRunJsonValue(parsedTree.data),
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
      if (!requiresOutcomeVerification(outcome)) return
      this.reconciliationRequired = true
      this.reconciling = true
      this.cachedLifecycleLock = null
      try {
        this.syncAgentCanonical(await useRunHistoryStore().refreshAgentResumeConfig(runId))
      } catch (error) {
        this.feedback = { kind: 'error', message: error instanceof Error ? error.message : String(error) }
      } finally {
        this.reconciling = false
      }
    },
    async reconcileTeamFailure(outcome: string, teamRunId: string): Promise<void> {
      if (!requiresOutcomeVerification(outcome)) return
      this.reconciliationRequired = true
      this.reconciling = true
      this.cachedLifecycleLock = null
      try {
        this.syncTeamCanonical(await useRunHistoryStore().refreshTeamResumeConfig(teamRunId))
      } catch (error) {
        this.feedback = { kind: 'error', message: error instanceof Error ? error.message : String(error) }
      } finally {
        this.reconciling = false
      }
    },
    async retryCanonicalRefresh(): Promise<void> {
      if (this.reconciling || this.loadingCanonical) return
      const draft = this.draft
      if (draft?.kind === 'agent') {
        await this.reconcileAgentFailure('PERSISTENCE_INDETERMINATE', draft.runId)
      } else if (draft?.kind === 'team') {
        await this.reconcileTeamFailure('PERSISTENCE_INDETERMINATE', draft.teamRunId)
      } else if (this.loadTarget?.kind === 'agent') {
        await this.loadAgentCanonical(this.loadTarget.runId)
      } else if (this.loadTarget?.kind === 'team') {
        await this.loadTeamCanonical(this.loadTarget.teamRunId)
      }
    },
  },
})
