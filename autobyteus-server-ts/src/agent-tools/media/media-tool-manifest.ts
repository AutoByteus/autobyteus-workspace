import type { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import type { MediaGenerationService } from "./media-generation-service.js";
import type { ToolExecutionOptions } from "autobyteus-ts/tools/base-tool.js";
import {
  EDIT_IMAGE_TOOL_NAME,
  GENERATE_IMAGE_TOOL_NAME,
  GENERATE_SPEECH_TOOL_NAME,
  GENERATE_VIDEO_TOOL_NAME,
  MEDIA_TOOL_NAME_LIST,
  type EditImageInput,
  type GenerateImageInput,
  type GenerateSpeechInput,
  type GenerateVideoInput,
  type MediaToolExecutionContext,
  type MediaToolName,
  type MediaToolResult,
} from "./media-tool-contract.js";
import {
  parseEditImageInput,
  parseGenerateImageInput,
  parseGenerateSpeechInput,
  parseGenerateVideoInput,
} from "./media-tool-input-parsers.js";
import {
  buildMediaToolParameterSchema,
  getMediaToolDescriptionSuffix,
} from "./media-tool-parameter-schemas.js";

export type MediaToolManifestEntry<TInput = unknown> = {
  name: MediaToolName;
  getDescription: () => string;
  buildArgumentSchema: () => ParameterSchema;
  parseInput: (rawArguments: Record<string, unknown>) => TInput;
  execute: (
    service: MediaGenerationService,
    context: MediaToolExecutionContext,
    input: TInput,
    options?: ToolExecutionOptions,
  ) => Promise<MediaToolResult>;
};

const generateImageDescription = (): string =>
  "Generates an image from a textual prompt and optional reference images, saves the first generated image to the requested local path, and returns { file_path }. Default media model settings apply to future/new media tool calls." +
  getMediaToolDescriptionSuffix(GENERATE_IMAGE_TOOL_NAME);

const editImageDescription = (): string =>
  "Edits an image from a textual prompt, optional input images, and optional mask image, saves the first edited image to the requested local path, and returns { file_path }. Default media model settings apply to future/new media tool calls." +
  getMediaToolDescriptionSuffix(EDIT_IMAGE_TOOL_NAME);

const generateSpeechDescription = (): string =>
  "Generates spoken audio from text using the default speech model, saves the generated audio to the requested local path, and returns { file_path }. Default media model settings apply to future/new media tool calls.";

const generateVideoDescription = (): string =>
  "Generates an MP4 video from a textual prompt and optional reference images, saves the first generated video to the requested local path, and returns { file_path }. Use a .mp4 output path for video artifact classification. Default media model settings apply to future/new media tool calls." +
  getMediaToolDescriptionSuffix(GENERATE_VIDEO_TOOL_NAME);

const manifestEntries: MediaToolManifestEntry[] = [
  {
    name: GENERATE_IMAGE_TOOL_NAME,
    getDescription: generateImageDescription,
    buildArgumentSchema: () => buildMediaToolParameterSchema(GENERATE_IMAGE_TOOL_NAME),
    parseInput: (rawArguments): GenerateImageInput => parseGenerateImageInput(rawArguments),
    execute: (service, context, input, options) => service.generateImage(context, input as GenerateImageInput, options ?? {}),
  },
  {
    name: EDIT_IMAGE_TOOL_NAME,
    getDescription: editImageDescription,
    buildArgumentSchema: () => buildMediaToolParameterSchema(EDIT_IMAGE_TOOL_NAME),
    parseInput: (rawArguments): EditImageInput => parseEditImageInput(rawArguments),
    execute: (service, context, input, options) => service.editImage(context, input as EditImageInput, options ?? {}),
  },
  {
    name: GENERATE_SPEECH_TOOL_NAME,
    getDescription: generateSpeechDescription,
    buildArgumentSchema: () => buildMediaToolParameterSchema(GENERATE_SPEECH_TOOL_NAME),
    parseInput: (rawArguments): GenerateSpeechInput => parseGenerateSpeechInput(rawArguments),
    execute: (service, context, input, options) => service.generateSpeech(context, input as GenerateSpeechInput, options ?? {}),
  },
  {
    name: GENERATE_VIDEO_TOOL_NAME,
    getDescription: generateVideoDescription,
    buildArgumentSchema: () => buildMediaToolParameterSchema(GENERATE_VIDEO_TOOL_NAME),
    parseInput: (rawArguments): GenerateVideoInput => parseGenerateVideoInput(rawArguments),
    execute: (service, context, input, options) => service.generateVideo(context, input as GenerateVideoInput, options ?? {}),
  },
];

const manifestByName = new Map(
  manifestEntries.map((entry) => [entry.name, entry] as const),
);

export const MEDIA_TOOL_MANIFEST = manifestEntries;

export const getMediaToolManifestEntry = (
  toolName: MediaToolName,
): MediaToolManifestEntry => {
  const entry = manifestByName.get(toolName);
  if (!entry) {
    throw new Error(`Unknown media tool manifest entry: ${toolName}`);
  }
  return entry;
};

export const assertMediaToolManifestComplete = (): void => {
  for (const toolName of MEDIA_TOOL_NAME_LIST) {
    getMediaToolManifestEntry(toolName);
  }
};
