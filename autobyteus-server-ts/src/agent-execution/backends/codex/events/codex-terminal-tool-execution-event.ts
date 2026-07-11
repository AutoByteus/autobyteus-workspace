import type { AgentRunEvent } from "../../../domain/agent-run-event.js";
import { AgentRunEventType } from "../../../domain/agent-run-event.js";
import type { JsonObject } from "../codex-app-server-json.js";
import { normalizeCodexAgentToolsToolNameForEvent } from "../agent-tools-mcp/codex-agent-tools-mcp-materializer.js";
import { serializeCodexItemEventPayload } from "../agent-tools-mcp/codex-agent-tools-mcp-event-payload.js";
import {
  resolveCodexExplicitProviderError,
  resolveCodexProjectedToolResult,
} from "./codex-mcp-tool-result-projection.js";

export type CodexTerminalToolExecutionEventContext = {
  createEvent: (
    codexEventName: string,
    eventType: AgentRunEventType,
    payload: Record<string, unknown>,
  ) => AgentRunEvent;
  resolveItemType: (payload: JsonObject) => string | null;
  resolveInvocationId: (payload: JsonObject) => string | null;
  resolveTurnId: (payload: JsonObject) => string | null;
  resolveToolName: (
    payload: JsonObject,
    fallback?: "run_bash" | "edit_file",
  ) => string | null;
  resolveToolArguments: (
    payload: JsonObject,
    fallbackToolName: "run_bash" | "edit_file",
  ) => Record<string, unknown>;
  resolveDynamicToolArguments: (payload: JsonObject) => Record<string, unknown>;
  hasExplicitToolArguments: (payload: JsonObject) => boolean;
  resolveExecutionStatus: (payload: JsonObject) => string | null;
  resolveToolDecisionReason: (payload: JsonObject) => string | null;
  resolveToolError: (payload: JsonObject) => string;
  resolveToolResult: (payload: JsonObject) => unknown;
  isExecutionFailure: (payload: JsonObject) => boolean;
};

const omitResultField = (
  payload: Record<string, unknown>,
): Record<string, unknown> => {
  const { result: _result, ...rest } = payload;
  return rest;
};

export const createTerminalToolExecutionEvent = (
  context: CodexTerminalToolExecutionEventContext,
  codexEventName: string,
  payload: JsonObject,
  fallbackToolName?: "run_bash" | "edit_file",
): AgentRunEvent => {
  const invocationId = context.resolveInvocationId(payload);
  const turnId = context.resolveTurnId(payload);
  const rawToolName = context.resolveToolName(payload, fallbackToolName);
  const toolName = normalizeCodexAgentToolsToolNameForEvent(rawToolName);
  const serializedPayload = serializeCodexItemEventPayload(payload);
  const toolArguments = fallbackToolName
    ? context.resolveToolArguments(serializedPayload as JsonObject, fallbackToolName)
    : context.resolveDynamicToolArguments(serializedPayload as JsonObject);
  const hasToolArguments = Object.keys(toolArguments).length > 0 ||
    context.hasExplicitToolArguments(serializedPayload as JsonObject);
  const status = context.resolveExecutionStatus(payload)?.toLowerCase() ?? null;
  if (status === "declined") {
    const reason = context.resolveToolDecisionReason(serializedPayload as JsonObject) ??
      "Tool execution denied.";
    return context.createEvent(codexEventName, AgentRunEventType.TOOL_DENIED, {
      ...serializedPayload,
      ...(invocationId ? { invocation_id: invocationId } : {}),
      ...(turnId ? { turn_id: turnId } : {}),
      ...(toolName ? { tool_name: toolName } : {}),
      ...(hasToolArguments ? { arguments: toolArguments } : {}),
      reason,
      error: context.resolveToolError(serializedPayload as JsonObject),
    });
  }

  const projectedToolResult = resolveCodexProjectedToolResult(
    context,
    payload,
    serializedPayload as JsonObject,
    rawToolName,
    toolName,
  );
  const providerFailed = context.isExecutionFailure(payload);
  const failed = providerFailed || Boolean(projectedToolResult.mcpErrorMessage);
  const eventType = failed
    ? AgentRunEventType.TOOL_EXECUTION_FAILED
    : AgentRunEventType.TOOL_EXECUTION_SUCCEEDED;
  const basePayload = failed
    ? omitResultField(serializedPayload)
    : serializedPayload;
  const error = providerFailed
    ? context.resolveToolError(serializedPayload as JsonObject)
    : (
        resolveCodexExplicitProviderError(serializedPayload as JsonObject) ??
        projectedToolResult.mcpErrorMessage ??
        "MCP tool execution failed."
      );

  return context.createEvent(codexEventName, eventType, {
    ...basePayload,
    ...(invocationId ? { invocation_id: invocationId } : {}),
    ...(turnId ? { turn_id: turnId } : {}),
    ...(toolName ? { tool_name: toolName } : {}),
    ...(hasToolArguments ? { arguments: toolArguments } : {}),
    ...(failed
      ? { error }
      : {
          result: projectedToolResult.result,
        }),
  });
};
