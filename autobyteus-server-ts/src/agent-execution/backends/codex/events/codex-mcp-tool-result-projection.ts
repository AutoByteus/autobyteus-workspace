import { normalizeBrowserMcpToolResult } from "../../../../agent-tools/browser/browser-mcp-result-normalizer.js";
import {
  projectMcpToolResultForApplication,
  type McpEffectiveResultSource,
} from "../../../../agent-tools/mcp/mcp-effective-tool-result-projector.js";
import { isMcpWireToolName } from "../../../../agent-tools/mcp/mcp-tool-source.js";
import type { JsonObject } from "../codex-app-server-json.js";
import { resolveCodexToolItemFamily } from "../items/codex-tool-item-family.js";

export type CodexProjectedToolResult = {
  result: unknown;
  mcpErrorMessage: string | null;
};

export type CodexMcpToolResultProjectionContext = {
  resolveItemType: (payload: JsonObject) => string | null;
  resolveToolResult: (payload: JsonObject) => unknown;
};

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export const resolveCodexExplicitProviderError = (payload: JsonObject): string | null => {
  const item = asObject(payload.item);
  return (
    asNonEmptyString(payload.error) ??
    asNonEmptyString(payload.message) ??
    asNonEmptyString(item?.error) ??
    asNonEmptyString(item?.message)
  );
};

const resolveCodexMcpResultSource = (
  context: CodexMcpToolResultProjectionContext,
  payload: JsonObject,
  rawToolName: string | null,
  canonicalToolName: string | null,
): McpEffectiveResultSource | null => {
  const itemFamily = resolveCodexToolItemFamily(context.resolveItemType(payload));
  if (itemFamily === "mcp_tool_call") {
    return {
      kind: "mcp_tool_result",
      provider: "codex",
      evidence: "codex_item_family_mcp_tool_call",
      rawToolName,
      canonicalToolName,
    };
  }
  if (isMcpWireToolName(rawToolName)) {
    return {
      kind: "mcp_tool_result",
      provider: "codex",
      evidence: "provider_mcp_wire_tool_name",
      rawToolName,
      canonicalToolName,
    };
  }
  return null;
};

export const resolveCodexProjectedToolResult = (
  context: CodexMcpToolResultProjectionContext,
  payload: JsonObject,
  serializedPayload: JsonObject,
  rawToolName: string | null,
  canonicalToolName: string | null,
): CodexProjectedToolResult => {
  const rawResult = context.resolveToolResult(serializedPayload);
  const source = resolveCodexMcpResultSource(
    context,
    payload,
    rawToolName,
    canonicalToolName,
  );
  if (!source) {
    return {
      result: normalizeBrowserMcpToolResult(canonicalToolName, rawResult),
      mcpErrorMessage: null,
    };
  }

  const projection = projectMcpToolResultForApplication(rawResult, source);
  const effectiveResult = projection.matched ? projection.result : rawResult;
  return {
    result: normalizeBrowserMcpToolResult(canonicalToolName, effectiveResult),
    mcpErrorMessage: projection.isError ? projection.errorMessage : null,
  };
};
