import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useRunTreeStore, type PeerRunOfAgent } from '~/stores/runTreeStore'
import { useRunStatusStore } from '~/stores/runStatusStore'

/** A run another node runs, as an opened agent of it shows it: its tree row's `peer`, and whether its Retry waits. */
export type RemoteRunInfo = PeerRunOfAgent & Readonly<{ checking: boolean }>

/**
 * autobyteus-278: the run another node runs (this node's delegation started it) that an agent run belongs to, from its
 * tree row (autobyteus-461 G-D1): its node's name, whether the node answered, its title, and whether a Retry waits for
 * its node ("Checking {node}…", SR-090). Null for a run of this node.
 */
export const useRemoteRun = (agentRunId: MaybeRefOrGetter<string | null | undefined>) => {
  const trees = useRunTreeStore()
  const runStatus = useRunStatusStore()
  return computed((): RemoteRunInfo | null => {
    const peer = trees.peerRunOf(toValue(agentRunId))
    return peer ? Object.freeze({ ...peer, checking: runStatus.isChecking(peer.runId) }) : null
  })
}
