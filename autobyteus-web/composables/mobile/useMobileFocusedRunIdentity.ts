import { computed, type Ref } from 'vue';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import type { MobileWorkContext } from '~/types/mobileWork';
import { agentRunIdOf } from '~/types/agent/agentRunReadSubject';

export function useMobileFocusedRunIdentity(context: Ref<MobileWorkContext | null>) {
  const activeContextStore = useActiveContextStore();
  const selectionStore = useAgentSelectionStore();
  const teamContextsStore = useAgentTeamContextsStore();

  const isRunContext = computed(() => context.value?.kind === 'agent-run' || context.value?.kind === 'team-run');

  const focusedAgentContext = computed(() => {
    const currentContext = context.value;
    if (currentContext?.kind === 'agent-run') {
      return activeContextStore.activeAgentContext?.state.runId === currentContext.runId
        ? activeContextStore.activeAgentContext
        : null;
    }
    if (currentContext?.kind === 'team-run') {
      return teamContextsStore.getTeamContextById(currentContext.teamRunId)
        ?.view.getAgentContext(currentContext.focusedAgentRunId) ?? null;
    }
    return null;
  });

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
      if (!team || team.view.getFocusedAgentRunId() !== currentContext.focusedAgentRunId) {
        return '';
      }
      return team.view.getAgentContext(currentContext.focusedAgentRunId)?.state.runId || '';
    }

    return '';
  });

  /** The owner subject of the focused run (the active workspace target's), when it is that run's. */
  const focusedReadSubject = computed(() => {
    const subject = activeContextStore.activeWorkspaceTarget?.browse ?? null;
    return subject && focusedRunId.value && agentRunIdOf(subject) === focusedRunId.value ? subject : null;
  });

  return {
    focusedRunId,
    focusedReadSubject,
    focusedAgentContext,
    isRunContext,
  };
}
