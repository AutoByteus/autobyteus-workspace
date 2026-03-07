import { DEFAULT_RUNTIME_KIND, normalizeRuntimeKind, type RuntimeKind } from "./runtime-kind.js";
import { registerDefaultRuntimeCapabilityProviders } from "./runtime-capability-service-defaults.js";

export interface RuntimeCapability {
  runtimeKind: RuntimeKind;
  enabled: boolean;
  reason: string | null;
}

export interface RuntimeCapabilityProvider {
  readonly runtimeKind: RuntimeKind;
  getRuntimeCapability(): RuntimeCapability;
}

const createAlwaysEnabledCapabilityProvider = (
  runtimeKind: RuntimeKind = DEFAULT_RUNTIME_KIND,
): RuntimeCapabilityProvider => ({
  runtimeKind,
  getRuntimeCapability: () => ({
    runtimeKind,
    enabled: true,
    reason: null,
  }),
});

export class RuntimeCapabilityService {
  private readonly providers = new Map<RuntimeKind, RuntimeCapabilityProvider>();

  constructor(providers?: RuntimeCapabilityProvider[]) {
    for (const provider of providers ?? []) {
      this.registerProvider(provider);
    }
    if (!this.hasProvider(DEFAULT_RUNTIME_KIND)) {
      this.registerProvider(createAlwaysEnabledCapabilityProvider(DEFAULT_RUNTIME_KIND));
    }
  }

  registerProvider(provider: RuntimeCapabilityProvider): void {
    this.providers.set(provider.runtimeKind, provider);
  }

  hasProvider(runtimeKind: RuntimeKind): boolean {
    return this.providers.has(runtimeKind);
  }

  listRuntimeCapabilities(): RuntimeCapability[] {
    return Array.from(this.providers.keys()).map((runtimeKind) =>
      this.getRuntimeCapability(runtimeKind),
    );
  }

  getRuntimeCapability(runtimeKind: RuntimeKind | string): RuntimeCapability {
    const normalized = normalizeRuntimeKind(runtimeKind, DEFAULT_RUNTIME_KIND);
    const provider = this.providers.get(normalized);
    if (!provider) {
      return {
        runtimeKind: normalized,
        enabled: false,
        reason: `Runtime '${normalized}' is not configured.`,
      };
    }
    return provider.getRuntimeCapability();
  }
}

let cachedRuntimeCapabilityService: RuntimeCapabilityService | null = null;

export const getRuntimeCapabilityService = (): RuntimeCapabilityService => {
  if (!cachedRuntimeCapabilityService) {
    cachedRuntimeCapabilityService = new RuntimeCapabilityService();
    registerDefaultRuntimeCapabilityProviders(cachedRuntimeCapabilityService);
  }
  return cachedRuntimeCapabilityService;
};
