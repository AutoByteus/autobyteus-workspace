import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../domain/agent-operation-result.js";
import type { AgentRunContext, RuntimeAgentRunContext } from "../domain/agent-run-context.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";

export type AgentRunEventListener = (event: unknown) => void;
export type AgentRunEventUnsubscribe = () => void;

export interface AgentRunBackend {
  readonly runId: string;
  readonly runtimeKind: RuntimeKind;

  getContext(): AgentRunContext<RuntimeAgentRunContext>;
  isActive(): boolean;
  getPlatformAgentRunId(): string | null;
  getStatus(): string | null;
  subscribeToEvents(listener: AgentRunEventListener): AgentRunEventUnsubscribe;
  postUserMessage(message: AgentInputUserMessage): Promise<AgentOperationResult>;
  approveToolInvocation(
    invocationId: string,
    approved: boolean,
    reason?: string | null,
  ): Promise<AgentOperationResult>;
  interrupt(turnId?: string | null): Promise<AgentOperationResult>;
  terminate(): Promise<AgentOperationResult>;
}
