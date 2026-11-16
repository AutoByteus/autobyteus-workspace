import { useRouter } from 'vue-router'
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore'
import { useRunTreeStore, type RunTreeRef } from '~/stores/runTreeStore'
import type { RunTreeRowDto } from '@autobyteus/collaboration-stream-contracts'
import { isTeamRow } from '~/utils/runTree/runTreeDisplayRows'
import { openRunTarget } from '~/composables/useRunOpening'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useWorkspaceHistorySubjectActions } from '~/composables/useWorkspaceHistorySubjectActions'
import { buildWorkspaceExecutionRoute, openWorkspaceExecutionLink } from '~/services/workspace/workspaceNavigationService'
import type { TaskRootView } from '~/types/project'
import type { WorkspaceExecutionLink } from '~/types/workspace/WorkspaceExecutionLink'

/** How long opening an Agent-run view waits for it to list the worker's row. */
const CHILD_VIEW_WAIT_MS = 5000

type TopRun = NonNullable<TaskRootView['topRun']>
type Target = NonNullable<TaskRootView['openTarget']>

/**
 * Opens a Task's worker where its row lives, as clicking that row does (autobyteus-461 SR-080, rule 2; SR-086 G-F1): the
 * view of the run at the top of the worker's tree (`topRun`, DS-11), with the worker's row selected there, through the one
 * open path (`openRunTarget`) at the target the server built (`openTarget`: a Team worker its coordinator).
 * - Agent run: its view opens; the rows above the worker's row in its tree unfold and the row is opened.
 * - Team run: a member of the Team itself opens focused in it; a run the Team delegated (CR-461-102) opens the Team, then
 *   the worker's row in the Team's tree, as that row does (its own run, rule 2).
 * - Org run: the Org's inspect action for that agent, as the Org tree's row does.
 */
export const useTaskRootNavigation = () => {
  const router = useRouter()
  const collaboration = useAgentRunCollaborationStore()
  const trees = useRunTreeStore()
  const selection = useAgentSelectionStore()
  const orgActions = useWorkspaceHistorySubjectActions()

  const openInAgentRun = async (top: TopRun, target: Target): Promise<void> => {
    const link = { kind: 'agent' as const, runId: top.runId }
    const intent = selection.beginSelectionIntent()
    const opened = await openWorkspaceExecutionLink(link, intent)
    if (opened.disposition !== 'committed') return
    // Selecting the run moves the Workspace page to its chat, and leaving that page ends every selection intent, this one
    // too (F-59). So once at the chat, the reveal goes on under a new intent while the run is still the one selected.
    await router.push(buildWorkspaceExecutionRoute(link))
    if (selection.selectedType !== 'agent' || selection.selectedRunId !== top.runId) return
    // The worker is its own top (its delegator was deleted): it opens as its own run, with no row to select.
    if (target.runKind === 'agent' && target.runId === top.runId) return
    await openWorkerRow({ kind: 'agent', runId: top.runId }, target, (row) => {
      // Reveal the row as its own tree would: every folded row above it unfolds.
      const byKey = new Map(trees.rowsOf({ kind: 'agent', runId: top.runId }).map((candidate) => [candidate.key, candidate]))
      for (let above = byKey.get(row.parentKey ?? ''); above?.parentKey; above = byKey.get(above.parentKey)) {
        if (!collaboration.isTreeRowExpanded(top.runId, above)) collaboration.toggleTreeRow(top.runId, above.key)
      }
      // A Team worker's own row unfolds too: it opens at its coordinator, shown (CR-461-108).
      if (isTeamRow(row) && !collaboration.isTreeRowExpanded(top.runId, row)) collaboration.toggleTreeRow(top.runId, row.key)
    })
  }

  /**
   * The worker's row in the top run's tree (SR-084), the row whose target is the worker's as the server built both, opened
   * through the one open path once the tree lists it; `reveal` unfolds the rows above it first.
   */
  const openWorkerRow = async (ref: RunTreeRef, target: Target, reveal: (row: RunTreeRowDto) => void = () => undefined): Promise<void> => {
    const current = selection.beginSelectionIntent()
    const release = trees.hold(ref)
    try {
      const rowOf = () => trees.rowsOf(ref).find((row) => row.openTarget?.runId === target.runId && row.openTarget.agentRunId === target.agentRunId
        && (target.runKind === 'agent' ? row.kind === 'agent' || row.kind === 'peer_agent' : row.kind === 'team' || row.kind === 'peer_team'))
      const deadline = Date.now() + CHILD_VIEW_WAIT_MS
      while (!rowOf() && Date.now() < deadline && current.isCurrent()) await new Promise((resolve) => setTimeout(resolve, 50))
      const row = rowOf()
      if (!row || !current.isCurrent()) return
      reveal(row)
      openRunTarget(ref, row)
    } finally { release() }
  }

  const openInTeamRun = async (top: TopRun, target: Target): Promise<void> => {
    // A member of the Team itself is focused in it; a run the Team delegated is its own run, opened by its row.
    const member = target.runKind === 'agent_team' && target.runId === top.runId
    const link: WorkspaceExecutionLink = { kind: 'team', teamRunId: top.runId, agentRunId: member ? target.agentRunId : null }
    const intent = selection.beginSelectionIntent()
    const opened = await openWorkspaceExecutionLink(link, intent)
    if (opened.disposition !== 'committed' || !intent.isCurrent()) return
    await router.push(buildWorkspaceExecutionRoute(link))
    if (!member) await openWorkerRow({ kind: 'agent_team', runId: top.runId }, target)
  }

  const open = async (root: TaskRootView): Promise<void> => {
    const top = root.topRun
    const target = root.openTarget
    if (!top || !target) return
    try {
      if (top.kind === 'agent') await openInAgentRun(top, target)
      else if (top.kind === 'agent_team') await openInTeamRun(top, target)
      else await orgActions.execute({ rootSubjectKind: 'agent_org', rootRunId: top.runId, action: 'inspect', agentRunId: target.agentRunId })
    } catch (error) {
      console.error('Failed to open the Task root:', error)
    }
  }
  return { open }
}
