import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { planExistingAgentOrgModelConfigPatches } from '~/services/runConfigEditing/existingAgentOrgModelConfigDraft'
import { planExistingTeamModelConfigPatches } from '~/services/runConfigEditing/existingTeamModelConfigDraft'
import type { ExistingRunModelConfigMutationResult } from '~/services/runConfigEditing/existingRunModelConfigMutationClient'

const requiresOutcomeVerification = (outcome: string): boolean => outcome === 'PERSISTENCE_INDETERMINATE'

export const existingRunModelConfigResultActions = {
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
    this.reconciliationRequired = true
    this.reconciling = true
    this.cachedLifecycleLock = null
    try {
      this.syncAgentOrgCanonical(await useAgentOrgContextsStore().readRunModelConfig(orgRunId))
      this.feedback = null
    } catch (error) {
      this.feedback = { kind: 'error', message: error instanceof Error ? error.message : String(error) }
    } finally {
      this.reconciling = false
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
