import { computed, ref, watch, type Ref } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import { useWorkspaceHistorySubjectActions } from '~/composables/useWorkspaceHistorySubjectActions'
import { useAgentRunStore } from '~/stores/agentRunStore'
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore'

/** The saved run whose settings are open: an Agent run, a Team run or an Org run. */
export type RunStopSubject =
  | Readonly<{ kind: 'agent'; runId: string }>
  | Readonly<{ kind: 'team'; teamRunId: string }>
  | Readonly<{ kind: 'agent_org'; orgRunId: string }>

/**
 * REQ-014: the stop icon in saved-run settings. It invokes the same terminate action as the
 * workspace tree, with the tree's wording per run type (DEC-003): Agent "Terminate run", Team
 * "Terminate team", Org "Stop Agent Org". `onStopped` re-reads the run so editability comes from
 * the server.
 */
export function useRunStopAction(subject: Ref<RunStopSubject | null>, options: { onStopped?: () => Promise<void> | void } = {}) {
  const { t } = useLocalization()
  const subjectActions = useWorkspaceHistorySubjectActions()
  const pending = ref(false)
  const failed = ref(false)
  watch(subject, () => { failed.value = false })

  const isOrg = computed(() => subject.value?.kind === 'agent_org')
  const label = computed(() => {
    if (pending.value) return isOrg.value ? t('runSettings.existing.stopping') : t('runSettings.existing.terminating')
    if (isOrg.value) return t('workspace.agentOrg.history.stopLabel')
    return subject.value?.kind === 'team'
      ? t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.terminate_team')
      : t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.terminate_run')
  })
  const error = computed(() => (failed.value
    ? (isOrg.value ? t('runSettings.existing.stopOrgFailed') : t('runSettings.existing.terminateFailed'))
    : null))

  const terminate = async (current: RunStopSubject): Promise<boolean> => {
    if (current.kind === 'agent') return useAgentRunStore().terminateRun(current.runId)
    if (current.kind === 'team') return useAgentTeamRunStore().terminateTeamRun(current.teamRunId)
    const outcome = await subjectActions.execute({ rootSubjectKind: 'agent_org', rootRunId: current.orgRunId, action: 'stop' })
    return outcome.disposition === 'committed'
  }

  const stop = async (): Promise<void> => {
    const current = subject.value
    if (!current || pending.value) return
    pending.value = true
    failed.value = false
    try {
      if (!(await terminate(current))) throw new Error('The run did not stop.')
      await options.onStopped?.()
    } catch (cause) {
      console.warn('Failed to stop the run from its settings:', cause)
      if (subject.value === current) failed.value = true
    } finally {
      pending.value = false
    }
  }

  return { pending, error, label, stop }
}
