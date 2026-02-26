import { AgentInputUserMessage } from "../../agent/message/agent-input-user-message.js";
import { InterAgentMessage } from "../../agent/message/inter-agent-message.js";
import type {
  InterAgentMessageRequestEvent,
  ProcessUserMessageEvent,
  ToolApprovalTeamEvent,
} from "../events/agent-team-events.js";
import { TeamNodeNotLocalException } from "../exceptions.js";
import type { TeamRoutingDispatchResult, TeamRoutingPort } from "../ports/team-routing-port.js";

type ManagedNode = {
  postUserMessage?: (message: ProcessUserMessageEvent["userMessage"]) => Promise<void>;
  postMessage?: (message: ProcessUserMessageEvent["userMessage"] | AgentInputUserMessage) => Promise<void>;
  postInterAgentMessage?: (message: InterAgentMessage) => Promise<void>;
  postToolExecutionApproval?:
    | ((toolInvocationId: string, isApproved: boolean, reason?: string) => Promise<void>)
    | ((agentName: string, toolInvocationId: string, isApproved: boolean, reason?: string) => Promise<void>);
  context?: { config?: { role?: string } };
  agentId?: string;
};

const rejected = (errorCode: string, errorMessage: string): TeamRoutingDispatchResult => ({
  accepted: false,
  errorCode,
  errorMessage,
});

const mapDispatchError = (
  error: unknown,
  defaultErrorCode: string,
): TeamRoutingDispatchResult => {
  if (error instanceof TeamNodeNotLocalException) {
    return rejected("TARGET_NODE_NOT_LOCAL", error.message);
  }
  return rejected(defaultErrorCode, String(error));
};

export const createLocalTeamRoutingPortAdapter = (deps: {
  ensureNodeIsReady: (nameOrAgentId: string) => Promise<ManagedNode>;
}): TeamRoutingPort => {
  return {
    dispatchUserMessage: async (event: ProcessUserMessageEvent): Promise<TeamRoutingDispatchResult> => {
      try {
        const targetNode = await deps.ensureNodeIsReady(event.targetAgentName);
        if (typeof targetNode.postUserMessage === "function") {
          await targetNode.postUserMessage(event.userMessage);
          return { accepted: true };
        }
        if (typeof targetNode.postMessage === "function") {
          await targetNode.postMessage(event.userMessage);
          return { accepted: true };
        }
        return rejected(
          "LOCAL_USER_MESSAGE_UNSUPPORTED_TARGET",
          `Target node '${event.targetAgentName}' does not support user message dispatch.`,
        );
      } catch (error) {
        return mapDispatchError(error, "LOCAL_USER_MESSAGE_FAILED");
      }
    },

    dispatchInterAgentMessageRequest: async (
      event: InterAgentMessageRequestEvent,
    ): Promise<TeamRoutingDispatchResult> => {
      try {
        const targetNode = await deps.ensureNodeIsReady(event.recipientName);

        if (typeof targetNode.postMessage === "function") {
          await targetNode.postMessage(new AgentInputUserMessage(event.content));
          return { accepted: true };
        }

        if (typeof targetNode.postInterAgentMessage === "function") {
          const recipientRole = targetNode.context?.config?.role ?? "";
          const recipientAgentId = targetNode.agentId ?? "";
          const messageForAgent = InterAgentMessage.createWithDynamicMessageType(
            recipientRole,
            recipientAgentId,
            event.content,
            event.messageType,
            event.senderAgentId,
          );
          await targetNode.postInterAgentMessage(messageForAgent);
          return { accepted: true };
        }

        return rejected(
          "LOCAL_INTER_AGENT_UNSUPPORTED_TARGET",
          `Target node '${event.recipientName}' does not support inter-agent message dispatch.`,
        );
      } catch (error) {
        return mapDispatchError(error, "LOCAL_INTER_AGENT_DISPATCH_FAILED");
      }
    },

    dispatchToolApproval: async (event: ToolApprovalTeamEvent): Promise<TeamRoutingDispatchResult> => {
      try {
        const targetNode = await deps.ensureNodeIsReady(event.agentName);
        if (typeof targetNode.postToolExecutionApproval !== "function") {
          return rejected(
            "LOCAL_TOOL_APPROVAL_UNSUPPORTED_TARGET",
            `Target node '${event.agentName}' does not support tool approval dispatch.`,
          );
        }

        // Agent handles direct approval calls; sub-team acts as a proxy and requires agentName.
        if (typeof targetNode.agentId === "string" && targetNode.agentId.length > 0) {
          await (
            targetNode.postToolExecutionApproval as (
              toolInvocationId: string,
              isApproved: boolean,
              reason?: string,
            ) => Promise<void>
          )(event.toolInvocationId, event.isApproved, event.reason);
        } else {
          await (
            targetNode.postToolExecutionApproval as (
              agentName: string,
              toolInvocationId: string,
              isApproved: boolean,
              reason?: string,
            ) => Promise<void>
          )(event.agentName, event.toolInvocationId, event.isApproved, event.reason);
        }
        return { accepted: true };
      } catch (error) {
        return mapDispatchError(error, "LOCAL_TOOL_APPROVAL_FAILED");
      }
    },

    dispatchControlStop: async (): Promise<TeamRoutingDispatchResult> =>
      rejected(
        "UNSUPPORTED_LOCAL_ROUTE",
        "dispatchControlStop is not supported by local team routing adapter.",
      ),
  };
};
