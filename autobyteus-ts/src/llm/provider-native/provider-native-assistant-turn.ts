/** Message-metadata key under which a provider-native assistant turn is stored (persisted). */
export const PROVIDER_NATIVE_ASSISTANT_TURN_KEY = 'provider_native_assistant_turn';

/**
 * A provider's own record of one assistant response, tagged with its provider. Memory and
 * agent code store and pass it on without interpreting it; only the provider's code
 * (its renderer and its `ProviderNativeHistoryPolicy`) knows what the other fields mean.
 */
export type ProviderNativeAssistantTurn = { readonly provider: string } & Readonly<Record<string, unknown>>;
