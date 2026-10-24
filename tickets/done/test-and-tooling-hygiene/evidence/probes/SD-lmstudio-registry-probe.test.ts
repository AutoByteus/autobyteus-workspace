import { it } from 'vitest';
import { LLMFactory } from '../../src/llm/llm-factory.js';
import { LLMRuntime } from '../../src/llm/runtimes.js';
import { LLMProvider } from '../../src/llm/providers.js';
it('probe', async () => {
  await LLMFactory.reinitialize();
  console.log('AFTER reinitialize', (await LLMFactory.listModelsByRuntime(LLMRuntime.LMSTUDIO)).length);
  console.log('reloadModels ->', await LLMFactory.reloadModels(LLMProvider.LMSTUDIO));
  console.log('AFTER reload', (await LLMFactory.listModelsByRuntime(LLMRuntime.LMSTUDIO)).length);
}, 60000);
