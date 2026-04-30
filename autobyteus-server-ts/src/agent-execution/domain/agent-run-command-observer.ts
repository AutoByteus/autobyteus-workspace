import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AgentOperationResult } from "./agent-operation-result.js";
import type { AgentRunConfig } from "./agent-run-config.js";

export type AgentRunUserMessageAcceptedPayload = {
  runId: string;
  runtimeKind: RuntimeKind;
  config: AgentRunConfig;
  platformAgentRunId: string | null;
  message: AgentInputUserMessage;
  result: AgentOperationResult;
  acceptedAt: Date;
};

export interface AgentRunCommandObserver {
  onUserMessageAccepted(payload: AgentRunUserMessageAcceptedPayload): void | Promise<void>;
}
