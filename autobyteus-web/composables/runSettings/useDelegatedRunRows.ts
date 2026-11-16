import { computed, watch, type Ref } from 'vue'
import { useRunStatusStore } from '~/stores/runStatusStore'
import { useRunTreeStore, type RunTreeRef } from '~/stores/runTreeStore'
import { sameRunWorkspaceChoice } from '~/services/workspace/runWorkspaceChoice'
import {
  treeDelegatedLaunchNodes,
  treeDelegatedSaveTargets,
  type DelegatedRowControl,
  type DelegatedSaveTarget,
} from '~/utils/runSettings/delegatedLaunchRows'
import type { RunMemberNode, RunMemberTreeDeps } from '~/utils/runSettings/runMemberTree'
import type { DelegatedTargetKey } from '~/services/runConfigEditing/delegatedLaunchSelectionClient'
import type { ExistingRunConfigDraft } from '~/types/agent/ExistingRunConfigDraft'

/**
 * The delegated runs Settings shows for the open run (REQ-007, SR-007; autobyteus-461 SR-084):
 * - the rows are the run's tree's rows, built on the server, for every kind, live or stopped: each with its launch and
 *   origin as its run has them now (`runLaunch` folded in, CR-461-086); after a save, the tree's next answer;
 * - each delegated run's liveness is its own status, read by run ID (`/ws/run-status`), never its delegator's (F-62);
 * - each row's change is saved by its own run (SR-064).
 */
export const useDelegatedRunRows = (input: Readonly<{
  draft: Readonly<Ref<ExistingRunConfigDraft | null>>
  control: Readonly<Ref<DelegatedRowControl>>
  schemaFor: RunMemberTreeDeps['schemaFor']
}>) => {
  const runStatus = useRunStatusStore()
  const trees = useRunTreeStore()
  const deps = (): RunMemberTreeDeps => ({ schemaFor: input.schemaFor, sameWorkspace: sameRunWorkspaceChoice })

  /** The open run's tree (it is held, so read and kept current, while Settings shows it). */
  const tree = computed<RunTreeRef | null>(() => {
    const current = input.draft.value
    if (!current) return null
    return current.kind === 'team' ? { kind: 'agent_team', runId: current.teamRunId }
      : current.kind === 'agent_org' ? { kind: 'agent_org', runId: current.orgRunId } : { kind: 'agent', runId: current.runId }
  })
  watch(() => tree.value && `${tree.value.kind}:${tree.value.runId}`, (_key, _previous, onCleanup) => {
    if (tree.value) onCleanup(trees.hold(tree.value))
  }, { immediate: true })

  const rows = computed<readonly RunMemberNode[]>(() => tree.value
    ? treeDelegatedLaunchNodes(trees.rowsOf(tree.value), tree.value, deps(), input.control.value) : [])

  /** Where each local delegated row's change is saved: its own run (SR-064). Peer rows keep no editable launch. */
  const saveTargets = computed<ReadonlyMap<DelegatedTargetKey, DelegatedSaveTarget>>(() => tree.value
    ? treeDelegatedSaveTargets(trees.rowsOf(tree.value), tree.value) : new Map())

  return {
    rows,
    saveTargets,
    /** A delegated agent runs: its own run's status, whatever its delegator's is (F-62). */
    isAgentLive: (agentRunId: string): boolean => runStatus.isLive(agentRunId),
  }
}
