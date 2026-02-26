import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { LLMFactory } from "../../../src/llm/llm-factory.js";
import { LLMModel } from "../../../src/llm/models.js";
import { LLMProvider } from "../../../src/llm/providers.js";
import { LLMRuntime } from "../../../src/llm/runtimes.js";

const factoryAny = LLMFactory as any;

describe("LLMFactory.getProvider", () => {
  let originalInitialized: boolean;
  let originalModelsByIdentifier: Map<string, LLMModel>;
  let originalModelsByProvider: Map<LLMProvider, LLMModel[]>;

  beforeEach(() => {
    originalInitialized = factoryAny.initialized;
    originalModelsByIdentifier = factoryAny.modelsByIdentifier;
    originalModelsByProvider = factoryAny.modelsByProvider;

    factoryAny.initialized = true;
    factoryAny.modelsByIdentifier = new Map<string, LLMModel>();
    factoryAny.modelsByProvider = new Map<LLMProvider, LLMModel[]>();
  });

  afterEach(() => {
    factoryAny.initialized = originalInitialized;
    factoryAny.modelsByIdentifier = originalModelsByIdentifier;
    factoryAny.modelsByProvider = originalModelsByProvider;
  });

  it("returns provider for exact model identifier", async () => {
    LLMFactory.registerModel(
      new LLMModel({
        name: "test-model-a",
        value: "test-model-a",
        provider: LLMProvider.OPENAI,
        canonicalName: "test-model-a",
      }),
    );

    const provider = await LLMFactory.getProvider("test-model-a");
    expect(provider).toBe(LLMProvider.OPENAI);
  });

  it("returns provider for unique model name fallback", async () => {
    LLMFactory.registerModel(
      new LLMModel({
        name: "runtime-model",
        value: "runtime-model",
        provider: LLMProvider.LMSTUDIO,
        canonicalName: "runtime-model",
        runtime: LLMRuntime.LMSTUDIO,
        hostUrl: "http://localhost:1234",
      }),
    );

    const provider = await LLMFactory.getProvider("runtime-model");
    expect(provider).toBe(LLMProvider.LMSTUDIO);
  });

  it("returns null when model is not found", async () => {
    const provider = await LLMFactory.getProvider("missing-model");
    expect(provider).toBeNull();
  });

  it("throws for ambiguous model name", async () => {
    LLMFactory.registerModel(
      new LLMModel({
        name: "shared-name",
        value: "shared-name",
        provider: LLMProvider.OLLAMA,
        canonicalName: "shared-name",
        runtime: LLMRuntime.OLLAMA,
        hostUrl: "http://localhost:11434",
      }),
    );
    LLMFactory.registerModel(
      new LLMModel({
        name: "shared-name",
        value: "shared-name",
        provider: LLMProvider.LMSTUDIO,
        canonicalName: "shared-name",
        runtime: LLMRuntime.LMSTUDIO,
        hostUrl: "http://localhost:1234",
      }),
    );

    await expect(LLMFactory.getProvider("shared-name")).rejects.toThrow(
      "The model name 'shared-name' is ambiguous",
    );
  });
});
