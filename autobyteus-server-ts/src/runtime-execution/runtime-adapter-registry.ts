import type { RuntimeKind } from "../runtime-management/runtime-kind.js";
import { AutobyteusRuntimeAdapter } from "./adapters/autobyteus-runtime-adapter.js";
import { CodexAppServerRuntimeAdapter } from "./adapters/codex-app-server-runtime-adapter.js";
import type { RuntimeAdapter } from "./runtime-adapter-port.js";

export class RuntimeAdapterRegistry {
  private adapters = new Map<RuntimeKind, RuntimeAdapter>();

  constructor(adapters?: RuntimeAdapter[]) {
    const defaults =
      adapters && adapters.length > 0
        ? adapters
        : [new AutobyteusRuntimeAdapter(), new CodexAppServerRuntimeAdapter()];

    for (const adapter of defaults) {
      this.registerAdapter(adapter);
    }
  }

  registerAdapter(adapter: RuntimeAdapter): void {
    this.adapters.set(adapter.runtimeKind, adapter);
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
  }
  return cachedRuntimeAdapterRegistry;
};
