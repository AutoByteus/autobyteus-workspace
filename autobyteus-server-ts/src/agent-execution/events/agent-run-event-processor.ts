import type { AgentRunContext, RuntimeAgentRunContext } from "../domain/agent-run-context.js";
import type { AgentRunEvent } from "../domain/agent-run-event.js";

export interface AgentRunEventProcessorInput {
  runContext: AgentRunContext<RuntimeAgentRunContext>;
  events: readonly AgentRunEvent[];
  sourceEvents: readonly AgentRunEvent[];
}

export interface AgentRunEventProcessor {
  process(input: AgentRunEventProcessorInput): AgentRunEvent[] | Promise<AgentRunEvent[]>;
}
