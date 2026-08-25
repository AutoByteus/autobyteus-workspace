import { describe, it, expect } from 'vitest';
import {
  getValidSchemaDefault,
  normalizeModelConfigSchema,
  resolveEffectiveConfigValue,
  sanitizeModelConfigAgainstSchema,
  validateUiModelConfig,
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

describe('schema default helpers', () => {
  it('returns schema defaults only when they are valid for type and enum constraints', () => {
    expect(getValidSchemaDefault({
      type: 'string',
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    })).toBe('medium');

    expect(getValidSchemaDefault({
      type: 'string',
      enum: ['low', 'medium', 'high'],
      default: 'xhigh',
    })).toBeUndefined();

    expect(getValidSchemaDefault({
      type: 'integer',
      default: 0.5,
    })).toBeUndefined();
  });

  it('resolves explicit config values before valid schema defaults', () => {
    const schema = {
      type: 'string',
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    };

    expect(resolveEffectiveConfigValue(schema, 'high')).toBe('high');
    expect(resolveEffectiveConfigValue(schema, undefined)).toBe('medium');
    expect(resolveEffectiveConfigValue(schema, 'xhigh')).toBe('medium');
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

  it('drops stale DeepSeek raw thinking objects after the schema moves to thinking_type', () => {
    const schema = {
      reasoning_effort: { type: 'string', enum: ['high', 'max'] },
      thinking_type: { type: 'string', enum: ['enabled', 'disabled'] },
    };

    expect(sanitizeModelConfigAgainstSchema(schema, {
      reasoning_effort: 'high',
      thinking_type: 'enabled',
      thinking: { type: 'disabled' },
    })).toEqual({
      reasoning_effort: 'high',
      thinking_type: 'enabled',
    });
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

  it('reports required, range, pattern, enum, and type issues without changing the draft', () => {
    const config = { budget: 0, mode: 'turbo', code: 'lower', enabled: 'yes' };
    const issues = validateUiModelConfig({
      required_value: { type: 'string', required: true },
      budget: { type: 'integer', minimum: 1 },
      mode: { type: 'string', enum: ['default', 'fast'] },
      code: { type: 'string', pattern: '^[A-Z]+$' },
      enabled: { type: 'boolean' },
    }, config);

    expect(issues).toEqual([
      { key: 'required_value', code: 'required' },
      { key: 'budget', code: 'minimum', expected: 1 },
      { key: 'mode', code: 'enum' },
      { key: 'code', code: 'pattern' },
      { key: 'enabled', code: 'type', expected: 'boolean' },
    ]);
    expect(config).toEqual({ budget: 0, mode: 'turbo', code: 'lower', enabled: 'yes' });
  });
});
