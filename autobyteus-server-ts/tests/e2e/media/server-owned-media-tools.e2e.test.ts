import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";

const mockConfig = vi.hoisted(() => ({
  get: vi.fn(),
}));

const mockImageClientFactory = vi.hoisted(() => ({
  ensureInitialized: vi.fn(),
  listModels: vi.fn(),
  createImageClient: vi.fn(),
}));

const mockAudioClientFactory = vi.hoisted(() => ({
  ensureInitialized: vi.fn(),
  listModels: vi.fn(),
  createAudioClient: vi.fn(),
}));

vi.mock("../../../src/config/app-config-provider.js", () => ({
  appConfigProvider: {
    config: mockConfig,
  },
}));

vi.mock("autobyteus-ts/multimedia/image/image-client-factory.js", () => ({
  ImageClientFactory: mockImageClientFactory,
}));

vi.mock("autobyteus-ts/multimedia/audio/audio-client-factory.js", () => ({
  AudioClientFactory: mockAudioClientFactory,
}));

import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import {
  ParameterDefinition,
  ParameterSchema,
  ParameterType,
} from "autobyteus-ts/utils/parameter-schema.js";
import {
  EDIT_IMAGE_TOOL_NAME,
  GENERATE_IMAGE_TOOL_NAME,
  GENERATE_SPEECH_TOOL_NAME,
} from "../../../src/agent-tools/media/media-tool-contract.js";
import { MediaPathResolver } from "../../../src/agent-tools/media/media-tool-path-resolver.js";
import {
  registerMediaTools,
  reloadMediaToolSchemas,
  unregisterMediaTools,
} from "../../../src/agent-tools/media/register-media-tools.js";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import {
  DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY,
  DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY,
  DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY,
} from "../../../src/config/media-default-model-settings.js";

type ImageGenerateCall = {
  modelIdentifier: string;
  prompt: string;
  inputImages?: string[] | null;
  generationConfig?: Record<string, unknown> | null;
};

type ImageEditCall = {
  modelIdentifier: string;
  prompt: string;
  inputImages: string[];
  maskImage?: string | null;
  generationConfig?: Record<string, unknown> | null;
};

type SpeechCall = {
  modelIdentifier: string;
  prompt: string;
  generationConfig?: Record<string, unknown> | null;
};

const IMAGE_BYTES = Buffer.from("server-owned-image-output");
const EDIT_IMAGE_BYTES = Buffer.from("server-owned-edited-image-output");
const AUDIO_BYTES = Buffer.from("server-owned-audio-output");
const IMAGE_DATA_URI = `data:image/png;base64,${IMAGE_BYTES.toString("base64")}`;
const EDIT_IMAGE_DATA_URI = `data:image/png;base64,${EDIT_IMAGE_BYTES.toString("base64")}`;
const AUDIO_DATA_URI = `data:audio/wav;base64,${AUDIO_BYTES.toString("base64")}`;
const INPUT_DATA_URI = `data:image/png;base64,${Buffer.from("input-image").toString("base64")}`;

let registrySnapshot: ReturnType<typeof defaultToolRegistry.snapshot>;
let configValues: Record<string, string | undefined>;
let imageGenerateCalls: ImageGenerateCall[];
let imageEditCalls: ImageEditCall[];
let speechCalls: SpeechCall[];
let tempDirs: string[];
let schema: GraphQLSchema;
let graphql: typeof graphqlFn;

const createModelSchema = (parameterName: string): ParameterSchema => {
  const schema = new ParameterSchema();
  schema.addParameter(new ParameterDefinition({
    name: parameterName,
    type: ParameterType.STRING,
    description: `Schema parameter ${parameterName}`,
    required: false,
  }));
  return schema;
};

const createOpenAiTtsSchema = (): ParameterSchema =>
  new ParameterSchema([
    new ParameterDefinition({
      name: "voice",
      type: ParameterType.ENUM,
      description: "The OpenAI TTS voice to use for generation.",
      enumValues: ["alloy", "coral"],
      defaultValue: "alloy",
    }),
    new ParameterDefinition({
      name: "format",
      type: ParameterType.ENUM,
      description: "The audio format to generate.",
      enumValues: ["mp3", "wav"],
      defaultValue: "mp3",
    }),
    new ParameterDefinition({
      name: "instructions",
      type: ParameterType.STRING,
      description: "Optional delivery instructions.",
    }),
  ]);

const configureMediaFactories = (): void => {
  mockConfig.get.mockImplementation((key: string) => configValues[key]);
  mockImageClientFactory.ensureInitialized.mockImplementation(() => undefined);
  mockImageClientFactory.listModels.mockReturnValue([
    {
      modelIdentifier: "image-gen-a",
      name: "Image Generation A",
      description: "generation model A capabilities",
      parameterSchema: createModelSchema("generationA"),
    },
    {
      modelIdentifier: "image-gen-b",
      name: "Image Generation B",
      description: "generation model B capabilities",
      parameterSchema: createModelSchema("generationB"),
    },
    {
      modelIdentifier: "image-edit-a",
      name: "Image Edit A",
      description: "edit model A capabilities",
      parameterSchema: createModelSchema("editA"),
    },
  ]);
  mockAudioClientFactory.ensureInitialized.mockImplementation(() => undefined);
  mockAudioClientFactory.listModels.mockReturnValue([
    {
      modelIdentifier: "speech-a",
      name: "Speech A",
      description: "speech model A capabilities",
      parameterSchema: createModelSchema("speechA"),
    },
  ]);
  mockImageClientFactory.createImageClient.mockImplementation((modelIdentifier: string) => ({
    generateImage: vi.fn(async (
      prompt: string,
      inputImages?: string[] | null,
      generationConfig?: Record<string, unknown> | null,
    ) => {
      imageGenerateCalls.push({ modelIdentifier, prompt, inputImages, generationConfig });
      return { image_urls: [IMAGE_DATA_URI] };
    }),
    editImage: vi.fn(async (
      prompt: string,
      inputImages: string[],
      maskImage?: string | null,
      generationConfig?: Record<string, unknown> | null,
    ) => {
      imageEditCalls.push({ modelIdentifier, prompt, inputImages, maskImage, generationConfig });
      return { image_urls: [EDIT_IMAGE_DATA_URI] };
    }),
    cleanup: vi.fn(async () => undefined),
  }));
  mockAudioClientFactory.createAudioClient.mockImplementation((modelIdentifier: string) => ({
    generateSpeech: vi.fn(async (
      prompt: string,
      generationConfig?: Record<string, unknown> | null,
    ) => {
      speechCalls.push({ modelIdentifier, prompt, generationConfig });
      return { audio_urls: [AUDIO_DATA_URI] };
    }),
    cleanup: vi.fn(async () => undefined),
  }));
};

beforeAll(async () => {
  schema = await buildGraphqlSchema();
  const require = createRequire(import.meta.url);
  const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
  const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
  const graphqlModule = await import(graphqlPath);
  graphql = graphqlModule.graphql as typeof graphqlFn;
});

const mkTempDir = (): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "server-owned-media-tools-e2e-"));
  tempDirs.push(dir);
  return dir;
};

const createExternalOutputDir = (): string => {
  const dir = fs.mkdtempSync(path.join(process.cwd(), ".server-owned-media-output-"));
  tempDirs.push(dir);
  return dir;
};

const createWorkspace = (): { workspaceRoot: string; inputPath: string; maskPath: string } => {
  const workspaceRoot = mkTempDir();
  const inputPath = path.join(workspaceRoot, "inputs", "reference.png");
  const maskPath = path.join(workspaceRoot, "inputs", "mask.png");
  fs.mkdirSync(path.dirname(inputPath), { recursive: true });
  fs.writeFileSync(inputPath, "reference image");
  fs.writeFileSync(maskPath, "mask image");
  return { workspaceRoot, inputPath, maskPath };
};

const expectFileBytes = (filePath: string, expected: Buffer): void => {
  expect(fs.existsSync(filePath)).toBe(true);
  expect(fs.readFileSync(filePath)).toEqual(expected);
};

beforeEach(() => {
  tempDirs = [];
  imageGenerateCalls = [];
  imageEditCalls = [];
  speechCalls = [];
  configValues = {
    [DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY]: "image-edit-a",
    [DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY]: "image-gen-a",
    [DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY]: "speech-a",
  };
  registrySnapshot = defaultToolRegistry.snapshot();
  unregisterMediaTools();
  vi.clearAllMocks();
  configureMediaFactories();
});

afterEach(() => {
  unregisterMediaTools();
  defaultToolRegistry.restore(registrySnapshot);
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  tempDirs = [];
});

describe("server-owned media tools API/E2E boundary", () => {
  it("executes the three canonical media tools through the AutoByteus local registry and writes output files", async () => {
    const { workspaceRoot, inputPath } = createWorkspace();
    const externalOutputDir = createExternalOutputDir();
    const generatedOutputPath = path.join(externalOutputDir, "generated.png");
    const editedOutputPath = path.join(externalOutputDir, "edited.png");
    const speechOutputPath = path.join(externalOutputDir, "speech.wav");
    const externalMaskPath = path.join(externalOutputDir, "mask.png");
    fs.writeFileSync(externalMaskPath, "external mask image");
    registerMediaTools();

    const generateImageTool = defaultToolRegistry.createTool(GENERATE_IMAGE_TOOL_NAME);
    const editImageTool = defaultToolRegistry.createTool(EDIT_IMAGE_TOOL_NAME);
    const generateSpeechTool = defaultToolRegistry.createTool(GENERATE_SPEECH_TOOL_NAME);

    const generated = await generateImageTool.execute(
      { agentId: "agent-auto", runId: "run-auto", workspaceRootPath: workspaceRoot } as any,
      {
        prompt: "paint an integration robot",
        input_images: ["inputs/reference.png"],
        output_file_path: generatedOutputPath,
        generation_config: { style: "watercolor" },
      },
    ) as { file_path: string };
    const edited = await editImageTool.execute(
      { agentId: "agent-auto", runId: "run-auto", workspaceRootPath: workspaceRoot } as any,
      {
        prompt: "add a blue badge",
        input_images: [generated.file_path, INPUT_DATA_URI],
        mask_image: pathToFileURL(externalMaskPath).href,
        output_file_path: editedOutputPath,
      },
    ) as { file_path: string };
    const speech = await generateSpeechTool.execute(
      { agentId: "agent-auto", runId: "run-auto", workspaceRootPath: workspaceRoot } as any,
      {
        prompt: "hello from the server owned speech tool",
        output_file_path: speechOutputPath,
        generation_config: { voice: "Test" },
      },
    ) as { file_path: string };

    expectFileBytes(generated.file_path, IMAGE_BYTES);
    expectFileBytes(edited.file_path, EDIT_IMAGE_BYTES);
    expectFileBytes(speech.file_path, AUDIO_BYTES);
    expect(generated.file_path).toBe(generatedOutputPath);
    expect(edited.file_path).toBe(editedOutputPath);
    expect(speech.file_path).toBe(speechOutputPath);
    expect(imageGenerateCalls).toEqual([
      expect.objectContaining({
        modelIdentifier: "image-gen-a",
        inputImages: [inputPath],
        generationConfig: { style: "watercolor" },
      }),
    ]);
    expect(imageEditCalls).toEqual([
      expect.objectContaining({
        modelIdentifier: "image-edit-a",
        inputImages: [generatedOutputPath, INPUT_DATA_URI],
        maskImage: externalMaskPath,
      }),
    ]);
    expect(speechCalls).toEqual([
      expect.objectContaining({
        modelIdentifier: "speech-a",
        generationConfig: { voice: "Test" },
      }),
    ]);
  });

  it("applies default media model setting changes to future AutoByteus schemas and invocations", async () => {
    const { workspaceRoot } = createWorkspace();
    registerMediaTools();

    const definition = defaultToolRegistry.getToolDefinition(GENERATE_IMAGE_TOOL_NAME);
    expect(definition?.description).toContain("image-gen-a");
    expect(definition?.description).toContain("generation model A capabilities");

    configValues[DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY] = "image-gen-b";
    reloadMediaToolSchemas();

    expect(definition?.description).toContain("image-gen-b");
    expect(definition?.description).toContain("generation model B capabilities");
    const schemaJson = definition?.argumentSchema?.toJsonSchema() as Record<string, any>;
    expect(schemaJson.properties.generation_config.description).toContain("image-gen-b");

    const generateImageTool = defaultToolRegistry.createTool(GENERATE_IMAGE_TOOL_NAME);
    await generateImageTool.execute(
      { agentId: "agent-auto", runId: "run-after-setting-change", workspaceRootPath: workspaceRoot } as any,
      {
        prompt: "paint the new configured model",
        output_file_path: "outputs/after-setting-change.png",
      },
    );

    expect(imageGenerateCalls.at(-1)).toMatchObject({
      modelIdentifier: "image-gen-b",
      prompt: "paint the new configured model",
    });
  });

  it("exposes nested generate_speech generation_config schema through the GraphQL tools query", async () => {
    configValues[DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY] = "gpt-4o-mini-tts";
    mockAudioClientFactory.listModels.mockReturnValue([
      {
        modelIdentifier: "gpt-4o-mini-tts",
        name: "gpt-4o-mini-tts",
        description: "OpenAI speech generation model.",
        parameterSchema: createOpenAiTtsSchema(),
      },
    ]);
    registerMediaTools();

    const result = await graphql({
      schema,
      source: `
        query Tools {
          tools(origin: LOCAL) {
            name
            argumentSchema {
              parameters {
                name
                paramType
                jsonSchema
              }
            }
          }
        }
      `,
    });

    if (result.errors?.length) {
      throw result.errors[0];
    }

    const data = result.data as {
      tools: Array<{
        name: string;
        argumentSchema?: {
          parameters: Array<{
            name: string;
            paramType: string;
            jsonSchema?: Record<string, any> | null;
          }>;
        } | null;
      }>;
    };
    const speechTool = data.tools.find((tool) => tool.name === GENERATE_SPEECH_TOOL_NAME);
    const parameters = speechTool?.argumentSchema?.parameters ?? [];
    const generationConfig = parameters.find((parameter) => parameter.name === "generation_config");

    expect(speechTool).toBeDefined();
    expect(parameters.map((parameter) => parameter.name)).not.toContain("voice");
    expect(generationConfig?.paramType).toBe("OBJECT");
    expect(generationConfig?.jsonSchema).toMatchObject({
      type: "object",
      properties: {
        voice: {
          type: "string",
          description: "The OpenAI TTS voice to use for generation.",
          default: "alloy",
          enum: ["alloy", "coral"],
        },
        format: {
          type: "string",
          description: "The audio format to generate.",
          default: "mp3",
          enum: ["mp3", "wav"],
        },
        instructions: {
          type: "string",
          description: "Optional delivery instructions.",
        },
      },
    });
  });

  it("normalizes media input paths consistently for workspace, external absolute, file URL, URL/data URI, missing, non-file, and traversal references", () => {
    const { workspaceRoot, inputPath } = createWorkspace();
    const resolver = new MediaPathResolver();
    const externalInputDir = createExternalOutputDir();
    const externalInputPath = path.join(externalInputDir, "external-reference.png");
    const nonFilePath = path.join(externalInputDir, "not-a-file");
    const externalOutputPath = path.join(
      externalInputDir,
      "generated.png",
    );
    fs.writeFileSync(externalInputPath, "external reference image");
    fs.mkdirSync(nonFilePath);

    expect(resolver.resolveInputImageReference("inputs/reference.png", { workspaceRootPath: workspaceRoot })).toBe(inputPath);
    expect(resolver.resolveInputImageReference(inputPath, { workspaceRootPath: workspaceRoot })).toBe(inputPath);
    expect(resolver.resolveInputImageReference(pathToFileURL(inputPath).href, { workspaceRootPath: workspaceRoot })).toBe(inputPath);
    expect(resolver.resolveInputImageReference(externalInputPath, { workspaceRootPath: workspaceRoot })).toBe(externalInputPath);
    expect(resolver.resolveInputImageReference(pathToFileURL(externalInputPath).href, { workspaceRootPath: workspaceRoot })).toBe(externalInputPath);
    expect(resolver.resolveInputImageReference("https://example.test/reference.png", { workspaceRootPath: workspaceRoot })).toBe("https://example.test/reference.png");
    expect(resolver.resolveInputImageReference(INPUT_DATA_URI, { workspaceRootPath: workspaceRoot })).toBe(INPUT_DATA_URI);
    expect(() => resolver.resolveInputImageReference("inputs/missing.png", { workspaceRootPath: workspaceRoot })).toThrow(/does not resolve to an existing file/);
    expect(() => resolver.resolveInputImageReference(nonFilePath, { workspaceRootPath: workspaceRoot })).toThrow(/does not resolve to an existing file/);
    expect(() => resolver.resolveInputImageReference("../reference.png", { workspaceRootPath: workspaceRoot })).toThrow(/escapes the workspace/);
    expect(resolver.resolveOutputFilePath("outputs/generated.png", {
      workspaceRootPath: workspaceRoot,
    })).toBe(path.join(workspaceRoot, "outputs", "generated.png"));
    expect(resolver.resolveOutputFilePath(externalOutputPath, {
      workspaceRootPath: workspaceRoot,
    })).toBe(externalOutputPath);
    expect(() => resolver.resolveOutputFilePath("../generated.png", {
      workspaceRootPath: workspaceRoot,
    })).toThrow(/escapes the workspace/);
  });

});
