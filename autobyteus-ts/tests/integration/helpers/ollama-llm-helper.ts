import { LLMFactory } from '../../../src/llm/llm-factory.js';
import { LLMRuntime } from '../../../src/llm/runtimes.js';
import type { BaseLLM } from '../../../src/llm/base.js';

const DEFAULT_TEXT_MODEL = 'qwen3.5:35b-a3b-coding-nvfp4';
const knownVisionModels = ['gemma3n:e2b', 'llava', 'bakllava', 'moondream'];

let cachedModelId: string | null = null;

const applyOptions = (
  llm: BaseLLM,
  options?: { temperature?: number; extraParams?: Record<string, unknown> }
): BaseLLM => {
  const extraParams: Record<string, unknown> = {
    ...(llm.config.extraParams ?? {})
  };

  if (options?.temperature !== undefined) {
    extraParams.temperature = options.temperature;
  }

  if (options?.extraParams) {
    Object.assign(extraParams, options.extraParams);
  }

  if (Object.keys(extraParams).length > 0) {
    llm.config.extraParams = extraParams;
  }

  return llm;
};

const createByModelId = async (
  modelId: string,
  options?: { temperature?: number; extraParams?: Record<string, unknown> }
): Promise<BaseLLM | null> => {
  try {
    return applyOptions(await LLMFactory.createLLM(modelId), options);
  } catch {
    return null;
  }
};

export const createOllamaLLM = async (
  options?: { temperature?: number; extraParams?: Record<string, unknown> }
): Promise<BaseLLM | null> => {
  await LLMFactory.reinitialize();

  const manualModelId = process.env.OLLAMA_MODEL_ID;
  if (manualModelId) {
    const manualLlm = await createByModelId(manualModelId, options);
    if (manualLlm) {
      return manualLlm;
    }
  }

  if (cachedModelId) {
    const cachedLlm = await createByModelId(cachedModelId, options);
    if (cachedLlm) {
      return cachedLlm;
    }
    cachedModelId = null;
  }

  const models = await LLMFactory.listModelsByRuntime(LLMRuntime.OLLAMA);
  if (!models.length) {
    return null;
  }

  const targetTextModel = process.env.OLLAMA_TARGET_TEXT_MODEL ?? DEFAULT_TEXT_MODEL;
  const selected =
    models.find((model) => model.model_identifier.includes(targetTextModel)) ??
    models.find((model) =>
      !knownVisionModels.some((known) => model.model_identifier.toLowerCase().includes(known))
    ) ??
    models[0];

  cachedModelId = selected.model_identifier;
  return createByModelId(cachedModelId, options);
};
