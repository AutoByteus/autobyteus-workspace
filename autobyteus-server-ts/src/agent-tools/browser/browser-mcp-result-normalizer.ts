import {
  DOM_SNAPSHOT_TOOL_NAME,
  NAVIGATE_TO_TOOL_NAME,
  OPEN_TAB_TOOL_NAME,
  READ_PAGE_TOOL_NAME,
  RUN_SCRIPT_TOOL_NAME,
  SCREENSHOT_TOOL_NAME,
  SET_DEVICE_EMULATION_TOOL_NAME,
  CLOSE_TAB_TOOL_NAME,
  isBrowserToolName,
} from "./browser-tool-contract.js";

const MAX_PARSE_DEPTH = 4;

type JsonRecord = Record<string, unknown>;

const BROWSER_TOOLS_REQUIRING_TAB_ID = new Set<string>([
  OPEN_TAB_TOOL_NAME,
  NAVIGATE_TO_TOOL_NAME,
  CLOSE_TAB_TOOL_NAME,
  READ_PAGE_TOOL_NAME,
  SCREENSHOT_TOOL_NAME,
  DOM_SNAPSHOT_TOOL_NAME,
  RUN_SCRIPT_TOOL_NAME,
  SET_DEVICE_EMULATION_TOOL_NAME,
]);

const isRecord = (value: unknown): value is JsonRecord =>
  !!value && typeof value === "object" && !Array.isArray(value);

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const parseJson = (value: string): unknown | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
};

const extractFromContentBlocks = (blocks: unknown[], depth: number): JsonRecord | null => {
  for (const block of blocks) {
    if (!isRecord(block) || block.type !== "text" || typeof block.text !== "string") {
      continue;
    }

    const parsed = normalizeBrowserResultValue(block.text, depth + 1);
    if (parsed) {
      return parsed;
    }
  }

  return null;
};

const normalizeBrowserResultValue = (value: unknown, depth: number): JsonRecord | null => {
  if (depth > MAX_PARSE_DEPTH) {
    return null;
  }

  if (typeof value === "string") {
    const parsed = parseJson(value);
    return parsed === null ? null : normalizeBrowserResultValue(parsed, depth + 1);
  }

  if (Array.isArray(value)) {
    return extractFromContentBlocks(value, depth + 1);
  }

  if (!isRecord(value)) {
    return null;
  }

  const structuredContent = value.structuredContent;
  if (structuredContent !== null && structuredContent !== undefined) {
    const parsedStructuredContent = normalizeBrowserResultValue(
      structuredContent,
      depth + 1,
    );
    if (parsedStructuredContent) {
      return parsedStructuredContent;
    }
  }

  if (Array.isArray(value.content)) {
    const parsedContent = extractFromContentBlocks(value.content, depth + 1);
    if (parsedContent) {
      return parsedContent;
    }
  }

  return value;
};

const warnIfMissingRequiredTabId = (
  toolName: string,
  result: JsonRecord,
): void => {
  if (!BROWSER_TOOLS_REQUIRING_TAB_ID.has(toolName)) {
    return;
  }
  if (asNonEmptyString(result.tab_id)) {
    return;
  }
  console.warn(
    `[browser-mcp-result-normalizer] Browser tool '${toolName}' returned a successful result without tab_id; Browser UI synchronization cannot be confirmed.`,
  );
};

export const normalizeBrowserMcpToolResult = (
  toolName: string | null,
  result: unknown,
): unknown => {
  const canonicalToolName = asNonEmptyString(toolName);
  if (!canonicalToolName || !isBrowserToolName(canonicalToolName)) {
    return result;
  }

  const normalizedResult = normalizeBrowserResultValue(result, 0);
  if (!normalizedResult) {
    return result;
  }

  warnIfMissingRequiredTabId(canonicalToolName, normalizedResult);
  return normalizedResult;
};
