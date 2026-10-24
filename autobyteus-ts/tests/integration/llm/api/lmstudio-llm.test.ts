import { beforeAll, describe, it, expect, type TestContext } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LLMFactory } from '../../../../src/llm/llm-factory.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMRuntime } from '../../../../src/llm/runtimes.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMConfig, TokenPricingConfig } from '../../../../src/llm/utils/llm-config.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { LMStudioLLM } from '../../../../src/llm/api/lmstudio-llm.js';
import { LMStudioModelProvider } from '../../../../src/llm/lmstudio-provider.js';
import { defaultToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { OpenAiJsonSchemaFormatter } from '../../../../src/tools/usage/formatters/openai-json-schema-formatter.js';
import { registerWriteFileTool } from '../../../../src/tools/file/write-file.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const imagePath = path.resolve(__dirname, '../../../assets/sample_image.png');
const userProvidedImageUrl =
  'http://192.168.2.124:29695/rest/files/images/d0d0f29a-824c-4af0-9457-ecfba83ff9be.jpg';

const resetRegistry = () => {
  defaultToolRegistry.clear();
  registerWriteFileTool();
};

const resolveLmstudioHost = () =>
  process.env.LMSTUDIO_HOSTS?.split(',').map((host) => host.trim()).find(Boolean) ??
  LMStudioModelProvider.DEFAULT_LMSTUDIO_HOST;

type LmstudioNativeModel = {
  type?: string;
  key?: string;
  max_context_length?: number | null;
  capabilities?: {
    reasoning?: unknown;
    vision?: unknown;
  };
  loaded_instances?: Array<{
    config?: {
      context_length?: number | null;
    } | null;
  }>;
};

const REASONING_MODEL_ENV_VAR = 'LMSTUDIO_REASONING_MODEL_ID';
const TARGET_TEXT_MODEL_ENV_VAR = 'LMSTUDIO_TARGET_TEXT_MODEL';
// The small, fast local model TESTING.md prefers: one local model at a time.
const DEFAULT_TEXT_MODEL_ID = 'qwen/qwen3.6-35b-a3b';
const DEFAULT_REASONING_MODEL_IDS = ['google/gemma-4-26b-a4b', DEFAULT_TEXT_MODEL_ID, 'zai-org/glm-4.7-flash'];
const PREFLIGHT_TIMEOUT_MS = 5000;

const isReasoningCapable = (model: LmstudioNativeModel): boolean => {
  const reasoning = model.capabilities?.reasoning;
  return reasoning === true || Boolean(reasoning && typeof reasoning === 'object');
};

const isLoaded = (model: LmstudioNativeModel): boolean =>
  Array.isArray(model.loaded_instances) && model.loaded_instances.length > 0;

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const resolveLoadedContext = (model: LmstudioNativeModel): number | null => {
  const contexts = (model.loaded_instances ?? [])
    .map((instance) => instance?.config?.context_length ?? null)
    .filter(isPositiveInteger);

  if (!contexts.length) {
    return null;
  }

  return contexts.every((value) => value === contexts[0]) ? contexts[0]! : null;
};

const isVisionModelId = (modelId: string): boolean => modelId.toLowerCase().includes('vl');

const isVisionCapable = (model: LmstudioNativeModel): boolean =>
  model.capabilities?.vision === true || (typeof model.key === 'string' && isVisionModelId(model.key));

const matchesPreferredModel = (modelId: string, candidate: string): boolean =>
  modelId === candidate || modelId.includes(candidate);

const fetchNativeLmstudioModels = async (): Promise<LmstudioNativeModel[]> => {
  const response = await fetch(`${resolveLmstudioHost().replace(/\/+$/, '')}/api/v1/models`, {
    signal: AbortSignal.timeout(PREFLIGHT_TIMEOUT_MS)
  });
  if (!response.ok) {
    throw new Error(`LM Studio native model discovery failed with status ${response.status}`);
  }

  const payload = (await response.json()) as { models?: LmstudioNativeModel[] };
  return Array.isArray(payload.models) ? payload.models : [];
};

const createLmstudioLLM = (modelId: string) => {
  const llmModel = new LLMModel({
    name: modelId,
    value: modelId,
    provider: LLMProvider.LMSTUDIO,
    llmClass: LMStudioLLM,
    canonicalName: modelId,
    runtime: LLMRuntime.LMSTUDIO,
    hostUrl: resolveLmstudioHost(),
    defaultConfig: new LLMConfig({
      pricingConfig: new TokenPricingConfig({ inputTokenPricing: 0.0, outputTokenPricing: 0.0 })
    })
  });
  return new LMStudioLLM(llmModel, llmModel.defaultConfig);
};

type LmstudioPreflight = { ok: true } | { ok: false; reason: string };

// Filled by the preflight below; every case skips with this reason when LM Studio cannot serve it.
let lmstudio: LmstudioPreflight = { ok: false, reason: 'the LM Studio preflight has not run' };

const describeError = (error: unknown): string => String((error as Error)?.message ?? error);

const runPreflight = async (): Promise<LmstudioPreflight> => {
  const host = resolveLmstudioHost();
  try {
    await fetchNativeLmstudioModels();
  } catch (error) {
    return { ok: false, reason: `LM Studio is not reachable at ${host} (${describeError(error)}); start it or set LMSTUDIO_HOSTS` };
  }

  // The registry built by the factory holds no local models; they arrive through `reloadModels`.
  const modelCount = await LLMFactory.reloadModels(LLMProvider.LMSTUDIO);
  if (modelCount === 0) {
    return { ok: false, reason: `LM Studio at ${host} offers no models` };
  }
  return { ok: true };
};

/** Skips the case, with the reason, unless the preflight found LM Studio ready. */
const requireLmstudio = (ctx: TestContext): void => {
  if (!lmstudio.ok) {
    ctx.skip(lmstudio.reason);
  }
};

const requireReachableImageUrl = async (ctx: TestContext, url: string): Promise<void> => {
  try {
    await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(PREFLIGHT_TIMEOUT_MS) });
  } catch (error) {
    ctx.skip(`the image URL ${url} is not reachable from this machine (${describeError(error)})`);
  }
};

const getTextLLM = async (ctx: TestContext) => {
  const manualModelId = process.env.LMSTUDIO_MODEL_ID;
  if (manualModelId) {
    return createLmstudioLLM(manualModelId);
  }

  const models = await LLMFactory.listModelsByRuntime(LLMRuntime.LMSTUDIO);
  const preferredIds = [process.env[TARGET_TEXT_MODEL_ENV_VAR], DEFAULT_TEXT_MODEL_ID].filter((value): value is string =>
    Boolean(value)
  );
  const textModel =
    preferredIds
      .map((candidate) => models.find((model) => model.model_identifier.includes(candidate)))
      .find((model) => model !== undefined) ??
    models.find((model) => !isVisionModelId(model.model_identifier)) ??
    models[0];

  if (!textModel) {
    ctx.skip('LM Studio lists no text model');
  }
  return LLMFactory.createLLM(textModel.model_identifier);
};

const getVisionLLM = async (ctx: TestContext) => {
  const nativeModels = await fetchNativeLmstudioModels();
  const visionModels = nativeModels.filter(
    (model) => model.type === 'llm' && typeof model.key === 'string' && isVisionCapable(model) && !model.key.includes('ocr')
  );
  const preferredIds = [process.env[TARGET_TEXT_MODEL_ENV_VAR], DEFAULT_TEXT_MODEL_ID, 'qwen/qwen3-vl-30b'].filter(
    (value): value is string => Boolean(value)
  );
  const visionModel =
    preferredIds
      .map((candidate) => visionModels.find((model) => matchesPreferredModel(model.key!, candidate)))
      .find((model) => model !== undefined) ?? visionModels[0];

  if (!visionModel) {
    ctx.skip('LM Studio offers no vision-capable model');
  }
  return createLmstudioLLM(visionModel.key!);
};

const getReasoningTextLLM = async (ctx: TestContext) => {
  const manualModelId = process.env[REASONING_MODEL_ENV_VAR];
  if (manualModelId) {
    return createLmstudioLLM(manualModelId);
  }

  const nativeModels = await fetchNativeLmstudioModels();
  const loadedReasoningTextModels = nativeModels.filter(
    (model) =>
      model.type === 'llm' &&
      typeof model.key === 'string' &&
      isLoaded(model) &&
      isReasoningCapable(model) &&
      !isVisionModelId(model.key)
  );

  if (!loadedReasoningTextModels.length) {
    ctx.skip('no reasoning-capable text model is loaded in LM Studio; load one or set LMSTUDIO_REASONING_MODEL_ID');
  }

  const preferredModelIds = [
    process.env[REASONING_MODEL_ENV_VAR],
    process.env[TARGET_TEXT_MODEL_ENV_VAR],
    ...DEFAULT_REASONING_MODEL_IDS
  ].filter((value): value is string => Boolean(value));

  const selectedModel =
    loadedReasoningTextModels.find((model) =>
      preferredModelIds.some((candidate) => matchesPreferredModel(model.key!, candidate))
    ) ?? loadedReasoningTextModels[0];

  return createLmstudioLLM(selectedModel.key!);
};

const getMetadataAwareTextModelSelection = async (ctx: TestContext) => {
  const nativeModels = await fetchNativeLmstudioModels();
  const discoveredModels = await LLMFactory.listModelsByRuntime(LLMRuntime.LMSTUDIO);

  const loadedTextNativeModels = nativeModels.filter(
    (model) => model.type === 'llm' && typeof model.key === 'string' && isLoaded(model) && !isVisionModelId(model.key)
  );

  if (!loadedTextNativeModels.length) {
    ctx.skip('no text model is loaded in LM Studio; load one to check its context metadata');
  }

  const preferredModelIds = [process.env.LMSTUDIO_MODEL_ID, process.env[TARGET_TEXT_MODEL_ENV_VAR], DEFAULT_TEXT_MODEL_ID]
    .filter((value): value is string => Boolean(value));

  const selectedNativeModel =
    loadedTextNativeModels.find((model) =>
      preferredModelIds.some((candidate) => matchesPreferredModel(model.key!, candidate))
    ) ?? loadedTextNativeModels[0];

  const discoveredModel = discoveredModels.find((model) => model.display_name === selectedNativeModel.key);
  if (!discoveredModel) {
    ctx.skip(`the loaded model ${selectedNativeModel.key} is not in the discovered model list`);
  }

  return { nativeModel: selectedNativeModel, discoveredModel };
};

describe('LMStudioLLM Integration', () => {
  beforeAll(async () => {
    lmstudio = await runPreflight();
  }, 60000);

  it('uses metadata-aware LM Studio discovery to create a runnable text model with truthful context metadata', async (ctx) => {
    requireLmstudio(ctx);
    const selection = await getMetadataAwareTextModelSelection(ctx);
    const { nativeModel, discoveredModel } = selection;
    let llm: LMStudioLLM | null = null;
    try {
      expect(discoveredModel.max_context_tokens).toBe(
        isPositiveInteger(nativeModel.max_context_length) ? nativeModel.max_context_length : null
      );
      expect(discoveredModel.active_context_tokens).toBe(resolveLoadedContext(nativeModel));

      llm = (await LLMFactory.createLLM(discoveredModel.model_identifier)) as LMStudioLLM;
      expect(llm.model.maxContextTokens).toBe(discoveredModel.max_context_tokens);
      expect(llm.model.activeContextTokens).toBe(discoveredModel.active_context_tokens);

      const userMessage = new LLMUserMessage({ content: "Reply with exactly the word 'ready'." });
      const response = await llm.sendUserMessage(userMessage);
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(response.content.toLowerCase()).toContain('ready');
    } finally {
      await llm?.cleanup();
    }
  }, 120000);

  it('should return a completion for a text model', async (ctx) => {
    requireLmstudio(ctx);
    const llm = await getTextLLM(ctx);

    const userMessage = new LLMUserMessage({ content: "Hello! Please respond with 'pong'." });
    try {
      const response = await llm.sendUserMessage(userMessage);
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(typeof response.content).toBe('string');
      expect(response.content.toLowerCase()).toContain('pong');
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it.for([imagePath, userProvidedImageUrl])('should handle multimodal images (%s)', { timeout: 120000 }, async (imageSource, ctx) => {
    requireLmstudio(ctx);
    if (imageSource === imagePath && !fs.existsSync(imagePath)) {
      ctx.skip(`the sample image ${imagePath} is missing`);
    }
    if (imageSource === userProvidedImageUrl) {
      await requireReachableImageUrl(ctx, imageSource);
    }

    const llm = await getVisionLLM(ctx);

    const userMessage = new LLMUserMessage({
      content: 'What is in this image? Describe it in one word.',
      image_urls: [imageSource]
    });

    try {
      const response = await llm.sendUserMessage(userMessage);
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(response.content.length).toBeGreaterThan(0);
    } finally {
      await llm.cleanup();
    }
  });

  it('should stream responses from a text model', async (ctx) => {
    requireLmstudio(ctx);
    const llm = await getTextLLM(ctx);

    const userMessage = new LLMUserMessage({ content: 'Write a short, two-sentence story about a robot.' });
    let completeResponse = '';

    try {
      for await (const chunk of llm.streamUserMessage(userMessage)) {
        if (chunk.content) {
          completeResponse += chunk.content;
        }
      }

      expect(completeResponse.length).toBeGreaterThan(10);
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should stream reasoning from a reasoning-capable text model', async (ctx) => {
    requireLmstudio(ctx);
    const llm = await getReasoningTextLLM(ctx);
    try {
      const userMessage = new LLMUserMessage({
        content: 'What is 17 plus 26? Think through it briefly and then answer in one sentence.'
      });

      let reasoningChunkCount = 0;
      let accumulatedReasoning = '';
      let sawCompletion = false;

      for await (const chunk of llm.streamUserMessage(userMessage)) {
        if (chunk.reasoning && chunk.reasoning.trim().length > 0) {
          reasoningChunkCount += 1;
          accumulatedReasoning += chunk.reasoning;
        }

        if (chunk.is_complete) {
          sawCompletion = true;
        }
      }

      expect(reasoningChunkCount).toBeGreaterThan(0);
      expect(accumulatedReasoning.trim().length).toBeGreaterThan(0);
      expect(sawCompletion).toBe(true);
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should emit tool calls for LM Studio', async (ctx) => {
    requireLmstudio(ctx);
    const llm = await getTextLLM(ctx);

    resetRegistry();
    const toolDef = defaultToolRegistry.getToolDefinition('write_file');
    expect(toolDef).toBeDefined();

    const formatter = new OpenAiJsonSchemaFormatter();
    const toolSchema = formatter.provide(toolDef!);

    const userMessage = new LLMUserMessage({
      content: "Please write a python script named 'hello_world.py' that prints 'Hello World'."
    });

    let toolCallsDetected = 0;

    try {
      for await (const chunk of llm.streamUserMessage(userMessage, { tools: [toolSchema] })) {
        if (chunk.tool_calls) {
          toolCallsDetected += chunk.tool_calls.length;
          for (const toolCall of chunk.tool_calls) {
            expect(toolCall.index).not.toBeNull();
          }
        }
      }

      expect(toolCallsDetected).toBeGreaterThan(0);
    } finally {
      await llm.cleanup();
    }
  }, 120000);
});
