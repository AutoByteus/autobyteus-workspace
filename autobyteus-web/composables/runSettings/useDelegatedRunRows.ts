import { computed, type Ref } from 'vue'
import { watchHeldRuns } from '~/services/runStatus/heldRuns'
import type { RunStatusRunRef } from '@autobyteus/collaboration-stream-contracts'
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { useRemoteRunsStore } from '~/stores/remoteRunsStore'
import { useRunStatusStore } from '~/stores/runStatusStore'
import { collaborationTaskExecutionLists } from '~/services/collaborators/agentSourceSelectors'
import { sameRunWorkspaceChoice } from '~/services/workspace/runWorkspaceChoice'
import {
  agentRunIdsOf,
  collaborationDelegatedLaunchNodes,
  collaborationDelegatedSaveTargets,
  remoteDelegatedLaunchNodes,
  teamDelegatedLaunchNodes,
  teamDelegatedSaveTargets,
  type DelegatedRowControl,
  type DelegatedSaveTarget,
} from '~/utils/runSettings/delegatedLaunchRows'
import type { RunMemberNode, RunMemberTreeDeps } from '~/utils/runSettings/runMemberTree'
import type { DelegatedTargetKey } from '~/services/runConfigEditing/delegatedLaunchSelectionClient'
import type { ExistingRunConfigDraft } from '~/types/agent/ExistingRunConfigDraft'

/**
 * The delegated runs Settings shows for the open run (REQ-007, SR-007), and whether each runs (autobyteus-461 SR-083):
 * - the rows are the run's view's rows, as the server built them, for every kind, live or stopped (CR-461-079): an Agent
 *   run's live view or its stored snapshot, a Team run's view tree, an Org run's view tree; a stored tree has none (E9);
 * - each delegated run's liveness is its own status, read by run ID (`/ws/run-status`), never its delegator's (F-62);
 * - each row's change is saved by its own run (SR-064).
 */
export const useDelegatedRunRows = (input: Readonly<{
  draft: Readonly<Ref<ExistingRunConfigDraft | null>>
  control: Readonly<Ref<DelegatedRowControl>>
  schemaFor: RunMemberTreeDeps['schemaFor']
}>) => {
  const runStatus = useRunStatusStore()
  const deps = (): RunMemberTreeDeps => ({ schemaFor: input.schemaFor, sameWorkspace: sameRunWorkspaceChoice })

  /** The run's view: its rows as the server sent them (the snake-case Team tree, or the camel-case Agent and Org lists). */
  const view = computed(() => {
    const current = input.draft.value
    if (!current) return null
    if (current.kind === 'team') {
      const tree = useAgentTeamContextsStore().getTeamContextById(current.teamRunId)?.view.getExecutionTree() ?? null
      return tree ? { kind: 'team' as const, tree } : null
    }
    if (current.kind === 'agent_org') {
      const org = useAgentOrgContextsStore().contextFor(current.orgRunId)?.executionTree.rootOrg ?? null
      return org ? { kind: 'collaboration' as const, lists: collaborationTaskExecutionLists({ taskExecutions: org.taskExecutions, members: org.members }) } : null
    }
    const agentView = current.isActive ? useAgentRunCollaborationStore().contextFor(current.runId)?.view ?? null : current.delegatedSnapshot
    return agentView ? { kind: 'collaboration' as const, lists: collaborationTaskExecutionLists({ taskExecutions: agentView.execution_tree.taskExecutions, members: [] }) } : null
  })

  const local = computed<readonly RunMemberNode[]>(() => {
    const current = view.value
    if (!current) return []
    return current.kind === 'team' ? teamDelegatedLaunchNodes(current.tree, deps(), input.control.value)
      : collaborationDelegatedLaunchNodes({ taskExecutions: current.lists }, deps(), input.control.value)
  })

  /**
   * autobyteus-32 REQ-009: the copies the run delegated to other nodes, read-only, with the launch each node chose. An
   * Agent root reads its own view (live or the stopped snapshot); a Team or Org root the window's remote-run registry.
   */
  const remote = computed<readonly RunMemberNode[]>(() => {
    const current = input.draft.value
    if (!current) return []
    if (current.kind === 'agent') {
      const agentView = current.isActive ? useAgentRunCollaborationStore().contextFor(current.runId)?.view ?? null : current.delegatedSnapshot
      return remoteDelegatedLaunchNodes((agentView?.remote_task_executions ?? []).map(useRemoteRunsStore().withLaunches), deps())
    }
    return remoteDelegatedLaunchNodes(useRemoteRunsStore().executionsDelegatedBy(agentRunIdsOf(current.executionTree)), deps())
  })

  /** Where each local delegated row's change is saved: its own run (SR-064). Peer rows keep no editable launch. */
  const saveTargets = computed<ReadonlyMap<DelegatedTargetKey, DelegatedSaveTarget>>(() => {
    const current = view.value
    if (!current) return new Map()
    return current.kind === 'team' ? teamDelegatedSaveTargets(current.tree) : collaborationDelegatedSaveTargets(current.lists)
  })

  // Each delegated run's own statuses, while Settings shows it (a team's members ride on their team run).
  watchHeldRuns(() => [...saveTargets.value.values()].flatMap((target): RunStatusRunRef[] => target.kind === 'agent'
    ? [{ kind: 'agent', runId: target.agentRunId }] : target.kind === 'team' ? [{ kind: 'agent_team', runId: target.teamRunId }] : []),
  (refs) => runStatus.hold(refs))

  return {
    rows: computed<readonly RunMemberNode[]>(() => [...local.value, ...remote.value]),
    saveTargets,
    /** A delegated agent runs: its own run's status, whatever its delegator's is (F-62). */
    isAgentLive: (agentRunId: string): boolean => runStatus.isLive(agentRunId),
  }
}
