import { loadExistingRunModelOptions } from '~/services/runConfigEditing/existingRunModelOptionsClient'
import { defineStore } from 'pinia'
import { teamRunExecutionTreeDtoSchema } from '@autobyteus/team-stream-contracts'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { useAgentContextsStore } from '~/stores/agentContextsStore'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { parseAgentOrgExecutionTree } from '~/types/collaboration/agentOrgExecution'
import type { RunResumeConfigPayload, TeamRunResumeConfigPayload } from '~/stores/runHistoryTypes'
import type {
  ExistingRunModelConfigDraft,
  ExistingRunModelSelection,
  ExistingRunModelOptionsState,
  ExistingRunModelConfigFieldError,
  ExistingRunModelConfigSchemaState,
} from '~/types/agent/ExistingRunModelConfigDraft'
import {
  cloneExistingRunModelConfig,
  cloneExistingRunJsonValue,
  cloneExistingRunSelection,
  existingRunSelectionsEqual,
  selectionAllowed,
} from '~/services/runConfigEditing/existingAgentModelConfigDraft'
import {
  createExistingTeamModelConfigDraft,
  planExistingTeamModelConfigPatches,
  updateExistingTeamScopeModelConfig,
} from '~/services/runConfigEditing/existingTeamModelConfigDraft'
import {
  createExistingAgentOrgModelConfigDraft,
  planExistingAgentOrgModelConfigPatches,
  updateExistingAgentOrgScopeModelConfig,
} from '~/services/runConfigEditing/existingAgentOrgModelConfigDraft'
import {
  updateStoppedAgentModelConfig,
  updateStoppedTeamModelConfigs,
  type AgentModelConfigMutationResult,
  type TeamModelConfigMutationResult,
  type AgentOrgModelConfigMutationResult,
} from '~/services/runConfigEditing/existingRunModelConfigMutationClient'
import type { AgentOrgRunModelConfigRead } from '~/services/runConfigEditing/agentOrgRunModelConfigClient'
import { existingRunModelConfigResultActions } from '~/stores/existingRunModelConfigResultActions'

const loadingSchemaState = (): ExistingRunModelConfigSchemaState => ({ status: 'loading', message: null })
const metadataSelection = (metadata: RunResumeConfigPayload['metadataConfig']): ExistingRunModelSelection => ({
  llmModelIdentifier: metadata.llmModelIdentifier,
  llmConfig: cloneExistingRunModelConfig(metadata.llmConfig),
})

type CanonicalLoadTarget =
  | Readonly<{ kind: 'agent'; runId: string }>
  | Readonly<{ kind: 'team'; teamRunId: string }>
  | Readonly<{ kind: 'agent_org'; orgRunId: string }>

type CachedLifecycleLock = Readonly<{
  target: CanonicalLoadTarget
  isActive: boolean
  editability: RunResumeConfigPayload['modelConfigEditability']
}>

const sameTarget = (left: CanonicalLoadTarget | null, right: CanonicalLoadTarget): boolean => {
  if (!left || left.kind !== right.kind) return false
  if (left.kind === 'agent' && right.kind === 'agent') return left.runId === right.runId
  if (left.kind === 'team' && right.kind === 'team') return left.teamRunId === right.teamRunId
  return left.kind === 'agent_org' && right.kind === 'agent_org' && left.orgRunId === right.orgRunId
}

export const useExistingRunModelConfigStore = defineStore('existingRunModelConfig', {
  state: () => ({
    draft: null as ExistingRunModelConfigDraft | null,
    modelOptionsByAddress: {} as Record<string, ExistingRunModelOptionsState>,
    optionsRequestId: 0,
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
      if (state.draft?.kind === 'team') return planExistingTeamModelConfigPatches(state.draft.planner)
      if (state.draft?.kind === 'agent_org') return planExistingAgentOrgModelConfigPatches(state.draft.planner)
      return []
    },
    dirty(state): boolean {
      const draft = state.draft
      if (!draft) return false
      return draft.kind === 'agent'
        ? !existingRunSelectionsEqual(metadataSelection(draft.metadata), draft.draftSelection)
        : draft.kind === 'team'
          ? planExistingTeamModelConfigPatches(draft.planner).length > 0
          : planExistingAgentOrgModelConfigPatches(draft.planner).length > 0
    },
    canSave(state): boolean {
      const draft = state.draft
      if (!draft || state.saving || state.loadingCanonical || state.reconciling
          || state.reconciliationRequired || draft.isActive || !draft.editability.editable) return false
      if (draft.kind === 'agent') {
        return !existingRunSelectionsEqual(metadataSelection(draft.metadata), draft.draftSelection)
          && state.schemaStateByAddress['/']?.status === 'ready'
          && selectionAllowed(metadataSelection(draft.metadata), draft.draftSelection, state.modelOptionsByAddress['/'])
      }
      const patches = draft.kind === 'team'
        ? planExistingTeamModelConfigPatches(draft.planner)
        : planExistingAgentOrgModelConfigPatches(draft.planner)
      const allScopesReady = Object.keys(draft.planner.scopesByAddress)
        .every((address) => state.schemaStateByAddress[address]?.status === 'ready')
      return patches.length > 0 && allScopesReady && patches.every((patch) => {
        const scope = draft.planner.scopesByAddress[patch.scopeAddress]!
        return scope && selectionAllowed(scope.originalSelection, scope.draftSelection, state.modelOptionsByAddress[patch.scopeAddress])
      })
    },
  },
  actions: {
    async refreshModelOptions(): Promise<void> {
      const draft = this.draft
      if (!draft) return
      const requestId = ++this.optionsRequestId
      const addresses = draft.kind === 'agent' ? ['/'] : Object.keys(draft.planner.scopesByAddress)
      this.modelOptionsByAddress = Object.fromEntries(addresses.map((address) => [address, { status: 'loading', options: null }]))
      try {
        const options = await loadExistingRunModelOptions(draft)
        if (requestId !== this.optionsRequestId) return
        this.modelOptionsByAddress = options
      } catch {
        if (requestId !== this.optionsRequestId) return
        this.modelOptionsByAddress = Object.fromEntries(addresses.map((address) => [address, { status: 'unavailable', options: null }]))
      }
    },
    clear(): void {
      this.optionsRequestId += 1
      this.modelOptionsByAddress = {}
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
      this.optionsRequestId += 1
      this.modelOptionsByAddress = {}
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
      const current = this.loadTarget
      if (requestId !== this.canonicalLoadRequestId || !current || current.kind !== target.kind) return false
      if (target.kind === 'agent' && current.kind === 'agent') return current.runId === target.runId
      if (target.kind === 'team' && current.kind === 'team') return current.teamRunId === target.teamRunId
      return target.kind === 'agent_org' && current.kind === 'agent_org' && current.orgRunId === target.orgRunId
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
    async loadAgentOrgCanonical(orgRunId: string): Promise<void> {
      const target = { kind: 'agent_org' as const, orgRunId }
      const requestId = this.beginCanonicalLoad(target)
      try {
        const payload = await useAgentOrgContextsStore().readRunModelConfig(orgRunId)
        if (this.isCurrentLoad(requestId, target)) this.syncAgentOrgCanonical(payload)
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
      this.draft = {
        kind: 'agent',
        runId: payload.runId,
        isActive: payload.isActive,
        editability: { ...payload.modelConfigEditability },
        metadata: cloneExistingRunJsonValue(payload.metadataConfig),
        draftSelection: metadataSelection(payload.metadataConfig),
      }
      this.schemaStateByAddress = { '/': loadingSchemaState() }
      this.fieldErrors = []
      this.reconciliationRequired = false
      this.applyCachedLifecycleLock({ kind: 'agent', runId: payload.runId })
      void this.refreshModelOptions()
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
      void this.refreshModelOptions()
      if (!sameSubject) this.feedback = null
    },
    syncAgentOrgCanonical(payload: AgentOrgRunModelConfigRead): void {
      const sameSubject = this.draft?.kind === 'agent_org' && this.draft.orgRunId === payload.orgRunId
      const tree = parseAgentOrgExecutionTree(payload.executionTree)
      this.draft = { kind: 'agent_org', orgRunId: payload.orgRunId, isActive: payload.isActive,
        editability: { ...payload.editability }, executionTree: cloneExistingRunJsonValue(tree),
        planner: createExistingAgentOrgModelConfigDraft(tree) }
      this.schemaStateByAddress = Object.fromEntries(
        Object.keys(this.draft.planner.scopesByAddress).map((address) => [address, loadingSchemaState()]),
      )
      this.fieldErrors = []
      this.reconciliationRequired = false
      void this.refreshModelOptions()
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
    updateAgentModelConfig(selection: ExistingRunModelSelection): void {
      if (this.draft?.kind !== 'agent' || !this.draft.editability.editable || this.draft.isActive
          || this.saving || this.reconciling || this.reconciliationRequired) return
      this.draft = { ...this.draft, draftSelection: cloneExistingRunSelection(selection) }
      this.feedback = null
      this.fieldErrors = []
    },
    updateTeamScopeModelConfig(address: string, selection: ExistingRunModelSelection, directlyEdited = true): void {
      if (this.draft?.kind !== 'team' || !this.draft.editability.editable || this.draft.isActive
          || this.saving || this.reconciling || this.reconciliationRequired) return
      this.draft = {
        ...this.draft,
        planner: updateExistingTeamScopeModelConfig(this.draft.planner, address, selection, directlyEdited),
      }
      this.feedback = null
      this.fieldErrors = []
    },
    updateAgentOrgScopeModelConfig(address: string, selection: ExistingRunModelSelection, directlyEdited = true): void {
      if (this.draft?.kind !== 'agent_org' || !this.draft.editability.editable || this.draft.isActive
          || this.saving || this.reconciling || this.reconciliationRequired) return
      this.draft = { ...this.draft,
        planner: updateExistingAgentOrgScopeModelConfig(this.draft.planner, address, selection, directlyEdited) }
      this.feedback = null
      this.fieldErrors = []
    },
    setSchemaState(address: string, state: ExistingRunModelConfigSchemaState): void {
      if (!this.draft || (this.draft.kind === 'agent' && address !== '/') ||
          (this.draft.kind !== 'agent' && !this.draft.planner.scopesByAddress[address])) return
      this.schemaStateByAddress = { ...this.schemaStateByAddress, [address]: { ...state } }
    },
    async save(): Promise<boolean> {
      const draft = this.draft
      if (!draft || !this.canSave) return false
      this.saving = true
      this.feedback = null
      this.fieldErrors = []
      try {
        if (draft.kind === 'agent') return await this.saveAgent(draft)
        if (draft.kind === 'team') return await this.saveTeam(draft)
        return await this.saveAgentOrg(draft)
      } catch (error) {
        this.feedback = { kind: 'error', message: error instanceof Error ? error.message : String(error) }
        if (draft.kind === 'agent') {
          await this.reconcileAgentFailure('PERSISTENCE_INDETERMINATE', draft.runId)
        } else if (draft.kind === 'team') {
          await this.reconcileTeamFailure('PERSISTENCE_INDETERMINATE', draft.teamRunId)
        } else {
          await this.reconcileAgentOrgFailure('PERSISTENCE_INDETERMINATE', draft.orgRunId)
        }
        return false
      } finally {
        this.saving = false
      }
    },
    async saveAgent(draft: Extract<ExistingRunModelConfigDraft, { kind: 'agent' }>): Promise<boolean> {
      const result = await updateStoppedAgentModelConfig({
        agentRunId: draft.runId,
        ...cloneExistingRunSelection(draft.draftSelection),
      })
      if (this.draft?.kind !== 'agent' || this.draft.runId !== draft.runId) return false
      const history = useRunHistoryStore()
      if (result.success) {
        if (!result.canonicalSelection?.llmModelIdentifier || !Object.hasOwn(result.canonicalSelection, 'llmConfig')) throw new Error('Canonical model selection unavailable; refresh required.')
        this.applyResultState(result)
        const payload: RunResumeConfigPayload = {
          runId: draft.runId,
          isActive: result.isActive,
          metadataConfig: { ...draft.metadata, ...cloneExistingRunSelection(result.canonicalSelection) },
          modelConfigEditability: result.editability,
        }
        history.resumeConfigByRunId[draft.runId] = payload
        this.syncAgentCanonical(payload)
        useAgentContextsStore().patchConfigOnly(draft.runId, cloneExistingRunSelection(result.canonicalSelection))
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
      if (this.draft?.kind !== 'team' || this.draft.teamRunId !== draft.teamRunId) return false
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
    async saveAgentOrg(draft: Extract<ExistingRunModelConfigDraft, { kind: 'agent_org' }>): Promise<boolean> {
      const result = await useAgentOrgContextsStore().saveRunModelConfigs(
        draft.orgRunId,
        planExistingAgentOrgModelConfigPatches(draft.planner),
      )
      if (this.draft?.kind !== 'agent_org' || this.draft.orgRunId !== draft.orgRunId) return false
      if (result.success) {
        const tree = parseAgentOrgExecutionTree(result.canonicalExecutionTree)
        this.applyResultState(result)
        this.syncAgentOrgCanonical({ orgRunId: draft.orgRunId, executionTree: tree,
          isActive: result.isActive, editability: result.editability })
        this.feedback = { kind: 'success', message: result.message }
        return true
      }
      this.applyAgentOrgFailureCanonical(draft, result)
      this.applyResultState(result)
      await this.reconcileAgentOrgFailure(result.outcome, draft.orgRunId)
      return false
    },
    applyAgentFailureCanonical(
      draft: Extract<ExistingRunModelConfigDraft, { kind: 'agent' }>,
      result: AgentModelConfigMutationResult,
    ): void {
      if (!result.canonicalSelection?.llmModelIdentifier || !Object.hasOwn(result.canonicalSelection, 'llmConfig')) {
        this.draft = { ...draft, isActive: result.isActive, editability: { ...result.editability } }
        return
      }
      const canonical = cloneExistingRunSelection(result.canonicalSelection)
      const payload: RunResumeConfigPayload = {
        runId: draft.runId,
        isActive: result.isActive,
        metadataConfig: { ...draft.metadata, ...canonical },
        modelConfigEditability: result.editability,
      }
      useRunHistoryStore().resumeConfigByRunId[draft.runId] = payload
      this.draft = {
        ...draft,
        metadata: payload.metadataConfig,
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
    applyAgentOrgFailureCanonical(
      draft: Extract<ExistingRunModelConfigDraft, { kind: 'agent_org' }>,
      result: AgentOrgModelConfigMutationResult,
    ): void {
      try {
        const tree = parseAgentOrgExecutionTree(result.canonicalExecutionTree)
        // Keep submitted planner values aligned with determinate field errors; indeterminate outcomes replace them after an explicit read.
        this.draft = { ...draft, isActive: result.isActive, editability: { ...result.editability },
          executionTree: cloneExistingRunJsonValue(tree) }
      } catch {
        this.draft = { ...draft, isActive: result.isActive, editability: { ...result.editability } }
      }
    },
    ...existingRunModelConfigResultActions,
  },
})
