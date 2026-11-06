import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore';
import type { SelectedAgentOrg } from '~/composables/useRunListDisclosure';

/**
 * The Org run the route opens (`rootSubjectKind=agent_org&orgRunId=…`), with its context's focused member and exact
 * selection; null when the route opens no Org. The route query is the Org's only record of being open (E-30), on the
 * desktop and in `/mobile`'s query alike.
 */
export const useRouteSelectedAgentOrg = () => {
  const route = useRoute() as ReturnType<typeof useRoute> | undefined;
  const agentOrgContextsStore = useAgentOrgContextsStore();
  return computed<SelectedAgentOrg | null>(() => {
    if (route?.query.rootSubjectKind !== 'agent_org') return null;
    const rootRunId = String(route.query.orgRunId || '').trim();
    if (!rootRunId) return null;
    const context = agentOrgContextsStore.contextFor(rootRunId);
    return { rootRunId, focusAddress: context?.selectedAddress ?? null, selection: context?.selection ?? null };
  });
};
