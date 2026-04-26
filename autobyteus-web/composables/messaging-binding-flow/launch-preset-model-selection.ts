import { computed, watch, type ComputedRef } from 'vue';
import type { GroupedOption } from '~/components/agentTeams/SearchableGroupedSelect.vue';
import type { useLLMProviderConfigStore } from '~/stores/llmProviderConfig';
import type { useRuntimeAvailabilityStore } from '~/stores/runtimeAvailabilityStore';
import {
  DEFAULT_AGENT_RUNTIME_KIND,
  runtimeKindToLabel,
  type AgentRuntimeKind,
  type SkillAccessMode,
} from '~/types/agent/AgentRunConfig';
import type {
  ExternalChannelBindingTargetType,
  ExternalChannelLaunchPresetModel,
  ExternalChannelTeamLaunchPresetModel,
} from '~/types/messaging';
import {
  getModelSelectionOptionLabel,
  getModelSelectionSelectedLabel,
} from '~/utils/modelSelectionLabel';

type MutableLaunchPreset =
  | ExternalChannelLaunchPresetModel
  | ExternalChannelTeamLaunchPresetModel;

export function useBindingLaunchPresetModelSelection(input: {
  targetType: ComputedRef<ExternalChannelBindingTargetType>;
  activeLaunchPreset: ComputedRef<MutableLaunchPreset>;
  llmStore: ReturnType<typeof useLLMProviderConfigStore>;
  runtimeAvailabilityStore: ReturnType<typeof useRuntimeAvailabilityStore>;
}) {
  const { targetType, activeLaunchPreset, llmStore, runtimeAvailabilityStore } = input;

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
    const preset = activeLaunchPreset.value;
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
    () => [targetType.value, activeLaunchPreset.value.runtimeKind] as const,
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
    () =>
      [runtimeAvailabilityStore.hasFetched, targetType.value, activeLaunchPreset.value.runtimeKind] as const,
    ([hasFetched, , runtimeKind]) => {
      if (!hasFetched) {
        return;
      }

      const normalizedRuntime = normalizeRuntimeKind(runtimeKind);
      if (runtimeAvailabilityStore.isRuntimeEnabled(normalizedRuntime)) {
        return;
      }

      const preset = activeLaunchPreset.value;
      preset.runtimeKind = DEFAULT_AGENT_RUNTIME_KIND;
      preset.llmModelIdentifier = '';
      preset.llmConfig = null;
      void ensureModelsForRuntime(DEFAULT_AGENT_RUNTIME_KIND, false);
    },
    { immediate: true },
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

  const availableProviderGroups = computed(() => {
    return llmStore.providersWithModelsForSelection ?? [];
  });

  const groupedModelOptions = computed<GroupedOption[]>(() => {
    return availableProviderGroups.value.map((providerGroup) => ({
      label: providerGroup.provider.name,
      items: providerGroup.models.map((model) => ({
        id: model.modelIdentifier,
        name: getModelSelectionOptionLabel(model, activeLaunchPreset.value.runtimeKind),
        selectedLabel: getModelSelectionSelectedLabel(
          providerGroup.provider.name,
          model,
          activeLaunchPreset.value.runtimeKind,
        ),
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
    if (activeLaunchPreset.value.llmModelIdentifier === value) {
      return;
    }
    activeLaunchPreset.value.llmModelIdentifier = value;
    activeLaunchPreset.value.llmConfig = null;
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

  return {
    runtimeOptions,
    groupedModelOptions,
    modelConfigSchema,
    selectedRuntimeUnavailableReason,
    updateRuntimeKind,
    updateModel,
    updateModelConfig,
    updateAutoExecute,
    updateSkillAccessMode,
  };
}
