import type { RuntimeClientModuleDescriptor } from "./runtime-client-module.js";

const RUNTIME_CLIENT_DESCRIPTOR_MODULES_ENV = "AUTOBYTEUS_RUNTIME_CLIENT_DESCRIPTOR_MODULES";
const REQUIRED_RUNTIME_CLIENT_DESCRIPTOR_MODULE_SPECS: readonly string[] = [
  "./autobyteus-runtime-client-module.js",
];
const DEFAULT_OPTIONAL_RUNTIME_CLIENT_DESCRIPTOR_MODULE_SPECS: readonly string[] = [
  "./codex-runtime-client-module.js",
];

interface RuntimeClientDescriptorModule {
  readonly runtimeClientModuleDescriptor?: unknown;
  readonly runtimeClientModuleDescriptors?: unknown;
}

const asRuntimeClientDescriptorModule = (value: unknown): RuntimeClientDescriptorModule =>
  value && typeof value === "object"
    ? (value as RuntimeClientDescriptorModule)
    : {};

const parseRuntimeClientDescriptorModuleSpecs = (raw: string | undefined): string[] | null => {
  if (!raw) {
    return null;
  }
  const moduleSpecs = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return moduleSpecs.length > 0 ? moduleSpecs : [];
};

const mergeRequiredModuleSpecs = (moduleSpecs: readonly string[]): string[] => {
  const mergedSpecs: string[] = [];
  const seen = new Set<string>();

  for (const requiredSpec of REQUIRED_RUNTIME_CLIENT_DESCRIPTOR_MODULE_SPECS) {
    if (!seen.has(requiredSpec)) {
      mergedSpecs.push(requiredSpec);
      seen.add(requiredSpec);
    }
  }

  for (const spec of moduleSpecs) {
    if (!seen.has(spec)) {
      mergedSpecs.push(spec);
      seen.add(spec);
    }
  }

  return mergedSpecs;
};

const resolveRuntimeClientDescriptorModuleSpecs = (): string[] => {
  const fromEnv = parseRuntimeClientDescriptorModuleSpecs(
    process.env[RUNTIME_CLIENT_DESCRIPTOR_MODULES_ENV],
  );
  if (fromEnv) {
    return mergeRequiredModuleSpecs(fromEnv);
  }
  return mergeRequiredModuleSpecs(DEFAULT_OPTIONAL_RUNTIME_CLIENT_DESCRIPTOR_MODULE_SPECS);
};

const isRuntimeClientModuleDescriptor = (
  value: unknown,
): value is RuntimeClientModuleDescriptor => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const descriptor = value as Partial<RuntimeClientModuleDescriptor>;
  return typeof descriptor.runtimeKind === "string" && typeof descriptor.getModule === "function";
};

const collectRuntimeClientModuleDescriptors = (
  descriptorModule: RuntimeClientDescriptorModule,
): RuntimeClientModuleDescriptor[] => {
  const descriptors: RuntimeClientModuleDescriptor[] = [];
  if (isRuntimeClientModuleDescriptor(descriptorModule.runtimeClientModuleDescriptor)) {
    descriptors.push(descriptorModule.runtimeClientModuleDescriptor);
  }
  if (Array.isArray(descriptorModule.runtimeClientModuleDescriptors)) {
    for (const descriptor of descriptorModule.runtimeClientModuleDescriptors) {
      if (isRuntimeClientModuleDescriptor(descriptor)) {
        descriptors.push(descriptor);
      }
    }
  }
  return descriptors;
};

const loadRuntimeClientModuleDescriptors = async (): Promise<RuntimeClientModuleDescriptor[]> => {
  const loadedDescriptors: RuntimeClientModuleDescriptor[] = [];

  for (const moduleSpec of resolveRuntimeClientDescriptorModuleSpecs()) {
    try {
      const descriptorModule = asRuntimeClientDescriptorModule(await import(moduleSpec));
      loadedDescriptors.push(...collectRuntimeClientModuleDescriptors(descriptorModule));
    } catch {
      // Descriptor module discovery is best-effort for optional runtime modules.
    }
  }

  const descriptorsByRuntime = new Map<string, RuntimeClientModuleDescriptor>();
  for (const descriptor of loadedDescriptors) {
    descriptorsByRuntime.set(descriptor.runtimeKind, descriptor);
  }

  return Array.from(descriptorsByRuntime.values());
};

const DEFAULT_RUNTIME_CLIENT_MODULE_DESCRIPTORS = await loadRuntimeClientModuleDescriptors();

export const listRuntimeClientModuleDescriptors = (): RuntimeClientModuleDescriptor[] =>
  DEFAULT_RUNTIME_CLIENT_MODULE_DESCRIPTORS.slice();

export type { RuntimeClientModule, RuntimeClientRunProjectionRegistration } from "./runtime-client-module.js";
