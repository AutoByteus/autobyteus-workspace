import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import type {
  RunHistoryWorkspaceGroup,
  RunResumeConfigPayload,
  TeamRunResumeConfigPayload,
} from '~/stores/runHistoryTypes';
import { flattenWorkspaceTeamRuns } from '~/stores/runHistoryStoreSupport';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentRunStore } from '~/stores/agentRunStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { openAgentRun } from '~/services/runOpen/agentRunOpenCoordinator';
import { openTeamRun } from '~/services/runOpen/teamRunOpenCoordinator';

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

const listActiveTeamRunIds = (workspaceGroups: RunHistoryWorkspaceGroup[]): string[] =>
  flattenWorkspaceTeamRuns(workspaceGroups)
    .filter((teamRun) => teamRun.isActive)
    .map((teamRun) => teamRun.teamRunId);

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
      if (existingContext.state.currentStatus === AgentStatus.ShutdownComplete) {
        existingContext.state.currentStatus = AgentStatus.Uninitialized;
      }

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

  for (const teamRunId of listActiveTeamRunIds(input.workspaceGroups)) {
    const existingTeamContext = teamContextsStore.getTeamContextById(teamRunId);
    if (existingTeamContext) {
      existingTeamContext.config.isLocked = true;
      if (
        existingTeamContext.currentStatus === AgentTeamStatus.Idle
        || existingTeamContext.currentStatus === AgentTeamStatus.ShutdownComplete
      ) {
        existingTeamContext.currentStatus = AgentTeamStatus.Uninitialized;
      }
      existingTeamContext.members.forEach((memberContext) => {
        memberContext.config.isLocked = true;
        if (
          memberContext.state.currentStatus === AgentStatus.Idle
          || memberContext.state.currentStatus === AgentStatus.ShutdownComplete
        ) {
          memberContext.state.currentStatus = AgentStatus.Uninitialized;
        }
      });

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
