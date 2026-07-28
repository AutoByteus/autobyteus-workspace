import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeGeminiClientWithRuntime } from '../../../src/utils/gemini-helper.js';
import { SecretValue } from '../../../src/secrets/secret-value.js';
import type {
  ProviderApiKeyResolver,
  ProviderApiKeySlot,
} from '../../../src/secrets/provider-api-key-resolver.js';

const constructorMock = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    constructor(options: unknown) {
      constructorMock(options);
    }
  },
}));

const resolverFor = (input: {
  aiStudio?: string;
  vertexExpress?: string;
}): ProviderApiKeyResolver => ({
  resolve: vi.fn(async (_providerId: string, slot: ProviderApiKeySlot = 'apiKey') => {
    const value = slot === 'geminiVertexExpressApiKey'
      ? input.vertexExpress
      : slot === 'geminiAiStudioApiKey'
        ? input.aiStudio
        : undefined;
    if (value === undefined) throw new Error('SYNTHETIC_API_KEY_MISSING');
    return SecretValue.fromString(value);
  }),
});

describe('Gemini runtime selection and SDK construction', () => {
  beforeEach(() => constructorMock.mockClear());

  it('constructs exact AI Studio options and resolves only its selected slot', async () => {
    const resolver = resolverFor({ aiStudio: 'synthetic-ai-studio-key' });
    const { runtimeInfo } = await initializeGeminiClientWithRuntime(
      { kind: 'aiStudio' },
      resolver,
    );

    expect(runtimeInfo).toEqual({ runtime: 'api_key', project: null, location: null });
    expect(constructorMock).toHaveBeenCalledWith({ apiKey: 'synthetic-ai-studio-key' });
    expect(resolver.resolve).toHaveBeenCalledWith('GEMINI', 'geminiAiStudioApiKey');
  });

  it('constructs exact Vertex Express options and resolves only its selected slot', async () => {
    const resolver = resolverFor({ vertexExpress: 'synthetic-vertex-express-key' });
    const { runtimeInfo } = await initializeGeminiClientWithRuntime(
      { kind: 'vertexExpress' },
      resolver,
    );

    expect(runtimeInfo).toEqual({ runtime: 'vertex', project: null, location: null });
    expect(constructorMock).toHaveBeenCalledWith({
      vertexai: true,
      apiKey: 'synthetic-vertex-express-key',
    });
    expect(resolver.resolve).toHaveBeenCalledWith('GEMINI', 'geminiVertexExpressApiKey');
  });

  it('constructs exact Vertex Project options without resolving any key', async () => {
    const resolver = resolverFor({});
    const { runtimeInfo } = await initializeGeminiClientWithRuntime(
      {
        kind: 'vertexProject',
        project: 'synthetic-project',
        location: 'synthetic-location',
      },
      resolver,
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
    expect(resolver.resolve).not.toHaveBeenCalled();
  });

  it('does not consult ambient Gemini credential aliases', async () => {
    process.env.GEMINI_API_KEY = 'ambient-key-that-must-not-be-used';
    const resolver = resolverFor({ aiStudio: 'explicit-key' });
    await initializeGeminiClientWithRuntime({ kind: 'aiStudio' }, resolver);
    expect(constructorMock).toHaveBeenCalledWith({ apiKey: 'explicit-key' });
    delete process.env.GEMINI_API_KEY;
  });

  it('fails unconfigured without resolving or constructing a client', async () => {
    const resolver = resolverFor({});
    await expect(
      initializeGeminiClientWithRuntime({ kind: 'unconfigured' }, resolver),
    ).rejects.toThrow('GEMINI_RUNTIME_UNCONFIGURED');
    expect(resolver.resolve).not.toHaveBeenCalled();
    expect(constructorMock).not.toHaveBeenCalled();
  });
});
