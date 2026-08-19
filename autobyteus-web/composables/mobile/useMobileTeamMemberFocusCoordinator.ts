import { computed, ref, type Ref } from 'vue';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useMobileWorkStore } from '~/stores/mobileWorkStore';
import type { MobileWorkContext } from '~/types/mobileWork';

export interface MobileTeamMemberFocusRow {
  agentRunId: string;
  memberAddress: string;
  label: string;
  detail: string;
}

const labelForAddress = (address: string): string =>
  address.split('/').filter(Boolean).join(' › ') || address;

export function useMobileTeamMemberFocusCoordinator(contextRef: Ref<MobileWorkContext | null>) {
  const teamContextsStore = useAgentTeamContextsStore();
  const runHistoryStore = useRunHistoryStore();
  const mobileWorkStore = useMobileWorkStore();
  const isUpdating = ref(false);
  const error = ref<string | null>(null);

  const teamContext = computed(() => {
    const context = contextRef.value;
    return context?.kind === 'team-run'
      ? teamContextsStore.getTeamContextById(context.teamRunId) ?? null
      : null;
  });
  const memberRows = computed<MobileTeamMemberFocusRow[]>(() => {
    const team = teamContext.value;
    if (!team) return [];
    return team.view.listNavigationRows().flatMap((row) => {
      if (!row.agentRunId) return [];
      const context = team.view.getAgentContext(row.agentRunId);
      return [{
        agentRunId: row.agentRunId,
        memberAddress: row.address,
        label: labelForAddress(row.address),
        detail: context?.config.agentDefinitionName || row.displayName,
      }];
    });
  });
  const focusedAgentRunId = computed(() => teamContext.value?.view.getFocusedAgentRunId()
    || (contextRef.value?.kind === 'team-run' ? contextRef.value.focusedAgentRunId : ''));
  const focusedMemberAddress = computed(() => teamContext.value?.view.getMemberAddress(focusedAgentRunId.value) ?? '');
  const focusedMemberLabel = computed(() =>
    memberRows.value.find((row) => row.agentRunId === focusedAgentRunId.value)?.label
      || focusedMemberAddress.value
      || 'Choose member');

  async function focusMember(agentRunId: string): Promise<void> {
    const context = contextRef.value;
    const exactAgentRunId = agentRunId.trim();
    error.value = null;
    if (context?.kind !== 'team-run') {
      error.value = 'Open a team run before changing focused member.';
      throw new Error(error.value);
    }
    if (!memberRows.value.some((row) => row.agentRunId === exactAgentRunId)) {
      error.value = 'Choose a focusable team member.';
      throw new Error(error.value);
    }
    isUpdating.value = true;
    try {
      await runHistoryStore.focusTeamMemberAndEnsureHydrated(context.teamRunId, exactAgentRunId);
      const focused = teamContextsStore.getTeamContextById(context.teamRunId)?.view.getFocusedAgentRunId();
      if (!focused || focused !== exactAgentRunId) throw new Error('Focused Team AgentRun is unavailable.');
      mobileWorkStore.updateFocusedTeamMember(context.teamRunId, focused);
      mobileWorkStore.rememberFocusedTeamMember(context.teamRunId, focused);
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Failed to change focused team member.';
      throw cause;
    } finally {
      isUpdating.value = false;
    }
  }

  return {
    error,
    focusedAgentRunId,
    focusedMemberLabel,
    focusedMemberAddress,
    focusMember,
    isUpdating,
    memberRows,
  };
}
