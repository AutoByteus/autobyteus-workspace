import type { TeamRunResumeConfigPayload } from '~/stores/runHistoryTypes';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { hydrateLiveTeamRunContext } from '~/services/runHydration/teamRunContextHydrationService';
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata';

export type TeamRunOpenSelectionMode = 'desktop' | 'mobile';
export interface OpenTeamRunWithCoordinatorInput {
  teamRunId: string;
  agentRunId?: string | null;
  resolveWorkspaceMetadataByRootPath: (rootPath: string) => Promise<WorkspaceMetadata | null>;
  ensureWorkspaceByRootPath?: (rootPath: string) => Promise<string | null>;
  selectRun?: boolean;
  selectionMode?: TeamRunOpenSelectionMode;
}
export interface OpenTeamRunWithCoordinatorResult {
  teamRunId: string;
  focusedAgentRunId: string;
  focusedMemberAddress: string;
  resumeConfig: TeamRunResumeConfigPayload;
}

export const openTeamRun = async (
  input: OpenTeamRunWithCoordinatorInput,
): Promise<OpenTeamRunWithCoordinatorResult> => {
  const contexts = useAgentTeamContextsStore();
  const current = contexts.getTeamContextById(input.teamRunId);
  const preferredAgentRunId = input.agentRunId?.trim()
    || current?.view.getFocusedAgentRunId()
    || null;
  const runStore = useAgentTeamRunStore();
  const hydrated = await hydrateLiveTeamRunContext({
    ...input,
    agentRunId: preferredAgentRunId,
  });
  const context = hydrated.hydratedContext;
  contexts.addTeamContext(context);

  if (preferredAgentRunId) {
    const result = context.view.focusAgent(preferredAgentRunId);
    if (result.disposition === 'rejected') throw new Error(result.message);
  }
  const focusedAgentRunId = context.view.getFocusedAgentRunId();
  const focusedMemberAddress = context.view.getFocusedMemberAddress();

  if (input.selectRun !== false) {
    const selection = useAgentSelectionStore();
    input.selectionMode === 'mobile'
      ? selection.selectRunWithoutShellNavigation(input.teamRunId, 'team')
      : selection.selectRun(input.teamRunId, 'team');
    useTeamRunConfigStore().selectDraft(null);
    useAgentRunConfigStore().clearConfig();
  }
  if (context.view.isRootTeamActive()) runStore.connectToTeamStream(input.teamRunId);
  else runStore.disconnectTeamStream(input.teamRunId);
  return {
    teamRunId: input.teamRunId,
    focusedAgentRunId,
    focusedMemberAddress,
    resumeConfig: hydrated.resumeConfig,
  };
};
