import type { RunProjectionProvider } from "../../run-history/projection/run-projection-provider-port.js";
import type { RuntimeAdapterRegistry } from "../../runtime-execution/runtime-adapter-registry.js";
import type {
  RuntimeEventMapperRegistrationTarget,
} from "../../services/agent-streaming/runtime-event-message-mapper.js";
import type { RuntimeKind } from "../runtime-kind.js";
import type { RuntimeModelCatalogService } from "../model-catalog/runtime-model-catalog-service.js";
import type { RuntimeCapabilityService } from "../runtime-capability-service.js";

export interface RuntimeClientRunProjectionRegistration {
  fallbackProvider?: RunProjectionProvider;
  runtimeProvider?: RunProjectionProvider;
}

export interface RuntimeClientModule {
  readonly runtimeKind: RuntimeKind;
  registerRuntimeAdapters?(target: RuntimeAdapterRegistry): void;
  registerRuntimeModelProviders?(target: RuntimeModelCatalogService): void;
  registerRuntimeCapabilityProviders?(target: RuntimeCapabilityService): void;
  resolveRunProjectionRegistration?(): RuntimeClientRunProjectionRegistration | null;
  registerRuntimeEventMappers?(target: RuntimeEventMapperRegistrationTarget): void;
}

export interface RuntimeClientModuleDescriptor {
  readonly runtimeKind: RuntimeKind;
  readonly required?: boolean;
  readonly isAvailable?: () => boolean;
  readonly getModule: () => RuntimeClientModule;
}
