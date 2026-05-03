import type { AgentRunFileChangeSourceTool } from "../../../domain/agent-run-file-change.js";

export type FileMutationSourceTool = Exclude<AgentRunFileChangeSourceTool, "generated_output">;

const GENERATED_OUTPUT_TOOL_NAMES = new Set([
  "generate_image",
  "edit_image",
  "generate_speech",
  "mcp__autobyteus_image_audio__generate_image",
  "mcp__autobyteus_image_audio__edit_image",
  "mcp__autobyteus_image_audio__generate_speech",
]);

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizeFileMutationTool = (
  toolName: string | null | undefined,
): FileMutationSourceTool | null => {
  const normalized = asTrimmedString(toolName);
  switch (normalized) {
    case "write_file":
    case "Write":
      return "write_file";
    case "edit_file":
    case "Edit":
    case "MultiEdit":
    case "NotebookEdit":
      return "edit_file";
    default:
      return null;
  }
};

export const isGeneratedOutputTool = (toolName: string | null | undefined): boolean => {
  const normalized = asTrimmedString(toolName);
  return normalized ? GENERATED_OUTPUT_TOOL_NAMES.has(normalized) : false;
};
