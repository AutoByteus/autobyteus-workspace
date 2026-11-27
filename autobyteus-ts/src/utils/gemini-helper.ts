import { GoogleGenAI } from '@google/genai';
import type { ProviderApiKeyResolver } from '../secrets/provider-api-key-resolver.js';
import type { GeminiRuntimeSelection } from './gemini-runtime.js';
import { providerAddressThrough, type LLMEndpoint } from '../llm/llm-endpoint.js';

export type GeminiRuntime = 'vertex' | 'api_key';
export interface GeminiRuntimeInfo {
  runtime: GeminiRuntime;
  project: string | null;
  location: string | null;
}

export async function initializeGeminiClientWithRuntime(
  selection: GeminiRuntimeSelection,
  resolver: ProviderApiKeyResolver,
  /** `endpoint`: calls go through it instead of Google (a provider relay); AI Studio only. */
  transport: { singleAttempt?: boolean; endpoint?: LLMEndpoint } = {},
): Promise<{ client: GoogleGenAI; runtimeInfo: GeminiRuntimeInfo }> {
  const retry = transport.singleAttempt ? { retryOptions: { attempts: 1 } } : {};
  const httpOptions = transport.singleAttempt ? retry : undefined;
  if (transport.endpoint && selection.kind !== 'aiStudio') throw new Error('GEMINI_ENDPOINT_NEEDS_AI_STUDIO');
  switch (selection.kind) {
    case 'aiStudio': {
      const secret = await resolver.resolve('GEMINI', 'geminiAiStudioApiKey');
      const studioHttpOptions = transport.endpoint
        ? { ...retry, baseUrl: providerAddressThrough('https://generativelanguage.googleapis.com', transport.endpoint) }
        : httpOptions;
      return {
        client: new GoogleGenAI({ httpOptions: studioHttpOptions, apiKey: secret.revealToTrustedConsumer() }),
        runtimeInfo: { runtime: 'api_key', project: null, location: null },
      };
    }
    case 'vertexExpress': {
      const secret = await resolver.resolve('GEMINI', 'geminiVertexExpressApiKey');
      return {
        client: new GoogleGenAI({ httpOptions, vertexai: true, apiKey: secret.revealToTrustedConsumer() }),
        runtimeInfo: { runtime: 'vertex', project: null, location: null },
      };
    }
    case 'vertexProject':
      return {
        client: new GoogleGenAI({
          httpOptions,
          vertexai: true,
          project: selection.project,
          location: selection.location,
        }),
        runtimeInfo: {
          runtime: 'vertex',
          project: selection.project,
          location: selection.location,
        },
      };
    case 'unconfigured':
      throw new Error('GEMINI_RUNTIME_UNCONFIGURED');
  }
}
