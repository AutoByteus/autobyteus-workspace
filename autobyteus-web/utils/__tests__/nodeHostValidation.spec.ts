import { describe, expect, it } from 'vitest';
import { validateServerHostConfiguration } from '../nodeHostValidation';

describe('validateServerHostConfiguration', () => {
  it('warns when node host is loopback', () => {
    const result = validateServerHostConfiguration('http://localhost:8000');

    expect(result.severity).toBe('warning');
    expect(result.warnings.some((warning) => warning.code === 'loopback-host')).toBe(true);
  });

  it('warns when generated URL host mismatches node host', () => {
    const result = validateServerHostConfiguration('https://node.example', [
      'https://127.0.0.1:8000/rest/workspaces/ws-1/content?path=a.txt',
    ]);

    expect(result.severity).toBe('warning');
    expect(result.warnings.some((warning) => warning.code === 'generated-host-mismatch')).toBe(true);
  });

  it('returns ok when host is non-loopback https and generated hosts match', () => {
    const result = validateServerHostConfiguration('https://node.example', [
      'https://node.example/rest/workspaces/ws-1/content?path=a.txt',
    ]);

    expect(result.severity).toBe('ok');
    expect(result.warnings).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('warns on insecure remote http host', () => {
    const result = validateServerHostConfiguration('http://node.example:8000');

    expect(result.severity).toBe('warning');
    expect(result.warnings.some((warning) => warning.code === 'insecure-http')).toBe(true);
  });
});
