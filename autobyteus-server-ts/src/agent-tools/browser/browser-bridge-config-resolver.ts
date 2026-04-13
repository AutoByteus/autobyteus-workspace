import { BrowserToolError } from "./browser-tool-contract.js";
import {
  readBrowserBridgeConfigFromEnvironment,
  type BrowserBridgeClientConfig,
} from "./browser-bridge-client.js";
import { getRuntimeBrowserBridgeRegistrationService } from "./runtime-browser-bridge-registration-service.js";

export class BrowserBridgeConfigResolver {
  resolve(env: NodeJS.ProcessEnv = process.env): BrowserBridgeClientConfig | null {
    const envConfig = readBrowserBridgeConfigFromEnvironment(env);
    if (envConfig) {
      return envConfig;
    }

    return getRuntimeBrowserBridgeRegistrationService().getCurrentBinding();
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
