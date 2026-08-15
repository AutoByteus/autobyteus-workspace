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
  members: readonly { agentRunId: string; memberAddress: string; agentContext: any }[],
  snapshots: TeamMemberLiveSnapshot[],
  options: { preserveCurrentStatus?: boolean } = {},
): void => {
  const statusByRunId = new Map<string, TeamMemberLiveSnapshot>();

  snapshots.forEach((snapshot) => {
    const runId = snapshot.agentRunId?.trim() || '';
    if (runId) {
      statusByRunId.set(runId, snapshot);
    }
  });

  members.forEach(({ agentRunId, memberAddress, agentContext: memberContext }) => {
    memberContext.config.isLocked = true;
    const matched = statusByRunId.get(agentRunId);
    if (matched?.memberAddress && matched.memberAddress !== memberAddress) return;
    if (matched) {
      applyMemberOrHistoryStatusSnapshot(memberContext, matched.currentStatus, {
        preserveCurrentStatus: options.preserveCurrentStatus === true,
      });
    }
  });
};

export const hydrateTeamMemberActivitiesFromProjection = (params: {
  members: readonly {
    memberAddress: string;
    agentContext: any;
  }[];
  projectionByMemberAddress: Map<string, TeamMemberRunProjectionPayload | null>;
  memberAddresses?: string[];
}): void => {
  const requested = params.memberAddresses ? new Set(params.memberAddresses) : null;
  params.members.forEach(({ memberAddress, agentContext }) => {
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
  applyMemberStatuses(context.view.listAgentContextEntries(), snapshot.memberStatuses || [], options);
};
