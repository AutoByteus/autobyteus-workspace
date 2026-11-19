import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentRunMessageSenderContext } from "../domain/agent-run-message-sender.js";
import { describeSendMessageTargetSelector } from "../domain/send-message-target-selector.js";
import { collaborationErrorTextForAgent, isCollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import {
  type GlobalAgentRunMessageDeliveryInput,
  GlobalAgentRunMessageRouter,
} from "./global-agent-run-message-router.js";
import {
  parseSendMessageToToolArguments,
  validateParsedSendMessageToToolArguments,
} from "./send-message-to-tool-argument-parser.js";
import { SEND_MESSAGE_TO_TOOL_NAME } from "./send-message-to-tool-contract.js";
import { assertAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";

export type SendMessageToDispatcherInput = {
  toolName?: string | null;
  rawArguments: Record<string, unknown>;
  sender: AgentRunMessageSenderContext;
};

export class SendMessageToDispatcher {
  private static instance: SendMessageToDispatcher | null = null;

  /** The composition root creates the process dispatcher with its address resolution (SR-047 step 8); the returned function releases it. */
  static setProcessInstance(dispatcher: SendMessageToDispatcher): () => void {
    SendMessageToDispatcher.instance = dispatcher;
    return () => { if (SendMessageToDispatcher.instance === dispatcher) SendMessageToDispatcher.instance = null; };
  }

  /** The process dispatcher; its callers are older lookups (FU-011). */
  static getInstance(): SendMessageToDispatcher {
    if (!SendMessageToDispatcher.instance) throw new Error("The send_message_to dispatcher is created by the composition root.");
    return SendMessageToDispatcher.instance;
  }

  constructor(private readonly deps: {
    globalRouter: GlobalAgentRunMessageRouter;
    /** Contract §2.3 step 2 (an address of the run that assigned the sender's Task); created by the composition root. */
    /** The sender's collaboration tree resolves an address beyond its own run (step 2 and the correction, SR-060). */
    tree: Pick<DelegationIndex, "collaborationTreeOf">;
  }) {}

  async dispatch(input: SendMessageToDispatcherInput): Promise<AgentOperationResult> {
    const toolName = input.toolName?.trim() || SEND_MESSAGE_TO_TOOL_NAME;
    const parsed = parseSendMessageToToolArguments(input.rawArguments);
    const validationError = validateParsedSendMessageToToolArguments(toolName, parsed);
    if (validationError) {
      return {
        accepted: false,
        code: validationError.code,
        message: validationError.message,
      };
    }
    if (!parsed.target || !parsed.content) {
      return {
        accepted: false,
        code: "INVALID_TOOL_ARGUMENTS",
        message: `${toolName} requires exactly one target selector and non-empty content.`,
      };
    }

    const content = parsed.content.trim();
    if (parsed.target.kind === "target_agent_run_id") {
      return this.globalRouter.deliver({
        sender: input.sender,
        targetAgentRunId: parsed.target.targetAgentRunId,
        ...(parsed.node !== null ? { node: parsed.node } : {}),
        content,
        messageType: parsed.messageType,
        referenceFiles: parsed.referenceFiles,
      } satisfies GlobalAgentRunMessageDeliveryInput);
    }

    const memberExecutionContext = input.sender.memberExecutionContext;
    const delivery = memberExecutionContext?.collaboration.deliverLogicalMessage ?? null;
    if (!memberExecutionContext || !delivery) {
      return {
        accepted: false,
        code: "COLLABORATION_CONTEXT_REQUIRED",
        message: `${toolName} recipient_address delivery requires an active collaboration context.`,
      };
    }

    const recipientAddress = parsed.target.recipientAddress;
    let result: AgentOperationResult;
    try {
      result = await delivery({ recipientAddress: assertAgentTeamAddress(recipientAddress), content, messageType: parsed.messageType, referenceFiles: parsed.referenceFiles });
    } catch (error) {
      if (!isCollaborationContractError(error)) {
        throw error;
      }
      result = { accepted: false, code: error.code, message: collaborationErrorTextForAgent(error, "send_message_to") };
    }
    if (!result.accepted && result.code === "COLLABORATION_TARGET_NOT_FOUND") {
      result = await this.beyondOwnRun({ sender: input.sender, address: recipientAddress, content, messageType: parsed.messageType,
        referenceFiles: parsed.referenceFiles }) ?? result;
    }
    if (!result.accepted) {
      return result;
    }
    return {
      ...result,
      code: result.code ?? "DELIVERED",
      message: result.message ?? `Delivered message to ${describeSendMessageTargetSelector(parsed.target)}.`,
    };
  }

  /** Contract §2.3 step 2 and the old-address correction, for a run that works on a Task; `null`: not found there either. */
  private async beyondOwnRun(input: Readonly<{ sender: AgentRunMessageSenderContext; address: string; content: string;
    messageType: string | null | undefined; referenceFiles: string[] | null | undefined }>): Promise<AgentOperationResult | null> {
    const identity = input.sender.memberExecutionContext!.identity;
    let agentRunId: string | null | undefined;
    try {
      agentRunId = await this.deps.tree.collaborationTreeOf(identity.root).resolve(input.address);
    } catch (error) {
      if (!isCollaborationContractError(error)) throw error;
      return { accepted: false, code: error.code, message: error.message };
    }
    return agentRunId ? this.globalRouter.deliver({ sender: input.sender, targetAgentRunId: agentRunId, content: input.content,
      messageType: input.messageType, referenceFiles: input.referenceFiles, shownAs: input.address }) : null;
  }

  private get globalRouter(): GlobalAgentRunMessageRouter {
    return this.deps.globalRouter;
  }
}

export const getSendMessageToDispatcher = (): SendMessageToDispatcher =>
  SendMessageToDispatcher.getInstance();
