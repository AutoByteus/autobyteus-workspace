import { beforeEach, describe, expect, it, vi } from "vitest";

const mockConfig = vi.hoisted(() => ({
  get: vi.fn(),
}));

const mockImageClientFactory = vi.hoisted(() => ({
  ensureInitialized: vi.fn(),
  listModels: vi.fn(),
}));

const mockAudioClientFactory = vi.hoisted(() => ({
  ensureInitialized: vi.fn(),
  listModels: vi.fn(),
}));

vi.mock("../../../../src/config/app-config-provider.js", () => ({
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

import {
  DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY,
  DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY,
  DEFAULT_IMAGE_MODEL_IDENTIFIER,
  DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY,
  DEFAULT_SPEECH_MODEL_IDENTIFIER,
} from "../../../../src/config/media-default-model-settings.js";
import { MediaModelResolver } from "../../../../src/agent-tools/media/media-tool-model-resolver.js";

const configuredImageEditModel = {
  modelIdentifier: "configured-edit-model",
  name: "Configured Edit Model",
};
const configuredImageGenerationModel = {
  modelIdentifier: "configured-generation-model",
  name: "Configured Generation Model",
};
const fallbackImageModel = {
  modelIdentifier: DEFAULT_IMAGE_MODEL_IDENTIFIER,
  name: "Fallback Image Model",
};
const configuredSpeechModel = {
  modelIdentifier: "configured-speech-model",
  name: "Configured Speech Model",
};
const fallbackSpeechModel = {
  modelIdentifier: DEFAULT_SPEECH_MODEL_IDENTIFIER,
  name: "Fallback Speech Model",
};

describe("MediaModelResolver", () => {
  beforeEach(() => {
    mockConfig.get.mockReset();
    mockImageClientFactory.ensureInitialized.mockReset();
    mockImageClientFactory.listModels.mockReset();
    mockAudioClientFactory.ensureInitialized.mockReset();
    mockAudioClientFactory.listModels.mockReset();

    mockImageClientFactory.listModels.mockReturnValue([
      configuredImageEditModel,
      configuredImageGenerationModel,
      fallbackImageModel,
    ]);
    mockAudioClientFactory.listModels.mockReturnValue([
      configuredSpeechModel,
      fallbackSpeechModel,
    ]);
  });

  it("uses configured server setting values for all media model kinds when present", () => {
    mockConfig.get.mockImplementation((key: string) => ({
      [DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY]: "  configured-edit-model  ",
      [DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY]: "Configured Generation Model",
      [DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY]: "configured-speech-model",
    })[key]);

    const resolver = new MediaModelResolver();

    expect(resolver.resolve("image_edit")).toMatchObject({
      kind: "image_edit",
      settingKey: DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY,
      modelIdentifier: "configured-edit-model",
      catalogModel: configuredImageEditModel,
    });
    expect(resolver.resolve("image_generation")).toMatchObject({
      kind: "image_generation",
      settingKey: DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY,
      modelIdentifier: "Configured Generation Model",
      catalogModel: configuredImageGenerationModel,
    });
    expect(resolver.resolve("speech_generation")).toMatchObject({
      kind: "speech_generation",
      settingKey: DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY,
      modelIdentifier: "configured-speech-model",
      catalogModel: configuredSpeechModel,
    });

    expect(mockImageClientFactory.ensureInitialized).toHaveBeenCalledTimes(2);
    expect(mockAudioClientFactory.ensureInitialized).toHaveBeenCalledTimes(1);
  });

  it("falls back to approved defaults for all media model kinds when settings are absent or blank", () => {
    mockConfig.get.mockImplementation((key: string) => ({
      [DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY]: "   ",
      [DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY]: "",
    })[key]);

    const resolver = new MediaModelResolver();

    expect(resolver.resolve("image_edit")).toMatchObject({
      kind: "image_edit",
      settingKey: DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY,
      modelIdentifier: DEFAULT_IMAGE_MODEL_IDENTIFIER,
      catalogModel: fallbackImageModel,
    });
    expect(resolver.resolve("image_generation")).toMatchObject({
      kind: "image_generation",
      settingKey: DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY,
      modelIdentifier: DEFAULT_IMAGE_MODEL_IDENTIFIER,
      catalogModel: fallbackImageModel,
    });
    expect(resolver.resolve("speech_generation")).toMatchObject({
      kind: "speech_generation",
      settingKey: DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY,
      modelIdentifier: DEFAULT_SPEECH_MODEL_IDENTIFIER,
      catalogModel: fallbackSpeechModel,
    });
  });
});
