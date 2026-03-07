import { getLocalMemoryRunProjectionProvider } from "../../run-history/projection/providers/local-memory-run-projection-provider.js";
import { AutobyteusRuntimeAdapter } from "../../runtime-execution/adapters/autobyteus-runtime-adapter.js";
import type { RuntimeAdapterRegistry } from "../../runtime-execution/runtime-adapter-registry.js";
import { AutobyteusRuntimeModelProvider } from "../model-catalog/providers/autobyteus-runtime-model-provider.js";
import type { RuntimeModelCatalogService } from "../model-catalog/runtime-model-catalog-service.js";
import type { RuntimeCapabilityProvider } from "../runtime-capability-service.js";
import type { RuntimeCapabilityService } from "../runtime-capability-service.js";
import type {
  RuntimeClientModule,
  RuntimeClientModuleDescriptor,
  RuntimeClientRunProjectionRegistration,
} from "./runtime-client-module.js";

const createAutobyteusRuntimeCapabilityProvider = (): RuntimeCapabilityProvider => ({
  runtimeKind: "autobyteus",
  getRuntimeCapability: () => ({
    runtimeKind: "autobyteus",
    enabled: true,
    reason: null,
  }),
});

class AutobyteusRuntimeClientModule implements RuntimeClientModule {
  readonly runtimeKind = "autobyteus" as const;

  registerRuntimeAdapters(target: RuntimeAdapterRegistry): void {
    if (!target.hasAdapter(this.runtimeKind)) {
      target.registerAdapter(new AutobyteusRuntimeAdapter());
    }
  }

  registerRuntimeModelProviders(target: RuntimeModelCatalogService): void {
    if (!target.hasRuntimeModelProvider(this.runtimeKind)) {
      target.registerRuntimeModelProvider(new AutobyteusRuntimeModelProvider());
    }
  }

  registerRuntimeCapabilityProviders(target: RuntimeCapabilityService): void {
    if (!target.hasProvider(this.runtimeKind)) {
      target.registerProvider(createAutobyteusRuntimeCapabilityProvider());
    }
  }

  resolveRunProjectionRegistration(): RuntimeClientRunProjectionRegistration {
    const localProvider = getLocalMemoryRunProjectionProvider();
    return {
      fallbackProvider: localProvider,
      runtimeProvider: localProvider,
    };
  }
}

let cachedAutobyteusRuntimeClientModule: AutobyteusRuntimeClientModule | null = null;

export const getAutobyteusRuntimeClientModule = (): AutobyteusRuntimeClientModule => {
  if (!cachedAutobyteusRuntimeClientModule) {
    cachedAutobyteusRuntimeClientModule = new AutobyteusRuntimeClientModule();
  }
  return cachedAutobyteusRuntimeClientModule;
};

export const runtimeClientModuleDescriptor: RuntimeClientModuleDescriptor = {
  runtimeKind: "autobyteus",
  required: true,
  getModule: getAutobyteusRuntimeClientModule,
};
