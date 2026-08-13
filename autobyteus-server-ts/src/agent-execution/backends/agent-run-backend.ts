import type { AgentOperationResult } from "../domain/agent-operation-result.js";
import type { AgentRunContext, RuntimeAgentRunContext } from "../domain/agent-run-context.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AgentRunEvent } from "../domain/agent-run-event.js";
import type { AgentRuntimeLifecycleSnapshot } from "../domain/agent-runtime-lifecycle-snapshot.js";
import type {
  AgentRunBackendInputCapabilities,
  AgentRunBackendInputDispatch,
  AgentRunBackendInputDispatchResult,
} from "../input/agent-run-input-contract.js";

export type AgentRunSourceEventBatchListener = (
  events: readonly AgentRunEvent[],
) => void | Promise<void>;
export type AgentRunSourceEventBatchUnsubscribe = () => void;

export interface AgentRunBackend {
  readonly runId: string;
  readonly runtimeKind: RuntimeKind;
  readonly inputCapabilities: AgentRunBackendInputCapabilities;

  getContext(): AgentRunContext<RuntimeAgentRunContext>;
  isActive(): boolean;
  getPlatformAgentRunId(): string | null;
  getLifecycleSnapshot(): AgentRuntimeLifecycleSnapshot;
  subscribeToSourceEventBatches(
    listener: AgentRunSourceEventBatchListener,
  ): AgentRunSourceEventBatchUnsubscribe;
  dispatchUserInput(
    dispatch: AgentRunBackendInputDispatch,
  ): Promise<AgentRunBackendInputDispatchResult>;
  approveToolInvocation(
    invocationId: string,
    approved: boolean,
    reason?: string | null,
  ): Promise<AgentOperationResult>;
  interrupt(turnId?: string | null): Promise<AgentOperationResult>;
  terminate(): Promise<AgentOperationResult>;
}
