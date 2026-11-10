import { watch, type Ref } from 'vue'
import { useAgentContextsStore } from '~/stores/agentContextsStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import type { AgentContext } from '~/types/agent/AgentContext'

/**
 * Keeps a shell's route equal to the displayed run across a draft's temp → permanent promotion (D-13): the desktop's
 * `/chat?id=` and the phone's `row` (autobyteus-435 DS-006b). Each shell says which run its route displays and how to
 * replace it; the rule is this one.
 *
 * While route id R is displayed, when the standalone selection moves from R to P because
 * `promoteTemporaryId(R, P)` re-keyed that same context, the route is replaced with P.
 * This covers every send path: chat launches, catalog-launched drafts, New run on the phone,
 * and resends after a failed first send.
 */
export function useDraftRunPromotionRouteSync(options: {
  routeRunId: Ref<string | null>
  replaceRouteRunId: (runId: string) => void | Promise<unknown>
}): void {
  const agentContextsStore = useAgentContextsStore()
  const selectionStore = useAgentSelectionStore()
  let displayedContext: AgentContext | null = null

  watch(
    () => {
      const runId = options.routeRunId.value
      return runId ? agentContextsStore.getRun(runId) ?? null : null
    },
    (context) => {
      if (context) displayedContext = context
      else if (!options.routeRunId.value) displayedContext = null
    },
    { immediate: true },
  )

  watch(
    () => (selectionStore.selectedType === 'agent' ? selectionStore.selectedRunId : null),
    (nextRunId, previousRunId) => {
      const routeRunId = options.routeRunId.value
      if (!nextRunId || !previousRunId || nextRunId === previousRunId) return
      if (routeRunId !== previousRunId || !displayedContext) return
      // Only a promotion re-keys the same context object under the new id.
      if (agentContextsStore.getRun(nextRunId) !== displayedContext) return
      void options.replaceRouteRunId(nextRunId)
    },
  )
}
