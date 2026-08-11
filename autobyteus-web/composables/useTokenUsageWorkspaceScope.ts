import { computed, reactive, watch } from 'vue';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useTokenUsageMeterStore } from '~/stores/tokenUsageMeterStore';
import {
  buildTokenUsageTeamMemberIdentities,
  resolveFocusedTeamExecutionAddress,
  type TokenUsageTeamMemberIdentity,
} from '~/composables/tokenUsageTeamMemberRows';
import type { TokenUsageRunSummary } from '~/types/tokenUsageMeter';
import {
  serializeTeamExecutionAddress,
  type TeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress';

export interface TokenUsageTeamMemberRow {
  executionAddress: TeamExecutionAddress;
  displayName: string;
  isFocused: boolean;
  summary: TokenUsageRunSummary | null;
  loading: boolean;
  error: string | null;
}

const fetchErrorMessage = (error: unknown): string => (
  error instanceof Error ? error.message : String(error || 'Unknown token usage loading error')
);

const memberFetchKey = (executionAddress: TeamExecutionAddress): string => serializeTeamExecutionAddress(executionAddress);

export function useTokenUsageWorkspaceScope() {
  const selectionStore = useAgentSelectionStore();
  const activeContextStore = useActiveContextStore();
  const teamContextsStore = useAgentTeamContextsStore();
  const meterStore = useTokenUsageMeterStore();

  const runLoadingById = reactive<Record<string, boolean>>({});
  const runErrorById = reactive<Record<string, string | null>>({});
  const memberLoadingByKey = reactive<Record<string, boolean>>({});
  const memberErrorByKey = reactive<Record<string, string | null>>({});
  const memberSummaryByKey = reactive<Record<string, TokenUsageRunSummary | null>>({});
  const teamTotalLoadingById = reactive<Record<string, boolean>>({});
  const teamTotalErrorById = reactive<Record<string, string | null>>({});

  const isTeamContext = computed(() => selectionStore.selectedType === 'team');
  const activeTeamContext = computed(() => isTeamContext.value ? teamContextsStore.activeTeamContext : null);
  const activeTeamRunId = computed(() => activeTeamContext.value?.executions.getRootTeamRunId() ?? null);
  const activeRunId = computed(() => activeContextStore.activeAgentContext?.state.runId ?? null);
  const selectedAgentRunId = computed(() => (
    selectionStore.selectedType === 'agent' ? activeRunId.value : null
  ));

  const focusedExecutionAddress = computed(() => resolveFocusedTeamExecutionAddress(activeTeamContext.value));

  const teamMemberIdentities = computed<TokenUsageTeamMemberIdentity[]>(() => buildTokenUsageTeamMemberIdentities({
    team: activeTeamContext.value,
    focusedExecutionAddress: focusedExecutionAddress.value,
  }));

  const teamMemberIdentityKey = computed(() => teamMemberIdentities.value
    .map((identity) => [
      activeTeamRunId.value || '',
      serializeTeamExecutionAddress(identity.executionAddress),
      identity.isFocused ? 'focused' : '',
    ].join(':'))
    .join('|'));

  const getMemberSummary = (identity: TokenUsageTeamMemberIdentity): TokenUsageRunSummary | null => {
    return meterStore.getTeamExecutionSummary(identity.executionAddress)
      ?? memberSummaryByKey[memberFetchKey(identity.executionAddress)]
      ?? null;
  };

  const teamRows = computed<TokenUsageTeamMemberRow[]>(() => teamMemberIdentities.value.map((identity) => {
    const key = memberFetchKey(identity.executionAddress);
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
    if (!normalizedRunId || runLoadingById[normalizedRunId] || meterStore.getRunSummary(normalizedRunId)) {
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
    const key = memberFetchKey(identity.executionAddress);
    if (memberLoadingByKey[key] || getMemberSummary(identity)) {
      return;
    }

    memberLoadingByKey[key] = true;
    memberErrorByKey[key] = null;
    let finalError: unknown = null;
    try {
      let summary: TokenUsageRunSummary | null = null;
      if (teamRunId) {
        try {
          summary = await meterStore.fetchTeamMemberSummary({
            teamRunId,
            executionAddress: identity.executionAddress,
          });
        } catch (error) {
          finalError = error;
        }
      }
      if (summary) {
        memberSummaryByKey[key] = summary;
      } else if (finalError) {
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

  watch(activeTeamRunId, (teamRunId) => {
    void hydrateTeamTotalSummary(teamRunId);
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
