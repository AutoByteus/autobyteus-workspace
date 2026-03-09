import { computed, ref, watch } from 'vue';
import type { GroupedOption } from '~/components/agentTeams/SearchableGroupedSelect.vue';
import { useMessagingChannelBindingSetupStore } from '~/stores/messagingChannelBindingSetupStore';
import {
  buildPeerCandidateKey,
  useMessagingChannelBindingOptionsStore,
} from '~/stores/messagingChannelBindingOptionsStore';
import { useMessagingProviderScopeStore } from '~/stores/messagingProviderScopeStore';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';
import { useBindingDraftState } from '~/composables/messaging-binding-flow/draft-state';
import { useBindingFlowPolicyState } from '~/composables/messaging-binding-flow/policy-state';
import { createBindingFlowActions } from '~/composables/messaging-binding-flow/orchestration-actions';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useWorkspaceStore } from '~/stores/workspace';
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig';
import { useRuntimeCapabilitiesStore } from '~/stores/runtimeCapabilitiesStore';
import {
  DEFAULT_AGENT_RUNTIME_KIND,
  runtimeKindToLabel,
  type AgentRuntimeKind,
  type SkillAccessMode,
} from '~/types/agent/AgentRunConfig';
import type { ExternalChannelBindingModel } from '~/types/messaging';

type WorkspaceSelectionMode = 'existing' | 'path';

export function useMessagingChannelBindingSetupFlow() {
  const bindingStore = useMessagingChannelBindingSetupStore();
  const optionsStore = useMessagingChannelBindingOptionsStore();
  const providerScopeStore = useMessagingProviderScopeStore();
  const gatewayStore = useGatewaySessionSetupStore();
  const agentDefinitionStore = useAgentDefinitionStore();
  const workspaceStore = useWorkspaceStore();
  const llmStore = useLLMProviderConfigStore();
  const runtimeCapabilitiesStore = useRuntimeCapabilitiesStore();

  const useManualPeerInput = ref(false);
  const selectedPeerKey = ref('');
  const workspaceSelectionMode = ref<WorkspaceSelectionMode>('existing');
  const selectedWorkspaceId = ref('');

  const {
    draft,
    discordAccountHint,
    telegramAccountHint,
    accountIdModel,
    scopedAccountId,
  } = useBindingDraftState({
    providerScopeStore,
    gatewayStore,
  });

  const {
    supportsPeerDiscovery,
    effectiveManualPeerInput,
    canDiscoverPeers,
    peerDiscoveryProviderLabel,
    showPeerDiscoveryInstruction,
    showDiscordIdentityHint,
    showTelegramAgentOnlyHint,
    allowedTargetTypes,
    scopedBindings,
  } = useBindingFlowPolicyState({
    draft,
    useManualPeerInput,
    bindingStore,
    optionsStore,
    providerScopeStore,
    gatewayStore,
    scopedAccountId,
  });

  const {
    formatPeerCandidateLabel,
    onTogglePeerInputMode,
    onRefreshPeerCandidates,
    onSaveBinding,
    onDeleteBinding,
    onReloadBindings,
  } = createBindingFlowActions({
    draft,
    selectedPeerKey,
    useManualPeerInput,
    supportsPeerDiscovery,
    canDiscoverPeers,
    effectiveManualPeerInput,
    peerDiscoveryProviderLabel,
    discordAccountHint,
    telegramAccountHint,
    bindingStore,
    optionsStore,
    gatewayStore,
    buildPeerCandidateKey,
  });

  void agentDefinitionStore.fetchAllAgentDefinitions();
  void workspaceStore.fetchAllWorkspaces().catch((error) => {
    console.error('Failed to fetch workspaces for messaging binding setup:', error);
  });
  void runtimeCapabilitiesStore.fetchRuntimeCapabilities();

  const normalizeRuntimeKind = (runtimeKind: unknown): AgentRuntimeKind => {
    if (typeof runtimeKind !== 'string') {
      return DEFAULT_AGENT_RUNTIME_KIND;
    }
    const normalized = runtimeKind.trim();
    return (normalized.length > 0 ? normalized : DEFAULT_AGENT_RUNTIME_KIND) as AgentRuntimeKind;
  };

  const ensureModelsForRuntime = async (
    runtimeKind: AgentRuntimeKind,
    validateSelectedModel = false,
  ) => {
    await llmStore.fetchProvidersWithModels(runtimeKind);
    if (
      validateSelectedModel &&
      draft.launchPreset.llmModelIdentifier &&
      !llmStore.models.includes(draft.launchPreset.llmModelIdentifier)
    ) {
      draft.launchPreset.llmModelIdentifier = '';
      draft.launchPreset.llmConfig = null;
    }
  };

  watch(
    () => draft.launchPreset.runtimeKind,
    (runtimeKind, previousRuntimeKind) => {
      const normalizedRuntime = normalizeRuntimeKind(runtimeKind);
      const validateSelectedModel =
        typeof previousRuntimeKind === 'string' && previousRuntimeKind.trim().length > 0
          ? previousRuntimeKind.trim() !== normalizedRuntime
          : false;
      void ensureModelsForRuntime(normalizedRuntime, validateSelectedModel);
    },
    { immediate: true },
  );

  watch(
    () => [runtimeCapabilitiesStore.hasFetched, draft.launchPreset.runtimeKind] as const,
    ([hasFetched, runtimeKind]) => {
      if (!hasFetched) {
        return;
      }

      const normalizedRuntime = normalizeRuntimeKind(runtimeKind);
      if (runtimeCapabilitiesStore.isRuntimeEnabled(normalizedRuntime)) {
        return;
      }

      draft.launchPreset.runtimeKind = DEFAULT_AGENT_RUNTIME_KIND;
      draft.launchPreset.llmModelIdentifier = '';
      draft.launchPreset.llmConfig = null;
      void ensureModelsForRuntime(DEFAULT_AGENT_RUNTIME_KIND, false);
    },
    { immediate: true },
  );

  watch(
    () => gatewayStore.session?.accountLabel,
    (accountLabel) => {
      if (providerScopeStore.requiresPersonalSession && accountLabel) {
        draft.accountId = accountLabel;
      }
    },
    { immediate: true },
  );

  watch(
    () => providerScopeStore.selectedProvider,
    (provider) => {
      draft.provider = provider;
      draft.transport = providerScopeStore.resolvedTransport;
      draft.targetType = 'AGENT';
      optionsStore.resetPeerCandidates();
      optionsStore.clearStaleSelectionError();
      selectedPeerKey.value = '';
      draft.peerId = '';
      draft.threadId = null;

      if (provider === 'WHATSAPP' || provider === 'WECHAT') {
        gatewayStore.setSessionProvider(provider);
        useManualPeerInput.value = false;
        if (gatewayStore.session?.accountLabel) {
          draft.accountId = gatewayStore.session.accountLabel;
        }
      } else {
        useManualPeerInput.value = provider !== 'DISCORD' && provider !== 'TELEGRAM';
        if (provider === 'DISCORD' && providerScopeStore.discordAccountId) {
          draft.accountId = providerScopeStore.discordAccountId;
        }
        if (provider === 'TELEGRAM' && providerScopeStore.telegramAccountId) {
          draft.accountId = providerScopeStore.telegramAccountId;
        }
      }
    },
    { immediate: true },
  );

  watch(
    () => providerScopeStore.discordAccountId,
    (discordAccountId) => {
      if (draft.provider === 'DISCORD' && discordAccountId && !draft.accountId.trim()) {
        draft.accountId = discordAccountId;
      }
    },
    { immediate: true },
  );

  watch(
    () => providerScopeStore.telegramAccountId,
    (telegramAccountId) => {
      if (draft.provider === 'TELEGRAM' && telegramAccountId && !draft.accountId.trim()) {
        draft.accountId = telegramAccountId;
      }
    },
    { immediate: true },
  );

  watch(
    () => selectedPeerKey.value,
    (key) => {
      optionsStore.clearStaleSelectionError();
      if (effectiveManualPeerInput.value || !key) {
        return;
      }

      const candidate = optionsStore.peerCandidates.find(
        (entry) => buildPeerCandidateKey(entry) === key,
      );
      if (!candidate) {
        return;
      }

      draft.peerId = candidate.peerId;
      draft.threadId = candidate.threadId;
    },
  );

  watch(
    () => useManualPeerInput.value,
    () => {
      optionsStore.clearStaleSelectionError();
    },
  );

  watch(
    () => selectedWorkspaceId.value,
    (workspaceId) => {
      if (workspaceSelectionMode.value !== 'existing' || !workspaceId) {
        return;
      }
      const workspace = workspaceStore.workspaces[workspaceId];
      const workspaceRootPath =
        workspace?.absolutePath ||
        workspace?.workspaceConfig?.root_path ||
        workspace?.workspaceConfig?.rootPath ||
        '';
      if (typeof workspaceRootPath === 'string' && workspaceRootPath.trim().length > 0) {
        draft.launchPreset.workspaceRootPath = workspaceRootPath;
      }
    },
  );

  const workspaceOptions = computed(() =>
    Object.values(workspaceStore.workspaces)
      .map((workspace) => ({
        workspaceId: workspace.workspaceId,
        label: workspace.absolutePath
          ? `${workspace.name} (${workspace.absolutePath})`
          : workspace.name,
        rootPath:
          workspace.absolutePath ||
          workspace.workspaceConfig?.root_path ||
          workspace.workspaceConfig?.rootPath ||
          '',
      }))
      .filter((workspace) => workspace.rootPath.trim().length > 0)
      .sort((left, right) => left.label.localeCompare(right.label)),
  );

  watch(
    () => draft.launchPreset.workspaceRootPath,
    (workspaceRootPath) => {
      if (workspaceSelectionMode.value !== 'existing') {
        return;
      }
      const matchedWorkspace = workspaceOptions.value.find(
        (workspace) => workspace.rootPath === workspaceRootPath,
      );
      selectedWorkspaceId.value = matchedWorkspace?.workspaceId ?? '';
    },
    { immediate: true },
  );

  const agentDefinitionOptions = computed(() =>
    [...agentDefinitionStore.agentDefinitions].sort((left, right) =>
      left.name.localeCompare(right.name),
    ),
  );

  const runtimeOptions = computed<
    Array<{ value: AgentRuntimeKind; label: string; enabled: boolean }>
  >(() => {
    const selectedRuntimeKind = normalizeRuntimeKind(draft.launchPreset.runtimeKind);
    const optionByKind = new Map<
      AgentRuntimeKind,
      { value: AgentRuntimeKind; label: string; enabled: boolean }
    >();

    for (const capability of runtimeCapabilitiesStore.capabilities) {
      optionByKind.set(capability.runtimeKind, {
        value: capability.runtimeKind,
        label: runtimeKindToLabel(capability.runtimeKind),
        enabled: capability.enabled,
      });
    }

    if (!optionByKind.has(DEFAULT_AGENT_RUNTIME_KIND)) {
      optionByKind.set(DEFAULT_AGENT_RUNTIME_KIND, {
        value: DEFAULT_AGENT_RUNTIME_KIND,
        label: runtimeKindToLabel(DEFAULT_AGENT_RUNTIME_KIND),
        enabled: true,
      });
    }

    if (!optionByKind.has(selectedRuntimeKind)) {
      optionByKind.set(selectedRuntimeKind, {
        value: selectedRuntimeKind,
        label: runtimeKindToLabel(selectedRuntimeKind),
        enabled: true,
      });
    }

    return Array.from(optionByKind.values()).sort((left, right) =>
      left.label.localeCompare(right.label),
    );
  });

  const groupedModelOptions = computed<GroupedOption[]>(() => {
    return llmStore.providersWithModels.map((provider) => ({
      label: provider.provider,
      items: provider.models.map((model) => ({
        id: model.modelIdentifier,
        name: model.name || model.modelIdentifier,
      })),
    }));
  });

  const modelConfigSchema = computed(() => {
    if (!draft.launchPreset.llmModelIdentifier) {
      return null;
    }
    return llmStore.modelConfigSchemaByIdentifier(draft.launchPreset.llmModelIdentifier);
  });

  const selectedRuntimeUnavailableReason = computed(() => {
    return runtimeCapabilitiesStore.runtimeReason(
      normalizeRuntimeKind(draft.launchPreset.runtimeKind),
    );
  });

  const agentNameById = computed(() => {
    const map = new Map<string, string>();
    for (const definition of agentDefinitionStore.agentDefinitions) {
      map.set(definition.id, definition.name);
    }
    return map;
  });

  const formatBindingTargetLabel = (binding: ExternalChannelBindingModel): string => {
    const agentDefinitionId = binding.targetAgentDefinitionId?.trim();
    if (!agentDefinitionId) {
      return 'Agent definition missing';
    }
    return agentNameById.value.get(agentDefinitionId) || agentDefinitionId;
  };

  const updateRuntimeKind = (value: string) => {
    const runtimeKind = normalizeRuntimeKind(value);
    if (!runtimeCapabilitiesStore.isRuntimeEnabled(runtimeKind)) {
      return;
    }
    if (draft.launchPreset.runtimeKind === runtimeKind) {
      return;
    }
    draft.launchPreset.runtimeKind = runtimeKind;
    draft.launchPreset.llmModelIdentifier = '';
    draft.launchPreset.llmConfig = null;
  };

  const updateModel = (value: string) => {
    draft.launchPreset.llmModelIdentifier = value;
  };

  const updateModelConfig = (config: Record<string, unknown> | null) => {
    draft.launchPreset.llmConfig = config;
  };

  const updateAutoExecute = (checked: boolean) => {
    draft.launchPreset.autoExecuteTools = checked;
  };

  const updateSkillAccessMode = (value: string) => {
    draft.launchPreset.skillAccessMode = value as SkillAccessMode;
  };

  const setWorkspaceSelectionMode = (mode: WorkspaceSelectionMode) => {
    workspaceSelectionMode.value = mode;
    if (mode === 'existing') {
      const matchedWorkspace = workspaceOptions.value.find(
        (workspace) => workspace.rootPath === draft.launchPreset.workspaceRootPath,
      );
      selectedWorkspaceId.value = matchedWorkspace?.workspaceId ?? '';
      return;
    }
    selectedWorkspaceId.value = '';
  };

  return {
    accountIdModel,
    agentDefinitionOptions,
    bindingStore,
    buildPeerCandidateKey,
    canDiscoverPeers,
    discordAccountHint,
    draft,
    effectiveManualPeerInput,
    allowedTargetTypes,
    formatBindingTargetLabel,
    formatPeerCandidateLabel,
    groupedModelOptions,
    modelConfigSchema,
    onDeleteBinding,
    onRefreshPeerCandidates,
    onReloadBindings,
    onSaveBinding,
    onTogglePeerInputMode,
    optionsStore,
    peerDiscoveryProviderLabel,
    scopedBindings,
    selectedPeerKey,
    selectedRuntimeUnavailableReason,
    selectedWorkspaceId,
    setWorkspaceSelectionMode,
    showDiscordIdentityHint,
    showPeerDiscoveryInstruction,
    showTelegramAgentOnlyHint,
    supportsPeerDiscovery,
    updateAutoExecute,
    updateModel,
    updateModelConfig,
    updateRuntimeKind,
    updateSkillAccessMode,
    useManualPeerInput,
    workspaceOptions,
    workspaceSelectionMode,
    runtimeOptions,
  };
}
