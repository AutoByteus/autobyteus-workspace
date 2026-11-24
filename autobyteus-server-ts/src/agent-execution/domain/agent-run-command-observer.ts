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
  /**
   * When the node admitted the input (autobyteus-628 SR-006): the time its message is recorded at. Admission comes before
   * the input's platform notice is taken and published, so a stored message never sorts after its own notice.
   */
  acceptedAt: Date;
};

export interface AgentRunCommandObserver {
  onUserMessageForwarded(payload: AgentRunUserMessageForwardedPayload): void | Promise<void>;
}
