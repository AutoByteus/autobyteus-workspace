import {
  LLMFactory,
  type BaseLLM,
  type LLMFactoryConfigInput,
} from 'autobyteus-ts';
import { SecretValue } from 'autobyteus-ts/secrets/secret-value.js';
import type { ProviderApiKeyResolver } from 'autobyteus-ts/secrets/provider-api-key-resolver.js';
import { getModelAvailabilityService } from '../../../llm-management/services/model-availability-service.js';
import { createGeminiRuntimeResolver } from '../../../llm-management/services/gemini-runtime-resolver-adapter.js';
import { createLlmProviderApiKeyResolver } from '../../../secret-management/resolution/runtime-provider-api-key-resolvers.js';
import {
  ProviderRelayUnavailableError,
  type ProviderRelayAccess,
  type ProviderRelayRunIdentity,
} from '../../../credential-proxy/provider-relays/provider-relay-access.js';
import { relayedNodeSettings } from '../../../credential-proxy/provider-relays/provider-relay-settings.js';

/** The run a native LLM is built for and the host's provider relays (`null`: this host runs no credential proxy). */
export type NativeLlmRun = Readonly<{ run: ProviderRelayRunIdentity; providerRelayAccess: ProviderRelayAccess | null }>;

/** A resolver that answers every provider with the run's pass: the relay attaches the credential, never this node. */
const passResolver = (pass: string): ProviderApiKeyResolver => ({
  resolve: async () => SecretValue.fromString(pass),
});

/**
 * A native LLM for a run. Unrelayed: the node's own vault keys and the provider's address. On a relayed node (DS-001,
 * FU-003): the model's provider goes through its relay (`routeForNativeProvider`), with the run's pass as its key and
 * the relay as its endpoint (Gemini on AI Studio); a provider the relay node offers no credential for, or a relayed
 * host without a credential proxy, refuses loudly. Local providers (Ollama, LM Studio, custom endpoints) stay direct.
 */
export const createAvailableLlm = async (
  modelIdentifier: string,
  configInput?: LLMFactoryConfigInput,
  native?: NativeLlmRun,
): Promise<BaseLLM> => {
  await getModelAvailabilityService().ensureModelAvailable(modelIdentifier, 'LLM');
  const needsGemini = await LLMFactory.requiresGeminiRuntimeResolver(modelIdentifier);
  const access = native?.providerRelayAccess ?? null;
  const relayed = access ? access.isRelayed() : relayedNodeSettings() !== null;
  if (relayed) {
    if (!access || !native) {
      throw new ProviderRelayUnavailableError('PROVIDER_RELAY_UNAVAILABLE',
        'This node is relayed, but this run has no AutoByteus credential proxy.');
    }
    const provider = await LLMFactory.getProvider(modelIdentifier);
    const route = provider ? access.routeForNativeProvider(provider) : { kind: 'direct' as const };
    if (route.kind === 'unavailable') throw new ProviderRelayUnavailableError('RELAY_NOT_LISTED', route.reason);
    if (route.kind === 'relay') {
      const relay = await access.prepareForRun(native.run, route.relayId, 'autobyteus');
      return LLMFactory.createLLM(
        modelIdentifier,
        configInput,
        passResolver(relay.pass),
        needsGemini ? async () => ({ kind: 'aiStudio' }) : undefined,
        { baseUrl: relay.baseUrl },
      );
    }
  }
  return LLMFactory.createLLM(
    modelIdentifier,
    configInput,
    createLlmProviderApiKeyResolver(),
    needsGemini ? createGeminiRuntimeResolver() : undefined,
  );
};
