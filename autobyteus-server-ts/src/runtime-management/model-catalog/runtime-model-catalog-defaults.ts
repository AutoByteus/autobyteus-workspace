import { registerRuntimeClientModelProviders } from "../runtime-client/runtime-client-modules-defaults.js";
import type { RuntimeModelCatalogService } from "./runtime-model-catalog-service.js";

export const registerDefaultRuntimeModelProviders = (
  target: RuntimeModelCatalogService,
): void => {
  registerRuntimeClientModelProviders(target);
};
