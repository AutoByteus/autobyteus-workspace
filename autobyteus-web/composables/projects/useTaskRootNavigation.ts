import { useRouter } from 'vue-router'
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useWorkspaceHistorySubjectActions } from '~/composables/useWorkspaceHistorySubjectActions'
import { buildWorkspaceExecutionRoute, openWorkspaceExecutionLink } from '~/services/workspace/workspaceNavigationService'
import type { TaskRootView } from '~/types/project'

/** How long opening an Agent-run root waits for the run's collaboration view to list the worker. */
const CHILD_VIEW_WAIT_MS = 5000

/**
 * Opens a Task's root exactly as its left-panel row does (DS-004): the worker's conversation
 * inside the run that hosts it, selected in the left panel. A team opens its coordinator.
 * - Agent run host: the run opens in chat with the worker (or task Team coordinator) selected, the task Team expanded.
 * - Team run host: the team member (the worker, or the task Team's coordinator) opens in the Team view.
 * - Org run host: the existing Org inspect action for that execution.
 */
export const useTaskRootNavigation = () => {
  const router = useRouter()
  const collaboration = useAgentRunCollaborationStore()
  const selection = useAgentSelectionStore()
  const orgActions = useWorkspaceHistorySubjectActions()

  const openInAgentRun = async (root: TaskRootView): Promise<void> => {
    const hostRunId = root.hostRoot.runId
    const link = { kind: 'agent' as const, runId: hostRunId }
    const intent = selection.beginSelectionIntent()
    const opened = await openWorkspaceExecutionLink(link, intent)
    if (opened.disposition !== 'committed' || !intent.isCurrent()) return
    await router.push(buildWorkspaceExecutionRoute(link))
    if (!collaboration.contextFor(hostRunId)) void collaboration.inspect(hostRunId)
    const listed = () => collaboration.contextFor(hostRunId)?.isListed(root.ingressAgentRunId) ?? false
    const deadline = Date.now() + CHILD_VIEW_WAIT_MS
    while (!listed() && Date.now() < deadline && intent.isCurrent()) await new Promise((resolve) => setTimeout(resolve, 50))
    if (!listed() || !intent.isCurrent()) return
    if (root.teamRunId && !collaboration.isTaskTeamExpanded(hostRunId, root.teamRunId)) collaboration.toggleTaskTeam(hostRunId, root.teamRunId)
    collaboration.selectChild(hostRunId, root.ingressAgentRunId)
  }

  const openInTeamRun = async (root: TaskRootView): Promise<void> => {
    const link = { kind: 'team' as const, teamRunId: root.hostRoot.runId, agentRunId: root.ingressAgentRunId }
    const intent = selection.beginSelectionIntent()
    const opened = await openWorkspaceExecutionLink(link, intent)
    if (opened.disposition !== 'committed' || !intent.isCurrent()) return
    await router.push(buildWorkspaceExecutionRoute(link))
  }

  const open = async (root: TaskRootView): Promise<void> => {
    try {
      if (root.hostRoot.kind === 'agent') await openInAgentRun(root)
      else if (root.hostRoot.kind === 'agent_team') await openInTeamRun(root)
      else await orgActions.execute({ rootSubjectKind: 'agent_org', rootRunId: root.hostRoot.runId, action: 'inspect', agentRunId: root.ingressAgentRunId })
    } catch (error) {
      console.error('Failed to open the Task root:', error)
    }
  }
  return { open }
}
