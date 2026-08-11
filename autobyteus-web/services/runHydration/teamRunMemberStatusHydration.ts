import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { TeamMemberRunProjectionPayload } from '~/stores/runHistoryTypes';
import { hydrateActivitiesFromProjection } from './runProjectionActivityHydration';
import { applyMemberOrHistoryStatusSnapshot } from '~/services/runStatus/agentRuntimeStatusState';

export interface TeamMemberLiveSnapshot {
  memberAddress: string | null;
  displayName: string;
  agentRunId: string | null;
  currentStatus: string;
}

export interface TeamMemberStatusSnapshotSet {
  memberStatuses?: TeamMemberLiveSnapshot[];
}

const applyMemberStatuses = (
  members: readonly { executionAddress: { memberAddress: string }; agentContext: any }[],
  snapshots: TeamMemberLiveSnapshot[],
  options: { preserveCurrentStatus?: boolean } = {},
): void => {
  const statusByKey = new Map<string, TeamMemberLiveSnapshot>();
  const statusByRunId = new Map<string, TeamMemberLiveSnapshot>();

  snapshots.forEach((snapshot) => {
    const routeKey = snapshot.memberAddress?.trim() || '';
    if (routeKey) {
      statusByKey.set(routeKey, snapshot);
    }
    const runId = snapshot.agentRunId?.trim() || '';
    if (runId) {
      statusByRunId.set(runId, snapshot);
    }
  });

  members.forEach(({ agentContext: memberContext, executionAddress }) => {
    memberContext.config.isLocked = true;
    const memberAddress = executionAddress.memberAddress;
    const matched =
      statusByKey.get(memberAddress) ||
      statusByRunId.get(memberContext.state.runId);
    if (matched) {
      applyMemberOrHistoryStatusSnapshot(memberContext, matched.currentStatus, {
        preserveCurrentStatus: options.preserveCurrentStatus === true,
      });
    }
  });
};

export const hydrateTeamMemberActivitiesFromProjection = (params: {
  members: readonly {
    executionAddress: { memberAddress: string };
    agentContext: any;
  }[];
  projectionByMemberAddress: Map<string, TeamMemberRunProjectionPayload | null>;
  memberAddresses?: string[];
}): void => {
  const requested = params.memberAddresses ? new Set(params.memberAddresses) : null;
  params.members.forEach(({ executionAddress, agentContext }) => {
    const memberAddress = executionAddress.memberAddress;
    if (requested && !requested.has(memberAddress)) return;
    const projection = params.projectionByMemberAddress.get(memberAddress) || null;
    if (!agentContext || !projection) {
      return;
    }
    hydrateActivitiesFromProjection(agentContext.state.runId, projection.activities || []);
  });
};

export const applyLiveTeamMemberStatusSnapshot = (
  context: AgentTeamContext,
  snapshot: TeamMemberStatusSnapshotSet,
  options: { preserveCurrentStatus?: boolean } = {},
): void => {
  applyMemberStatuses(context.executions.listAgentContextEntries(), snapshot.memberStatuses || [], options);
};
