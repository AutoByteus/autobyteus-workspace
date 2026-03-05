import type { RuntimeKind } from "../runtime-management/runtime-kind.js";
import { registerDefaultRuntimeAdapters } from "./runtime-adapter-registry-defaults.js";
import type { RuntimeAdapter } from "./runtime-adapter-port.js";

export class RuntimeAdapterRegistry {
  private adapters = new Map<RuntimeKind, RuntimeAdapter>();

  constructor(adapters?: RuntimeAdapter[]) {
    for (const adapter of adapters ?? []) {
      this.registerAdapter(adapter);
    }
  }

  registerAdapter(adapter: RuntimeAdapter): void {
    this.adapters.set(adapter.runtimeKind, adapter);
  }

  hasAdapter(runtimeKind: RuntimeKind): boolean {
    return this.adapters.has(runtimeKind);
  }

  resolveAdapter(runtimeKind: RuntimeKind): RuntimeAdapter {
    const adapter = this.adapters.get(runtimeKind);
    if (!adapter) {
      throw new Error(`Runtime adapter not found for runtime kind '${runtimeKind}'.`);
    }
    return adapter;
  }

  listRuntimeKinds(): RuntimeKind[] {
    return Array.from(this.adapters.keys());
  }
}

let cachedRuntimeAdapterRegistry: RuntimeAdapterRegistry | null = null;

export const getRuntimeAdapterRegistry = (): RuntimeAdapterRegistry => {
  if (!cachedRuntimeAdapterRegistry) {
    cachedRuntimeAdapterRegistry = new RuntimeAdapterRegistry();
    registerDefaultRuntimeAdapters(cachedRuntimeAdapterRegistry);
  }
  return cachedRuntimeAdapterRegistry;
};
