import { computed, type Ref } from 'vue';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import type { MobileWorkContext } from '~/types/mobileWork';
import { sameTeamExecutionAddress, serializeTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';

export function useMobileFocusedRunIdentity(context: Ref<MobileWorkContext | null>) {
  const activeContextStore = useActiveContextStore();
  const selectionStore = useAgentSelectionStore();
  const teamContextsStore = useAgentTeamContextsStore();

  const isRunContext = computed(() => context.value?.kind === 'agent-run' || context.value?.kind === 'team-run');

  const focusedRunId = computed(() => {
    const currentContext = context.value;

    if (currentContext?.kind === 'agent-run') {
      if (selectionStore.selectedType !== 'agent' || selectionStore.selectedRunId !== currentContext.runId) {
        return '';
      }
      return activeContextStore.activeAgentContext?.state.runId === currentContext.runId
        ? currentContext.runId
        : '';
    }

    if (currentContext?.kind === 'team-run') {
      if (selectionStore.selectedType !== 'team' || selectionStore.selectedRunId !== currentContext.teamRunId) {
        return '';
      }

      const team = teamContextsStore.getTeamContextById(currentContext.teamRunId);
      if (!team || !sameTeamExecutionAddress(team.focusedExecutionAddress, currentContext.focusedExecutionAddress)) {
        return '';
      }

      return team.agentExecutionsByKey.get(serializeTeamExecutionAddress(currentContext.focusedExecutionAddress))?.state.runId || '';
    }

    return '';
  });

  return {
    focusedRunId,
    isRunContext,
  };
}
