import { describe, it, expect } from 'vitest';
import { normalizeModelConfigSchema } from '~/utils/llmConfigSchema';

describe('normalizeModelConfigSchema', () => {
  it('normalizes parameter schema to UI schema', () => {
    const schema = {
      parameters: [
        {
          name: 'temperature',
          type: 'number',
          description: 'Sampling temperature',
          default_value: 0.7,
          min_value: 0,
          max_value: 1,
        },
        {
          name: 'mode',
          type: 'string',
          enum_values: ['balanced', 'creative'],
          required: true,
        },
      ],
    };

    const result = normalizeModelConfigSchema(schema);
    expect(result).toBeTruthy();
    expect(result?.temperature).toMatchObject({
      type: 'number',
      description: 'Sampling temperature',
      default: 0.7,
      minimum: 0,
      maximum: 1,
    });
    expect(result?.mode).toMatchObject({
      type: 'string',
      enum: ['balanced', 'creative'],
      required: true,
    });
  });

  it('normalizes json schema to UI schema', () => {
    const schema = {
      type: 'object',
      properties: {
        thinking_enabled: {
          type: 'boolean',
          description: 'Enable extended thinking',
          default: false,
        },
        thinking_budget_tokens: {
          type: 'integer',
          description: 'Token budget',
          default: 1024,
          minimum: 1024,
        },
      },
      required: ['thinking_enabled'],
    };

    const result = normalizeModelConfigSchema(schema);
    expect(result).toBeTruthy();
    expect(result?.thinking_enabled).toMatchObject({
      type: 'boolean',
      description: 'Enable extended thinking',
      default: false,
      required: true,
    });
    expect(result?.thinking_budget_tokens).toMatchObject({
      type: 'integer',
      description: 'Token budget',
      default: 1024,
      minimum: 1024,
      required: false,
    });
  });
});
