import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeGeminiClientWithRuntime } from '../../../src/utils/gemini-helper.js';
import {
  apiKeyAuthentication,
  geminiAiStudioAuthentication,
  geminiVertexExpressAuthentication,
  geminiVertexProjectAuthentication,
  noAuthentication,
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

  it('constructs exact AI Studio options from the resolved mode', () => {
    const { runtimeInfo } = initializeGeminiClientWithRuntime(
      geminiAiStudioAuthentication('synthetic-ai-studio-key'),
    );

    expect(runtimeInfo).toEqual({ runtime: 'api_key', project: null, location: null });
    expect(constructorMock).toHaveBeenCalledWith({ apiKey: 'synthetic-ai-studio-key' });
  });

  it('constructs exact Vertex Express options from the resolved mode', () => {
    const { runtimeInfo } = initializeGeminiClientWithRuntime(
      geminiVertexExpressAuthentication('synthetic-vertex-express-key'),
    );

    expect(runtimeInfo).toEqual({ runtime: 'vertex', project: null, location: null });
    expect(constructorMock).toHaveBeenCalledWith({
      vertexai: true,
      apiKey: 'synthetic-vertex-express-key',
    });
  });

  it('constructs exact Vertex Project options from explicit project and location', () => {
    const { runtimeInfo } = initializeGeminiClientWithRuntime(
      geminiVertexProjectAuthentication('synthetic-project', 'synthetic-location'),
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
    initializeGeminiClientWithRuntime(geminiAiStudioAuthentication('explicit-key'));
    expect(constructorMock).toHaveBeenCalledWith({ apiKey: 'explicit-key' });
    delete process.env.GEMINI_API_KEY;
  });

  it.each([
    ['generic API key', apiKeyAuthentication()],
    ['none', noAuthentication()],
  ])('rejects %s rather than inferring a Gemini mode', (_label, authentication) => {
    expect(() => initializeGeminiClientWithRuntime(authentication)).toThrow(
      'requires an explicitly resolved Gemini authentication mode',
    );
  });
});
