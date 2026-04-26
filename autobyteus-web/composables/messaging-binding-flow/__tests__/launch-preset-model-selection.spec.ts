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
})
