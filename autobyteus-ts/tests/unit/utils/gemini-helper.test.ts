import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeGeminiClientWithRuntime } from '../../../src/utils/gemini-helper.js';
import {
  apiKeyAuthentication,
  noAuthentication,
  workloadIdentityAuthentication,
} from '../explicit-auth-test-helpers.js';

const constructorMock = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    constructor(options: any) {
      constructorMock(options);
    }
  }
}));

describe('initializeGeminiClientWithRuntime', () => {
  beforeEach(() => constructorMock.mockClear());

  it('constructs API-key mode from explicitly resolved authentication', () => {
    const { runtimeInfo } = initializeGeminiClientWithRuntime(apiKeyAuthentication('synthetic-key'));

    expect(runtimeInfo).toEqual({ runtime: 'api_key', project: null, location: null });
    expect(constructorMock).toHaveBeenCalledWith({ apiKey: 'synthetic-key' });
  });

  it('constructs workload-identity mode from explicit project and location', () => {
    const { runtimeInfo } = initializeGeminiClientWithRuntime(
      workloadIdentityAuthentication('synthetic-project', 'synthetic-location'),
    );

    expect(runtimeInfo).toEqual({
      runtime: 'vertex',
      project: 'synthetic-project',
      location: 'synthetic-location',
    });
    expect(constructorMock).toHaveBeenCalledWith({
      vertexai: true,
      project: 'synthetic-project',
      location: 'synthetic-location',
    });
  });

  it('does not consult ambient Gemini aliases', () => {
    process.env.GEMINI_API_KEY = 'ambient-key-that-must-not-be-used';
    initializeGeminiClientWithRuntime(apiKeyAuthentication('explicit-key'));
    expect(constructorMock).toHaveBeenCalledWith({ apiKey: 'explicit-key' });
    delete process.env.GEMINI_API_KEY;
  });

  it('rejects missing explicit authentication', () => {
    expect(() => initializeGeminiClientWithRuntime(noAuthentication())).toThrow(
      'requires explicitly resolved API-key or workload-identity authentication',
    );
  });
});
