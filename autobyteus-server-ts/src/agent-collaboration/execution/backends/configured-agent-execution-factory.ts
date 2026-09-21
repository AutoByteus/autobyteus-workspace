import { ConfiguredAgentExecutionHandle } from "./configured-agent-execution-handle.js";

export type ConfiguredAgentExecutionHandleInput = ConstructorParameters<typeof ConfiguredAgentExecutionHandle>[0];

export class ConfiguredAgentExecutionFactory {
  create(input: ConfiguredAgentExecutionHandleInput): ConfiguredAgentExecutionHandle {
    return new ConfiguredAgentExecutionHandle(input);
  }
}
