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
} from '~/services/runHydration/runtimeStatusNormalization';
import {
  applyActiveRuntimePlaceholder,
  applyMemberOrHistoryStatusSnapshot,
  preserveCanonicalAgentStatus,
} from '~/services/runStatus/agentRuntimeStatusState';
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata';

export interface RecoverActiveRunsFromHistoryInput {
  workspaceGroups: RunHistoryWorkspaceGroup[];
  ensureWorkspaceByRootPath: (rootPath: string) => Promise<string | null>;
  resolveWorkspaceMetadataByRootPath: (rootPath: string) => Promise<WorkspaceMetadata | null>;
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
  const preserveCurrentMemberStatuses =
    existingTeamContext.isSubscribed;
  const statusByKey = new Map(
    teamRun.members
      .map((member) => [member.memberAddress.trim(), member.status] as const)
      .filter(([memberAddress]) => Boolean(memberAddress)),
  );
  const statusByRunId = new Map(
    teamRun.members
      .map((member) => [member.agentRunId.trim(), member.status] as const)
      .filter(([agentRunId]) => Boolean(agentRunId)),
  );

  existingTeamContext.isActive = teamRun.isActive;
  existingTeamContext.agentExecutionsByKey.forEach((memberContext, memberAddress) => {
    memberContext.config.isLocked = true;
    const matchedStatus =
      statusByKey.get(memberAddress) ||
      statusByRunId.get(memberContext.state.runId);
    applyMemberOrHistoryStatusSnapshot(
      memberContext,
      matchedStatus ? normalizeAgentRuntimeStatus(matchedStatus) : preserveCanonicalAgentStatus(memberContext.state.currentStatus),
      {
        preserveCurrentStatus: preserveCurrentMemberStatuses,
      },
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
        resolveWorkspaceMetadataByRootPath: input.resolveWorkspaceMetadataByRootPath,
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
        memberAddress: null,
        resolveWorkspaceMetadataByRootPath: input.resolveWorkspaceMetadataByRootPath,
        ensureWorkspaceByRootPath: input.ensureWorkspaceByRootPath,
        selectRun: false,
      });
      input.setTeamResumeConfig(result.resumeConfig);
    } catch (error) {
      console.warn(`[runRecovery] Failed to recover active team run '${teamRunId}'.`, error);
    }
  }
};
