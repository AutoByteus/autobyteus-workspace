import { computed, reactive, watch } from 'vue';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useTokenUsageMeterStore } from '~/stores/tokenUsageMeterStore';
import type { TokenUsageTeamMemberIdentity } from '~/composables/tokenUsageTeamMemberRows';
import type { TokenUsageRunSummary } from '~/types/tokenUsageMeter';
import type { ActiveAgentWorkspaceTarget } from '~/types/workspace/activeAgentWorkspaceTarget';

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
const memberKey = (scope: string, agentRunId: string): string => `${scope}\u0000${agentRunId}`;
const label = (address: string): string =>
  address.split('/').filter(Boolean).at(-1)?.replace(/[_-]+/g, ' ') || address;
const hasTeam = (target: ActiveAgentWorkspaceTarget | null): target is Extract<
  ActiveAgentWorkspaceTarget,
  { kind: 'standalone_team_member' | 'agent_org_team_member' }
> => target?.kind === 'standalone_team_member' || target?.kind === 'agent_org_team_member';
const isOrg = (target: ActiveAgentWorkspaceTarget | null): target is Extract<
  ActiveAgentWorkspaceTarget,
  { kind: 'agent_org_direct_agent' | 'agent_org_team_member' }
> => target?.kind === 'agent_org_direct_agent' || target?.kind === 'agent_org_team_member';

export function useTokenUsageWorkspaceScope() {
  const active = useActiveContextStore();
  const meter = useTokenUsageMeterStore();
  const loadingByKey = reactive<Record<string, boolean>>({});
  const errorByKey = reactive<Record<string, string | null>>({});
  const teamTotalLoadingById = reactive<Record<string, boolean>>({});
  const teamTotalErrorById = reactive<Record<string, string | null>>({});

  const target = computed(() => active.activeWorkspaceTarget);
  const isTeamContext = computed(() => hasTeam(target.value));
  const isStandaloneTeam = computed(() => target.value?.kind === 'standalone_team_member');
  const activeTeamRunId = computed(() => isStandaloneTeam.value && hasTeam(target.value)
    ? target.value.team.rootRunId
    : null);
  const focusedAgentRunId = computed(() => target.value?.context.state.runId ?? null);
  const scopeKey = computed(() => {
    const current = target.value;
    if (!current) return '';
    if (isOrg(current)) return `org:${current.root.orgRunId}`;
    if (current.kind === 'standalone_team_member') return `team:${current.team.rootRunId}`;
    return 'agent';
  });

  const teamMemberIdentities = computed<TokenUsageTeamMemberIdentity[]>(() => {
    const current = target.value;
    if (!hasTeam(current)) return [];
    return current.team.listMembers().map((member) => ({
      agentRunId: member.agentRunId,
      memberAddress: member.address,
      displayName: member.context.config.agentDefinitionName || label(member.address),
      isFocused: member.agentRunId === current.context.state.runId,
    }));
  });
  const teamIdentityKey = computed(() => teamMemberIdentities.value
    .map((identity) => `${scopeKey.value}:${identity.agentRunId}:${identity.isFocused ? 'focused' : ''}`)
    .join('|'));
  const summaryFor = (identity: TokenUsageTeamMemberIdentity): TokenUsageRunSummary | null => {
    const current = target.value;
    if (current?.kind === 'standalone_team_member') {
      return meter.getTeamMemberSummary({
        teamRunId: current.team.rootRunId,
        agentRunId: identity.agentRunId,
      });
    }
    return meter.getRunSummary(identity.agentRunId);
  };
  const teamRows = computed<TokenUsageTeamMemberRow[]>(() => teamMemberIdentities.value.map((identity) => {
    const key = memberKey(scopeKey.value, identity.agentRunId);
    return {
      ...identity,
      summary: summaryFor(identity),
      loading: Boolean(loadingByKey[key]),
      error: errorByKey[key] ?? null,
    };
  }));
  const focusedTeamRow = computed(() => teamRows.value.find((row) => row.isFocused) ?? null);
  const primarySummary = computed<TokenUsageRunSummary | null>(() => {
    const current = target.value;
    if (!current) return null;
    return hasTeam(current) ? focusedTeamRow.value?.summary ?? null : meter.getRunSummary(current.context.state.runId);
  });
  const primaryKey = computed(() => focusedAgentRunId.value
    ? memberKey(scopeKey.value, focusedAgentRunId.value)
    : '');
  const primaryLoading = computed(() => Boolean(primaryKey.value
    && loadingByKey[primaryKey.value]
    && !primarySummary.value));
  const primaryError = computed(() => primaryKey.value ? errorByKey[primaryKey.value] ?? null : null);
  const primaryUnavailable = computed(() => Boolean(isTeamContext.value && !focusedTeamRow.value));

  const hydrateIdentity = async (identity: TokenUsageTeamMemberIdentity): Promise<void> => {
    const current = target.value;
    if (!current) return;
    const key = memberKey(scopeKey.value, identity.agentRunId);
    if (loadingByKey[key]) return;
    const summary = summaryFor(identity);
    if (summary) return;
    loadingByKey[key] = true;
    errorByKey[key] = null;
    try {
      if (current.kind === 'standalone_team_member') {
        await meter.fetchTeamMemberSummary({
          teamRunId: current.team.rootRunId,
          agentRunId: identity.agentRunId,
        });
      } else if (isOrg(current)) {
        await meter.fetchAgentOrgMemberSummary({
          orgRunId: current.root.orgRunId,
          memberAddress: identity.memberAddress,
          agentRunId: identity.agentRunId,
        });
      } else {
        await meter.fetchAgentRunSummary(identity.agentRunId);
      }
    } catch (error) {
      errorByKey[key] = fetchErrorMessage(error);
    } finally {
      loadingByKey[key] = false;
    }
  };

  const directIdentity = computed<TokenUsageTeamMemberIdentity | null>(() => {
    const current = target.value;
    if (!current || hasTeam(current)) return null;
    return {
      agentRunId: current.context.state.runId,
      memberAddress: current.kind === 'agent_org_direct_agent' ? current.address : '/',
      displayName: current.context.config.agentDefinitionName,
      isFocused: true,
    };
  });
  watch([directIdentity, scopeKey], ([identity]) => { if (identity) void hydrateIdentity(identity); }, { immediate: true });
  watch(teamIdentityKey, () => {
    for (const identity of teamMemberIdentities.value) void hydrateIdentity(identity);
  }, { immediate: true });

  const teamTotalSummary = computed<TokenUsageRunSummary | null>(() => (
    activeTeamRunId.value ? meter.getTeamSummary(activeTeamRunId.value) : null
  ));
  const teamTotalLoading = computed(() => Boolean(
    activeTeamRunId.value && teamTotalLoadingById[activeTeamRunId.value],
  ));
  const teamTotalError = computed(() => activeTeamRunId.value
    ? teamTotalErrorById[activeTeamRunId.value] ?? null
    : null);
  watch(() => {
    const teamRunId = activeTeamRunId.value;
    return [
      teamRunId,
      meter.needsTeamRunSummaryHydration(teamRunId),
      meter.getTeamRunSummaryHydrationGeneration(teamRunId),
    ] as const;
  }, async ([teamRunId, needsHydration]) => {
    if (!teamRunId || !needsHydration || teamTotalLoadingById[teamRunId]) return;
    teamTotalLoadingById[teamRunId] = true;
    teamTotalErrorById[teamRunId] = null;
    try {
      await meter.fetchTeamRunSummary(teamRunId);
    } catch (error) {
      teamTotalErrorById[teamRunId] = fetchErrorMessage(error);
    } finally {
      teamTotalLoadingById[teamRunId] = false;
    }
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
