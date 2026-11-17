import { ConfiguredAgentExecutionHandle } from "./configured-agent-execution-handle.js";
import type { StoredModelOfferCheck } from "../../../llm-management/services/run-model-selection-service.js";

export type ConfiguredAgentExecutionHandleInput = Omit<ConstructorParameters<typeof ConfiguredAgentExecutionHandle>[0], "storedModels">;

/** Creates a root's member agents, each with the host's stored-model check (G-5), from the composition. */
export class ConfiguredAgentExecutionFactory {
  constructor(private readonly dependencies: Readonly<{ storedModels: StoredModelOfferCheck }>) {
    if (!dependencies?.storedModels) throw new Error("ConfiguredAgentExecutionFactory needs the stored-model check.");
  }

  create(input: ConfiguredAgentExecutionHandleInput): ConfiguredAgentExecutionHandle {
    return new ConfiguredAgentExecutionHandle({ ...input, storedModels: this.dependencies.storedModels });
  }
}
