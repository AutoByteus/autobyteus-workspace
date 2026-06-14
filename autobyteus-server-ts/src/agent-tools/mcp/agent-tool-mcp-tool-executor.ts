import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import {
  AgentToolMcpCatalog,
  getAgentToolMcpCatalog,
} from "./agent-tool-mcp-catalog.js";
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
  private readonly catalog: AgentToolMcpCatalog;

  static getInstance(): AgentToolMcpToolExecutor {
    if (!AgentToolMcpToolExecutor.instance) {
      AgentToolMcpToolExecutor.instance = new AgentToolMcpToolExecutor();
    }
    return AgentToolMcpToolExecutor.instance;
  }

  static resetInstance(): void {
    AgentToolMcpToolExecutor.instance = null;
  }

  constructor(deps: { catalog?: AgentToolMcpCatalog } = {}) {
    this.catalog = deps.catalog ?? getAgentToolMcpCatalog();
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
    const availability = this.catalog.resolveToolCallAvailability(input.session, input.toolName);
    if (!availability.ok) {
      throw new Error(
        availability.reason === "unknown_tool"
          ? `Unknown Agent Tools MCP tool '${input.toolName}'.`
          : `Agent Tools MCP tool '${input.toolName}' is not enabled for this session.`,
      );
    }
    return availability.adapter.execute({
      session: input.session,
      rawArguments: input.rawArguments,
    });
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
