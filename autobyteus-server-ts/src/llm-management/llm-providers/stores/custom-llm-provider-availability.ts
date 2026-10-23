/**
 * The custom-provider capability (`custom_llm_providers`). Pending until the startup owner
 * (`startup/app-data-capability-readiness.ts`) applies the migration runner's answer: while pending, the provider file may
 * still be in a released shape. `CustomLlmProviderStore` is the only reader of this state, so it is the single gate.
 */
let customProvidersReady = false;

export const configureCustomLlmProviderAvailability = (ready: boolean): void => {
  customProvidersReady = ready;
};

export const areCustomLlmProvidersAvailable = (): boolean => customProvidersReady;
