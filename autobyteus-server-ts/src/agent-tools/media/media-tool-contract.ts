import type { MediaDefaultModelKind } from "../../config/media-default-model-settings.js";

export const GENERATE_IMAGE_TOOL_NAME = "generate_image";
export const EDIT_IMAGE_TOOL_NAME = "edit_image";
export const GENERATE_SPEECH_TOOL_NAME = "generate_speech";

export const MEDIA_TOOL_NAME_LIST = [
  GENERATE_IMAGE_TOOL_NAME,
  EDIT_IMAGE_TOOL_NAME,
  GENERATE_SPEECH_TOOL_NAME,
] as const;

export type MediaToolName = (typeof MEDIA_TOOL_NAME_LIST)[number];

export const MEDIA_TOOL_NAMES = new Set<string>(MEDIA_TOOL_NAME_LIST);

export const isMediaToolName = (value: string | null | undefined): value is MediaToolName =>
  typeof value === "string" && MEDIA_TOOL_NAMES.has(value.trim());

export const mediaToolNameFromString = (value: string): MediaToolName | null => {
  const trimmed = value.trim();
  return isMediaToolName(trimmed) ? trimmed : null;
};

export const MEDIA_TOOL_MODEL_KIND_BY_NAME: Record<MediaToolName, MediaDefaultModelKind> = {
  [GENERATE_IMAGE_TOOL_NAME]: "image_generation",
  [EDIT_IMAGE_TOOL_NAME]: "image_edit",
  [GENERATE_SPEECH_TOOL_NAME]: "speech_generation",
};

export type MediaToolExecutionContext = {
  agentId?: string | null;
  runId?: string | null;
  workspaceRootPath?: string | null;
};

export type GenerateImageInput = {
  prompt: string;
  input_images?: string[] | null;
  output_file_path: string;
  generation_config?: Record<string, unknown> | null;
};

export type EditImageInput = {
  prompt: string;
  input_images?: string[] | null;
  mask_image?: string | null;
  output_file_path: string;
  generation_config?: Record<string, unknown> | null;
};

export type GenerateSpeechInput = {
  prompt: string;
  output_file_path: string;
  generation_config?: Record<string, unknown> | null;
};

export type MediaToolResult = {
  file_path: string;
};
