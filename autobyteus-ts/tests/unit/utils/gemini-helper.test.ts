import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initializeGeminiClientWithRuntime } from '../../../src/utils/gemini-helper.js';

const constructorMock = vi.fn();

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      constructor(options: any) {
        constructorMock(options);
      }
    }
  };
});

describe('initializeGeminiClientWithRuntime', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    constructorMock.mockClear();
    delete process.env.VERTEX_AI_API_KEY;
    delete process.env.VERTEX_AI_PROJECT;
    delete process.env.VERTEX_AI_LOCATION;
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('prefers Vertex AI Express API key when set', () => {
    process.env.VERTEX_AI_API_KEY = 'vertex-key';
    process.env.VERTEX_AI_PROJECT = 'proj';
    process.env.VERTEX_AI_LOCATION = 'loc';
    process.env.GEMINI_API_KEY = 'gemini-key';

    const { runtimeInfo } = initializeGeminiClientWithRuntime();
    expect(runtimeInfo.runtime).toBe('vertex');
    expect(runtimeInfo.project).toBeNull();
    expect(runtimeInfo.location).toBeNull();
    expect(constructorMock).toHaveBeenCalledWith({ vertexai: true, apiKey: 'vertex-key' });
  });

  it('prefers Vertex AI when project and location are set', () => {
    process.env.VERTEX_AI_PROJECT = 'proj';
    process.env.VERTEX_AI_LOCATION = 'loc';

    const { runtimeInfo } = initializeGeminiClientWithRuntime();
    expect(runtimeInfo.runtime).toBe('vertex');
    expect(runtimeInfo.project).toBe('proj');
    expect(runtimeInfo.location).toBe('loc');
    expect(constructorMock).toHaveBeenCalledWith({ vertexai: true, project: 'proj', location: 'loc' });
  });

  it('falls back to API key when Vertex vars are missing', () => {
    process.env.GEMINI_API_KEY = 'key';

    const { runtimeInfo } = initializeGeminiClientWithRuntime();
    expect(runtimeInfo.runtime).toBe('api_key');
    expect(runtimeInfo.project).toBeNull();
    expect(runtimeInfo.location).toBeNull();
    expect(constructorMock).toHaveBeenCalledWith({ apiKey: 'key' });
  });

  it('throws when no config is provided', () => {
    expect(() => initializeGeminiClientWithRuntime()).toThrow('Failed to initialize Gemini Client');
  });
});
