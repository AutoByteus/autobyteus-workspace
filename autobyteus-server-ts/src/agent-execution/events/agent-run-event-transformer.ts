import type { AgentRunContext, RuntimeAgentRunContext } from "../domain/agent-run-context.js";
import type { AgentRunEvent } from "../domain/agent-run-event.js";

export interface AgentRunEventTransformerInput {
  runContext: AgentRunContext<RuntimeAgentRunContext>;
  events: readonly AgentRunEvent[];
}

export interface AgentRunEventTransformer {
  transform(input: AgentRunEventTransformerInput): AgentRunEvent[] | Promise<AgentRunEvent[]>;
}
