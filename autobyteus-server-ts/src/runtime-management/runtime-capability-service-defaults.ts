import { registerRuntimeClientCapabilityProviders } from "./runtime-client/runtime-client-modules-defaults.js";
import type { RuntimeCapabilityService } from "./runtime-capability-service.js";

export const registerDefaultRuntimeCapabilityProviders = (
  target: RuntimeCapabilityService,
): void => {
  registerRuntimeClientCapabilityProviders(target);
};
