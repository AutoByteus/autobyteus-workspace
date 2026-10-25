import { ensureListAvailableAgentRuntimesToolRegistered } from "./list-available-agent-runtimes-tool.js";

/** The opt-in agent runtimes tool in the tool registry (so it appears in the tool picker). */
export function registerAgentRuntimesTools(): void {
  ensureListAvailableAgentRuntimesToolRegistered();
}
