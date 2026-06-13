import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import {
  getSendMessageToDispatcher,
  type SendMessageToDispatcher,
} from "../../agent-communication/services/send-message-to-dispatcher.js";
import { SEND_MESSAGE_TO_TOOL_NAME } from "../../agent-communication/services/send-message-to-tool-contract.js";
import type {
  AgentToolMcpSession,
  AgentToolMcpToolExecutionEvent,
} from "./agent-tool-mcp-session.js";

export type ExecuteAgentToolMcpCallInput = {
  session: AgentToolMcpSession;
  toolName: string;
  rawArguments: Record<string, unknown>;
};

export class AgentToolMcpToolExecutor {
  private static instance: AgentToolMcpToolExecutor | null = null;
  private readonly sendMessageDispatcher: SendMessageToDispatcher;

  static getInstance(): AgentToolMcpToolExecutor {
    if (!AgentToolMcpToolExecutor.instance) {
      AgentToolMcpToolExecutor.instance = new AgentToolMcpToolExecutor();
    }
    return AgentToolMcpToolExecutor.instance;
  }

  static resetInstance(): void {
    AgentToolMcpToolExecutor.instance = null;
  }

  constructor(deps: { sendMessageDispatcher?: SendMessageToDispatcher } = {}) {
    this.sendMessageDispatcher = deps.sendMessageDispatcher ?? getSendMessageToDispatcher();
  }

  async executeAgentToolMcpCall(
    input: ExecuteAgentToolMcpCallInput,
  ): Promise<AgentOperationResult> {
    const event = this.buildExecutionEvent(input.session, input.toolName);
    await this.notifyStart(input.session, event);
    try {
      const result = await this.executeKnownTool(input);
      await this.notifyComplete(input.session, event, result);
      return result;
    } catch (error) {
      await this.notifyError(input.session, event, error);
      throw error;
    }
  }

  private async executeKnownTool(
    input: ExecuteAgentToolMcpCallInput,
  ): Promise<AgentOperationResult> {
    if (input.toolName === SEND_MESSAGE_TO_TOOL_NAME) {
      return this.sendMessageDispatcher.dispatch({
        toolName: SEND_MESSAGE_TO_TOOL_NAME,
        rawArguments: input.rawArguments,
        sender: input.session.sender,
      });
    }
    throw new Error(`Unsupported Agent Tools MCP executor '${input.toolName}'.`);
  }

  private buildExecutionEvent(
    session: AgentToolMcpSession,
    toolName: string,
  ): AgentToolMcpToolExecutionEvent {
    return {
      sessionId: session.sessionId,
      toolName,
      senderRunId: session.sender.senderRunId,
    };
  }

  private async notifyStart(
    session: AgentToolMcpSession,
    event: AgentToolMcpToolExecutionEvent,
  ): Promise<void> {
    await session.toolExecutionObserver?.onToolStart?.(event);
  }

  private async notifyComplete(
    session: AgentToolMcpSession,
    event: AgentToolMcpToolExecutionEvent,
    result: AgentOperationResult,
  ): Promise<void> {
    await session.toolExecutionObserver?.onToolComplete?.({
      ...event,
      accepted: result.accepted,
      code: result.code ?? null,
    });
  }

  private async notifyError(
    session: AgentToolMcpSession,
    event: AgentToolMcpToolExecutionEvent,
    error: unknown,
  ): Promise<void> {
    const message = error instanceof Error ? error.message : "Tool execution failed.";
    await session.toolExecutionObserver?.onToolError?.({ ...event, message });
  }
}

export const getAgentToolMcpToolExecutor = (): AgentToolMcpToolExecutor =>
  AgentToolMcpToolExecutor.getInstance();

export const resetAgentToolMcpToolExecutorForTests = (): void => {
  AgentToolMcpToolExecutor.resetInstance();
};
