import type { TranslationCatalog } from '../../runtime/types';

const providerApiKeyMessages = {
  'settings.components.settings.ProviderAPIKeyManager.remove_key': 'Remove Key',
  'settings.components.settings.ProviderAPIKeyManager.removing': 'Removing...',
  'settings.components.settings.ProviderAPIKeyManager.api_key_removed_successfully': 'API key for {{provider}} removed successfully',
  'settings.components.settings.ProviderAPIKeyManager.failed_to_remove_api_key': 'Failed to remove API key for {{provider}}',
} satisfies TranslationCatalog;

export default providerApiKeyMessages;
