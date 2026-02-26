import { LLMFactory } from '../../src/llm/llm-factory.js';
import type { BaseLLM } from '../../src/llm/base.js';

export async function printAvailableModels(): Promise<void> {
  const models = await LLMFactory.listAvailableModels();
  if (!models.length) {
    console.log('  No models found.');
    return;
  }
  for (const model of models) {
    console.log(`  - Display Name: ${model.display_name.padEnd(30)} Identifier: ${model.model_identifier}`);
  }
}

export async function createLlmOrThrow(modelIdentifier: string): Promise<BaseLLM> {
  try {
    return await LLMFactory.createLLM(modelIdentifier);
  } catch (error) {
    console.error(`LLM model '${modelIdentifier}' is not valid or is ambiguous.`);
    console.log('Available LLM Models (use the Identifier with --llm-model):');
    await printAvailableModels();
    throw error;
  }
}
