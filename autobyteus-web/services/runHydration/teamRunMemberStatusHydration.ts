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
  members: Map<string, any>,
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

  members.forEach((memberContext, executionKey) => {
    memberContext.config.isLocked = true;
    let memberAddress = '';
    try {
      memberAddress = JSON.parse(executionKey).memberAddress || '';
    } catch {
      return;
    }
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
  members: Map<string, any>;
  projectionByMemberAddress: Map<string, TeamMemberRunProjectionPayload | null>;
  memberAddresses?: string[];
}): void => {
  const requested = params.memberAddresses ? new Set(params.memberAddresses) : null;
  params.members.forEach((memberContext, executionKey) => {
    let normalizedMemberAddress = '';
    try { normalizedMemberAddress = JSON.parse(executionKey).memberAddress || ''; } catch { return; }
    if (requested && !requested.has(normalizedMemberAddress)) return;
    const projection = params.projectionByMemberAddress.get(normalizedMemberAddress) || null;
    if (!memberContext || !projection) {
      return;
    }
    hydrateActivitiesFromProjection(memberContext.state.runId, projection.activities || []);
  });
};

export const applyLiveTeamMemberStatusSnapshot = (
  context: AgentTeamContext,
  snapshot: TeamMemberStatusSnapshotSet,
  options: { preserveCurrentStatus?: boolean } = {},
): void => {
  applyMemberStatuses(context.agentExecutionsByKey, snapshot.memberStatuses || [], options);
};
