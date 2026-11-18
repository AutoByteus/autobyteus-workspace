import { computed, watch } from 'vue';
import type { useMobileNavigation } from '~/composables/mobile/useMobileNavigation';
import { useDraftRunPromotionRouteSync } from '~/composables/useDraftRunPromotionRouteSync';
import { agentRunIdOfRowKey, agentRunRowKey } from '~/utils/runListProjection';

/**
 * The phone route follows a New run draft to the node's run (autobyteus-435 DS-006b). Create run names the draft's
 * `temp-*` row; its first send promotes the draft to the node's run ID. The promotion is detected with the desktop
 * chat's rule (`useDraftRunPromotionRouteSync`, D-13), and the current entry's `row` is replaced with the node's run.
 * The page keeps each promotion (draft → node run): Back to an entry pushed before the send (the run screen under a view,
 * the list entry) still names the draft, and is replaced in turn when it becomes current, so the entry that is current
 * at a reload, or when Android saves the page, always names the node's run. Before the first send there is nothing on
 * the node: a reload shows the list (DEC-016). Mounted once by the paired shell; the route's only writer stays
 * `useMobileNavigation`.
 */
export function useMobileRouteRunSync(navigation: ReturnType<typeof useMobileNavigation>): void {
  /** This page's promotions: a draft's run ID → the node's run ID. */
  const promoted = new Map<string, string>();
  /** The route's displayed agent run: only a top-level agent row (a draft is never a Team, Org or delegated row). */
  const routeRunId = computed(() => agentRunIdOfRowKey(navigation.openRowKey.value));

  useDraftRunPromotionRouteSync({
    routeRunId,
    replaceRouteRunId: (runId) => {
      const draftRunId = routeRunId.value;
      if (draftRunId) promoted.set(draftRunId, runId);
      return navigation.replaceRowKey(agentRunRowKey(runId));
    },
  });

  watch(routeRunId, (runId) => {
    const nodeRunId = runId ? promoted.get(runId) : undefined;
    if (nodeRunId) void navigation.replaceRowKey(agentRunRowKey(nodeRunId));
  });
}
