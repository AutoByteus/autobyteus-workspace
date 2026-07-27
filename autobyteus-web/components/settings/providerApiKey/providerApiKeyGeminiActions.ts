import type { Ref } from 'vue'
import {
  isGeminiOptionConfigured,
  type GeminiConfigurationOption,
  type GeminiOptionSaveInput,
  type GeminiSetupConfigState,
} from '~/stores/llmProviderConfig'

type GeminiOperation = 'save' | 'saveAndActivate' | 'activate' | 'remove'

interface GeminiActionDependencies {
  saving: Ref<boolean>
  activating: Ref<boolean>
  removing: Ref<boolean>
  saveOption: (input: GeminiOptionSaveInput, activateAfterSave: boolean) => Promise<GeminiSetupConfigState>
  activateOption: (option: GeminiConfigurationOption) => Promise<GeminiSetupConfigState>
  removeOption: (option: GeminiConfigurationOption) => Promise<GeminiSetupConfigState>
  translate: (key: string, params: Record<string, string>) => string
  notify: (message: string, type: 'success' | 'error') => void
}

const resultMatches = (
  operation: GeminiOperation,
  option: GeminiConfigurationOption,
  state: GeminiSetupConfigState,
): boolean => {
  if (operation === 'remove') {
    return !isGeminiOptionConfigured(state, option) && state.activeMode !== option
  }
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
    if (dependencies.saving.value || dependencies.activating.value || dependencies.removing.value) return false
    const pending = operation === 'remove'
      ? dependencies.removing
      : operation === 'activate'
        ? dependencies.activating
        : dependencies.saving
    pending.value = true
    try {
      const state = await mutate()
      if (!resultMatches(operation, option, state)) {
        const messageKey = operation === 'remove'
          ? 'settings.components.settings.ProviderAPIKeyManager.gemini_removal_partial'
          : 'settings.components.settings.ProviderAPIKeyManager.gemini_activation_partial'
        dependencies.notify(dependencies.translate(messageKey, {
          option,
          activeMode: state.activeMode ?? 'NOT_SELECTED',
        }), 'error')
        return false
      }
      const messageKey = operation === 'remove'
        ? 'settings.components.settings.ProviderAPIKeyManager.gemini_option_removed'
        : operation === 'activate' || operation === 'saveAndActivate'
          ? 'settings.components.settings.ProviderAPIKeyManager.gemini_mode_activated'
          : 'settings.components.settings.ProviderAPIKeyManager.gemini_option_saved'
      dependencies.notify(dependencies.translate(messageKey, {
        option,
        activeMode: state.activeMode ?? 'NOT_SELECTED',
      }), 'success')
      return true
    } catch (error) {
      console.error(`Failed to ${operation} Gemini configuration option:`, error)
      const messageKey = operation === 'remove'
        ? 'settings.components.settings.ProviderAPIKeyManager.failed_to_remove_api_key'
        : 'settings.components.settings.ProviderAPIKeyManager.failed_to_save_api_key'
      dependencies.notify(dependencies.translate(messageKey, { provider: 'GEMINI' }), 'error')
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
    removeGeminiConfigurationOption: (option: GeminiConfigurationOption) =>
      run('remove', option, () => dependencies.removeOption(option)),
  }
}
