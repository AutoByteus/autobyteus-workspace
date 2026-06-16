import type { AgentToolMcpExecutionResult } from "./agent-tool-mcp-adapter.js";
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
  ): Promise<AgentToolMcpExecutionResult> {
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
  ): Promise<AgentToolMcpExecutionResult> {
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
    result: AgentToolMcpExecutionResult,
  ): Promise<void> {
    await session.toolExecutionObserver?.onToolComplete?.({
      ...event,
      accepted: isExecutionResultAccepted(result),
      code: executionResultCode(result),
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

const isExecutionResultAccepted = (result: AgentToolMcpExecutionResult): boolean =>
  result.kind === "operation_result" ? result.result.accepted : result.result.isError !== true;

const executionResultCode = (result: AgentToolMcpExecutionResult): string | null =>
  result.kind === "operation_result" ? result.result.code ?? null : null;
