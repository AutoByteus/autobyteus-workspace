import type { AgentApiStatus } from "../../agent-execution/domain/agent-status-payload.js";

export type TeamStatusPayload = {
  status: AgentApiStatus;
  source_path?: string[];
  source_route_key?: string;
};
