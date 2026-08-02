import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../domain/agent-operation-result.js";
import type { AgentRunContext, RuntimeAgentRunContext } from "../domain/agent-run-context.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AgentRunEvent } from "../domain/agent-run-event.js";
import type { AgentRuntimeLifecycleSnapshot } from "../domain/agent-runtime-lifecycle-snapshot.js";

export type AgentRunSourceEventBatchListener = (
  events: readonly AgentRunEvent[],
) => void | Promise<void>;
export type AgentRunSourceEventBatchUnsubscribe = () => void;

export interface AgentRunBackend {
  readonly runId: string;
  readonly runtimeKind: RuntimeKind;

  getContext(): AgentRunContext<RuntimeAgentRunContext>;
  isActive(): boolean;
  getPlatformAgentRunId(): string | null;
  getLifecycleSnapshot(): AgentRuntimeLifecycleSnapshot;
  subscribeToSourceEventBatches(
    listener: AgentRunSourceEventBatchListener,
  ): AgentRunSourceEventBatchUnsubscribe;
  postUserMessage(message: AgentInputUserMessage): Promise<AgentOperationResult>;
  approveToolInvocation(
    invocationId: string,
    approved: boolean,
    reason?: string | null,
  ): Promise<AgentOperationResult>;
  interrupt(turnId?: string | null): Promise<AgentOperationResult>;
  terminate(): Promise<AgentOperationResult>;
}
