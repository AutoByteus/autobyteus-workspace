import { LLMFactory } from '../../../src/llm/llm-factory.js';
import { LLMRuntime } from '../../../src/llm/runtimes.js';
import type { BaseLLM } from '../../../src/llm/base.js';

const DEFAULT_TEXT_MODEL = 'qwen/qwen3-30b-a3b-2507';
const MODEL_ENV_VAR = 'LMSTUDIO_MODEL_ID';

let cachedModelId: string | null = null;

export const hasLmstudioConfig = (): boolean =>
  Boolean(process.env.LMSTUDIO_HOSTS || process.env[MODEL_ENV_VAR]);

const resolveModelId = async (): Promise<string | null> => {
  if (cachedModelId) {
    return cachedModelId;
  }

  const manualModelId = process.env[MODEL_ENV_VAR];
  if (manualModelId) {
    cachedModelId = manualModelId;
    return manualModelId;
  }

  await LLMFactory.reinitialize();
  const models = await LLMFactory.listModelsByRuntime(LLMRuntime.LMSTUDIO);
  if (!models.length) {
    return null;
  }

  const targetTextModel = process.env.LMSTUDIO_TARGET_TEXT_MODEL ?? DEFAULT_TEXT_MODEL;
  const selected =
    models.find((model) => model.model_identifier.includes(targetTextModel)) ??
    models.find((model) => !model.model_identifier.toLowerCase().includes('vl')) ??
    models[0];

  cachedModelId = selected.model_identifier;
  return cachedModelId;
};

export const createLmstudioLLM = async (options?: {
  requireToolChoice?: boolean;
  temperature?: number;
}): Promise<BaseLLM | null> => {
  const modelId = await resolveModelId();
  if (!modelId) {
    return null;
  }

  const llm = await LLMFactory.createLLM(modelId);

  if (options?.temperature !== undefined) {
    llm.config.temperature = options.temperature;
  }

  if (options?.requireToolChoice) {
    const originalStream = llm.streamUserMessage.bind(llm);
    (llm as any).streamUserMessage = async function* (userMessage: any, kwargs: Record<string, any> = {}) {
      yield* originalStream(userMessage, { ...kwargs, tool_choice: 'required' });
    };
  }

  return llm;
};
