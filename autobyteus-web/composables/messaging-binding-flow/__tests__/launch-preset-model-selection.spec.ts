import { computed, reactive } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useBindingLaunchPresetModelSelection } from '../launch-preset-model-selection'

describe('useBindingLaunchPresetModelSelection', () => {
  it('clears launch preset llmConfig when the model is explicitly changed', () => {
    const launchPreset = reactive({
      runtimeKind: 'codex_app_server',
      llmModelIdentifier: 'gpt-5.4',
      llmConfig: { reasoning_effort: 'xhigh' },
      workspaceRootPath: '/ws/a',
      autoExecuteTools: false,
      skillAccessMode: 'PRELOADED_ONLY',
    })

    const flow = useBindingLaunchPresetModelSelection({
      targetType: computed(() => 'AGENT' as const),
      activeLaunchPreset: computed(() => launchPreset as any),
      llmStore: {
        fetchProvidersWithModels: vi.fn().mockResolvedValue([]),
        providersWithModelsForSelection: [],
        models: ['gpt-5.4', 'gpt-5.3-codex'],
        modelConfigSchemaByIdentifier: vi.fn().mockReturnValue(null),
      } as any,
      runtimeAvailabilityStore: {
        hasFetched: true,
        availabilities: [
          { runtimeKind: 'codex_app_server', enabled: true, reason: null },
        ],
        isRuntimeEnabled: vi.fn().mockReturnValue(true),
        runtimeReason: vi.fn().mockReturnValue(null),
      } as any,
    })

    flow.updateModel('gpt-5.3-codex')

    expect(launchPreset.llmModelIdentifier).toBe('gpt-5.3-codex')
    expect(launchPreset.llmConfig).toBeNull()
  })

  it('presents Qwen names while retaining exact binding selectors', () => {
    const launchPreset = reactive({
      runtimeKind: 'autobyteus',
      llmModelIdentifier: 'qwen:deepseek-v4-pro',
      llmConfig: null,
      workspaceRootPath: '/ws/a',
      autoExecuteTools: false,
      skillAccessMode: 'PRELOADED_ONLY',
    })
    const qwenModels = [
      {
        modelIdentifier: 'qwen:deepseek-v4-pro',
        name: 'DeepSeek V4 Pro (Qwen)',
        providerType: 'QWEN',
      },
      {
        modelIdentifier: 'qwen:deepseek-v4-flash-0731',
        name: 'DeepSeek V4 Flash 0731 (Qwen)',
        providerType: 'QWEN',
      },
      {
        modelIdentifier: 'qwen:glm-5.2',
        name: 'GLM-5.2 (Qwen)',
        providerType: 'QWEN',
      },
    ]
    const flow = useBindingLaunchPresetModelSelection({
      targetType: computed(() => 'AGENT' as const),
      activeLaunchPreset: computed(() => launchPreset as any),
      llmStore: {
        fetchProvidersWithModels: vi.fn().mockResolvedValue([]),
        providersWithModelsForSelection: [
          {
            provider: { id: 'QWEN', name: 'Qwen' },
            models: qwenModels,
          },
        ],
        models: qwenModels.map(model => model.modelIdentifier),
        modelConfigSchemaByIdentifier: vi.fn().mockReturnValue(null),
      } as any,
      runtimeAvailabilityStore: {
        hasFetched: true,
        availabilities: [
          { runtimeKind: 'autobyteus', enabled: true, reason: null },
        ],
        isRuntimeEnabled: vi.fn().mockReturnValue(true),
        runtimeReason: vi.fn().mockReturnValue(null),
      } as any,
    })

    expect(flow.groupedModelOptions.value).toEqual([
      {
        label: 'Qwen',
        items: [
          {
            id: 'qwen:deepseek-v4-pro',
            name: 'DeepSeek V4 Pro (Qwen)',
            selectedLabel: 'Qwen / DeepSeek V4 Pro (Qwen)',
          },
          {
            id: 'qwen:deepseek-v4-flash-0731',
            name: 'DeepSeek V4 Flash 0731 (Qwen)',
            selectedLabel: 'Qwen / DeepSeek V4 Flash 0731 (Qwen)',
          },
          {
            id: 'qwen:glm-5.2',
            name: 'GLM-5.2 (Qwen)',
            selectedLabel: 'Qwen / GLM-5.2 (Qwen)',
          },
        ],
      },
    ])

    flow.updateModel('qwen:glm-5.2')

    expect(launchPreset.llmModelIdentifier).toBe('qwen:glm-5.2')
  })
})
