import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageClientFactory } from "autobyteus-ts/multimedia/image/image-client-factory.js";
import { appConfigProvider } from "../../../../src/config/app-config-provider.js";
import {
  DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY,
  DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY,
} from "../../../../src/config/media-default-model-settings.js";
import {
  EDIT_IMAGE_TOOL_NAME,
  GENERATE_IMAGE_TOOL_NAME,
} from "../../../../src/agent-tools/media/media-tool-contract.js";
import { buildMediaToolParameterSchema } from "../../../../src/agent-tools/media/media-tool-parameter-schemas.js";

describe("media image tool parameter schemas", () => {
  beforeEach(() => {
    const config = {
      get: vi.fn((key: string) => {
        if (
          key === DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY ||
          key === DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY
        ) {
          return "gemini-3.1-flash-image";
        }
        return undefined;
      }),
    };
    vi.spyOn(appConfigProvider, "config", "get").mockReturnValue(config as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("projects the resolved Gemini 3.1 schema into generate_image", () => {
    const schema = buildMediaToolParameterSchema(GENERATE_IMAGE_TOOL_NAME);
    const generationConfig = schema.getParameter("generation_config");

    expect(schema.parameters.map((parameter) => parameter.name)).toEqual([
      "prompt",
      "input_images",
      "output_file_path",
      "generation_config",
    ]);
    expect(generationConfig?.objectSchema?.getParameter("aspect_ratio")?.enumValues).toEqual([
      "1:1",
      "1:4",
      "1:8",
      "2:3",
      "3:2",
      "3:4",
      "4:1",
      "4:3",
      "4:5",
      "5:4",
      "8:1",
      "9:16",
      "16:9",
      "21:9",
    ]);
    expect(generationConfig?.objectSchema?.getParameter("image_size")?.enumValues).toEqual([
      "512",
      "1K",
      "2K",
      "4K",
    ]);
  });

  it("projects the same resolved Gemini schema into edit_image", () => {
    const schema = buildMediaToolParameterSchema(EDIT_IMAGE_TOOL_NAME);
    const generationConfig = schema.getParameter("generation_config");
    const jsonSchema = schema.toJsonSchema() as {
      properties: Record<string, Record<string, unknown>>;
    };

    expect(schema.parameters.map((parameter) => parameter.name)).toEqual([
      "prompt",
      "input_images",
      "output_file_path",
      "mask_image",
      "generation_config",
    ]);
    expect(generationConfig?.objectSchema?.parameters).toHaveLength(2);
    expect(jsonSchema.properties.generation_config).toMatchObject({
      type: "object",
      properties: {
        aspect_ratio: {
          type: "string",
          enum: ["1:1", "1:4", "1:8", "2:3", "3:2", "3:4", "4:1", "4:3", "4:5", "5:4", "8:1", "9:16", "16:9", "21:9"],
        },
        image_size: {
          type: "string",
          enum: ["512", "1K", "2K", "4K"],
        },
      },
    });
    expect(ImageClientFactory.listModels().find(
      (model) => model.modelIdentifier === "gemini-3.1-flash-image",
    )?.parameterSchema.parameters).toHaveLength(2);
  });
});
