import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { TeamMemberRunProjectionPayload } from '~/stores/runHistoryTypes';
import { hydrateActivitiesFromProjection } from './runProjectionActivityHydration';
import { applyMemberOrHistoryStatusSnapshot } from '~/services/runStatus/agentRuntimeStatusState';
import { normalizeTeamRuntimeStatus } from './runtimeStatusNormalization';

export interface TeamMemberLiveSnapshot {
  memberRouteKey: string | null;
  memberName: string;
  memberRunId: string | null;
  currentStatus: string;
}

export interface TeamLiveStatusSnapshot {
  currentStatus?: string | null;
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
    const routeKey = snapshot.memberRouteKey?.trim() || '';
    if (routeKey) {
      statusByKey.set(routeKey, snapshot);
    }
    const runId = snapshot.memberRunId?.trim() || '';
    if (runId) {
      statusByRunId.set(runId, snapshot);
    }
  });

  members.forEach((memberContext, memberRouteKey) => {
    memberContext.config.isLocked = true;
    const matched =
      statusByKey.get(memberRouteKey) ||
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
  projectionByMemberRouteKey: Map<string, TeamMemberRunProjectionPayload | null>;
  memberRouteKeys?: string[];
}): void => {
  const memberRouteKeys = params.memberRouteKeys ?? Array.from(params.members.keys());
  memberRouteKeys.forEach((memberRouteKey) => {
    const normalizedMemberRouteKey = memberRouteKey.trim();
    const memberContext = params.members.get(normalizedMemberRouteKey) || null;
    const projection = params.projectionByMemberRouteKey.get(normalizedMemberRouteKey) || null;
    if (!memberContext || !projection) {
      return;
    }
    hydrateActivitiesFromProjection(memberContext.state.runId, projection.activities || []);
  });
};

export const applyLiveTeamStatusSnapshot = (
  context: AgentTeamContext,
  snapshot: TeamLiveStatusSnapshot,
  options: { preserveCurrentStatus?: boolean } = {},
): void => {
  if (options.preserveCurrentStatus !== true) {
    context.currentStatus = normalizeTeamRuntimeStatus(snapshot.currentStatus);
  }
  const leafAgentContextsByRouteKey =
    context.leafAgentContextsByRouteKey instanceof Map
      ? context.leafAgentContextsByRouteKey
      : (context as unknown as { members?: unknown }).members instanceof Map
        ? (context as unknown as { members: Map<string, any> }).members
        : new Map<string, any>();
  applyMemberStatuses(leafAgentContextsByRouteKey, snapshot.memberStatuses || [], options);
};
