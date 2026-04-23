import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { InterAgentMessageDeliveryRequest } from "../domain/inter-agent-message-delivery.js";
import { buildInterAgentDeliveryInputMessage } from "./inter-agent-message-runtime-builders.js";

export class InterAgentMessageRouter {
  async deliver(input: {
    recipientRun: AgentRun;
    request: InterAgentMessageDeliveryRequest;
  }): Promise<AgentOperationResult> {
    return input.recipientRun.postUserMessage(
      buildInterAgentDeliveryInputMessage(input.request),
    );
  }
}

let cachedInterAgentMessageRouter: InterAgentMessageRouter | null = null;

export const getInterAgentMessageRouter = (): InterAgentMessageRouter => {
  if (!cachedInterAgentMessageRouter) {
    cachedInterAgentMessageRouter = new InterAgentMessageRouter();
  }
  return cachedInterAgentMessageRouter;
};
