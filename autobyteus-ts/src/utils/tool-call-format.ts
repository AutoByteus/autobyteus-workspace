/**
 * Helpers for resolving tool-call format selection.
 */

export const TOOL_CALL_FORMAT_ENV_VAR = "AUTOBYTEUS_STREAM_PARSER";
export const TOOL_CALL_FORMATS = ["xml", "json", "sentinel", "api_tool_call"] as const;
export type ToolCallFormat = (typeof TOOL_CALL_FORMATS)[number];
export const DEFAULT_TOOL_CALL_FORMAT: ToolCallFormat = "api_tool_call";

const VALID_FORMATS = new Set<ToolCallFormat>(TOOL_CALL_FORMATS);

/**
 * Resolve the tool-call format from environment.
 * Defaults to "api_tool_call" when unset/invalid.
 */
export function resolveToolCallFormat(): ToolCallFormat {
  const value = process.env[TOOL_CALL_FORMAT_ENV_VAR];
  if (!value) {
    return DEFAULT_TOOL_CALL_FORMAT;
  }

  const normalizedValue = value.trim().toLowerCase();
  if (VALID_FORMATS.has(normalizedValue as ToolCallFormat)) {
    return normalizedValue as ToolCallFormat;
  }

  return DEFAULT_TOOL_CALL_FORMAT;
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
