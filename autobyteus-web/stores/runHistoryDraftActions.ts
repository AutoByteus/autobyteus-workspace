import { useWorkspaceStore } from '~/stores/workspace';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig';
import { DEFAULT_AGENT_RUNTIME_KIND } from '~/types/agent/AgentRunConfig';
import { buildEditableAgentRunSeed } from '~/composables/useDefinitionLaunchDefaults';
import { pickPreferredRunTemplate, resolveRunnableModelIdentifier } from '~/utils/runLaunchPolicy';

interface RunHistoryDraftStoreState {
  selectedRunId: string | null;
  selectedTeamRunId: string | null;
  selectedTeamMemberAddress: string | null;
  ensureWorkspaceByRootPath(rootPath: string): Promise<string | null>;
  resolveWorkspaceMetadataByRootPath(rootPath: string): Promise<any>;
}

export const createDraftRunForHistoryStore = async (
  store: RunHistoryDraftStoreState,
  options: { workspaceRootPath: string; agentDefinitionId: string },
): Promise<void> => {
  const agentDefinitionStore = useAgentDefinitionStore();
  if (agentDefinitionStore.agentDefinitions.length === 0) {
    await agentDefinitionStore.fetchAllAgentDefinitions();
  }
  const definition = agentDefinitionStore.getAgentDefinitionById(options.agentDefinitionId);
  if (!definition) throw new Error(`Agent definition '${options.agentDefinitionId}' was not found.`);

  const workspaceId = await store.ensureWorkspaceByRootPath(options.workspaceRootPath);
  if (!workspaceId) throw new Error(`Workspace '${options.workspaceRootPath}' could not be resolved.`);
  const workspaceMetadata = await store.resolveWorkspaceMetadataByRootPath(options.workspaceRootPath);
  if (!workspaceMetadata) throw new Error(`Workspace '${options.workspaceRootPath}' reference could not be resolved.`);

  const agentRunConfigStore = useAgentRunConfigStore();
  const llmProviderConfigStore = useLLMProviderConfigStore();
  const selectionStore = useAgentSelectionStore();
  const agentContextsStore = useAgentContextsStore();
  const selectedTemplate = selectionStore.selectedType === 'agent' && selectionStore.selectedRunId
    ? agentContextsStore.runs.get(selectionStore.selectedRunId) ?? null : null;
  const selectedSameDefinitionTemplate = selectedTemplate?.config.agentDefinitionId === options.agentDefinitionId
    ? selectedTemplate : null;
  const templateCandidates = Array.from(agentContextsStore.runs.values()).filter(
    (context) => context.config.agentDefinitionId === options.agentDefinitionId,
  );
  const preferredTemplate = selectedSameDefinitionTemplate
    ?? pickPreferredRunTemplate(templateCandidates, workspaceId);
  const bufferedModelCandidate = agentRunConfigStore.config?.agentDefinitionId === options.agentDefinitionId
    ? agentRunConfigStore.config.llmModelIdentifier : '';
  const resolvedModelIdentifier = await resolveRunnableModelIdentifier({
    candidateModels: [preferredTemplate?.config.llmModelIdentifier, bufferedModelCandidate],
    getKnownModels: () => llmProviderConfigStore.models,
    ensureModelsLoaded: async () => {
      await llmProviderConfigStore.fetchProvidersWithModels(
        preferredTemplate?.config.runtimeKind ?? DEFAULT_AGENT_RUNTIME_KIND,
      );
    },
  });
  if (!resolvedModelIdentifier) throw new Error('No model is available to start a new run.');

  useTeamRunConfigStore().clearConfig();
  if (preferredTemplate) {
    const seed = buildEditableAgentRunSeed(preferredTemplate.config);
    const preserveSeedLlmConfig = seed.llmModelIdentifier.trim() === resolvedModelIdentifier.trim();
    agentRunConfigStore.setAgentConfig({
      ...seed,
      agentDefinitionId: definition.id,
      agentDefinitionName: definition.name,
      agentAvatarUrl: definition.avatarUrl ?? seed.agentAvatarUrl ?? null,
      workspaceId,
      workspaceMetadata,
      llmModelIdentifier: resolvedModelIdentifier,
      llmConfig: preserveSeedLlmConfig ? (seed.llmConfig ?? null) : null,
      isLocked: false,
    });
  } else {
    agentRunConfigStore.setTemplate(definition);
    agentRunConfigStore.updateAgentConfig({ workspaceId, workspaceMetadata, llmModelIdentifier: resolvedModelIdentifier });
  }
  selectionStore.clearSelection();
  store.selectedRunId = null;
  store.selectedTeamRunId = null;
  store.selectedTeamMemberAddress = null;
};
