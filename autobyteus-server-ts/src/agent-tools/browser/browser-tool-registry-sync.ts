import { readBrowserBridgeConfigFromEnvironment } from "./browser-bridge-client.js";
import {
  registerAllBrowserTools,
  unregisterBrowserTools,
} from "./register-browser-tools.js";

export class BrowserToolRegistrySync {
  syncWithSupport(input: { hasRuntimeBinding: boolean; env?: NodeJS.ProcessEnv }): void {
    const hasEnvironmentSupport = readBrowserBridgeConfigFromEnvironment(input.env ?? process.env) !== null;
    if (hasEnvironmentSupport || input.hasRuntimeBinding) {
      registerAllBrowserTools();
      return;
    }

    unregisterBrowserTools();
  }
}

let cachedBrowserToolRegistrySync: BrowserToolRegistrySync | null = null;

export const getBrowserToolRegistrySync = (): BrowserToolRegistrySync => {
  if (!cachedBrowserToolRegistrySync) {
    cachedBrowserToolRegistrySync = new BrowserToolRegistrySync();
  }
  return cachedBrowserToolRegistrySync;
};
