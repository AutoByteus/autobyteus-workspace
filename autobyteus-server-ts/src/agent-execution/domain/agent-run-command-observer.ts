import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AgentOperationResult } from "./agent-operation-result.js";
import type { AgentRunConfig } from "./agent-run-config.js";

export type AgentRunUserMessageForwardedPayload = {
  runId: string;
  runtimeKind: RuntimeKind;
  config: AgentRunConfig;
  platformAgentRunId: string | null;
  message: AgentInputUserMessage;
  result: AgentOperationResult;
  forwardedAt: Date;
};

export interface AgentRunCommandObserver {
  onUserMessageForwarded(payload: AgentRunUserMessageForwardedPayload): void | Promise<void>;
}
