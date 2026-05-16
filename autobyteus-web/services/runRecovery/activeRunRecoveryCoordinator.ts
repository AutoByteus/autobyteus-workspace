import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type {
  RunHistoryWorkspaceGroup,
  RunResumeConfigPayload,
  TeamRunHistoryItem,
  TeamRunResumeConfigPayload,
} from '~/stores/runHistoryTypes';
import { flattenWorkspaceTeamRuns } from '~/stores/runHistoryStoreSupport';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentRunStore } from '~/stores/agentRunStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { openAgentRun } from '~/services/runOpen/agentRunOpenCoordinator';
import { openTeamRun } from '~/services/runOpen/teamRunOpenCoordinator';
import {
  normalizeAgentRuntimeStatus,
  normalizeTeamRuntimeStatus,
} from '~/services/runHydration/runtimeStatusNormalization';
import {
  applyActiveRuntimePlaceholder,
  applyMemberOrHistoryStatusSnapshot,
} from '~/services/runStatus/agentRuntimeStatusState';

const preserveCanonicalMemberStatus = (status: unknown): AgentStatus => {
  if (
    status === AgentStatus.Running ||
    status === AgentStatus.Idle ||
    status === AgentStatus.Error ||
    status === AgentStatus.Offline
  ) {
    return status;
  }
  return AgentStatus.Offline;
};

export interface RecoverActiveRunsFromHistoryInput {
  workspaceGroups: RunHistoryWorkspaceGroup[];
  ensureWorkspaceByRootPath: (rootPath: string) => Promise<string | null>;
  findAgentNameByRunId: (runId: string) => string | null;
  setRunResumeConfig: (resumeConfig: RunResumeConfigPayload) => void;
  setTeamResumeConfig: (resumeConfig: TeamRunResumeConfigPayload) => void;
}

const listActiveRunIds = (workspaceGroups: RunHistoryWorkspaceGroup[]): string[] =>
  workspaceGroups.flatMap((workspaceGroup) =>
    workspaceGroup.agentDefinitions.flatMap((agentGroup) =>
      agentGroup.runs
        .filter((run) => run.isActive)
        .map((run) => run.runId),
    ),
  );

const listActiveTeamRuns = (workspaceGroups: RunHistoryWorkspaceGroup[]): TeamRunHistoryItem[] =>
  flattenWorkspaceTeamRuns(workspaceGroups).filter((teamRun) => teamRun.isActive);

const applyTeamHistoryStatusToExistingContext = (
  existingTeamContext: AgentTeamContext,
  teamRun: TeamRunHistoryItem,
): void => {
  const statusByKey = new Map(
    teamRun.members
      .map((member) => [member.memberRouteKey.trim(), member.status] as const)
      .filter(([memberRouteKey]) => Boolean(memberRouteKey)),
  );
  const statusByRunId = new Map(
    teamRun.members
      .map((member) => [member.memberRunId.trim(), member.status] as const)
      .filter(([memberRunId]) => Boolean(memberRunId)),
  );

  existingTeamContext.currentStatus = normalizeTeamRuntimeStatus(teamRun.status);
  existingTeamContext.leafAgentContextsByRouteKey.forEach((memberContext, memberRouteKey) => {
    memberContext.config.isLocked = true;
    const matchedStatus =
      statusByKey.get(memberRouteKey) ||
      statusByRunId.get(memberContext.state.runId);
    applyMemberOrHistoryStatusSnapshot(
      memberContext,
      matchedStatus ? normalizeAgentRuntimeStatus(matchedStatus) : preserveCanonicalMemberStatus(memberContext.state.currentStatus),
      { preserveLiveInterrupt: existingTeamContext.isSubscribed },
    );
  });
};

export const recoverActiveRunsFromHistory = async (
  input: RecoverActiveRunsFromHistoryInput,
): Promise<void> => {
  const agentContextsStore = useAgentContextsStore();
  const agentRunStore = useAgentRunStore();
  const teamContextsStore = useAgentTeamContextsStore();
  const agentTeamRunStore = useAgentTeamRunStore();

  for (const runId of listActiveRunIds(input.workspaceGroups)) {
    const existingContext = agentContextsStore.getRun(runId);
    if (existingContext) {
      existingContext.config.isLocked = true;
      applyActiveRuntimePlaceholder(existingContext, { preserveExistingLive: true });

      if (!existingContext.isSubscribed) {
        agentRunStore.connectToAgentStream(runId);
      }
      continue;
    }

    try {
      const result = await openAgentRun({
        runId,
        fallbackAgentName: input.findAgentNameByRunId(runId),
        ensureWorkspaceByRootPath: input.ensureWorkspaceByRootPath,
        selectRun: false,
      });
      input.setRunResumeConfig(result.resumeConfig);
    } catch (error) {
      console.warn(`[runRecovery] Failed to recover active run '${runId}'.`, error);
    }
  }

  for (const teamRun of listActiveTeamRuns(input.workspaceGroups)) {
    const teamRunId = teamRun.teamRunId;
    const existingTeamContext = teamContextsStore.getTeamContextById(teamRunId);
    if (existingTeamContext) {
      existingTeamContext.config.isLocked = true;
      applyTeamHistoryStatusToExistingContext(existingTeamContext, teamRun);

      if (!existingTeamContext.isSubscribed) {
        agentTeamRunStore.connectToTeamStream(teamRunId);
      }
      continue;
    }

    try {
      const result = await openTeamRun({
        teamRunId,
        memberRouteKey: null,
        ensureWorkspaceByRootPath: input.ensureWorkspaceByRootPath,
        selectRun: false,
      });
      input.setTeamResumeConfig(result.resumeConfig);
    } catch (error) {
      console.warn(`[runRecovery] Failed to recover active team run '${teamRunId}'.`, error);
    }
  }
};
