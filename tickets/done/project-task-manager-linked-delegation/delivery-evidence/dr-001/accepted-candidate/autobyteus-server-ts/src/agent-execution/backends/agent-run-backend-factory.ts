import type { AgentRunConfig } from "../domain/agent-run-config.js";
import type { AgentRunContext, RuntimeAgentRunContext } from "../domain/agent-run-context.js";
import type { AgentRunBackendPreparation } from "./agent-run-backend-preparation.js";

export type AgentRunBackendPreparationRequest =
  | Readonly<{ kind: "new"; runId: string; config: AgentRunConfig }>
  | Readonly<{ kind: "restore"; context: AgentRunContext<RuntimeAgentRunContext> }>;

export interface AgentRunBackendFactory {
  /** Returns before acquiring any provider resource. */
  beginPreparation(request: AgentRunBackendPreparationRequest): AgentRunBackendPreparation;
}
