/**
 * Helpers for resolving tool-call format selection.
 */

const ENV_TOOL_CALL_FORMAT = "AUTOBYTEUS_STREAM_PARSER";
const VALID_FORMATS = new Set(["xml", "json", "sentinel", "api_tool_call"]);

export type ToolCallFormat = "xml" | "json" | "sentinel" | "api_tool_call";

/**
 * Resolve the tool-call format from environment.
 * Defaults to "api_tool_call" when unset/invalid.
 */
export function resolveToolCallFormat(): ToolCallFormat {
  const value = process.env[ENV_TOOL_CALL_FORMAT];
  if (!value) {
    return "api_tool_call";
  }
  
  const normalizedValue = value.trim().toLowerCase();
  if (VALID_FORMATS.has(normalizedValue)) {
    return normalizedValue as ToolCallFormat;
  }
  
  return "api_tool_call";
}

/**
 * Return True if tool-call format is forced to XML by environment.
 */
export function isXmlToolFormat(): boolean {
  return resolveToolCallFormat() === "xml";
}

/**
 * Return True if tool-call format is forced to JSON by environment.
 */
export function isJsonToolFormat(): boolean {
  return resolveToolCallFormat() === "json";
}
