import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LLMFactory } from '../../../../src/llm/llm-factory.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMRuntime } from '../../../../src/llm/runtimes.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMConfig, TokenPricingConfig } from '../../../../src/llm/utils/llm-config.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import { LMStudioLLM } from '../../../../src/llm/api/lmstudio-llm.js';
import { LMStudioModelProvider } from '../../../../src/llm/lmstudio-provider.js';
import { defaultToolRegistry, ToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { ToolDefinition } from '../../../../src/tools/registry/tool-definition.js';
import { OpenAiJsonSchemaFormatter } from '../../../../src/tools/usage/formatters/openai-json-schema-formatter.js';
import { registerWriteFileTool } from '../../../../src/tools/file/write-file.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../../..');
const imagePath = path.resolve(repoRoot, 'tests/assets/sample_image.png');
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
  capabilities?: {
    reasoning?: unknown;
  };
  loaded_instances?: Array<unknown>;
};

const REASONING_MODEL_ENV_VAR = 'LMSTUDIO_REASONING_MODEL_ID';
const DEFAULT_REASONING_MODEL_IDS = ['google/gemma-4-26b-a4b', 'qwen/qwen3.5-35b-a3b', 'zai-org/glm-4.7-flash'];

const isReasoningCapable = (model: LmstudioNativeModel): boolean => {
  const reasoning = model.capabilities?.reasoning;
  return reasoning === true || Boolean(reasoning && typeof reasoning === 'object');
};

const isLoaded = (model: LmstudioNativeModel): boolean =>
  Array.isArray(model.loaded_instances) && model.loaded_instances.length > 0;

const isVisionModelId = (modelId: string): boolean => modelId.toLowerCase().includes('vl');

const matchesPreferredModel = (modelId: string, candidate: string): boolean =>
  modelId === candidate || modelId.includes(candidate);

const fetchNativeLmstudioModels = async (): Promise<LmstudioNativeModel[]> => {
  const response = await fetch(`${resolveLmstudioHost().replace(/\/+$/, '')}/api/v1/models`);
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

const getTextLLM = async () => {
  const manualModelId = process.env.LMSTUDIO_MODEL_ID;
  if (manualModelId) {
    try {
      return createLmstudioLLM(manualModelId);
    } catch {
      // fall through to discovery
    }
  }

  await LLMFactory.reinitialize();
  const models = await LLMFactory.listModelsByRuntime(LLMRuntime.LMSTUDIO);
  if (!models.length) {
    return null;
  }

  const targetTextModel = 'qwen/qwen3-30b-a3b-2507';
  const textModel =
    models.find((model) => model.model_identifier.includes(targetTextModel)) ??
    models.find((model) => !model.model_identifier.toLowerCase().includes('vl')) ??
    models[0];

  return LLMFactory.createLLM(textModel.model_identifier);
};

const getVisionLLM = async () => {
  await LLMFactory.reinitialize();
  const models = await LLMFactory.listModelsByRuntime(LLMRuntime.LMSTUDIO);
  if (!models.length) {
    return null;
  }

  const targetVisionModel = 'qwen/qwen3-vl-30b';
  const visionModel =
    models.find((model) => model.model_identifier.includes(targetVisionModel)) ??
    models.find((model) => model.model_identifier.toLowerCase().includes('vl'));

  if (!visionModel) {
    return null;
  }

  return LLMFactory.createLLM(visionModel.model_identifier);
};

const getReasoningTextLLM = async () => {
  const manualModelId = process.env[REASONING_MODEL_ENV_VAR];
  if (manualModelId) {
    try {
      return createLmstudioLLM(manualModelId);
    } catch {
      // fall through to discovery
    }
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
    return null;
  }

  const preferredModelIds = [
    process.env[REASONING_MODEL_ENV_VAR],
    process.env.LMSTUDIO_TARGET_TEXT_MODEL,
    ...DEFAULT_REASONING_MODEL_IDS
  ].filter((value): value is string => Boolean(value));

  const selectedModel =
    loadedReasoningTextModels.find((model) =>
      preferredModelIds.some((candidate) => matchesPreferredModel(model.key!, candidate))
    ) ?? loadedReasoningTextModels[0];

  return createLmstudioLLM(selectedModel.key!);
};

const shouldSkipOnConnectionError = (error: unknown): boolean => {
  const message = String((error as any)?.message ?? error);
  return /ECONNREFUSED|connect|ENOTFOUND|ECONNRESET/i.test(message);
};

describe('LMStudioLLM Integration', () => {
  it('should return a completion for a text model', async () => {
    const llm = await getTextLLM();
    if (!llm) return;

    const userMessage = new LLMUserMessage({ content: "Hello! Please respond with 'pong'." });
    try {
      const response = await llm.sendUserMessage(userMessage);
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(typeof response.content).toBe('string');
      expect(response.content.toLowerCase()).toContain('pong');
    } catch (error) {
      if (shouldSkipOnConnectionError(error)) return;
      throw error;
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it.each([imagePath, userProvidedImageUrl])('should handle multimodal images (%s)', async (imageSource) => {
    if (imageSource === imagePath && !fs.existsSync(imagePath)) {
      return;
    }

    const llm = await getVisionLLM();
    if (!llm) return;

    const userMessage = new LLMUserMessage({
      content: 'What is in this image? Describe it in one word.',
      image_urls: [imageSource]
    });

    try {
      const response = await llm.sendUserMessage(userMessage);
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(response.content.length).toBeGreaterThan(0);
    } catch (error) {
      if (shouldSkipOnConnectionError(error)) return;
      throw error;
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should stream responses from a text model', async () => {
    const llm = await getTextLLM();
    if (!llm) return;

    const userMessage = new LLMUserMessage({ content: 'Write a short, two-sentence story about a robot.' });
    let completeResponse = '';

    try {
      for await (const chunk of llm.streamUserMessage(userMessage)) {
        if (chunk.content) {
          completeResponse += chunk.content;
        }
      }

      expect(completeResponse.length).toBeGreaterThan(10);
    } catch (error) {
      if (shouldSkipOnConnectionError(error)) return;
      throw error;
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should stream reasoning from a reasoning-capable text model', async () => {
    let llm: LMStudioLLM | null = null;
    try {
      llm = await getReasoningTextLLM();
      if (!llm) return;

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
    } catch (error) {
      if (shouldSkipOnConnectionError(error)) return;
      throw error;
    } finally {
      await llm?.cleanup();
    }
  }, 120000);

  it('should emit tool calls for LM Studio', async () => {
    const llm = await getTextLLM();
    if (!llm) return;

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
    } catch (error) {
      if (shouldSkipOnConnectionError(error)) return;
      throw error;
    } finally {
      await llm.cleanup();
    }
  }, 120000);
});
