import { computed, ref, watch } from 'vue';
import type { GroupedOption } from '~/components/agentTeams/SearchableGroupedSelect.vue';
import { useLocalization } from '~/composables/useLocalization';
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
import { useRuntimeAvailabilityStore } from '~/stores/runtimeAvailabilityStore';
import {
  DEFAULT_AGENT_RUNTIME_KIND,
  runtimeKindToLabel,
  type AgentRuntimeKind,
  type SkillAccessMode,
} from '~/types/agent/AgentRunConfig';
import type {
  ExternalChannelBindingModel,
  ExternalChannelLaunchPresetModel,
  ExternalChannelTeamDefinitionOptionModel,
  ExternalChannelTeamLaunchPresetModel,
} from '~/types/messaging';

type WorkspaceSelectionMode = 'existing' | 'path';

export function useMessagingChannelBindingSetupFlow() {
  const { t } = useLocalization();
  const bindingStore = useMessagingChannelBindingSetupStore();
  const optionsStore = useMessagingChannelBindingOptionsStore();
  const providerScopeStore = useMessagingProviderScopeStore();
  const gatewayStore = useGatewaySessionSetupStore();
  const agentDefinitionStore = useAgentDefinitionStore();
  const workspaceStore = useWorkspaceStore();
  const llmStore = useLLMProviderConfigStore();
  const runtimeAvailabilityStore = useRuntimeAvailabilityStore();

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
    showTeamResponsePolicyHint,
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
  void runtimeAvailabilityStore.fetchRuntimeAvailabilities();

  type MutableLaunchPreset =
    | ExternalChannelLaunchPresetModel
    | ExternalChannelTeamLaunchPresetModel;

  const getActiveLaunchPreset = (): MutableLaunchPreset =>
    draft.targetType === 'TEAM' ? draft.teamLaunchPreset : draft.launchPreset;

  const activeLaunchPreset = computed(() => getActiveLaunchPreset());
  const showSkillAccessControl = computed(() => true);

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
    const preset = getActiveLaunchPreset();
    if (
      validateSelectedModel &&
      preset.llmModelIdentifier &&
      !llmStore.models.includes(preset.llmModelIdentifier)
    ) {
      preset.llmModelIdentifier = '';
      preset.llmConfig = null;
    }
  };

  watch(
    () => [draft.targetType, activeLaunchPreset.value.runtimeKind] as const,
    ([, runtimeKind], previousValue) => {
      const normalizedRuntime = normalizeRuntimeKind(runtimeKind);
      const previousRuntimeKind = previousValue?.[1];
      const validateSelectedModel =
        typeof previousRuntimeKind === 'string' && previousRuntimeKind.trim().length > 0
          ? normalizeRuntimeKind(previousRuntimeKind) !== normalizedRuntime
          : false;
      void ensureModelsForRuntime(normalizedRuntime, validateSelectedModel);
    },
    { immediate: true },
  );

  watch(
    () => [runtimeAvailabilityStore.hasFetched, draft.targetType, activeLaunchPreset.value.runtimeKind] as const,
    ([hasFetched, , runtimeKind]) => {
      if (!hasFetched) {
        return;
      }

      const normalizedRuntime = normalizeRuntimeKind(runtimeKind);
      if (runtimeAvailabilityStore.isRuntimeEnabled(normalizedRuntime)) {
        return;
      }

      const preset = getActiveLaunchPreset();
      preset.runtimeKind = DEFAULT_AGENT_RUNTIME_KIND;
      preset.llmModelIdentifier = '';
      preset.llmConfig = null;
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
      draft.targetTeamDefinitionId = '';
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
    () => draft.targetType,
    (targetType) => {
      if (targetType === 'TEAM' && bindingStore.teamDefinitionOptions.length === 0) {
        void bindingStore.loadTeamDefinitionOptions().catch(() => undefined);
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
        getActiveLaunchPreset().workspaceRootPath = workspaceRootPath;
      }
    },
  );

  const workspaceOptions = computed(() =>
    Object.values(workspaceStore.workspaces)
      .map((workspace) => ({
        workspaceId: workspace.workspaceId,
        label: workspace.absolutePath
          ? t('settings.messaging.flow.workspaceWithPath', {
              name: workspace.name,
              path: workspace.absolutePath,
            })
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
    () => [draft.targetType, activeLaunchPreset.value.workspaceRootPath] as const,
    ([, workspaceRootPath]) => {
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
    const selectedRuntimeKind = normalizeRuntimeKind(activeLaunchPreset.value.runtimeKind);
    const optionByKind = new Map<
      AgentRuntimeKind,
      { value: AgentRuntimeKind; label: string; enabled: boolean }
    >();

    for (const availability of runtimeAvailabilityStore.availabilities) {
      optionByKind.set(availability.runtimeKind, {
        value: availability.runtimeKind,
        label: runtimeKindToLabel(availability.runtimeKind),
        enabled: availability.enabled,
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
    if (!activeLaunchPreset.value.llmModelIdentifier) {
      return null;
    }
    return llmStore.modelConfigSchemaByIdentifier(activeLaunchPreset.value.llmModelIdentifier);
  });

  const selectedRuntimeUnavailableReason = computed(() => {
    return runtimeAvailabilityStore.runtimeReason(
      normalizeRuntimeKind(activeLaunchPreset.value.runtimeKind),
    );
  });

  const agentNameById = computed(() => {
    const map = new Map<string, string>();
    for (const definition of agentDefinitionStore.agentDefinitions) {
      map.set(definition.id, definition.name);
    }
    return map;
  });

  const teamDefinitionOptions = computed(() => bindingStore.teamDefinitionOptions);

  const teamDefinitionNameById = computed(() => {
    const map = new Map<string, string>();
    for (const option of bindingStore.teamDefinitionOptions) {
      map.set(option.teamDefinitionId, option.teamDefinitionName);
    }
    return map;
  });

  const formatBindingTargetLabel = (binding: ExternalChannelBindingModel): string => {
    if (binding.targetType === 'TEAM') {
      const teamDefinitionId = binding.targetTeamDefinitionId?.trim();
      if (!teamDefinitionId) {
        return 'Team definition missing';
      }
      return teamDefinitionNameById.value.get(teamDefinitionId) || teamDefinitionId;
    }

    const agentDefinitionId = binding.targetAgentDefinitionId?.trim();
    if (!agentDefinitionId) {
      return 'Agent definition missing';
    }
    return agentNameById.value.get(agentDefinitionId) || agentDefinitionId;
  };

  const formatTeamDefinitionOptionLabel = (
    option: ExternalChannelTeamDefinitionOptionModel,
  ): string => {
    const description = option.description?.trim();
    const metadata = `${option.memberCount} members, coordinator ${option.coordinatorMemberName}`;
    return description
      ? `${option.teamDefinitionName} (${metadata}) - ${description}`
      : `${option.teamDefinitionName} (${metadata})`;
  };

  const reloadTeamDefinitionOptions = async () => {
    try {
      await bindingStore.loadTeamDefinitionOptions();
    } catch {
      // Store exposes request errors.
    }
  };

  const updateRuntimeKind = (value: string) => {
    const runtimeKind = normalizeRuntimeKind(value);
    if (!runtimeAvailabilityStore.isRuntimeEnabled(runtimeKind)) {
      return;
    }
    if (activeLaunchPreset.value.runtimeKind === runtimeKind) {
      return;
    }
    activeLaunchPreset.value.runtimeKind = runtimeKind;
    activeLaunchPreset.value.llmModelIdentifier = '';
    activeLaunchPreset.value.llmConfig = null;
  };

  const updateModel = (value: string) => {
    activeLaunchPreset.value.llmModelIdentifier = value;
  };

  const updateModelConfig = (config: Record<string, unknown> | null) => {
    activeLaunchPreset.value.llmConfig = config;
  };

  const updateAutoExecute = (checked: boolean) => {
    activeLaunchPreset.value.autoExecuteTools = checked;
  };

  const updateSkillAccessMode = (value: string) => {
    activeLaunchPreset.value.skillAccessMode = value as SkillAccessMode;
  };

  const setWorkspaceSelectionMode = (mode: WorkspaceSelectionMode) => {
    workspaceSelectionMode.value = mode;
    if (mode === 'existing') {
      const matchedWorkspace = workspaceOptions.value.find(
        (workspace) => workspace.rootPath === activeLaunchPreset.value.workspaceRootPath,
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
    formatTeamDefinitionOptionLabel,
    groupedModelOptions,
    modelConfigSchema,
    onDeleteBinding,
    onRefreshPeerCandidates,
    onReloadBindings,
    onSaveBinding,
    onTogglePeerInputMode,
    optionsStore,
    peerDiscoveryProviderLabel,
    reloadTeamDefinitionOptions,
    scopedBindings,
    selectedLaunchPreset: activeLaunchPreset,
    selectedPeerKey,
    selectedRuntimeUnavailableReason,
    selectedWorkspaceId,
    setWorkspaceSelectionMode,
    showSkillAccessControl,
    showDiscordIdentityHint,
    showPeerDiscoveryInstruction,
    showTeamResponsePolicyHint,
    supportsPeerDiscovery,
    teamDefinitionOptions,
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
