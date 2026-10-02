import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageClientFactory } from "autobyteus-ts/multimedia/image/image-client-factory.js";
import { GEMINI_TTS_VOICES } from "autobyteus-ts/multimedia/audio/gemini-tts-voices.js";
import { GeminiJsonSchemaFormatter } from "autobyteus-ts/tools/usage/formatters/gemini-json-schema-formatter.js";
import { OpenAiJsonSchemaFormatter } from "autobyteus-ts/tools/usage/formatters/openai-json-schema-formatter.js";
import type { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { appConfigProvider } from "../../../../src/config/app-config-provider.js";
import {
  DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY,
  DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY,
  DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY,
} from "../../../../src/config/media-default-model-settings.js";
import {
  EDIT_IMAGE_TOOL_NAME,
  GENERATE_IMAGE_TOOL_NAME,
  GENERATE_SPEECH_TOOL_NAME,
} from "../../../../src/agent-tools/media/media-tool-contract.js";
import { buildMediaToolParameterSchema } from "../../../../src/agent-tools/media/media-tool-parameter-schemas.js";

describe("media tool parameter schemas", () => {
  let speechModel: string;
  beforeEach(() => {
    speechModel = "gemini-3.8-flash-tts";
    const config = {
      get: vi.fn((key: string) => {
        if (key === DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY) return speechModel;
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

  it.each(["gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts"])(
    "projects the configured %s speech contract without a competing server schema", (identifier) => {
      speechModel = identifier;
      const schema = buildMediaToolParameterSchema(GENERATE_SPEECH_TOOL_NAME);
      const json = schema.toJsonSchema() as any;
      expect(schema.parameters.map((parameter) => parameter.name)).toEqual(["prompt", "output_file_path", "generation_config"]);
      expect(json.required).toEqual(["prompt", "output_file_path"]);
      expect(json.properties.prompt.description).toContain("turn_styles");
      const config = json.properties.generation_config;
      expect(config.description).toContain(identifier);
      expect(config.properties.voice_name).toMatchObject({ type: "string", default: "Kore" });
      expect(config.properties.voice_name).not.toHaveProperty("enum");
      expect(config.properties.voice_name.description).toContain("ar-001-advisor-1");
      expect(config.properties.speaker_mapping.items.properties.voice.enum).toEqual(GEMINI_TTS_VOICES);
      expect(config.properties.turn_styles).toMatchObject({
        type: "array", items: { anyOf: [{ type: "string" }, { type: "null" }] }
      });
      expect(config.properties.turn_styles).not.toHaveProperty("default");
      expect(config.required).not.toContain("turn_styles");
    }
  );

  it("preserves nullable items and optional-array semantics through current Gemini/OpenAI tool formatters", () => {
    const schema = buildMediaToolParameterSchema(GENERATE_SPEECH_TOOL_NAME);
    const tool = { name: "generate_speech", description: "Speech", argumentSchema: schema } as ToolDefinition;
    const gemini = new GeminiJsonSchemaFormatter().provide(tool) as any;
    const openai = new OpenAiJsonSchemaFormatter().provide(tool) as any;
    for (const parameters of [gemini.parameters, openai.function.parameters]) {
      const config = parameters.properties.generation_config;
      expect(config.properties.turn_styles.type).toBe("array");
      expect(config.properties.turn_styles.items).toEqual({ anyOf: [{ type: "string" }, { type: "null" }] });
      expect(config.required).not.toContain("turn_styles");
      expect(config.properties.voice_name).not.toHaveProperty("enum");
    }
  });

  it("does not add Gemini fields to the configured OpenAI speech tool", () => {
    speechModel = "gpt-4o-mini-tts";
    const schema = buildMediaToolParameterSchema(GENERATE_SPEECH_TOOL_NAME).toJsonSchema() as any;
    expect(Object.keys(schema.properties.generation_config.properties)).toEqual(["voice", "format", "instructions"]);
  });
});
