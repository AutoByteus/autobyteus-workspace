import type { AgentRunContext, RuntimeAgentRunContext } from "../domain/agent-run-context.js";
import type { AgentRunEvent } from "../domain/agent-run-event.js";
import type { AgentRuntimeLifecycleSnapshot } from "../domain/agent-runtime-lifecycle-snapshot.js";
import type { AgentRunEventPipeline } from "./agent-run-event-pipeline.js";
import { getDefaultAgentRunEventPipeline } from "./default-agent-run-event-pipeline.js";
import { AgentRunEventDispatchQueue } from "./agent-run-event-dispatch-queue.js";
import type { AgentTurnLifecycleState } from "./processors/lifecycle-status/agent-turn-lifecycle-state.js";
import type { AgentSegmentLifecycleState } from "./processors/segment-lifecycle/agent-segment-lifecycle-state.js";

export const dispatchProcessedAgentRunEvents = async (input: {
  runContext: AgentRunContext<RuntimeAgentRunContext>;
  /** Delivers one processed event to the run's listeners (the run stamps its time there). */
  deliver: (event: AgentRunEvent) => void;
  events: readonly AgentRunEvent[];
  pipeline?: AgentRunEventPipeline;
  dispatchQueue: AgentRunEventDispatchQueue;
  lifecycleState: AgentTurnLifecycleState;
  segmentLifecycleState: AgentSegmentLifecycleState;
  getRuntimeLifecycleSnapshot: () => AgentRuntimeLifecycleSnapshot;
  /** The run's running-background-task count now; set on the lifecycle state before the batch's statuses are built. */
  getBackgroundTasksRunning: () => number;
  onCanonicalEventsDispatched?: (events: readonly AgentRunEvent[]) => void;
}): Promise<void> => {
  if (input.events.length === 0) {
    return;
  }

  await input.dispatchQueue.enqueue(
    input.runContext.runId,
    async () => {
      const runtimeLifecycleSnapshot = input.getRuntimeLifecycleSnapshot();
      input.lifecycleState.observeBackgroundTasksRunning(input.getBackgroundTasksRunning());
      const finalEvents = await (input.pipeline ?? getDefaultAgentRunEventPipeline()).process({
        runContext: input.runContext,
        events: input.events,
        lifecycleState: input.lifecycleState,
        segmentLifecycleState: input.segmentLifecycleState,
        runtimeLifecycleSnapshot,
      });

      for (const event of finalEvents) input.deliver(event);
      input.onCanonicalEventsDispatched?.(finalEvents);
    },
  );
};
