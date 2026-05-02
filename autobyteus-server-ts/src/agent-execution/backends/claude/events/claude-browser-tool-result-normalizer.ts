import { isBrowserToolName } from "../../../../agent-tools/browser/browser-tool-contract.js";

const MAX_PARSE_DEPTH = 4;

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  !!value && typeof value === "object" && !Array.isArray(value);

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

  if (Array.isArray(value.content)) {
    const parsedContent = extractFromContentBlocks(value.content, depth + 1);
    if (parsedContent) {
      return parsedContent;
    }
  }

  return value;
};

export const normalizeClaudeBrowserToolResult = (
  toolName: string | null,
  result: unknown,
): unknown => {
  if (!isBrowserToolName(toolName)) {
    return result;
  }

  return normalizeBrowserResultValue(result, 0) ?? result;
};
