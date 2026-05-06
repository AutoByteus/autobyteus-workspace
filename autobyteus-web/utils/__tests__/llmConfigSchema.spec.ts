import { describe, it, expect } from 'vitest';
import {
  normalizeModelConfigSchema,
  sanitizeModelConfigAgainstSchema,
} from '~/utils/llmConfigSchema';

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
          label: 'Fast mode',
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
      title: 'Fast mode',
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
          title: 'Thinking Enabled',
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
      title: 'Thinking Enabled',
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

describe('sanitizeModelConfigAgainstSchema', () => {
  it('removes unknown keys and invalid enum values', () => {
    const schema = {
      reasoning_effort: { type: 'string', enum: ['low', 'medium', 'high'] },
      service_tier: { type: 'string', enum: ['fast'] },
      temperature: { type: 'number', minimum: 0, maximum: 1 },
    };

    const result = sanitizeModelConfigAgainstSchema(schema, {
      reasoning_effort: 'ultra',
      service_tier: 'turbo',
      temperature: 0.4,
      unknown_key: 'value',
    });

    expect(result).toEqual({ temperature: 0.4 });
  });

  it('keeps valid Codex service_tier values and drops stale ones', () => {
    const schema = {
      service_tier: { type: 'string', enum: ['fast'] },
    };

    expect(sanitizeModelConfigAgainstSchema(schema, { service_tier: 'fast' })).toEqual({
      service_tier: 'fast',
    });
    expect(sanitizeModelConfigAgainstSchema(schema, { service_tier: 'flex' })).toBeNull();
    expect(sanitizeModelConfigAgainstSchema({ temperature: { type: 'number' } }, {
      service_tier: 'fast',
    })).toBeNull();
  });

  it('returns null when all persisted values are invalid for current schema', () => {
    const schema = {
      reasoning_effort: { type: 'string', enum: ['low', 'medium', 'high'] },
    };

    const result = sanitizeModelConfigAgainstSchema(schema, {
      reasoning_effort: 'extreme',
    });

    expect(result).toBeNull();
  });
});
