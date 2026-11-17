import { ConfiguredAgentExecutionHandle } from "./configured-agent-execution-handle.js";
import type { StoredModelStartChecks } from "../../../llm-management/services/run-model-selection-refusal.js";

export type ConfiguredAgentExecutionHandleInput = Omit<ConstructorParameters<typeof ConfiguredAgentExecutionHandle>[0], "storedModelChecks">;

/** Creates a root's member agents, each with the host's stored-model checks (G-5), from the composition. */
export class ConfiguredAgentExecutionFactory {
  constructor(private readonly dependencies: Readonly<{ storedModelChecks: StoredModelStartChecks }>) {
    if (!dependencies?.storedModelChecks) throw new Error("ConfiguredAgentExecutionFactory needs the stored-model checks.");
  }

  create(input: ConfiguredAgentExecutionHandleInput): ConfiguredAgentExecutionHandle {
    return new ConfiguredAgentExecutionHandle({ ...input, storedModelChecks: this.dependencies.storedModelChecks });
  }
}
