import { BrowserToolError } from "./browser-tool-contract.js";
import {
  readBrowserBridgeConfigFromEnvironment,
  type BrowserBridgeClientConfig,
} from "./browser-bridge-client.js";

export class BrowserBridgeConfigResolver {
  resolve(env: NodeJS.ProcessEnv = process.env): BrowserBridgeClientConfig | null {
    return readBrowserBridgeConfigFromEnvironment(env);
  }

  resolveOrThrow(env: NodeJS.ProcessEnv = process.env): BrowserBridgeClientConfig {
    const config = this.resolve(env);
    if (!config) {
      throw new BrowserToolError(
        "browser_bridge_unavailable",
        "Browser bridge is not configured for the current runtime.",
      );
    }
    return config;
  }

  hasSupport(env: NodeJS.ProcessEnv = process.env): boolean {
    return this.resolve(env) !== null;
  }
}

let cachedBrowserBridgeConfigResolver: BrowserBridgeConfigResolver | null = null;

export const getBrowserBridgeConfigResolver = (): BrowserBridgeConfigResolver => {
  if (!cachedBrowserBridgeConfigResolver) {
    cachedBrowserBridgeConfigResolver = new BrowserBridgeConfigResolver();
  }
  return cachedBrowserBridgeConfigResolver;
};
