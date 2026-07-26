import type { Ref } from 'vue'
import type {
  CredentialStatus,
  GeminiConfigurationOperationResult,
  GeminiConfigurationOption,
  GeminiOptionSaveInput,
} from '~/stores/llmProviderConfig'

type GeminiOperation = 'save' | 'saveAndActivate' | 'activate' | 'remove'

interface GeminiActionDependencies {
  saving: Ref<boolean>
  activating: Ref<boolean>
  removing: Ref<boolean>
  saveOption: (input: GeminiOptionSaveInput) => Promise<GeminiConfigurationOperationResult>
  saveAndActivateOption: (input: GeminiOptionSaveInput) => Promise<GeminiConfigurationOperationResult>
  activateOption: (option: GeminiConfigurationOption) => Promise<GeminiConfigurationOperationResult>
  removeOption: (option: GeminiConfigurationOption) => Promise<GeminiConfigurationOperationResult>
  getActiveCredentialStatus: () => CredentialStatus
  setProviderCredentialStatus: (status: CredentialStatus) => void
  translate: (key: string, params: Record<string, string>) => string
  notify: (message: string, type: 'success' | 'error') => void
}

export const createGeminiConfigurationActions = (dependencies: GeminiActionDependencies) => {
  const run = async (
    operation: GeminiOperation,
    mutate: () => Promise<GeminiConfigurationOperationResult>,
  ) => {
    if (dependencies.saving.value || dependencies.activating.value || dependencies.removing.value) {
      return false
    }
    const pending = operation === 'remove'
      ? dependencies.removing
      : operation === 'activate'
        ? dependencies.activating
        : dependencies.saving
    pending.value = true
    try {
      const result = await mutate()
      dependencies.setProviderCredentialStatus(dependencies.getActiveCredentialStatus())
      if (result.outcome === 'PARTIAL') {
        const messageKey = result.instructionCode === 'GEMINI_REMOVAL_RETRY_REQUIRED'
          ? 'settings.components.settings.ProviderAPIKeyManager.gemini_removal_partial'
          : 'settings.components.settings.ProviderAPIKeyManager.gemini_activation_partial'
        dependencies.notify(dependencies.translate(messageKey, {
          option: result.option,
          activeMode: result.activeMode ?? 'NOT_SELECTED',
        }), 'error')
        return false
      }
      const messageKey = operation === 'remove'
        ? 'settings.components.settings.ProviderAPIKeyManager.gemini_option_removed'
        : operation === 'activate' || operation === 'saveAndActivate'
          ? 'settings.components.settings.ProviderAPIKeyManager.gemini_mode_activated'
          : 'settings.components.settings.ProviderAPIKeyManager.gemini_option_saved'
      dependencies.notify(dependencies.translate(messageKey, {
        option: result.option,
        activeMode: result.activeMode ?? 'NOT_SELECTED',
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
      run('save', () => dependencies.saveOption(input)),
    saveAndActivateGeminiConfigurationOption: (input: GeminiOptionSaveInput) =>
      run('saveAndActivate', () => dependencies.saveAndActivateOption(input)),
    activateGeminiConfigurationOption: (option: GeminiConfigurationOption) =>
      run('activate', () => dependencies.activateOption(option)),
    removeGeminiConfigurationOption: (option: GeminiConfigurationOption) =>
      run('remove', () => dependencies.removeOption(option)),
  }
}
