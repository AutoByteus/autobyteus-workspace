import { useActiveContextStore } from '~/stores/activeContextStore';
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
import {
  buildTeamMemberTreeFromDefinition,
  flattenLeafAgentMemberNodes,
} from '~/utils/teamDefinitionMembers';

export type MobileRunLaunchDraft =
  | {
      kind: 'agent';
      agentDefinitionId: string;
      workspaceId: string;
      prompt: string;
    }
  | {
      kind: 'team';
      teamDefinitionId: string;
      workspaceId: string;
      focusedMemberRouteKey: string;
      prompt: string;
    };

export interface MobileRunLaunchResult {
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
  const activeContextStore = useActiveContextStore();
  const agentContextsStore = useAgentContextsStore();
  const agentDefinitionStore = useAgentDefinitionStore();
  const agentRunConfigStore = useAgentRunConfigStore();
  const selectionStore = useAgentSelectionStore();
  const teamContextsStore = useAgentTeamContextsStore();
  const teamDefinitionStore = useAgentTeamDefinitionStore();
  const teamRunConfigStore = useTeamRunConfigStore();
  const mobileWorkStore = useMobileWorkStore();
  const workspaceStore = useWorkspaceStore();

  function applyDraftAttachmentsToActiveContext(): void {
    mobileWorkStore.consumeDraftContextAttachments().forEach((attachment) => {
      activeContextStore.addContextFilePath(attachment);
    });
  }

  function assertAgentConfigMatchesDraft(draft: Extract<MobileRunLaunchDraft, { kind: 'agent' }>): void {
    const config = agentRunConfigStore.config;
    if (!config) {
      throw new Error('Agent launch configuration is not ready. Re-select the agent and choose a model.');
    }
    if (config.agentDefinitionId !== draft.agentDefinitionId) {
      throw new Error('Agent launch configuration is stale. Re-select the agent before launching.');
    }
    if (config.workspaceId !== draft.workspaceId) {
      throw new Error('Agent launch workspace is stale. Re-select the workspace before launching.');
    }
    if (!agentRunConfigStore.isConfigured) {
      throw new Error('Choose a model before launching.');
    }
  }

  function assertTeamConfigMatchesDraft(draft: Extract<MobileRunLaunchDraft, { kind: 'team' }>): void {
    const config = teamRunConfigStore.config;
    if (!config) {
      throw new Error('Team launch configuration is not ready. Re-select the team and choose a model.');
    }
    if (config.teamDefinitionId !== draft.teamDefinitionId) {
      throw new Error('Team launch configuration is stale. Re-select the team before launching.');
    }
    if (config.workspaceId !== draft.workspaceId) {
      throw new Error('Team launch workspace is stale. Re-select the workspace before launching.');
    }
    const readiness = teamRunConfigStore.launchReadiness;
    if (!readiness.canLaunch) {
      throw new Error(readiness.blockingIssues[0]?.message || 'Team configuration is not launch-ready.');
    }
  }

  function ensureAgentDraftConfig(draft: Extract<MobileRunLaunchDraft, { kind: 'agent' }>): void {
    if (!agentRunConfigStore.config) {
      const definition = agentDefinitionStore.getAgentDefinitionById(draft.agentDefinitionId);
      if (!definition) {
        throw new Error('Choose an agent before launching.');
      }
      agentRunConfigStore.setTemplate(definition);
      agentRunConfigStore.updateAgentConfig({ workspaceId: draft.workspaceId });
    }
    assertAgentConfigMatchesDraft(draft);
  }

  function ensureTeamDraftConfig(draft: Extract<MobileRunLaunchDraft, { kind: 'team' }>): AgentTeamDefinition {
    const definition = teamDefinitionStore.getAgentTeamDefinitionById(draft.teamDefinitionId);
    if (!definition) {
      throw new Error('Choose a team before launching.');
    }
    if (!teamRunConfigStore.config) {
      teamRunConfigStore.setTemplate(definition);
      teamRunConfigStore.updateConfig({ workspaceId: draft.workspaceId });
    }
    assertTeamConfigMatchesDraft(draft);
    return definition;
  }

  function assertLeafFocusTarget(definition: AgentTeamDefinition, memberRouteKey: string): string {
    const normalizedMemberRouteKey = memberRouteKey.trim();
    if (!normalizedMemberRouteKey) {
      throw new Error('Choose a focused team member before launching.');
    }
    const memberTree = buildTeamMemberTreeFromDefinition(definition, {
      getTeamDefinitionById: (teamDefinitionId: string) =>
        teamDefinitionStore.getAgentTeamDefinitionById(teamDefinitionId),
    });
    const leafRouteKeys = new Set(
      flattenLeafAgentMemberNodes(memberTree).map((member) => member.memberRouteKey),
    );
    if (!leafRouteKeys.has(normalizedMemberRouteKey)) {
      throw new Error('Choose a focusable leaf team member before launching.');
    }
    return normalizedMemberRouteKey;
  }

  async function launchAgent(draft: Extract<MobileRunLaunchDraft, { kind: 'agent' }>): Promise<MobileRunLaunchResult> {
    await Promise.all([
      agentDefinitionStore.fetchAllAgentDefinitions(),
      workspaceStore.fetchAllWorkspaces(),
    ]);
    const definition = agentDefinitionStore.getAgentDefinitionById(draft.agentDefinitionId);
    if (!definition) {
      throw new Error('Choose an agent before launching.');
    }

    ensureAgentDraftConfig(draft);
    teamRunConfigStore.clearConfig();

    const temporaryRunId = agentContextsStore.createRunFromTemplate({ selectionMode: 'mobile' });
    activeContextStore.updateRequirement(draft.prompt.trim());
    applyDraftAttachmentsToActiveContext();
    await activeContextStore.send();

    const runId = selectionStore.selectedType === 'agent' && selectionStore.selectedRunId
      ? selectionStore.selectedRunId
      : temporaryRunId;
    const run = agentContextsStore.getRun(runId) || agentContextsStore.getRun(temporaryRunId);
    return {
      context: {
        kind: 'agent-run',
        runId,
        agentDefinitionId: definition.id,
        title: definition.name,
        summary: draft.prompt.trim() || run?.state.conversation.id || 'New agent run',
        workspaceRootPath: workspaceRootPath(workspaceStore, draft.workspaceId),
        isActive: true,
        lastActivityAt: new Date().toISOString(),
        statusLabel: 'Running',
      },
    };
  }

  async function launchTeam(draft: Extract<MobileRunLaunchDraft, { kind: 'team' }>): Promise<MobileRunLaunchResult> {
    await Promise.all([
      agentDefinitionStore.fetchAllAgentDefinitions(),
      teamDefinitionStore.fetchAllAgentTeamDefinitions(),
      workspaceStore.fetchAllWorkspaces(),
    ]);
    const definition = ensureTeamDraftConfig(draft);
    const focusedMemberRouteKey = assertLeafFocusTarget(definition, draft.focusedMemberRouteKey);
    agentRunConfigStore.clearConfig();

    const temporaryTeamRunId = teamContextsStore.createRunFromTemplate({ selectionMode: 'mobile' });
    await teamContextsStore.focusMemberAndEnsureHydrated(temporaryTeamRunId, focusedMemberRouteKey);
    activeContextStore.updateRequirement(draft.prompt.trim());
    applyDraftAttachmentsToActiveContext();
    await activeContextStore.send();

    const teamRunId = selectionStore.selectedType === 'team' && selectionStore.selectedRunId
      ? selectionStore.selectedRunId
      : temporaryTeamRunId;
    const team = teamContextsStore.getTeamContextById(teamRunId) || teamContextsStore.getTeamContextById(temporaryTeamRunId);
    const actualFocusedMemberRouteKey = team?.focusedMemberRouteKey || focusedMemberRouteKey;
    mobileWorkStore.rememberFocusedTeamMember(teamRunId, actualFocusedMemberRouteKey);
    return {
      context: {
        kind: 'team-run',
        teamRunId,
        teamDefinitionId: definition.id,
        title: definition.name,
        summary: draft.prompt.trim() || 'New team run',
        workspaceRootPath: workspaceRootPath(workspaceStore, draft.workspaceId),
        focusedMemberRouteKey: actualFocusedMemberRouteKey,
        isActive: true,
        lastActivityAt: new Date().toISOString(),
        statusLabel: 'Running',
      },
    };
  }

  async function launchMobileRun(draft: MobileRunLaunchDraft): Promise<MobileRunLaunchResult> {
    if (!draft.prompt.trim()) {
      throw new Error('Enter the first message before launching.');
    }
    if (!draft.workspaceId.trim()) {
      throw new Error('Choose a workspace before launching.');
    }
    return draft.kind === 'agent' ? launchAgent(draft) : launchTeam(draft);
  }

  return {
    launchMobileRun,
  };
}
