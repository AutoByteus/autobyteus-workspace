import type { RunProjectionProvider } from "../../run-history/projection/run-projection-provider-port.js";
import type { RuntimeAdapterRegistry } from "../../runtime-execution/runtime-adapter-registry.js";
import type { RuntimeEventMapperRegistrationTarget } from "../../services/agent-streaming/runtime-event-message-mapper.js";
import type { RuntimeModelCatalogService } from "../model-catalog/runtime-model-catalog-service.js";
import type { RuntimeCapabilityService } from "../runtime-capability-service.js";
import {
  listRuntimeClientModuleDescriptors,
} from "./index.js";
import type {
  RuntimeClientModule,
  RuntimeClientModuleDescriptor,
} from "./runtime-client-module.js";

export interface RuntimeClientRunProjectionProviderSet {
  fallbackProvider: RunProjectionProvider;
  runtimeProviders: RunProjectionProvider[];
}

const RUNTIME_MODULE_ALLOW_LIST_ENV = "AUTOBYTEUS_RUNTIME_CLIENT_MODULES";
const RUNTIME_MODULE_ALLOW_LIST_WILDCARD = "*";

let cachedDefaultRuntimeClientModules: RuntimeClientModule[] | null = null;

const parseRuntimeModuleAllowList = (): Set<string> | null => {
  const raw = process.env[RUNTIME_MODULE_ALLOW_LIST_ENV];
  if (!raw) {
    return null;
  }
  const tokens = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return tokens.length > 0 ? new Set(tokens) : new Set<string>();
};

const resolveDefaultRuntimeClientModuleDescriptors = (): RuntimeClientModuleDescriptor[] => {
  const descriptors = listRuntimeClientModuleDescriptors();
  const byRuntime = new Map<string, RuntimeClientModuleDescriptor>();
  for (const descriptor of descriptors) {
    byRuntime.set(descriptor.runtimeKind, descriptor);
  }
  return Array.from(byRuntime.values());
};

const shouldLoadRuntimeClientModule = (
  descriptor: RuntimeClientModuleDescriptor,
  allowList: Set<string> | null,
): boolean => {
  if (descriptor.required) {
    return true;
  }

  if (allowList) {
    const isWildcard = allowList.has(RUNTIME_MODULE_ALLOW_LIST_WILDCARD);
    if (!isWildcard && !allowList.has(descriptor.runtimeKind)) {
      return false;
    }
  }

  return descriptor.isAvailable ? descriptor.isAvailable() : true;
};

export const getDefaultRuntimeClientModules = (): RuntimeClientModule[] => {
  if (!cachedDefaultRuntimeClientModules) {
    const allowList = parseRuntimeModuleAllowList();
    cachedDefaultRuntimeClientModules = resolveDefaultRuntimeClientModuleDescriptors()
      .filter((descriptor) => shouldLoadRuntimeClientModule(descriptor, allowList))
      .map((descriptor) => descriptor.getModule());
    const hasAutobyteus = cachedDefaultRuntimeClientModules.some(
      (module) => module.runtimeKind === "autobyteus",
    );
    if (!hasAutobyteus) {
      throw new Error("Autobyteus runtime client module must always be present.");
    }
  }
  return cachedDefaultRuntimeClientModules;
};

export const resetDefaultRuntimeClientModulesCacheForTests = (): void => {
  cachedDefaultRuntimeClientModules = null;
};

export const registerRuntimeClientAdapters = (target: RuntimeAdapterRegistry): void => {
  for (const module of getDefaultRuntimeClientModules()) {
    module.registerRuntimeAdapters?.(target);
  }
};

export const registerRuntimeClientModelProviders = (
  target: RuntimeModelCatalogService,
): void => {
  for (const module of getDefaultRuntimeClientModules()) {
    module.registerRuntimeModelProviders?.(target);
  }
};

export const registerRuntimeClientCapabilityProviders = (
  target: RuntimeCapabilityService,
): void => {
  for (const module of getDefaultRuntimeClientModules()) {
    module.registerRuntimeCapabilityProviders?.(target);
  }
};

export const registerRuntimeClientEventMappers = (
  target: RuntimeEventMapperRegistrationTarget,
): void => {
  for (const module of getDefaultRuntimeClientModules()) {
    module.registerRuntimeEventMappers?.(target);
  }
};

export const resolveRuntimeClientRunProjectionProviders = (): RuntimeClientRunProjectionProviderSet => {
  const providersByRuntime = new Map<string, RunProjectionProvider>();
  let fallbackProvider: RunProjectionProvider | null = null;

  for (const module of getDefaultRuntimeClientModules()) {
    const registration = module.resolveRunProjectionRegistration?.();
    if (!registration) {
      continue;
    }

    if (registration.fallbackProvider && !fallbackProvider) {
      fallbackProvider = registration.fallbackProvider;
    }

    if (registration.runtimeProvider) {
      const runtimeKind = registration.runtimeProvider.runtimeKind ?? module.runtimeKind;
      providersByRuntime.set(runtimeKind, registration.runtimeProvider);
    }
  }

  if (!fallbackProvider) {
    throw new Error("No runtime-client fallback run projection provider is configured.");
  }

  const fallbackRuntimeKind = fallbackProvider.runtimeKind;
  if (fallbackRuntimeKind && !providersByRuntime.has(fallbackRuntimeKind)) {
    providersByRuntime.set(fallbackRuntimeKind, fallbackProvider);
  }

  return {
    fallbackProvider,
    runtimeProviders: Array.from(providersByRuntime.values()),
  };
};
