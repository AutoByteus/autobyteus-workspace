export type McpEffectiveResultSource = {
  kind: "mcp_tool_result";
  provider: "codex" | "claude";
  evidence:
    | "codex_item_family_mcp_tool_call"
    | "provider_mcp_wire_tool_name"
    | "explicit_provider_mcp_marker";
  rawToolName: string | null;
  canonicalToolName: string | null;
};

export type McpEffectiveToolResultProjection = {
  matched: boolean;
  result: unknown;
  isError: boolean;
  errorMessage: string | null;
};

type JsonRecord = Record<string, unknown>;

type McpContentBlock = JsonRecord & {
  type: string;
};

type MatchedMcpEnvelope = JsonRecord & {
  content: McpContentBlock[];
};

const isRecord = (value: unknown): value is JsonRecord =>
  !!value && typeof value === "object" && !Array.isArray(value);

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isTextBlock = (block: McpContentBlock): block is McpContentBlock & { text: string } =>
  block.type === "text" && typeof block.text === "string";

const matchMcpEnvelope = (value: unknown): MatchedMcpEnvelope | null => {
  if (!isRecord(value) || !Array.isArray(value.content)) {
    return null;
  }

  const content: McpContentBlock[] = [];
  for (const item of value.content) {
    if (!isRecord(item)) {
      return null;
    }
    const type = asNonEmptyString(item.type);
    if (!type) {
      return null;
    }
    content.push({ ...item, type });
  }

  return {
    ...value,
    content,
  };
};

const parseSingleJsonText = (value: string): { parsed: true; value: unknown } | { parsed: false } => {
  try {
    return {
      parsed: true,
      value: JSON.parse(value.trim()) as unknown,
    };
  } catch {
    return { parsed: false };
  }
};

const sanitizeJsonValue = (
  value: unknown,
  seen: WeakSet<object>,
): unknown => {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol") {
    return undefined;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return null;
    }
    seen.add(value);
    const next = value
      .map((entry) => sanitizeJsonValue(entry, seen))
      .filter((entry) => entry !== undefined);
    seen.delete(value);
    return next;
  }
  if (!isRecord(value)) {
    return null;
  }
  if (seen.has(value)) {
    return null;
  }
  seen.add(value);
  const next: JsonRecord = {};
  for (const [key, row] of Object.entries(value)) {
    if (key === "_meta") {
      continue;
    }
    const sanitized = sanitizeJsonValue(row, seen);
    if (sanitized !== undefined) {
      next[key] = sanitized;
    }
  }
  seen.delete(value);
  return next;
};

const sanitizeContentBlock = (block: McpContentBlock): JsonRecord => {
  if (isTextBlock(block)) {
    return {
      type: "text",
      text: block.text,
    };
  }
  const sanitized = sanitizeJsonValue(block, new WeakSet<object>());
  return isRecord(sanitized) ? sanitized : { type: block.type };
};

const projectContentBlocks = (blocks: McpContentBlock[]): unknown => {
  if (blocks.length === 0) {
    return null;
  }

  const textBlocks = blocks.filter(isTextBlock);
  if (textBlocks.length === 1 && blocks.length === 1) {
    const text = textBlocks[0].text;
    const parsed = parseSingleJsonText(text);
    return parsed.parsed ? parsed.value : text;
  }

  if (textBlocks.length === blocks.length) {
    return textBlocks.map((block) => block.text).join("\n\n");
  }

  return {
    items: blocks.map(sanitizeContentBlock),
  };
};

const projectEffectiveResult = (envelope: MatchedMcpEnvelope): unknown => {
  const structuredContent = envelope.structuredContent;
  if (structuredContent !== null && structuredContent !== undefined) {
    return structuredContent;
  }
  return projectContentBlocks(envelope.content);
};

const resolveObjectErrorMessage = (value: unknown): string | null => {
  if (!isRecord(value)) {
    return null;
  }

  const nestedError = isRecord(value.error) ? value.error : null;
  return (
    asNonEmptyString(nestedError?.message) ??
    asNonEmptyString(value.message) ??
    asNonEmptyString(value.error)
  );
};

const firstTextBlockMessage = (blocks: McpContentBlock[]): string | null => {
  for (const block of blocks) {
    if (!isTextBlock(block)) {
      continue;
    }
    const text = asNonEmptyString(block.text);
    if (text) {
      return text;
    }
  }
  return null;
};

const resolveErrorMessage = (
  effectiveResult: unknown,
  blocks: McpContentBlock[],
): string => (
  asNonEmptyString(effectiveResult) ??
  resolveObjectErrorMessage(effectiveResult) ??
  firstTextBlockMessage(blocks) ??
  "MCP tool execution failed."
);

export const projectMcpToolResultForApplication = (
  value: unknown,
  source: McpEffectiveResultSource,
): McpEffectiveToolResultProjection => {
  if (source.kind !== "mcp_tool_result") {
    return {
      matched: false,
      result: value,
      isError: false,
      errorMessage: null,
    };
  }

  const envelope = matchMcpEnvelope(value);
  if (!envelope) {
    return {
      matched: false,
      result: value,
      isError: false,
      errorMessage: null,
    };
  }

  const result = projectEffectiveResult(envelope);
  const isError = envelope.isError === true;
  return {
    matched: true,
    result,
    isError,
    errorMessage: isError ? resolveErrorMessage(result, envelope.content) : null,
  };
};
