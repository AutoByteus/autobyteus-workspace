import { computed, reactive, watch } from 'vue';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useTokenUsageMeterStore } from '~/stores/tokenUsageMeterStore';
import {
  buildTokenUsageTeamMemberIdentities,
  resolveFocusedTeamAgentRunId,
  type TokenUsageTeamMemberIdentity,
} from '~/composables/tokenUsageTeamMemberRows';
import type { TokenUsageRunSummary } from '~/types/tokenUsageMeter';

export interface TokenUsageTeamMemberRow {
  agentRunId: string;
  memberAddress: string;
  displayName: string;
  isFocused: boolean;
  summary: TokenUsageRunSummary | null;
  loading: boolean;
  error: string | null;
}

const fetchErrorMessage = (error: unknown): string => (
  error instanceof Error ? error.message : String(error || 'Unknown token usage loading error')
);

const memberFetchKey = (teamRunId: string, agentRunId: string): string => `${teamRunId}\u0000${agentRunId}`;

export function useTokenUsageWorkspaceScope() {
  const selectionStore = useAgentSelectionStore();
  const activeContextStore = useActiveContextStore();
  const teamContextsStore = useAgentTeamContextsStore();
  const meterStore = useTokenUsageMeterStore();

  const runLoadingById = reactive<Record<string, boolean>>({});
  const runErrorById = reactive<Record<string, string | null>>({});
  const memberLoadingByKey = reactive<Record<string, boolean>>({});
  const memberErrorByKey = reactive<Record<string, string | null>>({});
  const teamTotalLoadingById = reactive<Record<string, boolean>>({});
  const teamTotalErrorById = reactive<Record<string, string | null>>({});

  const isTeamContext = computed(() => selectionStore.selectedType === 'team');
  const activeTeamContext = computed(() => isTeamContext.value ? teamContextsStore.activeTeamContext : null);
  const activeTeamRunId = computed(() => activeTeamContext.value?.view.getRootTeamRunId() ?? null);
  const activeRunId = computed(() => activeContextStore.activeAgentContext?.state.runId ?? null);
  const selectedAgentRunId = computed(() => (
    selectionStore.selectedType === 'agent' ? activeRunId.value : null
  ));

  const focusedAgentRunId = computed(() => resolveFocusedTeamAgentRunId(activeTeamContext.value));

  const teamMemberIdentities = computed<TokenUsageTeamMemberIdentity[]>(() => buildTokenUsageTeamMemberIdentities({
    team: activeTeamContext.value,
    focusedAgentRunId: focusedAgentRunId.value,
  }));

  const teamMemberIdentityKey = computed(() => teamMemberIdentities.value
    .map((identity) => [
      activeTeamRunId.value || '',
      identity.agentRunId,
      identity.isFocused ? 'focused' : '',
    ].join(':'))
    .join('|'));

  const getMemberSummary = (identity: TokenUsageTeamMemberIdentity): TokenUsageRunSummary | null => {
    const teamRunId = activeTeamRunId.value;
    return teamRunId
      ? meterStore.getTeamMemberSummary({ teamRunId, agentRunId: identity.agentRunId })
      : null;
  };

  const teamRows = computed<TokenUsageTeamMemberRow[]>(() => teamMemberIdentities.value.map((identity) => {
    const key = memberFetchKey(activeTeamRunId.value ?? '', identity.agentRunId);
    return {
      ...identity,
      summary: getMemberSummary(identity),
      loading: Boolean(memberLoadingByKey[key]),
      error: memberErrorByKey[key] ?? null,
    };
  }));

  const focusedTeamRow = computed(() => teamRows.value.find((row) => row.isFocused) ?? null);
  const primarySummary = computed<TokenUsageRunSummary | null>(() => {
    if (selectionStore.selectedType === 'agent') {
      return meterStore.getRunSummary(selectedAgentRunId.value);
    }
    if (selectionStore.selectedType === 'team') {
      return focusedTeamRow.value?.summary ?? null;
    }
    return null;
  });

  const primaryLoading = computed(() => {
    if (selectionStore.selectedType === 'agent') {
      const runId = selectedAgentRunId.value;
      return Boolean(runId && runLoadingById[runId] && !primarySummary.value);
    }
    if (selectionStore.selectedType === 'team') {
      const row = focusedTeamRow.value;
      return Boolean(row && row.loading && !row.summary);
    }
    return false;
  });

  const primaryError = computed(() => {
    if (selectionStore.selectedType === 'agent') {
      const runId = selectedAgentRunId.value;
      return runId ? runErrorById[runId] ?? null : null;
    }
    if (selectionStore.selectedType === 'team') {
      return focusedTeamRow.value?.error ?? null;
    }
    return null;
  });

  const primaryUnavailable = computed(() => Boolean(
    selectionStore.selectedType === 'team' &&
    activeTeamRunId.value &&
    !focusedTeamRow.value,
  ));

  const teamTotalSummary = computed<TokenUsageRunSummary | null>(() => (
    isTeamContext.value ? meterStore.getTeamSummary(activeTeamRunId.value) : null
  ));
  const teamTotalLoading = computed(() => Boolean(
    activeTeamRunId.value && teamTotalLoadingById[activeTeamRunId.value],
  ));
  const teamTotalError = computed(() => (
    activeTeamRunId.value ? teamTotalErrorById[activeTeamRunId.value] ?? null : null
  ));

  const hydrateAgentRunSummary = async (runId: string | null | undefined): Promise<void> => {
    const normalizedRunId = runId?.trim() || '';
    if (
      !normalizedRunId ||
      runLoadingById[normalizedRunId] ||
      !meterStore.needsAgentRunSummaryHydration(normalizedRunId)
    ) {
      return;
    }

    runLoadingById[normalizedRunId] = true;
    runErrorById[normalizedRunId] = null;
    try {
      await meterStore.fetchAgentRunSummary(normalizedRunId);
    } catch (error) {
      runErrorById[normalizedRunId] = fetchErrorMessage(error);
    } finally {
      runLoadingById[normalizedRunId] = false;
    }
  };

  const hydrateTeamMemberSummary = async (identity: TokenUsageTeamMemberIdentity): Promise<void> => {
    const teamRunId = activeTeamRunId.value;
    if (!teamRunId) return;
    const key = memberFetchKey(teamRunId, identity.agentRunId);
    if (
      memberLoadingByKey[key] ||
      !meterStore.needsTeamMemberSummaryHydration({ teamRunId, agentRunId: identity.agentRunId })
    ) {
      return;
    }

    memberLoadingByKey[key] = true;
    memberErrorByKey[key] = null;
    let finalError: unknown = null;
    try {
      try {
        await meterStore.fetchTeamMemberSummary({
          teamRunId,
          agentRunId: identity.agentRunId,
        });
      } catch (error) {
        finalError = error;
      }
      if (finalError) {
        memberErrorByKey[key] = fetchErrorMessage(finalError);
      }
    } finally {
      memberLoadingByKey[key] = false;
    }
  };

  const hydrateTeamTotalSummary = async (teamRunId: string | null | undefined): Promise<void> => {
    const normalizedTeamRunId = teamRunId?.trim() || '';
    if (
      !normalizedTeamRunId ||
      teamTotalLoadingById[normalizedTeamRunId] ||
      !meterStore.needsTeamRunSummaryHydration(normalizedTeamRunId)
    ) {
      return;
    }

    teamTotalLoadingById[normalizedTeamRunId] = true;
    teamTotalErrorById[normalizedTeamRunId] = null;
    try {
      await meterStore.fetchTeamRunSummary(normalizedTeamRunId);
    } catch (error) {
      teamTotalErrorById[normalizedTeamRunId] = fetchErrorMessage(error);
    } finally {
      teamTotalLoadingById[normalizedTeamRunId] = false;
    }
  };

  watch(selectedAgentRunId, (runId) => {
    void hydrateAgentRunSummary(runId);
  }, { immediate: true });

  watch(teamMemberIdentityKey, () => {
    for (const identity of teamMemberIdentities.value) {
      void hydrateTeamMemberSummary(identity);
    }
  }, { immediate: true });

  watch(() => {
    const teamRunId = activeTeamRunId.value;
    return [
      teamRunId,
      meterStore.needsTeamRunSummaryHydration(teamRunId),
      meterStore.getTeamRunSummaryHydrationGeneration(teamRunId),
    ] as const;
  }, ([teamRunId, needsHydration]) => {
    if (needsHydration) void hydrateTeamTotalSummary(teamRunId);
  }, { immediate: true });

  return {
    isTeamContext,
    primaryError,
    primaryLoading,
    primarySummary,
    primaryUnavailable,
    teamRows,
    teamTotalError,
    teamTotalLoading,
    teamTotalSummary,
  };
}
