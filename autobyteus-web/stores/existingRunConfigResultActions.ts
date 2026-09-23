import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { teamRunExecutionTreeDtoSchema } from '@autobyteus/team-stream-contracts'
import { parseAgentOrgExecutionTree } from '~/types/collaboration/agentOrgExecution'
import { cloneExistingRunSelection, cloneExistingRunJsonValue } from '~/services/runConfigEditing/existingAgentModelConfigDraft'
import type { ExistingRunConfigDraft } from '~/types/agent/ExistingRunConfigDraft'
import type { RunResumeConfigPayload, TeamRunResumeConfigPayload } from '~/stores/runHistoryTypes'
import type { AgentModelConfigMutationResult, TeamModelConfigMutationResult } from '~/services/runConfigEditing/existingRunModelConfigMutationClient'
import type { AgentOrgRunConfigMutationResult } from '~/services/runConfigEditing/agentOrgRunConfigClient'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { planExistingAgentOrgModelConfigPatches } from '~/services/runConfigEditing/existingAgentOrgModelConfigDraft'
import { planExistingTeamModelConfigPatches } from '~/services/runConfigEditing/existingTeamModelConfigDraft'
import type { ExistingRunModelConfigMutationResult } from '~/services/runConfigEditing/existingRunModelConfigMutationClient'

const requiresOutcomeVerification = (outcome: string): boolean => outcome === 'PERSISTENCE_INDETERMINATE'

export const existingRunConfigResultActions = {
    applyAgentFailureCanonical(
      this: any,
      draft: Extract<ExistingRunConfigDraft, { kind: 'agent' }>,
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
      this: any,
      draft: Extract<ExistingRunConfigDraft, { kind: 'team' }>,
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
      this: any,
      draft: Extract<ExistingRunConfigDraft, { kind: 'agent_org' }>,
      result: AgentOrgRunConfigMutationResult,
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

  applyResultState(this: any, result: ExistingRunModelConfigMutationResult): void {
    this.feedback = { kind: result.success ? 'success' : 'error', message: result.message }
    this.fieldErrors = [...(result.fieldErrors ?? [])]
    if (result.outcome !== 'MODEL_UNAVAILABLE' && result.outcome !== 'SCHEMA_UNAVAILABLE') return
    const affectedAddresses = this.draft?.kind === 'team'
      ? planExistingTeamModelConfigPatches(this.draft.planner).map((patch) => patch.scopeAddress)
      : this.draft?.kind === 'agent_org'
        ? planExistingAgentOrgModelConfigPatches(this.draft.planner).map((patch) => patch.scopeAddress)
        : ['/']
    this.schemaStateByAddress = {
      ...this.schemaStateByAddress,
      ...Object.fromEntries(affectedAddresses.map((address) => [address, {
        status: 'unavailable' as const,
        message: result.message,
      }])),
    }
  },

  async reconcileAgentFailure(this: any, outcome: string, runId: string): Promise<void> {
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

  async reconcileTeamFailure(this: any, outcome: string, teamRunId: string): Promise<void> {
    if (!requiresOutcomeVerification(outcome)) return
    this.reconciliationRequired = true
    this.reconciling = true
    this.cachedLifecycleLock = null
    try {
      this.syncTeamCanonical(await useRunHistoryStore().refreshTeamResumeConfig(teamRunId))
      this.feedback = null
    } catch (error) {
      this.feedback = { kind: 'error', message: error instanceof Error ? error.message : String(error) }
    } finally {
      this.reconciling = false
    }
  },

  async reconcileAgentOrgFailure(this: any, outcome: string, orgRunId: string): Promise<void> {
    if (!requiresOutcomeVerification(outcome)) return
    const request = this.canonicalLoadRequestId, binding = useWindowNodeContextStore().bindingRevision
    const current = () => this.canonicalLoadRequestId === request && binding === useWindowNodeContextStore().bindingRevision
      && this.draft?.kind === 'agent_org' && this.draft.orgRunId === orgRunId
    this.reconciliationRequired = true
    this.reconciling = true
    this.cachedLifecycleLock = null
    try {
      const canonical = await useAgentOrgContextsStore().readRunConfig(orgRunId)
      if (!current()) return
      this.syncAgentOrgCanonical(canonical)
      this.feedback = null
    } catch (error) {
      if (!current()) return
      this.feedback = { kind: 'error', message: error instanceof Error ? error.message : String(error) }
    } finally {
      if (current()) this.reconciling = false
    }
  },

  async retryCanonicalRefresh(this: any): Promise<void> {
    if (this.reconciling || this.loadingCanonical) return
    const draft = this.draft
    if (draft?.kind === 'agent') {
      await this.reconcileAgentFailure('PERSISTENCE_INDETERMINATE', draft.runId)
    } else if (draft?.kind === 'team') {
      await this.reconcileTeamFailure('PERSISTENCE_INDETERMINATE', draft.teamRunId)
    } else if (draft?.kind === 'agent_org') {
      await this.reconcileAgentOrgFailure('PERSISTENCE_INDETERMINATE', draft.orgRunId)
    } else if (this.loadTarget?.kind === 'agent') {
      await this.loadAgentCanonical(this.loadTarget.runId)
    } else if (this.loadTarget?.kind === 'team') {
      await this.loadTeamCanonical(this.loadTarget.teamRunId)
    } else if (this.loadTarget?.kind === 'agent_org') {
      await this.loadAgentOrgCanonical(this.loadTarget.orgRunId)
    }
  },
}
