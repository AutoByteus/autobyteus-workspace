import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useRemoteRunsStore } from '~/stores/remoteRunsStore'

/**
 * autobyteus-278: the run another node runs (this node's delegation started it) that an agent run belongs to:
 * its node's name, whether the node answered, its title. Null for a run of this node.
 */
export const useRemoteRun = (agentRunId: MaybeRefOrGetter<string | null | undefined>) => {
  const remoteRuns = useRemoteRunsStore()
  return computed(() => remoteRuns.runOfAgentRun(toValue(agentRunId)))
}
