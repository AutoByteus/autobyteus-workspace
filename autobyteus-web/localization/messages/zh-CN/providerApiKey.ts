import type { TranslationCatalog } from '../../runtime/types';

const providerApiKeyMessages = {
  'settings.components.settings.ProviderAPIKeyManager.remove_key': '删除密钥',
  'settings.components.settings.ProviderAPIKeyManager.removing': '删除中...',
  'settings.components.settings.ProviderAPIKeyManager.api_key_removed_successfully': '{{provider}} 的 API 密钥已删除',
  'settings.components.settings.ProviderAPIKeyManager.failed_to_remove_api_key': '删除 {{provider}} 的 API 密钥失败',
} satisfies TranslationCatalog;

export default providerApiKeyMessages;
