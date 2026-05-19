import { useActiveContextStore } from '~/stores/activeContextStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig';
import { useMobileWorkStore } from '~/stores/mobileWorkStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useWorkspaceStore } from '~/stores/workspace';
import type { MobileWorkContext } from '~/types/mobileWork';
import { DEFAULT_AGENT_RUNTIME_KIND, type AgentRuntimeKind } from '~/types/agent/AgentRunConfig';
import { resolveRunnableModelIdentifier } from '~/utils/runLaunchPolicy';

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
  const llmProviderConfigStore = useLLMProviderConfigStore();
  const mobileWorkStore = useMobileWorkStore();
  const workspaceStore = useWorkspaceStore();

  async function resolveModel(runtimeKind: AgentRuntimeKind | string | null | undefined, candidate?: string | null): Promise<string> {
    return resolveRunnableModelIdentifier({
      candidateModels: [candidate],
      getKnownModels: () => llmProviderConfigStore.models,
      ensureModelsLoaded: async () => {
        await llmProviderConfigStore.fetchProvidersWithModels(runtimeKind || DEFAULT_AGENT_RUNTIME_KIND);
      },
    });
  }

  async function loadRuntimeCatalog(runtimeKind: AgentRuntimeKind | string): Promise<string[]> {
    try {
      const rows = await llmProviderConfigStore.fetchProvidersWithModels(runtimeKind || DEFAULT_AGENT_RUNTIME_KIND);
      return rows.flatMap((row) => row.models.map((model) => model.modelIdentifier));
    } catch {
      return [];
    }
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

    agentRunConfigStore.setTemplate(definition);
    const model = await resolveModel(agentRunConfigStore.config?.runtimeKind, agentRunConfigStore.config?.llmModelIdentifier);
    agentRunConfigStore.updateAgentConfig({
      workspaceId: draft.workspaceId,
      llmModelIdentifier: model,
    });
    teamRunConfigStore.clearConfig();

    const temporaryRunId = agentContextsStore.createRunFromTemplate({ selectionMode: 'mobile' });
    activeContextStore.updateRequirement(draft.prompt.trim());
    mobileWorkStore.consumeDraftContextAttachments().forEach((attachment) => {
      activeContextStore.addContextFilePath(attachment);
    });
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
    const definition = teamDefinitionStore.getAgentTeamDefinitionById(draft.teamDefinitionId);
    if (!definition) {
      throw new Error('Choose a team before launching.');
    }

    teamRunConfigStore.setTemplate(definition);
    const runtimeKind = teamRunConfigStore.config?.runtimeKind || DEFAULT_AGENT_RUNTIME_KIND;
    const model = await resolveModel(runtimeKind, teamRunConfigStore.config?.llmModelIdentifier);
    teamRunConfigStore.updateConfig({
      workspaceId: draft.workspaceId,
      llmModelIdentifier: model,
    });
    const catalog = await loadRuntimeCatalog(runtimeKind);
    teamRunConfigStore.setRuntimeModelCatalog(runtimeKind, catalog);
    agentRunConfigStore.clearConfig();

    const temporaryTeamRunId = teamContextsStore.createRunFromTemplate({ selectionMode: 'mobile' });
    activeContextStore.updateRequirement(draft.prompt.trim());
    mobileWorkStore.consumeDraftContextAttachments().forEach((attachment) => {
      activeContextStore.addContextFilePath(attachment);
    });
    await activeContextStore.send();

    const teamRunId = selectionStore.selectedType === 'team' && selectionStore.selectedRunId
      ? selectionStore.selectedRunId
      : temporaryTeamRunId;
    const team = teamContextsStore.getTeamContextById(teamRunId) || teamContextsStore.getTeamContextById(temporaryTeamRunId);
    return {
      context: {
        kind: 'team-run',
        teamRunId,
        teamDefinitionId: definition.id,
        title: definition.name,
        summary: draft.prompt.trim() || 'New team run',
        workspaceRootPath: workspaceRootPath(workspaceStore, draft.workspaceId),
        focusedMemberRouteKey: team?.focusedMemberRouteKey || 'coordinator',
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
