import type { RunProjectionProvider } from "./run-projection-provider-port.js";
import { resolveRuntimeClientRunProjectionProviders } from "../../runtime-management/runtime-client/runtime-client-modules-defaults.js";

export interface DefaultRunProjectionProviderSet {
  fallbackProvider: RunProjectionProvider;
  runtimeProviders: RunProjectionProvider[];
}

export const resolveDefaultRunProjectionProviders = (): DefaultRunProjectionProviderSet => {
  return resolveRuntimeClientRunProjectionProviders();
};
