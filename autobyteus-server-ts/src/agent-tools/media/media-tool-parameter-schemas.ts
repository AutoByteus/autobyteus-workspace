import {
  ParameterDefinition,
  ParameterSchema,
  ParameterType,
} from "autobyteus-ts/utils/parameter-schema.js";
import {
  EDIT_IMAGE_TOOL_NAME,
  GENERATE_IMAGE_TOOL_NAME,
  GENERATE_SPEECH_TOOL_NAME,
  MEDIA_TOOL_MODEL_KIND_BY_NAME,
  type MediaToolName,
} from "./media-tool-contract.js";
import { getMediaModelResolver } from "./media-tool-model-resolver.js";

const buildBasePromptParameter = (description: string): ParameterDefinition =>
  new ParameterDefinition({
    name: "prompt",
    type: ParameterType.STRING,
    description,
    required: true,
  });

const buildOutputFilePathParameter = (description: string): ParameterDefinition =>
  new ParameterDefinition({
    name: "output_file_path",
    type: ParameterType.STRING,
    description,
    required: true,
  });

const buildInputImagesParameter = (description: string, required = false): ParameterDefinition =>
  new ParameterDefinition({
    name: "input_images",
    type: ParameterType.ARRAY,
    description,
    required,
    arrayItemSchema: ParameterType.STRING,
  });

const addGenerationConfigParameter = (
  schema: ParameterSchema,
  toolName: MediaToolName,
): void => {
  const modelKind = MEDIA_TOOL_MODEL_KIND_BY_NAME[toolName];
  const resolvedModel = getMediaModelResolver().resolve(modelKind);
  const modelSchema = resolvedModel.catalogModel?.parameterSchema;
  if (!modelSchema?.parameters?.length) {
    return;
  }

  schema.addParameter(
    new ParameterDefinition({
      name: "generation_config",
      type: ParameterType.OBJECT,
      description: `Model-specific generation parameters for the configured '${resolvedModel.modelIdentifier}' model. Default model settings apply to future/new media tool calls.`,
      required: false,
      objectSchema: modelSchema,
    }),
  );
};

export const getMediaToolDescriptionSuffix = (toolName: MediaToolName): string => {
  const modelKind = MEDIA_TOOL_MODEL_KIND_BY_NAME[toolName];
  const resolvedModel = getMediaModelResolver().resolve(modelKind);
  const catalogModelWithDescription = resolvedModel.catalogModel as
    | { description?: unknown }
    | null;
  const description = catalogModelWithDescription?.description;
  return typeof description === "string" && description.trim().length > 0
    ? `\n\nModel-specific capabilities for the current default model (${resolvedModel.modelIdentifier}): ${description.trim()}`
    : "";
};

export const buildMediaToolParameterSchema = (toolName: MediaToolName): ParameterSchema => {
  const schema = new ParameterSchema();

  switch (toolName) {
    case GENERATE_IMAGE_TOOL_NAME:
      schema.addParameter(buildBasePromptParameter("A detailed textual description of the image to generate."));
      schema.addParameter(buildInputImagesParameter("Optional array of image locations (URLs, data URIs, or safe local file paths) to use as references where supported by the current model."));
      schema.addParameter(buildOutputFilePathParameter("Required local file path where the generated image should be saved. Relative paths resolve inside the workspace; absolute paths must be under the workspace, Downloads, or system temp directory."));
      break;
    case EDIT_IMAGE_TOOL_NAME:
      schema.addParameter(buildBasePromptParameter("A detailed textual description of the edits to apply to the image."));
      schema.addParameter(buildInputImagesParameter("Array of image locations (URLs, data URIs, or safe local file paths) to edit or use as context. Required by most editing models unless image context is supplied by the runtime."));
      schema.addParameter(buildOutputFilePathParameter("Required local file path where the edited image should be saved. Relative paths resolve inside the workspace; absolute paths must be under the workspace, Downloads, or system temp directory."));
      schema.addParameter(
        new ParameterDefinition({
          name: "mask_image",
          type: ParameterType.STRING,
          description: "Optional mask image location for inpainting. Transparent areas are regenerated when supported by the current model.",
          required: false,
        }),
      );
      break;
    case GENERATE_SPEECH_TOOL_NAME:
      schema.addParameter(buildBasePromptParameter("The text to convert into spoken audio. For multi-speaker models, format dialogue with speaker labels that match generation_config.speaker_mapping."));
      schema.addParameter(buildOutputFilePathParameter("Required local file path where the generated audio should be saved. Relative paths resolve inside the workspace; absolute paths must be under the workspace, Downloads, or system temp directory."));
      break;
  }

  addGenerationConfigParameter(schema, toolName);
  return schema;
};
