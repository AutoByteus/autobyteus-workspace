import { ensureListAvailableAgentRuntimesToolRegistered } from "./list-available-agent-runtimes-tool.js";
import { ensureSubmitLaunchChoicesToolRegistered } from "../model-routing/submit-launch-choices-tool.js";
import { ensureSubmitRuntimeSwitchToolRegistered } from "../model-routing/submit-runtime-switch-tool.js";

/**
 * The opt-in agent runtimes tool and the Model Router's decision tools (autobyteus-32; the switch answer, autobyteus-646) in the tool registry (so they
 * appear in the tool picker; an agent gets one only when its definition lists it).
 */
export function registerAgentRuntimesTools(): void {
  ensureListAvailableAgentRuntimesToolRegistered();
  ensureSubmitLaunchChoicesToolRegistered();
  ensureSubmitRuntimeSwitchToolRegistered();
}
