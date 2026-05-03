import type { AgentRunContext, RuntimeAgentRunContext } from "../domain/agent-run-context.js";
import type { AgentRunEvent } from "../domain/agent-run-event.js";
import type { AgentRunEventProcessor } from "./agent-run-event-processor.js";

export class AgentRunEventPipeline {
  constructor(private readonly processors: readonly AgentRunEventProcessor[] = []) {}

  async process(input: {
    runContext: AgentRunContext<RuntimeAgentRunContext>;
    events: readonly AgentRunEvent[];
  }): Promise<AgentRunEvent[]> {
    const accumulated = [...input.events];

    for (const processor of this.processors) {
      const sourceEvents = [...accumulated];
      const derivedEvents = await processor.process({
        runContext: input.runContext,
        events: accumulated,
        sourceEvents,
      });
      if (derivedEvents.length > 0) {
        accumulated.push(...derivedEvents);
      }
    }

    return accumulated;
  }
}
