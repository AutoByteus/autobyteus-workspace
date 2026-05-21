import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentTeamDefinitionStore, type AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore';
import { useMobileWorkStore } from '~/stores/mobileWorkStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useWorkspaceStore } from '~/stores/workspace';
import type { MobileWorkContext } from '~/types/mobileWork';

export type MobileRunCreationDraft =
  | {
      kind: 'agent';
      agentDefinitionId: string;
      workspaceId: string;
    }
  | {
      kind: 'team';
      teamDefinitionId: string;
      workspaceId: string;
    };

export interface MobileRunCreationResult {
  context: MobileWorkContext;
}

const workspaceRootPath = (workspaceStore: ReturnType<typeof useWorkspaceStore>, workspaceId: string): string => {
  const workspace = workspaceStore.workspaces[workspaceId];
  return workspace?.absolutePath
    || workspace?.workspaceConfig?.root_path
    || workspace?.workspaceConfig?.rootPath
    || workspaceId;
};

export function useMobileRunLaunchCoordinator() {
  const agentContextsStore = useAgentContextsStore();
  const agentDefinitionStore = useAgentDefinitionStore();
  const agentRunConfigStore = useAgentRunConfigStore();
  const selectionStore = useAgentSelectionStore();
  const teamContextsStore = useAgentTeamContextsStore();
  const teamDefinitionStore = useAgentTeamDefinitionStore();
  const teamRunConfigStore = useTeamRunConfigStore();
  const mobileWorkStore = useMobileWorkStore();
  const workspaceStore = useWorkspaceStore();

  function transferDraftAttachmentsToAgentRun(runId: string): void {
    const run = agentContextsStore.getRun(runId);
    if (!run) {
      return;
    }
    mobileWorkStore.consumeDraftContextAttachments().forEach((attachment) => {
      if (!run.contextFilePaths.some((entry) => entry.locator === attachment.locator)) {
        run.contextFilePaths.push(attachment);
      }
    });
  }

  function assertAgentConfigMatchesDraft(draft: Extract<MobileRunCreationDraft, { kind: 'agent' }>): void {
    const config = agentRunConfigStore.config;
    if (!config) {
      throw new Error('Agent launch configuration is not ready. Re-select the agent and choose a model.');
    }
    if (config.agentDefinitionId !== draft.agentDefinitionId) {
      throw new Error('Agent launch configuration is stale. Re-select the agent before creating the run.');
    }
    if (config.workspaceId !== draft.workspaceId) {
      throw new Error('Agent launch workspace is stale. Re-select the workspace before creating the run.');
    }
    if (!agentRunConfigStore.isConfigured) {
      throw new Error('Choose a model before creating the run.');
    }
  }

  function assertTeamConfigMatchesDraft(draft: Extract<MobileRunCreationDraft, { kind: 'team' }>): void {
    const config = teamRunConfigStore.config;
    if (!config) {
      throw new Error('Team launch configuration is not ready. Re-select the team and choose a model.');
    }
    if (config.teamDefinitionId !== draft.teamDefinitionId) {
      throw new Error('Team launch configuration is stale. Re-select the team before creating the run.');
    }
    if (config.workspaceId !== draft.workspaceId) {
      throw new Error('Team launch workspace is stale. Re-select the workspace before creating the run.');
    }
    const readiness = teamRunConfigStore.launchReadiness;
    if (!readiness.canLaunch) {
      throw new Error(readiness.blockingIssues[0]?.message || 'Team configuration is not launch-ready.');
    }
  }

  function ensureAgentDraftConfig(draft: Extract<MobileRunCreationDraft, { kind: 'agent' }>): void {
    if (!agentRunConfigStore.config) {
      const definition = agentDefinitionStore.getAgentDefinitionById(draft.agentDefinitionId);
      if (!definition) {
        throw new Error('Choose an agent before creating the run.');
      }
      agentRunConfigStore.setTemplate(definition);
      agentRunConfigStore.updateAgentConfig({ workspaceId: draft.workspaceId });
    }
    assertAgentConfigMatchesDraft(draft);
  }

  function ensureTeamDraftConfig(draft: Extract<MobileRunCreationDraft, { kind: 'team' }>): AgentTeamDefinition {
    const definition = teamDefinitionStore.getAgentTeamDefinitionById(draft.teamDefinitionId);
    if (!definition) {
      throw new Error('Choose a team before creating the run.');
    }
    if (!teamRunConfigStore.config) {
      teamRunConfigStore.setTemplate(definition);
      teamRunConfigStore.updateConfig({ workspaceId: draft.workspaceId });
    }
    assertTeamConfigMatchesDraft(draft);
    return definition;
  }

  async function ensureValidLeafTeamFocus(teamRunId: string): Promise<string> {
    const team = teamContextsStore.getTeamContextById(teamRunId);
    if (!team) {
      throw new Error('Created team run is not available.');
    }

    const currentFocus = team.focusedMemberRouteKey?.trim() || '';
    if (currentFocus && team.leafAgentContextsByRouteKey.has(currentFocus)) {
      mobileWorkStore.rememberFocusedTeamMember(teamRunId, currentFocus);
      return currentFocus;
    }

    const fallbackRouteKey = Array.from(team.leafAgentContextsByRouteKey.keys())[0] || '';
    if (!fallbackRouteKey) {
      throw new Error('This team has no focusable member for mobile Chat.');
    }

    await teamContextsStore.focusMemberAndEnsureHydrated(teamRunId, fallbackRouteKey);
    mobileWorkStore.rememberFocusedTeamMember(teamRunId, fallbackRouteKey);
    return teamContextsStore.getTeamContextById(teamRunId)?.focusedMemberRouteKey || fallbackRouteKey;
  }

  async function createAgentRun(draft: Extract<MobileRunCreationDraft, { kind: 'agent' }>): Promise<MobileRunCreationResult> {
    await Promise.all([
      agentDefinitionStore.fetchAllAgentDefinitions(),
      workspaceStore.fetchAllWorkspaces(),
    ]);
    const definition = agentDefinitionStore.getAgentDefinitionById(draft.agentDefinitionId);
    if (!definition) {
      throw new Error('Choose an agent before creating the run.');
    }

    ensureAgentDraftConfig(draft);
    teamRunConfigStore.clearConfig();

    const temporaryRunId = agentContextsStore.createRunFromTemplate({ selectionMode: 'mobile' });
    const runId = selectionStore.selectedType === 'agent' && selectionStore.selectedRunId
      ? selectionStore.selectedRunId
      : temporaryRunId;
    transferDraftAttachmentsToAgentRun(runId);
    agentRunConfigStore.clearConfig();

    const run = agentContextsStore.getRun(runId) || agentContextsStore.getRun(temporaryRunId);
    return {
      context: {
        kind: 'agent-run',
        runId,
        agentDefinitionId: definition.id,
        title: definition.name,
        summary: run?.state.conversation.id || 'New agent run',
        workspaceRootPath: workspaceRootPath(workspaceStore, draft.workspaceId),
        isActive: true,
        lastActivityAt: new Date().toISOString(),
        statusLabel: 'Ready',
      },
    };
  }

  async function createTeamRun(draft: Extract<MobileRunCreationDraft, { kind: 'team' }>): Promise<MobileRunCreationResult> {
    await Promise.all([
      agentDefinitionStore.fetchAllAgentDefinitions(),
      teamDefinitionStore.fetchAllAgentTeamDefinitions(),
      workspaceStore.fetchAllWorkspaces(),
    ]);
    const definition = ensureTeamDraftConfig(draft);
    agentRunConfigStore.clearConfig();

    const temporaryTeamRunId = teamContextsStore.createRunFromTemplate({ selectionMode: 'mobile' });
    const teamRunId = selectionStore.selectedType === 'team' && selectionStore.selectedRunId
      ? selectionStore.selectedRunId
      : temporaryTeamRunId;
    const focusedMemberRouteKey = await ensureValidLeafTeamFocus(teamRunId);
    mobileWorkStore.moveDraftAttachmentsToPendingTeamRun(teamRunId);
    teamRunConfigStore.clearConfig();

    return {
      context: {
        kind: 'team-run',
        teamRunId,
        teamDefinitionId: definition.id,
        title: definition.name,
        summary: 'New team run',
        workspaceRootPath: workspaceRootPath(workspaceStore, draft.workspaceId),
        focusedMemberRouteKey,
        isActive: true,
        lastActivityAt: new Date().toISOString(),
        statusLabel: 'Ready',
      },
    };
  }

  async function createMobileRunFromConfig(draft: MobileRunCreationDraft): Promise<MobileRunCreationResult> {
    if (!draft.workspaceId.trim()) {
      throw new Error('Choose a workspace before creating the run.');
    }
    return draft.kind === 'agent' ? createAgentRun(draft) : createTeamRun(draft);
  }

  return {
    createMobileRunFromConfig,
  };
}
