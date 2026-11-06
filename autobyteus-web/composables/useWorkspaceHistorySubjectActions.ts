import { useRoute, useRouter } from 'vue-router'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { useAgentSelectionStore, type WorkspaceSelectionIntent, type WorkspaceSelectionOutcome } from '~/stores/agentSelectionStore'
import type { AgentOrgRunHistoryItem } from '~/stores/runHistoryTypes'
import type { WorkspaceHistoryShell } from '~/composables/useWorkspaceHistorySelectionActions'

export type WorkspaceHistorySubjectAction = Readonly<{
  rootSubjectKind: 'agent_org'
  rootRunId: string
  action: 'open' | 'select' | 'inspect' | 'stop'
  memberAddress?: string
  agentRunId?: string
}>

/**
 * The route keys that open an Org run: the one builder of them, for the desktop's `/workspace` and the phone's
 * `/mobile` (autobyteus-277 AR-002). `activeWorkspaceTarget` resolves the Org from them on any path.
 */
export const agentOrgRouteQuery = (
  run: AgentOrgRunHistoryItem,
  command: WorkspaceHistorySubjectAction,
  isActive: boolean,
): Record<string, string> => ({
  rootSubjectKind: 'agent_org', definitionId: run.executionTree.rootOrg.orgDefinitionId, orgRunId: run.rootRunId,
  mode: isActive ? 'active' : 'history',
  ...(command.action !== 'open' && command.memberAddress ? { memberAddress: command.memberAddress } : {}),
  ...(command.action === 'inspect' && command.agentRunId ? { agentRunId: command.agentRunId } : {}),
})

/**
 * Org open, select, inspect and stop from the run lists. On the desktop shell it navigates to the Org; on the phone
 * shell it opens and selects only, and reports the outcome: the phone writes its own route (`useMobileNavigation`).
 */
export const useWorkspaceHistorySubjectActions = (setup: { shell?: WorkspaceHistoryShell } = {}) => {
  const route = useRoute()
  const router = useRouter()
  const historyStore = useRunHistoryStore()
  const orgContexts = useAgentOrgContextsStore()
  const selection = useAgentSelectionStore()

  const execute = async (command: WorkspaceHistorySubjectAction, options: { selectionIntent?: WorkspaceSelectionIntent } = {}): Promise<WorkspaceSelectionOutcome> => {
    const intent = command.action === 'stop' ? undefined : options.selectionIntent ?? selection.beginSelectionIntent()
    if (intent && !intent.isCurrent()) return { disposition: 'superseded' }
    let run = historyStore.agentOrgHistory.find((item) => item.rootRunId === command.rootRunId)
    if (!run) {
      // Exact participant links can be used before the history drawer mounts.
      // Resolve through the same strict read owner, not through live-context inference.
      await historyStore.refreshAgentOrgHistory()
      if (intent && !intent.isCurrent()) return { disposition: 'superseded' }
      if (historyStore.historyFamilyErrors.agentOrg) {
        throw new Error(historyStore.historyFamilyErrors.agentOrg)
      }
      run = historyStore.agentOrgHistory.find((item) => item.rootRunId === command.rootRunId)
    }
    if (!run) throw new Error(`AgentOrg history run '${command.rootRunId}' is unavailable.`)

    if (command.action === 'stop') {
      try { await orgContexts.stopAndInspect(run.rootRunId) }
      finally {
        if (orgContexts.contextFor(run.rootRunId)?.phase === 'historical'
          && route.query.rootSubjectKind === 'agent_org' && String(route.query.orgRunId || '') === run.rootRunId) {
          await router.replace({ path: '/workspace', query: { ...route.query, mode: 'history' } })
        }
      }
      return { disposition: 'committed' }
    }

    try { await orgContexts.openForInspection(run.rootRunId, intent) }
    catch (error) { if (!intent!.isCurrent()) return { disposition: 'superseded' }; throw error }
    if (!intent!.isCurrent()) return { disposition: 'superseded' }
    const context = orgContexts.contextFor(run.rootRunId)
    if (!context) throw new Error(`AgentOrg inspection '${run.rootRunId}' is unavailable.`)
    if (command.action === 'inspect') {
      // A task copy, or an agent of a run another node runs (autobyteus-278).
      const address = command.agentRunId ? context.index.addressOf(command.agentRunId) : null
      if (!command.agentRunId || !address || (command.memberAddress && address !== command.memberAddress)) {
        throw new Error('Exact task Agent execution is unavailable.')
      }
      orgContexts.select(run.rootRunId, { kind: 'agent_execution', agentRunId: command.agentRunId })
    } else if (command.action === 'select') {
      const address = command.memberAddress?.trim()
      if (!address || !context.index.configured.has(address)) throw new Error('AgentOrg member selection requires an exact address.')
      orgContexts.select(run.rootRunId, address)
    }
    if (setup.shell === 'mobile') {
      selection.clearSelectionWithoutShellNavigation()
      return { disposition: 'committed' }
    }
    // Another agent of the Org already shown keeps Settings open, with their unsaved edits; another run, or this Org
    // opened from elsewhere, opens at its chat (autobyteus-366, the same rule as `selectRun`).
    const orgShown = route.query.rootSubjectKind === 'agent_org' && String(route.query.orgRunId || '') === run.rootRunId
    if (orgShown) selection.clearSelectionWithoutShellNavigation()
    else selection.clearSelection()
    await router.push({ path: '/workspace', query: agentOrgRouteQuery(run, command, context.isActive) })
    return { disposition: 'committed' }
  }
  return { execute }
}
