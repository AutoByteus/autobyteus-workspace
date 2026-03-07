import type { RuntimeKind } from "../../runtime-management/runtime-kind.js";
import { DEFAULT_RUNTIME_KIND, normalizeRuntimeKind } from "../../runtime-management/runtime-kind.js";
import type { RunProjectionProvider } from "./run-projection-provider-port.js";
import { resolveDefaultRunProjectionProviders } from "./run-projection-provider-registry-defaults.js";

export class RunProjectionProviderRegistry {
  private readonly providersByRuntime = new Map<RuntimeKind, RunProjectionProvider>();
  private readonly fallbackProvider: RunProjectionProvider;

  constructor(
    fallbackProvider: RunProjectionProvider,
    runtimeProviders: RunProjectionProvider[] = [],
  ) {
    this.fallbackProvider = fallbackProvider;
    this.providersByRuntime.set(DEFAULT_RUNTIME_KIND, fallbackProvider);

    for (const provider of runtimeProviders) {
      if (!provider.runtimeKind) {
        continue;
      }
      this.providersByRuntime.set(provider.runtimeKind, provider);
    }
  }

  resolveProvider(runtimeKind: RuntimeKind | string | null | undefined): RunProjectionProvider {
    const normalized = normalizeRuntimeKind(runtimeKind, DEFAULT_RUNTIME_KIND);
    return this.providersByRuntime.get(normalized) ?? this.fallbackProvider;
  }

  resolveFallbackProvider(): RunProjectionProvider {
    return this.fallbackProvider;
  }
}

let cachedRunProjectionProviderRegistry: RunProjectionProviderRegistry | null = null;

export const getRunProjectionProviderRegistry = (): RunProjectionProviderRegistry => {
  if (!cachedRunProjectionProviderRegistry) {
    const defaults = resolveDefaultRunProjectionProviders();
    cachedRunProjectionProviderRegistry = new RunProjectionProviderRegistry(
      defaults.fallbackProvider,
      defaults.runtimeProviders,
    );
  }
  return cachedRunProjectionProviderRegistry;
};
