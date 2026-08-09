import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MEDIA_OPERATION_TIMEOUT_SETTING,
  MIN_MEDIA_OPERATION_TIMEOUT_MS,
  MediaGenerationService,
} from "../../../../src/agent-tools/media/media-generation-service.js";
import type { MediaModelResolver } from "../../../../src/agent-tools/media/media-tool-model-resolver.js";
import type { MediaPathResolver } from "../../../../src/agent-tools/media/media-tool-path-resolver.js";

const GENERATED_BYTES = Buffer.from("generated-media");

const createModelResolver = () => ({
  resolve: vi.fn((kind: string) => ({
    kind,
    settingKey: `SETTING_${kind}`,
    modelIdentifier: `${kind}-model`,
    catalogModel: null,
  })),
}) as unknown as MediaModelResolver & { resolve: ReturnType<typeof vi.fn> };

const createPathResolver = (
  outputPath: string,
  writeImplementation: (sourceUrl: string, targetPath: string, options: Record<string, unknown>) => Promise<void> =
    async (_sourceUrl, targetPath) => {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, GENERATED_BYTES);
    },
) => ({
  resolveOutputFilePath: vi.fn((_path: string) => outputPath),
  resolveInputImageReferences: vi.fn((images?: string[] | null) => images ?? []),
  resolveInputImageReference: vi.fn((image: string) => path.join(path.dirname(outputPath), image)),
  writeGeneratedMediaFromUrl: vi.fn(writeImplementation),
}) as unknown as MediaPathResolver & Record<string, ReturnType<typeof vi.fn>>;

describe("MediaGenerationService", () => {
  let tempDir: string;
  let outputPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "media-generation-service-"));
    outputPath = path.join(tempDir, "out.bin");
  });

  afterEach(() => {
    vi.useRealTimers();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("generates images through the configured service owners, publishes staging, and cleans up the per-call client", async () => {
    const modelResolver = createModelResolver();
    const pathResolver = createPathResolver(outputPath);
    const cleanup = vi.fn(async () => undefined);
    const generateImage = vi.fn(async () => ({ image_urls: ["data:image/png;base64,AA=="] }));

    const service = new MediaGenerationService({
      modelResolver,
      pathResolver,
      createImageClient: vi.fn(async () => ({ generateImage, editImage: vi.fn(), cleanup })),
      getServerTimeout: () => MIN_MEDIA_OPERATION_TIMEOUT_MS,
    });

    await expect(service.generateImage(
      { agentId: "agent-1", workspaceRootPath: tempDir },
      {
        prompt: "paint a tree",
        input_images: ["ref.png"],
        output_file_path: "out.png",
        generation_config: { size: "1024x1024" },
      },
    )).resolves.toEqual({ file_path: outputPath });

    expect(modelResolver.resolve).toHaveBeenCalledWith("image_generation");
    expect(pathResolver.resolveOutputFilePath).toHaveBeenCalledWith("out.png", expect.any(Object));
    expect(pathResolver.resolveInputImageReferences).toHaveBeenCalledWith(["ref.png"], expect.any(Object));
    expect(generateImage).toHaveBeenCalledWith(
      "paint a tree",
      ["ref.png"],
      { size: "1024x1024" },
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        deadlineAt: expect.any(Number),
      }),
    );
    expect(pathResolver.writeGeneratedMediaFromUrl).toHaveBeenCalledWith(
      "data:image/png;base64,AA==",
      expect.stringMatching(/\.out\.bin\.[^.]+\.staging$/),
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        deadlineAt: expect.any(Number),
      }),
    );
    expect(fs.readFileSync(outputPath)).toEqual(GENERATED_BYTES);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("times out a provider that never resolves using the explicit media-owned bound", async () => {
    vi.useFakeTimers();
    const modelResolver = createModelResolver();
    const pathResolver = createPathResolver(outputPath);
    const generateImage = vi.fn(async () => new Promise<never>(() => undefined));

    const service = new MediaGenerationService({
      modelResolver,
      pathResolver,
      createImageClient: vi.fn(async () => ({ generateImage, editImage: vi.fn() })),
      getServerTimeout: () => MIN_MEDIA_OPERATION_TIMEOUT_MS * 2,
    });

    const execution = service.generateImage(
      { agentId: "agent-timeout", workspaceRootPath: tempDir },
      { prompt: "never resolve", output_file_path: "out.png" },
      { mediaOperationTimeoutMs: MIN_MEDIA_OPERATION_TIMEOUT_MS },
    );
    const rejection = expect(execution).rejects.toThrow(
      `Media operation timed out after ${MIN_MEDIA_OPERATION_TIMEOUT_MS}ms.`,
    );

    await vi.advanceTimersByTimeAsync(MIN_MEDIA_OPERATION_TIMEOUT_MS);
    await rejection;

    const operationOptions = generateImage.mock.calls[0]?.[3];
    expect(operationOptions?.signal?.aborted).toBe(true);
    expect(fs.existsSync(outputPath)).toBe(false);
  });

  it("times out when returned-media transfer never resolves and never fabricates a published result", async () => {
    vi.useFakeTimers();
    let transferOptions: Record<string, unknown> | undefined;
    const transferStarted = vi.fn();
    const pathResolver = createPathResolver(
      outputPath,
      async (_sourceUrl, _targetPath, options) => {
        transferOptions = options;
        transferStarted();
        await new Promise<never>(() => undefined);
      },
    );
    const cleanup = vi.fn(async () => undefined);
    const service = new MediaGenerationService({
      modelResolver: createModelResolver(),
      pathResolver,
      createImageClient: vi.fn(async () => ({
        generateImage: vi.fn(async () => ({ image_urls: ["data:image/png;base64,AA=="] })),
        editImage: vi.fn(),
        cleanup,
      })),
      getServerTimeout: () => MIN_MEDIA_OPERATION_TIMEOUT_MS,
    });

    const execution = service.generateImage(
      { agentId: "agent-transfer-timeout", workspaceRootPath: tempDir },
      { prompt: "transfer never resolves", output_file_path: "out.png" },
    );
    const rejection = expect(execution).rejects.toThrow(
      `Media operation timed out after ${MIN_MEDIA_OPERATION_TIMEOUT_MS}ms.`,
    );

    await vi.advanceTimersByTimeAsync(MIN_MEDIA_OPERATION_TIMEOUT_MS);
    await rejection;

    expect(transferStarted).toHaveBeenCalledTimes(1);
    expect((transferOptions?.signal as AbortSignal | undefined)?.aborted).toBe(true);
    expect(fs.existsSync(outputPath)).toBe(false);
    expect(cleanup).not.toHaveBeenCalled();
  });

  it("reports a deterministic transfer rejection and performs client cleanup", async () => {
    const transferFailure = new Error("synthetic transfer failed");
    const pathResolver = createPathResolver(outputPath, async () => {
      throw transferFailure;
    });
    const cleanup = vi.fn(async () => undefined);
    const service = new MediaGenerationService({
      modelResolver: createModelResolver(),
      pathResolver,
      createImageClient: vi.fn(async () => ({
        generateImage: vi.fn(async () => ({ image_urls: ["data:image/png;base64,AA=="] })),
        editImage: vi.fn(),
        cleanup,
      })),
      getServerTimeout: () => MIN_MEDIA_OPERATION_TIMEOUT_MS,
    });

    await expect(service.generateImage(
      { agentId: "agent-transfer-failure", workspaceRootPath: tempDir },
      { prompt: "transfer rejects", output_file_path: "out.png" },
    )).rejects.toBe(transferFailure);

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(outputPath)).toBe(false);
  });

  it("bounds hanging cleanup before reporting the provider failure", async () => {
    vi.useFakeTimers();
    const providerFailure = new Error("synthetic provider failed");
    const cleanup = vi.fn(async () => new Promise<never>(() => undefined));
    const service = new MediaGenerationService({
      modelResolver: createModelResolver(),
      pathResolver: createPathResolver(outputPath),
      createImageClient: vi.fn(async () => ({
        generateImage: vi.fn(async () => {
          throw providerFailure;
        }),
        editImage: vi.fn(),
        cleanup,
      })),
      getServerTimeout: () => MIN_MEDIA_OPERATION_TIMEOUT_MS,
    });

    let settled = false;
    const execution = service.generateImage(
      { agentId: "agent-cleanup-timeout", workspaceRootPath: tempDir },
      { prompt: "provider rejects", output_file_path: "out.png" },
    );
    void execution.then(() => {
      settled = true;
    }, () => {
      settled = true;
    });
    const rejection = expect(execution).rejects.toBe(providerFailure);

    await vi.advanceTimersByTimeAsync(4_999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await rejection;

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(outputPath)).toBe(false);
  });

  it("diagnoses an invalid explicit timeout and uses the valid server setting", async () => {
    vi.useFakeTimers();
    const diagnostics = vi.fn();
    const service = new MediaGenerationService({
      modelResolver: createModelResolver(),
      pathResolver: createPathResolver(outputPath),
      createImageClient: vi.fn(async () => ({
        generateImage: vi.fn(async () => new Promise<never>(() => undefined)),
        editImage: vi.fn(),
      })),
      getServerTimeout: () => MIN_MEDIA_OPERATION_TIMEOUT_MS,
      onConfigurationDiagnostic: diagnostics,
    });

    const execution = service.generateImage(
      { agentId: "agent-config", workspaceRootPath: tempDir },
      { prompt: "invalid config", output_file_path: "out.png" },
      { mediaOperationTimeoutMs: MIN_MEDIA_OPERATION_TIMEOUT_MS - 1 },
    );
    const rejection = expect(execution).rejects.toThrow(
      `Media operation timed out after ${MIN_MEDIA_OPERATION_TIMEOUT_MS}ms.`,
    );

    await vi.advanceTimersByTimeAsync(MIN_MEDIA_OPERATION_TIMEOUT_MS);
    await rejection;

    expect(diagnostics).toHaveBeenCalledWith(expect.stringContaining(MEDIA_OPERATION_TIMEOUT_SETTING));
  });

  it("edits images with resolved input images and mask image", async () => {
    const modelResolver = createModelResolver();
    const pathResolver = createPathResolver(outputPath);
    const editImage = vi.fn(async () => ({ image_urls: ["/tmp/generated.png"] }));

    const service = new MediaGenerationService({
      modelResolver,
      pathResolver,
      createImageClient: vi.fn(async () => ({ generateImage: vi.fn(), editImage })),
    });

    await service.editImage(
      { workspaceRootPath: tempDir },
      {
        prompt: "add a cat",
        input_images: ["base.png"],
        mask_image: "mask.png",
        output_file_path: "edited.png",
      },
    );

    expect(modelResolver.resolve).toHaveBeenCalledWith("image_edit");
    expect(pathResolver.resolveInputImageReference).toHaveBeenCalledWith("mask.png", expect.any(Object));
    expect(editImage).toHaveBeenCalledWith(
      "add a cat",
      ["base.png"],
      path.join(tempDir, "mask.png"),
      undefined,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("generates speech and writes the returned audio URL to the requested output path", async () => {
    const modelResolver = createModelResolver();
    const pathResolver = createPathResolver(outputPath);
    const generateSpeech = vi.fn(async () => ({ audio_urls: ["/tmp/audio.wav"] }));

    const service = new MediaGenerationService({
      modelResolver,
      pathResolver,
      createAudioClient: vi.fn(async () => ({ generateSpeech })),
    });

    await service.generateSpeech(
      { workspaceRootPath: tempDir },
      {
        prompt: "hello",
        output_file_path: "speech.wav",
        generation_config: { voice_name: "Kore" },
      },
    );

    expect(modelResolver.resolve).toHaveBeenCalledWith("speech_generation");
    expect(generateSpeech).toHaveBeenCalledWith(
      "hello",
      { voice_name: "Kore" },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(pathResolver.writeGeneratedMediaFromUrl).toHaveBeenCalledWith(
      "/tmp/audio.wav",
      outputPath,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("generates video through the configured video client and writes the returned video URL", async () => {
    const modelResolver = createModelResolver();
    const pathResolver = createPathResolver(outputPath);
    const cleanup = vi.fn(async () => undefined);
    const generateVideo = vi.fn(async () => ({ video_urls: ["data:video/mp4;base64,AA=="] }));

    const service = new MediaGenerationService({
      modelResolver,
      pathResolver,
      createVideoClient: vi.fn(async () => ({ generateVideo, cleanup })),
    });

    await expect(service.generateVideo(
      { workspaceRootPath: tempDir },
      {
        prompt: "make a short robot video",
        input_images: ["ref.png"],
        output_file_path: "video.mp4",
        generation_config: { aspect_ratio: "9:16" },
      },
    )).resolves.toEqual({ file_path: outputPath });

    expect(modelResolver.resolve).toHaveBeenCalledWith("video_generation");
    expect(pathResolver.resolveInputImageReferences).toHaveBeenCalledWith(["ref.png"], expect.any(Object));
    expect(generateVideo).toHaveBeenCalledWith(
      "make a short robot video",
      ["ref.png"],
      { aspect_ratio: "9:16" },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(pathResolver.writeGeneratedMediaFromUrl).toHaveBeenCalledWith(
      "data:video/mp4;base64,AA==",
      outputPath,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
