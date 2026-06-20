import "reflect-metadata";
import { describe, expect, it } from "vitest";
import {
  ParameterDefinition,
  ParameterSchema,
  ParameterType,
  ToolOrigin,
} from "autobyteus-ts";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { ToolDefinitionConverter } from "../../../../../src/api/graphql/converters/tool-definition-converter.js";

const buildToolDefinition = (argumentSchema: ParameterSchema): ToolDefinition =>
  new ToolDefinition(
    "generate_speech",
    "Generate speech from text.",
    ToolOrigin.LOCAL,
    "Media",
    () => argumentSchema,
    () => null,
    { customFactory: () => ({}) as any },
  );

describe("ToolDefinitionConverter", () => {
  it("projects nested object parameter JSON Schema for GraphQL tool definitions", () => {
    const generationConfigSchema = new ParameterSchema([
      new ParameterDefinition({
        name: "voice",
        type: ParameterType.ENUM,
        description: "Voice to use for speech generation.",
        enumValues: ["alloy", "coral"],
        defaultValue: "coral",
      }),
      new ParameterDefinition({
        name: "format",
        type: ParameterType.ENUM,
        description: "Output audio format.",
        enumValues: ["mp3", "wav"],
      }),
    ]);
    const argumentSchema = new ParameterSchema([
      new ParameterDefinition({
        name: "generation_config",
        type: ParameterType.OBJECT,
        description: "Model-specific speech generation options.",
        objectSchema: generationConfigSchema,
      }),
    ]);

    const converted = ToolDefinitionConverter.toGraphql(buildToolDefinition(argumentSchema));
    const parameter = converted.argumentSchema?.parameters[0];

    expect(parameter?.name).toBe("generation_config");
    expect(parameter?.jsonSchema).toEqual({
      type: "object",
      description: "Model-specific speech generation options.",
      properties: {
        voice: {
          type: "string",
          description: "Voice to use for speech generation.",
          default: "coral",
          enum: ["alloy", "coral"],
        },
        format: {
          type: "string",
          description: "Output audio format.",
          enum: ["mp3", "wav"],
        },
      },
      required: [],
    });
  });
});
