import { ensureListAvailableAgentsToolRegistered } from "./list-available-agents-tool.js";
import { ensureListPeerNodesToolRegistered } from "./list-peer-nodes-tool.js";
import { ensureListRunningAgentsToolRegistered } from "./list-running-agents-tool.js";

/** The opt-in discovery tools in the tool registry (so they appear in the tool picker): agents, peer nodes, running agents. */
export function registerAgentDiscoveryTools(): void {
  ensureListAvailableAgentsToolRegistered();
  ensureListPeerNodesToolRegistered();
  ensureListRunningAgentsToolRegistered();
}
