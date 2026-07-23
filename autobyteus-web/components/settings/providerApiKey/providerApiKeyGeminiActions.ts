import type { Ref } from 'vue'
import type {
  CredentialStatus,
  GeminiConfigurationOperationResult,
  GeminiConfigurationOption,
  GeminiOptionSaveInput,
} from '~/stores/llmProviderConfig'

type GeminiOperation = 'save' | 'remove'

interface GeminiActionDependencies {
  saving: Ref<boolean>
  removing: Ref<boolean>
  saveOption: (input: GeminiOptionSaveInput) => Promise<GeminiConfigurationOperationResult>
  removeOption: (option: GeminiConfigurationOption) => Promise<GeminiConfigurationOperationResult>
  getEffectiveCredentialStatus: () => CredentialStatus
  setProviderCredentialStatus: (status: CredentialStatus) => void
  translate: (key: string, params: Record<string, string>) => string
  notify: (message: string, type: 'success' | 'error') => void
}

export const createGeminiConfigurationActions = (dependencies: GeminiActionDependencies) => {
  const run = async (
    operation: GeminiOperation,
    mutate: () => Promise<GeminiConfigurationOperationResult>,
  ) => {
    if (dependencies.saving.value || dependencies.removing.value) return false
    const pending = operation === 'save' ? dependencies.saving : dependencies.removing
    pending.value = true
    try {
      const result = await mutate()
      dependencies.setProviderCredentialStatus(dependencies.getEffectiveCredentialStatus())
      const messageKey = operation === 'save'
        ? 'settings.components.settings.ProviderAPIKeyManager.gemini_option_saved'
        : 'settings.components.settings.ProviderAPIKeyManager.gemini_option_removed'
      dependencies.notify(dependencies.translate(messageKey, {
        option: result.option,
        effectiveMode: result.effectiveMode,
      }), 'success')
      return true
    } catch (error) {
      console.error(`Failed to ${operation} Gemini configuration option:`, error)
      const messageKey = operation === 'save'
        ? 'settings.components.settings.ProviderAPIKeyManager.failed_to_save_api_key'
        : 'settings.components.settings.ProviderAPIKeyManager.failed_to_remove_api_key'
      dependencies.notify(dependencies.translate(messageKey, { provider: 'GEMINI' }), 'error')
      return false
    } finally {
      pending.value = false
    }
  }

  return {
    saveGeminiConfigurationOption: (input: GeminiOptionSaveInput) =>
      run('save', () => dependencies.saveOption(input)),
    removeGeminiConfigurationOption: (option: GeminiConfigurationOption) =>
      run('remove', () => dependencies.removeOption(option)),
  }
}
