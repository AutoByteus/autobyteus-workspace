import type { Ref } from 'vue'
import type { useLocalization } from '~/composables/useLocalization'

type Translate = ReturnType<typeof useLocalization>['t']

export type ProviderApiKeyRemovalDependencies = {
  removing: Ref<boolean>
  removeCredential: (providerId: string) => Promise<unknown>
  hydrateCredentialStatus: () => Promise<void>
  resetEditor: () => void
  getProviderLabel: (providerId: string) => string
  notify: (message: string, type: 'success' | 'error') => void
  translate: Translate
}

export const createProviderApiKeyRemoval = (dependencies: ProviderApiKeyRemovalDependencies) =>
  async (providerId: string): Promise<boolean> => {
    if (!providerId || providerId === 'GEMINI') return false

    dependencies.removing.value = true
    try {
      await dependencies.removeCredential(providerId)
      await dependencies.hydrateCredentialStatus()
      dependencies.resetEditor()
      dependencies.notify(
        dependencies.translate(
          'settings.components.settings.ProviderAPIKeyManager.api_key_removed_successfully',
          { provider: dependencies.getProviderLabel(providerId) },
        ),
        'success',
      )
      return true
    } catch (error) {
      console.error('Failed to remove API key:', error)
      dependencies.notify(
        dependencies.translate(
          'settings.components.settings.ProviderAPIKeyManager.failed_to_remove_api_key',
          { provider: dependencies.getProviderLabel(providerId) },
        ),
        'error',
      )
      return false
    } finally {
      dependencies.removing.value = false
    }
  }
