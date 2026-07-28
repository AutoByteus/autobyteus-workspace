import { inspect } from 'node:util';
import { describe, expect, it } from 'vitest';
import { SecretValue } from '../../../src/secrets/secret-value.js';

describe('SecretValue', () => {
  it('redacts string, JSON, and inspection boundaries', () => {
    const value = SecretValue.fromString('synthetic-secret-sentinel');
    expect(String(value)).toBe('<redacted-secret>');
    expect(JSON.stringify({ value })).toBe('{"value":"<redacted-secret>"}');
    expect(inspect(value)).toBe('<redacted-secret>');
    expect(inspect(value)).not.toContain('synthetic-secret-sentinel');
  });
});
