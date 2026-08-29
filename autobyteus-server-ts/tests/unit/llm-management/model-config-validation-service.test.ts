import { describe, expect, it, vi } from 'vitest';
import { RuntimeKind } from '../../../src/runtime-management/runtime-kind-enum.js';
import { ModelConfigValidationService } from '../../../src/llm-management/services/model-config-validation-service.js';

const model = (config_schema: unknown) => ({
  name: 'Test', value: 'test', canonical_name: 'test', model_identifier: 'test-model',
  provider: 'OPENAI', runtime: 'API', config_schema,
});

describe('ModelConfigValidationService', () => {
  it('strictly validates keys, enums, ranges, and types against the fixed model schema', async () => {
    const service = new ModelConfigValidationService({ listLlmModels: vi.fn().mockResolvedValue([model({
      type: 'object',
      properties: {
        effort: { type: 'string', enum: ['low', 'high'] },
        budget: { type: 'integer', minimum: 1, maximum: 10 },
      },
      required: ['effort'],
    }) as any]) });
    await expect(service.validate({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: 'test-model',
      llmConfig: { effort: 'ultra', budget: 0, unknown: true },
    })).resolves.toEqual({ kind: 'invalid', errors: [
      { path: 'llmConfig.effort', message: 'Value is not one of the supported options.' },
      { path: 'llmConfig.budget', message: 'Value must be at least 1.' },
      { path: 'llmConfig.unknown', message: 'Setting is not supported by the selected runtime and model.' },
    ] });
  });

  it('accepts null only for a model with no adjustable schema', async () => {
    const service = new ModelConfigValidationService({ listLlmModels: vi.fn().mockResolvedValue([model(null) as any]) });
    await expect(service.validate({ runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: 'test-model', llmConfig: null }))
      .resolves.toEqual({ kind: 'valid', config: null });
    await expect(service.validate({ runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: 'test-model', llmConfig: {} }))
      .resolves.toMatchObject({ kind: 'invalid' });
  });
});
