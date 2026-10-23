import { ensureListAvailableAgentsToolRegistered } from "./list-available-agents-tool.js";
import { ensureListAvailableNodesToolRegistered } from "./list-available-nodes-tool.js";

/** The opt-in discovery tools in the tool registry (so they appear in the tool picker): agents, and peer nodes. */
export function registerAgentDiscoveryTools(): void {
  ensureListAvailableAgentsToolRegistered();
  ensureListAvailableNodesToolRegistered();
}
