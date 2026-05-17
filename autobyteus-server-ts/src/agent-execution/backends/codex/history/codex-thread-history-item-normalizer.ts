import { CodexFileChangePayloadHelper } from "../items/codex-file-change-payload-helper.js";
import { CodexToolPayloadParser } from "../items/codex-tool-payload-parser.js";
import {
  normalizeCodexItemTypeToken,
  resolveCodexToolItemFamily,
  type CodexToolItemFamily,
} from "../items/codex-tool-item-family.js";

export type CodexThreadHistoryToolStatus = "parsed" | "success" | "error" | "denied";

export interface NormalizedCodexThreadHistoryToolItem {
  family: CodexToolItemFamily;
  invocationId: string;
  toolName: string;
  toolArgs: Record<string, unknown> | null;
  toolResult: unknown | null;
  toolError: string | null;
  status: CodexThreadHistoryToolStatus;
}

export interface NormalizeCodexThreadHistoryItemInput {
  item: Record<string, unknown>;
  turnIndex: number;
  itemIndex: number;
}

const fileChangePayloadHelper = new CodexFileChangePayloadHelper();
const toolPayloadParser = new CodexToolPayloadParser(fileChangePayloadHelper);

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asArray = (value: unknown): unknown[] | null => (Array.isArray(value) ? value : null);

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const hasEntries = (value: Record<string, unknown> | null): value is Record<string, unknown> =>
  Boolean(value && Object.keys(value).length > 0);

const compactRecord = (value: Record<string, unknown>): Record<string, unknown> | null => {
  const next: Record<string, unknown> = {};
  for (const [key, row] of Object.entries(value)) {
    if (row === undefined) {
      continue;
    }
    if (typeof row === "string" && row.trim().length === 0) {
      continue;
    }
    next[key] = row;
  }
  return hasEntries(next) ? next : null;
};

const resolveInvocation = (
  item: Record<string, unknown>,
  turnIndex: number,
  itemIndex: number,
): { invocationId: string } => {
  const candidate =
    asString(item.invocationId) ??
    asString(item.invocation_id) ??
    asString(item.callId) ??
    asString(item.call_id) ??
    asString(item.toolCallId) ??
    asString(item.tool_call_id) ??
    asString(item.id);
  if (candidate) {
    return { invocationId: candidate };
  }
  return {
    invocationId: `codex-${turnIndex}-${itemIndex}`,
  };
};

const qualifyMcpToolName = (
  item: Record<string, unknown>,
  toolName: string | null,
): string | null => {
  if (!toolName || toolName.includes(".")) {
    return toolName;
  }
  const serverName =
    asString(item.server) ??
    asString(item.serverName) ??
    asString(asObject(item.serverInfo).name);
  return serverName ? `${serverName}.${toolName}` : toolName;
};

const resolveToolName = (
  family: CodexToolItemFamily,
  item: Record<string, unknown>,
): string => {
  if (family === "web_search") {
    return "search_web";
  }
  if (family === "command_execution") {
    return "run_bash";
  }
  if (family === "file_change") {
    return "edit_file";
  }

  const payload = { item };
  const parsedName = toolPayloadParser.resolveToolName(payload);
  const historyName = family === "mcp_tool_call"
    ? qualifyMcpToolName(item, parsedName)
    : parsedName;
  return historyName ?? "tool";
};

const resolveToolArguments = (
  family: CodexToolItemFamily,
  item: Record<string, unknown>,
): Record<string, unknown> | null => {
  const payload = { item };
  if (family === "web_search") {
    return compactRecord(toolPayloadParser.resolveWebSearchArguments(payload));
  }
  if (family === "command_execution") {
    return compactRecord(toolPayloadParser.resolveToolArguments(payload, "run_bash"));
  }
  if (family === "file_change") {
    return fileChangePayloadHelper.resolveArguments(payload);
  }
  return compactRecord(toolPayloadParser.resolveDynamicToolArguments(payload));
};

const hasTextContent = (value: unknown): boolean => {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (!Array.isArray(value)) {
    return false;
  }
  return value.some((entry) => {
    if (typeof entry === "string") {
      return entry.trim().length > 0;
    }
    const row = asObject(entry);
    return Boolean(
      asString(row.text) ??
        asString(row.content) ??
        asString(row.summary) ??
        asString(row.delta) ??
        asString(row.value),
    );
  });
};

const hasExplicitResult = (item: Record<string, unknown>): boolean =>
  item.result !== undefined ||
  item.output !== undefined ||
  item.aggregatedOutput !== undefined ||
  hasTextContent(item.contentItems) ||
  hasTextContent(item.content);

const isTerminalSuccessStatus = (value: string | null): boolean =>
  value === "success" ||
  value === "completed" ||
  value === "done" ||
  value === "ok";

const resolveStatus = (
  family: CodexToolItemFamily,
  item: Record<string, unknown>,
): CodexThreadHistoryToolStatus => {
  const payload = { item };
  const status = toolPayloadParser.resolveExecutionStatus(payload)?.toLowerCase() ?? null;
  if (status === "declined" || status === "denied") {
    return "denied";
  }
  if (toolPayloadParser.isExecutionFailure(payload) || asString(item.error)) {
    return "error";
  }
  if (
    family === "web_search" ||
    family === "command_execution" ||
    family === "file_change" ||
    isTerminalSuccessStatus(status) ||
    hasExplicitResult(item)
  ) {
    return "success";
  }
  return "parsed";
};

const resolveCommandResult = (item: Record<string, unknown>): Record<string, unknown> | null =>
  compactRecord({
    status: asString(item.status) ?? null,
    output: item.aggregatedOutput ?? item.output ?? null,
    exit_code: item.exitCode ?? item.exit_code ?? null,
  });

const resolveFileChangeResult = (item: Record<string, unknown>): Record<string, unknown> | null =>
  compactRecord({
    status: asString(item.status) ?? null,
    changes: asArray(item.changes) ?? null,
  });

const resolveToolResult = (
  family: CodexToolItemFamily,
  item: Record<string, unknown>,
  status: CodexThreadHistoryToolStatus,
): unknown | null => {
  if (status === "parsed") {
    return null;
  }
  if (family === "command_execution") {
    return resolveCommandResult(item);
  }
  if (family === "file_change") {
    return resolveFileChangeResult(item);
  }
  if (family === "web_search") {
    return toolPayloadParser.resolveWebSearchResult({ item });
  }
  if ((status === "error" || status === "denied") && !hasExplicitResult(item)) {
    return null;
  }
  return toolPayloadParser.resolveToolResult({ item });
};

const resolveToolError = (
  item: Record<string, unknown>,
  status: CodexThreadHistoryToolStatus,
): string | null => {
  if (status !== "error" && status !== "denied") {
    return null;
  }
  return toolPayloadParser.resolveToolError({ item });
};

const debugEnabled = (): boolean =>
  process.env.CODEX_THREAD_HISTORY_DEBUG === "1" ||
  process.env.CODEX_THREAD_EVENT_DEBUG === "1";

const isToolLikeUnsupportedItem = (item: Record<string, unknown>): boolean => {
  const type = normalizeCodexItemTypeToken(item.type) ?? "";
  if (
    type.includes("tool") ||
    type.includes("functioncall") ||
    type.includes("command") ||
    type.includes("websearch") ||
    type.includes("filechange")
  ) {
    return true;
  }
  return Boolean(
    asString(item.tool) ??
      asString(item.tool_name) ??
      asString(item.name) ??
      hasEntries(asObject(item.arguments)),
  );
};

const logUnsupportedToolLikeItem = (
  input: NormalizeCodexThreadHistoryItemInput,
): void => {
  if (!debugEnabled() || !isToolLikeUnsupportedItem(input.item)) {
    return;
  }
  console.warn("[CodexThreadHistoryItemNormalizer] Unsupported tool-like history item", {
    type: asString(input.item.type),
    id: asString(input.item.id),
    name: asString(input.item.name) ?? asString(input.item.tool) ?? asString(input.item.tool_name),
    status: asString(input.item.status),
    turnIndex: input.turnIndex,
    itemIndex: input.itemIndex,
  });
};

export const normalizeCodexThreadHistoryItem = (
  input: NormalizeCodexThreadHistoryItemInput,
): NormalizedCodexThreadHistoryToolItem | null => {
  const family = resolveCodexToolItemFamily(input.item.type);
  if (!family) {
    logUnsupportedToolLikeItem(input);
    return null;
  }

  const invocation = resolveInvocation(input.item, input.turnIndex, input.itemIndex);
  const status = resolveStatus(family, input.item);
  const toolArgs = resolveToolArguments(family, input.item);
  const toolName = resolveToolName(family, input.item);
  return {
    family,
    invocationId: invocation.invocationId,
    toolName,
    toolArgs,
    toolResult: resolveToolResult(family, input.item, status),
    toolError: resolveToolError(input.item, status),
    status,
  };
};
