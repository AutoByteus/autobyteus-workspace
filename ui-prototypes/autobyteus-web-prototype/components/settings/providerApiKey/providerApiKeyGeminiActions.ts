import type { Ref } from 'vue'
import {
  isGeminiOptionConfigured,
  type GeminiConfigurationOption,
  type GeminiOptionSaveInput,
  type GeminiSetupConfigState,
} from '~/stores/llmProviderConfig'

type GeminiOperation = 'save' | 'saveAndActivate' | 'activate'

interface GeminiActionDependencies {
  saving: Ref<boolean>
  activating: Ref<boolean>
  saveOption: (input: GeminiOptionSaveInput, activateAfterSave: boolean) => Promise<GeminiSetupConfigState>
  activateOption: (option: GeminiConfigurationOption) => Promise<GeminiSetupConfigState>
  translate: (key: string, params: Record<string, string>) => string
  notify: (message: string, type: 'success' | 'error') => void
}

const resultMatches = (
  operation: GeminiOperation,
  option: GeminiConfigurationOption,
  state: GeminiSetupConfigState,
): boolean => {
  if (!isGeminiOptionConfigured(state, option)) return false
  return operation === 'activate' || operation === 'saveAndActivate'
    ? state.activeMode === option
    : true
}

export const createGeminiConfigurationActions = (dependencies: GeminiActionDependencies) => {
  const run = async (
    operation: GeminiOperation,
    option: GeminiConfigurationOption,
    mutate: () => Promise<GeminiSetupConfigState>,
  ) => {
    if (dependencies.saving.value || dependencies.activating.value) return false
    const pending = operation === 'activate'
      ? dependencies.activating
      : dependencies.saving
    pending.value = true
    try {
      const state = await mutate()
      if (!resultMatches(operation, option, state)) {
        dependencies.notify(dependencies.translate(
          'settings.components.settings.ProviderAPIKeyManager.gemini_activation_partial',
          {
          option,
          activeMode: state.activeMode ?? 'NOT_SELECTED',
          },
        ), 'error')
        return false
      }
      const messageKey = operation === 'activate' || operation === 'saveAndActivate'
        ? 'settings.components.settings.ProviderAPIKeyManager.gemini_mode_activated'
        : 'settings.components.settings.ProviderAPIKeyManager.gemini_option_saved'
      dependencies.notify(dependencies.translate(messageKey, {
        option,
        activeMode: state.activeMode ?? 'NOT_SELECTED',
      }), 'success')
      return true
    } catch (error) {
      console.error(`Failed to ${operation} Gemini configuration option:`, error)
      dependencies.notify(dependencies.translate(
        'settings.components.settings.ProviderAPIKeyManager.failed_to_save_api_key',
        { provider: 'GEMINI' },
      ), 'error')
      return false
    } finally {
      pending.value = false
    }
  }

  return {
    saveGeminiConfigurationOption: (input: GeminiOptionSaveInput) =>
      run('save', input.option, () => dependencies.saveOption(input, false)),
    saveAndActivateGeminiConfigurationOption: (input: GeminiOptionSaveInput) =>
      run('saveAndActivate', input.option, () => dependencies.saveOption(input, true)),
    activateGeminiConfigurationOption: (option: GeminiConfigurationOption) =>
      run('activate', option, () => dependencies.activateOption(option)),
  }
}
