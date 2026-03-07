import { registerRuntimeClientEventMappers } from "../../runtime-management/runtime-client/runtime-client-modules-defaults.js";
import type { RuntimeEventMapperRegistrationTarget } from "./runtime-event-message-mapper.js";

export const registerDefaultRuntimeEventMappers = (
  target: RuntimeEventMapperRegistrationTarget,
): void => {
  registerRuntimeClientEventMappers(target);
};
