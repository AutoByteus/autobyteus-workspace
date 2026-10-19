import type { ProviderApiKeyResolver } from 'autobyteus-ts';
import { getSecretVaultRuntime } from '../secret-vault-runtime.js';
import { SecretManagementProviderApiKeyResolver } from './secret-management-provider-api-key-resolver.js';

/** Resolvers bound to the server's vault runtime, whichever source it opened. */
const runtimeService = () => getSecretVaultRuntime().requireService();

export const createLlmProviderApiKeyResolver = (): ProviderApiKeyResolver =>
  new SecretManagementProviderApiKeyResolver({ kind: 'llm' }, runtimeService);

export const createMediaProviderApiKeyResolver = (
  mediaKind: 'audio' | 'image' | 'video',
): ProviderApiKeyResolver =>
  new SecretManagementProviderApiKeyResolver({ kind: 'media', mediaKind }, runtimeService);

export const createLlmMetadataProviderApiKeyResolver = (): ProviderApiKeyResolver =>
  new SecretManagementProviderApiKeyResolver({ kind: 'llmMetadata' }, runtimeService);
