import type { AgentRunContext, RuntimeAgentRunContext } from "../domain/agent-run-context.js";
import type { AgentRunEvent } from "../domain/agent-run-event.js";
import { dispatchRuntimeEvent } from "../backends/shared/runtime-event-dispatch.js";
import type { AgentRunEventPipeline } from "./agent-run-event-pipeline.js";
import { getDefaultAgentRunEventPipeline } from "./default-agent-run-event-pipeline.js";

export const dispatchProcessedAgentRunEvents = async (input: {
  runContext: AgentRunContext<RuntimeAgentRunContext>;
  listeners: Set<(event: unknown) => void>;
  events: readonly AgentRunEvent[];
  pipeline?: AgentRunEventPipeline;
  onListenerError?: (error: unknown) => void;
}): Promise<void> => {
  if (input.events.length === 0) {
    return;
  }

  const finalEvents = await (input.pipeline ?? getDefaultAgentRunEventPipeline()).process({
    runContext: input.runContext,
    events: input.events,
  });

  for (const event of finalEvents) {
    dispatchRuntimeEvent({
      listeners: input.listeners,
      event,
      onListenerError: input.onListenerError,
    });
  }
};
