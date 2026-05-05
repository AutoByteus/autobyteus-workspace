import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../src/agent-execution/domain/agent-run-event.js";
import { AgentRunEventPipeline } from "../../../src/agent-execution/events/agent-run-event-pipeline.js";
import { FileChangeEventProcessor } from "../../../src/agent-execution/events/processors/file-change/file-change-event-processor.js";
import { FileChangePayloadBuilder } from "../../../src/agent-execution/events/processors/file-change/file-change-payload-builder.js";
import { ClaudeSessionEventConverter } from "../../../src/agent-execution/backends/claude/events/claude-session-event-converter.js";
import { ClaudeSessionEventName } from "../../../src/agent-execution/backends/claude/events/claude-session-event-name.js";
import { buildMediaDynamicToolRegistrationsForEnabledToolNames } from "../../../src/agent-execution/backends/codex/media/build-media-dynamic-tool-registrations.js";
import { buildClaudeMediaMcpServer } from "../../../src/agent-execution/backends/claude/media/build-claude-media-mcp-server.js";
import {
  EDIT_IMAGE_TOOL_NAME,
  GENERATE_IMAGE_TOOL_NAME,
  GENERATE_SPEECH_TOOL_NAME,
  MEDIA_TOOL_NAME_LIST,
  type MediaToolName,
} from "../../../src/agent-tools/media/media-tool-contract.js";
import { MediaPathResolver } from "../../../src/agent-tools/media/media-tool-path-resolver.js";
import {
  registerMediaTools,
  reloadMediaToolSchemas,
  unregisterMediaTools,
} from "../../../src/agent-tools/media/register-media-tools.js";
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

const mkTempDir = (): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "server-owned-media-tools-e2e-"));
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

const parseCodexJsonResult = (result: { contentItems: Array<{ text: string }> }): unknown =>
  JSON.parse(result.contentItems[0]?.text ?? "null");

const parseClaudeJsonResult = (result: { content?: Array<{ text?: string }> }): unknown =>
  JSON.parse(result.content?.[0]?.text ?? "null");

const findCodexRegistration = (
  registrations: NonNullable<ReturnType<typeof buildMediaDynamicToolRegistrationsForEnabledToolNames>>,
  toolName: MediaToolName,
) => {
  const registration = registrations.find((candidate) => candidate.spec.name === toolName);
  expect(registration).toBeDefined();
  return registration!;
};

const buildFileChangePipelineHarness = (workspaceRoot: string) => {
  const runContext = {
    runId: "run-claude-media-projection",
    config: { workspaceId: "workspace-media" },
    runtimeContext: null,
  } as any;
  const workspaceManager = {
    getWorkspaceById: vi.fn().mockReturnValue({ getBasePath: () => workspaceRoot }),
  } as any;
  const pipeline = new AgentRunEventPipeline([
    new FileChangeEventProcessor(new FileChangePayloadBuilder(workspaceManager)),
  ]);
  return {
    process: (events: AgentRunEvent[]) => pipeline.process({ runContext, events }),
    fileChanges: (events: AgentRunEvent[]) => events.filter(
      (event) => event.eventType === AgentRunEventType.FILE_CHANGE,
    ),
  };
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
    const { workspaceRoot, inputPath, maskPath } = createWorkspace();
    registerMediaTools();

    const generateImageTool = defaultToolRegistry.createTool(GENERATE_IMAGE_TOOL_NAME);
    const editImageTool = defaultToolRegistry.createTool(EDIT_IMAGE_TOOL_NAME);
    const generateSpeechTool = defaultToolRegistry.createTool(GENERATE_SPEECH_TOOL_NAME);

    const generated = await generateImageTool.execute(
      { agentId: "agent-auto", runId: "run-auto", workspaceRootPath: workspaceRoot } as any,
      {
        prompt: "paint an integration robot",
        input_images: ["inputs/reference.png"],
        output_file_path: "outputs/generated.png",
        generation_config: { style: "watercolor" },
      },
    ) as { file_path: string };
    const edited = await editImageTool.execute(
      { agentId: "agent-auto", runId: "run-auto", workspaceRootPath: workspaceRoot } as any,
      {
        prompt: "add a blue badge",
        input_images: [inputPath, INPUT_DATA_URI],
        mask_image: "inputs/mask.png",
        output_file_path: "outputs/edited.png",
      },
    ) as { file_path: string };
    const speech = await generateSpeechTool.execute(
      { agentId: "agent-auto", runId: "run-auto", workspaceRootPath: workspaceRoot } as any,
      {
        prompt: "hello from the server owned speech tool",
        output_file_path: "outputs/speech.wav",
        generation_config: { voice: "Test" },
      },
    ) as { file_path: string };

    expectFileBytes(generated.file_path, IMAGE_BYTES);
    expectFileBytes(edited.file_path, EDIT_IMAGE_BYTES);
    expectFileBytes(speech.file_path, AUDIO_BYTES);
    expect(generated.file_path).toBe(path.join(workspaceRoot, "outputs", "generated.png"));
    expect(edited.file_path).toBe(path.join(workspaceRoot, "outputs", "edited.png"));
    expect(speech.file_path).toBe(path.join(workspaceRoot, "outputs", "speech.wav"));
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
        inputImages: [inputPath, INPUT_DATA_URI],
        maskImage: maskPath,
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

  it("normalizes media input paths consistently for workspace, absolute, URL/data URI, disallowed, and nonexistent references", () => {
    const { workspaceRoot, inputPath } = createWorkspace();
    const resolver = new MediaPathResolver();

    expect(resolver.resolveInputImageReference("inputs/reference.png", { workspaceRootPath: workspaceRoot })).toBe(inputPath);
    expect(resolver.resolveInputImageReference(inputPath, { workspaceRootPath: workspaceRoot })).toBe(inputPath);
    expect(resolver.resolveInputImageReference(pathToFileURL(inputPath).href, { workspaceRootPath: workspaceRoot })).toBe(inputPath);
    expect(resolver.resolveInputImageReference("https://example.test/reference.png", { workspaceRootPath: workspaceRoot })).toBe("https://example.test/reference.png");
    expect(resolver.resolveInputImageReference(INPUT_DATA_URI, { workspaceRootPath: workspaceRoot })).toBe(INPUT_DATA_URI);
    expect(() => resolver.resolveInputImageReference("inputs/missing.png", { workspaceRootPath: workspaceRoot })).toThrow(/does not resolve to an existing file/);
    expect(() => resolver.resolveInputImageReference("/etc/passwd", { workspaceRootPath: workspaceRoot })).toThrow(/Security Violation/);
    expect(() => resolver.resolveOutputFilePath("/etc/generated.png", { workspaceRootPath: workspaceRoot })).toThrow(/Security Violation/);
  });

  it("executes all enabled Codex dynamic media tools and returns structured failures for invalid input paths", async () => {
    const { workspaceRoot, inputPath } = createWorkspace();
    const registrations = buildMediaDynamicToolRegistrationsForEnabledToolNames({
      enabledToolNames: [...MEDIA_TOOL_NAME_LIST, "read_file"],
      workingDirectory: workspaceRoot,
    });

    expect(registrations?.map((registration) => registration.spec.name)).toEqual(MEDIA_TOOL_NAME_LIST);

    const generateResult = await findCodexRegistration(registrations!, GENERATE_IMAGE_TOOL_NAME).handler({
      runId: "run-codex-media",
      threadId: "thread-codex-media",
      turnId: "turn-codex-media",
      callId: "call-generate-image",
      toolName: GENERATE_IMAGE_TOOL_NAME,
      arguments: {
        prompt: "codex generate",
        input_images: ["inputs/reference.png", INPUT_DATA_URI],
        output_file_path: "codex/generated.png",
      },
    });
    const editResult = await findCodexRegistration(registrations!, EDIT_IMAGE_TOOL_NAME).handler({
      runId: "run-codex-media",
      threadId: "thread-codex-media",
      turnId: "turn-codex-media",
      callId: "call-edit-image",
      toolName: EDIT_IMAGE_TOOL_NAME,
      arguments: {
        prompt: "codex edit",
        input_images: [inputPath],
        output_file_path: "codex/edited.png",
      },
    });
    const speechResult = await findCodexRegistration(registrations!, GENERATE_SPEECH_TOOL_NAME).handler({
      runId: "run-codex-media",
      threadId: "thread-codex-media",
      turnId: "turn-codex-media",
      callId: "call-generate-speech",
      toolName: GENERATE_SPEECH_TOOL_NAME,
      arguments: {
        prompt: "codex speech",
        output_file_path: "codex/speech.wav",
      },
    });

    for (const result of [generateResult, editResult, speechResult]) {
      expect(result.success).toBe(true);
      expect(parseCodexJsonResult(result)).toMatchObject({ file_path: expect.any(String) });
    }
    expectFileBytes((parseCodexJsonResult(generateResult) as { file_path: string }).file_path, IMAGE_BYTES);
    expectFileBytes((parseCodexJsonResult(editResult) as { file_path: string }).file_path, EDIT_IMAGE_BYTES);
    expectFileBytes((parseCodexJsonResult(speechResult) as { file_path: string }).file_path, AUDIO_BYTES);
    expect(imageGenerateCalls.at(-1)?.inputImages).toEqual([inputPath, INPUT_DATA_URI]);
    expect(imageEditCalls.at(-1)?.inputImages).toEqual([inputPath]);

    const missingInputResult = await findCodexRegistration(registrations!, GENERATE_IMAGE_TOOL_NAME).handler({
      runId: "run-codex-media",
      threadId: "thread-codex-media",
      turnId: "turn-codex-media",
      callId: "call-missing-input",
      toolName: GENERATE_IMAGE_TOOL_NAME,
      arguments: {
        prompt: "bad path",
        input_images: ["inputs/missing.png"],
        output_file_path: "codex/missing.png",
      },
    });

    expect(missingInputResult.success).toBe(false);
    expect(parseCodexJsonResult(missingInputResult)).toMatchObject({
      error: {
        code: "media_tool_execution_failed",
        message: expect.stringMatching(/does not resolve to an existing file/),
      },
    });
  });

  it("executes Claude MCP-projected media tools and converts MCP-prefixed results into generated-output file changes", async () => {
    const { workspaceRoot, inputPath } = createWorkspace();
    const createToolDefinition = vi.fn(async (definition) => definition);
    const createMcpServer = vi.fn(async ({ name, tools }) => ({ name, tools }));
    const servers = await buildClaudeMediaMcpServer({
      sdkClient: { createToolDefinition, createMcpServer } as any,
      enabledToolNames: MEDIA_TOOL_NAME_LIST,
      workingDirectory: workspaceRoot,
    });
    const mediaServer = servers?.autobyteus_image_audio as { tools: Array<{ name: string; handler: (input: unknown) => Promise<Record<string, unknown>> }> };

    expect(mediaServer).toBeDefined();
    expect(createMcpServer).toHaveBeenCalledWith(expect.objectContaining({
      name: "autobyteus_image_audio",
      tools: expect.any(Array),
    }));
    expect(mediaServer.tools.map((tool) => tool.name)).toEqual(MEDIA_TOOL_NAME_LIST);

    const handlerInputByTool: Record<MediaToolName, Record<string, unknown>> = {
      [GENERATE_IMAGE_TOOL_NAME]: {
        prompt: "claude generate",
        input_images: [INPUT_DATA_URI],
        output_file_path: "claude/generated.png",
      },
      [EDIT_IMAGE_TOOL_NAME]: {
        prompt: "claude edit",
        input_images: [inputPath],
        output_file_path: "claude/edited.png",
      },
      [GENERATE_SPEECH_TOOL_NAME]: {
        prompt: "claude speech",
        output_file_path: "claude/speech.wav",
      },
    };
    const expectedTypeByTool: Record<MediaToolName, string> = {
      [GENERATE_IMAGE_TOOL_NAME]: "image",
      [EDIT_IMAGE_TOOL_NAME]: "image",
      [GENERATE_SPEECH_TOOL_NAME]: "audio",
    };
    const converter = new ClaudeSessionEventConverter("run-claude-media-projection");
    const { process, fileChanges } = buildFileChangePipelineHarness(workspaceRoot);

    for (const toolName of MEDIA_TOOL_NAME_LIST) {
      const tool = mediaServer.tools.find((candidate) => candidate.name === toolName);
      expect(tool).toBeDefined();
      const handlerResult = await tool!.handler(handlerInputByTool[toolName]);
      const filePath = (parseClaudeJsonResult(handlerResult) as { file_path: string }).file_path;
      expect(filePath).toBe(path.join(workspaceRoot, handlerInputByTool[toolName].output_file_path as string));
      expectFileBytes(
        filePath,
        toolName === GENERATE_SPEECH_TOOL_NAME
          ? AUDIO_BYTES
          : toolName === EDIT_IMAGE_TOOL_NAME
            ? EDIT_IMAGE_BYTES
            : IMAGE_BYTES,
      );

      const convertedEvents = converter.convert({
        method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
        params: {
          invocation_id: `invoke-${toolName}`,
          tool_name: `mcp__autobyteus_image_audio__${toolName}`,
          result: handlerResult,
        },
      });
      expect(convertedEvents).toHaveLength(1);
      expect(convertedEvents[0]?.payload).toMatchObject({
        tool_name: toolName,
        result: { file_path: filePath },
      });

      const processed = await process(convertedEvents);
      expect(fileChanges(processed).at(-1)?.payload).toMatchObject({
        path: handlerInputByTool[toolName].output_file_path,
        type: expectedTypeByTool[toolName],
        status: "available",
        sourceTool: "generated_output",
        sourceInvocationId: `invoke-${toolName}`,
      });
    }
  });
});
