import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AgentRunConfig } from "./agent-run-config.js";
import type { AgentRunCommandObserver } from "./agent-run-command-observer.js";
import type { AgentOperationResult } from "./agent-operation-result.js";

/** Isolates command-observer delivery from AgentRun input ownership. */
export const dispatchUserMessageForwarded = (input: {
  observers: readonly AgentRunCommandObserver[];
  runId: string;
  runtimeKind: RuntimeKind;
  config: AgentRunConfig;
  platformAgentRunId: string | null;
  message: AgentInputUserMessage;
  turnId: string | null;
  onError(error: unknown): void;
}): void => {
  if (!input.observers.length) return;
  const result: AgentOperationResult = {
    accepted: true,
    turnId: input.turnId,
    platformAgentRunId: input.platformAgentRunId,
  };
  const payload = {
    runId: input.runId,
    runtimeKind: input.runtimeKind,
    config: input.config,
    platformAgentRunId: input.platformAgentRunId,
    message: input.message,
    result,
    forwardedAt: new Date(),
  };
  for (const observer of input.observers) {
    try {
      void Promise.resolve(observer.onUserMessageForwarded(payload)).catch(input.onError);
    } catch (error) {
      input.onError(error);
    }
  }
};
