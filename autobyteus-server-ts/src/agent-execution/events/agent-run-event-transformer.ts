import type { AgentRunContext, RuntimeAgentRunContext } from "../domain/agent-run-context.js";
import type { AgentRunEvent } from "../domain/agent-run-event.js";
import type { AgentRuntimeLifecycleSnapshot } from "../domain/agent-runtime-lifecycle-snapshot.js";
import type { AgentTurnLifecycleState } from "./processors/lifecycle-status/agent-turn-lifecycle-state.js";
import type { AgentSegmentLifecycleState } from "./processors/segment-lifecycle/agent-segment-lifecycle-state.js";

export interface AgentRunEventTransformerInput {
  runContext: AgentRunContext<RuntimeAgentRunContext>;
  events: readonly AgentRunEvent[];
  lifecycleState?: AgentTurnLifecycleState;
  segmentLifecycleState?: AgentSegmentLifecycleState;
  runtimeLifecycleSnapshot?: AgentRuntimeLifecycleSnapshot;
}

export interface AgentRunEventTransformer {
  transform(input: AgentRunEventTransformerInput): AgentRunEvent[] | Promise<AgentRunEvent[]>;
}
