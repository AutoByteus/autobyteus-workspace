import { isGeneratedOutputTool } from "./file-change-tool-semantics.js";

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const isExplicitGeneratedOutputPathKey = (key: string): boolean => {
  const keyLower = key.toLowerCase();
  return (keyLower.includes("output") && keyLower.includes("path"))
    || keyLower.includes("destination");
};

const extractKnownGeneratedResultPath = (value: unknown): string | null => {
  const candidate = asObject(value);
  if (!candidate) {
    return null;
  }

  return asTrimmedString(candidate.file_path) ?? asTrimmedString(candidate.filePath);
};

const extractExplicitGeneratedOutputPathFromObject = (value: unknown): string | null => {
  const candidate = asObject(value);
  if (!candidate) {
    return null;
  }

  if ("output_file_url" in candidate && "local_file_path" in candidate) {
    return asTrimmedString(candidate.local_file_path);
  }

  for (const [key, entry] of Object.entries(candidate)) {
    const resolved = asTrimmedString(entry);
    if (resolved && isExplicitGeneratedOutputPathKey(key)) {
      return resolved;
    }
  }

  return null;
};

export const extractExplicitGeneratedOutputPath = (
  toolArgs: Record<string, unknown> | null | undefined,
  toolResult: unknown,
): string | null =>
  extractExplicitGeneratedOutputPathFromObject(toolResult)
  ?? extractExplicitGeneratedOutputPathFromObject(toolArgs);

export const extractGeneratedOutputPathForKnownTool = (
  toolName: string | null | undefined,
  toolArgs: Record<string, unknown> | null | undefined,
  toolResult: unknown,
  cachedGeneratedOutputPath?: string | null,
): string | null => {
  if (!isGeneratedOutputTool(toolName)) {
    return null;
  }

  return extractExplicitGeneratedOutputPath(toolArgs, toolResult)
    ?? cachedGeneratedOutputPath
    ?? extractKnownGeneratedResultPath(toolResult);
};
