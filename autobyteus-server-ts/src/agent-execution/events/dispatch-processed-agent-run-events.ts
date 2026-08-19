import type { AgentRunContext, RuntimeAgentRunContext } from "../domain/agent-run-context.js";
import type { AgentRunEvent } from "../domain/agent-run-event.js";
import type { AgentRuntimeLifecycleSnapshot } from "../domain/agent-runtime-lifecycle-snapshot.js";
import { dispatchRuntimeEvent } from "../backends/shared/runtime-event-dispatch.js";
import type { AgentRunEventPipeline } from "./agent-run-event-pipeline.js";
import { getDefaultAgentRunEventPipeline } from "./default-agent-run-event-pipeline.js";
import { AgentRunEventDispatchQueue } from "./agent-run-event-dispatch-queue.js";
import type { AgentTurnLifecycleState } from "./processors/lifecycle-status/agent-turn-lifecycle-state.js";
import type { AgentSegmentLifecycleState } from "./processors/segment-lifecycle/agent-segment-lifecycle-state.js";

export const dispatchProcessedAgentRunEvents = async (input: {
  runContext: AgentRunContext<RuntimeAgentRunContext>;
  listeners: Set<(event: AgentRunEvent) => void>;
  events: readonly AgentRunEvent[];
  pipeline?: AgentRunEventPipeline;
  dispatchQueue: AgentRunEventDispatchQueue;
  lifecycleState: AgentTurnLifecycleState;
  segmentLifecycleState: AgentSegmentLifecycleState;
  getRuntimeLifecycleSnapshot: () => AgentRuntimeLifecycleSnapshot;
  onCanonicalEventsDispatched?: (events: readonly AgentRunEvent[]) => void;
  onListenerError?: (error: unknown) => void;
}): Promise<void> => {
  if (input.events.length === 0) {
    return;
  }

  await input.dispatchQueue.enqueue(
    input.runContext.runId,
    async () => {
      const runtimeLifecycleSnapshot = input.getRuntimeLifecycleSnapshot();
      const finalEvents = await (input.pipeline ?? getDefaultAgentRunEventPipeline()).process({
        runContext: input.runContext,
        events: input.events,
        lifecycleState: input.lifecycleState,
        segmentLifecycleState: input.segmentLifecycleState,
        runtimeLifecycleSnapshot,
      });

      for (const event of finalEvents) {
        dispatchRuntimeEvent({
          listeners: input.listeners,
          event,
          onListenerError: input.onListenerError,
        });
      }
      input.onCanonicalEventsDispatched?.(finalEvents);
    },
  );
};
