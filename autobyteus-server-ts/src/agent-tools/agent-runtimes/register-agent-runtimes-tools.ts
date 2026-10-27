import { ensureListAvailableAgentRuntimesToolRegistered } from "./list-available-agent-runtimes-tool.js";
import { ensureSubmitLaunchChoicesToolRegistered } from "../model-routing/submit-launch-choices-tool.js";

/**
 * The opt-in agent runtimes tool and the Model Router's decision tool (autobyteus-32) in the tool registry (so they
 * appear in the tool picker; an agent gets one only when its definition lists it).
 */
export function registerAgentRuntimesTools(): void {
  ensureListAvailableAgentRuntimesToolRegistered();
  ensureSubmitLaunchChoicesToolRegistered();
}
