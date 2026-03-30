import type { AgentRunConfig } from "../domain/agent-run-config.js";
import type { AgentRunContext, RuntimeAgentRunContext } from "../domain/agent-run-context.js";
import type { AgentRunBackend } from "./agent-run-backend.js";

export interface AgentRunBackendFactory {
  createBackend(config: AgentRunConfig, preferredRunId?: string | null): Promise<AgentRunBackend>;
  restoreBackend(context: AgentRunContext<RuntimeAgentRunContext>): Promise<AgentRunBackend>;
}
