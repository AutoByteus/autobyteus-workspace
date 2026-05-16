export type CodexToolItemFamily =
  | "dynamic_tool_call"
  | "mcp_tool_call"
  | "web_search"
  | "command_execution"
  | "file_change";

export const normalizeCodexItemTypeToken = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  return normalized.length > 0 ? normalized : null;
};

export const resolveCodexToolItemFamily = (
  itemType: unknown,
): CodexToolItemFamily | null => {
  const token = normalizeCodexItemTypeToken(itemType);
  switch (token) {
    case "dynamictoolcall":
      return "dynamic_tool_call";
    case "mcptoolcall":
      return "mcp_tool_call";
    case "websearch":
      return "web_search";
    case "commandexecution":
      return "command_execution";
    case "filechange":
      return "file_change";
    default:
      return null;
  }
};

export const isCodexDynamicToolItemFamily = (
  family: CodexToolItemFamily | null,
): boolean => family === "dynamic_tool_call" || family === "mcp_tool_call";
