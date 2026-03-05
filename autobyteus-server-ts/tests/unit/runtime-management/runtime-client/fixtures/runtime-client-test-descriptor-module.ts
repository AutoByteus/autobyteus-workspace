import type { RuntimeClientModuleDescriptor } from "../../../../../src/runtime-management/runtime-client/runtime-client-module.js";

export const runtimeClientModuleDescriptor: RuntimeClientModuleDescriptor = {
  runtimeKind: "test_runtime",
  getModule: () => ({
    runtimeKind: "test_runtime",
  }),
};
