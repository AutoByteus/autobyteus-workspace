import { registerRuntimeClientAdapters } from "../runtime-management/runtime-client/runtime-client-modules-defaults.js";
import type { RuntimeAdapterRegistry } from "./runtime-adapter-registry.js";

export const registerDefaultRuntimeAdapters = (target: RuntimeAdapterRegistry): void => {
  registerRuntimeClientAdapters(target);
};
