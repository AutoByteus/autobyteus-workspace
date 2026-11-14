import { useRouter } from 'vue-router'
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useWorkspaceHistorySubjectActions } from '~/composables/useWorkspaceHistorySubjectActions'
import { buildWorkspaceExecutionRoute, openWorkspaceExecutionLink } from '~/services/workspace/workspaceNavigationService'
import type { TaskRootView } from '~/types/project'

/** How long opening an Agent-run view waits for it to list the worker's row. */
const CHILD_VIEW_WAIT_MS = 5000

type TopRun = NonNullable<TaskRootView['topRun']>

/**
 * Opens a Task's worker where its row lives, as clicking that row does (autobyteus-461 SR-080, rule 2): the view of the
 * run at the top of the worker's tree (`topRun`, which lists every delegated run under it at any depth, DS-11), with the
 * worker's row selected there, so the worker opens as its own run. A Team worker opens its coordinator. As base opened
 * its host (the top).
 * - Agent run: its view opens; the task Teams above the row expand and the row is selected (`selectTaskRow`).
 * - Team run: the Team opens on the worker's coordinator, as the Team tree's row does.
 * - Org run: the Org's inspect action for that agent, as the Org tree's row does.
 */
export const useTaskRootNavigation = () => {
  const router = useRouter()
  const collaboration = useAgentRunCollaborationStore()
  const selection = useAgentSelectionStore()
  const orgActions = useWorkspaceHistorySubjectActions()

  const openInAgentRun = async (root: TaskRootView, top: TopRun): Promise<void> => {
    const link = { kind: 'agent' as const, runId: top.runId }
    const intent = selection.beginSelectionIntent()
    const opened = await openWorkspaceExecutionLink(link, intent)
    if (opened.disposition !== 'committed') return
    // Selecting the run moves the Workspace page to its chat, and leaving that page ends every selection intent, this one
    // too (F-59). So once at the chat, the reveal goes on under a new intent while the run is still the one selected.
    await router.push(buildWorkspaceExecutionRoute(link))
    if (selection.selectedType !== 'agent' || selection.selectedRunId !== top.runId) return
    // The worker is its own top (its delegator was deleted): it opens as its own run, with no row to select.
    if (top.runId === root.ingressAgentRunId) return
    const reveal = selection.beginSelectionIntent()
    if (!collaboration.contextFor(top.runId)) void collaboration.inspect(top.runId)
    const listed = () => collaboration.contextFor(top.runId)?.isListed(root.ingressAgentRunId) ?? false
    const deadline = Date.now() + CHILD_VIEW_WAIT_MS
    while (!listed() && Date.now() < deadline && reveal.isCurrent()) await new Promise((resolve) => setTimeout(resolve, 50))
    const context = collaboration.contextFor(top.runId)
    if (!listed() || !context || !reveal.isCurrent()) return
    // Reveal the row as its own tree would: the task Teams above it, and a Team worker's own Team.
    const worker = root.teamRunId ? { teamRunId: root.teamRunId } : { agentRunId: root.ingressAgentRunId }
    for (const teamRunId of [...context.taskTeamPathOf(worker) ?? [], ...(root.teamRunId ? [root.teamRunId] : [])]) {
      if (!collaboration.isTaskTeamExpanded(top.runId, teamRunId)) collaboration.toggleTaskTeam(top.runId, teamRunId)
    }
    const row = collaboration.taskRows(top.runId).map((entry) => entry.row).find((candidate) => root.teamRunId
      ? candidate.teamRunIdForNode === root.teamRunId : candidate.agentRunId === root.ingressAgentRunId)
    if (row) collaboration.selectTaskRow(top.runId, row)
  }

  const openInTeamRun = async (root: TaskRootView, top: TopRun): Promise<void> => {
    const link = { kind: 'team' as const, teamRunId: top.runId, agentRunId: root.ingressAgentRunId }
    const intent = selection.beginSelectionIntent()
    const opened = await openWorkspaceExecutionLink(link, intent)
    if (opened.disposition !== 'committed' || !intent.isCurrent()) return
    await router.push(buildWorkspaceExecutionRoute(link))
  }

  const open = async (root: TaskRootView): Promise<void> => {
    const top = root.topRun
    if (!top) return
    try {
      if (top.kind === 'agent') await openInAgentRun(root, top)
      else if (top.kind === 'agent_team') await openInTeamRun(root, top)
      else await orgActions.execute({ rootSubjectKind: 'agent_org', rootRunId: top.runId, action: 'inspect', agentRunId: root.ingressAgentRunId })
    } catch (error) {
      console.error('Failed to open the Task root:', error)
    }
  }
  return { open }
}
