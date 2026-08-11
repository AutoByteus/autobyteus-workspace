import type { TeamRunResumeConfigPayload } from '~/stores/runHistoryTypes';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import { hydrateLiveTeamRunContext } from '~/services/runHydration/teamRunContextHydrationService';
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata';
import { createTeamExecutionAddress, type TeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';

export type TeamRunOpenSelectionMode = 'desktop' | 'mobile';
export interface OpenTeamRunWithCoordinatorInput {
  teamRunId: string;
  memberAddress?: string | null;
  executionAddress?: TeamExecutionAddress | null;
  resolveWorkspaceMetadataByRootPath: (rootPath: string) => Promise<WorkspaceMetadata | null>;
  ensureWorkspaceByRootPath?: (rootPath: string) => Promise<string | null>;
  selectRun?: boolean;
  selectionMode?: TeamRunOpenSelectionMode;
}
export interface OpenTeamRunWithCoordinatorResult {
  teamRunId: string;
  focusedExecutionAddress: TeamExecutionAddress;
  resumeConfig: TeamRunResumeConfigPayload;
}

const requestedFocus = (input: OpenTeamRunWithCoordinatorInput, existing?: AgentTeamContext): TeamExecutionAddress | null => {
  if (input.executionAddress?.rootTeamRunId === input.teamRunId) return createTeamExecutionAddress(input.executionAddress);
  if (input.memberAddress) return createTeamExecutionAddress({ rootTeamRunId: input.teamRunId, memberAddress: input.memberAddress });
  return existing?.executions.getFocusedAddress() ?? null;
};

export const openTeamRun = async (input: OpenTeamRunWithCoordinatorInput): Promise<OpenTeamRunWithCoordinatorResult> => {
  const contexts = useAgentTeamContextsStore();
  const current = contexts.getTeamContextById(input.teamRunId);
  const preferred = requestedFocus(input, current);
  const runStore = useAgentTeamRunStore();
  const hydrated = await hydrateLiveTeamRunContext({
    ...input,
    memberAddress: preferred?.memberAddress ?? input.memberAddress,
  });
  const context = hydrated.hydratedContext;
  const resumeConfig = hydrated.resumeConfig;
  contexts.addTeamContext(context);

  if (preferred && context.executions.hasExecution(preferred)) context.executions.focus(preferred);
  const focusedExecutionAddress = context.executions.getFocusedAddress();

  if (input.selectRun !== false) {
    const selection = useAgentSelectionStore();
    input.selectionMode === 'mobile'
      ? selection.selectRunWithoutShellNavigation(input.teamRunId, 'team')
      : selection.selectRun(input.teamRunId, 'team');
    useTeamRunConfigStore().selectDraft(null);
    useAgentRunConfigStore().clearConfig();
  }
  if (context.executions.isRootTeamActive()) runStore.connectToTeamStream(input.teamRunId);
  else runStore.disconnectTeamStream(input.teamRunId);
  return { teamRunId: input.teamRunId, focusedExecutionAddress, resumeConfig };
};
