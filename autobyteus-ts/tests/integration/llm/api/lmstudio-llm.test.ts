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
