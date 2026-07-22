import type { SecretValue } from '../secrets/secret-value.js';
import type { LLMConfig } from './utils/llm-config.js';
import type { RawLlmConfigOverrides } from './utils/llm-config-overrides.js';

export type LLMApiKeyCredentialSlot = 'apiKey';

export type LLMAuthenticationRequirement =
  | {
      kind: 'apiKey';
      credentialSlot: LLMApiKeyCredentialSlot;
      required: boolean;
    }
  | { kind: 'geminiAuthenticationMode' }
  | { kind: 'none' };

export type LLMConstructionTarget = {
  credentialProviderId: string;
  authenticationRequirement: LLMAuthenticationRequirement;
};

export type ResolvedLLMAuthentication =
  | { kind: 'apiKey'; apiKey: SecretValue }
  | { kind: 'geminiAiStudio'; apiKey: SecretValue }
  | { kind: 'geminiVertexExpress'; apiKey: SecretValue }
  | { kind: 'geminiVertexProject'; project: string; location: string }
  | { kind: 'none' };

export type LLMFactoryConfigInput = LLMConfig | RawLlmConfigOverrides;

export type LLMFactoryCreationInput = {
  configInput?: LLMFactoryConfigInput;
  authentication: ResolvedLLMAuthentication;
};

export type LLMConstructionContext = {
  config: LLMConfig;
  authentication: ResolvedLLMAuthentication;
};

export const requireApiKeyAuthentication = (
  authentication: ResolvedLLMAuthentication,
  providerName: string,
): string => {
  if (authentication.kind !== 'apiKey') {
    throw new Error(`${providerName} requires explicitly resolved API-key authentication.`);
  }
  return authentication.apiKey.revealToTrustedConsumer();
};

export const requireNoAuthentication = (
  authentication: ResolvedLLMAuthentication,
  providerName: string,
): void => {
  if (authentication.kind !== 'none') {
    throw new Error(`${providerName} does not accept API-key authentication.`);
  }
};
