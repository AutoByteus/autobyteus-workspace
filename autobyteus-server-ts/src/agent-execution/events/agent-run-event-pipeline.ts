import type { AgentRunContext, RuntimeAgentRunContext } from "../domain/agent-run-context.js";
import type { AgentRunEvent } from "../domain/agent-run-event.js";
import type { AgentRuntimeLifecycleSnapshot } from "../domain/agent-runtime-lifecycle-snapshot.js";
import type { AgentTurnLifecycleState } from "./processors/lifecycle-status/agent-turn-lifecycle-state.js";
import type { AgentRunEventProcessor } from "./agent-run-event-processor.js";
import type { AgentRunEventTransformer } from "./agent-run-event-transformer.js";

export class AgentRunEventPipeline {
  constructor(
    private readonly processors: readonly AgentRunEventProcessor[] = [],
    private readonly transformers: readonly AgentRunEventTransformer[] = [],
    private readonly finalizers: readonly AgentRunEventTransformer[] = [],
  ) {}

  async process(input: {
    runContext: AgentRunContext<RuntimeAgentRunContext>;
    events: readonly AgentRunEvent[];
    lifecycleState?: AgentTurnLifecycleState;
    runtimeLifecycleSnapshot?: AgentRuntimeLifecycleSnapshot;
  }): Promise<AgentRunEvent[]> {
    let accumulated = [...input.events];

    for (const transformer of this.transformers) {
      accumulated = await transformer.transform({
        runContext: input.runContext,
        events: accumulated,
        lifecycleState: input.lifecycleState,
        runtimeLifecycleSnapshot: input.runtimeLifecycleSnapshot,
      });
    }

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

    for (const finalizer of this.finalizers) {
      accumulated = await finalizer.transform({
        runContext: input.runContext,
        events: accumulated,
        lifecycleState: input.lifecycleState,
        runtimeLifecycleSnapshot: input.runtimeLifecycleSnapshot,
      });
    }

    return accumulated;
  }
}
