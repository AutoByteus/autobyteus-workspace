import { describe, expect, it, vi } from "vitest";
import { MediaGenerationService } from "../../../../src/agent-tools/media/media-generation-service.js";
import type { MediaModelResolver } from "../../../../src/agent-tools/media/media-tool-model-resolver.js";
import type { MediaPathResolver } from "../../../../src/agent-tools/media/media-tool-path-resolver.js";

const createModelResolver = () => ({
  resolve: vi.fn((kind: string) => ({
    kind,
    settingKey: `SETTING_${kind}`,
    modelIdentifier: `${kind}-model`,
    catalogModel: null,
  })),
}) as unknown as MediaModelResolver & { resolve: ReturnType<typeof vi.fn> };

const createPathResolver = () => ({
  resolveOutputFilePath: vi.fn((_path: string) => "/tmp/workspace/out.bin"),
  resolveInputImageReferences: vi.fn((images?: string[] | null) => images ?? []),
  resolveInputImageReference: vi.fn((image: string) => `/tmp/workspace/${image}`),
  writeGeneratedMediaFromUrl: vi.fn(async () => undefined),
}) as unknown as MediaPathResolver & Record<string, ReturnType<typeof vi.fn>>;

describe("MediaGenerationService", () => {
  it("generates images through the configured service owners and cleans up the per-call client", async () => {
    const modelResolver = createModelResolver();
    const pathResolver = createPathResolver();
    const cleanup = vi.fn(async () => undefined);
    const generateImage = vi.fn(async () => ({ image_urls: ["data:image/png;base64,AA=="] }));

    const service = new MediaGenerationService({
      modelResolver,
      pathResolver,
      createImageClient: vi.fn(() => ({ generateImage, editImage: vi.fn(), cleanup })),
    });

    await expect(service.generateImage(
      { agentId: "agent-1", workspaceRootPath: "/tmp/workspace" },
      {
        prompt: "paint a tree",
        input_images: ["ref.png"],
        output_file_path: "out.png",
        generation_config: { size: "1024x1024" },
      },
    )).resolves.toEqual({ file_path: "/tmp/workspace/out.bin" });

    expect(modelResolver.resolve).toHaveBeenCalledWith("image_generation");
    expect(pathResolver.resolveOutputFilePath).toHaveBeenCalledWith("out.png", expect.any(Object));
    expect(pathResolver.resolveInputImageReferences).toHaveBeenCalledWith(["ref.png"], expect.any(Object));
    expect(generateImage).toHaveBeenCalledWith(
      "paint a tree",
      ["ref.png"],
      { size: "1024x1024" },
    );
    expect(pathResolver.writeGeneratedMediaFromUrl).toHaveBeenCalledWith(
      "data:image/png;base64,AA==",
      "/tmp/workspace/out.bin",
    );
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("edits images with resolved input images and mask image", async () => {
    const modelResolver = createModelResolver();
    const pathResolver = createPathResolver();
    const editImage = vi.fn(async () => ({ image_urls: ["/tmp/generated.png"] }));

    const service = new MediaGenerationService({
      modelResolver,
      pathResolver,
      createImageClient: vi.fn(() => ({ generateImage: vi.fn(), editImage })),
    });

    await service.editImage(
      { workspaceRootPath: "/tmp/workspace" },
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
      "/tmp/workspace/mask.png",
      undefined,
    );
  });

  it("generates speech and writes the returned audio URL to the requested output path", async () => {
    const modelResolver = createModelResolver();
    const pathResolver = createPathResolver();
    const generateSpeech = vi.fn(async () => ({ audio_urls: ["/tmp/audio.wav"] }));

    const service = new MediaGenerationService({
      modelResolver,
      pathResolver,
      createAudioClient: vi.fn(() => ({ generateSpeech })),
    });

    await service.generateSpeech(
      { workspaceRootPath: "/tmp/workspace" },
      {
        prompt: "hello",
        output_file_path: "speech.wav",
        generation_config: { voice_name: "Kore" },
      },
    );

    expect(modelResolver.resolve).toHaveBeenCalledWith("speech_generation");
    expect(generateSpeech).toHaveBeenCalledWith("hello", { voice_name: "Kore" });
    expect(pathResolver.writeGeneratedMediaFromUrl).toHaveBeenCalledWith(
      "/tmp/audio.wav",
      "/tmp/workspace/out.bin",
    );
  });
});
